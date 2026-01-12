// API Types

export interface User {
    id: string;
    email: string;
    name: string;
    role: 'driver';
    phone?: string;
}

export interface Session {
    id: string;
    driverId: string;
    status: 'active' | 'paused' | 'completed';
    startTimeUtc: string;
    endTimeUtc?: string;
    pointCount?: number;
}

export interface LocationPoint {
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
