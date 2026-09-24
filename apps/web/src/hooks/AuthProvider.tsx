import type { AuthUser } from '@bchealth/types';
import { useEffect, useMemo, useState } from 'react';
import { clearSession, login as loginRequest, logout as logoutRequest, SESSION_CLEARED_EVENT, signup as signupRequest } from '../services/api';
import { AuthContext, type AuthContextValue } from './auth-context';

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

  const value = useMemo<AuthContextValue>(() => ({
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
  }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
