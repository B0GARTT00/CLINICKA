import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ReportsPage } from './ClinicReportsPage';
import { exportClinicReport, getOperationalReport, getClinicLogbook, getClinicReportOptions, getClinicUtilization, getMedicineSummary } from '../services/api';

let roles = ['CLINIC_NURSE'];
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { roles } }) }));
vi.mock('../services/api', () => ({ getClinicReportOptions: vi.fn(), getClinicUtilization: vi.fn(), getMedicineSummary: vi.fn(), getClinicLogbook: vi.fn(), exportClinicReport: vi.fn(), getOperationalReport: vi.fn(), exportOperationalReport: vi.fn() }));
beforeEach(() => {
  roles = ['CLINIC_NURSE'];
  vi.mocked(getOperationalReport).mockResolvedValue({ generatedAt: '', period: { from: '2026-10-01', to: '2026-10-16' }, filters: { domain: 'ALL', patientType: 'ALL' }, activePatients: 10, clinical: { visits: 5, completedVisits: 3, appointments: 2 }, compliance: null, inventory: null });
  vi.mocked(getClinicReportOptions).mockResolvedValue({ departments: [{ id: 'nursing', name: 'Nursing', programs: [{ id: 'bsn', name: 'BS Nursing' }] }], academicYears: [] });
  vi.mocked(getClinicUtilization).mockResolvedValue({ period: { from: '', to: '' }, totalVisits: 5, uniquePatients: 2, patientTypes: [], departments: [], programs: [], weeks: [], months: [] });
  vi.mocked(getMedicineSummary).mockResolvedValue({ period: { from: '', to: '' }, grouping: 'WEEK', rows: [{ id: 'med', period: '2026-10-05', medicine: 'Paracetamol', unit: 'tablet', quantity: 12, transactions: 3 }] });
  vi.mocked(getClinicLogbook).mockResolvedValue({ rows: [{ id: 'v1', date: '2026-10-05', patient: 'Ana Santos', gender: 'FEMALE', age: 25, positionCourse: 'BS Nursing', diagnosis: 'Headache', medicalOrders: 'Rest', remarksFollowUp: 'Return in 7 days' }], page: 1, limit: 25, total: 1 });
  vi.mocked(exportClinicReport).mockResolvedValue(undefined);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });
function renderOverview() { render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><ReportsPage /></QueryClientProvider>); }
async function renderPage(report = 'Clinic visits') { renderOverview(); await userEvent.setup().click(await screen.findByRole('button', { name: new RegExp('^' + report) })); }

it('shows distinct visit and patient totals without loading clinical logbook records', async () => {
  await renderPage();
  expect(await screen.findByText('Each clinic visit counts, including repeat visits.')).toBeInTheDocument();
  expect(screen.getByText('Unique patients')).toBeInTheDocument();
  expect(screen.getByText('5')).toBeInTheDocument();
  expect(screen.getByText('2')).toBeInTheDocument();
  expect(getClinicLogbook).not.toHaveBeenCalled();
});
it('applies department and program filters together', async () => {
  await renderPage(); const user = userEvent.setup();
  await screen.findByText('Each clinic visit counts, including repeat visits.');
  await user.click(screen.getByLabelText('Department'));
  await user.click(await screen.findByRole('option', { name: 'Nursing' }));
  await user.click(screen.getByRole('button', { name: 'More filters' }));
  await user.click(screen.getByLabelText('Program / course'));
  await user.click(await screen.findByRole('option', { name: 'BS Nursing' }));
  await user.click(screen.getByRole('button', { name: 'Update report' }));
  await waitFor(() => expect(getClinicUtilization).toHaveBeenLastCalledWith(expect.objectContaining({ departmentId: 'nursing', programId: 'bsn' })));
});
it('shows medicine quantities and switches to monthly grouping', async () => {
  await renderPage('Medicine usage'); const user = userEvent.setup();
  expect(await screen.findByText('Paracetamol')).toBeInTheDocument();
  expect(screen.getByText('12')).toBeInTheDocument();
  await user.click(screen.getByLabelText('Group by'));
  await user.click(await screen.findByRole('option', { name: 'Month' }));
  await user.click(screen.getByRole('button', { name: 'Update report' }));
  await waitFor(() => expect(getMedicineSummary).toHaveBeenLastCalledWith(expect.objectContaining({ grouping: 'MONTH' })));
});
it('loads logbook only when selected and exports the selected report', async () => {
  await renderPage('Clinic logbook'); const user = userEvent.setup();
  expect(await screen.findByText('Ana Santos')).toBeInTheDocument();
  expect(screen.getByText('Return in 7 days')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Download CSV' }));
  expect(exportClinicReport).toHaveBeenCalledWith('logbook', expect.objectContaining({ grouping: 'WEEK' }));
});
it('withholds exports from doctors who have read permission only', async () => {
  roles = ['DOCTOR']; await renderPage();
  await screen.findByText('Each clinic visit counts, including repeat visits.');
  expect(screen.queryByRole('button', { name: 'Download CSV' })).not.toBeInTheDocument();
});

it('keeps extra filters and old summaries out of the initial report view', async () => {
  await renderPage();
  await screen.findByText('Total visits');
  expect(screen.queryByLabelText('Academic year')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Program / course')).not.toBeInTheDocument();
  expect(screen.getAllByRole('table')).toHaveLength(1);
  expect(screen.queryByRole('tab')).not.toBeInTheDocument();
});
it('changes the utilization breakdown without adding tables or refetching private records', async () => {
  await renderPage(); const user = userEvent.setup();
  await screen.findByText('Total visits');
  await user.click(screen.getByLabelText('Break down visits by'));
  await user.click(await screen.findByRole('option', { name: 'Month' }));
  expect(screen.getAllByRole('table')).toHaveLength(1);
  expect(screen.getByText(/Weeks start Monday/)).toBeInTheDocument();
  expect(getClinicLogbook).not.toHaveBeenCalled();
});
it('requires updated results before downloading when filters change', async () => {
  await renderPage(); const user = userEvent.setup();
  await screen.findByText('Total visits');
  await user.click(screen.getByLabelText('Department'));
  await user.click(await screen.findByRole('option', { name: 'Nursing' }));
  expect(screen.getByRole('button', { name: 'Download CSV' })).toBeDisabled();
  expect(screen.getByRole('status')).toHaveTextContent('Filters changed');
  await user.click(screen.getByRole('button', { name: 'Update report' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Download CSV' })).toBeEnabled());
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

it('opens on the summary with three drill-down choices and returns from a detail view', async () => {
  renderOverview(); const user = userEvent.setup();
  expect(await screen.findByRole('heading', { name: 'Clinic reports' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Explore detailed reports' })).toBeInTheDocument();
  expect(screen.queryByText('Other summaries')).not.toBeInTheDocument();
  expect(getClinicLogbook).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: /^Clinic visits/ }));
  await screen.findByText('Total visits');
  await user.click(screen.getByRole('button', { name: /Back to reports overview/ }));
  expect(await screen.findByRole('heading', { name: 'Clinic reports' })).toBeInTheDocument();
});
