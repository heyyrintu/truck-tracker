import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTracking } from '../contexts/TrackingContext';

interface LayoutProps {
    children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
    const { user, logout } = useAuth();
    const { isOnline, queuedPointsCount, isTracking, isPaused } = useTracking();
    useLocation(); // For route awareness

    const isAdmin = user?.role === 'admin';

    return (
        <div className="min-h-screen bg-dark-900 flex flex-col">
            {/* Header */}
            <header className="glass border-b border-dark-700 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo & Title */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
                                <svg
                                    className="w-6 h-6 text-white"
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
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-white">Driver Tracker</h1>
                                <p className="text-xs text-dark-400 capitalize">{user?.role} Dashboard</p>
                            </div>
                        </div>

                        {/* Status Indicators */}
                        <div className="flex items-center gap-4">
                            {/* Online Status */}
                            <div className="flex items-center gap-2">
                                <div
                                    className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-red-500'
                                        } animate-pulse`}
                                ></div>
                                <span className="text-sm text-dark-300">
                                    {isOnline ? 'Online' : 'Offline'}
                                </span>
                            </div>

                            {/* Queue Count (for drivers) */}
                            {!isAdmin && queuedPointsCount > 0 && (
                                <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/20 rounded-full">
                                    <svg
                                        className="w-4 h-4 text-amber-500"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                                        />
                                    </svg>
                                    <span className="text-sm text-amber-500 font-medium">
                                        {queuedPointsCount} queued
                                    </span>
                                </div>
                            )}

                            {/* Tracking Status (for drivers) */}
                            {!isAdmin && (isTracking || isPaused) && (
                                <div
                                    className={`flex items-center gap-2 px-3 py-1 rounded-full ${isPaused
                                        ? 'bg-amber-500/20 text-amber-500'
                                        : 'bg-emerald-500/20 text-emerald-500'
                                        }`}
                                >
                                    <div
                                        className={`w-2 h-2 rounded-full ${isPaused ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'
                                            }`}
                                    ></div>
                                    <span className="text-sm font-medium">
                                        {isPaused ? 'Paused' : 'Tracking'}
                                    </span>
                                </div>
                            )}

                            {/* User Menu */}
                            <div className="flex items-center gap-3 pl-4 border-l border-dark-700">
                                <div className="text-right hidden sm:block">
                                    <p className="text-sm font-medium text-white">{user?.name}</p>
                                    <p className="text-xs text-dark-400">{user?.email}</p>
                                </div>
                                <button
                                    onClick={logout}
                                    className="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
                                    title="Logout"
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
                                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                                        />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">{children}</main>
        </div>
    );
}
