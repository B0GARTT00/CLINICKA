import type { AuthUser } from '@bchealth/types';
import { createContext } from 'react';

export type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, displayName: string, password: string, patientType: 'STUDENT' | 'FACULTY' | 'STAFF') => Promise<{ message: string; verificationUrl?: string }>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
