import { useQuery } from '@tanstack/react-query';
import { Alert, Box, Typography } from '@mui/material';
import { ContactRound, HeartPulse, Phone } from 'lucide-react';
import { getMyPatientProfile } from '../services/api';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/Badge';
import { ErrorState, LoadingState } from '../components/ui/States';

function Detail({ label, value }: { label: string; value?: string | number | null }) {
  return <Box><Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700 }}>{label}</Typography><Typography variant="body2" sx={{ mt: .5, fontWeight: 600 }}>{value || 'Not recorded'}</Typography></Box>;
}

export function MyProfilePage() {
  const profile = useQuery({ queryKey: ['my-patient-profile'], queryFn: getMyPatientProfile });
  if (profile.isLoading) return <LoadingState label="Loading your patient profile..." />;
  if (profile.isError || !profile.data) return <ErrorState message="Your account is not linked to an active patient profile. Contact the clinic if this is unexpected." />;
  const patient = profile.data;
  const institutionalId = patient.studentProfile?.studentId || patient.employeeProfile?.employeeId;
  const program = patient.studentProfile?.program || patient.employeeProfile?.department;
  const incomplete = !patient.phone || !patient.address || !patient.birthDate || !patient.sex || !patient.emergencyContacts?.length;
  return <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
    <PageHeader eyebrow="Personal health account" title="My patient profile" description="Review the identity, contact, and clinic information linked to your account." action={<Badge variant="success">{patient.patientNumber}</Badge>} />
    {incomplete && <Alert severity="info">Some profile information is incomplete. Ask authorized clinic staff to update the official patient record.</Alert>}
    <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', lg: '1.2fr .8fr' } }}>
      <Card title="Personal information" description="Official details used by the clinic."><Box sx={{ display: 'grid', gap: 2.5, p: 2.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } }}><Detail label="Full name" value={[patient.firstName, patient.middleName, patient.lastName].filter(Boolean).join(' ')} /><Detail label="Patient type" value={patient.type} /><Detail label="Institutional ID" value={institutionalId} /><Detail label="Program / department" value={program} /><Detail label="Birth date" value={patient.birthDate ? new Date(patient.birthDate).toLocaleDateString() : null} /><Detail label="Sex" value={patient.sex} /><Detail label="Email" value={patient.email} /><Detail label="Address" value={patient.address} /></Box></Card>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Card title="Contact information" description="Numbers recorded by the clinic."><Box sx={{ display: 'grid', gap: 2, p: 2.5 }}><Box sx={{ display: 'flex', gap: 1.5 }}><Phone size={18} /><Box><Detail label="Mobile" value={patient.phone} /><Box sx={{ mt: 1.5 }}><Detail label="Landline" value={patient.landline} /></Box></Box></Box></Box></Card>
        <Card title="Emergency contacts" description="People the clinic may contact in an emergency."><Box sx={{ p: 2.5 }}>{patient.emergencyContacts?.length ? patient.emergencyContacts.map((contact) => <Box key={contact.id} sx={{ display: 'flex', gap: 1.5, mb: 2, '&:last-child': { mb: 0 } }}><ContactRound size={18} /><Box><Typography variant="body2" sx={{ fontWeight: 700 }}>{contact.name}</Typography><Typography variant="caption" color="text.secondary">{contact.relationship} · {contact.phone}</Typography></Box></Box>) : <Typography variant="body2" color="text.secondary">No emergency contact recorded.</Typography>}</Box></Card>
      </Box>
    </Box>
    <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' } }}>
      <Card title="Known allergies and conditions" description="Summary recorded by the clinic."><Box sx={{ p: 2.5, display: 'flex', flexWrap: 'wrap', gap: 1 }}>{patient.allergies?.filter((item) => item.isActive).map((item) => <Badge key={item.id} variant="warning">Allergy: {item.allergen}</Badge>)}{patient.conditions?.filter((item) => item.isActive).map((item) => <Badge key={item.id}>{item.name}</Badge>)}{!patient.allergies?.some((item) => item.isActive) && !patient.conditions?.some((item) => item.isActive) && <Typography variant="body2" color="text.secondary">No active allergies or conditions recorded.</Typography>}</Box></Card>
      <Card title="Recent clinic visits" description="Your five most recent recorded visits."><Box sx={{ p: 2.5 }}>{patient.visits?.length ? patient.visits.map((visit) => <Box key={visit.id} sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}><HeartPulse size={18} /><Box><Typography variant="body2" sx={{ fontWeight: 700 }}>{new Date(visit.visitDate).toLocaleString()}</Typography><Typography variant="caption" color="text.secondary">{visit.chiefComplaint || 'No complaint recorded'} · {visit.status}</Typography></Box></Box>) : <Typography variant="body2" color="text.secondary">No clinic visits recorded.</Typography>}</Box></Card>
    </Box>
  </Box>;
}
