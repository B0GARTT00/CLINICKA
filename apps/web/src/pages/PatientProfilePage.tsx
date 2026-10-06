import { useEffect, useState } from 'react';
import { ArrowLeft, CalendarPlus, ClipboardPlus, FilePlus2, Pencil, Save, ShieldAlert } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  MenuItem,
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
  updateMyPatientHealthRecord,
  updatePatient,
  type HealthRecordChecklist,
  type DatedClinicalEntry,
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
  doctorContact: '',
  hospitalOfChoice: '',
  hospitalContact: '',
  presentHistory: '',
  reviewOfSystems: '',
  pastMedicalHistory: {},
  familyHistory: {},
  psychosocialHistory: {},
  obGyneHistory: {},
  physicalExamination: { entries: [] },
  laboratoryExaminations: { entries: [] },
  formMetadata: {
    formFamily: 'PATIENT_HEALTH_RECORD',
    sourceForms: [
      { audience: 'HIGH_SCHOOL', formCode: 'FRM-HAW-02', sourceRevision: 'Rev. 01' },
      { audience: 'HIGH_SCHOOL_EXAMINATION', formCode: 'FRM-HAW-03', sourceRevision: 'Rev. 02' },
      { audience: 'COLLEGE_FACULTY_STAFF', formCode: 'COLLEGE-HEALTH-RECORD', sourceRevision: 'paper reference' },
    ],
    digitalRevision: '2026-10-06',
  },
};
function datedSection(value: PatientHealthRecordInput['physicalExamination']): { entries: DatedClinicalEntry[] } {
  if (value && 'entries' in value && Array.isArray(value.entries)) return { entries: value.entries };
  const legacy = (value || {}) as Record<string, string>;
  return Object.keys(legacy).length
    ? { entries: [{ id: 'legacy', recordedAt: '', values: legacy }] }
    : { entries: [] };
}
function editableRecord(record?: PatientHealthRecordInput | null): PatientHealthRecordInput {
  if (!record) return { ...emptyRecord };
  return {
    guardianName: record.guardianName || '',
    spouseName: record.spouseName || '',
    nationality: record.nationality || '',
    doctorOfChoice: record.doctorOfChoice || '',
    doctorContact: record.doctorContact || '',
    hospitalOfChoice: record.hospitalOfChoice || '',
    hospitalContact: record.hospitalContact || '',
    presentHistory: record.presentHistory || '',
    reviewOfSystems: record.reviewOfSystems || '',
    pastMedicalHistory: record.pastMedicalHistory || {},
    familyHistory: record.familyHistory || {},
    psychosocialHistory: record.psychosocialHistory || {},
    obGyneHistory: record.obGyneHistory || {},
    physicalExamination: datedSection(record.physicalExamination),
    laboratoryExaminations: datedSection(record.laboratoryExaminations),
    formMetadata: record.formMetadata || emptyRecord.formMetadata,
  };
}

function Checklist({
  items,
  value,
  onChange,
  relation = false,
  detailLabel,
}: {
  items: string[];
  value: HealthRecordChecklist;
  onChange: (value: HealthRecordChecklist) => void;
  relation?: boolean;
  detailLabel?: string;
}) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 1,
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
      }}
    >
      {items.map((item) => {
        const entry = value[item] || { answer: 'NOT_ANSWERED' as const };
        return <Box key={item} sx={{ p: 1.25, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>{item}</Typography>
          <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: relation ? '130px 1fr' : '130px 1fr' }}>
            <FormField select size="small" label="Answer" value={entry.answer || (entry.present ? 'YES' : 'NOT_ANSWERED')}
              onChange={(event) => onChange({ ...value, [item]: { ...entry, answer: event.target.value as typeof entry.answer, present: event.target.value === 'YES' } })}>
              <MenuItem value="NOT_ANSWERED">Not answered</MenuItem><MenuItem value="YES">Yes</MenuItem><MenuItem value="NO">No</MenuItem><MenuItem value="UNKNOWN">Unknown</MenuItem>
            </FormField>
            <FormField size="small" label={relation ? 'Affected relative' : 'Remarks'} value={(relation ? entry.relation : entry.remarks) || ''}
              onChange={(event) => onChange({ ...value, [item]: { ...entry, [relation ? 'relation' : 'remarks']: event.target.value } })} />
          </Box>
          {detailLabel && <FormField fullWidth size="small" sx={{ mt: 1 }} label={detailLabel} value={entry.details?.notes || ''}
            onChange={(event) => onChange({ ...value, [item]: { ...entry, details: { ...(entry.details || {}), notes: event.target.value } } })} />}
        </Box>;
      })}
    </Box>
  );
}

