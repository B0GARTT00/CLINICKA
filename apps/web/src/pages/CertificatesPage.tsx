import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Award, FilePlus2 } from 'lucide-react';
import { useState } from 'react';
import { PatientPicker } from '../components/PatientPicker';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ErrorState, LoadingState } from '../components/ui/States';
import { createCertificate, getCertificates } from '../services/api';

export function CertificatesPage() {
  const queryClient = useQueryClient();
  const certificates = useQuery({ queryKey: ['certificates'], queryFn: getCertificates });
  const [form, setForm] = useState({
    patientId: '',
    type: 'Medical Certificate',
    purpose: '',
    validUntil: '',
    remarks: '',
  });
  const create = useMutation({
    mutationFn: () =>
      createCertificate({
        ...form,
        validUntil: form.validUntil ? new Date(form.validUntil).toISOString() : undefined,
      }),
    onSuccess: () => {
      setForm({
        patientId: '',
        type: 'Medical Certificate',
        purpose: '',
        validUntil: '',
        remarks: '',
      });
      void queryClient.invalidateQueries({ queryKey: ['certificates'] });
    },
  });

  if (certificates.isLoading) return <LoadingState label="Loading medical certificates..." />;
  if (certificates.isError) return <ErrorState message="Unable to load medical certificates." />;
  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between border-b border-medical-200 pb-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-brokenshire-600">
            Clinic documents
          </p>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight text-medical-900">
            Medical certificates
          </h1>
          <p className="mt-1 text-[13px] text-medical-500">
            Issue and track authorized medical certificates.
          </p>
        </div>
        <Badge variant="success">
          <Award className="mr-1 inline h-3 w-3" />
          {certificates.data?.length ?? 0} issued
        </Badge>
      </header>
      <Card
        title="Issue certificate"
        description="Search for the patient by name or Patient ID before issuing a certificate."
      >
        <form
          className="grid gap-3 p-5 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!form.patientId) return;
            create.mutate();
          }}
        >
          <PatientPicker
            value={form.patientId}
            onChange={(patientId) => setForm((current) => ({ ...current, patientId }))}
          />
          <label>
            <span className="field-label">Certificate type</span>
            <input
              required
              value={form.type}
              onChange={(event) => setForm({ ...form, type: event.target.value })}
              className="field-input"
            />
          </label>
          <label>
            <span className="field-label">Purpose</span>
            <input
              required
              value={form.purpose}
              onChange={(event) => setForm({ ...form, purpose: event.target.value })}
              className="field-input"
              placeholder="School clearance"
            />
          </label>
          <label>
            <span className="field-label">Valid until</span>
            <input
              type="date"
              value={form.validUntil}
              onChange={(event) => setForm({ ...form, validUntil: event.target.value })}
              className="field-input"
            />
          </label>
          <div className="sm:col-span-2">
            <label>
              <span className="field-label">Remarks</span>
              <textarea
                value={form.remarks}
                onChange={(event) => setForm({ ...form, remarks: event.target.value })}
                className="field-input min-h-16"
              />
            </label>
          </div>
          <div className="sm:col-span-2">
            <Button disabled={!form.patientId || create.isPending}>
              <FilePlus2 className="h-4 w-4" />
              Issue certificate
            </Button>
          </div>
        </form>
        {create.isError && (
          <p className="px-5 pb-4 text-[12px] text-rose-600">
            Unable to issue certificate. Check the patient ID and required fields.
          </p>
        )}
      </Card>
      <Card title="Certificate history" description="Issued certificates and their validity. ">
        {certificates.data?.length ? (
          <div className="divide-y divide-medical-100">
            {certificates.data.map((certificate) => (
              <div
                className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                key={certificate.id}
              >
                <div>
                  <p className="text-[13px] font-semibold text-medical-900">
                    {certificate.patient.firstName} {certificate.patient.lastName}
                  </p>
                  <p className="mt-1 text-[11px] text-medical-500">
                    {certificate.certificateNumber} · {certificate.type} · {certificate.purpose}
                  </p>
                </div>
                <div className="text-right text-[11px] text-medical-500">
                  <p>Issued {new Date(certificate.issuedAt).toLocaleDateString()}</p>
                  <p>
                    {certificate.validUntil
                      ? `Valid until ${new Date(certificate.validUntil).toLocaleDateString()}`
                      : 'No expiry date'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="p-5 text-[13px] text-medical-500">No certificates issued yet.</p>
        )}
      </Card>
    </div>
  );
}
