import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Award, FilePlus2, Printer, Send } from 'lucide-react';
import { useState } from 'react';
import {
  Alert,
  Box,
  Checkbox,
  FormControlLabel,
  MenuItem,
  Typography,
} from '@mui/material';
import { PatientPicker } from '../components/PatientPicker';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ErrorState, LoadingState } from '../components/ui/States';
import { FormField } from '../components/ui/FormField';
import { createCertificate, getCertificates, sendCertificate, type MedicalCertificate } from '../services/api';

const certificateTypes = [
  'MEDICAL_CLEARANCE',
  'FITNESS_FOR_SCHOOL',
  'FITNESS_FOR_WORK',
  'VACCINATION_CERTIFICATE',
  'MEDICAL_EXEMPTION',
  'OTHER',
];
const immunizations = [
  'Hepatitis B1',
  'Hepatitis B2',
  'Hepatitis B3',
  'Varicella 1',
  'Varicella 2',
  'Pneumococcal 1',
  'Pneumococcal 2',
  'Tetanus / Diphtheria',
  'Influenza',
  'MMR 1',
  'MMR 2',
  'Typhoid',
  'Rabies',
];
const counsellingTopics = ['Breast self exam', 'Smoking cessation', 'Alcohol moderation', 'Exercise', 'Nutrition and healthy weight', 'Illegal-drug awareness', 'Sex education and STI awareness', 'Environmental safety', 'Oral prophylaxis', 'Oral care', 'Oral surgery', 'Restoration procedure', 'Others'];
const purposeTemplates = {
  school: 'School attendance and participation in regular academic activities',
  work: 'Employment fitness and return-to-work documentation',
  sports: 'Participation in physical education, sports, or recreational activities',
  clearance: 'Medical clearance and institutional health-requirement compliance',
};
const findingTemplates = {
  normal: 'Patient was examined today. Vital signs were within normal limits. No fever, respiratory distress, or other acute symptoms were observed. Physical examination showed no significant abnormal findings.',
  improving: 'Patient was examined today and reports improvement of the previously noted symptoms. Current examination shows no acute distress. Continued observation and compliance with the recommendations below are advised.',
  temporary: 'Patient was examined today. Findings require temporary activity restriction and follow-up assessment before full clearance can be issued. Refer to the recommendations below.',
  vaccine: 'Patient was evaluated for institutional health requirements. Available vaccination documentation was reviewed, and the requirements identified below remain pending.',
};
const recommendationTemplates = {
  fit: 'Patient is fit to attend classes or work and participate in regular activities. Maintain adequate hydration, balanced nutrition, proper hygiene, sufficient sleep, and routine medical follow-up as needed.',
  temporary: 'Temporary clearance is granted subject to completion of the requirements below. Return for reassessment on the indicated follow-up date.',
  rest: 'Rest at home, maintain adequate hydration, take medications only as prescribed, and monitor symptoms. Seek urgent medical care if symptoms worsen or warning signs develop.',
  followUp: 'Return to the clinic on the indicated date for follow-up assessment. Bring relevant laboratory results, imaging, prescriptions, or referral documentation.',
  vaccination: 'Complete the selected immunization requirements and submit valid supporting documentation to the clinic for verification.',
};
const blank = {
  patientId: '',
  type: 'MEDICAL_CLEARANCE',
  purpose: '',
  validUntil: '',
  findings: '',
  fitnessStatus: '',
  recommendations: '',
  followUpAt: '',
  referredTo: '',
  confinementType: '',
  confinementFrom: '',
  confinementUntil: '',
  physicianName: '',
  physicianLicenseNo: '',
  physicianPtrNo: '',
  physicianContact: '',
  remarks: '',
  requiredImmunizations: {} as Record<string, boolean>,
  lateMinutes: '',
  lateReason: '',
  specialCare: '',
  healthCounselling: {} as Record<string, { provided: boolean; providerName?: string; date?: string; remarks?: string }>,
  acknowledgmentName: '',
  acknowledgmentRelationship: '',
  acknowledged: false,
  physicianSignedAt: '',
  formMetadata: { formCode: 'MEDICAL-DENTAL-CERTIFICATE', sourceRevision: 'clinic reference', digitalRevision: '2026-10-04' },
};

