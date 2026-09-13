import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDispensation } from '../services/api';
import { DispensingPage } from './DispensingPage';

vi.mock('../services/api', () => ({
  getMedicines: vi.fn().mockResolvedValue([{ id: 'medicine-1', name: 'Paracetamol', unit: 'tablet', batches: [{ id: 'batch-1', batchNumber: 'B-1', quantity: 10 }] }]),
  getDispensations: vi.fn().mockResolvedValue([]),
  getPatients: vi.fn().mockResolvedValue([{ id: 'patient-1', patientNumber: 'CLN-2026-00042', type: 'STUDENT', firstName: 'Ana', lastName: 'Santos' }]),
  createDispensation: vi.fn().mockResolvedValue({ id: 'dispensation-1' }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('DispensingPage', () => {
  it('uses the selected patient from the search input when dispensing', async () => {
    render(<QueryClientProvider client={new QueryClient()}><DispensingPage /></QueryClientProvider>);
    const user = userEvent.setup();
    await screen.findByText('No dispensing transactions yet.');

    const patientInput = screen.getByPlaceholderText('Search name or patient ID');
    await user.click(patientInput);
    await user.click(await screen.findByRole('button', { name: /Santos, Ana/ }));
    expect(patientInput).toHaveValue('Santos, Ana · CLN-2026-00042');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Medicine batch'), 'batch-1');
    await user.click(screen.getByRole('button', { name: 'Dispense' }));
    expect(createDispensation).toHaveBeenCalledWith(expect.objectContaining({ patientId: 'patient-1', items: [expect.objectContaining({ medicineBatchId: 'batch-1', quantity: 1 })] }));
  });
});
