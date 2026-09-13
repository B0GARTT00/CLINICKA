import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Search, UserRound, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { getPatients, type Patient } from '../services/api';

function patientLabel(patient: Patient) {
  return `${patient.lastName}, ${patient.firstName}`;
}

function patientMeta(patient: Patient) {
  const extra = patient.studentProfile?.studentId
    || patient.employeeProfile?.employeeId
    || patient.email
    || patient.type.replace('_', ' ').toLowerCase();
  return `${patient.patientNumber} · ${extra}`;
}

export function PatientPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (patientId: string) => void;
  disabled?: boolean;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Patient | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    if (!value && selected) {
      setSelected(null);
      setQuery('');
    }
  }, [selected, value]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const patients = useQuery({
    queryKey: ['patient-picker', debouncedQuery],
    queryFn: () => getPatients(debouncedQuery || undefined, 1, 12),
    enabled: open,
  });

  const selectPatient = (patient: Patient) => {
    setSelected(patient);
    setQuery(patientLabel(patient));
    onChange(patient.id);
    setOpen(false);
  };

  const clearSelection = () => {
    setSelected(null);
    setQuery('');
    onChange('');
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <span className="field-label">Patient</span>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-medical-400" />
        <input
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open}
          autoComplete="off"
          className="field-input pr-16 pl-9"
          disabled={disabled}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelected(null);
            onChange('');
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search name or patient ID"
          required
          role="combobox"
          value={query}
        />
        {query ? (
          <button
            aria-label="Clear patient"
            className="absolute right-8 top-1/2 -translate-y-1/2 rounded p-0.5 text-medical-400 hover:text-medical-700"
            onClick={clearSelection}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-medical-400" />
      </div>
      {selected && (
        <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-medical-500">
          <UserRound className="h-3.5 w-3.5 text-brokenshire-600" />
          <span className="font-semibold text-medical-800">{patientLabel(selected)}</span>
          <span>· {patientMeta(selected)}</span>
        </p>
      )}
      {open && (
        <ul
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-medical-200 bg-white py-1 shadow-lg"
          id={listId}
          role="listbox"
        >
          {patients.isLoading && <li className="px-3 py-2 text-[12px] text-medical-500">Searching patients...</li>}
          {patients.isError && <li className="px-3 py-2 text-[12px] text-rose-600">Unable to load patients.</li>}
          {patients.data?.length === 0 && <li className="px-3 py-2 text-[12px] text-medical-500">No matching patients.</li>}
          {patients.data?.map((patient) => (
            <li key={patient.id} role="option" aria-selected={selected?.id === patient.id}>
              <button
                className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-medical-50"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectPatient(patient)}
                type="button"
              >
                <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-brokenshire-600" />
                <span>
                  <span className="block text-[13px] font-semibold text-medical-900">{patientLabel(patient)}</span>
                  <span className="block text-[11px] text-medical-500">{patientMeta(patient)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
