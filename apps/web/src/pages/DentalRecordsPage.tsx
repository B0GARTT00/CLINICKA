import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Checkbox, FormControlLabel, MenuItem, Box, Typography, Alert } from '@mui/material';
import { Plus, Stethoscope, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { PatientPicker } from '../components/PatientPicker';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ErrorState, LoadingState } from '../components/ui/States';
import { FormField } from '../components/ui/FormField';
import { PageHeader } from '../components/ui/PageHeader';
import { createDentalRecord, getDentalRecords } from '../services/api';

const permanentTeeth = ['18','17','16','15','14','13','12','11','21','22','23','24','25','26','27','28','48','47','46','45','44','43','42','41','31','32','33','34','35','36','37','38'];
const primaryTeeth = ['55','54','53','52','51','61','62','63','64','65','85','84','83','82','81','71','72','73','74','75'];
const toothConditions = [
  ['GOOD', 'Present / good'], ['MISSING', 'Missing'], ['INITIAL_CARIES', 'Initial caries'],
  ['CARIES', 'Caries for filling'], ['RECURRENT_CARIES', 'Recurrent caries'], ['FRACTURE', 'Fracture'],
  ['FOR_EXTRACTION', 'For extraction'], ['ROOT_FRAGMENT', 'Root fragment'], ['UNERUPTED', 'Unerupted'],
  ['IMPACTED', 'Impacted'], ['COMPOSITE', 'Composite'], ['LIGHT_CURE', 'Light curing'],
  ['SEALANT', 'Sealant'], ['TEMP_FILLING', 'Temporary filling'], ['JACKET_CROWN', 'Jacket crown'],
  ['FIXED_BRIDGE', 'Fixed bridge'], ['PONTIC', 'Pontic'], ['ABUTMENT', 'Abutment'], ['AMALGAM', 'Amalgam'],
] as const;

const emptyForm = {
  patientId: '', examinedAt: '', courseYearSection: '', toothChart: {} as Record<string, string>,
  plaqueLevel: '', hasGingivitis: false, hasPeriodontitis: false, retainerUpper: false,
  retainerLower: false, bracesUpper: false, bracesLower: false, oralCondition: '',
  fillingCount: '', extractionCount: '', needsOralProphylaxis: false, recommendation: '',
  remarks: '', dentistName: '', waiverDueAt: '', waiverSignedAt: '', waiverSignedBy: '',
};

