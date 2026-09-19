import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock3, Plus, Stethoscope } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { PatientPicker } from '../components/PatientPicker';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ErrorState, LoadingState } from '../components/ui/States';
import { PageHeader } from '../components/ui/PageHeader';
import {
  createConsultation,
  createVisit,
  getVisitQueue,
  updateVisitStatus,
  type ClinicVisit,
} from '../services/api';

type CheckInLocationState = { checkedInName?: string; checkedInVisitId?: string };

export function ClinicVisitsPage() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const [patientId, setPatientId] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [intakeNotes, setIntakeNotes] = useState('');
  const [selectedVisit, setSelectedVisit] = useState<string | null>(null);
  const emptyConsultation = {
    cues: '',
    nursingDiagnosis: '',
    nursingIntervention: '',
    medicalDiagnosis: '',
    medicalIntervention: '',
    evaluation: '',
    medicineName: '',
    dosage: '',
    frequency: '',
  };
  const [consultation, setConsultation] = useState(emptyConsultation);
  const [arrivalNotice, setArrivalNotice] = useState<CheckInLocationState | null>(null);
  const [registrationNotice, setRegistrationNotice] = useState<string | null>(null);
  const queue = useQuery({ queryKey: ['visit-queue'], queryFn: getVisitQueue });
  const create = useMutation({
    mutationFn: () =>
      createVisit({
        patientId,
        chiefComplaint: chiefComplaint.trim(),
        notes: intakeNotes.trim() || undefined,
      }),
    onSuccess: (visit) => {
      setPatientId('');
      setChiefComplaint('');
      setIntakeNotes('');
      setRegistrationNotice(
        `${visit.patient.firstName} ${visit.patient.lastName} was registered and added to today's queue.`,
      );
      queryClient.setQueryData<ClinicVisit[]>(['visit-queue'], (current = []) => [
        ...current,
        visit,
      ]);
    },
  });
  const status = useMutation({
    mutationFn: ({ id, value }: { id: string; value: 'IN_CONSULTATION' | 'COMPLETED' }) =>
      updateVisitStatus(id, value),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['visit-queue'] }),
  });
  const saveConsultation = useMutation({
    mutationFn: () =>
      createConsultation(selectedVisit ?? '', {
        cues: consultation.cues || undefined,
        nursingDiagnosis: consultation.nursingDiagnosis || undefined,
        nursingIntervention: consultation.nursingIntervention || undefined,
        medicalDiagnosis: consultation.medicalDiagnosis || undefined,
        medicalIntervention: consultation.medicalIntervention || undefined,
        evaluation: consultation.evaluation || undefined,
        subjective: consultation.cues || undefined,
        assessment: consultation.medicalDiagnosis || consultation.nursingDiagnosis || undefined,
        plan: consultation.medicalIntervention || consultation.nursingIntervention || undefined,
        diagnoses: consultation.medicalDiagnosis
          ? [{ description: consultation.medicalDiagnosis }]
          : undefined,
        treatments: consultation.medicalIntervention
          ? [{ description: consultation.medicalIntervention }]
          : undefined,
        prescriptionItems: consultation.medicineName
          ? [
              {
                medicineName: consultation.medicineName,
                dosage: consultation.dosage,
                frequency: consultation.frequency,
              },
            ]
          : undefined,
      }),
    onSuccess: () => {
      setSelectedVisit(null);
      setConsultation(emptyConsultation);
      void queryClient.invalidateQueries({ queryKey: ['visit-queue'] });
    },
  });

  useEffect(() => {
    const state = location.state as CheckInLocationState | null;
    if (state?.checkedInName) {
      setArrivalNotice(state);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  if (queue.isLoading) return <LoadingState label="Loading clinic queue..." />;
  if (queue.isError) return <ErrorState message="Unable to load the clinic queue." />;

  const getCreateErrorMessage = (error: unknown) => {
    const message = (error as { response?: { data?: { message?: string | string[] } } })?.response
      ?.data?.message;
    return Array.isArray(message)
      ? message.join(', ')
      : message || 'Unable to register visit. Confirm the patient and try again.';
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader
        eyebrow="Clinic workflow"
        title="Today's clinic queue"
        description="Triage patients on site, record progress notes, and complete visits."
        action={
          <Badge variant="success">
            <Clock3 size={14} />
            {queue.data?.length ?? 0} waiting today
          </Badge>
        }
      />

      {arrivalNotice?.checkedInName && (
        <Alert severity="success" variant="outlined" role="status">
          <span className="font-semibold">{arrivalNotice.checkedInName}</span> was checked in from
          their appointment and added to the queue below.
        </Alert>
      )}
      {registrationNotice && (
        <Alert severity="success" variant="outlined" role="status">
          {registrationNotice}
        </Alert>
      )}

      <Card
        title="Register walk-in / unscheduled visit"
        description="Search the patient by name or ID. For scheduled arrivals, check them in on Appointments instead."
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(220px,1.2fr) 1fr 1fr auto' },
            gap: 1.5,
            alignItems: 'center',
            p: 2.5,
          }}
        >
          <PatientPicker value={patientId} onChange={setPatientId} disabled={create.isPending} />
          <TextField
            size="small"
            label="Chief complaint"
            required
            value={chiefComplaint}
            onChange={(event) => setChiefComplaint(event.target.value)}
            placeholder="Reason for visit"
            disabled={create.isPending}
          />
          <TextField
            size="small"
            label="Intake notes (optional)"
            value={intakeNotes}
            onChange={(event) => setIntakeNotes(event.target.value)}
            placeholder="Initial observations or relevant details"
            disabled={create.isPending}
          />
          <Button
            disabled={!patientId || !chiefComplaint.trim() || create.isPending}
            onClick={() => create.mutate()}
          >
            <Plus className="h-4 w-4" />
            Register walk-in
          </Button>
        </Box>
        {create.isError && (
          <Alert severity="error" sx={{ mx: 2.5, mb: 2 }}>
            {getCreateErrorMessage(create.error)}
          </Alert>
        )}
      </Card>

      <Card
        title="Today's queue"
        description="Visits are ordered by arrival time. Complete the visit here when consultation is finished."
      >
        {queue.data?.length ? (
          <div className="divide-y divide-medical-100">
            {queue.data.map((visit) => {
              const highlighted = arrivalNotice?.checkedInVisitId === visit.id;
              return (
                <div className={`px-5 py-4 ${highlighted ? 'bg-teal-50/80' : ''}`} key={visit.id}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brokenshire-50 text-brokenshire-700">
                        <Stethoscope className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-medical-900">
                          {visit.patient.firstName} {visit.patient.lastName}
                        </p>
                        <p className="mt-1 text-[11px] text-medical-500">
                          {visit.patient.patientNumber} ·{' '}
                          {visit.chiefComplaint || 'No complaint recorded'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={visit.status === 'IN_CONSULTATION' ? 'warning' : 'neutral'}>
                        {visit.status === 'IN_CONSULTATION' ? 'In consultation' : 'Waiting'}
                      </Badge>
                      {visit.status === 'OPEN' && (
                        <Button
                          variant="secondary"
                          onClick={() => status.mutate({ id: visit.id, value: 'IN_CONSULTATION' })}
                        >
                          Start
                        </Button>
                      )}
                      {visit.status === 'IN_CONSULTATION' && (
                        <>
                          <Button
                            variant="secondary"
                            onClick={() =>
                              setSelectedVisit(selectedVisit === visit.id ? null : visit.id)
                            }
                          >
                            Progress note
                          </Button>
                          <Button
                            onClick={() => status.mutate({ id: visit.id, value: 'COMPLETED' })}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Complete visit
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  {selectedVisit === visit.id && (
                    <Box
                      component="form"
                      sx={{
                        mt: 2,
                        p: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 2,
                        bgcolor: '#f8faf9',
                      }}
                      onSubmit={(event) => {
                        event.preventDefault();
                        saveConsultation.mutate();
                      }}
                    >
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          Clinical progress note
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Digital version of the patient health record&apos;s chronological care
                          entry.
                        </Typography>
                      </Box>
                      <TextField
                        required
                        multiline
                        minRows={2}
                        size="small"
                        label="Cues / presenting signs and symptoms"
                        value={consultation.cues}
                        onChange={(event) =>
                          setConsultation({ ...consultation, cues: event.target.value })
                        }
                      />
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                          gap: 1.5,
                        }}
                      >
                        <TextField
                          multiline
                          minRows={3}
                          size="small"
                          label="Nursing diagnosis"
                          value={consultation.nursingDiagnosis}
                          onChange={(event) =>
                            setConsultation({
                              ...consultation,
                              nursingDiagnosis: event.target.value,
                            })
                          }
                        />
                        <TextField
                          multiline
                          minRows={3}
                          size="small"
                          label="Nursing intervention"
                          value={consultation.nursingIntervention}
                          onChange={(event) =>
                            setConsultation({
                              ...consultation,
                              nursingIntervention: event.target.value,
                            })
                          }
                        />
                        <TextField
                          multiline
                          minRows={3}
                          size="small"
                          label="Medical diagnosis"
                          value={consultation.medicalDiagnosis}
                          onChange={(event) =>
                            setConsultation({
                              ...consultation,
                              medicalDiagnosis: event.target.value,
                            })
                          }
                        />
                        <TextField
                          multiline
                          minRows={3}
                          size="small"
                          label="Medical intervention"
                          value={consultation.medicalIntervention}
                          onChange={(event) =>
                            setConsultation({
                              ...consultation,
                              medicalIntervention: event.target.value,
                            })
                          }
                        />
                      </Box>
                      <TextField
                        multiline
                        minRows={2}
                        size="small"
                        label="Evaluation / outcome"
                        value={consultation.evaluation}
                        onChange={(event) =>
                          setConsultation({ ...consultation, evaluation: event.target.value })
                        }
                      />
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                          gap: 1.5,
                        }}
                      >
                        <TextField
                          size="small"
                          label="Medicine (optional)"
                          value={consultation.medicineName}
                          onChange={(event) =>
                            setConsultation({ ...consultation, medicineName: event.target.value })
                          }
                        />
                        <TextField
                          size="small"
                          label="Dosage"
                          value={consultation.dosage}
                          onChange={(event) =>
                            setConsultation({ ...consultation, dosage: event.target.value })
                          }
                        />
                        <TextField
                          size="small"
                          label="Frequency"
                          value={consultation.frequency}
                          onChange={(event) =>
                            setConsultation({ ...consultation, frequency: event.target.value })
                          }
                        />
                      </Box>
                      {saveConsultation.isError && (
                        <Alert severity="error">
                          Unable to save this progress note. Review the entry and try again.
                        </Alert>
                      )}
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button disabled={saveConsultation.isPending}>
                          {saveConsultation.isPending ? 'Saving...' : 'Save progress note'}
                        </Button>
                      </Box>
                    </Box>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="p-5 text-[13px] text-medical-500">
            No patients are currently waiting. Scheduled arrivals appear here after check-in;
            walk-ins can be registered above.
          </p>
        )}
      </Card>
    </Box>
  );
}
