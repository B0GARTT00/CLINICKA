import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock3, Plus, Stethoscope } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { PatientPicker } from '../components/PatientPicker';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ErrorState, LoadingState } from '../components/ui/States';
import { createConsultation, createVisit, getVisitQueue, updateVisitStatus } from '../services/api';

type CheckInLocationState = { checkedInName?: string; checkedInVisitId?: string };

export function ClinicVisitsPage() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const [patientId, setPatientId] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [selectedVisit, setSelectedVisit] = useState<string | null>(null);
  const [consultation, setConsultation] = useState({ assessment: '', plan: '', diagnosis: '', treatment: '', medicineName: '', dosage: '', frequency: '' });
  const [arrivalNotice, setArrivalNotice] = useState<CheckInLocationState | null>(null);
  const queue = useQuery({ queryKey: ['visit-queue'], queryFn: getVisitQueue });
  const create = useMutation({
    mutationFn: () => createVisit({ patientId, chiefComplaint: chiefComplaint || undefined }),
    onSuccess: () => {
      setPatientId('');
      setChiefComplaint('');
      void queryClient.invalidateQueries({ queryKey: ['visit-queue'] });
    },
  });
  const status = useMutation({
    mutationFn: ({ id, value }: { id: string; value: 'IN_CONSULTATION' | 'COMPLETED' }) => updateVisitStatus(id, value),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['visit-queue'] }),
  });
  const saveConsultation = useMutation({
    mutationFn: () => createConsultation(selectedVisit ?? '', {
      assessment: consultation.assessment || undefined,
      plan: consultation.plan || undefined,
      diagnoses: consultation.diagnosis ? [{ description: consultation.diagnosis }] : undefined,
      treatments: consultation.treatment ? [{ description: consultation.treatment }] : undefined,
      prescriptionItems: consultation.medicineName ? [{ medicineName: consultation.medicineName, dosage: consultation.dosage, frequency: consultation.frequency }] : undefined,
    }),
    onSuccess: () => {
      setSelectedVisit(null);
      setConsultation({ assessment: '', plan: '', diagnosis: '', treatment: '', medicineName: '', dosage: '', frequency: '' });
      void queryClient.invalidateQueries({ queryKey: ['visit-queue'] });
    },
  });

  useEffect(() => {
    const state = location.state as CheckInLocationState | null;
    if (state?.checkedInName) {
      setArrivalNotice(state);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  if (queue.isLoading) return <LoadingState label="Loading clinic queue..." />;
  if (queue.isError) return <ErrorState message="Unable to load the clinic queue." />;

  return <div className="space-y-6">
    <header className="flex flex-col gap-3 border-b border-medical-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-brokenshire-600">Clinic workflow</p>
        <h1 className="mt-1 text-[26px] font-semibold tracking-tight text-medical-900">Today&apos;s clinic queue</h1>
        <p className="mt-1 max-w-xl text-[13px] text-medical-500">Active care for patients on site: triage the queue, record consultations, and complete visits. Scheduled patients should be checked in from{' '}
          <Link to="/appointments" className="font-semibold text-brokenshire-700 underline-offset-2 hover:underline">Appointments</Link> first.
        </p>
      </div>
      <Badge variant="success"><Clock3 className="mr-1 inline h-3 w-3" />{queue.data?.length ?? 0} waiting today</Badge>
    </header>

    {arrivalNotice?.checkedInName && (
      <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-[12px] text-teal-900" role="status">
        <span className="font-semibold">{arrivalNotice.checkedInName}</span> was checked in from their appointment and added to the queue below.
      </div>
    )}

    <Card
      title="Register walk-in / unscheduled visit"
      description="Search the patient by name or ID. For scheduled arrivals, check them in on Appointments instead."
    >
      <div className="grid gap-3 p-5 sm:grid-cols-[minmax(220px,1.4fr)_1.5fr_auto] sm:items-end">
        <PatientPicker value={patientId} onChange={setPatientId} />
        <label className="block"><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-medical-400">Chief complaint</span><input value={chiefComplaint} onChange={(event) => setChiefComplaint(event.target.value)} className="h-10 w-full rounded-lg border border-medical-200 px-3 text-[13px] outline-none focus:border-brokenshire-500" placeholder="Reason for visit" /></label>
        <Button disabled={!patientId || create.isPending} onClick={() => create.mutate()}><Plus className="h-4 w-4" />Register walk-in</Button>
      </div>
      {create.isError && <p className="px-5 pb-4 text-[12px] text-rose-600">Unable to register visit. Confirm the patient and try again.</p>}
    </Card>

    <Card title="Today&apos;s queue" description="Visits are ordered by arrival time. Complete the visit here when consultation is finished.">
      {queue.data?.length ? <div className="divide-y divide-medical-100">{queue.data.map((visit) => {
        const highlighted = arrivalNotice?.checkedInVisitId === visit.id;
        return <div className={`px-5 py-4 ${highlighted ? 'bg-teal-50/80' : ''}`} key={visit.id}><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brokenshire-50 text-brokenshire-700"><Stethoscope className="h-4 w-4" /></div><div><p className="text-[13px] font-semibold text-medical-900">{visit.patient.firstName} {visit.patient.lastName}</p><p className="mt-1 text-[11px] text-medical-500">{visit.patient.patientNumber} · {visit.chiefComplaint || 'No complaint recorded'}</p></div></div><div className="flex items-center gap-2"><Badge variant={visit.status === 'IN_CONSULTATION' ? 'warning' : 'neutral'}>{visit.status === 'IN_CONSULTATION' ? 'In consultation' : visit.status === 'COMPLETED' ? 'Visit completed' : 'Waiting'}</Badge>{visit.status === 'OPEN' && <Button variant="secondary" onClick={() => status.mutate({ id: visit.id, value: 'IN_CONSULTATION' })}>Start</Button>}{visit.status === 'IN_CONSULTATION' && <><Button variant="secondary" onClick={() => setSelectedVisit(selectedVisit === visit.id ? null : visit.id)}>Consult</Button><Button onClick={() => status.mutate({ id: visit.id, value: 'COMPLETED' })}><CheckCircle2 className="h-4 w-4" />Complete visit</Button></>}</div></div>{selectedVisit === visit.id && <form className="mt-4 grid gap-3 rounded-xl border border-medical-100 bg-medical-50/50 p-4" onSubmit={(event) => { event.preventDefault(); saveConsultation.mutate(); }}><div className="grid gap-3 sm:grid-cols-2"><label><span className="field-label">Assessment</span><textarea value={consultation.assessment} onChange={(event) => setConsultation({ ...consultation, assessment: event.target.value })} className="field-input min-h-20" /></label><label><span className="field-label">Plan / treatment</span><textarea value={consultation.plan} onChange={(event) => setConsultation({ ...consultation, plan: event.target.value })} className="field-input min-h-20" /></label><label><span className="field-label">Diagnosis</span><input value={consultation.diagnosis} onChange={(event) => setConsultation({ ...consultation, diagnosis: event.target.value })} className="field-input" /></label><label><span className="field-label">Treatment</span><input value={consultation.treatment} onChange={(event) => setConsultation({ ...consultation, treatment: event.target.value })} className="field-input" /></label></div><div className="grid gap-3 sm:grid-cols-3"><label><span className="field-label">Medicine</span><input value={consultation.medicineName} onChange={(event) => setConsultation({ ...consultation, medicineName: event.target.value })} className="field-input" /></label><label><span className="field-label">Dosage</span><input value={consultation.dosage} onChange={(event) => setConsultation({ ...consultation, dosage: event.target.value })} className="field-input" /></label><label><span className="field-label">Frequency</span><input value={consultation.frequency} onChange={(event) => setConsultation({ ...consultation, frequency: event.target.value })} className="field-input" /></label></div><div className="flex justify-end"><Button disabled={saveConsultation.isPending}>{saveConsultation.isPending ? 'Saving...' : 'Save consultation'}</Button></div></form>}</div>;
      })}</div> : <p className="p-5 text-[13px] text-medical-500">No patients are currently waiting. Scheduled arrivals appear here after check-in; walk-ins can be registered above.</p>}
    </Card>
  </div>;
}