function DatedEntriesEditor({ items, entries, onChange, kind }: { items: string[]; entries: DatedClinicalEntry[]; onChange: (entries: DatedClinicalEntry[]) => void; kind: string }) {
  const add = () => onChange([...entries, { id: crypto.randomUUID(), recordedAt: new Date().toISOString().slice(0, 10), values: {} }]);
  return <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
    {entries.map((entry, index) => <Card key={entry.id} title={`${kind} ${index + 1}`} description="A dated entry is retained as part of the longitudinal record.">
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}><FormField type="date" shrinkLabel size="small" label="Recorded date" value={entry.recordedAt.slice(0, 10)} onChange={(e) => onChange(entries.map((x) => x.id === entry.id ? { ...x, recordedAt: e.target.value } : x))} />
        <Button type="button" variant="secondary" onClick={() => onChange(entries.filter((x) => x.id !== entry.id))}>Remove</Button></Box>
        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } }}>
          {items.map((item) => <FormField key={item} size="small" label={item} value={entry.values[item] || ''} onChange={(e) => onChange(entries.map((x) => x.id === entry.id ? { ...x, values: { ...x.values, [item]: e.target.value } } : x))} />)}
        </Box>
      </Box>
    </Card>)}
    {!entries.length && <Alert severity="info">No dated {kind.toLowerCase()} entries recorded.</Alert>}
    <Box><Button type="button" variant="secondary" onClick={add}>Add dated {kind.toLowerCase()}</Button></Box>
  </Box>;
}

export function RecordEditor({
  patientId,
  initial,
  onClose,
  selfService = false,
}: {
  patientId?: string;
  initial?: PatientHealthRecordInput | null;
  onClose: () => void;
  selfService?: boolean;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<PatientHealthRecordInput>(emptyRecord);
  const [section, setSection] = useState<'history' | 'exam' | 'labs'>(selfService ? 'history' : 'exam');
  useEffect(() => setForm(editableRecord(initial)), [initial]);
  const save = useMutation({
    mutationFn: () => selfService ? updateMyPatientHealthRecord(form) : updatePatientHealthRecord(patientId!, form),
    onSuccess: async () => {
      if (selfService) await queryClient.invalidateQueries({ queryKey: ['my-patient-profile'] });
      else await queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      onClose();
    },
  });
  const setText = (key: keyof PatientHealthRecordInput, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
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
        {selfService && <Tab value="history" label="History" />}
        {!selfService && <Tab value="exam" label="Exam" />}
        {!selfService && <Tab value="labs" label="Laboratory" />}
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
                  ['doctorContact', 'Doctor contact number'],
                  ['hospitalOfChoice', 'Hospital for referral'],
                  ['hospitalContact', 'Hospital contact number'],
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
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>OB-GYN history (restricted clinical information)</Typography>
              <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' } }}>
                {[['menarcheAge','Menarche age','number'],['lastMenstrualPeriod','Last menstrual period','date'],['cycle','Cycle','text'],['flow','Flow','text'],['gravida','Gravida','number'],['para','Para','number'],['abortions','Abortions','number'],['previousDeliveryDate','Previous delivery','date'],['papSmearDate','Pap smear date','date'],['otherConcerns','Other concerns','text']].map(([key,label,type]) => <FormField key={key} size="small" type={type} shrinkLabel={type === 'date'} label={label} value={String(form.obGyneHistory?.[key] || '')} onChange={(e) => setForm({ ...form, obGyneHistory: { ...(form.obGyneHistory || {}), [key]: e.target.value } })} />)}
              </Box>
            </Box>
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
                relation
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
                detailLabel="Conditional details (amount, frequency, type, since when, licence status, or safeguarding notes)"
                onChange={(value) => setForm({ ...form, psychosocialHistory: value })}
              />
            </Box>
          </>
        )}
        {section === 'exam' && <DatedEntriesEditor kind="Physical examination" items={['Weight', 'Height', 'Blood pressure', 'Pulse rate', 'Temperature', ...examItems]} entries={datedSection(form.physicalExamination).entries} onChange={(entries) => setForm({ ...form, physicalExamination: { entries } })} />}
        {section === 'labs' && <DatedEntriesEditor kind="Laboratory examination" items={labItems} entries={datedSection(form.laboratoryExaminations).entries} onChange={(entries) => setForm({ ...form, laboratoryExaminations: { entries } })} />}
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
          {selfService ? 'Submit health history' : 'Save health record'}
        </Button>
      </Box>
    </Box>
  );
}

