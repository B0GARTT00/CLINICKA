import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../hooks/AuthProvider';
import { LoginPage } from './LoginPage';
import { login, resendVerification, signup } from '../services/api';

vi.mock('../services/api', () => ({
  SESSION_CLEARED_EVENT: 'clinicka:session-cleared',
  EMAIL_VERIFIED_EVENT_KEY: 'clinicka:email-verified',
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
  getAcademicCatalog: vi.fn().mockResolvedValue([
    { id: 'dept-1', name: 'Allied Health', programs: [{ id: 'program-1', name: 'BS in Pharmacy', departmentId: 'dept-1' }] },
    { id: 'dept-2', name: 'Business', programs: [{ id: 'program-2', name: 'BS in Accountancy', departmentId: 'dept-2' }] },
  ]),
  resendVerification: vi.fn().mockResolvedValue({ message: 'A new verification email has been sent. Check your inbox and spam folder.' }),
  signup: vi.fn().mockResolvedValue({ message: 'Account created. Check your email for the verification link.' }),
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
    await user.click(screen.getByRole('combobox', { name: 'Campus affiliation' }));
    await user.click(await screen.findByRole('option', { name: 'Faculty' }));
    await user.click(screen.getByRole('combobox', { name: 'Department' }));
    await user.click(await screen.findByRole('option', { name: 'Allied Health' }));
    await user.type(screen.getByLabelText('Employee ID'), 'EMP-0001');
    await user.type(screen.getByLabelText('Email'), 'pat@brokenshire.edu.ph');
    await user.type(screen.getByLabelText('Password'), 'Secret123!');
    await user.type(screen.getByLabelText('Confirm password'), 'Secret123!');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(signup).toHaveBeenCalledWith('pat@brokenshire.edu.ph', 'Pat Example', 'Secret123!', 'FACULTY', {
      departmentId: 'dept-1', employeeId: 'EMP-0001', programId: undefined, section: undefined, studentId: undefined, yearLevel: undefined,
    }, expect.any(String));
    expect(await screen.findByRole('dialog')).toHaveTextContent('Spam or Junk');

    const verificationSessionId = vi.mocked(signup).mock.calls[0][5];
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'clinicka:email-verified',
      newValue: verificationSessionId as string,
    }));
    expect(await screen.findByRole('dialog')).toHaveTextContent('Your email has been verified');
  });

  it('can resend the verification email from the signup modal', async () => {
    vi.clearAllMocks();
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
    await user.click(screen.getByRole('combobox', { name: 'Campus affiliation' }));
    await user.click(await screen.findByRole('option', { name: 'Faculty' }));
    await user.click(screen.getByRole('combobox', { name: 'Department' }));
    await user.click(await screen.findByRole('option', { name: 'Allied Health' }));
    await user.type(screen.getByLabelText('Employee ID'), 'EMP-0001');
    await user.type(screen.getByLabelText('Email'), 'pat@brokenshire.edu.ph');
    await user.type(screen.getByLabelText('Password'), 'Secret123!');
    await user.type(screen.getByLabelText('Confirm password'), 'Secret123!');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    await user.click(screen.getByRole('button', { name: 'Resend email' }));

    expect(resendVerification).toHaveBeenCalledWith('pat@brokenshire.edu.ph');
    expect(await screen.findByRole('dialog')).toHaveTextContent('A new verification email has been sent');
  });

  it('submits student affiliation without reopening the default Student selector', async () => {
    vi.clearAllMocks();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <AuthProvider><LoginPage /></AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Create an account' }));
    await user.type(screen.getByLabelText('Full name'), 'Kyle Lamigo');
    await user.click(screen.getByRole('combobox', { name: 'Department' }));
    await user.click(await screen.findByRole('option', { name: 'Allied Health' }));
    await user.type(screen.getByLabelText('Student ID'), '906360');
    await user.click(screen.getByRole('combobox', { name: 'Program' }));
    await user.click(await screen.findByRole('option', { name: 'BS in Pharmacy' }));
    await user.click(screen.getByRole('combobox', { name: 'Year level' }));
    await user.click(await screen.findByRole('option', { name: 'Year 4' }));
    await user.type(screen.getByLabelText('Email'), 'kyle@brokenshire.edu.ph');
    await user.type(screen.getByLabelText('Password'), 'Secret123!');
    await user.type(screen.getByLabelText('Confirm password'), 'Secret123!');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(signup).toHaveBeenCalledWith('kyle@brokenshire.edu.ph', 'Kyle Lamigo', 'Secret123!', 'STUDENT', {
      departmentId: 'dept-1', employeeId: undefined, programId: 'program-1', section: undefined, studentId: '906360', yearLevel: 4,
    }, expect.any(String));
  });

  it('shows a message when signup validation blocks submission', async () => {
    vi.clearAllMocks();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <AuthProvider><LoginPage /></AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Create an account' }));
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Please enter your email address.');
    expect(signup).not.toHaveBeenCalled();
  });

  it('clears a program when the department changes', async () => {
    vi.clearAllMocks();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <AuthProvider><LoginPage /></AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Create an account' }));
    await user.click(screen.getByRole('combobox', { name: 'Department' }));
    await user.click(await screen.findByRole('option', { name: 'Allied Health' }));
    await user.click(screen.getByRole('combobox', { name: 'Program' }));
    await user.click(await screen.findByRole('option', { name: 'BS in Pharmacy' }));

    await user.click(screen.getByRole('combobox', { name: 'Department' }));
    await user.click(await screen.findByRole('option', { name: 'Business' }));

    expect(screen.getByRole('combobox', { name: 'Program' })).not.toHaveTextContent('BS in Pharmacy');
    expect(signup).not.toHaveBeenCalled();
  });
});
