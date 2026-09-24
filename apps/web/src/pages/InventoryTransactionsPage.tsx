import { useQuery } from '@tanstack/react-query';
import { ArrowDownToLine, ArrowUpFromLine, History, Search } from 'lucide-react';
import { useState } from 'react';
import { InputAdornment, MenuItem, TextField } from '@mui/material';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import { getInventoryTransactions } from '../services/api';

const transactionLabels: Record<string, string> = {
  STOCK_IN: 'Stock in', ADJUSTMENT: 'Adjustment', DISPENSE: 'Dispensed', RETURNED: 'Returned', EXPIRED: 'Expired', DAMAGED: 'Damaged', LOST: 'Lost',
};

export function InventoryTransactionsPage() {
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const transactions = useQuery({
    queryKey: ['inventory-transactions', type, search, from, to],
    queryFn: () => getInventoryTransactions({ type: type || undefined, search: search.trim() || undefined, from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined, to: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined }),
  });

  return <div className="space-y-6">
    <header className="flex items-end justify-between border-b border-medical-200 pb-6">
      <div><p className="text-[11px] font-semibold uppercase tracking-widest text-brokenshire-600">Inventory</p><h1 className="mt-1 text-[26px] font-semibold tracking-tight text-medical-900">Transaction history</h1><p className="mt-1 text-[13px] text-medical-500">Trace every stock movement by medicine, batch, type, and date.</p></div>
      <Badge variant="info"><History className="h-3 w-3" />{transactions.data?.length ?? 0} movements</Badge>
    </header>
    <Card title="Filters" description="Narrow the audit trail without changing inventory data.">
      <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <TextField label="Search medicine or batch" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Paracetamol or LOT-101" slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search size={17} /></InputAdornment> } }} />
        <TextField select label="Movement type" value={type} onChange={(event) => setType(event.target.value)}><MenuItem value="">All movements</MenuItem>{Object.entries(transactionLabels).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField>
        <TextField label="From" type="date" value={from} onChange={(event) => setFrom(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField label="To" type="date" value={to} onChange={(event) => setTo(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
      </div>
    </Card>
    <Card title="Stock movements" description="Positive quantities add stock; negative quantities reduce it.">
      {transactions.isLoading ? <LoadingState label="Loading transaction history..." /> : transactions.isError ? <ErrorState message="Unable to load inventory transaction history." onRetry={() => void transactions.refetch()} retrying={transactions.isFetching} /> : !transactions.data?.length ? <EmptyState title="No transactions found" description="Try changing the filters, or stock in a medicine to create the first movement." action={search || type || from || to ? <Button variant="secondary" onClick={() => { setSearch(''); setType(''); setFrom(''); setTo(''); }}>Clear filters</Button> : undefined} /> : <div className="divide-y divide-medical-100">{transactions.data.map((record) => {
        const incoming = record.quantity > 0;
        return <div key={record.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-[13px] font-semibold text-medical-900">{record.medicineBatch.medicine.name}</p><Badge variant={incoming ? 'success' : record.type === 'DISPENSE' ? 'info' : 'warning'}>{transactionLabels[record.type] ?? record.type}</Badge></div><p className="mt-1 text-[11px] text-medical-500">Batch {record.medicineBatch.batchNumber}{record.reason ? ` · ${record.reason}` : ''}</p></div>
          <span className={`flex items-center gap-1 text-[13px] font-semibold ${incoming ? 'text-emerald-700' : 'text-medical-800'}`}>{incoming ? <ArrowDownToLine className="h-4 w-4" /> : <ArrowUpFromLine className="h-4 w-4" />}{incoming ? '+' : ''}{record.quantity} {record.medicineBatch.medicine.unit}{Math.abs(record.quantity) === 1 ? '' : 's'}</span>
          <time className="text-[11px] text-medical-500" dateTime={record.createdAt}>{new Date(record.createdAt).toLocaleString()}</time>
        </div>;
      })}</div>}
    </Card>
  </div>;
}
