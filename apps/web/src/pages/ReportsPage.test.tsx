import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { exportOperationalReport, getOperationalReport } from '../services/api';
import { ReportsPage } from './ReportsPage';

let roles = ['DOCTOR'];

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1', displayName: 'Report User', roles }, isAuthenticated: true }),
}));

vi.mock('../services/api', () => ({
  getOperationalReport: vi.fn(),
  exportOperationalReport: vi.fn(),
}));

const report = {
  generatedAt: '2026-10-02T00:00:00.000Z',
  period: { from: '2026-10-01', to: '2026-10-02' },
  filters: { domain: 'ALL' as const, patientType: 'ALL' as const },
  activePatients: 12,
  clinical: { visits: 8, completedVisits: 6, appointments: 4 },
  compliance: { evidenceSubmitted: 3, evidenceVerified: 2, clearancesRequested: 2, clearancesIssued: 1 },
  inventory: { medicines: 5, lowStock: 1, transactions: 9 },
};

function renderPage() {
  vi.mocked(getOperationalReport).mockResolvedValue(report);
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><ReportsPage /></QueryClientProvider>);
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  roles = ['DOCTOR'];
});

describe('ReportsPage controlled reporting', () => {
  it('shows aggregate data but withholds export from a read-only reporting role', async () => {
    renderPage();
    expect(await screen.findByText('Clinic visits')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Export aggregate CSV/i })).not.toBeInTheDocument();
    expect(screen.getByText(/restricted to administrators and clinic nurses/i)).toBeInTheDocument();
    expect(screen.getByText(/Patient names, complaints, diagnoses/i)).toBeInTheDocument();
  });

  it('applies approved filters and allows a clinic nurse to request an audited export', async () => {
    roles = ['CLINIC_NURSE'];
    vi.mocked(exportOperationalReport).mockResolvedValue(undefined);
    renderPage();
    const user = userEvent.setup();
    await screen.findByText('Clinic visits');

    await user.click(screen.getByLabelText('Report domain'));
    await user.click(await screen.findByRole('option', { name: 'Clinical operations' }));
    await user.click(screen.getByRole('button', { name: 'Apply filters' }));
    expect(getOperationalReport).toHaveBeenLastCalledWith(expect.objectContaining({ domain: 'CLINICAL' }));

    await user.click(screen.getByRole('button', { name: 'Export aggregate CSV' }));
    expect(exportOperationalReport).toHaveBeenCalledWith(expect.objectContaining({ domain: 'CLINICAL' }));
    expect(await screen.findByRole('status')).toHaveTextContent('recorded in the audit log');
  });
});
