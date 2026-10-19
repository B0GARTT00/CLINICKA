import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { UserRoleName } from '@clinicka/types';
import { AuthContext, type AuthContextValue } from '../hooks/auth-context';
import { AuthorizedRoute } from './AuthorizedRoute';

afterEach(cleanup);

function renderRoute(path: string, roles: UserRoleName[]) {
  const value: AuthContextValue = {
    user: { id: 'user-1', email: 'user@example.test', displayName: 'Test User', roles },
    isAuthenticated: true,
    login: vi.fn(), signup: vi.fn(), logout: vi.fn(),
  };
  return render(<AuthContext.Provider value={value}><MemoryRouter initialEntries={[path]}><Routes><Route path="/dashboard" element={<div>Dashboard landing</div>} /><Route element={<AuthorizedRoute />}><Route path={path} element={<div>Protected workflow</div>} /></Route></Routes></MemoryRouter></AuthContext.Provider>);
}

describe('AuthorizedRoute', () => {
  it('renders authorized workflow UI', () => {
    renderRoute('/inventory/medicines', ['CLINIC_NURSE']);
    expect(screen.getByText('Protected workflow')).toBeInTheDocument();
  });

  it.each(['STUDENT', 'ADMINISTRATOR'] as const)('redirects unauthorized %s accounts to their dashboard', (role) => {
    renderRoute('/inventory/medicines', [role]);
    expect(screen.queryByText('Protected workflow')).not.toBeInTheDocument();
    expect(screen.getByText('Dashboard landing')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Access restricted' })).not.toBeInTheDocument();
  });
});

