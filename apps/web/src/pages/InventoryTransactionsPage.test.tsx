import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { getInventoryTransactions } from '../services/api';
import { InventoryTransactionsPage } from './InventoryTransactionsPage';

vi.mock('../services/api', () => ({ getInventoryTransactions: vi.fn() }));

describe('InventoryTransactionsPage', () => {
  it('renders stock-in and dispensing movements with their batch', async () => {
    vi.mocked(getInventoryTransactions).mockResolvedValue([
      { id: 'tx-1', type: 'STOCK_IN', quantity: 20, reason: null, actorId: 'user-1', createdAt: '2026-09-21T08:00:00.000Z', medicineBatch: { id: 'batch-1', batchNumber: 'LOT-101', medicine: { id: 'medicine-1', name: 'Paracetamol', genericName: null, unit: 'tablet' } } },
      { id: 'tx-2', type: 'DISPENSE', quantity: -2, reason: 'Dispensed to STU-001', actorId: 'user-2', createdAt: '2026-09-21T09:00:00.000Z', medicineBatch: { id: 'batch-1', batchNumber: 'LOT-101', medicine: { id: 'medicine-1', name: 'Paracetamol', genericName: null, unit: 'tablet' } } },
    ]);
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><InventoryTransactionsPage /></QueryClientProvider>);
    expect(await screen.findAllByText('Paracetamol')).toHaveLength(2);
    expect(screen.getAllByText('Stock in')).toHaveLength(1);
    expect(screen.getAllByText('Dispensed')).toHaveLength(1);
    expect(screen.getByText('Stock in')).toBeInTheDocument();
    expect(screen.getByText('Dispensed')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Movement type' })).toBeInTheDocument();
    expect(screen.getAllByText(/LOT-101/)).toHaveLength(2);
  });
});
