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
import {
    saveToken,
    getToken,
    removeToken,
    saveActiveSession,
    getActiveSession,
    removeActiveSession,
} from '../lib/storage';

interface AuthContextType {
    user: User | null;
    activeSession: Session | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    setActiveSession: (session: Session | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [activeSession, setActiveSessionState] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const setActiveSession = useCallback(async (session: Session | null) => {
        setActiveSessionState(session);
        if (session) {
            await saveActiveSession(session);
        } else {
            await removeActiveSession();
        }
    }, []);

    const refreshUser = useCallback(async () => {
        try {
            const token = await getToken();
            if (!token) {
                setUser(null);
                setActiveSessionState(null);
                return;
            }

            api.setToken(token);

            try {
                const { user, activeSession } = await api.getMe();
                setUser(user);
                await setActiveSession(activeSession);
            } catch {
                // If API fails, try to use cached session
                const cachedSession = await getActiveSession();
                if (cachedSession) {
                    setActiveSessionState(cachedSession);
                }
                throw new Error('Failed to refresh');
            }
        } catch (error) {
            console.error('Failed to refresh user:', error);
            // Don't logout on error - might be offline
        }
    }, [setActiveSession]);

    useEffect(() => {
        const init = async () => {
            const token = await getToken();
            if (token) {
                api.setToken(token);
                try {
                    await refreshUser();
                } catch {
                    // Continue with cached data if available
                }
            }
            setIsLoading(false);
        };
        init();
    }, [refreshUser]);

    const login = async (email: string, password: string) => {
        const { token, user } = await api.login(email, password);
        await saveToken(token);
        api.setToken(token);
        setUser(user);

        // Fetch active session
        const { session } = await api.getCurrentSession();
        await setActiveSession(session);
    };

    const logout = async () => {
        await removeToken();
        await removeActiveSession();
        api.setToken(null);
        setUser(null);
        setActiveSessionState(null);
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
