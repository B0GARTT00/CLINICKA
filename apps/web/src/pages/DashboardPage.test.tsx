import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { DashboardPage } from './DashboardPage';
import { getAppointments, getMedicines, getReportsSummary, getVisitQueue } from '../services/api';
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'admin', roles: ['ADMINISTRATOR'] } }) }));
vi.mock('../services/api', () => ({ getAnnouncements: vi.fn(), getAppointments: vi.fn(), getMedicines: vi.fn(), getReportsSummary: vi.fn(), getVisitQueue: vi.fn() }));
afterEach(cleanup);
it('shows administration tools without requesting private clinic data', () => {
  render(<MemoryRouter><QueryClientProvider client={new QueryClient()}><DashboardPage /></QueryClientProvider></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Administrator dashboard' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /User accounts/ })).toHaveAttribute('href', '/admin/users');
  expect(screen.queryByRole('link', { name: /patients/i })).not.toBeInTheDocument();
  for (const request of [getAppointments, getMedicines, getReportsSummary, getVisitQueue]) expect(request).not.toHaveBeenCalled();
});
