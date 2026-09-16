import { useEffect, useState } from 'react';
import { ArrowLeft, CalendarPlus, ClipboardPlus, FilePlus2, Save, ShieldAlert } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ErrorState, LoadingState } from '../components/ui/States';
import { Modal } from '../components/ui/Modal';
import { getPatient, updatePatientHealthRecord, type HealthRecordChecklist, type PatientHealthRecordInput } from '../services/api';

const medicalConditions = ['Allergy', 'Asthma', 'Anemia', 'Fainting', 'Behavioral problem', 'Hearing problem', 'Pneumonia', 'Scoliosis', 'Fractures', 'Hospitalization', 'Operation', 'Chicken pox', 'Dysmenorrhea', 'Epilepsy', 'Measles', 'Primary complex', 'Ear discharge', 'Mumps', 'Diabetes', 'Tonsillitis', 'Hypertension', 'Insomnia', 'Heart disease', 'Kidney disease', 'Dengue fever', 'Typhoid fever', 'Migraine', 'Bleeding problem', 'Speech problem', 'Eating disorder', 'Jaundice', 'Visual problem', 'Others'];
const familyConditions = ['Cancer', 'Heart problem', 'High blood pressure', 'Diabetes', 'Kidney problem', 'Seizure disorder', 'Autoimmune disorder', 'Tuberculosis', 'Asthma', 'Bleeding tendencies', 'Mental disorders', 'Stroke', 'Hyperlipidemia', 'Alcoholism'];
const psychosocialItems = ['Drinking', 'Smoking', 'Drug use', 'Driving', 'Physical abuse', 'Sexual abuse', 'Verbal abuse'];
const examItems = ['Skin', 'Head', 'Eyes / visual acuity', 'Ears / hearing', 'Nose', 'Throat', 'Mouth / tongue', 'Teeth / gums', 'Neck', 'Chest / lungs', 'Breasts', 'Heart', 'Abdomen', 'Testicular exam', 'Rectal exam', 'Extremities'];
const labItems = ['CBC', 'Urinalysis', 'Fecalysis', 'Chest X-ray', 'Hepatitis B antigen', 'Hepatitis B antibody', 'Occult blood', 'PSA', 'Mammogram', 'Pap test', 'Fasting blood sugar', 'Creatinine', 'Uric acid', 'Cholesterol', 'ECG'];
const emptyRecord: PatientHealthRecordInput = { guardianName: '', spouseName: '', nationality: '', doctorOfChoice: '', hospitalOfChoice: '', presentHistory: '', reviewOfSystems: '', pastMedicalHistory: {}, familyHistory: {}, psychosocialHistory: {}, obGyneHistory: {}, physicalExamination: {}, laboratoryExaminations: {} };
const fieldClass = 'mt-1 w-full rounded-xl border border-medical-200 bg-white px-3 py-2 text-[13px] text-medical-800 outline-none focus:border-brokenshire-500 focus:ring-2 focus:ring-brokenshire-100';

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

function Checklist({ items, value, onChange }: { items: string[]; value: HealthRecordChecklist; onChange: (value: HealthRecordChecklist) => void }) {
  return <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{items.map((item) => <label key={item} className="flex items-center gap-2 rounded-lg border border-medical-100 px-3 py-2 text-[12px] text-medical-700"><input type="checkbox" checked={Boolean(value[item]?.present)} onChange={(event) => onChange({ ...value, [item]: { ...value[item], present: event.target.checked } })} className="h-4 w-4 accent-brokenshire-600" />{item}</label>)}</div>;
}

