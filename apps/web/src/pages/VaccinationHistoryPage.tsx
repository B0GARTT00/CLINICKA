import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Syringe } from 'lucide-react';
import { useState } from 'react';
import { Alert, Avatar, Box, TextField, Typography } from '@mui/material';
import { PatientPicker } from '../components/PatientPicker';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ErrorState, LoadingState } from '../components/ui/States';
import { PageHeader } from '../components/ui/PageHeader';
import { createVaccination, getVaccinations } from '../services/api';

export function VaccinationHistoryPage() {
  const queryClient = useQueryClient();
  const vaccinations = useQuery({ queryKey: ['vaccinations'], queryFn: getVaccinations });
  const [form, setForm] = useState({
    patientId: '',
    vaccineName: '',
    dose: '',
    receivedAt: '',
    sourceProvider: '',
  });
  const save = useMutation({
    mutationFn: () =>
      createVaccination({ ...form, receivedAt: new Date(form.receivedAt).toISOString() }),
    onSuccess: () => {
      setForm({ patientId: '', vaccineName: '', dose: '', receivedAt: '', sourceProvider: '' });
      void queryClient.invalidateQueries({ queryKey: ['vaccinations'] });
    },
  });
  if (vaccinations.isLoading) return <LoadingState label="Loading vaccination history..." />;
  if (vaccinations.isError) return <ErrorState message="Unable to load vaccination history." />;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader
        eyebrow="Health records"
        title="Vaccination history"
        description="Document vaccination history reported from an external provider; this clinic does not administer vaccines."
        action={
          <Badge variant="success">
            <Syringe size={14} />
            {vaccinations.data?.length ?? 0} recorded
          </Badge>
        }
      />
      <Card
        title="Record vaccination history"
        description="For documentation and verification only. Record the vaccine as received from an external provider."
      >
        <Box
          component="form"
          sx={{
            display: 'grid',
            gap: 1.5,
            p: 2.5,
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              lg: 'minmax(220px,1.5fr) repeat(4,minmax(0,1fr))',
            },
          }}
          onSubmit={(event) => {
            event.preventDefault();
            if (!form.patientId) return;
            save.mutate();
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
            label="Vaccine"
            value={form.vaccineName}
            onChange={(event) => setForm({ ...form, vaccineName: event.target.value })}
          />
          <TextField
            required
            fullWidth
            size="small"
            label="Dose"
            value={form.dose}
            onChange={(event) => setForm({ ...form, dose: event.target.value })}
            placeholder="Dose 1"
          />
          <TextField
            required
            fullWidth
            size="small"
            label="Date received"
            type="date"
            value={form.receivedAt}
            onChange={(event) => setForm({ ...form, receivedAt: event.target.value })}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            required
            fullWidth
            size="small"
            label="External provider / source"
            value={form.sourceProvider}
            onChange={(event) => setForm({ ...form, sourceProvider: event.target.value })}
          />
          <Box sx={{ gridColumn: { lg: '1 / -1' } }}>
            <Button disabled={!form.patientId || save.isPending}>
              <Plus className="h-4 w-4" />
              Save history record
            </Button>
          </Box>
          {save.isError && (
            <Alert severity="error" sx={{ gridColumn: '1 / -1' }}>
              Unable to save this vaccination record. Review the required fields and date.
            </Alert>
          )}
        </Box>
      </Card>
      <Card title="Vaccination records" description="Recorded vaccination history.">
        {vaccinations.data?.length ? (
          <Box>
            {vaccinations.data.map((record) => (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                  px: 2.5,
                  py: 2,
                  borderBottom: 1,
                  borderColor: 'divider',
                  '&:last-child': { borderBottom: 0 },
                }}
                key={record.id}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar
                    sx={{ width: 36, height: 36, bgcolor: 'primary.50', color: 'primary.main' }}
                  >
                    <Syringe size={18} />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {record.patient.firstName} {record.patient.lastName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {record.patient.patientNumber} · {record.vaccineName} · {record.dose} ·{' '}
                      {new Date(record.receivedAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Box>
                <Badge variant="success">Recorded</Badge>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography sx={{ p: 2.5 }} variant="body2" color="text.secondary">
            No vaccination records yet.
          </Typography>
        )}
      </Card>
    </Box>
  );
}
