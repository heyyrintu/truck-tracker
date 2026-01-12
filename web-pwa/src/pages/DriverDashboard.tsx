import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { useTracking } from '../contexts/TrackingContext';
import { TRACKING_MODES, TrackingMode } from '../types';

export default function DriverDashboard() {
    const { user, activeSession } = useAuth();
    const {
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
    } = useTracking();

    const [currentTime, setCurrentTime] = useState(new Date());
    const [isSyncing, setIsSyncing] = useState(false);

    // Update time every second
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleSyncNow = async () => {
        setIsSyncing(true);
        await syncNow();
        setIsSyncing(false);
    };

    return (
        <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
            {/* Time Card */}
            <div className="glass rounded-2xl p-6 text-center">
                <p className="text-dark-400 text-sm mb-1">Current Time</p>
                <p className="text-4xl font-bold text-white tabular-nums">
                    {format(currentTime, 'HH:mm:ss')}
                </p>
                <p className="text-dark-400 text-sm mt-1">
                    {format(currentTime, 'EEEE, MMMM d, yyyy')}
                </p>
            </div>

            {/* Error Display */}
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm animate-fade-in flex items-center gap-3">
                    <svg
                        className="w-5 h-5 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                    <span>{error}</span>
                </div>
            )}

            {/* Permission Warning */}
            {permissionStatus === 'denied' && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-sm flex items-center gap-3">
                    <svg
                        className="w-5 h-5 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                    </svg>
                    <span>Location permission denied. Please enable in browser settings.</span>
                </div>
            )}

            {/* Tracking Status Card */}
            <div className="glass rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-white">Tracking Status</h2>
                    <div
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${isTracking && !isPaused
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : isPaused
                                    ? 'bg-amber-500/20 text-amber-400'
                                    : 'bg-dark-700 text-dark-400'
                            }`}
                    >
                        <div
                            className={`w-2.5 h-2.5 rounded-full ${isTracking && !isPaused
                                    ? 'bg-emerald-500 animate-pulse'
                                    : isPaused
                                        ? 'bg-amber-500'
                                        : 'bg-dark-500'
                                }`}
                        ></div>
                        <span className="text-sm font-medium">
                            {isTracking && !isPaused
                                ? 'Active'
                                : isPaused
                                    ? 'Paused'
                                    : 'Stopped'}
                        </span>
                    </div>
                </div>

                {/* Session Info */}
                {activeSession && (
                    <div className="mb-6 p-4 bg-dark-800 rounded-xl">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-dark-400">Session Started</p>
                                <p className="text-white font-medium">
                                    {format(new Date(activeSession.startTimeUtc), 'HH:mm:ss')}
                                </p>
                            </div>
                            <div>
                                <p className="text-dark-400">Duration</p>
                                <p className="text-white font-medium tabular-nums">
                                    {formatDuration(
                                        Math.floor(
                                            (currentTime.getTime() -
                                                new Date(activeSession.startTimeUtc).getTime()) /
                                            1000
                                        )
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Control Buttons */}
                <div className="flex gap-3">
                    {!isTracking && !isPaused ? (
                        <button
                            onClick={startTracking}
                            className="flex-1 py-4 gradient-success text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                                />
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                            Start Shift
                        </button>
                    ) : (
                        <>
                            {isPaused ? (
                                <button
                                    onClick={resumeTracking}
                                    className="flex-1 py-4 gradient-primary text-white font-semibold rounded-xl shadow-lg shadow-primary-500/30 hover:shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    <svg
                                        className="w-5 h-5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                                        />
                                    </svg>
                                    Resume
                                </button>
                            ) : (
                                <button
                                    onClick={pauseTracking}
                                    className="flex-1 py-4 gradient-warning text-white font-semibold rounded-xl shadow-lg shadow-amber-500/30 hover:shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    <svg
                                        className="w-5 h-5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                    Pause
                                </button>
                            )}
                            <button
                                onClick={stopTracking}
                                className="flex-1 py-4 gradient-error text-white font-semibold rounded-xl shadow-lg shadow-red-500/30 hover:shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                                    />
                                </svg>
                                Stop Shift
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Location Info Card */}
            <div className="glass rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Location Info</h2>

                <div className="space-y-4">
                    {/* Last Captured */}
                    <div className="flex items-center justify-between p-4 bg-dark-800 rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary-500/20 rounded-xl flex items-center justify-center">
                                <svg
                                    className="w-5 h-5 text-primary-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-dark-400">Last Captured</p>
                                <p className="text-white font-medium">
                                    {lastCapturedTime
                                        ? format(lastCapturedTime, 'HH:mm:ss')
                                        : 'Not yet'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Coordinates */}
                    <div className="flex items-center justify-between p-4 bg-dark-800 rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                                <svg
                                    className="w-5 h-5 text-emerald-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                    />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-dark-400">Coordinates</p>
                                <p className="text-white font-mono text-sm">
                                    {currentPosition
                                        ? `${currentPosition.lat.toFixed(6)}, ${currentPosition.lng.toFixed(
                                            6
                                        )}`
                                        : 'Waiting for GPS...'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Accuracy */}
                    {currentPosition && (
                        <div className="flex items-center justify-between p-4 bg-dark-800 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                                    <svg
                                        className="w-5 h-5 text-cyan-400"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                                        />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm text-dark-400">Accuracy</p>
                                    <p className="text-white font-medium">
                                        ±{Math.round(currentPosition.accuracy)}m
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Sync & Settings Card */}
            <div className="glass rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Settings</h2>

                <div className="space-y-4">
                    {/* Queue Status */}
                    <div className="flex items-center justify-between p-4 bg-dark-800 rounded-xl">
                        <div>
                            <p className="text-dark-400 text-sm">Pending Upload</p>
                            <p className="text-white font-medium">{queuedPointsCount} points</p>
                        </div>
                        <button
                            onClick={handleSyncNow}
                            disabled={queuedPointsCount === 0 || !isOnline || isSyncing}
                            className="px-4 py-2 bg-primary-500/20 text-primary-400 rounded-lg hover:bg-primary-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                            {isSyncing ? (
                                <>
                                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                            fill="none"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                        />
                                    </svg>
                                    Syncing...
                                </>
                            ) : (
                                <>
                                    <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                        />
                                    </svg>
                                    Sync Now
                                </>
                            )}
                        </button>
                    </div>

                    {/* Battery Mode */}
                    <div className="p-4 bg-dark-800 rounded-xl">
                        <p className="text-dark-400 text-sm mb-3">Battery Mode</p>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setTrackingMode('normal')}
                                className={`p-3 rounded-xl text-sm font-medium transition-all ${trackingMode === 'normal'
                                        ? 'bg-primary-500 text-white'
                                        : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                                    }`}
                            >
                                <p className="font-semibold">Normal</p>
                                <p className="text-xs opacity-75">10s / 25m</p>
                            </button>
                            <button
                                onClick={() => setTrackingMode('lowPower')}
                                className={`p-3 rounded-xl text-sm font-medium transition-all ${trackingMode === 'lowPower'
                                        ? 'bg-amber-500 text-white'
                                        : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                                    }`}
                            >
                                <p className="font-semibold">Low Power</p>
                                <p className="text-xs opacity-75">60s / 100m</p>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* PWA Warning */}
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-sm">
                <div className="flex items-start gap-3">
                    <svg
                        className="w-5 h-5 flex-shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                    <div>
                        <p className="font-medium">Web Browser Limitation</p>
                        <p className="mt-1 text-amber-400/80">
                            Tracking only works while this tab is open. For reliable background
                            tracking, use the Android app.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m
        .toString()
        .padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
