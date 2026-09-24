import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDispensation, getMedicines } from '../services/api';
import { DispensingPage } from './DispensingPage';

vi.mock('../services/api', () => ({
  getMedicines: vi.fn().mockResolvedValue([{ id: 'medicine-1', name: 'Paracetamol', dosageForm: 'tablet', unit: 'tablet', reorderLevel: 10, stock: 10, totalStock: 10, expiredStock: 0, stockState: 'LOW_STOCK', lowStock: true, batches: [{ id: 'batch-1', batchNumber: 'B-1', quantity: 10, expiresAt: new Date(Date.now() + 86400000).toISOString(), state: 'AVAILABLE', dispensable: true }] }]),
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
    await user.click(await screen.findByRole('option', { name: /Santos, Ana/ }));
    expect(patientInput).toHaveValue('Santos, Ana · CLN-2026-00042');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    const [, batchCombobox] = screen.getAllByRole('combobox');
    await user.click(batchCombobox);
    await user.click(await screen.findByRole('option', { name: /B-1/ }));
    await user.click(screen.getByRole('button', { name: 'Dispense' }));
    expect(createDispensation).toHaveBeenCalledWith(expect.objectContaining({ patientId: 'patient-1', items: [expect.objectContaining({ medicineBatchId: 'batch-1', quantity: 1 })] }));
  });

  it('hides expired batches from the dispensing dropdown', async () => {
    vi.mocked(getMedicines).mockResolvedValueOnce([{ id: 'medicine-1', name: 'Paracetamol', dosageForm: 'tablet', unit: 'tablet', reorderLevel: 10, stock: 5, totalStock: 15, expiredStock: 10, stockState: 'LOW_STOCK', lowStock: true, batches: [
      { id: 'batch-expired', batchNumber: 'B-OLD', quantity: 10, expiresAt: new Date(Date.now() - 86400000).toISOString(), state: 'EXPIRED', dispensable: false },
      { id: 'batch-valid', batchNumber: 'B-NEW', quantity: 5, expiresAt: new Date(Date.now() + 86400000).toISOString(), state: 'AVAILABLE', dispensable: true },
    ] }]);
    render(<QueryClientProvider client={new QueryClient()}><DispensingPage /></QueryClientProvider>);
    const user = userEvent.setup();
    await screen.findByText('No dispensing transactions yet.');

    const [, batchCombobox] = screen.getAllByRole('combobox');
    await user.click(batchCombobox);
    expect(screen.queryByRole('option', { name: /B-OLD/ })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: /B-NEW/ })).toBeInTheDocument();
  });
});
