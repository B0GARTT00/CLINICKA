import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '../hooks/auth-context';
import { ProtectedRoute } from './ProtectedRoute';

function LoginProbe() {
  const location = useLocation();
  return <div>Login destination: {(location.state as { from?: string } | null)?.from}</div>;
}

function authValue(isAuthenticated: boolean): AuthContextValue {
  return {
    user: isAuthenticated ? { id: 'user-1', email: 'user@example.test', displayName: 'Test User', roles: ['STUDENT'] } : null,
    isAuthenticated,
    login: vi.fn(), signup: vi.fn(), logout: vi.fn(),
  };
}

describe('ProtectedRoute', () => {
  it('redirects anonymous users and preserves the requested destination', () => {
    render(<AuthContext.Provider value={authValue(false)}><MemoryRouter initialEntries={['/clearances']}><Routes><Route path="/login" element={<LoginProbe />} /><Route element={<ProtectedRoute />}><Route path="/clearances" element={<div>Clearances</div>} /></Route></Routes></MemoryRouter></AuthContext.Provider>);
    expect(screen.queryByText('Clearances')).not.toBeInTheDocument();
    expect(screen.getByText('Login destination: /clearances')).toBeInTheDocument();
  });

  it('renders protected content for an authenticated user', () => {
    render(<AuthContext.Provider value={authValue(true)}><MemoryRouter initialEntries={['/clearances']}><Routes><Route element={<ProtectedRoute />}><Route path="/clearances" element={<div>Clearances</div>} /></Route></Routes></MemoryRouter></AuthContext.Provider>);
    expect(screen.getByText('Clearances')).toBeInTheDocument();
  });
});
