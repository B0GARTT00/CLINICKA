import type { AuthUser } from '@bchealth/types';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { clearSession, login as loginRequest, logout as logoutRequest, SESSION_CLEARED_EVENT, signup as signupRequest } from '../services/api';

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, displayName: string, password: string, patientType: 'STUDENT' | 'FACULTY' | 'STAFF') => Promise<{ message: string; verificationUrl?: string }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser() {
  const stored = localStorage.getItem('bchealth.user');
  if (!stored) return null;

  try {
    return JSON.parse(stored) as AuthUser;
  } catch {
    clearSession();
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());

  useEffect(() => {
    const handleSessionCleared = () => setUser(null);
    window.addEventListener(SESSION_CLEARED_EVENT, handleSessionCleared);
    return () => window.removeEventListener(SESSION_CLEARED_EVENT, handleSessionCleared);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      async login(email, password) {
        const session = await loginRequest(email, password);
        setUser(session.user);
      },
      async signup(email, displayName, password, patientType) {
        return signupRequest(email, displayName, password, patientType);
      },
      async logout() {
        await logoutRequest();
        setUser(null);
      },
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}