function RecordEditor({ patientId, initial, onClose }: { patientId: string; initial?: PatientHealthRecordInput | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<PatientHealthRecordInput>(emptyRecord);
  const [section, setSection] = useState<'history' | 'exam' | 'labs'>('history');
  useEffect(() => setForm(editableRecord(initial)), [initial]);
  const save = useMutation({ mutationFn: () => updatePatientHealthRecord(patientId, form), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['patient', patientId] }); onClose(); } });
  const setText = (key: keyof PatientHealthRecordInput, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const setMap = (key: 'physicalExamination' | 'laboratoryExaminations', item: string, value: string) => setForm((current) => ({ ...current, [key]: { ...(current[key] || {}), [item]: value } }));
  return <form onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
    <div className="flex gap-2 border-b border-medical-100 px-6 py-3">{(['history', 'exam', 'labs'] as const).map((tab) => <button type="button" key={tab} onClick={() => setSection(tab)} className={`rounded-lg px-3 py-2 text-[12px] font-semibold capitalize ${section === tab ? 'bg-brokenshire-50 text-brokenshire-700' : 'text-medical-500'}`}>{tab === 'labs' ? 'Laboratory' : tab}</button>)}</div>
    <div className="space-y-6 p-6">
      {section === 'history' && <><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{([['guardianName', 'Parent / guardian'], ['spouseName', 'Spouse'], ['nationality', 'Nationality'], ['doctorOfChoice', 'Doctor for referral'], ['hospitalOfChoice', 'Hospital for referral']] as const).map(([key, label]) => <label key={key} className="text-[11px] font-semibold uppercase tracking-wide text-medical-500">{label}<input className={fieldClass} value={(form[key] as string) || ''} onChange={(e) => setText(key, e.target.value)} /></label>)}</div><label className="block text-[11px] font-semibold uppercase tracking-wide text-medical-500">Present pertinent history<textarea rows={3} className={fieldClass} value={form.presentHistory || ''} onChange={(e) => setText('presentHistory', e.target.value)} /></label><label className="block text-[11px] font-semibold uppercase tracking-wide text-medical-500">Review of systems<textarea rows={3} className={fieldClass} value={form.reviewOfSystems || ''} onChange={(e) => setText('reviewOfSystems', e.target.value)} /></label><label className="block text-[11px] font-semibold uppercase tracking-wide text-medical-500">OB-GYN history (when applicable)<textarea rows={3} placeholder="Menarche, cycle, flow, parity, LMP, Pap smear, and other concerns" className={fieldClass} value={String(form.obGyneHistory?.notes || '')} onChange={(e) => setForm({ ...form, obGyneHistory: { ...(form.obGyneHistory || {}), notes: e.target.value } })} /></label><div><h3 className="mb-3 text-sm font-semibold text-medical-800">Past medical history</h3><Checklist items={medicalConditions} value={form.pastMedicalHistory || {}} onChange={(value) => setForm({ ...form, pastMedicalHistory: value })} /></div><div><h3 className="mb-3 text-sm font-semibold text-medical-800">Family history</h3><Checklist items={familyConditions} value={form.familyHistory || {}} onChange={(value) => setForm({ ...form, familyHistory: value })} /></div><div><h3 className="mb-3 text-sm font-semibold text-medical-800">Psychosocial history</h3><Checklist items={psychosocialItems} value={form.psychosocialHistory || {}} onChange={(value) => setForm({ ...form, psychosocialHistory: value })} /></div></>}
      {section === 'exam' && <div className="grid gap-4 sm:grid-cols-2">{examItems.map((item) => <label key={item} className="text-[11px] font-semibold uppercase tracking-wide text-medical-500">{item}<input placeholder="Finding / remarks" className={fieldClass} value={String(form.physicalExamination?.[item] || '')} onChange={(e) => setMap('physicalExamination', item, e.target.value)} /></label>)}</div>}
      {section === 'labs' && <div className="grid gap-4 sm:grid-cols-2">{labItems.map((item) => <label key={item} className="text-[11px] font-semibold uppercase tracking-wide text-medical-500">{item}<input placeholder="Result / date / remarks" className={fieldClass} value={String(form.laboratoryExaminations?.[item] || '')} onChange={(e) => setMap('laboratoryExaminations', item, e.target.value)} /></label>)}</div>}
      {save.isError && <p className="text-[12px] text-danger-600">The health record could not be saved. Please review the entries and try again.</p>}
    </div><div className="flex justify-end gap-2 border-t border-medical-100 px-6 py-4"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={save.isPending}><Save className="h-4 w-4" />Save health record</Button></div>
  </form>;
}

