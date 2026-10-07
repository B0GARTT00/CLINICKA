import { Link, useNavigate } from 'react-router-dom';
import { Archive, CircleAlert, RotateCcw, UserCheck, UserPlus, UsersRound } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { Badge } from '../components/ui/Badge';
import { StatusChip } from '../components/ui/StatusChip';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { DataTable } from '../components/ui/DataTable';
import { EmptyState, ErrorState, LoadingState, MutationFeedback } from '../components/ui/States';
import { FormField } from '../components/ui/FormField';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { SearchInput } from '../components/ui/SearchInput';
import { archivePatient, createPatient, getPatients, restorePatient, type Patient } from '../services/api';

type PatientForm = {
  institutionalId: string;
  type: Patient['type'];
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phone: string;
  landline: string;
  program: string;
  department: string;
  yearLevel: string;
};
const emptyForm: PatientForm = {
  institutionalId: '',
  type: 'STUDENT',
  firstName: '',
  middleName: '',
  lastName: '',
  email: '',
  phone: '',
  landline: '',
  program: '',
  department: '',
  yearLevel: '',
};

export function PatientsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [lifecycle, setLifecycle] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  const [form, setForm] = useState<PatientForm>(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [lifecycleAction, setLifecycleAction] = useState<{ patient: Patient; restore: boolean } | null>(null);
  const [lastCreatedPatient, setLastCreatedPatient] = useState<Patient | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const queryClient = useQueryClient();
  const patients = useQuery({
    queryKey: ['patients', search, typeFilter, lifecycle],
    queryFn: () =>
      getPatients(
        search || undefined,
        1,
        20,
        (typeFilter || undefined) as Patient['type'] | undefined,
        lifecycle,
      ),
  });
  const closeForm = () => {
    setForm(emptyForm);
    setFormOpen(false);
  };
  const setField = (field: keyof PatientForm, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));
  const savePatient = useMutation({
    mutationFn: () => {
      const data = {
        type: form.type,
        firstName: form.firstName,
        middleName: form.middleName,
        lastName: form.lastName,
        email: form.email || undefined,
        phone: form.phone || undefined,
        landline: form.landline || undefined,
        program: form.program || undefined,
        department: form.department || undefined,
        yearLevel: form.yearLevel ? Number(form.yearLevel) : undefined,
        studentId: form.type === 'STUDENT' ? form.institutionalId || undefined : undefined,
        employeeId: form.type !== 'STUDENT' ? form.institutionalId || undefined : undefined,
      };
      return createPatient(data);
    },
    onSuccess: (patient) => {
      setLastCreatedPatient(patient);
      void queryClient.invalidateQueries({ queryKey: ['patients'] });
      closeForm();
    },
  });
  const changeLifecycle = useMutation({
    mutationFn: ({ patient, restore }: { patient: Patient; restore: boolean }) =>
      restore ? restorePatient(patient.id) : archivePatient(patient.id),
    onSuccess: (_patient, variables) => {
      setSuccessMessage(variables.restore ? 'Patient record restored.' : 'Patient record archived.');
      setLifecycleAction(null);
      void queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
  const responseMessage = (
    savePatient.error as { response?: { data?: { message?: string | string[] } } } | null
  )?.response?.data?.message;
  const saveErrorMessage = Array.isArray(responseMessage)
    ? responseMessage.join(' ')
    : responseMessage;

  const tableData = patients.data?.map((patient) => ({
    ...patient,
    name: `${patient.lastName}, ${patient.firstName}`,
    programDepartment: patient.studentProfile?.program || patient.employeeProfile?.department || 'Not recorded',
    status: lifecycle === 'ARCHIVED' ? 'Archived' : patient.user ? 'Portal account' : 'Manual entry',
  })) || [];
  const portalAccountCount = tableData.filter((patient) => Boolean(patient.user)).length;
  const incompleteCount = tableData.filter((patient) => !patient.phone || !(patient.studentProfile?.studentId || patient.employeeProfile?.employeeId)).length;

  const patientColumns = [
    { field: 'patientNumber', header: 'Patient ID', width: '150px' },
    { field: 'name', header: 'Name', width: '210px', render: (row: Patient) => (
      <Box>
        <Typography
          component={Link}
          to={`/patients/${row.id}`}
          sx={{
            color: 'text.primary',
            fontSize: 13,
            fontWeight: 700,
            textDecoration: 'none',
            '&:hover': { color: 'primary.main' },
          }}
        >
          {row.lastName}, {row.firstName}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {row.email || 'No email recorded'}
        </Typography>
        {(!row.phone || !(row.studentProfile?.studentId || row.employeeProfile?.employeeId)) && (
          <Typography variant="caption" color="warning.main" sx={{ display: 'block' }}>
            Profile incomplete
          </Typography>
        )}
      </Box>
    )},
    { field: 'type', header: 'Type', width: '90px', render: (row: Patient) => <Badge>{row.type}</Badge> },
    { field: 'programDepartment', header: 'Program / Department', width: '150px', render: (row: Patient) => (
      <Typography variant="body2" color="text.secondary">
        {row.studentProfile?.program || row.employeeProfile?.department || 'Not recorded'}
      </Typography>
    )},
    { field: 'lastVisit', header: 'Last Visit', width: '110px', render: (row: Patient) => {
      const lastVisit = row.visits?.[0];
      return lastVisit ? (
        <>
          {new Date(lastVisit.visitDate).toLocaleDateString()}
          <Typography variant="caption" sx={{ display: 'block' }}>
            {lastVisit.status}
          </Typography>
        </>
      ) : 'No visits';
    }},
    { field: 'status', header: 'Status', width: '120px', render: (row: Patient) => (
      <StatusChip state={lifecycle === 'ARCHIVED' ? 'ARCHIVED' : row.user ? 'ACTIVE' : 'MANUAL'} />
    )},
    { field: 'actions', header: 'Record action', width: '120px', render: (row: Patient) => (
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
      <Button
        variant="secondary"
        disabled={changeLifecycle.isPending}
        onClick={(event) => {
          event.stopPropagation();
          setLifecycleAction({ patient: row, restore: lifecycle === 'ARCHIVED' });
        }}
      >
        {lifecycle === 'ARCHIVED' ? <RotateCcw size={15} /> : <Archive size={15} />}
        {lifecycle === 'ARCHIVED' ? 'Restore' : 'Archive'}
      </Button>
      </Box>
    )},
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <MutationFeedback open={Boolean(successMessage)} message={successMessage} onClose={() => setSuccessMessage('')} />
      <MutationFeedback open={changeLifecycle.isError} severity="error" message="Unable to change the patient record status. Please try again." onClose={() => changeLifecycle.reset()} />
      <PageHeader
        eyebrow="Clinic records"
        title="Patients"
        description="Manage student, faculty, and staff clinic records."
        action={
          <Button
            onClick={() => {
              setForm(emptyForm);
              setFormOpen(true);
            }}
          >
            <UserPlus size={17} />
            Add patient manually
          </Button>
        }
      />
      {lastCreatedPatient && (
        <Alert severity="success" onClose={() => setLastCreatedPatient(null)}>
          Patient added. Their Patient ID is{' '}
          <Link to={`/patients/${lastCreatedPatient.id}`} className="font-semibold underline">
            {lastCreatedPatient.patientNumber}
          </Link>
          .
        </Alert>
      )}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5 }}>
        {[
          { label: lifecycle === 'ARCHIVED' ? 'Archived records' : 'Active records', value: tableData.length, helper: 'Shown in this view', icon: UsersRound, color: '#047857', bg: '#ecfdf5' },
          { label: 'Portal accounts', value: portalAccountCount, helper: 'Linked and message-ready', icon: UserCheck, color: '#0369a1', bg: '#f0f9ff' },
          { label: 'Needs completion', value: incompleteCount, helper: 'Missing ID or contact details', icon: CircleAlert, color: '#b45309', bg: '#fffbeb' },
        ].map((item) => <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2.5, boxShadow: '0 8px 24px rgba(15, 23, 42, .04)' }}><Box sx={{ width: 42, height: 42, borderRadius: 2, display: 'grid', placeItems: 'center', color: item.color, bgcolor: item.bg }}><item.icon size={21} /></Box><Box><Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>{item.label}</Typography><Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}><Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2 }}>{item.value}</Typography><Typography variant="caption" color="text.secondary">{item.helper}</Typography></Box></Box></Box>)}
      </Box>
      <Card title="Patient directory" description="Search, filter, and select a row to open the complete patient profile." className="overflow-hidden">
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { sm: 'center' },
            justifyContent: 'space-between',
            gap: 1.5,
            px: 2.5,
            py: 2,
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'rgba(248, 250, 252, .75)',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 1,
              width: { xs: '100%', sm: 'auto' },
            }}
          >
            <Box sx={{ width: { xs: '100%', sm: 340 } }}>
              <SearchInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by ID, name, or email"
              />
            </Box>
            <FormField
              select
              size="small"
              label="Patient type"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="">All types</MenuItem>
              <MenuItem value="STUDENT">Students</MenuItem>
              <MenuItem value="FACULTY">Faculty</MenuItem>
              <MenuItem value="STAFF">Staff</MenuItem>
            </FormField>
            <FormField
              select
              size="small"
              label="Record status"
              value={lifecycle}
              onChange={(event) => setLifecycle(event.target.value as 'ACTIVE' | 'ARCHIVED')}
              sx={{ minWidth: 145 }}
            >
              <MenuItem value="ACTIVE">Active</MenuItem>
              <MenuItem value="ARCHIVED">Archived</MenuItem>
            </FormField>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {patients.data ? `${patients.data.length} record${patients.data.length === 1 ? '' : 's'} shown` : 'Loading records'}
          </Typography>
        </Box>
        {patients.isLoading && <LoadingState label="Loading patient records..." />}
        {patients.isError && (
          <ErrorState message="Unable to load patient records. Please try again." onRetry={() => void patients.refetch()} retrying={patients.isFetching} />
        )}
        {patients.isSuccess && patients.data.length === 0 && (
          <EmptyState
            title="No patients found"
            description={
              search
                ? 'Try a different name, ID number, or email.'
                : lifecycle === 'ARCHIVED' ? 'Archived patient records will appear here.' : 'Add a patient manually to create the first clinic record.'
            }
            action={search || typeFilter || lifecycle === 'ARCHIVED'
              ? <Button variant="secondary" onClick={() => { setSearch(''); setTypeFilter(''); setLifecycle('ACTIVE'); }}>Clear filters</Button>
              : <Button onClick={() => setFormOpen(true)}><UserPlus size={16} />Add patient</Button>}
          />
        )}
        {patients.isSuccess && patients.data.length > 0 && (
          <DataTable
            columns={patientColumns}
            data={tableData}
            onRowClick={(row) => navigate(`/patients/${row.id}`)}
            pagination={false}
            sortField="patientNumber"
            sortOrder="asc"
            rowKey="id"
            embedded
          />
        )}
      </Card>
      <Modal
        open={formOpen}
        onClose={closeForm}
        title="Add patient manually"
        description="Enter the identity and contact details available to the clinic."
        maxWidth="lg"
      >
        <Box
          component="form"
          onSubmit={(event) => {
            event.preventDefault();
            savePatient.mutate();
          }}
          sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}
        >
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <FormField
              fullWidth
              size="small"
              label="Patient ID"
              value="Automatically assigned when saved"
              disabled
            />
            <FormField
              select
              required
              fullWidth
              size="small"
              label="Patient type"
              value={form.type}
              onChange={(event) => setField('type', event.target.value)}
            >
              <MenuItem value="STUDENT">Student</MenuItem>
              <MenuItem value="FACULTY">Faculty</MenuItem>
              <MenuItem value="STAFF">Staff</MenuItem>
            </FormField>
            <FormField fullWidth size="small" label="First name" value={form.firstName} onChange={(e) => setField('firstName', e.target.value)} required />
            <FormField fullWidth size="small" label="Middle name" value={form.middleName} onChange={(e) => setField('middleName', e.target.value)} />
            <FormField fullWidth size="small" label="Last name" value={form.lastName} onChange={(e) => setField('lastName', e.target.value)} required />
            <FormField fullWidth size="small" label="Email" type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} />
            <FormField fullWidth size="small" label="Mobile number" value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
            <FormField fullWidth size="small" label="Landline number" value={form.landline} onChange={(e) => setField('landline', e.target.value)} />
            <FormField
              fullWidth
              size="small"
              label={form.type === 'STUDENT' ? 'Student ID' : 'Employee ID'}
              value={form.institutionalId}
              onChange={(e) => setField('institutionalId', e.target.value)}
              required={form.type === 'STUDENT' ? Boolean(form.program) : Boolean(form.department)}
              helperText={
                form.type === 'STUDENT'
                  ? 'Required when a program is supplied'
                  : 'Required when a department is supplied'
              }
            />
            <FormField
              fullWidth
              size="small"
              label="Program / Department"
              value={form.type === 'STUDENT' ? form.program : form.department}
              onChange={(event) =>
                setField(form.type === 'STUDENT' ? 'program' : 'department', event.target.value)
              }
            />
          </Box>
          {savePatient.isError && (
            <Alert severity="error">
              {saveErrorMessage || 'Unable to save this patient. Please try again.'}
            </Alert>
          )}
          <Divider />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button type="button" variant="secondary" onClick={closeForm}>
              Cancel
            </Button>
            <Button type="submit" loading={savePatient.isPending}>
              Add patient
            </Button>
          </Box>
        </Box>
      </Modal>
      <ConfirmDialog
        open={Boolean(lifecycleAction)}
        onClose={() => setLifecycleAction(null)}
        onConfirm={() => lifecycleAction && changeLifecycle.mutate(lifecycleAction)}
        title={lifecycleAction && lifecycleAction.restore ? 'Restore patient record' : 'Archive patient record'}
        description={lifecycleAction
          ? lifecycleAction.restore
            ? `Restore ${lifecycleAction.patient.firstName} ${lifecycleAction.patient.lastName} to active status?`
            : `Archive ${lifecycleAction.patient.firstName} ${lifecycleAction.patient.lastName}? This will hide the record from active lists.`
          : ''}
        confirmLabel={lifecycleAction && lifecycleAction.restore ? 'Restore' : 'Archive'}
        variant={lifecycleAction && lifecycleAction.restore ? 'primary' : 'danger'}
        isConfirmLoading={changeLifecycle.isPending}
      />
    </Box>
  );
}
