import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { completePasswordReset, requestPasswordReset } from '../services/api';
import { ForgotPasswordPage, ResetPasswordPage } from './AccountRecoveryPage';

vi.mock('../services/api', () => ({
  requestPasswordReset: vi.fn().mockResolvedValue({ message: 'If an eligible account exists, password reset instructions will be sent.' }),
  completePasswordReset: vi.fn().mockResolvedValue({ message: 'Your password has been reset. Sign in with your new password.' }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('account recovery pages', () => {
  it('requests recovery with an institutional email and shows the neutral response', async () => {
    render(<MemoryRouter><ForgotPasswordPage /></MemoryRouter>);
    await userEvent.type(screen.getByLabelText('Institutional email'), 'person@brokenshire.edu.ph');
    await userEvent.click(screen.getByRole('button', { name: /view recovery instructions/i }));

    expect(requestPasswordReset).toHaveBeenCalledWith('person@brokenshire.edu.ph');
    expect(await screen.findByText(/if an eligible account exists/i)).toBeInTheDocument();
  });

  it('submits the reset token with matching new passwords', async () => {
    const token = 'a'.repeat(43);
    render(<MemoryRouter initialEntries={[`/reset-password?token=${token}`]}><ResetPasswordPage /></MemoryRouter>);
    await userEvent.type(screen.getByLabelText('New password'), 'NewPassword123!');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'NewPassword123!');
    await userEvent.click(screen.getByRole('button', { name: /reset password/i }));

    expect(completePasswordReset).toHaveBeenCalledWith(token, 'NewPassword123!');
    expect(await screen.findByText(/previous sessions have been signed out/i)).toBeInTheDocument();
  });
});
