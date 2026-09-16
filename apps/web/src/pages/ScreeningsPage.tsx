import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck, Plus } from 'lucide-react';
import { useState } from 'react';
import { PatientPicker } from '../components/PatientPicker';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ErrorState, LoadingState } from '../components/ui/States';
import { createScreening, getScreenings } from '../services/api';

export function ScreeningsPage() {
  const queryClient = useQueryClient();
  const screenings = useQuery({ queryKey: ['screenings'], queryFn: getScreenings });
  const [form, setForm] = useState({
    patientId: '',
    screeningType: '',
    screenedAt: '',
    result: '',
    findings: '',
  });
  const save = useMutation({
    mutationFn: () =>
      createScreening({ ...form, screenedAt: new Date(form.screenedAt).toISOString() }),
    onSuccess: () => {
      setForm({ patientId: '', screeningType: '', screenedAt: '', result: '', findings: '' });
      void queryClient.invalidateQueries({ queryKey: ['screenings'] });
    },
  });
  if (screenings.isLoading) return <LoadingState label="Loading screening records..." />;
  if (screenings.isError) return <ErrorState message="Unable to load screening records." />;
  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-brokenshire-600">
          Health records
        </p>
        <h1 className="mt-1 text-[26px] font-semibold tracking-tight text-medical-900">
          Health screening
        </h1>
        <p className="mt-1 text-[13px] text-medical-500">
          Record clinic screening results and recommendations.
        </p>
      </header>
      <Card title="Record screening" description="Record the result and relevant findings.">
        <form
          className="grid gap-3 p-5 sm:grid-cols-2"
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
            <span className="field-label">Screening type</span>
            <input
              required
              value={form.screeningType}
              onChange={(event) => setForm({ ...form, screeningType: event.target.value })}
              className="field-input"
              placeholder="Annual physical"
            />
          </label>
          <label>
            <span className="field-label">Date screened</span>
            <input
              required
              type="date"
              value={form.screenedAt}
              onChange={(event) => setForm({ ...form, screenedAt: event.target.value })}
              className="field-input"
            />
          </label>
          <label>
            <span className="field-label">Result</span>
            <input
              required
              value={form.result}
              onChange={(event) => setForm({ ...form, result: event.target.value })}
              className="field-input"
              placeholder="Cleared"
            />
          </label>
          <label className="sm:col-span-2">
            <span className="field-label">Findings</span>
            <textarea
              value={form.findings}
              onChange={(event) => setForm({ ...form, findings: event.target.value })}
              className="field-input min-h-20"
            />
          </label>
          <div className="sm:col-span-2">
            <Button disabled={!form.patientId || save.isPending}>
              <Plus className="h-4 w-4" />
              Save screening
            </Button>
          </div>
        </form>
      </Card>
      <Card title="Screening records" description="Recent health screening results.">
        {screenings.data?.length ? (
          <div className="divide-y divide-medical-100">
            {screenings.data.map((record) => (
              <div className="flex items-center justify-between px-5 py-4" key={record.id}>
                <div className="flex items-center gap-3">
                  <ClipboardCheck className="h-4 w-4 text-brokenshire-600" />
                  <div>
                    <p className="text-[13px] font-semibold text-medical-900">
                      {record.patient.firstName} {record.patient.lastName}
                    </p>
                    <p className="text-[11px] text-medical-500">
                      {record.patient.patientNumber} · {record.screeningType} ·{' '}
                      {new Date(record.screenedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Badge variant="neutral">{record.result}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="p-5 text-[13px] text-medical-500">No screening records yet.</p>
        )}
      </Card>
    </div>
  );
}
