import type { AuthUser } from '@clinicka/types';
import { useEffect, useMemo, useState } from 'react';
import { clearSession, login as loginRequest, logout as logoutRequest, SESSION_CLEARED_EVENT, signup as signupRequest } from '../services/api';
import { AuthContext, type AuthContextValue } from './auth-context';

function readStoredUser() {
  const stored = localStorage.getItem('clinicka.user');
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
    const handleUserUpdated = (event: Event) => setUser((event as CustomEvent<AuthUser>).detail);
    window.addEventListener(SESSION_CLEARED_EVENT, handleSessionCleared);
    window.addEventListener('clinicka:user-updated', handleUserUpdated);
    return () => {
      window.removeEventListener(SESSION_CLEARED_EVENT, handleSessionCleared);
      window.removeEventListener('clinicka:user-updated', handleUserUpdated);
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthenticated: Boolean(user),
    async login(email, password) {
      const session = await loginRequest(email, password);
      setUser(session.user);
    },
    async signup(email, displayName, password, patientType, affiliation, verificationSessionId) {
      return signupRequest(email, displayName, password, patientType, affiliation, verificationSessionId);
    },
    async logout() {
      await logoutRequest();
      setUser(null);
    },
  }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
