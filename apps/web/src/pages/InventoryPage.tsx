import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Ban, Package, Plus } from 'lucide-react';
import { useState } from 'react';
import { Alert, Box, MenuItem, TextField, Typography } from '@mui/material';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
<<<<<<< HEAD
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import { createMedicine, getMedicines, stockInMedicine, type MedicineBatchState } from '../services/api';

const batchLabels: Record<MedicineBatchState, string> = { AVAILABLE: 'Available', EXPIRING_SOON: 'Expiring soon', EXPIRED: 'Expired', DEPLETED: 'Depleted' };
const batchVariants: Record<MedicineBatchState, 'success' | 'warning' | 'danger' | 'neutral'> = { AVAILABLE: 'success', EXPIRING_SOON: 'warning', EXPIRED: 'danger', DEPLETED: 'neutral' };
=======
import { ErrorState, LoadingState } from '../components/ui/States';
import { PageHeader } from '../components/ui/PageHeader';
import { createMedicine, getMedicines, stockInMedicine } from '../services/api';
>>>>>>> 25d03fe7c9f7859ebf2def8c5ffb547212f2ae50

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
<<<<<<< HEAD
  return <div className="space-y-6">
    <header className="flex items-end justify-between border-b border-medical-200 pb-6"><div><p className="text-[11px] font-semibold uppercase tracking-widest text-brokenshire-600">Inventory</p><h1 className="mt-1 text-[26px] font-semibold tracking-tight text-medical-900">Medicine inventory</h1><p className="mt-1 text-[13px] text-medical-500">Track batches, stock levels, and expiration dates.</p></div><Badge variant="success"><Package className="mr-1 inline h-3 w-3" />{medicines.data?.length ?? 0} medicines</Badge></header>
    <div className="grid gap-5 xl:grid-cols-2"><Card title="Add medicine" description="Create a medicine master record."><form className="grid gap-3 p-5 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); create.mutate(); }}><label><span className="field-label">Name</span><input required value={medicine.name} onChange={(event) => setMedicine({ ...medicine, name: event.target.value })} className="field-input" /></label><label><span className="field-label">Generic name</span><input value={medicine.genericName} onChange={(event) => setMedicine({ ...medicine, genericName: event.target.value })} className="field-input" /></label><label><span className="field-label">Dosage form</span><input required value={medicine.dosageForm} onChange={(event) => setMedicine({ ...medicine, dosageForm: event.target.value })} className="field-input" placeholder="500mg tablet" /></label><label><span className="field-label">Unit</span><input required value={medicine.unit} onChange={(event) => setMedicine({ ...medicine, unit: event.target.value })} className="field-input" placeholder="tablet" /></label><label><span className="field-label">Reorder level</span><input required type="number" min="0" value={medicine.reorderLevel} onChange={(event) => setMedicine({ ...medicine, reorderLevel: event.target.value })} className="field-input" /></label><div className="flex items-end"><Button disabled={create.isPending}><Plus className="h-4 w-4" />Add medicine</Button></div></form></Card><Card title="Stock in batch" description="Increase stock while preserving transaction history."><form className="grid gap-3 p-5 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); stockIn.mutate(); }}><label><span className="field-label">Medicine</span><select required value={stock.medicineId} onChange={(event) => setStock({ ...stock, medicineId: event.target.value })} className="field-input"><option value="">Select medicine</option>{medicines.data?.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label><span className="field-label">Batch number</span><input required value={stock.batchNumber} onChange={(event) => setStock({ ...stock, batchNumber: event.target.value })} className="field-input" /></label><label><span className="field-label">Expiration</span><input required type="date" value={stock.expiresAt} onChange={(event) => setStock({ ...stock, expiresAt: event.target.value })} className="field-input" /></label><label><span className="field-label">Quantity</span><input required type="number" min="1" value={stock.quantity} onChange={(event) => setStock({ ...stock, quantity: event.target.value })} className="field-input" /></label><div className="sm:col-span-2"><Button disabled={stockIn.isPending}><Plus className="h-4 w-4" />Stock in</Button></div></form></Card></div>
    <Card title="Current stock" description="Available stock excludes expired and depleted batches.">{medicines.data?.length ? <div className="divide-y divide-medical-100">{medicines.data.map((item) => <div className="px-5 py-4" key={item.id}><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[13px] font-semibold text-medical-900">{item.name}</p><p className="mt-1 text-[11px] text-medical-500">{item.genericName || item.dosageForm} · reorder at {item.reorderLevel} {item.unit}s</p></div><div className="flex items-center gap-3">{item.stockState === 'OUT_OF_STOCK' ? <Badge variant="danger"><Ban className="h-3 w-3" />Out of stock</Badge> : item.stockState === 'LOW_STOCK' ? <Badge variant="warning"><AlertTriangle className="h-3 w-3" />Low stock</Badge> : <Badge variant="success">In stock</Badge>}<span className="text-lg font-semibold text-medical-900">{item.stock} <span className="text-[11px] font-normal text-medical-500">{item.unit}s available</span></span></div></div>{item.expiredStock > 0 && <p className="mt-2 text-[11px] font-medium text-danger-700">{item.expiredStock} expired {item.unit}{item.expiredStock === 1 ? '' : 's'} quarantined</p>}<div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{item.batches.map((batch) => <div key={batch.id} className="flex items-center justify-between rounded-lg border border-medical-100 bg-medical-50 px-3 py-2"><div><p className="text-[11px] font-semibold text-medical-800">Batch {batch.batchNumber}</p><p className="text-[10px] text-medical-500">Expires {new Date(batch.expiresAt).toLocaleDateString()} · {batch.quantity} {item.unit}{batch.quantity === 1 ? '' : 's'}</p></div><Badge variant={batchVariants[batch.state]}>{batchLabels[batch.state]}</Badge></div>)}</div></div>)}</div> : <EmptyState title="No medicines recorded" description="Add a medicine master record to begin tracking its batches." />}</Card>
  </div>;
=======
  const medicineField = (
    key: keyof typeof medicine,
    label: string,
    options?: { required?: boolean; type?: string; placeholder?: string },
  ) => (
    <TextField
      fullWidth
      size="small"
      label={label}
      required={options?.required}
      type={options?.type}
      placeholder={options?.placeholder}
      value={medicine[key]}
      onChange={(event) => setMedicine({ ...medicine, [key]: event.target.value })}
      slotProps={options?.type === 'number' ? { htmlInput: { min: 0 } } : undefined}
    />
  );
  const stockField = (
    key: keyof typeof stock,
    label: string,
    options?: { type?: string; min?: number },
  ) => (
    <TextField
      fullWidth
      size="small"
      required
      label={label}
      type={options?.type}
      value={stock[key]}
      onChange={(event) => setStock({ ...stock, [key]: event.target.value })}
      slotProps={{
        ...(options?.type === 'date' ? { inputLabel: { shrink: true } } : {}),
        ...(options?.min !== undefined ? { htmlInput: { min: options.min } } : {}),
      }}
    />
  );
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader
        eyebrow="Inventory"
        title="Medicine inventory"
        description="Track batches, stock levels, and expiration dates."
        action={
          <Badge variant="success">
            <Package size={14} />
            {medicines.data?.length ?? 0} medicines
          </Badge>
        }
      />
      <Box
        sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', xl: 'repeat(2, 1fr)' } }}
      >
        <Card title="Add medicine" description="Create a medicine master record.">
          <Box
            component="form"
            sx={{
              display: 'grid',
              gap: 1.5,
              p: 2.5,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
            }}
            onSubmit={(event) => {
              event.preventDefault();
              create.mutate();
            }}
          >
            {medicineField('name', 'Name', { required: true })}
            {medicineField('genericName', 'Generic name')}
            {medicineField('dosageForm', 'Dosage form', {
              required: true,
              placeholder: '500mg tablet',
            })}
            {medicineField('unit', 'Unit', { required: true, placeholder: 'tablet' })}
            {medicineField('reorderLevel', 'Reorder level', { required: true, type: 'number' })}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Button type="submit" disabled={create.isPending}>
                <Plus className="h-4 w-4" />
                Add medicine
              </Button>
            </Box>
            {create.isError && (
              <Alert severity="error" sx={{ gridColumn: '1 / -1' }}>
                Unable to add medicine. Review the entered details.
              </Alert>
            )}
          </Box>
        </Card>
        <Card
          title="Stock in batch"
          description="Increase stock while preserving transaction history."
        >
          <Box
            component="form"
            sx={{
              display: 'grid',
              gap: 1.5,
              p: 2.5,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
            }}
            onSubmit={(event) => {
              event.preventDefault();
              stockIn.mutate();
            }}
          >
            <TextField
              select
              required
              fullWidth
              size="small"
              label="Medicine"
              value={stock.medicineId}
              onChange={(event) => setStock({ ...stock, medicineId: event.target.value })}
            >
              <MenuItem value="">Select medicine</MenuItem>
              {medicines.data?.map((item) => (
                <MenuItem value={item.id} key={item.id}>
                  {item.name}
                </MenuItem>
              ))}
            </TextField>
            {stockField('batchNumber', 'Batch number')}
            {stockField('expiresAt', 'Expiration', { type: 'date' })}
            {stockField('quantity', 'Quantity', { type: 'number', min: 1 })}
            <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
              <Button type="submit" disabled={stockIn.isPending}>
                <Plus className="h-4 w-4" />
                Stock in
              </Button>
            </Box>
            {stockIn.isError && (
              <Alert severity="error" sx={{ gridColumn: '1 / -1' }}>
                Unable to stock this batch. Review its number, quantity, and expiration date.
              </Alert>
            )}
          </Box>
        </Card>
      </Box>
      <Card title="Current stock" description="Low-stock medicines need review.">
        {medicines.data?.length ? (
          <Box>
            {medicines.data.map((item) => (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                  px: 2.5,
                  py: 2,
                  borderBottom: 1,
                  borderColor: 'divider',
                  '&:last-child': { borderBottom: 0 },
                }}
                key={item.id}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {item.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.genericName || item.dosageForm} · reorder at {item.reorderLevel}{' '}
                    {item.unit}s
                  </Typography>
                  {item.batches.length > 0 && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {item.batches.map((batch) => `${batch.batchNumber}: ${batch.quantity} ${item.unit}s, exp ${new Date(batch.expiresAt).toLocaleDateString()}`).join(' · ')}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {item.stock === 0 ? (
                    <Badge variant="danger">Out of stock</Badge>
                  ) : item.lowStock ? (
                    <Badge variant="warning">
                      <AlertTriangle size={14} />
                      Low stock
                    </Badge>
                  ) : null}
                  <Typography variant="h6">{item.stock}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.unit}s
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography sx={{ p: 2.5 }} variant="body2" color="text.secondary">
            No medicines recorded yet.
          </Typography>
        )}
      </Card>
    </Box>
  );
>>>>>>> 25d03fe7c9f7859ebf2def8c5ffb547212f2ae50
}
