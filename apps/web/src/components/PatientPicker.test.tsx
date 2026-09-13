import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPatients } from '../services/api';
import { PatientPicker } from './PatientPicker';

vi.mock('../services/api', () => ({
  getPatients: vi.fn().mockResolvedValue([
    {
      id: 'patient-1',
      patientNumber: 'STU-2026-0001',
      type: 'STUDENT',
      firstName: 'Ana',
      lastName: 'Santos',
      studentProfile: { studentId: '2026-001' },
    },
  ]),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function PickerHost() {
  const [patientId, setPatientId] = useState('');
  return (
    <QueryClientProvider client={new QueryClient()}>
      <PatientPicker value={patientId} onChange={setPatientId} />
      <p>Selected: {patientId || 'none'}</p>
    </QueryClientProvider>
  );
}

describe('PatientPicker', () => {
  it('lets staff search by name and select a patient record', async () => {
    const user = userEvent.setup();
    render(<PickerHost />);

    await user.click(screen.getByRole('combobox'));
    expect(await screen.findByText('Santos, Ana')).toBeInTheDocument();
    expect(screen.getByText(/STU-2026-0001/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Santos, Ana/ }));
    expect(screen.getByText('Selected: patient-1')).toBeInTheDocument();
    expect(getPatients).toHaveBeenCalled();
  });
});