export function PatientProfilePage() {
  const { id = '' } = useParams();
  const [editing, setEditing] = useState(false);
  const patient = useQuery({ queryKey: ['patient', id], queryFn: () => getPatient(id), enabled: Boolean(id) });
  if (patient.isLoading) return <LoadingState label="Loading patient profile..." />;
  if (patient.isError || !patient.data) return <ErrorState message="Unable to load this patient profile." />;
  const record = patient.data;
  const fullName = [record.firstName, record.middleName, record.lastName].filter(Boolean).join(' ');
  const selectedHistory = Object.entries(record.healthRecord?.pastMedicalHistory || {}).filter(([, answer]) => answer.present).map(([name]) => name);
  return <div className="space-y-6">
    <Link to="/patients" className="inline-flex items-center gap-2 text-[12px] font-semibold text-medical-500 hover:text-brokenshire-700"><ArrowLeft className="h-4 w-4" />Patients</Link>
    <header className="flex flex-col gap-4 border-b border-medical-200 pb-6 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="text-[11px] font-semibold uppercase tracking-widest text-brokenshire-600">Patient profile</p><Badge variant="success">Active record</Badge></div><h1 className="mt-2 text-[26px] font-semibold tracking-tight text-medical-900">{fullName}</h1><p className="mt-1 text-[13px] text-medical-500">{record.patientNumber} <span className="mx-2 text-medical-300">•</span> {record.studentProfile?.program || record.employeeProfile?.department || record.type}</p></div><div className="flex flex-wrap gap-2"><Button onClick={() => setEditing(true)}><ClipboardPlus className="h-4 w-4" />Health record</Button><Button variant="secondary"><CalendarPlus className="h-4 w-4" />New visit</Button><Button variant="secondary"><FilePlus2 className="h-4 w-4" />Certificate</Button></div></header>
    <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]"><div className="space-y-5"><Card title="Patient information" description="Identity and contact details"><dl className="grid gap-x-6 gap-y-5 p-5 sm:grid-cols-2"><div><dt className="text-[10px] font-semibold uppercase tracking-widest text-medical-400">Patient type</dt><dd className="mt-1 text-[13px] font-medium text-medical-800">{record.type}</dd></div><div><dt className="text-[10px] font-semibold uppercase tracking-widest text-medical-400">Patient ID</dt><dd className="mt-1 text-[13px] font-medium text-medical-800">{record.patientNumber}</dd></div><div><dt className="text-[10px] font-semibold uppercase tracking-widest text-medical-400">Email</dt><dd className="mt-1 text-[13px] text-medical-700">{record.email || 'Not recorded'}</dd></div><div><dt className="text-[10px] font-semibold uppercase tracking-widest text-medical-400">Phone</dt><dd className="mt-1 text-[13px] text-medical-700">{record.phone || 'Not recorded'}</dd></div></dl></Card><Card title="Paper health record" description={record.healthRecord ? `Last updated ${new Date(record.healthRecord.updatedAt).toLocaleDateString()}` : 'Not started'}><div className="p-5">{selectedHistory.length ? <div className="flex flex-wrap gap-2">{selectedHistory.map((item) => <Badge key={item}>{item}</Badge>)}</div> : <p className="text-[13px] text-medical-500">No medical-history findings recorded.</p>}{record.healthRecord?.presentHistory && <div className="mt-4"><p className="text-[10px] font-semibold uppercase tracking-widest text-medical-400">Present history</p><p className="mt-1 whitespace-pre-wrap text-[13px] text-medical-700">{record.healthRecord.presentHistory}</p></div>}</div></Card><Card title="Recent consultations" description="Clinical history summary">{record.visits?.length ? <div className="divide-y divide-medical-100">{record.visits.slice(0, 5).map((visit) => <div className="flex items-center justify-between px-5 py-4" key={visit.id}><div><p className="text-[13px] font-semibold text-medical-800">{visit.chiefComplaint || 'Clinic visit'}</p><p className="mt-1 text-[11px] text-medical-500">{new Date(visit.visitDate).toLocaleDateString()} · {visit.status}</p></div></div>)}</div> : <p className="p-5 text-[13px] text-medical-500">No consultations recorded.</p>}</Card></div><div className="space-y-5"><Card title="Allergies" description="Review before treatment">{record.allergies?.filter((allergy) => allergy.isActive).length ? <div className="space-y-3 p-5">{record.allergies.filter((allergy) => allergy.isActive).map((allergy) => <div key={allergy.id} className="flex gap-3 rounded-xl border border-danger-100 bg-danger-50 p-3"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-danger-600" /><div><p className="text-[13px] font-semibold text-danger-700">{allergy.allergen}</p><p className="mt-0.5 text-[11px] text-danger-700/80">{allergy.reaction || 'Reaction not specified'}</p></div></div>)}</div> : <p className="p-5 text-[13px] text-medical-500">No active allergies recorded.</p>}</Card><Card title="Emergency contacts">{record.emergencyContacts?.length ? <div className="divide-y divide-medical-100">{record.emergencyContacts.map((contact) => <div className="px-5 py-3" key={contact.id}><p className="text-[13px] font-medium text-medical-800">{contact.name}</p><p className="text-[11px] text-medical-500">{contact.relationship} · {contact.phone}</p></div>)}</div> : <p className="p-5 text-[13px] text-medical-500">No emergency contacts recorded.</p>}</Card></div></div>
    <Modal open={editing} onClose={() => setEditing(false)} title="Patient health record" description="Digital version of the Brokenshire paper health record." className="max-w-5xl"><RecordEditor patientId={id} initial={record.healthRecord} onClose={() => setEditing(false)} /></Modal>
  </div>;
}
