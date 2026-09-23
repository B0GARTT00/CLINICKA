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

  if (medicines.isLoading || dispensations.isLoading) return <LoadingState label="Loading dispensing records..." />;
  if (medicines.isError || dispensations.isError) return <ErrorState message="Unable to load dispensing records." />;
  const batches = medicines.data?.flatMap((medicine) => medicine.batches.filter((batch) => batch.dispensable).map((batch) => ({ ...batch, medicineName: medicine.name, unit: medicine.unit }))) ?? [];
  return <div className="space-y-6">
    <header className="flex items-end justify-between border-b border-medical-200 pb-6"><div><p className="text-[11px] font-semibold uppercase tracking-widest text-brokenshire-600">Inventory</p><h1 className="mt-1 text-[26px] font-semibold tracking-tight text-medical-900">Medicine dispensing</h1><p className="mt-1 text-[13px] text-medical-500">Dispense stock to a patient while preserving transaction history.</p></div><Badge variant="success"><PackageCheck className="mr-1 inline h-3 w-3" />{dispensations.data?.length ?? 0} transactions</Badge></header>
    <Card title="Dispense medicine" description="Expired and insufficient batches cannot be dispensed."><form className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-[1fr_2fr_100px_1fr_auto] lg:items-end" onSubmit={(event) => { event.preventDefault(); dispense.mutate(); }}><label><span className="field-label">Patient ID</span><input required value={form.patientId} onChange={(event) => setForm({ ...form, patientId: event.target.value })} className="field-input" placeholder="STU-2026-0001" /></label><label><span className="field-label">Medicine batch</span><select required value={form.medicineBatchId} onChange={(event) => setForm({ ...form, medicineBatchId: event.target.value })} className="field-input"><option value="">Select batch</option>{batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.medicineName} · {batch.batchNumber} · {batch.quantity} {batch.unit}s · expires {new Date(batch.expiresAt).toLocaleDateString()}</option>)}</select></label><label><span className="field-label">Quantity</span><input required type="number" min="1" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} className="field-input" /></label><label><span className="field-label">Instructions</span><input value={form.instructions} onChange={(event) => setForm({ ...form, instructions: event.target.value })} className="field-input" placeholder="After meals" /></label>            <Button type="submit" disabled={dispense.isPending}><ClipboardPlus className="h-4 w-4" />Dispense</Button></form>{dispense.isError && <p className="px-5 pb-4 text-[12px] text-rose-600">Unable to dispense. Check the patient, batch, quantity, and expiration date.</p>}</Card>
    <Card title="Dispensing history" description="Recent medicine transactions.">{dispensations.data?.length ? <div className="divide-y divide-medical-100">{dispensations.data.map((record) => <div className="flex items-center justify-between px-5 py-4" key={record.id}><div><p className="text-[13px] font-semibold text-medical-900">{record.patient.firstName} {record.patient.lastName}</p><p className="mt-1 text-[11px] text-medical-500">{record.patient.patientNumber} · {record.items.map((item) => `${item.medicineBatch.medicine.name} x${item.quantity}`).join(', ')}</p></div><span className="text-[11px] text-medical-500">{new Date(record.createdAt).toLocaleString()}</span></div>)}</div> : <p className="p-5 text-[13px] text-medical-500">No dispensing transactions yet.</p>}</Card>
  </div>;
}
