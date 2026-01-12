import { api } from './api';
import {
    getQueuedLocations,
    removeFromQueue,
    getSyncMeta,
    updateSyncMeta,
    resetSyncMeta,
    getQueueCount,
} from './db';

const MAX_BATCH_SIZE = 50;
const MIN_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 60000; // 1 minute
const MAX_FAIL_COUNT = 10;

type SyncCallback = (queueCount: number) => void;

let syncInProgress = false;
let syncInterval: ReturnType<typeof setInterval> | null = null;
let onSyncCallback: SyncCallback | null = null;

export function setSyncCallback(callback: SyncCallback | null) {
    onSyncCallback = callback;
}

function calculateBackoff(failCount: number): number {
    const delay = Math.min(
        MIN_RETRY_DELAY * Math.pow(2, failCount),
        MAX_RETRY_DELAY
    );
    // Add jitter
    return delay + Math.random() * 1000;
}

async function performSync(): Promise<boolean> {
    if (syncInProgress) return false;

    const queueCount = await getQueueCount();
    if (queueCount === 0) {
        onSyncCallback?.(0);
        return true;
    }

    // Check if we're online
    if (!navigator.onLine) {
        console.log('[Sync] Offline, skipping sync');
        return false;
    }

    syncInProgress = true;

    try {
        const points = await getQueuedLocations(MAX_BATCH_SIZE);
        if (points.length === 0) {
            syncInProgress = false;
            onSyncCallback?.(0);
            return true;
        }

        console.log(`[Sync] Uploading ${points.length} points...`);

        // Format points for API
        const formattedPoints = points.map((p) => ({
            point_id: p.point_id,
            session_id: p.session_id,
            ts_utc: p.ts_utc,
            lat: p.lat,
            lng: p.lng,
            accuracy: p.accuracy,
            speed: p.speed,
            heading: p.heading,
            provider: p.provider,
        }));

        const result = await api.uploadLocations(formattedPoints);

        console.log(`[Sync] Result:`, result.stats);

        // Remove accepted points from queue
        if (result.accepted.length > 0) {
            await removeFromQueue(result.accepted);
        }

        // Reset fail counter on success
        await resetSyncMeta();

        const remainingCount = await getQueueCount();
        onSyncCallback?.(remainingCount);

        syncInProgress = false;

        // If there are more points, sync again
        if (remainingCount > 0) {
            setTimeout(performSync, 500);
        }

        return true;
    } catch (error) {
        console.error('[Sync] Error:', error);

        // Update fail count for backoff
        const meta = await getSyncMeta();
        const failCount = (meta?.failCount || 0) + 1;
        await updateSyncMeta(new Date().toISOString(), failCount);

        syncInProgress = false;

        // Schedule retry with backoff
        if (failCount < MAX_FAIL_COUNT) {
            const delay = calculateBackoff(failCount);
            console.log(`[Sync] Retrying in ${Math.round(delay / 1000)}s (attempt ${failCount})`);
            setTimeout(performSync, delay);
        }

        return false;
    }
}

export function startSyncWorker() {
    if (syncInterval) return;

    console.log('[Sync] Starting sync worker');

    // Initial sync
    performSync();

    // Periodic sync every 30 seconds
    syncInterval = setInterval(performSync, 30000);

    // Listen for online event
    window.addEventListener('online', () => {
        console.log('[Sync] Back online, syncing...');
        performSync();
    });
}

export function stopSyncWorker() {
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
    }
    console.log('[Sync] Stopped sync worker');
}

export async function triggerSync() {
    return performSync();
}

export { getQueueCount };
