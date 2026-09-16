import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Package, Plus } from 'lucide-react';
import { useState } from 'react';
import { Alert, Box, MenuItem, TextField, Typography } from '@mui/material';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ErrorState, LoadingState } from '../components/ui/States';
import { PageHeader } from '../components/ui/PageHeader';
import { createMedicine, getMedicines, stockInMedicine } from '../services/api';

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
              <Button disabled={create.isPending}>
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
              <Button disabled={stockIn.isPending}>
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
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {item.lowStock && (
                    <Badge variant="warning">
                      <AlertTriangle size={14} />
                      Low stock
                    </Badge>
                  )}
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
}
