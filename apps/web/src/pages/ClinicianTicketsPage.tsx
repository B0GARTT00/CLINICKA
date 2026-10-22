import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Alert, Box, MenuItem, Typography } from '@mui/material';
import { Copy, Ticket } from 'lucide-react';
import { createClinicianTicket } from '../services/api';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/card';
import { FormField } from '../components/ui/FormField';
import { Button } from '../components/ui/button';

export function ClinicianTicketsPage() {
  const [form, setForm] = useState({ clinicianName: '', clinicianEmail: '', role: 'DOCTOR' as 'DOCTOR' | 'DENTIST' });
  const [created, setCreated] = useState<Awaited<ReturnType<typeof createClinicianTicket>>>();
  const mutation = useMutation({ mutationFn: () => createClinicianTicket(form), onSuccess: setCreated });
  return <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
    <PageHeader eyebrow="Clinic access" title="Part-time clinician tickets" description="Create a separate one-use, one-shift ticket for each visiting or part-time doctor or dentist." />
    <Card title="Create clinician ticket" description="The clinician redeems this ticket with their email and a new password.">
      <Box component="form" onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }} sx={{ p: 2.5, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <FormField size="small" label="Clinician name" required value={form.clinicianName} onChange={(event) => setForm({ ...form, clinicianName: event.target.value })} sx={{ minWidth: 240 }} />
        <FormField size="small" label="Clinician email" required type="email" value={form.clinicianEmail} onChange={(event) => setForm({ ...form, clinicianEmail: event.target.value })} sx={{ minWidth: 260 }} />
        <FormField select size="small" label="Role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as 'DOCTOR' | 'DENTIST' })} sx={{ minWidth: 150 }}>
          <MenuItem value="DOCTOR">Doctor</MenuItem><MenuItem value="DENTIST">Dentist</MenuItem>
        </FormField>
        <Button type="submit" loading={mutation.isPending}><Ticket size={16} />Create ticket</Button>
      </Box>
      {mutation.isError && <Alert severity="error" sx={{ mx: 2.5, mb: 2.5 }}>The ticket could not be created.</Alert>}
    </Card>
    {created && <Card title="Ticket created" description="Copy this ticket securely and send it directly to the named clinician. It expires after 24 hours and can only be redeemed once.">
      <Box sx={{ p: 2.5 }}>
        <Typography component="code" sx={{ display: 'block', p: 2, bgcolor: 'grey.100', overflowWrap: 'anywhere' }}>{created.ticket}</Typography>
        <Box sx={{ mt: 2 }}><Button onClick={() => navigator.clipboard.writeText(created.ticket)}><Copy size={16} />Copy ticket</Button></Box>
      </Box>
    </Card>}
  </Box>;
}
