import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { api } from '../lib/api';
import { Driver } from '../types';

export default function AdminDashboard() {
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [stats, setStats] = useState<{
        totalDrivers: number;
        activeDrivers: number;
        totalSessions: number;
        activeSessions: number;
        totalPoints: number;
        todayPoints: number;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [driversRes, statsRes] = await Promise.all([
                    api.getDrivers(),
                    api.getStats(),
                ]);
                setDrivers(driversRes.drivers);
                setStats(statsRes.stats);
            } catch (err: any) {
                setError(err.message || 'Failed to load data');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();

        // Refresh every 30 seconds
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
                    <p className="text-dark-400 text-sm">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Total Drivers"
                    value={stats?.totalDrivers || 0}
                    icon={
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    }
                    color="primary"
                />
                <StatCard
                    label="Active Now"
                    value={stats?.activeDrivers || 0}
                    icon={
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    }
                    color="emerald"
                />
                <StatCard
                    label="Total Sessions"
                    value={stats?.totalSessions || 0}
                    icon={
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                    }
                    color="amber"
                />
                <StatCard
                    label="Today's Points"
                    value={stats?.todayPoints || 0}
                    icon={
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    }
                    color="cyan"
                />
            </div>

            {/* Drivers List */}
            <div className="glass rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-dark-700">
                    <h2 className="text-xl font-semibold text-white">Drivers</h2>
                    <p className="text-dark-400 text-sm mt-1">Real-time driver status and activity</p>
                </div>

                {drivers.length === 0 ? (
                    <div className="p-12 text-center">
                        <svg className="w-12 h-12 text-dark-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <p className="text-dark-400">No drivers found</p>
                    </div>
                ) : (
                    <div className="divide-y divide-dark-700">
                        {drivers.map((driver) => (
                            <DriverRow key={driver.id} driver={driver} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({
    label,
    value,
    icon,
    color,
}: {
    label: string;
    value: number;
    icon: React.ReactNode;
    color: 'primary' | 'emerald' | 'amber' | 'cyan';
}) {
    const colorClasses = {
        primary: 'bg-primary-500/20 text-primary-400',
        emerald: 'bg-emerald-500/20 text-emerald-400',
        amber: 'bg-amber-500/20 text-amber-400',
        cyan: 'bg-cyan-500/20 text-cyan-400',
    };

    return (
        <div className="glass rounded-xl p-5">
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 ${colorClasses[color]} rounded-xl flex items-center justify-center`}>
                    {icon}
                </div>
                <div>
                    <p className="text-dark-400 text-sm">{label}</p>
                    <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
                </div>
            </div>
        </div>
    );
}

function DriverRow({ driver }: { driver: Driver }) {
    const statusColors = {
        tracking: 'bg-emerald-500/20 text-emerald-400',
        paused: 'bg-amber-500/20 text-amber-400',
        offline: 'bg-dark-600 text-dark-400',
    };

    const statusDot = {
        tracking: 'bg-emerald-500 animate-pulse',
        paused: 'bg-amber-500',
        offline: 'bg-dark-500',
    };

    return (
        <Link
            to={`/admin/driver/${driver.id}`}
            className="flex items-center justify-between p-4 sm:p-6 hover:bg-dark-800/50 transition-colors"
        >
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center text-white font-semibold text-lg">
                    {driver.name.charAt(0).toUpperCase()}
                </div>
                <div>
                    <h3 className="text-white font-medium">{driver.name}</h3>
                    <p className="text-dark-400 text-sm">{driver.email}</p>
                </div>
            </div>

            <div className="flex items-center gap-6">
                {/* Last Seen */}
                <div className="text-right hidden sm:block">
                    <p className="text-dark-400 text-sm">Last seen</p>
                    <p className="text-white text-sm">
                        {driver.lastSeenTime
                            ? formatDistanceToNow(new Date(driver.lastSeenTime), { addSuffix: true })
                            : 'Never'}
                    </p>
                </div>

                {/* Location */}
                {driver.lastLocation && (
                    <div className="text-right hidden md:block">
                        <p className="text-dark-400 text-sm">Location</p>
                        <p className="text-white font-mono text-xs">
                            {driver.lastLocation.lat.toFixed(4)}, {driver.lastLocation.lng.toFixed(4)}
                        </p>
                    </div>
                )}

                {/* Status Badge */}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${statusColors[driver.status]}`}>
                    <div className={`w-2 h-2 rounded-full ${statusDot[driver.status]}`}></div>
                    <span className="text-sm font-medium capitalize">{driver.status}</span>
                </div>

                {/* Arrow */}
                <svg className="w-5 h-5 text-dark-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            </div>
        </Link>
    );
}
