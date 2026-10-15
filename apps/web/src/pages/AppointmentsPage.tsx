import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, CalendarDays, Check, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import { useAuth } from '../hooks/useAuth';
import { permissionsForRoles } from '../auth/authorization';
import { DoctorSchedulesPanel } from './DoctorSchedulesPanel';
import Box from '@mui/material/Box';
import { PatientPicker } from '../components/PatientPicker';
import { Badge } from '../components/ui/Badge';
import { StatusChip } from '../components/ui/StatusChip';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { EmptyState, ErrorState, LoadingState, MutationFeedback } from '../components/ui/States';
import { FormField } from '../components/ui/FormField';
import { PageHeader } from '../components/ui/PageHeader';
import {
  checkInAppointment,
  createAppointment,
  getAppointments,
  getAppointmentDoctors,
  getDoctorAvailability,
  updateAppointmentStatus,
} from '../services/api';
import type { ClinicVisit } from '../services/api';

export function AppointmentsPage() {
  const queryClient = useQueryClient();
  const auth = useAuth();
  const canManage = permissionsForRoles(auth.user?.roles || []).has('appointments.manage');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const [month, setMonth] = useState(today.slice(0, 7));
  const [form, setForm] = useState({
    patientId: '',
    assignedToId: '',
    date: '',
    scheduledAt: '',
    purpose: '',
    durationMins: '30',
  });
  const [checkInHandoff, setCheckInHandoff] = useState<ClinicVisit | null>(null);
  const appointments = useQuery({ queryKey: ['appointments'], queryFn: getAppointments, refetchInterval: 30_000 });
  const doctors = useQuery({ queryKey: ['appointment-doctors'], queryFn: getAppointmentDoctors });
  const duration = Number(form.durationMins);
  const validDuration = Number.isInteger(duration) && duration >= 10 && duration <= 240;
  const endOfMonth = /^\d{4}-\d{2}$/.test(month) ? new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)), 0)).getUTCDate() : 0;
  const availability = useQuery({ queryKey: ['doctor-availability', form.assignedToId, month, duration, form.patientId],
    queryFn: () => getDoctorAvailability({ doctorId: form.assignedToId, from: month + '-01', to: month + '-' + endOfMonth, durationMins: duration, patientId: form.patientId || undefined }),
    enabled: canManage && Boolean(form.assignedToId && endOfMonth && validDuration), refetchInterval: 15_000,
  });
  const days = availability.data?.days || [];
  const starts = days.find(day => day.date === form.date)?.starts || [];
  const validSlot = starts.includes(form.scheduledAt);
  const create = useMutation({
    mutationFn: () =>
      createAppointment({
        patientId: form.patientId,
        assignedToId: form.assignedToId,
        purpose: form.purpose,
        durationMins: Number(form.durationMins),
        scheduledAt: new Date(form.scheduledAt).toISOString(),
      }),
    onError: () => { void queryClient.invalidateQueries({ queryKey: ['doctor-availability'] }); },
    onSuccess: () => {
      setForm({ patientId: '', assignedToId: '', date: '', scheduledAt: '', purpose: '', durationMins: '30' });
      void queryClient.invalidateQueries({ queryKey: ['appointments'] });
      void queryClient.invalidateQueries({ queryKey: ['doctor-availability'] });
    },
  });
  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'APPROVED' | 'CANCELLED' }) =>
      updateAppointmentStatus(id, status),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['appointments'] }); await queryClient.invalidateQueries({ queryKey: ['doctor-availability'] }); },
  });
  const checkIn = useMutation({
    mutationFn: (id: string) => checkInAppointment(id),
    onSuccess: (visit) => {
      setCheckInHandoff(visit);
      void queryClient.invalidateQueries({ queryKey: ['appointments'] });
      void queryClient.invalidateQueries({ queryKey: ['visit-queue'] });
    },
  });
  const getErrorMessage = (error: unknown, fallback = 'The appointment could not be checked in.') => {
    const response = (error as { response?: { data?: { message?: string | string[] } } })?.response
      ?.data?.message;
    return Array.isArray(response)
      ? response.join(', ')
      : response || fallback;
  };

  if (appointments.isLoading) return <LoadingState label="Loading appointments..." />;
  if (appointments.isError) return <ErrorState message="Unable to load appointments." onRetry={() => void appointments.refetch()} retrying={appointments.isFetching} />;

  const handoffName = checkInHandoff
    ? `${checkInHandoff.patient.firstName} ${checkInHandoff.patient.lastName}`
    : null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <MutationFeedback open={create.isSuccess} message="Appointment scheduled successfully." onClose={() => create.reset()} />
      <MutationFeedback open={updateStatus.isSuccess} message="Appointment status updated." onClose={() => updateStatus.reset()} />
      <PageHeader
        eyebrow="Clinic scheduling"
        title="Appointments"
        description="Book future visits here. Check patients in on arrival to open today's clinic visit."
        action={
          <Badge variant="success">
            <CalendarDays size={14} />
            {appointments.data?.length ?? 0} upcoming
          </Badge>
        }
      />

      <Alert severity="info" variant="outlined">
        <span className="font-semibold text-medical-800">Typical flow:</span> Schedule appointment →
        Approve → Check in on arrival → Continue care in{' '}
        <Link
          to="/clinic/visits"
          className="font-semibold text-brokenshire-700 underline-offset-2 hover:underline"
        >
          Clinic queue
        </Link>
        . Walk-ins skip this page and are registered directly on the queue.
      </Alert>

      {checkInHandoff && handoffName && (
        <div
          className="flex flex-col gap-3 rounded-xl border border-teal-200 bg-teal-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
          role="status"
        >
          <div>
            <p className="text-[13px] font-semibold text-teal-950">
              {handoffName} is in today&apos;s clinic queue
            </p>
            <p className="mt-1 text-[12px] text-teal-800">
              The appointment is marked checked in. The visit stays open until consultation is
              completed on the clinic queue.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="secondary" onClick={() => setCheckInHandoff(null)}>
              Dismiss
            </Button>
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

      <DoctorSchedulesPanel doctors={doctors.data || []} canManage={canManage} />
      {canManage && <Card
        title="Schedule appointment"
        description="Choose a patient, doctor, available date, and time. All clinic times are Philippine time."
      >
        {updateStatus.isError && <Alert severity="error" sx={{ mx: 2.5, mt: 2 }}>{getErrorMessage(updateStatus.error, 'Unable to update the appointment status. Please try again.')}</Alert>}
        <Box
          component="form"
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: '1fr 1fr',
              lg: 'repeat(3, minmax(0, 1fr))',
            },
            gap: 1.5,
            alignItems: 'center',
            p: 2.5,
          }}
          onSubmit={(event) => {
            event.preventDefault();
            if (!form.patientId || !validSlot || !form.assignedToId || !validDuration || create.isPending) return;
            create.mutate();
          }}
        >
          <PatientPicker
            value={form.patientId}
            onChange={(patientId) => setForm((current) => ({ ...current, patientId, scheduledAt: '' }))}
          />
          <FormField select required size="small" label="Doctor" value={form.assignedToId} onChange={event => setForm({ ...form, assignedToId: event.target.value, date: '', scheduledAt: '' })}>
            {(doctors.data || []).map(doctor => <MenuItem key={doctor.id} value={doctor.id}>{doctor.displayName}</MenuItem>)}
          </FormField>
          <FormField required size="small" type="month" label="Availability month" value={month} onChange={event => { setMonth(event.target.value); setForm({ ...form, date: '', scheduledAt: '' }); }} slotProps={{ inputLabel: { shrink: true } }} />
          <FormField select required size="small" label="Available date" value={form.date} disabled={!form.assignedToId || availability.isFetching || !days.length} onChange={event => setForm({ ...form, date: event.target.value, scheduledAt: '' })}>
            {days.map(day => <MenuItem key={day.date} value={day.date}>{new Date(day.date + 'T00:00:00+08:00').toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'short', month: 'short', day: 'numeric' })} · {day.starts.length} times</MenuItem>)}
          </FormField>
          <FormField select required size="small" label="Available time" value={form.scheduledAt} disabled={!form.date || availability.isFetching} onChange={event => setForm({ ...form, scheduledAt: event.target.value })}>
            {starts.map(time => <MenuItem key={time} value={time}>{new Date(time).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' })}</MenuItem>)}
          </FormField>
          <FormField
            required
            size="small"
            label="Purpose"
            value={form.purpose}
            onChange={(event) => setForm({ ...form, purpose: event.target.value })}
            placeholder="Medical consultation"
          />
          <FormField
            required
            size="small"
            type="number"
            label="Minutes"
            value={form.durationMins}
            onChange={(event) => setForm({ ...form, durationMins: event.target.value, date: '', scheduledAt: '' })}
            slotProps={{ htmlInput: { min: '10', max: '240' } }}
          />
          <Button type="submit" disabled={!form.patientId || !validSlot || !form.purpose.trim() || create.isPending}>
            <Plus className="h-4 w-4" />
            Schedule
          </Button>
        </Box>
        {doctors.isError && <ErrorState message="Unable to load doctors." onRetry={() => void doctors.refetch()} />}
        {doctors.data?.length === 0 && <Alert severity="info" sx={{ m: 2.5 }}>No active doctor accounts are available. A system administrator can set up the doctors’ accounts.</Alert>}
        {availability.isError && <ErrorState message="Unable to load available times." onRetry={() => void availability.refetch()} />}
        {form.assignedToId && !availability.isFetching && !availability.isError && !days.length && <Alert severity="info" sx={{ m: 2.5 }}>No available appointments for this doctor in the selected month. Check another month or enter the confirmed clinic hours under Doctor schedules.</Alert>}
        {create.isError && (
          <Alert severity="error" sx={{ mx: 2.5, mb: 2 }}>
            {getErrorMessage(create.error, 'Unable to schedule appointment. The time may have just been booked; refresh available times and try again.')}
          </Alert>
        )}
      </Card>}

      <Card
        title="Upcoming appointments"
        description="Approve pending requests, then check in approved patients when they arrive to start their clinic visit."
      >
        {checkIn.isError && (
          <Alert severity="error" sx={{ mx: 2.5, mt: 2 }}>
            {getErrorMessage(checkIn.error)}
          </Alert>
        )}
        {appointments.data?.length ? (
          <div className="divide-y divide-medical-100">
            {appointments.data.map((appointment) => (
              <div
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                key={appointment.id}
              >
                <div>
                  <p className="text-[13px] font-semibold text-medical-900">
                    {appointment.patient.firstName} {appointment.patient.lastName}
                  </p>
                  <p className="mt-1 text-[11px] text-medical-500">
                    {appointment.patient.patientNumber} · {appointment.purpose} ·{' '}
                    {appointment.assignedTo?.displayName || 'Unassigned doctor'} · {new Date(appointment.scheduledAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusChip state={appointment.status} />
                  {canManage && appointment.status === 'PENDING' && (
                    <>
                      <Button
                        variant="secondary"
                        onClick={() =>
                          updateStatus.mutate({ id: appointment.id, status: 'APPROVED' })
                        }
                      >
                        <Check className="h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() =>
                          updateStatus.mutate({ id: appointment.id, status: 'CANCELLED' })
                        }
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </Button>
                    </>
                  )}
                  {(appointment.status === 'APPROVED' || appointment.status === 'CONFIRMED') && (
                    <Button
                      onClick={() => {
                        checkIn.reset();
                        checkIn.mutate(appointment.id);
                      }}
                      disabled={checkIn.isPending}
                    >
                      Check in &amp; open visit
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No upcoming appointments" description="Use the scheduling form above to book the next clinic appointment." />
        )}
      </Card>
    </Box>
  );
}
