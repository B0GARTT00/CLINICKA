import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Box, MenuItem, Typography } from '@mui/material';
import { ShieldCheck, UserPlus, Users } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { StatusChip } from '../components/ui/StatusChip';
import { Card } from '../components/ui/card';
import { ErrorState, LoadingState } from '../components/ui/States';
import { createClinicianInvitation, getAdminUsers } from '../services/api';
import { PageHeader } from '../components/ui/PageHeader';
import { FormField } from '../components/ui/FormField';
import { Button } from '../components/ui/button';

export function AdminUsersPage() {
  const users = useQuery({ queryKey: ['admin-users'], queryFn: getAdminUsers });
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ displayName: '', email: '', role: 'DOCTOR' as 'DOCTOR' | 'DENTIST' });
  const create = useMutation({
    mutationFn: () => createClinicianInvitation(form),
    onSuccess: async () => {
      setForm({ displayName: '', email: '', role: 'DOCTOR' });
    },
  });
  if (users.isLoading) return <LoadingState label="Loading users..." />;
  if (users.isError) return <ErrorState message="Unable to load user administration." />;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader
        eyebrow="Administration"
        title="User administration"
        description="Review accounts, roles, and activation status."
        action={
          <Badge variant="success">
            <Users size={14} />
            {(users.data ?? []).length} accounts
          </Badge>
        }
      />
      <Card title="Invite permanent doctor or dentist" description="Send a signup invitation to a permanent clinician. They will choose their own password. Part-time or visiting clinicians should receive a separate ticket from Clinic → Clinician access.">
        <Box component="form" onSubmit={(event) => { event.preventDefault(); create.mutate(); }} sx={{ p: 2.5, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <FormField required size="small" label="Full name" value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} sx={{ minWidth: 220 }} />
          <FormField required size="small" type="email" label="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} sx={{ minWidth: 250 }} />
          <FormField select size="small" label="Role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as typeof form.role })} sx={{ minWidth: 170 }}>
            <MenuItem value="DOCTOR">Doctor</MenuItem>
            <MenuItem value="DENTIST">Dentist</MenuItem>
          </FormField>
          <Button type="submit" loading={create.isPending}><UserPlus size={16} />Send invitation</Button>
        </Box>
        {create.isError && <Alert severity="error" sx={{ mx: 2.5, mb: 2.5 }}>The account could not be created. Check the email, password, and role.</Alert>}
        {create.isSuccess && <Alert severity="success" sx={{ mx: 2.5, mb: 2.5 }}>Invitation sent. The clinician can finish signup from their email.</Alert>}
      </Card>
      <Card
        title="System users"
        description="Role assignment and account changes are restricted to administrators."
      >
        <Box>
          {(users.data ?? []).map((user) => (
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { sm: 'center' },
                justifyContent: 'space-between',
                gap: 1.5,
                px: 2.5,
                py: 2,
                borderBottom: 1,
                borderColor: 'divider',
                '&:last-child': { borderBottom: 0 },
              }}
              key={user.id}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {user.displayName}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', overflowWrap: 'anywhere' }}
                >
                  {user.email}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <StatusChip state={user.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'} />
                {user.roles.map((role) => (
                  <Typography
                    component="span"
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
                    key={role.name}
                  >
                    <ShieldCheck size={14} />
                    {role.name}
                  </Typography>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      </Card>
    </Box>
  );
}
