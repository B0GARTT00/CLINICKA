import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DashboardPage } from './DashboardPage';

vi.mock('../services/api', async () => {
  const original = await vi.importActual('../services/api');
  return {
    ...original,
    getHealth: vi.fn().mockResolvedValue({ status: 'ok', service: 'bchealth-api', timestamp: new Date().toISOString() }),
    getReportsSummary: vi.fn().mockResolvedValue({ patients: 0, visitsToday: 0, visitsCompleted: 0, appointmentsUpcoming: 0, pendingRequirements: 0, clearancesForReview: 0, medicines: 0, lowStock: 0 }),
    getVisitQueue: vi.fn().mockResolvedValue([]),
    getAppointments: vi.fn().mockResolvedValue([]),
    getMedicines: vi.fn().mockResolvedValue([]),
    getAnnouncements: vi.fn().mockResolvedValue([]),
  };
});

describe('DashboardPage', () => {
  it('renders clinic dashboard cards', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <DashboardPage />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
    expect(await screen.findByText("Today's visits")).toBeInTheDocument();
    expect(screen.getByText('Low-stock medicines')).toBeInTheDocument();
  });
});
