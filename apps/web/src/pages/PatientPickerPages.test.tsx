import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'nurse-1', email: 'nurse@example.test', displayName: 'Clinic Nurse', roles: ['CLINIC_NURSE'] },
    isAuthenticated: true,
  }),
}));
import { checkClearanceEligibility } from '../services/api';
import { CertificatesPage } from './CertificatesPage';
import { ClearancesPage } from './ClearancesPage';
import { EmergenciesPage } from './EmergenciesPage';
import { ScreeningsPage } from './ScreeningsPage';
import { VaccinationHistoryPage } from './VaccinationHistoryPage';
import { VaccinationsPage } from './VaccinationsPage';

vi.mock('../services/api', () => ({
  getPatients: vi.fn().mockResolvedValue([
    {
      id: 'patient-1',
      patientNumber: 'CLN-2026-00042',
      type: 'STUDENT',
      firstName: 'Ana',
      lastName: 'Santos',
    },
  ]),
  getCertificates: vi.fn().mockResolvedValue([]),
  getClearances: vi.fn().mockResolvedValue([]),
  getRequirements: vi
    .fn()
    .mockResolvedValue([
      {
        id: 'requirement-1',
        name: 'Medical exam',
        applicableTo: 'ALL',
        _count: { submissions: 0 },
      },
    ]),
  getRequirementSubmissions: vi.fn().mockResolvedValue([]),
  checkClearanceEligibility: vi
    .fn()
    .mockResolvedValue({
      eligible: false,
      evaluatedAt: '2026-09-19T00:00:00.000Z',
      academicYear: { id: 'ay-1', name: '2026-2027' },
      semester: { id: 'sem-1', name: 'First semester' },
      ineligibilityReasons: [{ requirementId: 'requirement-1', requirementName: 'Medical exam', code: 'NOT_SUBMITTED', detail: "Requirement 'Medical exam' has not been submitted." }],
      applicableRequirements: [{ id: 'requirement-1', name: 'Medical exam', satisfied: false, status: null, reason: 'Needed' }],
    }),
  getEmergencies: vi.fn().mockResolvedValue([]),
  getScreenings: vi.fn().mockResolvedValue([]),
  getVaccinations: vi.fn().mockResolvedValue([]),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('patient selection across clinical forms', () => {
  it.each([
    ['Certificates', CertificatesPage],
    ['Clearances', ClearancesPage],
    ['Emergencies', EmergenciesPage],
    ['Screenings', ScreeningsPage],
    ['Vaccination history', VaccinationHistoryPage],
    ['Combined vaccination and screening', VaccinationsPage],
  ])('%s puts the chosen patient in the input', async (_name, Page) => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <Page />
      </QueryClientProvider>,
    );
    const user = userEvent.setup();
    const patientInputs = await screen.findAllByPlaceholderText('Search name or patient ID');
    await user.click(patientInputs[0]);
    await user.click(await screen.findByRole('option', { name: /Santos, Ana/ }));
    expect(patientInputs[0]).toHaveValue('Santos, Ana · CLN-2026-00042');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('shows the selected patient’s requirement status beside clearance creation', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ClearancesPage />
      </QueryClientProvider>,
    );
    const user = userEvent.setup();
    const patientInput = await screen.findByPlaceholderText('Search name or patient ID');
    await user.click(patientInput);
    await user.click(await screen.findByRole('option', { name: /Santos, Ana/ }));
    expect(await screen.findByText('Medical exam: Needed')).toBeInTheDocument();
    expect(screen.getByText(/Verify all required documents before creating a clearance review/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create review' })).toBeDisabled();
    expect(screen.getByText('1. Verify requirements')).toBeInTheDocument();
  });

  it('enables clearance review once every applicable requirement is verified', async () => {
    vi.mocked(checkClearanceEligibility).mockResolvedValueOnce({ eligible: true, evaluatedAt: '2026-09-19T00:00:00.000Z', academicYear: { id: 'ay-1', name: '2026-2027' }, semester: { id: 'sem-1', name: 'First semester' }, ineligibilityReasons: [], applicableRequirements: [{ id: 'requirement-1', name: 'Medical exam', satisfied: true, status: 'VERIFIED' }] });
    render(<QueryClientProvider client={new QueryClient()}><ClearancesPage /></QueryClientProvider>);
    const user = userEvent.setup();
    await user.click(await screen.findByPlaceholderText('Search name or patient ID'));
    await user.click(await screen.findByRole('option', { name: /Santos, Ana/ }));
    expect(await screen.findByText('Medical exam: Verified')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create review' })).toBeEnabled();
  });
});
