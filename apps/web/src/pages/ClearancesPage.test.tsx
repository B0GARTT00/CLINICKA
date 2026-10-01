import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { requestClearance } from '../services/api';
import { ClearancesPage } from './ClearancesPage';

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'student-user-1', patientId: 'patient-1', roles: ['STUDENT'] },
    isAuthenticated: true,
  }),
}));

vi.mock('../services/api', () => ({
  getClearances: vi.fn().mockResolvedValue([]),
  getMyClearances: vi.fn().mockResolvedValue([]),
  checkMyClearanceEligibility: vi.fn().mockResolvedValue({ eligible: false }),
  getRequirements: vi.fn().mockResolvedValue([{ id: 'requirement-1', name: 'Medical exam', applicableTo: 'STUDENT' }]),
  getRequirementSubmissions: vi.fn().mockResolvedValue([]),
  submitRequirementEvidence: vi.fn(),
  requestClearance: vi.fn().mockResolvedValue({ id: 'request-1', status: 'PENDING' }),
  reviewClearance: vi.fn(),
  reviewRequirementSubmission: vi.fn(),
  downloadRequirementEvidence: vi.fn(),
}));

describe('ClearancesPage self-service workflow', () => {
  it('lets a linked patient submit a clearance request without choosing another patient', async () => {
    render(<MemoryRouter><QueryClientProvider client={new QueryClient()}><ClearancesPage /></QueryClientProvider></MemoryRouter>);
    const user = userEvent.setup();

    expect(await screen.findByText('Request medical clearance')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Search name or patient ID')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Submit request' }));

    expect(requestClearance).toHaveBeenCalledWith('COLLEGE');
    expect(await screen.findByText('Your clearance request was sent to the clinic.')).toBeInTheDocument();
  });
});
