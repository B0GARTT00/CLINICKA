import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AppointmentsPage } from './AppointmentsPage';
import { createAppointment, getDoctorAvailability, getAppointmentDoctors, createDoctorSchedule } from '../services/api';

let roles = ['CLINIC_NURSE'];
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'nurse', roles } }) }));
vi.mock('../components/PatientPicker', () => ({ PatientPicker: ({ onChange }: { onChange: (id: string) => void }) => <button type="button" onClick={() => onChange('patient-1')}>Select Ana Santos</button> }));
vi.mock('../services/api', () => ({
  getAppointments: vi.fn().mockResolvedValue([]), getAppointmentDoctors: vi.fn(), getDoctorAvailability: vi.fn(), getDoctorSchedules: vi.fn().mockResolvedValue([]),
  createAppointment: vi.fn(), updateAppointmentStatus: vi.fn(), checkInAppointment: vi.fn(), createDoctorSchedule: vi.fn(), closeDoctorSchedule: vi.fn(),
}));
const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const morning = new Date(day + 'T09:00:00+08:00').toISOString();
beforeEach(() => {
  roles = ['CLINIC_NURSE'];
  vi.mocked(getAppointmentDoctors).mockResolvedValue([{ id: 'doc-1', displayName: 'Doctor One' }, { id: 'doc-2', displayName: 'Doctor Two' }]);
  vi.mocked(getDoctorAvailability).mockImplementation(async ({ doctorId }) => ({ doctorId, timezone: 'Asia/Manila', days: doctorId === 'doc-1' ? [{ date: day, starts: [morning] }] : [] }));
  vi.mocked(createAppointment).mockResolvedValue({ id: 'a1' } as never);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });
function renderPage() {
  render(<MemoryRouter><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><AppointmentsPage /></QueryClientProvider></MemoryRouter>);
}
async function selectDoctor(user: ReturnType<typeof userEvent.setup>, name = 'Doctor One') {
  await user.click(await screen.findByLabelText(/^Doctor/));
  await user.click(await screen.findByRole('option', { name }));
}
it('books only an available date and time for the selected doctor', async () => {
  renderPage(); const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Select Ana Santos' }));
  expect(screen.getByRole('button', { name: /^Schedule$/ })).toBeDisabled();
  await selectDoctor(user);
  await waitFor(() => expect(screen.getByLabelText('Available date *')).not.toHaveAttribute('aria-disabled', 'true'));
  await user.click(screen.getByLabelText('Available date *'));
  await user.click(await screen.findByRole('option', { name: /1 times/ }));
  await user.click(screen.getByLabelText('Available time *'));
  await user.click(await screen.findByRole('option', { name: /9:00/ }));
  await user.type(screen.getByLabelText(/^Purpose/), 'Consultation');
  await user.click(screen.getByRole('button', { name: /^Schedule$/ }));
  await waitFor(() => expect(createAppointment).toHaveBeenCalledWith({ patientId: 'patient-1', assignedToId: 'doc-1', scheduledAt: morning, purpose: 'Consultation', durationMins: 30 }));
});
it('does not reuse another doctor’s time and explains when no dates are available', async () => {
  renderPage(); const user = userEvent.setup();
  await selectDoctor(user);
  await user.click(await screen.findByLabelText('Doctor *'));
  await user.click(await screen.findByRole('option', { name: 'Doctor Two' }));
  expect(await screen.findByText(/No available appointments for this doctor/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^Schedule$/ })).toBeDisabled();
  expect(createAppointment).not.toHaveBeenCalled();
});
it('allows clinic staff to enter separate dated hours for a doctor', async () => {
  vi.mocked(createDoctorSchedule).mockResolvedValue({ id: 'session' } as never);
  renderPage(); const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: /Doctor schedules/ }));
  await user.click(screen.getByLabelText('Schedule doctor *'));
  await user.click(await screen.findByRole('option', { name: 'Doctor Two' }));
  await user.type(screen.getByLabelText(/^Clinic date/), '2027-01-05');
  await user.type(screen.getByLabelText(/^Start time/), '13:00');
  await user.type(screen.getByLabelText(/^End time/), '16:00');
  await user.click(screen.getByRole('button', { name: 'Add clinic hours' }));
  await waitFor(() => expect(createDoctorSchedule).toHaveBeenCalledWith({ doctorId: 'doc-2', startsAt: '2027-01-05T05:00:00.000Z', endsAt: '2027-01-05T08:00:00.000Z' }));
});
it('keeps doctor accounts read-only for scheduling', async () => {
  roles = ['DOCTOR']; renderPage();
  await screen.findByText('Appointments');
  expect(screen.queryByRole('button', { name: /^Schedule$/ })).not.toBeInTheDocument();
  await userEvent.setup().click(screen.getByRole('button', { name: /Doctor schedules/ }));
  expect(screen.queryByRole('button', { name: 'Add clinic hours' })).not.toBeInTheDocument();
});
