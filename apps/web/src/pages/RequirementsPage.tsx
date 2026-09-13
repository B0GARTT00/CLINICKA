import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ClipboardCheck, FileCheck2, X } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ErrorState, LoadingState } from '../components/ui/States';
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
    <div className="space-y-6">
      <header
        id={embedded ? 'requirements' : undefined}
        className="flex flex-col gap-3 border-b border-medical-200 pb-6 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          {!embedded && (
            <p className="text-[11px] font-semibold uppercase tracking-widest text-brokenshire-600">
              Health records
            </p>
          )}
          {embedded ? (
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-medical-900">
              1. Verify requirements
            </h2>
          ) : (
            <h1 className="mt-1 text-[26px] font-semibold tracking-tight text-medical-900">
              Requirements
            </h1>
          )}
          <p className="mt-1 text-[13px] text-medical-500">
            Review the documents needed before a patient's clearance can be approved.
          </p>
        </div>
        <Badge variant="warning">
          <ClipboardCheck className="mr-1 inline h-3 w-3" />
          {submissions.data?.filter((submission) => submission.status !== 'VERIFIED').length ??
            0}{' '}
          need review
        </Badge>
      </header>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {requirements.data?.map((requirement) => (
          <Card
            key={requirement.id}
            title={requirement.name}
            description={requirement.description || 'Health requirement'}
          >
            <div className="flex items-center justify-between p-5 pt-0 text-[12px] text-medical-500">
              <span>Applies to: {requirement.applicableTo}</span>
              <span>{requirement._count?.submissions ?? 0} submissions</span>
            </div>
          </Card>
        ))}
      </section>
      <Card
        title="Requirement submissions"
        description="Review documents submitted by students, faculty, and staff."
      >
        {submissions.data?.length ? (
          <div className="divide-y divide-medical-100">
            {submissions.data.map((submission) => (
              <div
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                key={submission.id}
              >
                <div className="flex items-start gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-medical-50 text-medical-600">
                    <FileCheck2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-medical-900">
                      {submission.patient.firstName} {submission.patient.lastName}
                    </p>
                    <p className="mt-1 text-[11px] text-medical-500">
                      {submission.patient.patientNumber} · {submission.requirement.name} · Submitted{' '}
                      {new Date(submission.submittedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
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
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="p-5 text-[13px] text-medical-500">No requirement submissions yet.</p>
        )}
      </Card>
    </div>
  );
}