export function CertificatePrintView({ certificate }: { certificate: MedicalCertificate }) {
  return (
    <div id="certificate-print" className="mx-auto max-w-[210mm] bg-white p-8 text-sm text-slate-900">
      <div className="certificate-header grid grid-cols-[72px_1fr_72px] items-center gap-4 border-b-2 border-emerald-800 pb-4 text-center">
        <img src="/BC_logo.png" alt="Brokenshire College seal" className="h-[68px] w-[68px] object-contain" />
        <div>
          <img src="/clinova-emblem.png" alt="Clinova emblem" className="mx-auto mb-2 h-12 w-12 object-contain" />
          <p className="text-base font-bold tracking-wide">BROKENSHIRE COLLEGE</p>
          <p>Health &amp; Wellness Department · Madapo Hills, Davao City</p>
          <h2 className="mt-4 text-xl font-bold">MEDICAL / DENTAL CERTIFICATE</h2>
        </div>
        <img src="/uccp-logo.png" alt="United Church of Christ in the Philippines seal" className="h-[68px] w-[68px] object-contain" />
      </div>
      <div className="certificate-meta mt-8 flex justify-between">
        <span>
          Certificate No. <strong>{certificate.certificateNumber}</strong>
        </span>
        <span>Date: {new Date(certificate.issuedAt).toLocaleDateString()}</span>
      </div>
      <p className="certificate-intro mt-8">
        This is to certify that I have examined{' '}
        <strong>
          {certificate.patient.firstName} {certificate.patient.lastName}
        </strong>{' '}
        ({certificate.patient.patientNumber}).
      </p>
      <section className="mt-6">
        <h3 className="border-b border-slate-400 pb-1 font-bold">FINDINGS</h3>
        <p className="min-h-16 whitespace-pre-wrap py-3">
          {certificate.findings || 'No findings recorded.'}
        </p>
      </section>
      <section className="mt-4">
        <h3 className="border-b border-slate-400 pb-1 font-bold">RECOMMENDATIONS</h3>
        <p className="mt-3 font-semibold">
          {certificate.fitnessStatus?.replaceAll('_', ' ') || 'No fitness recommendation recorded'}
        </p>
        <p className="mt-2 whitespace-pre-wrap">
          {certificate.recommendations || certificate.remarks || ''}
        </p>
        {certificate.referredTo && <p className="mt-2">Referred to: {certificate.referredTo}</p>}
        {certificate.followUpAt && (
          <p>Follow-up: {new Date(certificate.followUpAt).toLocaleDateString()}</p>
        )}
        {certificate.confinementType && (
          <p>
            {certificate.confinementType} confinement:{' '}
            {certificate.confinementFrom
              ? new Date(certificate.confinementFrom).toLocaleDateString()
              : '—'}{' '}
            to{' '}
            {certificate.confinementUntil
              ? new Date(certificate.confinementUntil).toLocaleDateString()
              : '—'}
          </p>
        )}
        {certificate.lateMinutes != null && certificate.lateMinutes > 0 && <p>Late for {certificate.lateMinutes} minutes due to {certificate.lateReason || 'reason not specified'}.</p>}
        {certificate.specialCare && <p>Needs special care: {certificate.specialCare}</p>}
      </section>
      {Object.entries(certificate.requiredImmunizations || {}).some(([, checked]) => checked) && (
        <section className="mt-6">
          <h3 className="font-bold">Requirements to complete</h3>
          <p className="mt-2">
            {Object.entries(certificate.requiredImmunizations || {})
              .filter(([, checked]) => checked)
              .map(([name]) => name)
              .join(' · ')}
          </p>
        </section>
      )}
      {Object.entries(certificate.healthCounselling || {}).some(([, entry]) => entry.provided) && <section className="mt-6"><h3 className="font-bold">HEALTH COUNSELLING</h3>{Object.entries(certificate.healthCounselling || {}).filter(([, entry]) => entry.provided).map(([topic, entry]) => <p key={topic}>{topic} — {entry.providerName || 'provider not recorded'}{entry.date ? ` · ${new Date(entry.date).toLocaleDateString()}` : ''}{entry.remarks ? ` · ${entry.remarks}` : ''}</p>)}</section>}
      <div className="certificate-signature mt-16 grid grid-cols-2 gap-12">
        <div>
          <p>Purpose: {certificate.purpose}</p>
          {certificate.validUntil && (
            <p>Valid until: {new Date(certificate.validUntil).toLocaleDateString()}</p>
          )}
        </div>
        <div className="border-t border-slate-500 pt-2">
          <p className="font-bold">
            {certificate.physicianName ||
              certificate.issuedBy?.displayName ||
              'Examining physician'}
          </p>
          {certificate.physicianLicenseNo && <p>License No. {certificate.physicianLicenseNo}</p>}
          {certificate.physicianPtrNo && <p>PTR No. {certificate.physicianPtrNo}</p>}
          {certificate.physicianContact && <p>Contact: {certificate.physicianContact}</p>}
          {certificate.physicianSignedAt && <p>Electronically attested: {new Date(certificate.physicianSignedAt).toLocaleString()}</p>}
        </div>
      </div>
      {certificate.patientAcknowledgment?.acknowledged && <div className="certificate-acknowledgment mt-10 border-t border-slate-400 pt-2"><strong>Patient / guardian acknowledgment:</strong> {certificate.patientAcknowledgment.name} ({certificate.patientAcknowledgment.relationship || 'self'}) · {certificate.patientAcknowledgment.acknowledgedAt ? new Date(certificate.patientAcknowledgment.acknowledgedAt).toLocaleString() : ''}</div>}
    </div>
  );
}

