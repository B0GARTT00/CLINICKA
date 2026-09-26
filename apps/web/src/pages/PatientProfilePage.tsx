import { useEffect, useState } from 'react';
import { ArrowLeft, CalendarPlus, ClipboardPlus, FilePlus2, Save, ShieldAlert } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Checkbox,
  FormControlLabel,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { Badge } from '../components/ui/Badge';
import { StatusChip } from '../components/ui/StatusChip';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ErrorState, LoadingState } from '../components/ui/States';
import { FormField } from '../components/ui/FormField';
import { Modal } from '../components/ui/Modal';
import {
  getPatient,
  updatePatientHealthRecord,
  type HealthRecordChecklist,
  type PatientHealthRecordInput,
} from '../services/api';

const medicalConditions = [
  'Allergy',
  'Asthma',
  'Anemia',
  'Fainting',
  'Behavioral problem',
  'Hearing problem',
  'Pneumonia',
  'Scoliosis',
  'Fractures',
  'Hospitalization',
  'Operation',
  'Chicken pox',
  'Dysmenorrhea',
  'Epilepsy',
  'Measles',
  'Primary complex',
  'Ear discharge',
  'Mumps',
  'Diabetes',
  'Tonsillitis',
  'Hypertension',
  'Insomnia',
  'Heart disease',
  'Kidney disease',
  'Dengue fever',
  'Typhoid fever',
  'Migraine',
  'Bleeding problem',
  'Speech problem',
  'Eating disorder',
  'Jaundice',
  'Visual problem',
  'Others',
];
const familyConditions = [
  'Cancer',
  'Heart problem',
  'High blood pressure',
  'Diabetes',
  'Kidney problem',
  'Seizure disorder',
  'Autoimmune disorder',
  'Tuberculosis',
  'Asthma',
  'Bleeding tendencies',
  'Mental disorders',
  'Stroke',
  'Hyperlipidemia',
  'Alcoholism',
];
const psychosocialItems = [
  'Drinking',
  'Smoking',
  'Drug use',
  'Driving',
  'Physical abuse',
  'Sexual abuse',
  'Verbal abuse',
];
const examItems = [
  'Skin',
  'Head',
  'Eyes / visual acuity',
  'Ears / hearing',
  'Nose',
  'Throat',
  'Mouth / tongue',
  'Teeth / gums',
  'Neck',
  'Chest / lungs',
  'Breasts',
  'Heart',
  'Abdomen',
  'Testicular exam',
  'Rectal exam',
  'Extremities',
];
const labItems = [
  'CBC',
  'Urinalysis',
  'Fecalysis',
  'Chest X-ray',
  'Hepatitis B antigen',
  'Hepatitis B antibody',
  'Occult blood',
  'PSA',
  'Mammogram',
  'Pap test',
  'Fasting blood sugar',
  'Creatinine',
  'Uric acid',
  'Cholesterol',
  'ECG',
];
const emptyRecord: PatientHealthRecordInput = {
  guardianName: '',
  spouseName: '',
  nationality: '',
  doctorOfChoice: '',
  hospitalOfChoice: '',
  presentHistory: '',
  reviewOfSystems: '',
  pastMedicalHistory: {},
  familyHistory: {},
  psychosocialHistory: {},
  obGyneHistory: {},
  physicalExamination: {},
  laboratoryExaminations: {},
};
function editableRecord(record?: PatientHealthRecordInput | null): PatientHealthRecordInput {
  if (!record) return { ...emptyRecord };
  return {
    guardianName: record.guardianName || '',
    spouseName: record.spouseName || '',
    nationality: record.nationality || '',
    doctorOfChoice: record.doctorOfChoice || '',
    hospitalOfChoice: record.hospitalOfChoice || '',
    presentHistory: record.presentHistory || '',
    reviewOfSystems: record.reviewOfSystems || '',
    pastMedicalHistory: record.pastMedicalHistory || {},
    familyHistory: record.familyHistory || {},
    psychosocialHistory: record.psychosocialHistory || {},
    obGyneHistory: record.obGyneHistory || {},
    physicalExamination: record.physicalExamination || {},
    laboratoryExaminations: record.laboratoryExaminations || {},
  };
}