export function DentalRecordsPage() {
  const queryClient = useQueryClient();
  const records = useQuery({ queryKey: ['dental-records'], queryFn: getDentalRecords });
  const [form, setForm] = useState(emptyForm);
  const [toothNumber, setToothNumber] = useState('');
  const [toothCondition, setToothCondition] = useState('');
  const save = useMutation({
    mutationFn: () => createDentalRecord({
      ...form,
      fillingCount: form.fillingCount === '' ? undefined : Number(form.fillingCount),
      extractionCount: form.extractionCount === '' ? undefined : Number(form.extractionCount),
      waiverDueAt: form.waiverDueAt || undefined,
      waiverSignedAt: form.waiverSignedAt || undefined,
      formMetadata: { formCode: 'DENTAL-PATIENT-RECORD', sourceRevision: 'paper reference', digitalRevision: '2026-10-06' },
    }),
    onSuccess: () => { setForm(emptyForm); void queryClient.invalidateQueries({ queryKey: ['dental-records'] }); },
  });
  if (records.isLoading) return <LoadingState label="Loading dental records..." />;
  if (records.isError) return <ErrorState message="Unable to load dental records." />;
  const toggle = (key: keyof typeof form) => (_event: unknown, checked: boolean) => setForm({ ...form, [key]: checked });
  return <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
    <PageHeader eyebrow="Health records" title="Dental records" description="Record odontogram findings, treatment needs, oral condition, clearance, and waivers." action={<Badge variant="neutral"><Stethoscope size={14} />{records.data?.length ?? 0} records</Badge>} />
    <Card title="New dental examination" description="Digital counterpart of the Dental Patient Record.">
      <Box component="form" sx={{ p: 2.5, display: 'grid', gap: 2 }} onSubmit={(event) => { event.preventDefault(); if (form.patientId && form.examinedAt) save.mutate(); }}>
        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr' } }}>
          <PatientPicker value={form.patientId} onChange={(patientId) => setForm({ ...form, patientId })} />
          <FormField required size="small" type="date" shrinkLabel label="Examination date" value={form.examinedAt} onChange={(e) => setForm({ ...form, examinedAt: e.target.value })} />
          <FormField size="small" label="Course / year / section" value={form.courseYearSection} onChange={(e) => setForm({ ...form, courseYearSection: e.target.value })} />
        </Box>

        <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Odontogram entries</Typography>
          <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: '160px 1fr auto' } }}>
            <FormField select size="small" label="Tooth number" value={toothNumber} onChange={(e) => setToothNumber(e.target.value)}>
              <MenuItem disabled value="">Permanent dentition</MenuItem>{permanentTeeth.map((tooth) => <MenuItem key={tooth} value={tooth}>{tooth}</MenuItem>)}
              <MenuItem disabled value="primary">Primary dentition</MenuItem>{primaryTeeth.map((tooth) => <MenuItem key={tooth} value={tooth}>{tooth}</MenuItem>)}
            </FormField>
            <FormField select size="small" label="Condition / treatment" value={toothCondition} onChange={(e) => setToothCondition(e.target.value)}>{toothConditions.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</FormField>
            <Button type="button" disabled={!toothNumber || !toothCondition} onClick={() => { setForm({ ...form, toothChart: { ...form.toothChart, [toothNumber]: toothCondition } }); setToothNumber(''); setToothCondition(''); }}><Plus className="h-4 w-4" />Add tooth</Button>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
            {Object.entries(form.toothChart).map(([tooth, condition]) => <Badge key={tooth} variant="neutral">#{tooth}: {toothConditions.find(([value]) => value === condition)?.[1] || condition}<button type="button" aria-label={`Remove tooth ${tooth}`} onClick={() => { const next = { ...form.toothChart }; delete next[tooth]; setForm({ ...form, toothChart: next }); }}><Trash2 size={13} /></button></Badge>)}
            {!Object.keys(form.toothChart).length && <Typography variant="caption" color="text.secondary">No tooth-specific findings recorded.</Typography>}
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
          <FormField select size="small" label="Calculus / plaque deposit" value={form.plaqueLevel} onChange={(e) => setForm({ ...form, plaqueLevel: e.target.value })}><MenuItem value="">Not recorded</MenuItem><MenuItem value="MILD">Mild</MenuItem><MenuItem value="MODERATE">Moderate</MenuItem><MenuItem value="SEVERE">Severe</MenuItem></FormField>
          <FormField select size="small" label="Dental examination result" value={form.oralCondition} onChange={(e) => setForm({ ...form, oralCondition: e.target.value })}><MenuItem value="">Not recorded</MenuItem><MenuItem value="GOOD">Good oral condition</MenuItem><MenuItem value="FAIR">Fair oral condition</MenuItem><MenuItem value="POOR">Poor oral condition</MenuItem></FormField>
          <FormField select size="small" label="Recommendation" value={form.recommendation} onChange={(e) => setForm({ ...form, recommendation: e.target.value })}><MenuItem value="">Not recorded</MenuItem><MenuItem value="CLEARED_FOR_ENROLLMENT">Cleared for enrollment</MenuItem><MenuItem value="DEFERRED_PENDING_TREATMENT">Deferred until treated</MenuItem><MenuItem value="SIGNED_WAIVER">With signed waiver</MenuItem></FormField>
          <FormField size="small" type="number" label="Teeth needing filling" value={form.fillingCount} onChange={(e) => setForm({ ...form, fillingCount: e.target.value })} />
          <FormField size="small" type="number" label="Teeth needing extraction" value={form.extractionCount} onChange={(e) => setForm({ ...form, extractionCount: e.target.value })} />
          <FormField size="small" label="School dentist" value={form.dentistName} onChange={(e) => setForm({ ...form, dentistName: e.target.value })} />
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <FormControlLabel control={<Checkbox checked={form.hasGingivitis} onChange={toggle('hasGingivitis')} />} label="Gingivitis" />
          <FormControlLabel control={<Checkbox checked={form.hasPeriodontitis} onChange={toggle('hasPeriodontitis')} />} label="Periodontitis" />
          <FormControlLabel control={<Checkbox checked={form.retainerUpper} onChange={toggle('retainerUpper')} />} label="Upper retainer" />
          <FormControlLabel control={<Checkbox checked={form.retainerLower} onChange={toggle('retainerLower')} />} label="Lower retainer" />
          <FormControlLabel control={<Checkbox checked={form.bracesUpper} onChange={toggle('bracesUpper')} />} label="Upper braces" />
          <FormControlLabel control={<Checkbox checked={form.bracesLower} onChange={toggle('bracesLower')} />} label="Lower braces" />
          <FormControlLabel control={<Checkbox checked={form.needsOralProphylaxis} onChange={toggle('needsOralProphylaxis')} />} label="Needs oral prophylaxis" />
        </Box>
        <FormField multiline minRows={2} label="Remarks / treatment details" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
        {form.recommendation === 'SIGNED_WAIVER' && <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}><FormField size="small" label="Waiver signed by" value={form.waiverSignedBy} onChange={(e) => setForm({ ...form, waiverSignedBy: e.target.value })} /><FormField size="small" type="date" shrinkLabel label="Waiver signed date" value={form.waiverSignedAt} onChange={(e) => setForm({ ...form, waiverSignedAt: e.target.value })} /><FormField size="small" type="date" shrinkLabel label="Treatment promised by" value={form.waiverDueAt} onChange={(e) => setForm({ ...form, waiverDueAt: e.target.value })} /></Box>}
        <Box><Button disabled={!form.patientId || !form.examinedAt || save.isPending}><Plus className="h-4 w-4" />Save dental record</Button></Box>
        {save.isError && <Alert severity="error">Unable to save this dental record. Review the required fields.</Alert>}
      </Box>
    </Card>
    <Card title="Dental examination history" description="Most recent examinations first.">
      {records.data?.length ? records.data.map((record) => <Box key={record.id} sx={{ px: 2.5, py: 2, borderBottom: 1, borderColor: 'divider', '&:last-child': { borderBottom: 0 } }}><Typography variant="body2" sx={{ fontWeight: 700 }}>{record.patient.firstName} {record.patient.lastName}</Typography><Typography variant="caption" color="text.secondary">{record.patient.patientNumber} · {new Date(record.examinedAt).toLocaleDateString()} · {record.oralCondition?.replaceAll('_', ' ') || 'Condition not recorded'} · {record.recommendation?.replaceAll('_', ' ') || 'No recommendation'}</Typography></Box>) : <Typography sx={{ p: 2.5 }} variant="body2" color="text.secondary">No dental records yet.</Typography>}
    </Card>
  </Box>;
}
