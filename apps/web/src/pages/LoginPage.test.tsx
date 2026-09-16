import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../hooks/useAuth';
import { LoginPage } from './LoginPage';
import { signup } from '../services/api';

vi.mock('../services/api', () => ({
  clearSession: vi.fn(),
  login: vi.fn().mockResolvedValue({
    accessToken: 'access',
    refreshToken: 'refresh',
    user: {
      id: 'user-1',
      email: 'admin.demo@brokenshire.edu.ph',
      displayName: 'Demo Administrator',
      roles: ['ADMINISTRATOR'],
    },
  }),
  logout: vi.fn(),
  signup: vi.fn().mockResolvedValue({ message: 'Check your email to verify your CLINICKA account.' }),
}));

afterEach(() => cleanup());

describe('LoginPage', () => {
  it('submits valid login credentials', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <AuthProvider>
            <LoginPage />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('toggles password visibility without changing the submitted field', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <AuthProvider>
            <LoginPage />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const password = screen.getByLabelText('Password');
    expect(password).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password).toHaveAttribute('type', 'text');
  });

  it('submits faculty affiliation during account signup', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <AuthProvider><LoginPage /></AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Create an account' }));
    await user.type(screen.getByLabelText('Full name'), 'Pat Example');
    await user.selectOptions(screen.getByLabelText('Campus affiliation'), 'FACULTY');
    await user.type(screen.getByLabelText('Email'), 'pat@brokenshire.edu.ph');
    await user.type(screen.getByLabelText('Password'), 'Secret123!');
    await user.type(screen.getByLabelText('Confirm password'), 'Secret123!');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(signup).toHaveBeenCalledWith('pat@brokenshire.edu.ph', 'Pat Example', 'Secret123!', 'FACULTY');
  });
});
