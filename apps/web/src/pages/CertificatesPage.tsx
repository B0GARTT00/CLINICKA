import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Award, FilePlus2, Printer } from 'lucide-react';
import { useState } from 'react';
import {
  Alert,
  Box,
  Checkbox,
  FormControlLabel,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { PatientPicker } from '../components/PatientPicker';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Modal } from '../components/ui/Modal';
import { ErrorState, LoadingState } from '../components/ui/States';
import { createCertificate, getCertificates, type MedicalCertificate } from '../services/api';

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
};

function CertificatePrintView({ certificate }: { certificate: MedicalCertificate }) {
  return (
    <div id="certificate-print" className="bg-white p-8 text-sm text-slate-900">
      <div className="text-center">
        <p className="font-bold">BROKENSHIRE COLLEGE</p>
        <p>Health &amp; Wellness Department · Madapo Hills, Davao City</p>
        <h2 className="mt-5 text-xl font-bold">MEDICAL / DENTAL CERTIFICATE</h2>
      </div>
      <div className="mt-8 flex justify-between">
        <span>
          Certificate No. <strong>{certificate.certificateNumber}</strong>
        </span>
        <span>Date: {new Date(certificate.issuedAt).toLocaleDateString()}</span>
      </div>
      <p className="mt-8">
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
      <div className="mt-16 grid grid-cols-2 gap-12">
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
        </div>
      </div>
    </div>
  );
}

export function CertificatesPage() {
  const queryClient = useQueryClient();
  const certificates = useQuery({ queryKey: ['certificates'], queryFn: getCertificates });
  const [form, setForm] = useState(blank);
  const [preview, setPreview] = useState<MedicalCertificate | null>(null);
  const create = useMutation({
    mutationFn: () =>
      createCertificate({
        ...form,
        validUntil: form.validUntil ? new Date(form.validUntil).toISOString() : undefined,
        followUpAt: form.followUpAt ? new Date(form.followUpAt).toISOString() : undefined,
        confinementFrom: form.confinementFrom
          ? new Date(form.confinementFrom).toISOString()
          : undefined,
        confinementUntil: form.confinementUntil
          ? new Date(form.confinementUntil).toISOString()
          : undefined,
      }),
    onSuccess: (created) => {
      setForm(blank);
      setPreview(created);
      void queryClient.invalidateQueries({ queryKey: ['certificates'] });
    },
  });
  if (certificates.isLoading) return <LoadingState label="Loading medical certificates..." />;
  if (certificates.isError) return <ErrorState message="Unable to load medical certificates." />;
  const field = (key: keyof typeof blank, label: string, type = 'text') => (
    <TextField
      fullWidth
      size="small"
      type={type}
      label={label}
      value={String(form[key] || '')}
      onChange={(event) => setForm({ ...form, [key]: event.target.value })}
      slotProps={type === 'date' ? { inputLabel: { shrink: true } } : undefined}
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
            <TextField
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
            </TextField>
            {field('purpose', 'Purpose')}
            {field('validUntil', 'Valid until', 'date')}
          </Box>
          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
            }}
          >
            <TextField
              required
              fullWidth
              multiline
              minRows={3}
              label="Findings"
              value={form.findings}
              onChange={(event) => setForm({ ...form, findings: event.target.value })}
            />
            <TextField
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
            <TextField
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
            </TextField>
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
            <TextField
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
            </TextField>
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
          </Box>
          {create.isError && (
            <Alert severity="error">
              Unable to issue the certificate. Review the required fields and try again.
            </Alert>
          )}
          <Box>
            <Button disabled={!form.patientId || create.isPending}>
              <FilePlus2 className="h-4 w-4" />
              Issue certificate
            </Button>
          </Box>
        </Box>
      </Card>
      <Card title="Certificate history" description="Issued certificates and printable copies.">
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
                    {certificate.fitnessStatus?.replaceAll('_', ' ') || certificate.purpose}
                  </Typography>
                </Box>
                <Button variant="secondary" onClick={() => setPreview(certificate)}>
                  <Printer className="h-4 w-4" />
                  View / print
                </Button>
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
    </Box>
  );
}
