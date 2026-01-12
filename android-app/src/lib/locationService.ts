import {
    BackgroundGeolocationPlugin,
    Location,
} from '@capacitor-community/background-geolocation';
import { registerPlugin } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { v4 as uuidv4 } from 'uuid';
import { queueLocation, getActiveSession } from './storage';
import { TRACKING_MODES, TrackingMode } from '../types';

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>(
    'BackgroundGeolocation'
);

let watcherId: string | null = null;
let currentMode: TrackingMode = 'normal';
let lastPosition: { lat: number; lng: number; timestamp: number } | null = null;

// Callback for UI updates
type LocationCallback = (location: {
    lat: number;
    lng: number;
    accuracy: number;
    speed: number | null;
    heading: number | null;
    timestamp: Date;
}) => void;

let onLocationCallback: LocationCallback | null = null;

export function setLocationCallback(callback: LocationCallback | null) {
    onLocationCallback = callback;
}

// Calculate distance between two points (Haversine)
function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

async function handleLocation(location: Location) {
    const now = new Date();
    const config = TRACKING_MODES[currentMode];

    const newPosition = {
        lat: location.latitude,
        lng: location.longitude,
        accuracy: location.accuracy,
        speed: location.speed,
        heading: location.bearing,
        timestamp: now,
    };

    // Notify UI
    onLocationCallback?.(newPosition);

    // Check thresholds
    if (lastPosition) {
        const timeDiff = (now.getTime() - lastPosition.timestamp) / 1000;
        const distance = calculateDistance(
            lastPosition.lat,
            lastPosition.lng,
            location.latitude,
            location.longitude
        );

        if (timeDiff < config.intervalSeconds && distance < config.distanceMeters) {
            return; // Skip this point
        }
    }

    // Get active session
    const session = await getActiveSession();
    if (!session) {
        console.log('[Location] No active session, skipping');
        return;
    }

    // Queue the location
    const point = {
        point_id: uuidv4(),
        session_id: session.id,
        ts_utc: now.toISOString(),
        lat: location.latitude,
        lng: location.longitude,
        accuracy: location.accuracy,
        speed: location.speed ?? undefined,
        heading: location.bearing ?? undefined,
        provider: 'FUSED',
    };

    await queueLocation(point);

    lastPosition = {
        lat: location.latitude,
        lng: location.longitude,
        timestamp: now.getTime(),
    };

    console.log('[Location] Queued point:', point.point_id);
}

export async function startBackgroundLocation(mode: TrackingMode = 'normal'): Promise<boolean> {
    try {
        currentMode = mode;
        const config = TRACKING_MODES[mode];

        // Request notification permission for foreground service
        await LocalNotifications.requestPermissions();

        // Start background location tracking
        watcherId = await BackgroundGeolocation.addWatcher(
            {
                // Background options
                backgroundMessage: 'Driver Tracker is recording your location',
                backgroundTitle: 'Tracking Active',
                requestPermissions: true,
                stale: false,
                // Distance filter in meters
                distanceFilter: config.distanceMeters,
            },
            async (location, error) => {
                if (error) {
                    console.error('[Location] Error:', error);
                    if (error.code === 'NOT_AUTHORIZED') {
                        console.error('[Location] Permission denied');
                    }
                    return;
                }

                if (location) {
                    await handleLocation(location);
                }
            }
        );

        console.log('[Location] Started background tracking, watcher:', watcherId);
        return true;
    } catch (error) {
        console.error('[Location] Failed to start:', error);
        return false;
    }
}

export async function stopBackgroundLocation(): Promise<void> {
    if (watcherId) {
        await BackgroundGeolocation.removeWatcher({ id: watcherId });
        watcherId = null;
        lastPosition = null;
        console.log('[Location] Stopped background tracking');
    }
}

export function setTrackingMode(mode: TrackingMode) {
    currentMode = mode;
    // Note: To change distance filter, need to restart watcher
    // For simplicity, we just update the mode for time-based filtering
    console.log('[Location] Mode changed to:', mode);
}

export async function checkLocationPermission(): Promise<'granted' | 'denied' | 'prompt'> {
    try {
        // This is a simplified check - actual implementation varies by platform
        // For Android, you'd typically check the permission status directly
        return 'prompt';
    } catch {
        return 'denied';
    }
}

export function isTracking(): boolean {
    return watcherId !== null;
}
