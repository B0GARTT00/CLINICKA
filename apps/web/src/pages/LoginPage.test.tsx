import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../hooks/AuthProvider';
import { LoginPage } from './LoginPage';
import { login, signup } from '../services/api';

vi.mock('../services/api', () => ({
  SESSION_CLEARED_EVENT: 'bchealth:session-cleared',
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
  signup: vi.fn().mockResolvedValue({ message: 'Account created. Use the activation link below to verify your CLINICKA account.', verificationUrl: 'http://localhost:3000/api/v1/auth/verify-email?token=00000000-0000-4000-8000-000000000001' }),
}));

afterEach(() => cleanup());

/**
 * Types credentials into the form. Fields are cleared first because the demo
 * prefill is active under `import.meta.env.DEV`, which is what vitest runs as.
 */
async function signIn(user: ReturnType<typeof userEvent.setup>) {
  const email = screen.getByLabelText('Email');
  const password = screen.getByLabelText('Password');
  await user.clear(email);
  await user.clear(password);
  await user.type(email, 'admin.demo@brokenshire.edu.ph');
  await user.type(password, 'a-test-password');
  await user.click(screen.getByRole('button', { name: /sign in/i }));
}

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

    await signIn(userEvent.setup());

    expect(await screen.findByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(login).toHaveBeenCalledWith('admin.demo@brokenshire.edu.ph', 'a-test-password');
  });

  it('does not prefill a working credential into the form', () => {
    // A prefilled password would put a seeded account's credential in the
    // production bundle, so the field must start empty.
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <AuthProvider>
            <LoginPage />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByLabelText('Password')).toHaveValue('');
  });

  it('returns to the requested protected page after sign in', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={[{ pathname: '/login', state: { from: '/patients' } }]}>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/patients" element={<div>Patient directory</div>} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await signIn(userEvent.setup());

    expect(await screen.findByText('Patient directory')).toBeInTheDocument();
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
