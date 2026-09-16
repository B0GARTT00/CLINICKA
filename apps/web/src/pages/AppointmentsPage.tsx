import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, CalendarDays, Check, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PatientPicker } from '../components/PatientPicker';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ErrorState, LoadingState } from '../components/ui/States';
import { checkInAppointment, createAppointment, getAppointments, updateAppointmentStatus } from '../services/api';
import type { Appointment, ClinicVisit } from '../services/api';

function appointmentStatusLabel(status: Appointment['status']) {
  switch (status) {
    case 'PENDING':
      return 'Pending approval';
    case 'APPROVED':
      return 'Approved';
    case 'CONFIRMED':
      return 'Confirmed';
    case 'COMPLETED':
      return 'Checked in';
    case 'CANCELLED':
      return 'Cancelled';
    case 'NO_SHOW':
      return 'No show';
    default:
      return status;
  }
}

function appointmentStatusVariant(status: Appointment['status']) {
  if (status === 'PENDING') return 'warning' as const;
  if (status === 'CANCELLED' || status === 'NO_SHOW') return 'danger' as const;
  if (status === 'COMPLETED') return 'info' as const;
  return 'success' as const;
}

export function AppointmentsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ patientId: '', scheduledAt: '', purpose: '', durationMins: '30' });
  const [checkInHandoff, setCheckInHandoff] = useState<ClinicVisit | null>(null);
  const appointments = useQuery({ queryKey: ['appointments'], queryFn: getAppointments });
  const create = useMutation({
    mutationFn: () => createAppointment({ ...form, durationMins: Number(form.durationMins), scheduledAt: new Date(form.scheduledAt).toISOString() }),
    onSuccess: () => { setForm({ patientId: '', scheduledAt: '', purpose: '', durationMins: '30' }); void queryClient.invalidateQueries({ queryKey: ['appointments'] }); },
  });
  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'APPROVED' | 'CANCELLED' }) => updateAppointmentStatus(id, status),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['appointments'] }),
  });
  const checkIn = useMutation({
    mutationFn: (id: string) => checkInAppointment(id),
    onSuccess: (visit) => {
      setCheckInHandoff(visit);
      void queryClient.invalidateQueries({ queryKey: ['appointments'] });
      void queryClient.invalidateQueries({ queryKey: ['visit-queue'] });
    },
  });
  const getErrorMessage = (error: unknown) => {
    const response = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
    return Array.isArray(response) ? response.join(', ') : response || 'The appointment could not be checked in.';
  };

  if (appointments.isLoading) return <LoadingState label="Loading appointments..." />;
  if (appointments.isError) return <ErrorState message="Unable to load appointments." />;

  const handoffName = checkInHandoff
    ? `${checkInHandoff.patient.firstName} ${checkInHandoff.patient.lastName}`
    : null;

  return <div className="space-y-6">
    <header className="flex flex-col gap-3 border-b border-medical-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-brokenshire-600">Clinic scheduling</p>
        <h1 className="mt-1 text-[26px] font-semibold tracking-tight text-medical-900">Appointments</h1>
        <p className="mt-1 max-w-xl text-[13px] text-medical-500">Book future visits here. When a scheduled patient arrives, check them in to open today&apos;s clinic visit and add them to the queue.</p>
      </div>
      <Badge variant="success"><CalendarDays className="mr-1 inline h-3 w-3" />{appointments.data?.length ?? 0} upcoming</Badge>
    </header>

    <div className="rounded-xl border border-medical-200 bg-medical-50/60 px-4 py-3 text-[12px] text-medical-600">
      <span className="font-semibold text-medical-800">Typical flow:</span> Schedule appointment → Approve → Check in on arrival → Continue care in{' '}
      <Link to="/clinic/visits" className="font-semibold text-brokenshire-700 underline-offset-2 hover:underline">Clinic queue</Link>.
      Walk-ins skip this page and are registered directly on the queue.
    </div>

    {checkInHandoff && handoffName && (
      <div className="flex flex-col gap-3 rounded-xl border border-teal-200 bg-teal-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between" role="status">
        <div>
          <p className="text-[13px] font-semibold text-teal-950">{handoffName} is in today&apos;s clinic queue</p>
          <p className="mt-1 text-[12px] text-teal-800">The appointment is marked checked in. The visit stays open until consultation is completed on the clinic queue.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="secondary" onClick={() => setCheckInHandoff(null)}>Dismiss</Button>
          <Link
            to="/clinic/visits"
            state={{ checkedInName: handoffName, checkedInVisitId: checkInHandoff.id }}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-teal-700 px-4 text-[13px] font-semibold text-white hover:bg-teal-800"
          >
            Open clinic queue <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    )}

    <Card title="Schedule appointment" description="Search by name or patient ID so you can confirm the right record before booking.">
      <form className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1.5fr)_1fr_1.4fr_100px_auto] lg:items-end" onSubmit={(event) => { event.preventDefault(); if (!form.patientId) return; create.mutate(); }}>
        <PatientPicker value={form.patientId} onChange={(patientId) => setForm((current) => ({ ...current, patientId }))} />
        <label><span className="field-label">Date and time</span><input required type="datetime-local" value={form.scheduledAt} onChange={(event) => setForm({ ...form, scheduledAt: event.target.value })} className="field-input" /></label>
        <label><span className="field-label">Purpose</span><input required value={form.purpose} onChange={(event) => setForm({ ...form, purpose: event.target.value })} className="field-input" placeholder="Medical consultation" /></label>
        <label><span className="field-label">Minutes</span><input required type="number" min="15" max="240" value={form.durationMins} onChange={(event) => setForm({ ...form, durationMins: event.target.value })} className="field-input" /></label>
        <Button disabled={!form.patientId || create.isPending}><Plus className="h-4 w-4" />Schedule</Button>
      </form>
      {create.isError && <p className="px-5 pb-4 text-[12px] text-rose-600">Unable to schedule appointment. Confirm the patient and time, then try again.</p>}
    </Card>

    <Card title="Upcoming appointments" description="Approve pending requests, then check in approved patients when they arrive to start their clinic visit.">
      {checkIn.isError && <p className="border-b border-rose-100 bg-rose-50 px-5 py-3 text-[12px] text-rose-700">{getErrorMessage(checkIn.error)}</p>}
      {appointments.data?.length ? <div className="divide-y divide-medical-100">{appointments.data.map((appointment) => <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between" key={appointment.id}><div><p className="text-[13px] font-semibold text-medical-900">{appointment.patient.firstName} {appointment.patient.lastName}</p><p className="mt-1 text-[11px] text-medical-500">{appointment.patient.patientNumber} · {appointment.purpose} · {new Date(appointment.scheduledAt).toLocaleString()}</p></div><div className="flex items-center gap-2"><Badge variant={appointmentStatusVariant(appointment.status)}>{appointmentStatusLabel(appointment.status)}</Badge>{appointment.status === 'PENDING' && <><Button variant="secondary" onClick={() => updateStatus.mutate({ id: appointment.id, status: 'APPROVED' })}><Check className="h-4 w-4" />Approve</Button><Button variant="secondary" onClick={() => updateStatus.mutate({ id: appointment.id, status: 'CANCELLED' })}><X className="h-4 w-4" />Cancel</Button></>}{(appointment.status === 'APPROVED' || appointment.status === 'CONFIRMED') && <Button onClick={() => { checkIn.reset(); checkIn.mutate(appointment.id); }} disabled={checkIn.isPending}>Check in &amp; open visit</Button>}</div></div>)}</div> : <p className="p-5 text-[13px] text-medical-500">No upcoming appointments.</p>}
    </Card>
  </div>;
}