export function PatientProfilePage() {
  const { id = '' } = useParams();
  const [editing, setEditing] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: '', middleName: '', lastName: '', email: '', phone: '', landline: '', address: '', sex: '',
    institutionalId: '', programDepartment: '', yearLevel: '',
  });
  const queryClient = useQueryClient();
  const patient = useQuery({
    queryKey: ['patient', id],
    queryFn: () => getPatient(id),
    enabled: Boolean(id),
  });
  const saveProfile = useMutation({
    mutationFn: () => {
      const current = patient.data;
      if (!current) throw new Error('Patient profile is not available.');
      return updatePatient(id, {
        firstName: profileForm.firstName,
        middleName: profileForm.middleName || undefined,
        lastName: profileForm.lastName,
        email: profileForm.email || undefined,
        phone: profileForm.phone || undefined,
        landline: profileForm.landline || undefined,
        address: profileForm.address || undefined,
        sex: profileForm.sex || undefined,
        studentId: current.type === 'STUDENT' ? profileForm.institutionalId || undefined : undefined,
        employeeId: current.type !== 'STUDENT' ? profileForm.institutionalId || undefined : undefined,
        program: current.type === 'STUDENT' ? profileForm.programDepartment || undefined : undefined,
        department: current.type !== 'STUDENT' ? profileForm.programDepartment || undefined : undefined,
        yearLevel: current.type === 'STUDENT' && profileForm.yearLevel ? Number(profileForm.yearLevel) : undefined,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['patient', id] });
      await queryClient.invalidateQueries({ queryKey: ['patients'] });
      setEditingProfile(false);
    },
  });
  if (patient.isLoading) return <LoadingState label="Loading patient profile..." />;
  if (patient.isError || !patient.data)
    return <ErrorState message="Unable to load this patient profile." />;
  const record = patient.data;
  const openProfileEditor = () => {
    setProfileForm({
      firstName: record.firstName,
      middleName: record.middleName || '',
      lastName: record.lastName,
      email: record.email || '',
      phone: record.phone || '',
      landline: record.landline || '',
      address: record.address || '',
      sex: record.sex || '',
      institutionalId: record.studentProfile?.studentId || record.employeeProfile?.employeeId || '',
      programDepartment: record.studentProfile?.program || record.employeeProfile?.department || '',
      yearLevel: record.studentProfile?.yearLevel ? String(record.studentProfile.yearLevel) : '',
    });
    setEditingProfile(true);
  };
  const archived = Boolean(record.deletedAt || record.archiveStatus === 'ARCHIVED');
  const missingProfileFields = [
    !record.email && 'email',
    !record.phone && !record.landline && 'contact number',
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
  const healthServiceEntries = [
    ...(record.vaccinations || []).map((item) => ({ id: `vaccination-${item.id}`, date: item.receivedAt, title: `${item.vaccineName} · ${item.dose}`, detail: 'Vaccination history' })),
    ...(record.screenings || []).map((item) => ({ id: `screening-${item.id}`, date: item.screenedAt, title: item.screeningType, detail: `Screening · ${item.result}` })),
    ...(record.dentalRecords || []).map((item) => ({ id: `dental-${item.id}`, date: item.examinedAt, title: 'Dental examination', detail: item.oralCondition?.replaceAll('_', ' ') || item.recommendation?.replaceAll('_', ' ') || 'Dental record' })),
    ...(record.certificates || []).map((item) => ({ id: `certificate-${item.id}`, date: item.issuedAt, title: item.purpose, detail: item.type.replaceAll('_', ' ') })),
    ...(record.clearances || []).map((item) => ({ id: `clearance-${item.id}`, date: item.createdAt, title: `${item.type.replaceAll('_', ' ')} clearance`, detail: item.status.replaceAll('_', ' ') })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
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
          <Button variant="secondary" onClick={openProfileEditor} disabled={archived}>
            <Pencil className="h-4 w-4" />
            Edit patient information
          </Button>
          <Button onClick={() => setEditing(true)} disabled={archived}>
            <ClipboardPlus className="h-4 w-4" />
            Add examination results
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
                  Mobile: {record.phone || 'Not recorded'} · Landline: {record.landline || 'Not recorded'}
                </dd>
              </div>
            </dl>
          </Card>
          <Card
            title="Health history"
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
          <Card title="Recorded health services" description="Automatically populated from Health Records forms">
            {healthServiceEntries.length ? (
              <div className="divide-y divide-medical-100">
                {healthServiceEntries.map((item) => (
                  <div className="flex items-center justify-between gap-4 px-5 py-4" key={item.id}>
                    <div>
                      <p className="text-[13px] font-semibold text-medical-800">{item.title}</p>
                      <p className="mt-1 text-[11px] capitalize text-medical-500">{item.detail.toLowerCase()}</p>
                    </div>
                    <p className="shrink-0 text-[11px] text-medical-500">{new Date(item.date).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="p-5 text-[13px] text-medical-500">No health-service records yet.</p>
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
        open={editingProfile}
        onClose={() => setEditingProfile(false)}
        title="Edit patient information"
        description="Update official identity, contact, and institutional details. The patient manages their own health-history answers."
        maxWidth="lg"
      >
        <Box component="form" onSubmit={(event) => { event.preventDefault(); saveProfile.mutate(); }} sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } }}>
            <FormField required size="small" label="First name" value={profileForm.firstName} onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })} />
            <FormField size="small" label="Middle name" value={profileForm.middleName} onChange={(e) => setProfileForm({ ...profileForm, middleName: e.target.value })} />
            <FormField required size="small" label="Last name" value={profileForm.lastName} onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })} />
            <FormField size="small" type="email" label="Institutional email" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} />
            <FormField size="small" label="Mobile number" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} />
            <FormField size="small" label="Landline number" value={profileForm.landline} onChange={(e) => setProfileForm({ ...profileForm, landline: e.target.value })} />
            <FormField size="small" label="Address" value={profileForm.address} onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })} />
            <FormField select size="small" label="Sex" value={profileForm.sex} onChange={(e) => setProfileForm({ ...profileForm, sex: e.target.value })}><MenuItem value="">Not recorded</MenuItem><MenuItem value="MALE">Male</MenuItem><MenuItem value="FEMALE">Female</MenuItem><MenuItem value="OTHER">Other</MenuItem><MenuItem value="PREFER_NOT_TO_SAY">Prefer not to say</MenuItem></FormField>
            <FormField size="small" label={record.type === 'STUDENT' ? 'Student ID' : 'Employee ID'} value={profileForm.institutionalId} onChange={(e) => setProfileForm({ ...profileForm, institutionalId: e.target.value })} />
            <FormField size="small" label={record.type === 'STUDENT' ? 'Program' : 'Department'} value={profileForm.programDepartment} onChange={(e) => setProfileForm({ ...profileForm, programDepartment: e.target.value })} />
            {record.type === 'STUDENT' && <FormField size="small" type="number" label="Year level" value={profileForm.yearLevel} onChange={(e) => setProfileForm({ ...profileForm, yearLevel: e.target.value })} />}
          </Box>
          {saveProfile.isError && <Alert severity="error">Unable to save the patient information. Check the values and try again.</Alert>}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}><Button type="button" variant="secondary" onClick={() => setEditingProfile(false)}>Cancel</Button><Button loading={saveProfile.isPending}><Save className="h-4 w-4" />Save changes</Button></Box>
        </Box>
      </Modal>
      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="Clinical examination results"
        description="Add physical-examination and laboratory entries. Personal history is completed by the patient."
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
