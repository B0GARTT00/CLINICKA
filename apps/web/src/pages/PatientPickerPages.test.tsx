import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CertificatesPage } from './CertificatesPage';
import { ClearancesPage } from './ClearancesPage';
import { EmergenciesPage } from './EmergenciesPage';
import { ScreeningsPage } from './ScreeningsPage';
import { VaccinationHistoryPage } from './VaccinationHistoryPage';
import { VaccinationsPage } from './VaccinationsPage';

vi.mock('../services/api', () => ({
  getPatients: vi
    .fn()
    .mockResolvedValue([
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
    await user.click(await screen.findByRole('button', { name: /Santos, Ana/ }));
    expect(patientInputs[0]).toHaveValue('Santos, Ana · CLN-2026-00042');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
