import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, MenuItem, Typography } from '@mui/material';
import { Button } from '../components/ui/button';
import { FormField } from '../components/ui/FormField';
import { DataTable } from '../components/ui/DataTable';
import { ErrorState, LoadingState } from '../components/ui/States';
import { closeDoctorSchedule, createDoctorSchedule, getDoctorSchedules, type AppointmentDoctor } from '../services/api';

function errorText(error: unknown) {
  const message = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return Array.isArray(message) ? message.join(' ') : message || 'Unable to save this schedule. Try again.';
}
export function DoctorSchedulesPanel({ doctors, canManage }: { doctors: AppointmentDoctor[]; canManage: boolean }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ doctorId: '', date: '', start: '', end: '' });
  const queryClient = useQueryClient();
  const sessions = useQuery({ queryKey: ['doctor-schedules'], queryFn: getDoctorSchedules, enabled: open });
  const refresh = async () => { await queryClient.invalidateQueries({ queryKey: ['doctor-schedules'] }); await queryClient.invalidateQueries({ queryKey: ['doctor-availability'] }); };
  const add = useMutation({ mutationFn: () => createDoctorSchedule({ doctorId: draft.doctorId, startsAt: new Date(draft.date + 'T' + draft.start + ':00+08:00').toISOString(), endsAt: new Date(draft.date + 'T' + draft.end + ':00+08:00').toISOString() }), onSuccess: async () => { setDraft({ ...draft, date: '', start: '', end: '' }); await refresh(); } });
  const close = useMutation({ mutationFn: closeDoctorSchedule, onSuccess: refresh });
  const valid = draft.doctorId && draft.date && draft.start && draft.end && draft.start < draft.end;
  return <Accordion expanded={open} onChange={(_, expanded) => setOpen(expanded)} elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
    <AccordionSummary expandIcon={<span aria-hidden="true">⌄</span>}><Box><Typography sx={{ fontWeight: 700 }}>Doctor schedules</Typography><Typography variant="body2" color="text.secondary">{canManage ? 'Set each doctor’s available clinic dates and hours.' : 'View each doctor’s clinic dates and hours.'}</Typography></Box></AccordionSummary>
    <AccordionDetails>
      {canManage && <Box component="form" onSubmit={event => { event.preventDefault(); if (valid && !add.isPending) add.mutate(); }} sx={{ display: 'grid', gap: 2, mb: 3, gridTemplateColumns: { xs: '1fr', md: 'repeat(5, 1fr)' }, alignItems: 'start' }}>
        <FormField select label="Schedule doctor" required value={draft.doctorId} onChange={event => setDraft({ ...draft, doctorId: event.target.value })}>{doctors.map(doctor => <MenuItem key={doctor.id} value={doctor.id}>{doctor.displayName}</MenuItem>)}</FormField>
        <FormField label="Clinic date" type="date" required value={draft.date} onChange={event => setDraft({ ...draft, date: event.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
        <FormField label="Start time" type="time" required value={draft.start} onChange={event => setDraft({ ...draft, start: event.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
        <FormField label="End time" type="time" required value={draft.end} onChange={event => setDraft({ ...draft, end: event.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
        <Button type="submit" disabled={!valid} loading={add.isPending}>Add clinic hours</Button>
      </Box>}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>All times are Philippine time. Add separate sessions for morning and afternoon hours when there is a break.</Typography>
      {(add.isError || close.isError) && <Alert severity="error" sx={{ mb: 2 }}>{errorText(add.error || close.error)}</Alert>}
      {sessions.isLoading && <LoadingState label="Loading doctor schedules..." />}
      {sessions.isError && <ErrorState message="Unable to load doctor schedules." onRetry={() => void sessions.refetch()} />}
      {sessions.data && <DataTable data={sessions.data} columns={[
        { field: 'doctor', header: 'Doctor', render: row => row.doctor.displayName },
        { field: 'startsAt', header: 'Date', render: row => new Date(row.startsAt).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) },
        { field: 'endsAt', header: 'Clinic hours', render: row => [row.startsAt, row.endsAt].map(time => new Date(time).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' })).join(' – ') },
        ...(canManage ? [{ field: 'actions', header: '', render: (row: { id: string }) => <Button variant="secondary" disabled={close.isPending} onClick={() => close.mutate(row.id)}>Remove hours</Button> }] : []),
      ]} emptyMessage="No doctor schedules configured. Enter the confirmed clinic dates and hours to make them bookable." />}
    </AccordionDetails>
  </Accordion>;
}