function Checklist({
  items,
  value,
  onChange,
}: {
  items: string[];
  value: HealthRecordChecklist;
  onChange: (value: HealthRecordChecklist) => void;
}) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 1,
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
      }}
    >
      {items.map((item) => (
        <FormControlLabel
          key={item}
          sx={{ m: 0, px: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}
          control={
            <Checkbox
              size="small"
              checked={Boolean(value[item]?.present)}
              onChange={(event) =>
                onChange({ ...value, [item]: { ...value[item], present: event.target.checked } })
              }
            />
          }
          label={<Typography variant="body2">{item}</Typography>}
        />
      ))}
    </Box>
  );
}

function RecordEditor({
  patientId,
  initial,
  onClose,
}: {
  patientId: string;
  initial?: PatientHealthRecordInput | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<PatientHealthRecordInput>(emptyRecord);
  const [section, setSection] = useState<'history' | 'exam' | 'labs'>('history');
  useEffect(() => setForm(editableRecord(initial)), [initial]);
  const save = useMutation({
    mutationFn: () => updatePatientHealthRecord(patientId, form),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      onClose();
    },
  });
  const setText = (key: keyof PatientHealthRecordInput, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const setMap = (
    key: 'physicalExamination' | 'laboratoryExaminations',
    item: string,
    value: string,
  ) => setForm((current) => ({ ...current, [key]: { ...(current[key] || {}), [item]: value } }));
  return (
    <Box
      component="form"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      <Tabs
        value={section}
        onChange={(_, value: 'history' | 'exam' | 'labs') => setSection(value)}
        sx={{ px: 2.5, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab value="history" label="History" />
        <Tab value="exam" label="Exam" />
        <Tab value="labs" label="Laboratory" />
      </Tabs>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, p: 3 }}>
        {section === 'history' && (
          <>
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
              }}
            >
              {(
                [
                  ['guardianName', 'Parent / guardian'],
                  ['spouseName', 'Spouse'],
                  ['nationality', 'Nationality'],
                  ['doctorOfChoice', 'Doctor for referral'],
                  ['hospitalOfChoice', 'Hospital for referral'],
                ] as const
              ).map(([key, label]) => (
                <FormField
                  key={key}
                  fullWidth
                  size="small"
                  label={label}
                  value={(form[key] as string) || ''}
                  onChange={(e) => setText(key, e.target.value)}
                />
              ))}
            </Box>
            <FormField
              fullWidth
              multiline
              minRows={3}
              label="Present pertinent history"
              value={form.presentHistory || ''}
              onChange={(e) => setText('presentHistory', e.target.value)}
            />
            <FormField
              fullWidth
              multiline
              minRows={3}
              label="Review of systems"
              value={form.reviewOfSystems || ''}
              onChange={(e) => setText('reviewOfSystems', e.target.value)}
            />
            <FormField
              fullWidth
              multiline
              minRows={3}
              label="OB-GYN history (when applicable)"
              placeholder="Menarche, cycle, flow, parity, LMP, Pap smear, and other concerns"
              value={String(form.obGyneHistory?.notes || '')}
              onChange={(e) =>
                setForm({
                  ...form,
                  obGyneHistory: { ...(form.obGyneHistory || {}), notes: e.target.value },
                })
              }
            />
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                Past medical history
              </Typography>
              <Checklist
                items={medicalConditions}
                value={form.pastMedicalHistory || {}}
                onChange={(value) => setForm({ ...form, pastMedicalHistory: value })}
              />
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                Family history
              </Typography>
              <Checklist
                items={familyConditions}
                value={form.familyHistory || {}}
                onChange={(value) => setForm({ ...form, familyHistory: value })}
              />
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                Psychosocial history
              </Typography>
              <Checklist
                items={psychosocialItems}
                value={form.psychosocialHistory || {}}
                onChange={(value) => setForm({ ...form, psychosocialHistory: value })}
              />
            </Box>
          </>
        )}
        {section === 'exam' && (
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
            }}
          >
            {examItems.map((item) => (
              <FormField
                key={item}
                fullWidth
                size="small"
                label={item}
                placeholder="Finding / remarks"
                value={String(form.physicalExamination?.[item] || '')}
                onChange={(e) => setMap('physicalExamination', item, e.target.value)}
              />
            ))}
          </Box>
        )}
        {section === 'labs' && (
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
            }}
          >
            {labItems.map((item) => (
              <FormField
                key={item}
                fullWidth
                size="small"
                label={item}
                placeholder="Result / date / remarks"
                value={String(form.laboratoryExaminations?.[item] || '')}
                onChange={(e) => setMap('laboratoryExaminations', item, e.target.value)}
              />
            ))}
          </Box>
        )}
        {save.isError && (
          <Alert severity="error">
            The health record could not be saved. Please review the entries and try again.
          </Alert>
        )}
      </Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 1,
          px: 3,
          py: 2,
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending}>
          <Save className="h-4 w-4" />
          Save health record
        </Button>
      </Box>
    </Box>
  );
}

