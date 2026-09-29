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
import { getClearances } from '../services/api';
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
  getMyClearances: vi.fn().mockResolvedValue([]),
  checkMyClearanceEligibility: vi.fn().mockResolvedValue({ eligible: false }),
  requestClearance: vi.fn(),
  reviewClearance: vi.fn(),
  reviewRequirementSubmission: vi.fn(),
  downloadRequirementEvidence: vi.fn(),
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

  it('shows submitted medical evidence inside the staff clearance request queue', async () => {
    vi.mocked(getClearances).mockResolvedValueOnce([{ id: 'clearance-1', type: 'COLLEGE', status: 'PENDING', academicYear: { label: '2026-2027' }, patient: { patientNumber: 'STU-1', type: 'STUDENT', firstName: 'Ana', lastName: 'Santos', submissions: [{ id: 'submission-1', status: 'SUBMITTED', submittedAt: '2026-09-29T00:00:00.000Z', requirement: { name: 'Medical exam' }, patient: { patientNumber: 'STU-1', firstName: 'Ana', lastName: 'Santos' }, document: { id: 'doc-1', filename: 'result.pdf', mimeType: 'application/pdf', sizeBytes: 20, isPrivate: true } }] } }]);
    render(<QueryClientProvider client={new QueryClient()}><ClearancesPage /></QueryClientProvider>);
    expect(await screen.findByText('Ana Santos')).toBeInTheDocument();
    expect(screen.getByText('Medical exam')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open submission' })).toBeInTheDocument();
  });
});
