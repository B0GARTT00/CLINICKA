import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { UserRoleName } from '@bchealth/types';
import { AuthContext, type AuthContextValue } from '../hooks/auth-context';
import { AuthorizedRoute } from './AuthorizedRoute';

afterEach(cleanup);

function renderRoute(path: string, roles: UserRoleName[]) {
  const value: AuthContextValue = {
    user: { id: 'user-1', email: 'user@example.test', displayName: 'Test User', roles },
    isAuthenticated: true,
    login: vi.fn(), signup: vi.fn(), logout: vi.fn(),
  };
  return render(<AuthContext.Provider value={value}><MemoryRouter initialEntries={[path]}><Routes><Route element={<AuthorizedRoute />}><Route path={path} element={<div>Protected workflow</div>} /></Route></Routes></MemoryRouter></AuthContext.Provider>);
}

describe('AuthorizedRoute', () => {
  it('renders authorized workflow UI', () => {
    renderRoute('/inventory/medicines', ['CLINIC_NURSE']);
    expect(screen.getByText('Protected workflow')).toBeInTheDocument();
  });

  it('replaces unauthorized workflow UI with a restricted-access page', () => {
    renderRoute('/inventory/medicines', ['STUDENT']);
    expect(screen.queryByText('Protected workflow')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Access restricted' })).toBeInTheDocument();
  });
});
