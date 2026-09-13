import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Syringe } from 'lucide-react';
import { useState } from 'react';
import { PatientPicker } from '../components/PatientPicker';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ErrorState, LoadingState } from '../components/ui/States';
import { createVaccination, getVaccinations } from '../services/api';

export function VaccinationHistoryPage() {
  const queryClient = useQueryClient();
  const vaccinations = useQuery({ queryKey: ['vaccinations'], queryFn: getVaccinations });
  const [form, setForm] = useState({
    patientId: '',
    vaccineName: '',
    dose: '',
    administeredAt: '',
    remarks: '',
  });
  const save = useMutation({
    mutationFn: () =>
      createVaccination({ ...form, administeredAt: new Date(form.administeredAt).toISOString() }),
    onSuccess: () => {
      setForm({ patientId: '', vaccineName: '', dose: '', administeredAt: '', remarks: '' });
      void queryClient.invalidateQueries({ queryKey: ['vaccinations'] });
    },
  });
  if (vaccinations.isLoading) return <LoadingState label="Loading vaccination history..." />;
  if (vaccinations.isError) return <ErrorState message="Unable to load vaccination history." />;
  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-brokenshire-600">
          Health records
        </p>
        <h1 className="mt-1 text-[26px] font-semibold tracking-tight text-medical-900">
          Vaccination history
        </h1>
        <p className="mt-1 text-[13px] text-medical-500">
          Record vaccines received from the clinic, hospital, or another provider.
        </p>
      </header>
      <Card
        title="Record vaccination history"
        description="This records a vaccine received elsewhere; CLINICKA does not administer it here."
      >
        <form
          className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1.5fr)_repeat(4,minmax(0,1fr))]"
          onSubmit={(event) => {
            event.preventDefault();
            if (!form.patientId) return;
            save.mutate();
          }}
        >
          <PatientPicker
            value={form.patientId}
            onChange={(patientId) => setForm((current) => ({ ...current, patientId }))}
          />
          <label>
            <span className="field-label">Vaccine</span>
            <input
              required
              value={form.vaccineName}
              onChange={(event) => setForm({ ...form, vaccineName: event.target.value })}
              className="field-input"
            />
          </label>
          <label>
            <span className="field-label">Dose</span>
            <input
              required
              value={form.dose}
              onChange={(event) => setForm({ ...form, dose: event.target.value })}
              className="field-input"
              placeholder="Dose 1"
            />
          </label>
          <label>
            <span className="field-label">Date received</span>
            <input
              required
              type="date"
              value={form.administeredAt}
              onChange={(event) => setForm({ ...form, administeredAt: event.target.value })}
              className="field-input"
            />
          </label>
          <label>
            <span className="field-label">Provider / source</span>
            <input
              value={form.remarks}
              onChange={(event) => setForm({ ...form, remarks: event.target.value })}
              className="field-input"
            />
          </label>
          <div className="lg:col-span-5">
            <Button disabled={!form.patientId || save.isPending}>
              <Plus className="h-4 w-4" />
              Save vaccination record
            </Button>
          </div>
        </form>
      </Card>
      <Card title="Vaccination records" description="Recorded vaccination history.">
        {vaccinations.data?.length ? (
          <div className="divide-y divide-medical-100">
            {vaccinations.data.map((record) => (
              <div className="flex items-center justify-between px-5 py-4" key={record.id}>
                <div className="flex items-center gap-3">
                  <Syringe className="h-4 w-4 text-brokenshire-600" />
                  <div>
                    <p className="text-[13px] font-semibold text-medical-900">
                      {record.patient.firstName} {record.patient.lastName}
                    </p>
                    <p className="text-[11px] text-medical-500">
                      {record.patient.patientNumber} · {record.vaccineName} · {record.dose} ·{' '}
                      {new Date(record.administeredAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Badge variant="success">Recorded</Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="p-5 text-[13px] text-medical-500">No vaccination records yet.</p>
        )}
      </Card>
    </div>
  );
}
