import { useQuery } from '@tanstack/react-query';
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
}
