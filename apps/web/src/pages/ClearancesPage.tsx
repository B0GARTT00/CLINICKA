import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Divider, MenuItem, Typography } from '@mui/material';
import { Check, Download, FileCheck, Send, X } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { EmptyState, ErrorState, LoadingState, MutationFeedback } from '../components/ui/States';
import { FormField } from '../components/ui/FormField';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusChip } from '../components/ui/StatusChip';
import { useAuth } from '../hooks/useAuth';
import { RequirementsPage } from './RequirementsPage';
import {
  checkMyClearanceEligibility,
  downloadRequirementEvidence,
  getClearances,
  getMyClearances,
  requestClearance,
  reviewClearance,
  reviewRequirementSubmission,
  type Clearance,
  type RequirementSubmission,
} from '../services/api';

const clearanceTypes = [
  ['COLLEGE', 'College / enrollment'],
  ['OJT', 'OJT / internship'],
  ['EMPLOYMENT', 'Employment'],
  ['BOARD_EXAM', 'Board examination'],
  ['OTHERS', 'Other purpose'],
] as const;

function errorMessage(error: unknown) {
  return (error as { response?: { data?: { message?: string } } }).response?.data?.message
    ?? 'The request could not be completed.';
}

function EvidenceList({ submissions, canReview, onChanged }: { submissions: RequirementSubmission[]; canReview: boolean; onChanged: () => void }) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const review = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'VERIFIED' | 'REJECTED' }) => reviewRequirementSubmission(id, status, notes[id]),
    onSuccess: onChanged,
  });

  if (!submissions.length) return <Alert severity="warning">No medical results or requirement documents have been submitted yet.</Alert>;

  return <Box sx={{ display: 'grid', gap: 1.25 }}>
    {submissions.map((submission) => <Box key={submission.id} sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 2, bgcolor: 'grey.50' }}>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <Box><Typography variant="body2" sx={{ fontWeight: 700 }}>{submission.requirement.name}</Typography><Typography variant="caption" color="text.secondary">Submitted {new Date(submission.submittedAt).toLocaleDateString()}</Typography></Box>
        <StatusChip state={submission.status} />
      </Box>
      <Box sx={{ display: 'flex', gap: 1, mt: 1.25, alignItems: 'center', flexWrap: 'wrap' }}>
        {submission.document && <Button variant="secondary" onClick={() => void downloadRequirementEvidence(submission.id, submission.document!.filename)}><Download className="h-4 w-4" /> Open submission</Button>}
        {canReview && submission.status === 'SUBMITTED' && <>
          <FormField size="small" label="Review notes" required value={notes[submission.id] ?? ''} onChange={(event) => setNotes((current) => ({ ...current, [submission.id]: event.target.value }))} />
          <Button variant="secondary" disabled={!notes[submission.id]?.trim() || review.isPending} onClick={() => review.mutate({ id: submission.id, status: 'VERIFIED' })}><Check className="h-4 w-4" /> Verify</Button>
          <Button variant="danger" disabled={!notes[submission.id]?.trim() || review.isPending} onClick={() => review.mutate({ id: submission.id, status: 'REJECTED' })}><X className="h-4 w-4" /> Reject</Button>
        </>}
      </Box>
    </Box>)}
    {review.isError && <Alert severity="error">{errorMessage(review.error)}</Alert>}
  </Box>;
}

