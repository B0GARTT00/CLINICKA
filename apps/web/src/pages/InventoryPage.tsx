import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MenuItem } from '@mui/material';
import { AlertTriangle, Ban, Package, Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DataTable } from '../components/ui/DataTable';
import { FormField } from '../components/ui/FormField';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import { StatusChip } from '../components/ui/StatusChip';
import { createMedicine, getMedicines, stockInMedicine, type MedicineBatchState } from '../services/api';

const medicineSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  genericName: z.string().optional(),
  dosageForm: z.string().min(1, 'Dosage form is required'),
  unit: z.string().min(1, 'Unit is required'),
  reorderLevel: z.coerce.number().min(0, 'Reorder level must be >= 0'),
});

const stockSchema = z.object({
  medicineId: z.string().min(1, 'Medicine is required'),
  batchNumber: z.string().min(1, 'Batch number is required'),
  expiresAt: z.string().min(1, 'Expiration date is required'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
  supplier: z.string().optional(),
});

type MedicineForm = z.infer<typeof medicineSchema>;
type StockForm = z.infer<typeof stockSchema>;

export function InventoryPage() {
  const queryClient = useQueryClient();
  const medicines = useQuery({ queryKey: ['medicines'], queryFn: getMedicines });

  const medicineForm = useForm<MedicineForm>({
    resolver: zodResolver(medicineSchema),
    defaultValues: { name: '', genericName: '', dosageForm: '', unit: '', reorderLevel: 0 },
  });

  const stockForm = useForm<StockForm>({
    resolver: zodResolver(stockSchema),
    defaultValues: { medicineId: '', batchNumber: '', expiresAt: '', quantity: 1, supplier: '' },
  });

  const create = useMutation({
    mutationFn: (data: MedicineForm) => createMedicine({ ...data, reorderLevel: Number(data.reorderLevel) }),
    onSuccess: () => {
      medicineForm.reset({ name: '', genericName: '', dosageForm: '', unit: '', reorderLevel: 0 });
      void queryClient.invalidateQueries({ queryKey: ['medicines'] });
    },
  });

  const stockIn = useMutation({
    mutationFn: (data: StockForm) =>
      stockInMedicine({
        ...data,
        quantity: Number(data.quantity),
        expiresAt: new Date(data.expiresAt).toISOString(),
      }),
    onSuccess: () => {
      stockForm.reset({ medicineId: '', batchNumber: '', expiresAt: '', quantity: 1, supplier: '' });
      void queryClient.invalidateQueries({ queryKey: ['medicines'] });
    },
  });

  if (medicines.isLoading) return <LoadingState label="Loading medicine inventory..." />;
  if (medicines.isError) return <ErrorState message="Unable to load medicine inventory." />;

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between border-b border-medical-200 pb-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-brokenshire-600">Inventory</p>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight text-medical-900">Medicine inventory</h1>
          <p className="mt-1 text-[13px] text-medical-500">Track batches, stock levels, and expiration dates.</p>
        </div>
        <Badge variant="success"><Package className="mr-1 inline h-3 w-3" />{medicines.data?.length ?? 0} medicines</Badge>
      </header>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Add medicine" description="Create a medicine master record.">
          <form onSubmit={medicineForm.handleSubmit((data) => create.mutate(data))} className="grid gap-3 p-5 sm:grid-cols-2">
            <FormField
              label="Generic name"
              size="small"
              {...medicineForm.register('genericName')}
              error={medicineForm.formState.errors.genericName?.message}
            />
            <FormField
              label="Dosage form"
              size="small"
              {...medicineForm.register('dosageForm')}
              required
              error={medicineForm.formState.errors.dosageForm?.message}
              placeholder="500mg tablet"
            />
            <FormField
              label="Unit"
              size="small"
              {...medicineForm.register('unit')}
              required
              error={medicineForm.formState.errors.unit?.message}
              placeholder="tablet"
            />
            <FormField
              label="Reorder level"
              size="small"
              shrinkOnFocusOnly
              {...medicineForm.register('reorderLevel')}
              required
              type="number"
              min={0}
              error={medicineForm.formState.errors.reorderLevel?.message}
            />
            <Button type="submit" disabled={create.isPending}><Plus className="h-4 w-4" />Add medicine</Button>
          </form>
        </Card>

        <Card title="Stock in batch" description="Increase stock while preserving transaction history.">
          <form onSubmit={stockForm.handleSubmit((data) => stockIn.mutate(data))} className="grid gap-3 p-5 sm:grid-cols-2">
            <FormField
              label="Medicine"
              select
              size="small"
              {...stockForm.register('medicineId')}
              error={stockForm.formState.errors.medicineId?.message}
            >
              <option value="">Select medicine</option>
              {medicines.data?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </FormField>
            <FormField
              label="Batch number"
              size="small"
              {...stockForm.register('batchNumber')}
              required
              error={stockForm.formState.errors.batchNumber?.message}
            />
            <FormField
              label="Expiration date"
              size="small"
              shrinkOnFocusOnly
              {...stockForm.register('expiresAt')}
              required
              type="date"
              error={stockForm.formState.errors.expiresAt?.message}
            />
            <FormField
              label="Quantity"
              size="small"
              shrinkOnFocusOnly
              {...stockForm.register('quantity')}
              required
              type="number"
              min={1}
              error={stockForm.formState.errors.quantity?.message}
            />
            <FormField
              label="Supplier (optional)"
              size="small"
              {...stockForm.register('supplier')}
            />
            <Button type="submit" disabled={stockIn.isPending}>Stock in</Button>
          </form>
        </Card>
      </div>

      <Card title="Current stock" description="Available stock excludes expired and depleted batches.">
        {medicines.data?.length ? (
          <DataTable
            columns={[
              { field: 'name', header: 'Medicine', sortable: true },
              { field: 'genericName', header: 'Generic', sortable: true, render: (row) => row.genericName || row.dosageForm },
              { field: 'unit', header: 'Unit', sortable: true },
              { field: 'reorderLevel', header: 'Reorder at', sortable: true },
              {
                field: 'stock',
                header: 'Available',
                sortable: true,
                render: (row) => <span className="font-semibold">{row.stock} {row.unit}s</span>,
              },
              {
                field: 'stockState',
                header: 'Status',
                render: (row) => (
                  <>
                    {row.stockState === 'OUT_OF_STOCK' && <Badge variant="danger">Out of stock</Badge>}
                    {row.stockState === 'LOW_STOCK' && <Badge variant="warning">Low stock</Badge>}
                    {row.stockState === 'IN_STOCK' && <Badge variant="success">In stock</Badge>}
                  </>
                ),
              },
            ]}
            data={medicines.data}
            sortField="name"
            sortOrder="asc"
          />
        ) : (
          <EmptyState title="No medicines recorded" description="Add a medicine master record to begin tracking its batches." />
        )}
      </Card>
    </div>
  );
}