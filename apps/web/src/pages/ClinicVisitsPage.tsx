import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock3, Plus, Stethoscope } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { PatientPicker } from '../components/PatientPicker';
import { Badge } from '../components/ui/Badge';
import { StatusChip } from '../components/ui/StatusChip';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { EmptyState, ErrorState, LoadingState, MutationFeedback } from '../components/ui/States';
import { FormField } from '../components/ui/FormField';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { PageHeader } from '../components/ui/PageHeader';
import {
  createConsultation,
  createVisit,
  getVisitQueue,
  recordVitalSigns,
  updateVisitStatus,
  type ClinicVisit,
} from '../services/api';

type CheckInLocationState = { checkedInName?: string; checkedInVisitId?: string };

const vitalLimits = {
  temperatureC: { min: 20, max: 50, label: 'Temperature' },
  systolicBp: { min: 40, max: 300, label: 'Systolic BP' },
  diastolicBp: { min: 20, max: 200, label: 'Diastolic BP' },
  pulseRate: { min: 20, max: 250, label: 'Pulse rate' },
} as const;

type VitalValues = Record<keyof typeof vitalLimits, string>;

function validateVitals(values: VitalValues) {
  const errors: Partial<Record<keyof VitalValues, string>> = {};
  for (const [name, limit] of Object.entries(vitalLimits) as [keyof VitalValues, (typeof vitalLimits)[keyof VitalValues]][]) {
    const rawValue = values[name].trim();
    if (!rawValue) continue;
    const value = Number(rawValue);
    if (!Number.isFinite(value) || value < limit.min || value > limit.max) {
      errors[name] = `${limit.label} must be between ${limit.min} and ${limit.max}.`;
    }
  }
  const systolic = Number(values.systolicBp);
  const diastolic = Number(values.diastolicBp);
  if (
    values.systolicBp.trim() &&
    values.diastolicBp.trim() &&
    !errors.systolicBp &&
    !errors.diastolicBp &&
    systolic <= diastolic
  ) {
    errors.systolicBp = 'Systolic BP must be higher than diastolic BP.';
  }
  return errors;
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const message = (error as { response?: { data?: { message?: string | string[] } } })?.response
    ?.data?.message;
  return Array.isArray(message) ? message.join(' ') : message || fallback;
}

