import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useRef,
    ReactNode,
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './AuthContext';
import { TRACKING_MODES, TrackingMode } from '../types';
import { api } from '../lib/api';
import { queueLocation, getQueueCount } from '../lib/db';
import {
    startSyncWorker,
    stopSyncWorker,
    setSyncCallback,
    triggerSync,
} from '../lib/syncWorker';

interface Position {
    lat: number;
    lng: number;
    accuracy: number;
    speed: number | null;
    heading: number | null;
    timestamp: Date;
}

interface TrackingContextType {
    isTracking: boolean;
    isPaused: boolean;
    currentPosition: Position | null;
    lastCapturedTime: Date | null;
    queuedPointsCount: number;
    isOnline: boolean;
    trackingMode: TrackingMode;
    error: string | null;
    permissionStatus: PermissionState | null;
    startTracking: () => Promise<void>;
    pauseTracking: () => Promise<void>;
    resumeTracking: () => Promise<void>;
    stopTracking: () => Promise<void>;
    setTrackingMode: (mode: TrackingMode) => void;
    syncNow: () => Promise<void>;
}

const TrackingContext = createContext<TrackingContextType | null>(null);

export function TrackingProvider({ children }: { children: ReactNode }) {
    const { activeSession, setActiveSession, user } = useAuth();

    const [isTracking, setIsTracking] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [currentPosition, setCurrentPosition] = useState<Position | null>(null);
    const [lastCapturedTime, setLastCapturedTime] = useState<Date | null>(null);
    const [queuedPointsCount, setQueuedPointsCount] = useState(0);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [trackingMode, setTrackingMode] = useState<TrackingMode>('normal');
    const [error, setError] = useState<string | null>(null);
    const [permissionStatus, setPermissionStatus] = useState<PermissionState | null>(null);

    const watchIdRef = useRef<number | null>(null);
    const lastPositionRef = useRef<Position | null>(null);
    // timerRef is kept for future use if interval-based tracking needed
    const _timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Check geolocation permission
    useEffect(() => {
        if ('permissions' in navigator) {
            navigator.permissions.query({ name: 'geolocation' }).then((result) => {
                setPermissionStatus(result.state);
                result.onchange = () => setPermissionStatus(result.state);
            });
        }
    }, []);

    // Online/offline detection
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Update queue count
    useEffect(() => {
        const updateQueueCount = async () => {
            const count = await getQueueCount();
            setQueuedPointsCount(count);
        };

        updateQueueCount();

        setSyncCallback((count) => {
            setQueuedPointsCount(count);
        });

        return () => setSyncCallback(null);
    }, []);

    // Sync session state
    useEffect(() => {
        if (activeSession) {
            setIsTracking(activeSession.status === 'active');
            setIsPaused(activeSession.status === 'paused');
        } else {
            setIsTracking(false);
            setIsPaused(false);
        }
    }, [activeSession]);

    // Calculate distance between two positions (Haversine)
    const calculateDistance = (
        lat1: number,
        lon1: number,
        lat2: number,
        lon2: number
    ): number => {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δφ = ((lat2 - lat1) * Math.PI) / 180;
        const Δλ = ((lon2 - lon1) * Math.PI) / 180;

        const a =
            Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    };

    // Capture and queue location
    const captureLocation = useCallback(
        async (position: GeolocationPosition) => {
            if (!activeSession || !user) return;

            const config = TRACKING_MODES[trackingMode];
            const now = new Date(position.timestamp);

            const newPosition: Position = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy,
                speed: position.coords.speed,
                heading: position.coords.heading,
                timestamp: now,
            };

            setCurrentPosition(newPosition);

            // Check if we should capture this point
            const lastPos = lastPositionRef.current;

            if (lastPos) {
                const timeDiff = (now.getTime() - lastPos.timestamp.getTime()) / 1000;
                const distance = calculateDistance(
                    lastPos.lat,
                    lastPos.lng,
                    newPosition.lat,
                    newPosition.lng
                );

                // Skip if neither time nor distance threshold met
                if (timeDiff < config.intervalSeconds && distance < config.distanceMeters) {
                    return;
                }
            }

            // Queue the location point
            const point = {
                point_id: uuidv4(),
                session_id: activeSession.id,
                ts_utc: now.toISOString(),
                lat: newPosition.lat,
                lng: newPosition.lng,
                accuracy: newPosition.accuracy,
                speed: newPosition.speed ?? undefined,
                heading: newPosition.heading ?? undefined,
                provider: 'WEB',
            };

            await queueLocation(point);
            setLastCapturedTime(now);
            lastPositionRef.current = newPosition;

            // Update queue count
            const count = await getQueueCount();
            setQueuedPointsCount(count);

            console.log('[Tracking] Captured point:', point);
        },
        [activeSession, user, trackingMode]
    );

    // Start geolocation watch
    const startWatch = useCallback(() => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser');
            return;
        }

        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
        }

        watchIdRef.current = navigator.geolocation.watchPosition(
            captureLocation,
            (err) => {
                console.error('[Tracking] Geolocation error:', err);
                switch (err.code) {
                    case err.PERMISSION_DENIED:
                        setError('Location permission denied. Please enable location access.');
                        break;
                    case err.POSITION_UNAVAILABLE:
                        setError('Location information unavailable.');
                        break;
                    case err.TIMEOUT:
                        setError('Location request timed out. Retrying...');
                        break;
                }
            },
            {
                enableHighAccuracy: true,
                maximumAge: 5000,
                timeout: 30000,
            }
        );
    }, [captureLocation]);

    // Stop geolocation watch
    const stopWatch = useCallback(() => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
    }, []);

    // API methods
    const startTracking = async () => {
        try {
            setError(null);

            // Request location permission
            if (permissionStatus === 'denied') {
                setError('Location permission denied. Please enable in browser settings.');
                return;
            }

            const { session } = await api.startSession();
            setActiveSession(session);
            setIsTracking(true);
            setIsPaused(false);

            // Start location watch
            startWatch();

            // Start sync worker
            startSyncWorker();

            console.log('[Tracking] Started session:', session.id);
        } catch (err: any) {
            setError(err.message || 'Failed to start tracking');
            console.error('[Tracking] Start error:', err);
        }
    };

    const pauseTracking = async () => {
        try {
            setError(null);
            const { session } = await api.pauseSession();
            setActiveSession(session);
            setIsPaused(true);

            // Stop watch but keep sync running
            stopWatch();

            console.log('[Tracking] Paused session');
        } catch (err: any) {
            setError(err.message || 'Failed to pause tracking');
        }
    };

    const resumeTracking = async () => {
        try {
            setError(null);
            const { session } = await api.resumeSession();
            setActiveSession(session);
            setIsPaused(false);

            // Resume watch
            startWatch();

            console.log('[Tracking] Resumed session');
        } catch (err: any) {
            setError(err.message || 'Failed to resume tracking');
        }
    };

    const stopTracking = async () => {
        try {
            setError(null);

            // Stop watch first
            stopWatch();

            // Trigger final sync
            await triggerSync();

            const { session } = await api.stopSession();
            setActiveSession(null);
            setIsTracking(false);
            setIsPaused(false);
            lastPositionRef.current = null;

            // Stop sync worker
            stopSyncWorker();

            console.log('[Tracking] Stopped session');
        } catch (err: any) {
            setError(err.message || 'Failed to stop tracking');
        }
    };

    const syncNow = async () => {
        await triggerSync();
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopWatch();
        };
    }, [stopWatch]);

    // Auto-start watch if session is active
    useEffect(() => {
        if (activeSession?.status === 'active' && user?.role === 'driver') {
            startWatch();
            startSyncWorker();
        }

        return () => {
            stopWatch();
        };
    }, [activeSession?.status, user?.role, startWatch, stopWatch]);

    return (
        <TrackingContext.Provider
            value={{
                isTracking,
                isPaused,
                currentPosition,
                lastCapturedTime,
                queuedPointsCount,
                isOnline,
                trackingMode,
                error,
                permissionStatus,
                startTracking,
                pauseTracking,
                resumeTracking,
                stopTracking,
                setTrackingMode,
                syncNow,
            }}
        >
            {children}
        </TrackingContext.Provider>
    );
}

export function useTracking() {
    const context = useContext(TrackingContext);
    if (!context) {
        throw new Error('useTracking must be used within a TrackingProvider');
    }
    return context;
}
