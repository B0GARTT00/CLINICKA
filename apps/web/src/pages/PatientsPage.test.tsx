import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { archivePatient, createPatient, getPatients } from '../services/api';
import { PatientsPage } from './PatientsPage';

vi.mock('../services/api', () => ({
  getPatients: vi.fn().mockResolvedValue([]),
  createPatient: vi.fn().mockResolvedValue({
    id: 'patient-1', patientNumber: 'CLN-2026-00042', type: 'STUDENT', firstName: 'Pat', lastName: 'Example',
  }),
  updatePatient: vi.fn(),
  archivePatient: vi.fn().mockResolvedValue({ id: 'patient-1', archiveStatus: 'ARCHIVED' }),
  restorePatient: vi.fn().mockResolvedValue({ id: 'patient-1', archiveStatus: 'ACTIVE' }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PatientsPage manual registration', () => {
  it('shows a read-only Patient ID and displays the assigned number after save', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter><PatientsPage /></MemoryRouter>
      </QueryClientProvider>,
    );
    const user = userEvent.setup();
    await screen.findByText('No patients found');
    expect(getPatients).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Add patient manually' }));

    expect(screen.getByLabelText('Patient ID')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Patient ID')).toHaveValue('Automatically assigned when saved');
    expect(screen.getByLabelText(/Student ID/)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/First name/), 'Pat');
    await user.type(screen.getByLabelText(/Last name/), 'Example');
    await user.click(screen.getByRole('button', { name: 'Add patient' }));

    expect(createPatient).toHaveBeenCalledWith(expect.objectContaining({ firstName: 'Pat', lastName: 'Example', studentId: undefined }));
    expect(await screen.findByRole('alert')).toHaveTextContent('CLN-2026-00042');
  });

  it('surfaces archive controls while active-care queries remain explicitly filtered', async () => {
    vi.mocked(getPatients).mockResolvedValueOnce([{ id: 'patient-1', patientNumber: 'CLN-2026-00042', type: 'STUDENT', firstName: 'Ana', lastName: 'Santos', studentProfile: { studentId: 'STU-001', program: 'Nursing' } }]);
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><PatientsPage /></MemoryRouter></QueryClientProvider>);
    const user = userEvent.setup();
    await screen.findByText('Santos, Ana');
    expect(getPatients).toHaveBeenCalledWith(undefined, 1, 20, undefined, 'ACTIVE');
    await user.click(screen.getByRole('button', { name: 'Archive' }));
    expect(archivePatient).toHaveBeenCalledWith('patient-1');
  });
});
