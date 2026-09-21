import { useQuery } from '@tanstack/react-query';
<<<<<<< HEAD
import { ArrowDownToLine, ArrowUpFromLine, History, Search } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/card';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import { getInventoryTransactions } from '../services/api';

const transactionLabels: Record<string, string> = {
  STOCK_IN: 'Stock in', ADJUSTMENT: 'Adjustment', DISPENSE: 'Dispensed', EXPIRED: 'Expired', DAMAGED: 'Damaged', LOST: 'Lost',
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
        <label><span className="field-label">Search medicine or batch</span><span className="relative block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-medical-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="field-input pl-9" placeholder="Paracetamol or LOT-101" /></span></label>
        <label><span className="field-label">Movement type</span><select value={type} onChange={(event) => setType(event.target.value)} className="field-input"><option value="">All movements</option>{Object.entries(transactionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label><span className="field-label">From</span><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="field-input" /></label>
        <label><span className="field-label">To</span><input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="field-input" /></label>
      </div>
    </Card>
    <Card title="Stock movements" description="Positive quantities add stock; negative quantities reduce it.">
      {transactions.isLoading ? <LoadingState label="Loading transaction history..." /> : transactions.isError ? <ErrorState message="Unable to load inventory transaction history." /> : !transactions.data?.length ? <EmptyState title="No transactions found" description="Try changing the filters, or stock in a medicine to create the first movement." /> : <div className="divide-y divide-medical-100">{transactions.data.map((record) => {
        const incoming = record.quantity > 0;
        return <div key={record.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-[13px] font-semibold text-medical-900">{record.medicineBatch.medicine.name}</p><Badge variant={incoming ? 'success' : record.type === 'DISPENSE' ? 'info' : 'warning'}>{transactionLabels[record.type] ?? record.type}</Badge></div><p className="mt-1 text-[11px] text-medical-500">Batch {record.medicineBatch.batchNumber}{record.reason ? ` · ${record.reason}` : ''}</p></div>
          <span className={`flex items-center gap-1 text-[13px] font-semibold ${incoming ? 'text-emerald-700' : 'text-medical-800'}`}>{incoming ? <ArrowDownToLine className="h-4 w-4" /> : <ArrowUpFromLine className="h-4 w-4" />}{incoming ? '+' : ''}{record.quantity} {record.medicineBatch.medicine.unit}{Math.abs(record.quantity) === 1 ? '' : 's'}</span>
          <time className="text-[11px] text-medical-500" dateTime={record.createdAt}>{new Date(record.createdAt).toLocaleString()}</time>
        </div>;
      })}</div>}
    </Card>
  </div>;
=======
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { History, RefreshCw } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import { PageHeader } from '../components/ui/PageHeader';
import { getInventoryTransactions } from '../services/api';

const labels: Record<string, string> = {
  STOCK_IN: 'Stock in', ADJUSTMENT: 'Adjustment', DISPENSE: 'Dispensed', RETURNED: 'Returned',
  EXPIRED: 'Expired', DAMAGED: 'Damaged', LOST: 'Lost',
};

export function InventoryTransactionsPage() {
  const transactions = useQuery({ queryKey: ['inventory-transactions'], queryFn: getInventoryTransactions });

  return <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
    <PageHeader eyebrow="Inventory" title="Inventory transactions" description="Trace medicine batch movements, including stock-in and dispensing." />
    {transactions.isLoading && <LoadingState label="Loading inventory transactions..." />}
    {transactions.isError && <Box><ErrorState message="Unable to load inventory transactions." /><Alert severity="info" action={<button type="button" onClick={() => void transactions.refetch()} className="inline-flex items-center gap-1 font-semibold"><RefreshCw size={15} /> Retry</button>}>Try again after confirming you have inventory access.</Alert></Box>}
    {transactions.data && (transactions.data.length ? <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
      <Table size="small" aria-label="Inventory transaction history">
        <TableHead><TableRow><TableCell>Date</TableCell><TableCell>Medicine</TableCell><TableCell>Batch</TableCell><TableCell>Movement</TableCell><TableCell align="right">Quantity</TableCell><TableCell>Reason</TableCell></TableRow></TableHead>
        <TableBody>{transactions.data.map((transaction) => <TableRow key={transaction.id} hover>
          <TableCell>{new Date(transaction.createdAt).toLocaleString()}</TableCell>
          <TableCell sx={{ fontWeight: 700 }}>{transaction.medicineBatch.medicine.name}</TableCell>
          <TableCell>{transaction.medicineBatch.batchNumber}</TableCell>
          <TableCell><Chip size="small" label={labels[transaction.type] ?? transaction.type} color={transaction.quantity < 0 ? 'warning' : 'success'} variant="outlined" /></TableCell>
          <TableCell align="right" sx={{ fontWeight: 700, color: transaction.quantity < 0 ? 'warning.dark' : 'success.dark' }}>{transaction.quantity > 0 ? '+' : ''}{transaction.quantity} {transaction.medicineBatch.medicine.unit}</TableCell>
          <TableCell>{transaction.reason || '—'}</TableCell>
        </TableRow>)}</TableBody>
      </Table>
    </Paper> : <EmptyState title="No inventory transactions yet" description="Stock receipts, dispensing, and adjustments will appear here." />)}
    {!transactions.isLoading && !transactions.isError && <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}><History size={14} /> Showing the 100 most recent movements.</Typography>}
  </Box>;
>>>>>>> 25d03fe7c9f7859ebf2def8c5ffb547212f2ae50
}
