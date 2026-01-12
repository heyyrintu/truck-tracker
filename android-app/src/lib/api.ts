const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiClient {
    private token: string | null = null;

    setToken(token: string | null) {
        this.token = token;
    }

    getToken(): string | null {
        return this.token;
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
            session: import('../types').Session | null;
        }>('/sessions/current');
    }

    // Locations
    async uploadLocations(points: import('../types').LocationPoint[]) {
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
}

export const api = new ApiClient();
