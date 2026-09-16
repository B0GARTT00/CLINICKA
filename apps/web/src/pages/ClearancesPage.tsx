import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, FileCheck, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { PatientPicker } from '../components/PatientPicker';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ErrorState, LoadingState } from '../components/ui/States';
import {
  checkClearanceEligibility,
  createClearance,
  getClearances,
  reviewClearance,
} from '../services/api';
import { RequirementsPage } from './RequirementsPage';

export function ClearancesPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ patientId: '', type: 'COLLEGE' });
  const clearances = useQuery({ queryKey: ['clearances'], queryFn: getClearances });
  const eligibility = useQuery({
    queryKey: ['clearance-eligibility', form.patientId],
    queryFn: () => checkClearanceEligibility(form.patientId),
    enabled: Boolean(form.patientId),
  });
  const create = useMutation({
    mutationFn: () => createClearance(form),
    onSuccess: () => {
      setForm({ patientId: '', type: 'COLLEGE' });
      void queryClient.invalidateQueries({ queryKey: ['clearances'] });
    },
  });
  const review = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'CLEARED' | 'REJECTED' }) =>
      reviewClearance(id, status),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['clearances'] }),
  });

  if (clearances.isLoading) return <LoadingState label="Loading medical clearances..." />;
  if (clearances.isError) return <ErrorState message="Unable to load medical clearances." />;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 border-b border-medical-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-brokenshire-600">
            Health records
          </p>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight text-medical-900">
            Requirements &amp; clearances
          </h1>
          <p className="mt-1 text-[13px] text-medical-500">
            Verify required documents, then review a patient's clearance in one place.
          </p>
        </div>
        <Badge variant="success">
          <FileCheck className="mr-1 inline h-3 w-3" />
          {clearances.data?.filter((clearance) => clearance.status === 'CLEARED').length ?? 0}{' '}
          cleared
        </Badge>
      </header>
      <RequirementsPage embedded />
      <div id="clearance-review" className="border-b border-medical-200 pb-3">
        <h2 className="text-xl font-semibold text-medical-900">2. Review clearance eligibility</h2>
        <p className="mt-1 text-[13px] text-medical-500">
          Select a patient to see which requirements are verified before creating a clearance
          review.
        </p>
      </div>
      <Card
        title="Create clearance review"
        description="Search for the patient, then choose the clearance type."
      >
        <form
          className="grid gap-3 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
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
            <span className="field-label">Clearance type</span>
            <input
              required
              value={form.type}
              onChange={(event) => setForm({ ...form, type: event.target.value })}
              className="field-input"
            />
          </label>
          <Button disabled={!eligibility.data?.eligible || create.isPending}>
            <Plus className="h-4 w-4" />
            Create review
          </Button>
        </form>
        {form.patientId && (
          <div
            className="border-t border-medical-100 px-5 py-4 text-[12px] text-medical-700"
            role="status"
          >
            {eligibility.isLoading && <p>Checking this patient's requirements...</p>}
            {eligibility.isError && (
              <p className="text-rose-600">
                Unable to check requirement eligibility. Try again before creating a review.
              </p>
            )}
            {eligibility.data && (
              <>
                <p className="font-semibold">
                  {eligibility.data.eligible
                    ? 'All applicable requirements are verified. This clearance can move to review.'
                    : 'Verify all required documents before creating a clearance review.'}
                </p>
                {eligibility.data.requirements.length ? (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {eligibility.data.requirements.map((requirement) => (
                      <li key={requirement.name}>
                        <Badge variant={requirement.verified ? 'success' : 'warning'}>
                          {requirement.name}: {requirement.verified ? 'Verified' : 'Needed'}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2">
                    No applicable requirements have been configured for this patient.
                  </p>
                )}
              </>
            )}
          </div>
        )}
        {create.isError && (
          <p className="px-5 pb-4 text-[12px] text-rose-600">
            Unable to create clearance. Verify the patient and academic-year setup.
          </p>
        )}
      </Card>
      <Card
        title="Clearance records"
        description="Incomplete records cannot be approved until requirements are verified."
      >
        {clearances.data?.length ? (
          <div className="divide-y divide-medical-100">
            {clearances.data.map((clearance) => (
              <div
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                key={clearance.id}
              >
                <div>
                  <p className="text-[13px] font-semibold text-medical-900">
                    {clearance.patient.firstName} {clearance.patient.lastName}
                  </p>
                  <p className="mt-1 text-[11px] text-medical-500">
                    {clearance.patient.patientNumber} · {clearance.type} ·{' '}
                    {clearance.academicYear.label}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      clearance.status === 'CLEARED'
                        ? 'success'
                        : clearance.status === 'REJECTED'
                          ? 'danger'
                          : clearance.status === 'INCOMPLETE'
                            ? 'neutral'
                            : 'warning'
                    }
                  >
                    {clearance.status}
                  </Badge>
                  {clearance.status === 'FOR_REVIEW' && (
                    <>
                      <Button
                        variant="secondary"
                        onClick={() => review.mutate({ id: clearance.id, status: 'CLEARED' })}
                      >
                        <Check className="h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => review.mutate({ id: clearance.id, status: 'REJECTED' })}
                      >
                        <X className="h-4 w-4" />
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="p-5 text-[13px] text-medical-500">No clearance records yet.</p>
        )}
      </Card>
    </div>
  );
}
