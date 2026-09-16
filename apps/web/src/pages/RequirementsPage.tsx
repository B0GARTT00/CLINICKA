import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ClipboardCheck, FileCheck2, X } from 'lucide-react';
import { Avatar, Box, Typography } from '@mui/material';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ErrorState, LoadingState } from '../components/ui/States';
import { PageHeader } from '../components/ui/PageHeader';
import {
  getRequirements,
  getRequirementSubmissions,
  reviewRequirementSubmission,
} from '../services/api';

export function RequirementsPage({ embedded = false }: { embedded?: boolean } = {}) {
  const queryClient = useQueryClient();
  const requirements = useQuery({ queryKey: ['requirements'], queryFn: getRequirements });
  const submissions = useQuery({
    queryKey: ['requirement-submissions'],
    queryFn: getRequirementSubmissions,
  });
  const review = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'VERIFIED' | 'REJECTED' }) =>
      reviewRequirementSubmission(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['requirement-submissions'] });
      void queryClient.invalidateQueries({ queryKey: ['clearance-eligibility'] });
    },
  });

  if (requirements.isLoading || submissions.isLoading)
    return <LoadingState label="Loading health requirements..." />;
  if (requirements.isError || submissions.isError)
    return <ErrorState message="Unable to load health requirements." />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box id={embedded ? 'requirements' : undefined}>
        <PageHeader
          eyebrow={embedded ? undefined : 'Health records'}
          title={embedded ? '1. Verify requirements' : 'Requirements'}
          description="Review the documents needed before a patient's clearance can be approved."
          action={
            <Badge variant="warning">
              <ClipboardCheck className="mr-1 inline h-3 w-3" />
              {submissions.data?.filter((submission) => submission.status !== 'VERIFIED').length ??
                0}{' '}
              need review
            </Badge>
          }
        />
      </Box>
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' },
        }}
      >
        {requirements.data?.map((requirement) => (
          <Card
            key={requirement.id}
            title={requirement.name}
            description={requirement.description || 'Health requirement'}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 2.5, pb: 2.5 }}>
              <Typography variant="caption" color="text.secondary">
                Applies to: {requirement.applicableTo}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {requirement._count?.submissions ?? 0} submissions
              </Typography>
            </Box>
          </Card>
        ))}
      </Box>
      <Card
        title="Requirement submissions"
        description="Review documents submitted by students, faculty, and staff."
      >
        {submissions.data?.length ? (
          <Box>
            {submissions.data.map((submission) => (
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
                key={submission.id}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <Avatar
                    variant="rounded"
                    sx={{ width: 36, height: 36, bgcolor: 'primary.50', color: 'primary.main' }}
                  >
                    <FileCheck2 size={18} />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {submission.patient.firstName} {submission.patient.lastName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {submission.patient.patientNumber} · {submission.requirement.name} · Submitted{' '}
                      {new Date(submission.submittedAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                  <Badge
                    variant={
                      submission.status === 'VERIFIED'
                        ? 'success'
                        : submission.status === 'REJECTED'
                          ? 'danger'
                          : 'warning'
                    }
                  >
                    {submission.status}
                  </Badge>
                  {submission.status !== 'VERIFIED' && submission.status !== 'REJECTED' && (
                    <>
                      <Button
                        variant="secondary"
                        onClick={() => review.mutate({ id: submission.id, status: 'VERIFIED' })}
                      >
                        <Check className="h-4 w-4" />
                        Verify
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => review.mutate({ id: submission.id, status: 'REJECTED' })}
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
            No requirement submissions yet.
          </Typography>
        )}
      </Card>
    </Box>
  );
}
