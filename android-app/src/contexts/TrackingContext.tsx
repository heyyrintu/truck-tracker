import {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
} from 'react';
import { Network } from '@capacitor/network';
import { useAuth } from './AuthContext';
import { TrackingMode } from '../types';
import { api } from '../lib/api';
import { getQueueCount, removeActiveSession } from '../lib/storage';
import {
    startBackgroundLocation,
    stopBackgroundLocation,
    setTrackingMode as setLocationMode,
    setLocationCallback,
} from '../lib/locationService';
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
    const [isOnline, setIsOnline] = useState(true);
    const [trackingMode, setTrackingMode] = useState<TrackingMode>('normal');
    const [error, setError] = useState<string | null>(null);

    // Network status
    useEffect(() => {
        Network.getStatus().then((status) => setIsOnline(status.connected));

        const listener = Network.addListener('networkStatusChange', (status) => {
            setIsOnline(status.connected);
        });

        return () => {
            listener.remove();
        };
    }, []);

    // Queue count updates
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

    // Location updates
    useEffect(() => {
        setLocationCallback((location) => {
            setCurrentPosition(location);
            setLastCapturedTime(location.timestamp);
        });

        return () => setLocationCallback(null);
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

    // Auto-resume tracking if session is active
    useEffect(() => {
        const autoResume = async () => {
            if (activeSession?.status === 'active' && user) {
                console.log('[Tracking] Auto-resuming background location');
                await startBackgroundLocation(trackingMode);
                startSyncWorker();
            }
        };

        autoResume();

        return () => {
            stopBackgroundLocation();
        };
    }, [activeSession?.status, user, trackingMode]);

    const startTracking = async () => {
        try {
            setError(null);

            const { session } = await api.startSession();
            await setActiveSession(session);

            const success = await startBackgroundLocation(trackingMode);
            if (!success) {
                setError('Failed to start location tracking. Check permissions.');
                return;
            }

            startSyncWorker();

            setIsTracking(true);
            setIsPaused(false);

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
            await setActiveSession(session);

            await stopBackgroundLocation();

            setIsPaused(true);

            console.log('[Tracking] Paused session');
        } catch (err: any) {
            setError(err.message || 'Failed to pause tracking');
        }
    };

    const resumeTracking = async () => {
        try {
            setError(null);

            const { session } = await api.resumeSession();
            await setActiveSession(session);

            await startBackgroundLocation(trackingMode);

            setIsPaused(false);

            console.log('[Tracking] Resumed session');
        } catch (err: any) {
            setError(err.message || 'Failed to resume tracking');
        }
    };

    const stopTracking = async () => {
        try {
            setError(null);

            await stopBackgroundLocation();
            await triggerSync();

            await api.stopSession();
            await removeActiveSession();
            setActiveSession(null);

            stopSyncWorker();

            setIsTracking(false);
            setIsPaused(false);

            console.log('[Tracking] Stopped session');
        } catch (err: any) {
            setError(err.message || 'Failed to stop tracking');
        }
    };

    const handleSetTrackingMode = (mode: TrackingMode) => {
        setTrackingMode(mode);
        setLocationMode(mode);
    };

    const syncNow = async () => {
        await triggerSync();
        const count = await getQueueCount();
        setQueuedPointsCount(count);
    };

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
                startTracking,
                pauseTracking,
                resumeTracking,
                stopTracking,
                setTrackingMode: handleSetTrackingMode,
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
