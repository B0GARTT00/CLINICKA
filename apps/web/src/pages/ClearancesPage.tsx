import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, FileCheck, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { Alert, Box, LinearProgress, TextField, Typography } from '@mui/material';
import { PatientPicker } from '../components/PatientPicker';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ErrorState, LoadingState } from '../components/ui/States';
import { PageHeader } from '../components/ui/PageHeader';
import {
  checkClearanceEligibility,
  createClearance,
  getClearances,
  reviewClearance,
} from '../services/api';
import { RequirementsPage } from './RequirementsPage';

export function ClearancesPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ patientId: '', type: 'COLLEGE' });
  const clearances = useQuery({ queryKey: ['clearances'], queryFn: getClearances });
  const eligibility = useQuery({
    queryKey: ['clearance-eligibility', form.patientId],
    queryFn: () => checkClearanceEligibility(form.patientId),
    enabled: Boolean(form.patientId),
  });
  const create = useMutation({
    mutationFn: () => createClearance(form),
    onSuccess: () => {
      setForm({ patientId: '', type: 'COLLEGE' });
      void queryClient.invalidateQueries({ queryKey: ['clearances'] });
    },
  });
  const review = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'CLEARED' | 'REJECTED' }) =>
      reviewClearance(id, status),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['clearances'] }),
  });

  if (clearances.isLoading) return <LoadingState label="Loading medical clearances..." />;
  if (clearances.isError) return <ErrorState message="Unable to load medical clearances." />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader
        eyebrow="Health records"
        title="Requirements & clearances"
        description="Verify required documents, then review a patient's clearance in one place."
        action={
          <Badge variant="success">
            <FileCheck className="mr-1 inline h-3 w-3" />
            {clearances.data?.filter((clearance) => clearance.status === 'CLEARED').length ??
              0}{' '}
            cleared
          </Badge>
        }
      />
      <RequirementsPage embedded />
      <Box id="clearance-review" sx={{ pb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6">2. Review clearance eligibility</Typography>
        <Typography variant="body2" color="text.secondary">
          Select a patient to see which requirements are verified before creating a clearance
          review.
        </Typography>
      </Box>
      <Card
        title="Create clearance review"
        description="Search for the patient, then choose the clearance type."
      >
        <Box
          component="form"
          sx={{
            display: 'grid',
            gap: 1.5,
            p: 2.5,
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr auto' },
            alignItems: 'center',
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
            label="Clearance type"
            value={form.type}
            onChange={(event) => setForm({ ...form, type: event.target.value })}
          />
          <Button disabled={!eligibility.data?.eligible || create.isPending}>
            <Plus className="h-4 w-4" />
            Create review
          </Button>
        </Box>
        {form.patientId && (
          <Box sx={{ px: 2.5, py: 2, borderTop: 1, borderColor: 'divider' }} role="status">
            {eligibility.isLoading && (
              <>
                <LinearProgress sx={{ mb: 1 }} />
                <Typography variant="body2">Checking this patient's requirements...</Typography>
              </>
            )}
            {eligibility.isError && (
              <Alert severity="error">
                Unable to check requirement eligibility. Try again before creating a review.
              </Alert>
            )}
            {eligibility.data && (
              <>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {eligibility.data.eligible
                    ? 'All applicable requirements are verified. This clearance can move to review.'
                    : 'Verify all required documents before creating a clearance review.'}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: .5 }}>
                  Period: {eligibility.data.academicYear.name}{eligibility.data.semester ? ` · ${eligibility.data.semester.name}` : ' · Full academic year'}
                </Typography>
                {eligibility.data.applicableRequirements.length ? (
                  <Box
                    component="ul"
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 1,
                      mt: 1,
                      p: 0,
                      listStyle: 'none',
                    }}
                  >
                    {eligibility.data.applicableRequirements.map((requirement) => (
                      <li key={requirement.id}>
                        <Badge variant={requirement.satisfied ? 'success' : 'warning'}>
                          {requirement.name}: {requirement.satisfied ? 'Verified' : requirement.reason ?? 'Needed'}
                        </Badge>
                      </li>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    No applicable requirements have been configured for this patient.
                  </Typography>
                )}
              </>
            )}
          </Box>
        )}
        {create.isError && (
          <Alert severity="error" sx={{ mx: 2.5, mb: 2 }}>
            Unable to create clearance. Verify the patient and academic-year setup.
          </Alert>
        )}
      </Card>
      <Card
        title="Clearance records"
        description="Incomplete records cannot be approved until requirements are verified."
      >
        {clearances.data?.length ? (
          <Box>
            {clearances.data.map((clearance) => (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { sm: 'center' },
                  justifyContent: 'space-between',
                  gap: 2,
                  px: 2.5,
                  py: 2,
                  borderBottom: 1,
                  borderColor: 'divider',
                  '&:last-child': { borderBottom: 0 },
                }}
                key={clearance.id}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {clearance.patient.firstName} {clearance.patient.lastName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {clearance.patient.patientNumber} · {clearance.type} ·{' '}
                    {clearance.academicYear.label}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                  <Badge
                    variant={
                      clearance.status === 'CLEARED'
                        ? 'success'
                        : clearance.status === 'REJECTED'
                          ? 'danger'
                          : clearance.status === 'INCOMPLETE'
                            ? 'neutral'
                            : 'warning'
                    }
                  >
                    {clearance.status}
                  </Badge>
                  {clearance.status === 'FOR_REVIEW' && (
                    <>
                      <Button
                        variant="secondary"
                        onClick={() => review.mutate({ id: clearance.id, status: 'CLEARED' })}
                      >
                        <Check className="h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => review.mutate({ id: clearance.id, status: 'REJECTED' })}
                      >
                        <X className="h-4 w-4" />
                        Reject
                      </Button>
                    </>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography sx={{ p: 2.5 }} variant="body2" color="text.secondary">
            No clearance records yet.
          </Typography>
        )}
      </Card>
    </Box>
  );
}
