import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    ReactNode,
} from 'react';
import { User, Session } from '../types';
import { api } from '../lib/api';

interface AuthContextType {
    user: User | null;
    activeSession: Session | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    refreshUser: () => Promise<void>;
    setActiveSession: (session: Session | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [activeSession, setActiveSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refreshUser = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setUser(null);
                setActiveSession(null);
                return;
            }

            api.setToken(token);
            const { user, activeSession } = await api.getMe();
            setUser(user);
            setActiveSession(activeSession);
        } catch (error) {
            console.error('Failed to refresh user:', error);
            localStorage.removeItem('token');
            api.setToken(null);
            setUser(null);
            setActiveSession(null);
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            await refreshUser();
            setIsLoading(false);
        };
        init();
    }, [refreshUser]);

    const login = async (email: string, password: string) => {
        const { token, user } = await api.login(email, password);
        localStorage.setItem('token', token);
        api.setToken(token);
        setUser(user);

        // Fetch active session if driver
        if (user.role === 'driver') {
            const { session } = await api.getCurrentSession();
            setActiveSession(session);
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        api.setToken(null);
        setUser(null);
        setActiveSession(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                activeSession,
                isLoading,
                isAuthenticated: !!user,
                login,
                logout,
                refreshUser,
                setActiveSession,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
