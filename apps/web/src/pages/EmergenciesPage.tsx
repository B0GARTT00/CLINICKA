import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Plus } from 'lucide-react';
import { useState } from 'react';
import { Alert, Box, TextField, Typography } from '@mui/material';
import { PatientPicker } from '../components/PatientPicker';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ErrorState, LoadingState } from '../components/ui/States';
import { PageHeader } from '../components/ui/PageHeader';
import { createEmergency, getEmergencies } from '../services/api';

export function EmergenciesPage() {
  const queryClient = useQueryClient();
  const emergencies = useQuery({ queryKey: ['emergencies'], queryFn: getEmergencies });
  const [form, setForm] = useState({
    patientId: '',
    occurredAt: '',
    emergencyType: '',
    description: '',
    actionTaken: '',
    treatment: '',
    disposition: '',
  });
  const create = useMutation({
    mutationFn: () =>
      createEmergency({ ...form, occurredAt: new Date(form.occurredAt).toISOString() }),
    onSuccess: () => {
      setForm({
        patientId: '',
        occurredAt: '',
        emergencyType: '',
        description: '',
        actionTaken: '',
        treatment: '',
        disposition: '',
      });
      void queryClient.invalidateQueries({ queryKey: ['emergencies'] });
    },
  });

  if (emergencies.isLoading) return <LoadingState label="Loading emergency cases..." />;
  if (emergencies.isError) return <ErrorState message="Unable to load emergency cases." />;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader
        eyebrow="Restricted clinical record"
        title="Emergency cases"
        description="Record incidents, actions taken, treatment, and outcome."
        action={
          <Badge variant="danger">
            <AlertTriangle className="mr-1 inline h-3 w-3" />
            Restricted access
          </Badge>
        }
      />
      <Card
        title="Record emergency case"
        description="Only authorized clinical staff can access these records."
      >
        <Box
          component="form"
          sx={{
            display: 'grid',
            gap: 1.5,
            p: 2.5,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
          }}
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
          <TextField
            required
            fullWidth
            size="small"
            label="Date and time"
            type="datetime-local"
            value={form.occurredAt}
            onChange={(event) => setForm({ ...form, occurredAt: event.target.value })}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            required
            fullWidth
            size="small"
            label="Emergency type"
            value={form.emergencyType}
            onChange={(event) => setForm({ ...form, emergencyType: event.target.value })}
            placeholder="Injury or acute illness"
          />
          <TextField
            fullWidth
            size="small"
            label="Disposition"
            value={form.disposition}
            onChange={(event) => setForm({ ...form, disposition: event.target.value })}
            placeholder="Returned to class / referred"
          />
          <TextField
            required
            fullWidth
            multiline
            minRows={3}
            label="Incident details"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
          <TextField
            required
            fullWidth
            multiline
            minRows={3}
            label="Actions taken"
            value={form.actionTaken}
            onChange={(event) => setForm({ ...form, actionTaken: event.target.value })}
          />
          <TextField
            fullWidth
            multiline
            minRows={3}
            label="Treatment"
            value={form.treatment}
            onChange={(event) => setForm({ ...form, treatment: event.target.value })}
          />
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Button disabled={!form.patientId || create.isPending}>
              <Plus className="h-4 w-4" />
              Save emergency case
            </Button>
          </Box>
        </Box>
        {create.isError && (
          <Alert severity="error" sx={{ mx: 2.5, mb: 2 }}>
            Unable to save the emergency case. Check the patient and required fields.
          </Alert>
        )}
      </Card>
      <Card title="Emergency history" description="Most recent restricted incidents.">
        {emergencies.data?.length ? (
          <Box>
            {emergencies.data.map((emergency) => (
              <Box
                sx={{
                  px: 2.5,
                  py: 2,
                  borderBottom: 1,
                  borderColor: 'divider',
                  '&:last-child': { borderBottom: 0 },
                }}
                key={emergency.id}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {emergency.patient.firstName} {emergency.patient.lastName}{' '}
                      <Typography component="span" variant="body2" color="text.secondary">
                        · {emergency.emergencyType}
                      </Typography>
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {emergency.patient.patientNumber} ·{' '}
                      {new Date(emergency.occurredAt).toLocaleString()}
                    </Typography>
                  </Box>
                  <Badge variant="danger">Restricted</Badge>
                </Box>
                <Typography variant="body2" sx={{ mt: 1.5 }}>
                  {emergency.description}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Action: {emergency.actionTaken}
                </Typography>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography sx={{ p: 2.5 }} variant="body2" color="text.secondary">
            No emergency cases recorded.
          </Typography>
        )}
      </Card>
    </Box>
  );
}
