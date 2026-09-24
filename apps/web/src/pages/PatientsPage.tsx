import { Link } from 'react-router-dom';
import { Archive, Pencil, RotateCcw, UserPlus } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { EmptyState, ErrorState, LoadingState, MutationFeedback } from '../components/ui/States';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { SearchInput } from '../components/ui/SearchInput';
import { archivePatient, createPatient, getPatients, restorePatient, type Patient, updatePatient } from '../services/api';

type PatientForm = {
  institutionalId: string;
  type: Patient['type'];
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phone: string;
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
  program: '',
  department: '',
  yearLevel: '',
};

export function PatientsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [lifecycle, setLifecycle] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  const [form, setForm] = useState<PatientForm>(emptyForm);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [formOpen, setFormOpen] = useState(false);
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
    setEditing(null);
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
        program: form.program || undefined,
        department: form.department || undefined,
        yearLevel: form.yearLevel ? Number(form.yearLevel) : undefined,
        studentId: form.type === 'STUDENT' ? form.institutionalId || undefined : undefined,
        employeeId: form.type !== 'STUDENT' ? form.institutionalId || undefined : undefined,
      };
      return editing ? updatePatient(editing.id, data) : createPatient(data);
    },
    onSuccess: (patient) => {
      if (!editing) setLastCreatedPatient(patient);
      else setSuccessMessage('Patient changes saved successfully.');
      void queryClient.invalidateQueries({ queryKey: ['patients'] });
      closeForm();
    },
  });
  const changeLifecycle = useMutation({
    mutationFn: ({ patient, restore }: { patient: Patient; restore: boolean }) => restore ? restorePatient(patient.id) : archivePatient(patient.id),
    onSuccess: (_patient, variables) => {
      setSuccessMessage(variables.restore ? 'Patient record restored.' : 'Patient record archived.');
      void queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
  const openEdit = (patient: Patient) => {
    setEditing(patient);
    setFormOpen(true);
    setForm({
      ...emptyForm,
      institutionalId:
        patient.studentProfile?.studentId || patient.employeeProfile?.employeeId || '',
      type: patient.type,
      firstName: patient.firstName,
      middleName: patient.middleName || '',
      lastName: patient.lastName,
      email: patient.email || '',
      phone: patient.phone || '',
      program: patient.studentProfile?.program || '',
      department: patient.employeeProfile?.department || '',
    });
  };
  const responseMessage = (
    savePatient.error as { response?: { data?: { message?: string | string[] } } } | null
  )?.response?.data?.message;
  const saveErrorMessage = Array.isArray(responseMessage)
    ? responseMessage.join(' ')
    : responseMessage;
  const input = (
    key: keyof PatientForm,
    label: string,
    options?: { required?: boolean; type?: string; helperText?: string },
  ) => (
    <TextField
      fullWidth
      size="small"
      required={options?.required}
      type={options?.type}
      label={label}
      helperText={options?.helperText}
      value={form[key]}
      onChange={(event) => setField(key, event.target.value)}
    />
  );

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
              setEditing(null);
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
      <Card className="overflow-hidden">
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
            bgcolor: '#f8faf9',
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
            <Box sx={{ width: { xs: '100%', sm: 290 } }}>
              <SearchInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by ID, name, or email"
              />
            </Box>
            <TextField
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
            </TextField>
            <TextField select size="small" label="Record status" value={lifecycle} onChange={(event) => setLifecycle(event.target.value as 'ACTIVE' | 'ARCHIVED')} sx={{ minWidth: 145 }}>
              <MenuItem value="ACTIVE">Active</MenuItem>
              <MenuItem value="ARCHIVED">Archived</MenuItem>
            </TextField>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {patients.data ? `${patients.data.length} records shown` : 'Loading records'}
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
          <TableContainer>
            <Table sx={{ minWidth: 860, tableLayout: 'fixed' }}>
              <TableHead>
                <TableRow>
                  {[
                    'Patient ID',
                    'Name',
                    'Type',
                    'Program / Department',
                    'Last Visit',
                    'Status',
                    '',
                  ].map((heading) => (
                    <TableCell
                      key={heading}
                      sx={{
                        py: 1.5,
                        width:
                          heading === 'Patient ID'
                            ? 150
                            : heading === 'Name'
                              ? 210
                              : heading === 'Type'
                                ? 90
                                : heading === 'Program / Department'
                                  ? 150
                                  : heading === 'Last Visit'
                                    ? 110
                                    : heading === 'Status'
                                      ? 120
                                      : 84,
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: '.1em',
                        textTransform: 'uppercase',
                        color: 'text.secondary',
                      }}
                    >
                      {heading}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {patients.data.map((patient) => {
                  const lastVisit = patient.visits?.[0];
                  return (
                    <TableRow hover key={patient.id}>
                      <TableCell sx={{ fontSize: 13, fontWeight: 600 }}>
                        <Box
                          component="span"
                          title={patient.patientNumber}
                          sx={{
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {patient.patientNumber}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography
                          component={Link}
                          to={`/patients/${patient.id}`}
                          sx={{
                            color: 'text.primary',
                            fontSize: 13,
                            fontWeight: 700,
                            textDecoration: 'none',
                            '&:hover': { color: 'primary.main' },
                          }}
                        >
                          {patient.lastName}, {patient.firstName}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block' }}
                        >
                          {patient.email || 'No email recorded'}
                        </Typography>
                        {(!patient.phone || !(patient.studentProfile?.studentId || patient.employeeProfile?.employeeId)) && <Typography variant="caption" color="warning.main" sx={{ display: 'block' }}>Profile incomplete</Typography>}
                      </TableCell>
                      <TableCell>
                        <Badge>{patient.type}</Badge>
                      </TableCell>
                      <TableCell sx={{ fontSize: 13, color: 'text.secondary' }}>
                        {patient.studentProfile?.program ||
                          patient.employeeProfile?.department ||
                          'Not recorded'}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>
                        {lastVisit ? (
                          <>
                            {new Date(lastVisit.visitDate).toLocaleDateString()}
                            <Typography variant="caption" sx={{ display: 'block' }}>
                              {lastVisit.status}
                            </Typography>
                          </>
                        ) : (
                          'No visits'
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={lifecycle === 'ARCHIVED' ? 'warning' : patient.user ? 'success' : 'neutral'}>
                          {lifecycle === 'ARCHIVED' ? 'Archived' : patient.user ? 'Portal account' : 'Manual entry'}
                        </Badge>
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: .75 }}>
                          {lifecycle === 'ACTIVE' && <Button variant="secondary" onClick={() => openEdit(patient)}><Pencil size={15} />Edit</Button>}
                          <Button variant="secondary" loading={changeLifecycle.isPending} onClick={() => changeLifecycle.mutate({ patient, restore: lifecycle === 'ARCHIVED' })}>
                            {lifecycle === 'ARCHIVED' ? <RotateCcw size={15} /> : <Archive size={15} />}
                            {lifecycle === 'ARCHIVED' ? 'Restore' : 'Archive'}
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editing ? 'Edit patient' : 'Add patient manually'}
        description="Enter the identity and contact details available to the clinic."
        className="max-w-2xl"
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
            <TextField
              fullWidth
              size="small"
              label="Patient ID"
              value={editing?.patientNumber ?? 'Automatically assigned when saved'}
              slotProps={{ input: { readOnly: true } }}
            />
            <TextField
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
            </TextField>
            {input('firstName', 'First name', { required: true })}
            {input('middleName', 'Middle name')}
            {input('lastName', 'Last name', { required: true })}
            {input('email', 'Email', { type: 'email' })}
            {input('phone', 'Mobile number')}
            {input('institutionalId', form.type === 'STUDENT' ? 'Student ID' : 'Employee ID', {
              required: form.type === 'STUDENT' ? Boolean(form.program) : Boolean(form.department),
              helperText:
                form.type === 'STUDENT'
                  ? 'Required when a program is supplied'
                  : 'Required when a department is supplied',
            })}
            <TextField
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
              {editing ? 'Save changes' : 'Add patient'}
            </Button>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
}
