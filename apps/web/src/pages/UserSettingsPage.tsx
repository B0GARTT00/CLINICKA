import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, MenuItem, Typography } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { getMyPatientProfile, updateMyPatientProfile, updateMyProfile } from '../services/api';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { FormField } from '../components/ui/FormField';
import { LoadingState } from '../components/ui/States';

export function UserSettingsPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const patient = useQuery({ queryKey: ['my-patient-profile'], queryFn: getMyPatientProfile });
  const [displayName, setDisplayName] = useState(auth.user?.displayName || '');
  const [sex, setSex] = useState('');
  const saveName = useMutation({
    mutationFn: () => updateMyProfile(displayName),
    onSuccess: (user) => window.dispatchEvent(new CustomEvent('clinicka:user-updated', { detail: user })),
  });
  const saveSex = useMutation({
    mutationFn: () => updateMyPatientProfile({ sex: sex || undefined }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['my-patient-profile'] });
    },
  });

  if (patient.isLoading) return <LoadingState label="Loading your settings..." />;
  const currentSex = sex || patient.data?.sex || '';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader eyebrow="Account preferences" title="Settings" description="Manage your account name and personal health-profile preferences." />
      <Card title="Account" description="Your login email is managed by the clinic administrator.">
        <Box sx={{ p: 2.5, display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <FormField size="small" label="Display name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} sx={{ minWidth: 260 }} />
          <Button loading={saveName.isPending} onClick={() => saveName.mutate()}>Save display name</Button>
        </Box>
      </Card>
      <Card title="Health profile preferences" description="This information controls which applicable sections appear in your health-history form.">
        {patient.isError ? (
          <Alert severity="info" sx={{ m: 2.5 }}>No linked patient profile is available. Your account settings are still available above.</Alert>
        ) : (
          <Box sx={{ p: 2.5, display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <FormField select size="small" label="Sex at birth" value={currentSex} onChange={(event) => setSex(event.target.value)} sx={{ minWidth: 240 }}>
              <MenuItem value="">Prefer not to say</MenuItem>
              <MenuItem value="FEMALE">Female</MenuItem>
              <MenuItem value="MALE">Male</MenuItem>
              <MenuItem value="OTHER">Other / intersex</MenuItem>
            </FormField>
            <Button loading={saveSex.isPending} onClick={() => saveSex.mutate()}>Save health preferences</Button>
            <Typography variant="caption" color="text.secondary">For clinical applicability only. Changes are recorded in your patient profile.</Typography>
          </Box>
        )}
      </Card>
      {(saveName.isError || saveSex.isError) && <Alert severity="error">Settings could not be saved. Please try again.</Alert>}
    </Box>
  );
}
