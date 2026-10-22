import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Alert, Box } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { redeemClinicianTicket } from '../services/api';
import { Button } from '../components/ui/button';
import { FormField } from '../components/ui/FormField';
import { Card } from '../components/ui/card';

export function RedeemClinicianTicketPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ ticket: params.get('ticket') || '', clinicianEmail: '', password: '' });
  const mutation = useMutation({ mutationFn: () => redeemClinicianTicket(form), onSuccess: () => navigate('/dashboard') });
  return <Box sx={{ maxWidth: 520, mx: 'auto', mt: 8 }}><Card title="Activate temporary clinician access" description="Use the ticket sent by clinic staff. Access expires after one shift.">
    <Box component="form" onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }} sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <FormField label="Ticket" required value={form.ticket} onChange={(event) => setForm({ ...form, ticket: event.target.value })} />
      <FormField label="Clinician email" required type="email" value={form.clinicianEmail} onChange={(event) => setForm({ ...form, clinicianEmail: event.target.value })} />
      <FormField label="Create password" required type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
      {mutation.isError && <Alert severity="error">This ticket is invalid, expired, or already used.</Alert>}
      <Button type="submit" loading={mutation.isPending}>Activate access</Button>
    </Box>
  </Card></Box>;
}