function StaffRequestCard({ clearance, onChanged }: { clearance: Clearance; onChanged: () => void }) {
  const auth = useAuth();
  const [remarks, setRemarks] = useState('');
  const canReviewEvidence = Boolean(auth.user?.roles.some((role) => ['ADMINISTRATOR', 'CLINIC_NURSE', 'DOCTOR'].includes(role)));
  const canReviewClearance = Boolean(auth.user?.roles.some((role) => ['ADMINISTRATOR', 'CLINIC_NURSE'].includes(role)));
  const review = useMutation({ mutationFn: (status: 'CLEARED' | 'REJECTED') => reviewClearance(clearance.id, status, remarks || undefined), onSuccess: onChanged });
  const open = ['PENDING', 'INCOMPLETE', 'FOR_REVIEW'].includes(clearance.status);

  return <Card title={`${clearance.patient.firstName} ${clearance.patient.lastName}`} description={`${clearance.patient.patientNumber} · ${clearance.patient.type} · ${clearance.type.replaceAll('_', ' ')}`}>
    <Box sx={{ p: 2.5, display: 'grid', gap: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}><Typography variant="body2" color="text.secondary">Requested for {clearance.academicYear.label}{clearance.semester ? ` · ${clearance.semester.name}` : ''}</Typography><StatusChip state={clearance.status} /></Box>
      <Divider />
      <Box><Typography variant="subtitle2" sx={{ mb: 1 }}>Submitted medical results and requirements</Typography><EvidenceList submissions={clearance.patient.submissions ?? []} canReview={canReviewEvidence} onChanged={onChanged} /></Box>
      {canReviewClearance && open && <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        <FormField size="small" label="Clearance remarks" value={remarks} onChange={(event) => setRemarks(event.target.value)} />
        <Button disabled={review.isPending} onClick={() => review.mutate('CLEARED')}><Check className="h-4 w-4" /> Approve clearance</Button>
        <Button variant="danger" disabled={review.isPending || !remarks.trim()} onClick={() => review.mutate('REJECTED')}><X className="h-4 w-4" /> Reject request</Button>
      </Box>}
      {review.isError && <Alert severity="error">{errorMessage(review.error)}</Alert>}
    </Box>
  </Card>;
}

export function ClearancesPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const selfService = Boolean(auth.user?.roles.some((role) => ['STUDENT', 'FACULTY_STAFF'].includes(role)));
  const [type, setType] = useState('COLLEGE');
  const clearances = useQuery({ queryKey: ['clearances', selfService ? 'mine' : 'queue'], queryFn: selfService ? getMyClearances : getClearances });
  const eligibility = useQuery({ queryKey: ['clearance-eligibility', 'mine'], queryFn: checkMyClearanceEligibility, enabled: selfService });
  const refresh = () => { void queryClient.invalidateQueries({ queryKey: ['clearances'] }); void queryClient.invalidateQueries({ queryKey: ['clearance-eligibility'] }); };
  const request = useMutation({ mutationFn: () => requestClearance(type), onSuccess: refresh });

  if (clearances.isLoading) return <LoadingState label="Loading clearance requests..." />;
  if (clearances.isError) return <ErrorState message="Unable to load clearance requests." onRetry={() => void clearances.refetch()} />;
  const pendingCount = clearances.data?.filter((item) => ['PENDING', 'INCOMPLETE', 'FOR_REVIEW'].includes(item.status)).length ?? 0;

  return <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
    <MutationFeedback open={request.isSuccess} message="Your clearance request was sent to the clinic." onClose={() => request.reset()} />
    <PageHeader eyebrow="Health records" title={selfService ? 'Request medical clearance' : 'Clearance requests'} description={selfService ? 'Submit your medical results, send a request, and track the clinic review.' : 'Review requests from students, faculty, and staff together with every submitted medical document.'} action={<Badge variant="warning"><FileCheck className="mr-1 inline h-3 w-3" />{pendingCount} awaiting review</Badge>} />

    {selfService ? <>
      <RequirementsPage embedded />
      <Card title="2. Send a clearance request" description="After submitting the required medical results above, choose why you need clearance.">
        <Box component="form" onSubmit={(event) => { event.preventDefault(); request.mutate(); }} sx={{ p: 2.5, display: 'grid', gap: 2, gridTemplateColumns: { md: '1fr auto' }, alignItems: 'center' }}>
          <FormField select label="Clearance purpose" value={type} onChange={(event) => setType(event.target.value)}>{clearanceTypes.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</FormField>
          <Button type="submit" loading={request.isPending}><Send className="h-4 w-4" /> Submit request</Button>
          <Alert severity={eligibility.data?.eligible ? 'success' : 'info'} sx={{ gridColumn: '1 / -1' }}>{eligibility.data?.eligible ? 'All configured requirements are verified. Your request is ready for clinic review.' : 'You can still submit a request now. The clinic will review the medical results uploaded above before clearing it.'}</Alert>
          {request.isError && <Alert severity="error" sx={{ gridColumn: '1 / -1' }}>{errorMessage(request.error)}</Alert>}
        </Box>
      </Card>
      <Card title="My requests" description="The clinic will update the status after checking your submissions.">
        {clearances.data?.length ? <Box sx={{ display: 'grid' }}>{clearances.data.map((clearance) => <Box key={clearance.id} sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', gap: 2, borderBottom: 1, borderColor: 'divider', '&:last-child': { borderBottom: 0 } }}><Box><Typography variant="body2" sx={{ fontWeight: 700 }}>{clearance.type.replaceAll('_', ' ')}</Typography><Typography variant="caption" color="text.secondary">{clearance.academicYear.label}{clearance.createdAt ? ` · Requested ${new Date(clearance.createdAt).toLocaleDateString()}` : ''}</Typography>{clearance.remarks && <Typography variant="body2" sx={{ mt: .75 }}>Clinic remarks: {clearance.remarks}</Typography>}</Box><StatusChip state={clearance.status} /></Box>)}</Box> : <EmptyState title="No clearance requests" description="Upload your documents and submit your first request above." />}
      </Card>
    </> : clearances.data?.length ? clearances.data.map((clearance) => <StaffRequestCard key={clearance.id} clearance={clearance} onChanged={refresh} />) : <EmptyState title="No clearance requests" description="Requests submitted by students, faculty, and staff will appear here." />}
  </Box>;
}
