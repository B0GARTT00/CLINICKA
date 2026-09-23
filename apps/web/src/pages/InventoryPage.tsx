import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Ban, Package, Plus } from 'lucide-react';
import { useState } from 'react';
import { Alert, Box, MenuItem, TextField, Typography } from '@mui/material';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import { createMedicine, getMedicines, stockInMedicine, type MedicineBatchState } from '../services/api';

const batchLabels: Record<MedicineBatchState, string> = { AVAILABLE: 'Available', EXPIRING_SOON: 'Expiring soon', EXPIRED: 'Expired', DEPLETED: 'Depleted' };
const batchVariants: Record<MedicineBatchState, 'success' | 'warning' | 'danger' | 'neutral'> = { AVAILABLE: 'success', EXPIRING_SOON: 'warning', EXPIRED: 'danger', DEPLETED: 'neutral' };

export function InventoryPage() {
  const queryClient = useQueryClient();
  const medicines = useQuery({ queryKey: ['medicines'], queryFn: getMedicines });
  const [medicine, setMedicine] = useState({
    name: '',
    genericName: '',
    dosageForm: '',
    unit: '',
    reorderLevel: '0',
  });
  const [stock, setStock] = useState({
    medicineId: '',
    batchNumber: '',
    expiresAt: '',
    quantity: '1',
    supplier: '',
  });
  const create = useMutation({
    mutationFn: () => createMedicine({ ...medicine, reorderLevel: Number(medicine.reorderLevel) }),
    onSuccess: () => {
      setMedicine({ name: '', genericName: '', dosageForm: '', unit: '', reorderLevel: '0' });
      void queryClient.invalidateQueries({ queryKey: ['medicines'] });
    },
  });
  const stockIn = useMutation({
    mutationFn: () =>
      stockInMedicine({
        ...stock,
        quantity: Number(stock.quantity),
        expiresAt: new Date(stock.expiresAt).toISOString(),
      }),
    onSuccess: () => {
      setStock({ medicineId: '', batchNumber: '', expiresAt: '', quantity: '1', supplier: '' });
      void queryClient.invalidateQueries({ queryKey: ['medicines'] });
    },
  });

  if (medicines.isLoading) return <LoadingState label="Loading medicine inventory..." />;
  if (medicines.isError) return <ErrorState message="Unable to load medicine inventory." />;
  return <div className="space-y-6">
    <header className="flex items-end justify-between border-b border-medical-200 pb-6"><div><p className="text-[11px] font-semibold uppercase tracking-widest text-brokenshire-600">Inventory</p><h1 className="mt-1 text-[26px] font-semibold tracking-tight text-medical-900">Medicine inventory</h1><p className="mt-1 text-[13px] text-medical-500">Track batches, stock levels, and expiration dates.</p></div><Badge variant="success"><Package className="mr-1 inline h-3 w-3" />{medicines.data?.length ?? 0} medicines</Badge></header>
    <div className="grid gap-5 xl:grid-cols-2"><Card title="Add medicine" description="Create a medicine master record."><form className="grid gap-3 p-5 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); create.mutate(); }}><label><span className="field-label">Name</span><input required value={medicine.name} onChange={(event) => setMedicine({ ...medicine, name: event.target.value })} className="field-input" /></label><label><span className="field-label">Generic name</span><input value={medicine.genericName} onChange={(event) => setMedicine({ ...medicine, genericName: event.target.value })} className="field-input" /></label><label><span className="field-label">Dosage form</span><input required value={medicine.dosageForm} onChange={(event) => setMedicine({ ...medicine, dosageForm: event.target.value })} className="field-input" placeholder="500mg tablet" /></label><label><span className="field-label">Unit</span><input required value={medicine.unit} onChange={(event) => setMedicine({ ...medicine, unit: event.target.value })} className="field-input" placeholder="tablet" /></label><label><span className="field-label">Reorder level</span><input required type="number" min="0" value={medicine.reorderLevel} onChange={(event) => setMedicine({ ...medicine, reorderLevel: event.target.value })} className="field-input" /></label><div className="flex items-end"><Button disabled={create.isPending}><Plus className="h-4 w-4" />Add medicine</Button></div></form></Card><Card title="Stock in batch" description="Increase stock while preserving transaction history."><form className="grid gap-3 p-5 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); stockIn.mutate(); }}><label><span className="field-label">Medicine</span><select required value={stock.medicineId} onChange={(event) => setStock({ ...stock, medicineId: event.target.value })} className="field-input"><option value="">Select medicine</option>{medicines.data?.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label><span className="field-label">Batch number</span><input required value={stock.batchNumber} onChange={(event) => setStock({ ...stock, batchNumber: event.target.value })} className="field-input" /></label><label><span className="field-label">Expiration</span><input required type="date" value={stock.expiresAt} onChange={(event) => setStock({ ...stock, expiresAt: event.target.value })} className="field-input" /></label><label><span className="field-label">Quantity</span><input required type="number" min="1" value={stock.quantity} onChange={(event) => setStock({ ...stock, quantity: event.target.value })} className="field-input" /></label><div className="sm:col-span-2"><Button disabled={stockIn.isPending}><Plus className="h-4 w-4" />Stock in</Button></div></form></Card></div>
    <Card title="Current stock" description="Available stock excludes expired and depleted batches.">{medicines.data?.length ? <div className="divide-y divide-medical-100">{medicines.data.map((item) => <div className="px-5 py-4" key={item.id}><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[13px] font-semibold text-medical-900">{item.name}</p><p className="mt-1 text-[11px] text-medical-500">{item.genericName || item.dosageForm} · reorder at {item.reorderLevel} {item.unit}s</p></div><div className="flex items-center gap-3">{item.stockState === 'OUT_OF_STOCK' ? <Badge variant="danger"><Ban className="h-3 w-3" />Out of stock</Badge> : item.stockState === 'LOW_STOCK' ? <Badge variant="warning"><AlertTriangle className="h-3 w-3" />Low stock</Badge> : <Badge variant="success">In stock</Badge>}<span className="text-lg font-semibold text-medical-900">{item.stock} <span className="text-[11px] font-normal text-medical-500">{item.unit}s available</span></span></div></div>{item.expiredStock > 0 && <p className="mt-2 text-[11px] font-medium text-danger-700">{item.expiredStock} expired {item.unit}{item.expiredStock === 1 ? '' : 's'} quarantined</p>}<div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{item.batches.map((batch) => <div key={batch.id} className="flex items-center justify-between rounded-lg border border-medical-100 bg-medical-50 px-3 py-2"><div><p className="text-[11px] font-semibold text-medical-800">Batch {batch.batchNumber}</p><p className="text-[10px] text-medical-500">Expires {new Date(batch.expiresAt).toLocaleDateString()} · {batch.quantity} {item.unit}{batch.quantity === 1 ? '' : 's'}</p></div><Badge variant={batchVariants[batch.state]}>{batchLabels[batch.state]}</Badge></div>)}</div></div>)}</div> : <EmptyState title="No medicines recorded" description="Add a medicine master record to begin tracking its batches." />}</Card>
  </div>;
}