export function ClinicVisitsPage() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const [patientId, setPatientId] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [intakeNotes, setIntakeNotes] = useState('');
  const [selectedVisit, setSelectedVisit] = useState<string | null>(null);
  const [vitalsVisit, setVitalsVisit] = useState<string | null>(null);
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
  const emptyVitals: VitalValues = { temperatureC: '', systolicBp: '', diastolicBp: '', pulseRate: '' };
  const [vitals, setVitals] = useState(emptyVitals);
  const [arrivalNotice, setArrivalNotice] = useState<CheckInLocationState | null>(null);
  const [registrationNotice, setRegistrationNotice] = useState<string | null>(null);
  const [statusAction, setStatusAction] = useState<{ id: string; value: 'IN_CONSULTATION' | 'COMPLETED' } | null>(null);
  const vitalErrors = validateVitals(vitals);
  const hasVitalErrors = Object.keys(vitalErrors).length > 0;
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
    onSuccess: () => {
      setStatusAction(null);
      void queryClient.invalidateQueries({ queryKey: ['visit-queue'] });
    },
  });
  const saveVitals = useMutation({
    mutationFn: () => {
      const values = Object.entries(vitals)
        .filter(([, value]) => value.trim() !== '')
        .map(([name, value]) => [name, Number(value)]);
      return recordVitalSigns(vitalsVisit ?? '', Object.fromEntries(values));
    },
    onSuccess: () => {
      setVitalsVisit(null);
      setVitals(emptyVitals);
      void queryClient.invalidateQueries({ queryKey: ['visit-queue'] });
    },
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
  if (queue.isError) return <ErrorState message="Unable to load the clinic queue." onRetry={() => void queue.refetch()} retrying={queue.isFetching} />;

  const getCreateErrorMessage = (error: unknown) => {
    return getApiErrorMessage(error, 'Unable to register visit. Confirm the patient and try again.');
  };
  const getStatusErrorMessage = (error: unknown) => {
    return getApiErrorMessage(error, 'Unable to update the visit status. Try again.');
  };

  const handleVitalChange = (name: keyof VitalValues, value: string) => {
    saveVitals.reset();
    setVitals({ ...vitals, [name]: value });
  };

  const handleConsultationChange = (field: keyof typeof emptyConsultation, value: string) => {
    setConsultation({ ...consultation, [field]: value });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <MutationFeedback open={status.isSuccess} message="Visit status updated." onClose={() => status.reset()} />
      <MutationFeedback open={saveVitals.isSuccess} message="Vital signs saved." onClose={() => saveVitals.reset()} />
      <MutationFeedback open={saveConsultation.isSuccess} message="Progress note saved." onClose={() => saveConsultation.reset()} />
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
          <FormField
            size="small"
            label="Chief complaint"
            required
            value={chiefComplaint}
            onChange={(event) => setChiefComplaint(event.target.value)}
            placeholder="Reason for visit"
            disabled={create.isPending}
          />
          <FormField
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
        {status.isError && (
          <Alert severity="error" sx={{ mx: 2.5, mt: 2 }}>
            {getStatusErrorMessage(status.error)}
          </Alert>
        )}
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
                      <StatusChip state={visit.status === 'IN_CONSULTATION' ? 'IN_CONSULTATION' : 'WAITING'} />
                      {visit.status === 'OPEN' && (
                        <Button
                          variant="secondary"
                          disabled={status.isPending}
                          onClick={() => setStatusAction({ id: visit.id, value: 'IN_CONSULTATION' })}
                        >
                          Start
                        </Button>
                      )}
                      {visit.status === 'IN_CONSULTATION' && (
                        <>
                          <Button
                            variant="secondary"
                            disabled={status.isPending}
                            onClick={() =>
                              setVitalsVisit(vitalsVisit === visit.id ? null : visit.id)
                            }
                          >
                            Record vitals
                          </Button>
                          <Button
                            variant="secondary"
                            disabled={status.isPending}
                            onClick={() =>
                              setSelectedVisit(selectedVisit === visit.id ? null : visit.id)
                            }
                          >
                            Progress note
                          </Button>
                          <Button
                            disabled={status.isPending}
                            onClick={() => setStatusAction({ id: visit.id, value: 'COMPLETED' })}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Complete visit
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  {vitalsVisit === visit.id && (
                    <Box
                      component="form"
                      sx={{
                        mt: 2,
                        p: 2,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 2,
                        bgcolor: 'background.default',
                      }}
                      onSubmit={(event) => {
                        event.preventDefault();
                        if (hasVitalErrors) return;
                        saveVitals.mutate();
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        Vital signs
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Record at least one observation before completing this visit.
                      </Typography>
                      <Box
                        sx={{
                          mt: 1.5,
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
                          gap: 1.5,
                        }}
                      >
                        <FormField
                          size="small"
                          type="number"
                          label="Temperature °C"
                          slotProps={{ htmlInput: { min: '20', max: '50', step: '0.1' } }}
                          value={vitals.temperatureC}
                          error={vitalErrors.temperatureC}
                          helperText={vitalErrors.temperatureC}
                          onChange={(event) => handleVitalChange('temperatureC', event.target.value)}
                        />
                        <FormField
                          size="small"
                          type="number"
                          label="Systolic BP"
                          slotProps={{ htmlInput: { min: '40', max: '300', step: '1' } }}
                          value={vitals.systolicBp}
                          error={vitalErrors.systolicBp}
                          helperText={vitalErrors.systolicBp}
                          onChange={(event) => handleVitalChange('systolicBp', event.target.value)}
                        />
                        <FormField
                          size="small"
                          type="number"
                          label="Diastolic BP"
                          slotProps={{ htmlInput: { min: '20', max: '200', step: '1' } }}
                          value={vitals.diastolicBp}
                          error={vitalErrors.diastolicBp}
                          helperText={vitalErrors.diastolicBp}
                          onChange={(event) => handleVitalChange('diastolicBp', event.target.value)}
                        />
                        <FormField
                          size="small"
                          type="number"
                          label="Pulse rate"
                          slotProps={{ htmlInput: { min: '20', max: '250', step: '1' } }}
                          value={vitals.pulseRate}
                          error={vitalErrors.pulseRate}
                          helperText={vitalErrors.pulseRate}
                          onChange={(event) => handleVitalChange('pulseRate', event.target.value)}
                        />
                      </Box>
                      {saveVitals.isError && (
                        <Alert severity="error" sx={{ mt: 1.5 }}>
                          {getApiErrorMessage(
                            saveVitals.error,
                            'Unable to record vital signs. Check the values and try again.',
                          )}
                        </Alert>
                      )}
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1.5 }}>
                        <Button
                          type="submit"
                          disabled={
                            saveVitals.isPending ||
                            hasVitalErrors ||
                            !Object.values(vitals).some((value) => value.trim() !== '')
                          }
                        >
                          {saveVitals.isPending ? 'Saving...' : 'Save vitals'}
                        </Button>
                      </Box>
                    </Box>
                  )}
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
                        bgcolor: 'background.default',
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
                      <FormField
                        required
                        multiline
                        minRows={2}
                        size="small"
                        label="Cues / presenting signs and symptoms"
                        value={consultation.cues}
                        onChange={(event) => handleConsultationChange('cues', event.target.value)}
                      />
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                          gap: 1.5,
                        }}
                      >
                        <FormField
                          multiline
                          minRows={3}
                          size="small"
                          label="Nursing diagnosis"
                          value={consultation.nursingDiagnosis}
                          onChange={(event) => handleConsultationChange('nursingDiagnosis', event.target.value)}
                        />
                        <FormField
                          multiline
                          minRows={3}
                          size="small"
                          label="Nursing intervention"
                          value={consultation.nursingIntervention}
                          onChange={(event) => handleConsultationChange('nursingIntervention', event.target.value)}
                        />
                        <FormField
                          multiline
                          minRows={3}
                          size="small"
                          label="Medical diagnosis"
                          value={consultation.medicalDiagnosis}
                          onChange={(event) => handleConsultationChange('medicalDiagnosis', event.target.value)}
                        />
                        <FormField
                          multiline
                          minRows={3}
                          size="small"
                          label="Medical intervention"
                          value={consultation.medicalIntervention}
                          onChange={(event) => handleConsultationChange('medicalIntervention', event.target.value)}
                        />
                      </Box>
                      <FormField
                        multiline
                        minRows={2}
                        size="small"
                        label="Evaluation / outcome"
                        value={consultation.evaluation}
                        onChange={(event) => handleConsultationChange('evaluation', event.target.value)}
                      />
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                          gap: 1.5,
                        }}
                      >
                        <FormField
                          size="small"
                          label="Medicine (optional)"
                          value={consultation.medicineName}
                          onChange={(event) => handleConsultationChange('medicineName', event.target.value)}
                        />
                        <FormField
                          size="small"
                          label="Dosage"
                          value={consultation.dosage}
                          onChange={(event) => handleConsultationChange('dosage', event.target.value)}
                        />
                        <FormField
                          size="small"
                          label="Frequency"
                          value={consultation.frequency}
                          onChange={(event) => handleConsultationChange('frequency', event.target.value)}
                        />
                      </Box>
                      {saveConsultation.isError && (
                        <Alert severity="error">
                          Unable to save this progress note. Review the entry and try again.
                        </Alert>
                      )}
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button type="submit" disabled={saveConsultation.isPending}>
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
          <EmptyState title="No patients are waiting" description="Check in scheduled arrivals from Appointments, or register a walk-in using the form above." />
        )}
      </Card>
      <ConfirmDialog
        open={Boolean(statusAction)}
        onClose={() => setStatusAction(null)}
        onConfirm={() => statusAction && status.mutate(statusAction)}
        title={statusAction?.value === 'COMPLETED' ? 'Complete visit' : 'Start consultation'}
        description={statusAction
          ? statusAction.value === 'COMPLETED'
            ? 'Mark this visit as completed? The patient will be removed from the active queue.'
            : 'Start consultation for this patient?'
          : ''}
        confirmLabel={statusAction?.value === 'COMPLETED' ? 'Complete visit' : 'Start consultation'}
        variant={statusAction?.value === 'COMPLETED' ? 'danger' : 'primary'}
        isConfirmLoading={status.isPending}
      />
    </Box>
  );
}