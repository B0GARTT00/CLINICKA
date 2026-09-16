import { Link } from 'react-router-dom';
import { Pencil, UserPlus, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ErrorState, LoadingState, EmptyState } from '../components/ui/States';
import { PageHeader } from '../components/ui/PageHeader';
import { SearchInput } from '../components/ui/SearchInput';
import { createPatient, getPatients, type Patient, updatePatient } from '../services/api';
import { useState } from 'react';

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
  const [form, setForm] = useState<PatientForm>(emptyForm);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [lastCreatedPatient, setLastCreatedPatient] = useState<Patient | null>(null);
  const queryClient = useQueryClient();
  const patients = useQuery({
    queryKey: ['patients', search, typeFilter],
    queryFn: () =>
      getPatients(
        search || undefined,
        1,
        20,
        (typeFilter || undefined) as Patient['type'] | undefined,
      ),
  });
  const closeForm = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(false);
  };
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
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      closeForm();
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
  const setField = (field: keyof PatientForm, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));
  const responseMessage = (savePatient.error as { response?: { data?: { message?: string | string[] } } } | null)?.response?.data?.message;
  const saveErrorMessage = Array.isArray(responseMessage) ? responseMessage.join(' ') : responseMessage;

  return (
    <div className="space-y-6">
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
            <UserPlus className="h-4 w-4" />
            Add patient manually
          </Button>
        }
      />
      {lastCreatedPatient && (
        <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-brokenshire-200 bg-brokenshire-50 px-4 py-3 text-[13px] text-medical-800">
          <p>
            Patient added. Their Patient ID is{' '}
            <Link to={`/patients/${lastCreatedPatient.id}`} className="font-semibold text-brokenshire-700 underline">
              {lastCreatedPatient.patientNumber}
            </Link>.
          </p>
          <button type="button" onClick={() => setLastCreatedPatient(null)} aria-label="Dismiss patient ID notice" className="text-medical-500 hover:text-medical-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-medical-100 bg-medical-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row">
            <SearchInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by ID, name, or email"
              className="w-full sm:w-72"
            />
            <select
              aria-label="Filter by patient type"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="field-input w-full sm:w-36"
            >
              <option value="">All types</option>
              <option value="STUDENT">Students</option>
              <option value="FACULTY">Faculty</option>
              <option value="STAFF">Staff</option>
            </select>
          </div>
          <span className="text-[12px] text-medical-500">
            {patients.data ? `${patients.data.length} records shown` : 'Loading records'}
          </span>
        </div>
        {patients.isLoading && <LoadingState label="Loading patient records..." />}
        {patients.isError && (
          <ErrorState message="Unable to load patient records. Please try again." />
        )}
        {patients.isSuccess && patients.data.length === 0 && (
          <EmptyState
            title="No patients found"
            description={
              search
                ? 'Try a different name, ID number, or email.'
                : 'Registered patients will appear here.'
            }
          />
        )}
        {patients.isSuccess && patients.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] divide-y divide-medical-100 text-left">
              <thead className="bg-white">
                <tr className="text-[10px] font-semibold uppercase tracking-widest text-medical-500">
                  <th className="px-5 py-3">Patient ID</th>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Program / Department</th>
                  <th className="px-5 py-3">Last Visit</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-medical-100">
                {patients.data.map((patient) => {
                  const lastVisit = patient.visits?.[0];
                  return (
                    <tr key={patient.id} className="text-[13px] transition hover:bg-medical-50">
                      <td className="px-5 py-4 font-medium text-medical-800">
                        {patient.patientNumber}
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          to={`/patients/${patient.id}`}
                          className="font-semibold text-medical-900 hover:text-brokenshire-700"
                        >
                          {patient.lastName}, {patient.firstName}
                        </Link>
                        <p className="mt-0.5 text-[11px] text-medical-500">
                          {patient.email || 'No email recorded'}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant="neutral">{patient.type}</Badge>
                      </td>
                      <td className="px-5 py-4 text-medical-600">
                        {patient.studentProfile?.program ||
                          patient.employeeProfile?.department ||
                          'Not recorded'}
                      </td>
                      <td className="px-5 py-4 text-medical-500">
                        {lastVisit ? (
                          <>
                            <span>{new Date(lastVisit.visitDate).toLocaleDateString()}</span>
                            <span className="mt-0.5 block text-[10px] uppercase tracking-wide text-medical-400">
                              {lastVisit.status}
                            </span>
                          </>
                        ) : (
                          'No visits'
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={patient.user ? 'success' : 'neutral'}>
                          {patient.user ? 'Portal account' : 'Manual entry'}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="inline-flex items-center gap-3">
                          <Link
                            to={`/patients/${patient.id}`}
                            className="text-[12px] font-semibold text-brokenshire-700 hover:underline"
                          >
                            View
                          </Link>
                          <button
                            onClick={() => openEdit(patient)}
                            className="inline-flex items-center gap-1 text-[12px] font-semibold text-medical-500 hover:text-brokenshire-700"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {formOpen && (
        <div
          className="fixed inset-0 z-30 grid place-items-center bg-medical-900/35 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForm();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="patient-form-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-medical-200 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-medical-100 px-6 py-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-brokenshire-600">
                  Patient records
                </p>
                <h2
                  id="patient-form-title"
                  className="mt-1 text-xl font-semibold tracking-tight text-medical-900"
                >
                  {editing ? 'Edit patient' : 'Add patient manually'}
                </h2>
                <p className="mt-1 text-[13px] text-medical-500">
                  Enter the identity and contact details available to the clinic.
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                className="grid h-8 w-8 place-items-center rounded-lg text-medical-400 hover:bg-medical-50"
                aria-label="Close patient form"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form
              className="space-y-5 p-6"
              onSubmit={(event) => {
                event.preventDefault();
                savePatient.mutate();
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="field-label">Patient ID</span>
                  <input
                    readOnly
                    value={editing?.patientNumber ?? 'Automatically assigned when saved'}
                    className="field-input cursor-default bg-medical-50 text-medical-600"
                  />
                </label>
                <label className="block">
                  <span className="field-label">
                    Patient type <b>*</b>
                  </span>
                  <select
                    required
                    value={form.type}
                    onChange={(event) => setField('type', event.target.value as Patient['type'])}
                    className="field-input"
                  >
                    <option value="STUDENT">Student</option>
                    <option value="FACULTY">Faculty</option>
                    <option value="STAFF">Staff</option>
                  </select>
                </label>
                <label className="block">
                  <span className="field-label">
                    First name <b>*</b>
                  </span>
                  <input
                    required
                    value={form.firstName}
                    onChange={(event) => setField('firstName', event.target.value)}
                    className="field-input"
                  />
                </label>
                <label className="block">
                  <span className="field-label">Middle name</span>
                  <input
                    value={form.middleName}
                    onChange={(event) => setField('middleName', event.target.value)}
                    className="field-input"
                  />
                </label>
                <label className="block">
                  <span className="field-label">
                    Last name <b>*</b>
                  </span>
                  <input
                    required
                    value={form.lastName}
                    onChange={(event) => setField('lastName', event.target.value)}
                    className="field-input"
                  />
                </label>
                <label className="block">
                  <span className="field-label">Email</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => setField('email', event.target.value)}
                    className="field-input"
                  />
                </label>
                <label className="block">
                  <span className="field-label">Mobile number</span>
                  <input
                    value={form.phone}
                    onChange={(event) => setField('phone', event.target.value)}
                    className="field-input"
                  />
                </label>
                <label className="block">
                  <span className="field-label">
                    {form.type === 'STUDENT' ? 'Student ID' : 'Employee ID'}
                    <span className="ml-1 normal-case tracking-normal text-medical-400">
                      {form.type === 'STUDENT'
                        ? form.program ? '(required for program)' : '(optional)'
                        : form.department ? '(required for department)' : '(optional)'}
                    </span>
                  </span>
                  <input
                    required={form.type === 'STUDENT' ? Boolean(form.program) : Boolean(form.department)}
                    value={form.institutionalId}
                    onChange={(event) => setField('institutionalId', event.target.value)}
                    className="field-input"
                  />
                </label>
                <label className="block">
                  <span className="field-label">Program / Department</span>
                  <input
                    value={form.type === 'STUDENT' ? form.program : form.department}
                    onChange={(event) =>
                      setField(
                        form.type === 'STUDENT' ? 'program' : 'department',
                        event.target.value,
                      )
                    }
                    className="field-input"
                  />
                </label>
              </div>
              {savePatient.isError && (
                <p className="rounded-xl border border-danger-100 bg-danger-50 px-3 py-2 text-[12px] text-danger-700">
                  {saveErrorMessage || 'Unable to save this patient. Please try again.'}
                </p>
              )}
              <div className="flex justify-end gap-2 border-t border-medical-100 pt-5">
                <Button type="button" variant="secondary" onClick={closeForm}>
                  Cancel
                </Button>
                <Button type="submit" loading={savePatient.isPending}>
                  {editing ? 'Save changes' : 'Add patient'}
                </Button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
