const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiClient {
    private token: string | null = null;

    setToken(token: string | null) {
        this.token = token;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        };

        if (this.token) {
            (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Request failed' }));
            throw new Error(error.error || `HTTP ${response.status}`);
        }

        return response.json();
    }

    // Auth
    async login(email: string, password: string) {
        return this.request<{ token: string; user: import('../types').User }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
    }

    async getMe() {
        return this.request<{
            user: import('../types').User;
            activeSession: import('../types').Session | null;
        }>('/auth/me');
    }

    // Sessions
    async startSession() {
        return this.request<{ message: string; session: import('../types').Session }>(
            '/sessions/start',
            { method: 'POST' }
        );
    }

    async pauseSession() {
        return this.request<{ message: string; session: import('../types').Session }>(
            '/sessions/pause',
            { method: 'POST' }
        );
    }

    async resumeSession() {
        return this.request<{ message: string; session: import('../types').Session }>(
            '/sessions/resume',
            { method: 'POST' }
        );
    }

    async stopSession() {
        return this.request<{
            message: string;
            session: import('../types').Session;
            stats: { pointCount: number; duration: number };
        }>('/sessions/stop', { method: 'POST' });
    }

    async getCurrentSession() {
        return this.request<{
            session: import('../types').Session & { lastPoint: import('../types').LocationPoint | null } | null;
        }>('/sessions/current');
    }

    // Locations
    async uploadLocations(points: import('../types').QueuedLocationPoint[]) {
        return this.request<{
            success: boolean;
            stats: { total: number; accepted: number; rejected: number };
            accepted: string[];
            rejected: { point_id: string; reason: string }[];
        }>('/locations/batch', {
            method: 'POST',
            body: JSON.stringify({ points }),
        });
    }

    // Admin
    async getDrivers() {
        return this.request<{ drivers: import('../types').Driver[] }>('/admin/drivers');
    }

    async getDriver(driverId: string) {
        return this.request<{ driver: any }>(`/admin/drivers/${driverId}`);
    }

    async getDriverSessions(driverId: string, params?: { from?: string; to?: string }) {
        const query = new URLSearchParams();
        if (params?.from) query.set('from', params.from);
        if (params?.to) query.set('to', params.to);
        const queryString = query.toString();
        return this.request<{
            sessions: import('../types').Session[];
            pagination: { total: number; limit: number; offset: number };
        }>(`/admin/drivers/${driverId}/sessions${queryString ? `?${queryString}` : ''}`);
    }

    async getDriverLocations(
        driverId: string,
        params?: { session_id?: string; date?: string }
    ) {
        const query = new URLSearchParams();
        if (params?.session_id) query.set('session_id', params.session_id);
        if (params?.date) query.set('date', params.date);
        const queryString = query.toString();
        return this.request<{
            locations: import('../types').LocationPoint[];
            pagination: { total: number; limit: number; offset: number };
        }>(`/admin/drivers/${driverId}/locations${queryString ? `?${queryString}` : ''}`);
    }

    async exportSession(sessionId: string) {
        const response = await fetch(`${API_URL}/admin/export?session_id=${sessionId}`, {
            headers: {
                Authorization: `Bearer ${this.token}`,
            },
        });

        if (!response.ok) {
            throw new Error('Export failed');
        }

        return response.blob();
    }

    async getStats() {
        return this.request<{
            stats: {
                totalDrivers: number;
                activeDrivers: number;
                totalSessions: number;
                activeSessions: number;
                totalPoints: number;
                todayPoints: number;
            };
        }>('/admin/stats');
    }
}

export const api = new ApiClient();
