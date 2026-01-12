import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { format, formatDistanceToNow } from 'date-fns';
import { api } from '../lib/api';
import { Session, LocationPoint } from '../types';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom marker icons
const startIcon = L.divIcon({
    className: '',
    html: `<div class="w-6 h-6 bg-emerald-500 border-2 border-white rounded-full shadow-lg flex items-center justify-center">
    <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    </svg>
  </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});

const endIcon = L.divIcon({
    className: '',
    html: `<div class="w-6 h-6 bg-red-500 border-2 border-white rounded-full shadow-lg flex items-center justify-center">
    <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
    </svg>
  </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});

// Map bounds updater
function MapBoundsUpdater({ locations }: { locations: LocationPoint[] }) {
    const map = useMap();

    useEffect(() => {
        if (locations.length > 0) {
            const bounds = L.latLngBounds(
                locations.map((loc) => [loc.lat, loc.lng] as [number, number])
            );
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [locations, map]);

    return null;
}

export default function DriverDetail() {
    const { driverId } = useParams<{ driverId: string }>();
    const [driver, setDriver] = useState<any>(null);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [locations, setLocations] = useState<LocationPoint[]>([]);
    const [selectedSession, setSelectedSession] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'map' | 'timeline'>('map');

    // Load driver data
    useEffect(() => {
        const fetchDriver = async () => {
            if (!driverId) return;
            try {
                const [driverRes, sessionsRes] = await Promise.all([
                    api.getDriver(driverId),
                    api.getDriverSessions(driverId),
                ]);
                setDriver(driverRes.driver);
                setSessions(sessionsRes.sessions);

                // Select first session by default
                if (sessionsRes.sessions.length > 0) {
                    setSelectedSession(sessionsRes.sessions[0].id);
                }
            } catch (err: any) {
                setError(err.message || 'Failed to load driver data');
            } finally {
                setIsLoading(false);
            }
        };

        fetchDriver();
    }, [driverId]);

    // Load locations when session changes
    useEffect(() => {
        const fetchLocations = async () => {
            if (!driverId || !selectedSession) {
                setLocations([]);
                return;
            }

            try {
                const res = await api.getDriverLocations(driverId, {
                    session_id: selectedSession,
                });
                setLocations(res.locations);
            } catch (err) {
                console.error('Failed to load locations:', err);
            }
        };

        fetchLocations();
    }, [driverId, selectedSession]);

    // Export session
    const handleExport = async () => {
        if (!selectedSession) return;

        setIsExporting(true);
        try {
            const blob = await api.exportSession(selectedSession);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `session_${selectedSession}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err: any) {
            console.error('Export failed:', err);
        } finally {
            setIsExporting(false);
        }
    };

    // Polyline coordinates
    const pathCoordinates = useMemo(
        () => locations.map((loc) => [loc.lat, loc.lng] as [number, number]),
        [locations]
    );

    if (isLoading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
                    <p className="text-dark-400 text-sm">Loading driver data...</p>
                </div>
            </div>
        );
    }

    if (error || !driver) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                    {error || 'Driver not found'}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        to="/admin"
                        className="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                            {driver.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">{driver.name}</h1>
                            <p className="text-dark-400">{driver.email}</p>
                        </div>
                    </div>
                </div>

                {/* Export Button */}
                {selectedSession && (
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="flex items-center gap-2 px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                        {isExporting ? (
                            <>
                                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Exporting...
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Export CSV
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Session Selector */}
            <div className="glass rounded-xl p-4">
                <label className="block text-dark-400 text-sm mb-2">Select Session</label>
                <select
                    value={selectedSession || ''}
                    onChange={(e) => setSelectedSession(e.target.value || null)}
                    className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                    <option value="">Select a session...</option>
                    {sessions.map((session) => (
                        <option key={session.id} value={session.id}>
                            {format(new Date(session.startTimeUtc), 'MMM d, yyyy HH:mm')} -{' '}
                            {session.endTimeUtc
                                ? format(new Date(session.endTimeUtc), 'HH:mm')
                                : 'In Progress'}{' '}
                            ({session.pointCount || 0} points)
                        </option>
                    ))}
                </select>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 glass rounded-xl">
                <button
                    onClick={() => setActiveTab('map')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${activeTab === 'map'
                            ? 'bg-primary-500 text-white'
                            : 'text-dark-400 hover:text-white'
                        }`}
                >
                    Map View
                </button>
                <button
                    onClick={() => setActiveTab('timeline')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${activeTab === 'timeline'
                            ? 'bg-primary-500 text-white'
                            : 'text-dark-400 hover:text-white'
                        }`}
                >
                    Timeline
                </button>
            </div>

            {/* Content */}
            {activeTab === 'map' ? (
                <div className="glass rounded-2xl overflow-hidden" style={{ height: '500px' }}>
                    {locations.length > 0 ? (
                        <MapContainer
                            center={[locations[0].lat, locations[0].lng]}
                            zoom={15}
                            style={{ height: '100%', width: '100%' }}
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <MapBoundsUpdater locations={locations} />

                            {/* Route polyline */}
                            <Polyline
                                positions={pathCoordinates}
                                color="#6366f1"
                                weight={4}
                                opacity={0.8}
                            />

                            {/* Start marker */}
                            <Marker position={[locations[0].lat, locations[0].lng]} icon={startIcon}>
                                <Popup>
                                    <div className="text-dark-900">
                                        <strong>Start</strong>
                                        <br />
                                        {format(new Date(locations[0].tsUtc), 'HH:mm:ss')}
                                    </div>
                                </Popup>
                            </Marker>

                            {/* End marker */}
                            {locations.length > 1 && (
                                <Marker
                                    position={[
                                        locations[locations.length - 1].lat,
                                        locations[locations.length - 1].lng,
                                    ]}
                                    icon={endIcon}
                                >
                                    <Popup>
                                        <div className="text-dark-900">
                                            <strong>End</strong>
                                            <br />
                                            {format(new Date(locations[locations.length - 1].tsUtc), 'HH:mm:ss')}
                                        </div>
                                    </Popup>
                                </Marker>
                            )}
                        </MapContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center">
                            <div className="text-center">
                                <svg className="w-16 h-16 text-dark-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                </svg>
                                <p className="text-dark-400">No location data for this session</p>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="glass rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-dark-700">
                                    <th className="text-left p-4 text-dark-400 font-medium">Time</th>
                                    <th className="text-left p-4 text-dark-400 font-medium">Coordinates</th>
                                    <th className="text-left p-4 text-dark-400 font-medium">Accuracy</th>
                                    <th className="text-left p-4 text-dark-400 font-medium">Speed</th>
                                    <th className="text-left p-4 text-dark-400 font-medium">Heading</th>
                                </tr>
                            </thead>
                            <tbody>
                                {locations.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-dark-400">
                                            No location data for this session
                                        </td>
                                    </tr>
                                ) : (
                                    locations.map((loc, index) => (
                                        <tr
                                            key={loc.id}
                                            className="border-b border-dark-700/50 hover:bg-dark-800/30 transition-colors"
                                        >
                                            <td className="p-4">
                                                <span className="text-white font-mono text-sm">
                                                    {format(new Date(loc.tsUtc), 'HH:mm:ss')}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className="text-white font-mono text-sm">
                                                    {loc.lat.toFixed(6)}, {loc.lng.toFixed(6)}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className="text-white">
                                                    {loc.accuracy ? `±${Math.round(loc.accuracy)}m` : '-'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className="text-white">
                                                    {loc.speed ? `${(loc.speed * 3.6).toFixed(1)} km/h` : '-'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className="text-white">
                                                    {loc.heading ? `${Math.round(loc.heading)}°` : '-'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {locations.length > 0 && (
                        <div className="p-4 border-t border-dark-700 text-dark-400 text-sm">
                            Showing {locations.length} location points
                        </div>
                    )}
                </div>
            )}

            {/* Session Stats */}
            {selectedSession && locations.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="glass rounded-xl p-4">
                        <p className="text-dark-400 text-sm">Total Points</p>
                        <p className="text-xl font-bold text-white">{locations.length}</p>
                    </div>
                    <div className="glass rounded-xl p-4">
                        <p className="text-dark-400 text-sm">Duration</p>
                        <p className="text-xl font-bold text-white">
                            {formatDuration(
                                Math.floor(
                                    (new Date(locations[locations.length - 1].tsUtc).getTime() -
                                        new Date(locations[0].tsUtc).getTime()) /
                                    1000
                                )
                            )}
                        </p>
                    </div>
                    <div className="glass rounded-xl p-4">
                        <p className="text-dark-400 text-sm">Avg Accuracy</p>
                        <p className="text-xl font-bold text-white">
                            ±{Math.round(
                                locations.reduce((sum, loc) => sum + (loc.accuracy || 0), 0) /
                                locations.filter((l) => l.accuracy).length
                            )}m
                        </p>
                    </div>
                    <div className="glass rounded-xl p-4">
                        <p className="text-dark-400 text-sm">Max Speed</p>
                        <p className="text-xl font-bold text-white">
                            {(Math.max(...locations.map((l) => l.speed || 0)) * 3.6).toFixed(1)} km/h
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (h > 0) {
        return `${h}h ${m}m`;
    }
    if (m > 0) {
        return `${m}m ${s}s`;
    }
    return `${s}s`;
}
