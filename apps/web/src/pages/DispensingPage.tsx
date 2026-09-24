import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardPlus, PackageCheck } from 'lucide-react';
import { useState } from 'react';
import { Alert, Box, MenuItem, TextField, Typography } from '@mui/material';
import { PatientPicker } from '../components/PatientPicker';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ErrorState, LoadingState } from '../components/ui/States';
import { PageHeader } from '../components/ui/PageHeader';
import { createDispensation, getDispensations, getMedicines } from '../services/api';

export function DispensingPage() {
  const queryClient = useQueryClient();
  const medicines = useQuery({ queryKey: ['medicines'], queryFn: getMedicines });
  const dispensations = useQuery({ queryKey: ['dispensations'], queryFn: getDispensations });
  const [form, setForm] = useState({
    patientId: '',
    medicineBatchId: '',
    quantity: '1',
    instructions: '',
  });
  const dispense = useMutation({
    mutationFn: () =>
      createDispensation({
        patientId: form.patientId,
        items: [
          {
            medicineBatchId: form.medicineBatchId,
            quantity: Number(form.quantity),
            instructions: form.instructions,
          },
        ],
      }),
    onSuccess: () => {
      setForm({ patientId: '', medicineBatchId: '', quantity: '1', instructions: '' });
      void queryClient.invalidateQueries({ queryKey: ['dispensations'] });
      void queryClient.invalidateQueries({ queryKey: ['medicines'] });
    },
  });

  if (medicines.isLoading || dispensations.isLoading)
    return <LoadingState label="Loading dispensing records..." />;
  if (medicines.isError || dispensations.isError)
    return <ErrorState message="Unable to load dispensing records." />;
  const batches =
    medicines.data?.flatMap((medicine) =>
      medicine.batches
        .filter((batch) => batch.dispensable)
        .map((batch) => ({ ...batch, medicineName: medicine.name, unit: medicine.unit })),
    ) ?? [];
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader
        eyebrow="Inventory"
        title="Medicine dispensing"
        description="Dispense stock to a patient while preserving transaction history."
        action={
          <Badge variant="success">
            <PackageCheck size={14} />
            {dispensations.data?.length ?? 0} transactions
          </Badge>
        }
      />
      <Card
        title="Dispense medicine"
        description="Search for the patient, then choose an available medicine batch. Expired and insufficient batches cannot be dispensed."
      >
        <Box
          component="form"
          sx={{
            display: 'grid',
            gap: 1.5,
            p: 2.5,
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              lg: 'minmax(220px,1.5fr) 2fr 100px 1fr auto',
            },
            alignItems: 'center',
          }}
          onSubmit={(event) => {
            event.preventDefault();
            if (!form.patientId) return;
            dispense.mutate();
          }}
        >
          <PatientPicker
            value={form.patientId}
            onChange={(patientId) => setForm((current) => ({ ...current, patientId }))}
          />
          <TextField
            select
            required
            fullWidth
            size="small"
            label="Medicine batch"
            value={form.medicineBatchId}
            onChange={(event) => setForm({ ...form, medicineBatchId: event.target.value })}
          >
            <MenuItem value="">Select batch</MenuItem>
            {batches.map((batch) => (
              <MenuItem key={batch.id} value={batch.id}>
                {batch.medicineName} · {batch.batchNumber} · {batch.quantity} {batch.unit}s
              </MenuItem>
            ))}
          </TextField>
          <TextField
            required
            fullWidth
            size="small"
            type="number"
            label="Quantity"
            value={form.quantity}
            onChange={(event) => setForm({ ...form, quantity: event.target.value })}
            slotProps={{ htmlInput: { min: 1 } }}
          />
          <TextField
            fullWidth
            size="small"
            label="Instructions"
            value={form.instructions}
            onChange={(event) => setForm({ ...form, instructions: event.target.value })}
            placeholder="After meals"
          />
          <Button type="submit" disabled={!form.patientId || dispense.isPending}>
            <ClipboardPlus className="h-4 w-4" />
            Dispense
          </Button>
        </Box>
        {dispense.isError && (
          <Alert severity="error" sx={{ mx: 2.5, mb: 2 }}>
            Unable to dispense. Check the patient, batch, quantity, and expiration date.
          </Alert>
        )}
      </Card>
      <Card title="Dispensing history" description="Recent medicine transactions.">
        {dispensations.data?.length ? (
          <Box>
            {dispensations.data.map((record) => (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { sm: 'center' },
                  justifyContent: 'space-between',
                  gap: 1,
                  px: 2.5,
                  py: 2,
                  borderBottom: 1,
                  borderColor: 'divider',
                  '&:last-child': { borderBottom: 0 },
                }}
                key={record.id}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {record.patient.firstName} {record.patient.lastName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {record.patient.patientNumber} ·{' '}
                    {record.items
                      .map((item) => `${item.medicineBatch.medicine.name} x${item.quantity}`)
                      .join(', ')}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {new Date(record.createdAt).toLocaleString()}
                </Typography>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography sx={{ p: 2.5 }} variant="body2" color="text.secondary">
            No dispensing transactions yet.
          </Typography>
        )}
      </Card>
    </Box>
  );
}
