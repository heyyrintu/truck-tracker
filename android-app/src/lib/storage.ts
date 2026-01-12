import { Preferences } from '@capacitor/preferences';
import { LocationPoint } from '../types';

const QUEUE_KEY = 'location_queue';
const SYNC_META_KEY = 'sync_meta';

// Queue operations using Capacitor Preferences
// For production with large queues, use @capacitor-community/sqlite

export async function queueLocation(point: LocationPoint): Promise<void> {
    const queue = await getQueue();
    queue.push({
        ...point,
        queued_at: new Date().toISOString(),
    });
    await saveQueue(queue);
}

export async function getQueuedLocations(
    limit = 100
): Promise<(LocationPoint & { queued_at: string })[]> {
    const queue = await getQueue();
    return queue
        .sort((a, b) => new Date(a.ts_utc).getTime() - new Date(b.ts_utc).getTime())
        .slice(0, limit);
}

export async function getQueueCount(): Promise<number> {
    const queue = await getQueue();
    return queue.length;
}

export async function removeFromQueue(pointIds: string[]): Promise<void> {
    const queue = await getQueue();
    const filtered = queue.filter((p) => !pointIds.includes(p.point_id));
    await saveQueue(filtered);
}

export async function clearQueue(): Promise<void> {
    await Preferences.remove({ key: QUEUE_KEY });
}

// Internal helpers
async function getQueue(): Promise<(LocationPoint & { queued_at: string })[]> {
    try {
        const { value } = await Preferences.get({ key: QUEUE_KEY });
        return value ? JSON.parse(value) : [];
    } catch {
        return [];
    }
}

async function saveQueue(queue: (LocationPoint & { queued_at: string })[]): Promise<void> {
    await Preferences.set({
        key: QUEUE_KEY,
        value: JSON.stringify(queue),
    });
}

// Sync metadata
export async function getSyncMeta(): Promise<{
    lastSyncAttempt: string;
    failCount: number;
} | null> {
    try {
        const { value } = await Preferences.get({ key: SYNC_META_KEY });
        return value ? JSON.parse(value) : null;
    } catch {
        return null;
    }
}

export async function updateSyncMeta(
    lastSyncAttempt: string,
    failCount: number
): Promise<void> {
    await Preferences.set({
        key: SYNC_META_KEY,
        value: JSON.stringify({ lastSyncAttempt, failCount }),
    });
}

export async function resetSyncMeta(): Promise<void> {
    await Preferences.remove({ key: SYNC_META_KEY });
}

// Auth storage
export async function saveToken(token: string): Promise<void> {
    await Preferences.set({ key: 'auth_token', value: token });
}

export async function getToken(): Promise<string | null> {
    const { value } = await Preferences.get({ key: 'auth_token' });
    return value;
}

export async function removeToken(): Promise<void> {
    await Preferences.remove({ key: 'auth_token' });
}

// Active session cache
export async function saveActiveSession(session: any): Promise<void> {
    await Preferences.set({
        key: 'active_session',
        value: JSON.stringify(session),
    });
}

export async function getActiveSession(): Promise<any | null> {
    try {
        const { value } = await Preferences.get({ key: 'active_session' });
        return value ? JSON.parse(value) : null;
    } catch {
        return null;
    }
}

export async function removeActiveSession(): Promise<void> {
    await Preferences.remove({ key: 'active_session' });
}
