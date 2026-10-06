import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ClipboardCheck, FileCheck2, Upload, X } from 'lucide-react';
import { Alert, Avatar, Box, Checkbox, FormControlLabel, MenuItem, Typography } from '@mui/material';
import { Badge } from '../components/ui/Badge';
import { StatusChip } from '../components/ui/StatusChip';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { EmptyState, ErrorState, LoadingState, MutationFeedback } from '../components/ui/States';
import { FormField } from '../components/ui/FormField';
import { PageHeader } from '../components/ui/PageHeader';
import { EvidencePreview } from '../components/EvidencePreview';
import { useAuth } from '../hooks/useAuth';
import { createRequirement, getAcademicCatalog, getAcademicYears, getRequirements, getRequirementSubmissions, reviewRequirementSubmission, submitRequirementEvidence } from '../services/api';

function errorMessage(error: unknown) {
  return (error as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'The request could not be completed.';
}

export function RequirementsPage({ embedded = false }: { embedded?: boolean } = {}) {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const isPatient = Boolean(auth.user?.roles.some((role) => role === 'STUDENT' || role === 'FACULTY_STAFF'));
  const canReview = Boolean(auth.user?.roles.some((role) => ['ADMINISTRATOR', 'CLINIC_NURSE', 'DOCTOR'].includes(role)));
  const canManage = Boolean(auth.user?.roles.some((role) => ['ADMINISTRATOR', 'CLINIC_NURSE'].includes(role)));
  const [requirementId, setRequirementId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [expiresAt, setExpiresAt] = useState('');
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState({ name: '', description: '', applicableTo: 'STUDENT', academicYearId: '', semesterId: '', deadline: '', departmentIds: [] as string[], programIds: [] as string[], yearLevels: [] as number[] });
  const requirements = useQuery({ queryKey: ['requirements'], queryFn: getRequirements });
  const submissions = useQuery({ queryKey: ['requirement-submissions'], queryFn: getRequirementSubmissions });
  const academicYears = useQuery({ queryKey: ['academic-years'], queryFn: getAcademicYears, enabled: canManage });
  const catalog = useQuery({ queryKey: ['academic-catalog'], queryFn: getAcademicCatalog, enabled: canManage });
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
  const create = useMutation({
    mutationFn: () => createRequirement({
      ...draft,
      description: draft.description || undefined,
      semesterId: draft.semesterId || undefined,
      deadline: draft.deadline || undefined,
      departmentIds: draft.departmentIds.length ? draft.departmentIds : undefined,
      programIds: draft.programIds.length ? draft.programIds : undefined,
      yearLevels: draft.yearLevels.length ? draft.yearLevels : undefined,
    }),
    onSuccess: () => { setDraft({ name: '', description: '', applicableTo: 'STUDENT', academicYearId: '', semesterId: '', deadline: '', departmentIds: [], programIds: [], yearLevels: [] }); refresh(); },
  });
  const selectedYear = academicYears.data?.find((year) => year.id === draft.academicYearId);
  const availablePrograms = catalog.data?.filter((department) => !draft.departmentIds.length || draft.departmentIds.includes(department.id)).flatMap((department) => department.programs) ?? [];
  const toggle = <T,>(values: T[], value: T) => values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

  if (requirements.isLoading || submissions.isLoading) return <LoadingState label="Loading health requirements..." />;
  if (requirements.isError || submissions.isError) return <ErrorState message="Unable to load health requirements." onRetry={() => { void requirements.refetch(); void submissions.refetch(); }} retrying={requirements.isFetching || submissions.isFetching} />;

  return <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
    <MutationFeedback open={upload.isSuccess} message="Evidence submitted for review." onClose={() => upload.reset()} />
    <MutationFeedback open={review.isSuccess} message="Requirement review recorded." onClose={() => review.reset()} />
    <MutationFeedback open={create.isSuccess} message="Requirement created." onClose={() => create.reset()} />
    <Box id={embedded ? 'requirements' : undefined}>
      <PageHeader eyebrow={embedded ? undefined : 'Health records'} title={embedded ? '1. Verify requirements' : 'Requirements'} description={isPatient ? 'Submit private evidence and track its review status.' : 'Review private evidence submitted by students, faculty, and staff.'} action={<Badge variant="warning"><ClipboardCheck className="mr-1 inline h-3 w-3" />{submissions.data?.filter((item) => item.status === 'SUBMITTED').length ?? 0} awaiting review</Badge>} />
    </Box>
    {canManage && !embedded && <Card title="Create requirement" description="Target everyone, an affiliation, or selected student departments, programs, and year levels.">
      <Box component="form" onSubmit={(event) => { event.preventDefault(); create.mutate(); }} sx={{ display: 'grid', gap: 2, p: 2.5, gridTemplateColumns: { md: 'repeat(2, 1fr)' } }}>
        <FormField label="Requirement name" required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
        <FormField select label="Applies to" value={draft.applicableTo} onChange={(event) => setDraft({ ...draft, applicableTo: event.target.value })}><MenuItem value="ALL">Everyone</MenuItem><MenuItem value="STUDENT">Students</MenuItem><MenuItem value="FACULTY">Faculty</MenuItem><MenuItem value="STAFF">Staff</MenuItem></FormField>
        <FormField select label="Academic year" required value={draft.academicYearId} onChange={(event) => setDraft({ ...draft, academicYearId: event.target.value, semesterId: '' })}>{academicYears.data?.map((year) => <MenuItem key={year.id} value={year.id}>{year.label}</MenuItem>)}</FormField>
        <FormField select label="Semester (optional)" value={draft.semesterId} onChange={(event) => setDraft({ ...draft, semesterId: event.target.value })}><MenuItem value="">Whole academic year</MenuItem>{selectedYear?.semesters.map((semester) => <MenuItem key={semester.id} value={semester.id}>{semester.label}</MenuItem>)}</FormField>
        <FormField label="Description (optional)" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
        <FormField label="Deadline (optional)" type="date" value={draft.deadline} onChange={(event) => setDraft({ ...draft, deadline: event.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
        {draft.applicableTo === 'STUDENT' && <Box sx={{ gridColumn: '1 / -1', display: 'grid', gap: 1.5 }}>
          <Typography variant="subtitle2">Optional student targeting</Typography>
          <Box><Typography variant="caption" color="text.secondary">Departments</Typography><Box>{catalog.data?.map((department) => <FormControlLabel key={department.id} control={<Checkbox checked={draft.departmentIds.includes(department.id)} onChange={() => setDraft({ ...draft, departmentIds: toggle(draft.departmentIds, department.id), programIds: [] })} />} label={department.name} />)}</Box></Box>
          <Box><Typography variant="caption" color="text.secondary">Programs</Typography><Box>{availablePrograms.map((program) => <FormControlLabel key={program.id} control={<Checkbox checked={draft.programIds.includes(program.id)} onChange={() => setDraft({ ...draft, programIds: toggle(draft.programIds, program.id) })} />} label={program.name} />)}</Box></Box>
          <Box><Typography variant="caption" color="text.secondary">Year levels</Typography><Box>{[1,2,3,4,5,6].map((year) => <FormControlLabel key={year} control={<Checkbox checked={draft.yearLevels.includes(year)} onChange={() => setDraft({ ...draft, yearLevels: toggle(draft.yearLevels, year) })} />} label={`Year ${year}`} />)}</Box></Box>
        </Box>}
        <Box sx={{ gridColumn: '1 / -1' }}><Button type="submit" loading={create.isPending} disabled={!draft.name.trim() || !draft.academicYearId}>Create requirement</Button></Box>
        {create.isError && <Alert severity="error" sx={{ gridColumn: '1 / -1' }}>{errorMessage(create.error)}</Alert>}
      </Box>
    </Card>}
    {isPatient && <Card title="Submit evidence" description="PDF, PNG, or JPEG; maximum file size 5 MB. Evidence remains private.">
      <Box component="form" onSubmit={(event) => { event.preventDefault(); if (file && requirementId) upload.mutate(); }} sx={{ display: 'grid', gap: 2, p: 2.5, gridTemplateColumns: { md: '2fr 1fr' } }}>
        <FormField
          select
          label="Requirement"
          value={requirementId}
          onChange={(event) => setRequirementId(event.target.value)}
          required
        >
          {requirements.data?.map((requirement) => <MenuItem key={requirement.id} value={requirement.id}>{requirement.name}</MenuItem>)}
        </FormField>
        <FormField label="Evidence expiry (optional)" type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
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
          <StatusChip state={submission.status} />
          {submission.document && <EvidencePreview submissionId={submission.id} filename={submission.document.filename} mimeType={submission.document.mimeType} />}
          {canReview && submission.status === 'SUBMITTED' && <><FormField size="small" label="Review notes" required value={reviewNotes[submission.id] ?? ''} onChange={(event) => setReviewNotes((current) => ({ ...current, [submission.id]: event.target.value }))} /><Button variant="secondary" disabled={!reviewNotes[submission.id]?.trim()} onClick={() => review.mutate({ id: submission.id, status: 'VERIFIED' })}><Check className="h-4 w-4" /> Verify</Button><Button variant="danger" disabled={!reviewNotes[submission.id]?.trim()} onClick={() => review.mutate({ id: submission.id, status: 'REJECTED' })}><X className="h-4 w-4" /> Reject</Button></>}
        </Box>
      </Box>) : <EmptyState title="No requirement submissions" description={isPatient ? 'Choose a requirement and upload evidence to begin.' : 'No evidence is awaiting review.'} />}
      {review.isError && <Alert severity="error" sx={{ m: 2.5 }}>{errorMessage(review.error)}</Alert>}
    </Card>
  </Box>;
}
