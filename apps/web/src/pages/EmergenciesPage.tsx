import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Plus } from 'lucide-react';
import { useState } from 'react';
import { PatientPicker } from '../components/PatientPicker';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ErrorState, LoadingState } from '../components/ui/States';
import { createEmergency, getEmergencies } from '../services/api';

export function EmergenciesPage() {
  const queryClient = useQueryClient();
  const emergencies = useQuery({ queryKey: ['emergencies'], queryFn: getEmergencies });
  const [form, setForm] = useState({
    patientId: '',
    occurredAt: '',
    emergencyType: '',
    description: '',
    actionTaken: '',
    treatment: '',
    disposition: '',
  });
  const create = useMutation({
    mutationFn: () =>
      createEmergency({ ...form, occurredAt: new Date(form.occurredAt).toISOString() }),
    onSuccess: () => {
      setForm({
        patientId: '',
        occurredAt: '',
        emergencyType: '',
        description: '',
        actionTaken: '',
        treatment: '',
        disposition: '',
      });
      void queryClient.invalidateQueries({ queryKey: ['emergencies'] });
    },
  });

  if (emergencies.isLoading) return <LoadingState label="Loading emergency cases..." />;
  if (emergencies.isError) return <ErrorState message="Unable to load emergency cases." />;
  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between border-b border-medical-200 pb-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-rose-600">
            Restricted clinical record
          </p>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight text-medical-900">
            Emergency cases
          </h1>
          <p className="mt-1 text-[13px] text-medical-500">
            Record incidents, actions taken, treatment, and outcome.
          </p>
        </div>
        <Badge variant="danger">
          <AlertTriangle className="mr-1 inline h-3 w-3" />
          Restricted access
        </Badge>
      </header>
      <Card
        title="Record emergency case"
        description="Only authorized clinical staff can access these records."
      >
        <form
          className="grid gap-3 p-5 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!form.patientId) return;
            create.mutate();
          }}
        >
          <PatientPicker
            value={form.patientId}
            onChange={(patientId) => setForm((current) => ({ ...current, patientId }))}
          />
          <label>
            <span className="field-label">Date and time</span>
            <input
              required
              type="datetime-local"
              value={form.occurredAt}
              onChange={(event) => setForm({ ...form, occurredAt: event.target.value })}
              className="field-input"
            />
          </label>
          <label>
            <span className="field-label">Emergency type</span>
            <input
              required
              value={form.emergencyType}
              onChange={(event) => setForm({ ...form, emergencyType: event.target.value })}
              className="field-input"
              placeholder="Injury or acute illness"
            />
          </label>
          <label>
            <span className="field-label">Disposition</span>
            <input
              value={form.disposition}
              onChange={(event) => setForm({ ...form, disposition: event.target.value })}
              className="field-input"
              placeholder="Returned to class / referred"
            />
          </label>
          <label>
            <span className="field-label">Incident details</span>
            <textarea
              required
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              className="field-input min-h-20"
            />
          </label>
          <label>
            <span className="field-label">Actions taken</span>
            <textarea
              required
              value={form.actionTaken}
              onChange={(event) => setForm({ ...form, actionTaken: event.target.value })}
              className="field-input min-h-20"
            />
          </label>
          <label>
            <span className="field-label">Treatment</span>
            <textarea
              value={form.treatment}
              onChange={(event) => setForm({ ...form, treatment: event.target.value })}
              className="field-input min-h-16"
            />
          </label>
          <div className="flex items-end">
            <Button disabled={!form.patientId || create.isPending}>
              <Plus className="h-4 w-4" />
              Save emergency case
            </Button>
          </div>
        </form>
        {create.isError && (
          <p className="px-5 pb-4 text-[12px] text-rose-600">
            Unable to save the emergency case. Check the patient ID and required fields.
          </p>
        )}
      </Card>
      <Card title="Emergency history" description="Most recent restricted incidents.">
        {emergencies.data?.length ? (
          <div className="divide-y divide-medical-100">
            {emergencies.data.map((emergency) => (
              <div className="px-5 py-4" key={emergency.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-semibold text-medical-900">
                      {emergency.patient.firstName} {emergency.patient.lastName}{' '}
                      <span className="font-normal text-medical-500">
                        · {emergency.emergencyType}
                      </span>
                    </p>
                    <p className="mt-1 text-[11px] text-medical-500">
                      {emergency.patient.patientNumber} ·{' '}
                      {new Date(emergency.occurredAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="danger">Restricted</Badge>
                </div>
                <p className="mt-3 text-[12px] text-medical-700">{emergency.description}</p>
                <p className="mt-1 text-[11px] text-medical-500">Action: {emergency.actionTaken}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="p-5 text-[13px] text-medical-500">No emergency cases recorded.</p>
        )}
      </Card>
    </div>
  );
}
