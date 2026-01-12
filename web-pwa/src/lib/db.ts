import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { QueuedLocationPoint } from '../types';

interface TrackerDB extends DBSchema {
    'location-queue': {
        key: string;
        value: QueuedLocationPoint & { queued_at: string };
        indexes: { 'by-session': string };
    };
    'sync-meta': {
        key: string;
        value: { key: string; lastSyncAttempt: string; failCount: number };
    };
}

const DB_NAME = 'driver-tracker-db';
const DB_VERSION = 1;

let db: IDBPDatabase<TrackerDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<TrackerDB>> {
    if (db) return db;

    db = await openDB<TrackerDB>(DB_NAME, DB_VERSION, {
        upgrade(database) {
            // Location queue store
            if (!database.objectStoreNames.contains('location-queue')) {
                const store = database.createObjectStore('location-queue', {
                    keyPath: 'point_id',
                });
                store.createIndex('by-session', 'session_id');
            }

            // Sync metadata store
            if (!database.objectStoreNames.contains('sync-meta')) {
                database.createObjectStore('sync-meta', { keyPath: 'key' });
            }
        },
    });

    return db;
}

// Queue operations
export async function queueLocation(point: QueuedLocationPoint): Promise<void> {
    const database = await getDB();
    await database.put('location-queue', {
        ...point,
        queued_at: new Date().toISOString(),
    });
}

export async function getQueuedLocations(
    limit = 100
): Promise<(QueuedLocationPoint & { queued_at: string })[]> {
    const database = await getDB();
    const all = await database.getAll('location-queue');

    // Sort by timestamp and limit
    return all
        .sort((a, b) => new Date(a.ts_utc).getTime() - new Date(b.ts_utc).getTime())
        .slice(0, limit);
}

export async function getQueueCount(): Promise<number> {
    const database = await getDB();
    return database.count('location-queue');
}

export async function removeFromQueue(pointIds: string[]): Promise<void> {
    const database = await getDB();
    const tx = database.transaction('location-queue', 'readwrite');

    await Promise.all(pointIds.map((id) => tx.store.delete(id)));
    await tx.done;
}

export async function clearQueue(): Promise<void> {
    const database = await getDB();
    await database.clear('location-queue');
}

// Sync metadata
export async function getSyncMeta(): Promise<{
    lastSyncAttempt: string;
    failCount: number;
} | null> {
    const database = await getDB();
    const meta = await database.get('sync-meta', 'sync');
    return meta ? { lastSyncAttempt: meta.lastSyncAttempt, failCount: meta.failCount } : null;
}

export async function updateSyncMeta(
    lastSyncAttempt: string,
    failCount: number
): Promise<void> {
    const database = await getDB();
    await database.put('sync-meta', {
        key: 'sync',
        lastSyncAttempt,
        failCount,
    });
}

export async function resetSyncMeta(): Promise<void> {
    const database = await getDB();
    await database.delete('sync-meta', 'sync');
}
