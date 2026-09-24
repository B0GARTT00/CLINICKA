import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { DataTable } from '../components/ui/DataTable';
import { FormField } from '../components/ui/FormField';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/card';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import { Search } from 'lucide-react';
import { getInventoryTransactions } from '../services/api';

const transactionLabels: Record<string, string> = {
  STOCK_IN: 'Stock in',
  ADJUSTMENT: 'Adjustment',
  DISPENSE: 'Dispensed',
  EXPIRED: 'Expired',
  DAMAGED: 'Damaged',
  LOST: 'Lost',
};

const typeBadgeMap: Record<string, 'success' | 'info' | 'warning'> = {
  STOCK_IN: 'success',
  DISPENSE: 'info',
  ADJUSTMENT: 'warning',
  EXPIRED: 'warning',
  DAMAGED: 'warning',
  LOST: 'warning',
};

const typeFilters = ['STOCK_IN', 'ADJUSTMENT', 'DISPENSE', 'EXPIRED', 'DAMAGED', 'LOST'] as const;

export function InventoryTransactionsPage() {
  const form = useForm({
    defaultValues: { type: '', search: '', from: '', to: '' },
    mode: 'onChange',
  });

  const type = useWatch({ control: form.control, name: 'type' });
  const from = useWatch({ control: form.control, name: 'from' });
  const to = useWatch({ control: form.control, name: 'to' });

  const [debouncedSearch, setDebouncedSearch] = useState('');

  const transactions = useQuery({
    queryKey: ['inventory-transactions', type, debouncedSearch, from, to],
    queryFn: () =>
      getInventoryTransactions({
        type: type || undefined,
        search: debouncedSearch.trim() || undefined,
        from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
        to: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
      }),
  });

  const { isLoading, isError, data } = transactions;

  const columns = [
    { field: 'name', header: 'Medicine', sortable: true, render: (row: any) => row.medicineBatch?.medicine?.name ?? '' },
    { field: 'batchNumber', header: 'Batch', sortable: true, render: (row: any) => row.medicineBatch?.batchNumber ?? '' },
    {
      field: 'type',
      header: 'Type',
      sortable: true,
      render: (row: any) => <Badge variant={typeBadgeMap[row.type] ?? 'neutral'}>{transactionLabels[row.type] ?? row.type}</Badge>,
    },
    {
      field: 'quantity',
      header: 'Quantity',
      sortable: true,
      render: (row: any) => {
        const incoming = row.quantity > 0;
        return (
          <span className="flex items-center gap-1 font-semibold" style={{ color: row.quantity > 0 ? '#047857' : '#111916' }}>
            {row.quantity > 0 ? <span>+</span> : <span>−</span>}
            {Math.abs(row.quantity)} {row.medicineBatch?.medicine?.unit ?? ''}
          </span>
        );
      },
    },
    { field: 'createdAt', header: 'Date', sortable: true, render: (row: any) => new Date(row.createdAt).toLocaleString() },
  ];

  if (transactions.isLoading) return <LoadingState label="Loading transaction history..." />;
  if (transactions.isError) return <ErrorState message="Unable to load inventory transaction history." />;

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between border-b border-medical-200 pb-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-brokenshire-600">Inventory</p>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight text-medical-900">Transaction history</h1>
          <p className="mt-1 text-[13px] text-medical-500">Trace every stock movement by medicine, batch, type, and date.</p>
        </div>
        <Badge variant="info"><span className="inline-block w-3 h-3 mr-1" aria-hidden="true">⏱</span>Transactions</Badge>
      </header>

      <Card title="Filters" description="Narrow the audit trail without changing inventory data.">
        <form className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4" onSubmit={(e) => e.preventDefault()}>
          <SearchFilterInput onSearchChange={setDebouncedSearch} />
          <FormField
            label="Movement type"
            select
            {...form.register('type')}
          >
            <option value="">All movements</option>
            {typeFilters.map((value) => (
              <option key={value} value={value}>{transactionLabels[value]}</option>
            ))}
          </FormField>
          <FormField
            label="From"
            shrinkLabel
            shrinkOnFocusOnly
            {...form.register('from')}
            type="date"
          />
          <FormField
            label="To"
            shrinkLabel
            shrinkOnFocusOnly
            {...form.register('to')}
            type="date"
          />
        </form>
      </Card>

      <Card title="Stock movements" description="Positive quantities add stock; negative quantities reduce it.">
        {isLoading && <LoadingState label="Loading transaction history..." />}
        {isError && <ErrorState message="Unable to load inventory transaction history." />}
        {!isLoading && !isError && !transactions.data?.length && (
          <EmptyState title="No transactions found" description="Try changing the filters, or stock in a medicine to create the first movement." />
        )}
        {!isLoading && !isError && transactions.data?.length && (
          <DataTable
            columns={columns}
            data={transactions.data}
            sortField="createdAt"
            sortOrder="desc"
          />
        )}
      </Card>
    </div>
  );
}

function SearchFilterInput({ onSearchChange }: { onSearchChange: (value: string) => void }) {
  const [localValue, setLocalValue] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(localValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [localValue, onSearchChange]);

  return (
    <FormField
      label="Search medicine or batch"
      name="search"
      id="search"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      placeholder="Paracetamol or LOT-101"
    >
      <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true">
        <Search className="h-4 w-4 text-medical-400" />
      </span>
    </FormField>
  );
}