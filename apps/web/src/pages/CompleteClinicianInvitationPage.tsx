import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Alert, Box } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { completeClinicianInvitation } from '../services/api';
import { Button } from '../components/ui/button';
import { FormField } from '../components/ui/FormField';
import { Card } from '../components/ui/card';

export function CompleteClinicianInvitationPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const mutation = useMutation({ mutationFn: () => completeClinicianInvitation(params.get('token') ?? '', password), onSuccess: () => navigate('/dashboard') });
  return <Box sx={{ maxWidth: 520, mx: 'auto', mt: 8 }}><Card title="Complete your CLINICKA signup" description="Choose a password for your permanent clinician account.">
    <Box component="form" onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }} sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <FormField label="Create password" required type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
      {mutation.isError && <Alert severity="error">This invitation is invalid or expired. Ask clinic administration to send a new one.</Alert>}
      <Button type="submit" loading={mutation.isPending}>Complete signup</Button>
    </Box>
  </Card></Box>;
}
