import { api } from './api';
import {
    getQueuedLocations,
    removeFromQueue,
    getSyncMeta,
    updateSyncMeta,
    resetSyncMeta,
    getQueueCount,
    getToken,
} from './storage';
import { Network } from '@capacitor/network';

const MAX_BATCH_SIZE = 50;
const MIN_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 60000;
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
    return delay + Math.random() * 1000;
}

async function isOnline(): Promise<boolean> {
    const status = await Network.getStatus();
    return status.connected;
}

async function performSync(): Promise<boolean> {
    if (syncInProgress) return false;

    const queueCount = await getQueueCount();
    if (queueCount === 0) {
        onSyncCallback?.(0);
        return true;
    }

    // Check network
    const online = await isOnline();
    if (!online) {
        console.log('[Sync] Offline, skipping sync');
        return false;
    }

    // Ensure token is set
    const token = await getToken();
    if (token) {
        api.setToken(token);
    } else {
        console.log('[Sync] No auth token, skipping sync');
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

        const result = await api.uploadLocations(points);

        console.log(`[Sync] Result:`, result.stats);

        if (result.accepted.length > 0) {
            await removeFromQueue(result.accepted);
        }

        await resetSyncMeta();

        const remainingCount = await getQueueCount();
        onSyncCallback?.(remainingCount);

        syncInProgress = false;

        if (remainingCount > 0) {
            setTimeout(performSync, 500);
        }

        return true;
    } catch (error) {
        console.error('[Sync] Error:', error);

        const meta = await getSyncMeta();
        const failCount = (meta?.failCount || 0) + 1;
        await updateSyncMeta(new Date().toISOString(), failCount);

        syncInProgress = false;

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

    performSync();

    syncInterval = setInterval(performSync, 30000);

    // Listen for network changes
    Network.addListener('networkStatusChange', (status) => {
        if (status.connected) {
            console.log('[Sync] Network connected, syncing...');
            performSync();
        }
    });
}

export function stopSyncWorker() {
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
    }
    Network.removeAllListeners();
    console.log('[Sync] Stopped sync worker');
}

export async function triggerSync() {
    return performSync();
}

export { getQueueCount };
