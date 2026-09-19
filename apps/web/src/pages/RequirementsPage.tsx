import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ClipboardCheck, Download, FileCheck2, Upload, X } from 'lucide-react';
import { Alert, Avatar, Box, MenuItem, TextField, Typography } from '@mui/material';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import { PageHeader } from '../components/ui/PageHeader';
import { useAuth } from '../hooks/useAuth';
import { downloadRequirementEvidence, getRequirements, getRequirementSubmissions, reviewRequirementSubmission, submitRequirementEvidence } from '../services/api';

function errorMessage(error: unknown) {
  return (error as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'The request could not be completed.';
}

export function RequirementsPage({ embedded = false }: { embedded?: boolean } = {}) {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const isPatient = Boolean(auth.user?.roles.some((role) => role === 'STUDENT' || role === 'FACULTY_STAFF'));
  const canReview = Boolean(auth.user?.roles.some((role) => ['ADMINISTRATOR', 'CLINIC_NURSE', 'DOCTOR'].includes(role)));
  const [requirementId, setRequirementId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [expiresAt, setExpiresAt] = useState('');
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const requirements = useQuery({ queryKey: ['requirements'], queryFn: getRequirements });
  const submissions = useQuery({ queryKey: ['requirement-submissions'], queryFn: getRequirementSubmissions });
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['requirement-submissions'] });
    void queryClient.invalidateQueries({ queryKey: ['requirements'] });
    void queryClient.invalidateQueries({ queryKey: ['clearance-eligibility'] });
  };
  const upload = useMutation({
    mutationFn: () => submitRequirementEvidence(requirementId, file!, expiresAt),
    onSuccess: () => { setRequirementId(''); setFile(null); setExpiresAt(''); refresh(); },
  });
  const review = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'VERIFIED' | 'REJECTED' }) => reviewRequirementSubmission(id, status, reviewNotes[id]),
    onSuccess: refresh,
  });

  if (requirements.isLoading || submissions.isLoading) return <LoadingState label="Loading health requirements..." />;
  if (requirements.isError || submissions.isError) return <ErrorState message="Unable to load health requirements." />;

  return <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
    <Box id={embedded ? 'requirements' : undefined}>
      <PageHeader eyebrow={embedded ? undefined : 'Health records'} title={embedded ? '1. Verify requirements' : 'Requirements'} description={isPatient ? 'Submit private evidence and track its review status.' : 'Review private evidence submitted by students, faculty, and staff.'} action={<Badge variant="warning"><ClipboardCheck className="mr-1 inline h-3 w-3" />{submissions.data?.filter((item) => item.status === 'SUBMITTED').length ?? 0} awaiting review</Badge>} />
    </Box>
    {isPatient && <Card title="Submit evidence" description="PDF, PNG, or JPEG; maximum file size 5 MB. Evidence remains private.">
      <Box component="form" onSubmit={(event) => { event.preventDefault(); if (file && requirementId) upload.mutate(); }} sx={{ display: 'grid', gap: 2, p: 2.5, gridTemplateColumns: { md: '2fr 1fr' } }}>
        <TextField select label="Requirement" value={requirementId} onChange={(event) => setRequirementId(event.target.value)} required>{requirements.data?.map((requirement) => <MenuItem key={requirement.id} value={requirement.id}>{requirement.name}</MenuItem>)}</TextField>
        <TextField label="Evidence expiry (optional)" type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <Button type="button" variant="secondary" onClick={() => document.getElementById('evidence-file')?.click()}><Upload className="h-4 w-4" /> {file?.name ?? 'Choose evidence file'}</Button>
        <input id="evidence-file" hidden type="file" accept="application/pdf,image/png,image/jpeg" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        <Button type="submit" loading={upload.isPending} disabled={!file || !requirementId}>Submit evidence</Button>
        {upload.isError && <Alert severity="error" sx={{ gridColumn: '1 / -1' }}>{errorMessage(upload.error)}</Alert>}
      </Box>
    </Card>}
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' } }}>
      {requirements.data?.map((requirement) => <Card key={requirement.id} title={requirement.name} description={requirement.description || 'Health requirement'}><Box sx={{ display: 'flex', justifyContent: 'space-between', px: 2.5, pb: 2.5 }}><Typography variant="caption" color="text.secondary">Applies to: {requirement.applicableTo}</Typography><Typography variant="caption" color="text.secondary">{requirement._count?.submissions ?? 0} submissions</Typography></Box></Card>)}
    </Box>
    <Card title="Requirement submissions" description={isPatient ? 'Your evidence and review history.' : 'Open evidence securely before recording a decision.'}>
      {submissions.data?.length ? submissions.data.map((submission) => <Box key={submission.id} sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'center' }, justifyContent: 'space-between', gap: 2, p: 2.5, borderBottom: 1, borderColor: 'divider', '&:last-child': { borderBottom: 0 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}><Avatar variant="rounded" sx={{ width: 36, height: 36, bgcolor: 'primary.50', color: 'primary.main' }}><FileCheck2 size={18} /></Avatar><Box><Typography variant="body2" sx={{ fontWeight: 700 }}>{submission.patient.firstName} {submission.patient.lastName}</Typography><Typography variant="caption" color="text.secondary">{submission.requirement.name} · {new Date(submission.submittedAt).toLocaleDateString()}</Typography>{submission.notes && <Typography variant="body2" sx={{ mt: .5 }}>Reviewer note: {submission.notes}</Typography>}</Box></Box>
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, minWidth: { md: 420 }, justifyContent: { md: 'flex-end' } }}>
          <Badge variant={submission.status === 'VERIFIED' ? 'success' : submission.status === 'REJECTED' ? 'danger' : 'warning'}>{submission.status}</Badge>
          {submission.document && <Button variant="secondary" onClick={() => void downloadRequirementEvidence(submission.id, submission.document!.filename)}><Download className="h-4 w-4" /> Evidence</Button>}
          {canReview && submission.status === 'SUBMITTED' && <><TextField size="small" label="Review notes" required value={reviewNotes[submission.id] ?? ''} onChange={(event) => setReviewNotes((current) => ({ ...current, [submission.id]: event.target.value }))} /><Button variant="secondary" disabled={!reviewNotes[submission.id]?.trim()} onClick={() => review.mutate({ id: submission.id, status: 'VERIFIED' })}><Check className="h-4 w-4" /> Verify</Button><Button variant="danger" disabled={!reviewNotes[submission.id]?.trim()} onClick={() => review.mutate({ id: submission.id, status: 'REJECTED' })}><X className="h-4 w-4" /> Reject</Button></>}
        </Box>
      </Box>) : <EmptyState title="No requirement submissions" description={isPatient ? 'Choose a requirement and upload evidence to begin.' : 'No evidence is awaiting review.'} />}
      {review.isError && <Alert severity="error" sx={{ m: 2.5 }}>{errorMessage(review.error)}</Alert>}
    </Card>
  </Box>;
}
