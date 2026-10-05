import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Typography } from '@mui/material';
import { FileCheck2, Printer } from 'lucide-react';
import { getMyCertificates, type MedicalCertificate } from '../services/api';
import { CertificatePrintView } from './CertificatesPage';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Modal } from '../components/ui/Modal';
import { ErrorState, LoadingState } from '../components/ui/States';

export function MyCertificatesPage() {
  const certificates = useQuery({ queryKey: ['my-certificates'], queryFn: getMyCertificates });
  const [preview, setPreview] = useState<MedicalCertificate | null>(null);
  if (certificates.isLoading) return <LoadingState label="Loading your certificates..." />;
  if (certificates.isError) return <ErrorState message="Unable to load your certificates." />;
  return <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
    <PageHeader eyebrow="My health documents" title="My certificates" description="View and print medical or dental certificates issued to your patient account." />
    <Card title="Issued certificates" description="Only certificates belonging to your linked patient record appear here.">
      {certificates.data?.length ? certificates.data.map((certificate) => <Box key={certificate.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, px: 2.5, py: 2, borderBottom: 1, borderColor: 'divider', '&:last-child': { borderBottom: 0 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}><FileCheck2 size={19} /><Box><Typography variant="body2" sx={{ fontWeight: 700 }}>{certificate.type.replaceAll('_', ' ')}</Typography><Typography variant="caption" color="text.secondary">{certificate.certificateNumber} · Issued {new Date(certificate.issuedAt).toLocaleDateString()}</Typography></Box></Box>
        <Button variant="secondary" onClick={() => setPreview(certificate)}><Printer className="h-4 w-4" />View / print</Button>
      </Box>) : <Typography sx={{ p: 2.5 }} variant="body2" color="text.secondary">No certificates have been issued to your account.</Typography>}
    </Card>
    <Modal open={Boolean(preview)} onClose={() => setPreview(null)} title="Certificate preview" maxWidth="xl">{preview && <><CertificatePrintView certificate={preview} /><div className="flex justify-end border-t border-medical-100 p-4 print:hidden"><Button onClick={() => window.print()}><Printer className="h-4 w-4" />Print certificate</Button></div></>}</Modal>
  </Box>;
}
