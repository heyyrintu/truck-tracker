// API Types

export interface User {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'driver';
    phone?: string;
    createdAt: string;
}

export interface Session {
    id: string;
    driverId: string;
    status: 'active' | 'paused' | 'completed';
    startTimeUtc: string;
    endTimeUtc?: string;
    createdAt: string;
    pointCount?: number;
    durationSeconds?: number;
}

export interface LocationPoint {
    id: string;
    pointId: string;
    sessionId: string;
    tsUtc: string;
    lat: number;
    lng: number;
    accuracy?: number;
    speed?: number;
    heading?: number;
    provider?: string;
    createdAt: string;
}

export interface QueuedLocationPoint {
    point_id: string;
    session_id: string;
    ts_utc: string;
    lat: number;
    lng: number;
    accuracy?: number;
    speed?: number;
    heading?: number;
    provider?: string;
}

export interface Driver {
    id: string;
    name: string;
    email: string;
    phone?: string;
    createdAt: string;
    lastSeenTime: string | null;
    lastLocation: {
        lat: number;
        lng: number;
        accuracy?: number;
    } | null;
    status: 'tracking' | 'paused' | 'offline';
    activeSessionId: string | null;
}

export interface TrackingConfig {
    intervalSeconds: number;
    distanceMeters: number;
}

export const TRACKING_MODES = {
    normal: {
        intervalSeconds: 10,
        distanceMeters: 25,
    },
    lowPower: {
        intervalSeconds: 60,
        distanceMeters: 100,
    },
} as const;

export type TrackingMode = keyof typeof TRACKING_MODES;
