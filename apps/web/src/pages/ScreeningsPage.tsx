import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck, Plus } from 'lucide-react';
import { useState } from 'react';
import { Alert, Avatar, Box, Typography } from '@mui/material';
import { PatientPicker } from '../components/PatientPicker';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ErrorState, LoadingState } from '../components/ui/States';
import { FormField } from '../components/ui/FormField';
import { PageHeader } from '../components/ui/PageHeader';
import { createScreening, getScreenings } from '../services/api';

export function ScreeningsPage() {
  const queryClient = useQueryClient();
  const screenings = useQuery({ queryKey: ['screenings'], queryFn: getScreenings });
  const [form, setForm] = useState({
    patientId: '',
    screeningType: '',
    screenedAt: '',
    result: '',
    findings: '',
  });
  const save = useMutation({
    mutationFn: () =>
      createScreening({ ...form, screenedAt: new Date(form.screenedAt).toISOString() }),
    onSuccess: () => {
      setForm({ patientId: '', screeningType: '', screenedAt: '', result: '', findings: '' });
      void queryClient.invalidateQueries({ queryKey: ['screenings'] });
    },
  });
  if (screenings.isLoading) return <LoadingState label="Loading screening records..." />;
  if (screenings.isError) return <ErrorState message="Unable to load screening records." />;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader
        eyebrow="Health records"
        title="Health screening"
        description="Record clinic screening results and recommendations."
        action={
          <Badge variant="neutral">
            <ClipboardCheck size={14} />
            {screenings.data?.length ?? 0} records
          </Badge>
        }
      />
      <Card title="Record screening" description="Record the result and relevant findings.">
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
            save.mutate();
          }}
        >
          <PatientPicker
            value={form.patientId}
            onChange={(patientId) => setForm((current) => ({ ...current, patientId }))}
          />
          <FormField
            required
            fullWidth
            size="small"
            label="Screening type"
            value={form.screeningType}
            onChange={(event) => setForm({ ...form, screeningType: event.target.value })}
            placeholder="Annual physical"
          />
          <FormField
            required
            fullWidth
            size="small"
            label="Date screened"
            type="date"
            value={form.screenedAt}
            onChange={(event) => setForm({ ...form, screenedAt: event.target.value })}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <FormField
            required
            fullWidth
            size="small"
            label="Result"
            value={form.result}
            onChange={(event) => setForm({ ...form, result: event.target.value })}
            placeholder="Cleared"
          />
          <FormField
            fullWidth
            multiline
            minRows={3}
            label="Findings"
            sx={{ gridColumn: { sm: '1 / -1' } }}
            value={form.findings}
            onChange={(event) => setForm({ ...form, findings: event.target.value })}
          />
          <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
            <Button disabled={!form.patientId || save.isPending}>
              <Plus className="h-4 w-4" />
              Save screening
            </Button>
          </Box>
          {save.isError && (
            <Alert severity="error" sx={{ gridColumn: '1 / -1' }}>
              Unable to save this screening. Review the required fields and date.
            </Alert>
          )}
        </Box>
      </Card>
      <Card title="Screening records" description="Recent health screening results.">
        {screenings.data?.length ? (
          <Box>
            {screenings.data.map((record) => (
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
                    <ClipboardCheck size={18} />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {record.patient.firstName} {record.patient.lastName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {record.patient.patientNumber} · {record.screeningType} ·{' '}
                      {new Date(record.screenedAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Box>
                <Badge variant="neutral">{record.result}</Badge>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography sx={{ p: 2.5 }} variant="body2" color="text.secondary">
            No screening records yet.
          </Typography>
        )}
      </Card>
    </Box>
  );
}