export function PatientProfilePage() {
  const { id = '' } = useParams();
  const [editing, setEditing] = useState(false);
  const patient = useQuery({
    queryKey: ['patient', id],
    queryFn: () => getPatient(id),
    enabled: Boolean(id),
  });
  if (patient.isLoading) return <LoadingState label="Loading patient profile..." />;
  if (patient.isError || !patient.data)
    return <ErrorState message="Unable to load this patient profile." />;
  const record = patient.data;
  const archived = Boolean(record.deletedAt || record.archiveStatus === 'ARCHIVED');
  const missingProfileFields = [
    !record.email && 'email',
    !record.phone && 'phone',
    !record.address && 'address',
    !record.sex && 'sex',
    !(record.studentProfile?.studentId || record.employeeProfile?.employeeId) && (record.type === 'STUDENT' ? 'student ID' : 'employee ID'),
    !(record.studentProfile?.program || record.employeeProfile?.department) && (record.type === 'STUDENT' ? 'program' : 'department'),
    !record.emergencyContacts?.length && 'emergency contact',
    !record.healthRecord && 'health record',
  ].filter(Boolean) as string[];
  const fullName = [record.firstName, record.middleName, record.lastName].filter(Boolean).join(' ');
  const selectedHistory = Object.entries(record.healthRecord?.pastMedicalHistory || {})
    .filter(([, answer]) => answer.present)
    .map(([name]) => name);
  return (
    <div className="space-y-6">
      <Link
        to="/patients"
        className="inline-flex items-center gap-2 text-[12px] font-semibold text-medical-500 hover:text-brokenshire-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Patients
      </Link>
      <header className="flex flex-col gap-4 border-b border-medical-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-brokenshire-600">
              Patient profile
            </p>
            <StatusChip state={archived ? 'ARCHIVED' : 'ACTIVE'} />
          </div>
          <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-medical-900">
            {fullName}
          </h1>
          <p className="mt-1 text-[13px] text-medical-500">
            {record.patientNumber} <span className="mx-2 text-medical-300">•</span>{' '}
            {record.studentProfile?.program || record.employeeProfile?.department || record.type}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setEditing(true)} disabled={archived}>
            <ClipboardPlus className="h-4 w-4" />
            Health record
          </Button>
          <Button variant="secondary" disabled={archived}>
            <CalendarPlus className="h-4 w-4" />
            New visit
          </Button>
          <Button variant="secondary" disabled={archived}>
            <FilePlus2 className="h-4 w-4" />
            Certificate
          </Button>
        </div>
      </header>
      {archived && <Alert severity="warning">This patient is archived and cannot be selected for active care. Restore the record from Patient Management to resume care.</Alert>}
      {!archived && missingProfileFields.length > 0 && <Alert severity="warning">Profile incomplete: add {missingProfileFields.join(', ')}.</Alert>}
      <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-5">
          <Card title="Patient information" description="Identity and contact details">
            <dl className="grid gap-x-6 gap-y-5 p-5 sm:grid-cols-2">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-widest text-medical-400">
                  Patient type
                </dt>
                <dd className="mt-1 text-[13px] font-medium text-medical-800">{record.type}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-widest text-medical-400">
                  Patient ID
                </dt>
                <dd className="mt-1 text-[13px] font-medium text-medical-800">
                  {record.patientNumber}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-widest text-medical-400">
                  Email
                </dt>
                <dd className="mt-1 text-[13px] text-medical-700">
                  {record.email || 'Not recorded'}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-widest text-medical-400">
                  Phone
                </dt>
                <dd className="mt-1 text-[13px] text-medical-700">
                  {record.phone || 'Not recorded'}
                </dd>
              </div>
            </dl>
          </Card>
          <Card
            title="Paper health record"
            description={
              record.healthRecord
                ? `Last updated ${new Date(record.healthRecord.updatedAt).toLocaleDateString()}`
                : 'Not started'
            }
          >
            <div className="p-5">
              {selectedHistory.length ? (
                <div className="flex flex-wrap gap-2">
                  {selectedHistory.map((item) => (
                    <Badge key={item}>{item}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-medical-500">
                  No medical-history findings recorded.
                </p>
              )}
              {record.healthRecord?.presentHistory && (
                <div className="mt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-medical-400">
                    Present history
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-[13px] text-medical-700">
                    {record.healthRecord.presentHistory}
                  </p>
                </div>
              )}
            </div>
          </Card>
          <Card title="Recent consultations" description="Clinical history summary">
            {record.visits?.length ? (
              <div className="divide-y divide-medical-100">
                {record.visits.slice(0, 5).map((visit) => (
                  <div className="flex items-center justify-between px-5 py-4" key={visit.id}>
                    <div>
                      <p className="text-[13px] font-semibold text-medical-800">
                        {visit.chiefComplaint || 'Clinic visit'}
                      </p>
                      <p className="mt-1 text-[11px] text-medical-500">
                        {new Date(visit.visitDate).toLocaleDateString()} · {visit.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="p-5 text-[13px] text-medical-500">No consultations recorded.</p>
            )}
          </Card>
        </div>
        <div className="space-y-5">
          <Card title="Allergies" description="Review before treatment">
            {record.allergies?.filter((allergy) => allergy.isActive).length ? (
              <div className="space-y-3 p-5">
                {record.allergies
                  .filter((allergy) => allergy.isActive)
                  .map((allergy) => (
                    <div
                      key={allergy.id}
                      className="flex gap-3 rounded-xl border border-danger-100 bg-danger-50 p-3"
                    >
                      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-danger-600" />
                      <div>
                        <p className="text-[13px] font-semibold text-danger-700">
                          {allergy.allergen}
                        </p>
                        <p className="mt-0.5 text-[11px] text-danger-700/80">
                          {allergy.reaction || 'Reaction not specified'}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="p-5 text-[13px] text-medical-500">No active allergies recorded.</p>
            )}
          </Card>
          <Card title="Emergency contacts">
            {record.emergencyContacts?.length ? (
              <div className="divide-y divide-medical-100">
                {record.emergencyContacts.map((contact) => (
                  <div className="px-5 py-3" key={contact.id}>
                    <p className="text-[13px] font-medium text-medical-800">{contact.name}</p>
                    <p className="text-[11px] text-medical-500">
                      {contact.relationship} · {contact.phone}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="p-5 text-[13px] text-medical-500">No emergency contacts recorded.</p>
            )}
          </Card>
        </div>
      </div>
      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="Patient health record"
        description="Digital version of the Brokenshire paper health record."
        maxWidth="xl"
      >
        <RecordEditor
          patientId={id}
          initial={record.healthRecord}
          onClose={() => setEditing(false)}
        />
      </Modal>
    </div>
  );
}