export function CertificatesPage() {
  const queryClient = useQueryClient();
  const certificates = useQuery({ queryKey: ['certificates'], queryFn: getCertificates });
  const [form, setForm] = useState(blank);
  const [preview, setPreview] = useState<MedicalCertificate | null>(null);
  const [pendingSend, setPendingSend] = useState<MedicalCertificate | null>(null);
  const [templates, setTemplates] = useState({ purpose: '', findings: '', recommendations: '' });
  const create = useMutation({
    mutationFn: () => {
      const { acknowledgmentName, acknowledgmentRelationship, acknowledged, ...certificate } = form;
      return createCertificate({
        ...certificate,
        lateMinutes: form.lateMinutes === '' ? undefined : Number(form.lateMinutes),
        validUntil: form.validUntil ? new Date(form.validUntil).toISOString() : undefined,
        followUpAt: form.followUpAt ? new Date(form.followUpAt).toISOString() : undefined,
        confinementFrom: form.confinementFrom
          ? new Date(form.confinementFrom).toISOString()
          : undefined,
        confinementUntil: form.confinementUntil
          ? new Date(form.confinementUntil).toISOString()
          : undefined,
        physicianSignedAt: form.physicianSignedAt ? new Date(form.physicianSignedAt).toISOString() : undefined,
        patientAcknowledgment: { acknowledged, name: acknowledgmentName, relationship: acknowledgmentRelationship, acknowledgedAt: acknowledged ? new Date().toISOString() : undefined },
      });
    },
    onSuccess: (created) => {
      setForm(blank);
      setTemplates({ purpose: '', findings: '', recommendations: '' });
      setPreview(created);
      void queryClient.invalidateQueries({ queryKey: ['certificates'] });
    },
  });
  const send = useMutation({
    mutationFn: (id: string) => sendCertificate(id),
    onSuccess: async (sent) => {
      await queryClient.invalidateQueries({ queryKey: ['certificates'] });
      setPreview((current) => current?.id === sent.id ? sent : current);
      setPendingSend(null);
    },
  });
  if (certificates.isLoading) return <LoadingState label="Loading medical certificates..." />;
  if (certificates.isError) return <ErrorState message="Unable to load medical certificates." />;
  const responseMessage = (create.error as { response?: { data?: { message?: string | string[] } } } | null)?.response?.data?.message;
  const createErrorMessage = Array.isArray(responseMessage) ? responseMessage.join(' ') : responseMessage;
  const field = (key: keyof typeof blank, label: string, type = 'text') => (
    <FormField
      name={String(key)}
      fullWidth
      size="small"
      type={type}
      label={label}
      value={String(form[key] || '')}
      onChange={(event) => setForm({ ...form, [key]: event.target.value })}
      shrinkLabel={type === 'date'}
    />
  );
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader
        eyebrow="Clinic documents"
        title="Medical / dental certificates"
        description="Record examination findings, recommendations, referrals, and fitness decisions."
        action={
          <Badge variant="success">
            <Award size={14} />
            {certificates.data?.length ?? 0} issued
          </Badge>
        }
      />
      <Card
        title="Issue certificate"
        description="Complete the clinical certificate after examining the patient."
      >
        <Box
          component="form"
          sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, p: 2.5 }}
          onSubmit={(event) => {
            event.preventDefault();
            if (form.patientId) create.mutate();
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
            }}
          >
            <PatientPicker
              value={form.patientId}
              onChange={(patientId) => setForm({ ...form, patientId })}
            />
            <FormField
              name="type"
              select
              fullWidth
              size="small"
              label="Certificate type"
              value={form.type}
              onChange={(event) => setForm({ ...form, type: event.target.value })}
            >
              {certificateTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type.replaceAll('_', ' ')}
                </MenuItem>
              ))}
            </FormField>
            <FormField select fullWidth size="small" label="Purpose template" value={templates.purpose} onChange={(event) => { const key = event.target.value as keyof typeof purposeTemplates; setTemplates({ ...templates, purpose: key }); if (key) setForm({ ...form, purpose: purposeTemplates[key] }); }}>
              <MenuItem value="">Custom / select template</MenuItem>
              <MenuItem value="school">School attendance</MenuItem><MenuItem value="work">Employment / return to work</MenuItem><MenuItem value="sports">Sports participation</MenuItem><MenuItem value="clearance">Medical clearance</MenuItem>
            </FormField>
            {field('purpose', 'Purpose (editable)')}
            {field('validUntil', 'Valid until', 'date')}
          </Box>
          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' } }}>
            {field('lateMinutes', 'Late duration (minutes)', 'number')}
            {field('lateReason', 'Reason for lateness')}
            {field('specialCare', 'Special care required')}
          </Box>
          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
            }}
          >
            <FormField select fullWidth size="small" label="Findings template" value={templates.findings} onChange={(event) => { const key = event.target.value as keyof typeof findingTemplates; setTemplates({ ...templates, findings: key }); if (key) setForm({ ...form, findings: findingTemplates[key] }); }}>
              <MenuItem value="">Custom / select template</MenuItem><MenuItem value="normal">Normal examination</MenuItem><MenuItem value="improving">Symptoms improving</MenuItem><MenuItem value="temporary">Temporary restriction</MenuItem><MenuItem value="vaccine">Vaccination review</MenuItem>
            </FormField>
            <FormField select fullWidth size="small" label="Recommendation template" value={templates.recommendations} onChange={(event) => { const key = event.target.value as keyof typeof recommendationTemplates; setTemplates({ ...templates, recommendations: key }); if (key) setForm({ ...form, recommendations: recommendationTemplates[key] }); }}>
              <MenuItem value="">Custom / select template</MenuItem><MenuItem value="fit">Fit for regular activities</MenuItem><MenuItem value="temporary">Temporary clearance</MenuItem><MenuItem value="rest">Rest and monitor</MenuItem><MenuItem value="followUp">Follow-up assessment</MenuItem><MenuItem value="vaccination">Complete vaccinations</MenuItem>
            </FormField>
            <FormField
              name="findings"
              required
              fullWidth
              multiline
              minRows={3}
              label="Findings"
              value={form.findings}
              onChange={(event) => setForm({ ...form, findings: event.target.value })}
            />
            <FormField
              name="recommendations"
              fullWidth
              multiline
              minRows={3}
              label="Recommendations"
              value={form.recommendations}
              onChange={(event) => setForm({ ...form, recommendations: event.target.value })}
            />
          </Box>
          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
            }}
          >
            <FormField
              name="fitnessStatus"
              select
              required
              fullWidth
              size="small"
              label="Fitness decision"
              value={form.fitnessStatus}
              onChange={(event) => setForm({ ...form, fitnessStatus: event.target.value })}
            >
              <MenuItem value="">Select decision</MenuItem>
              <MenuItem value="FIT">Fit to study / work / play</MenuItem>
              <MenuItem value="TEMPORARY_CLEARANCE">Temporary clearance</MenuItem>
              <MenuItem value="NOT_FIT">Not fit to study / work</MenuItem>
              <MenuItem value="FIT_TO_RETURN">Fit to return</MenuItem>
            </FormField>
            {field('followUpAt', 'Follow-up date', 'date')}
            {field('referredTo', 'Referred to')}
          </Box>
          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
            }}
          >
            <FormField
              name="confinementType"
              select
              fullWidth
              size="small"
              label="Confinement"
              value={form.confinementType}
              onChange={(event) => setForm({ ...form, confinementType: event.target.value })}
            >
              <MenuItem value="">None</MenuItem>
              <MenuItem value="HOME">Home</MenuItem>
              <MenuItem value="CLINIC">Clinic</MenuItem>
              <MenuItem value="HOSPITAL">Hospital</MenuItem>
            </FormField>
            {field('confinementFrom', 'From', 'date')}
            {field('confinementUntil', 'Until', 'date')}
          </Box>
          <Box>
            <Typography variant="overline" color="text.secondary">
              Immunizations / requirements to complete
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gap: 1,
                mt: 0.5,
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
              }}
            >
              {immunizations.map((name) => (
                <FormControlLabel
                  key={name}
                  sx={{ m: 0, px: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}
                  control={
                    <Checkbox
                      size="small"
                      checked={Boolean(form.requiredImmunizations[name])}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          requiredImmunizations: {
                            ...form.requiredImmunizations,
                            [name]: event.target.checked,
                          },
                        })
                      }
                    />
                  }
                  label={<Typography variant="body2">{name}</Typography>}
                />
              ))}
            </Box>
          </Box>
          <Box>
            <Typography variant="overline" color="text.secondary">Health / dental counselling</Typography>
            <Box sx={{ display: 'grid', gap: 1, mt: 0.5, gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' } }}>
              {counsellingTopics.map((topic) => { const entry = form.healthCounselling[topic] || { provided: false }; return <Box key={topic} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1 }}><FormControlLabel control={<Checkbox checked={entry.provided} onChange={(e) => setForm({ ...form, healthCounselling: { ...form.healthCounselling, [topic]: { ...entry, provided: e.target.checked } } })} />} label={topic} />{entry.provided && <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: '1fr 150px 1fr' }}><FormField size="small" label="Provider" value={entry.providerName || ''} onChange={(e) => setForm({ ...form, healthCounselling: { ...form.healthCounselling, [topic]: { ...entry, providerName: e.target.value } } })} /><FormField size="small" type="date" shrinkLabel label="Date" value={entry.date || ''} onChange={(e) => setForm({ ...form, healthCounselling: { ...form.healthCounselling, [topic]: { ...entry, date: e.target.value } } })} /><FormField size="small" label="Remarks" value={entry.remarks || ''} onChange={(e) => setForm({ ...form, healthCounselling: { ...form.healthCounselling, [topic]: { ...entry, remarks: e.target.value } } })} /></Box>}</Box>; })}
            </Box>
          </Box>
          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
            }}
          >
            {field('physicianName', 'Physician name')}
            {field('physicianLicenseNo', 'License number')}
            {field('physicianPtrNo', 'PTR number')}
            {field('physicianContact', 'Contact number')}
            {field('physicianSignedAt', 'Physician attestation date/time', 'datetime-local')}
          </Box>
          <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5 }}><FormControlLabel control={<Checkbox checked={form.acknowledged} onChange={(e) => setForm({ ...form, acknowledged: e.target.checked })} />} label="Patient or guardian acknowledged the findings" />{form.acknowledged && <Box sx={{ display: 'grid', gap: 1.5, mt: 1, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } }}>{field('acknowledgmentName', 'Acknowledging person')}{field('acknowledgmentRelationship', 'Relationship (use Self when applicable)')}</Box>}</Box>
          {create.isError && (
            <Alert severity="error">
              {createErrorMessage || 'Unable to issue the certificate. Review the required fields and try again.'}
            </Alert>
          )}
          <Box>
            <Button type="submit" loading={create.isPending} disabled={!form.patientId}>
              <FilePlus2 className="h-4 w-4" />
              Issue certificate
            </Button>
          </Box>
        </Box>
      </Card>
      <Card title="Certificate history" description="Issued certificates and printable copies.">
        {send.isError && <Alert severity="error" sx={{ m: 2 }}>{((send.error as { response?: { data?: { message?: string } } })?.response?.data?.message) || 'Unable to send the certificate to the patient.'}</Alert>}
        {certificates.data?.length ? (
          <Box>
            {certificates.data.map((certificate) => (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                  px: 2.5,
                  py: 2,
                  borderBottom: 1,
                  borderColor: 'divider',
                  '&:last-child': { borderBottom: 0 },
                }}
                key={certificate.id}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {certificate.patient.firstName} {certificate.patient.lastName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {certificate.certificateNumber} · {certificate.type.replaceAll('_', ' ')} ·{' '}
                    {certificate.fitnessStatus?.replaceAll('_', ' ') || certificate.purpose} · {certificate.sentAt ? `Sent ${new Date(certificate.sentAt).toLocaleString()}` : 'Not sent'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {!certificate.sentAt && <Button disabled={send.isPending} onClick={() => setPendingSend(certificate)}><Send className="h-4 w-4" />Send to patient</Button>}
                  <Button variant="secondary" onClick={() => setPreview(certificate)}><Printer className="h-4 w-4" />View / print</Button>
                </Box>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography sx={{ p: 2.5 }} variant="body2" color="text.secondary">
            No certificates issued yet.
          </Typography>
        )}
      </Card>
      <Modal
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        title="Certificate preview"
        maxWidth="xl"
      >
        {preview && (
          <>
            <CertificatePrintView certificate={preview} />
            <div className="flex justify-end border-t border-medical-100 p-4 print:hidden">
              <Button onClick={() => window.print()}>
                <Printer className="h-4 w-4" />
                Print certificate
              </Button>
            </div>
          </>
        )}
      </Modal>
      <ConfirmDialog
        open={Boolean(pendingSend)}
        onClose={() => !send.isPending && setPendingSend(null)}
        onConfirm={() => pendingSend && send.mutate(pendingSend.id)}
        title="Send certificate to patient?"
        description={pendingSend ? `This will make ${pendingSend.certificateNumber} available in ${pendingSend.patient.firstName} ${pendingSend.patient.lastName}'s portal and send them a notification. This action cannot be repeated.` : undefined}
        confirmLabel="Send certificate"
        cancelLabel="Keep unsent"
        isConfirmLoading={send.isPending}
      />
    </Box>
  );
}
