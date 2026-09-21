import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { UserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getPatients, type Patient } from '../services/api';

function patientLabel(patient: Patient) {
  return `${patient.lastName}, ${patient.firstName} · ${patient.patientNumber}`;
}

function patientMeta(patient: Patient) {
  return patient.studentProfile?.studentId || patient.employeeProfile?.employeeId || patient.email || patient.type.replace('_', ' ').toLowerCase();
}

export function PatientPicker({ value, onChange, disabled }: { value: string; onChange: (patientId: string) => void; disabled?: boolean }) {
  const [inputValue, setInputValue] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Patient | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(inputValue.trim()), 250);
    return () => window.clearTimeout(timeout);
  }, [inputValue]);

  useEffect(() => {
    if (!value) setSelected(null);
  }, [value]);

  const patients = useQuery({ queryKey: ['patient-picker', debouncedQuery], queryFn: () => getPatients(debouncedQuery || undefined, 1, 12), enabled: open });
  const options = useMemo(() => selected && !patients.data?.some((patient) => patient.id === selected.id) ? [selected, ...(patients.data || [])] : patients.data || [], [patients.data, selected]);

  return <Autocomplete
    open={open}
    onOpen={() => setOpen(true)}
    onClose={() => setOpen(false)}
    options={options}
    value={selected}
    inputValue={inputValue}
    disabled={disabled}
    loading={patients.isLoading}
    filterOptions={(items) => items}
    getOptionLabel={patientLabel}
    isOptionEqualToValue={(option, current) => option.id === current.id}
    noOptionsText={patients.isError ? 'Unable to load patients' : 'No matching patients'}
    onInputChange={(_, nextValue, reason) => {
      setInputValue(nextValue);
      if (reason === 'input' && selected && nextValue !== patientLabel(selected)) {
        setSelected(null);
        onChange('');
      }
    }}
    onChange={(_, patient) => {
      setSelected(patient);
      setInputValue(patient ? patientLabel(patient) : '');
      onChange(patient?.id || '');
    }}
    renderOption={(props, patient) => <Box component="li" {...props} key={patient.id} sx={{ display: 'flex', gap: 1.25, py: 1.25 }}><UserRound size={18} color="#006a4e"/><Box><Typography variant="body2" sx={{ fontWeight: 700 }}>{patient.lastName}, {patient.firstName}</Typography><Typography variant="caption" color="text.secondary">{patient.patientNumber} · {patientMeta(patient)}</Typography></Box></Box>}
    renderInput={(params) => <TextField {...params} required label="Patient" placeholder="Search name or patient ID" size="small" error={patients.isError} slotProps={{ ...params.slotProps, input: { ...params.slotProps.input, endAdornment: <>{patients.isLoading ? <CircularProgress color="inherit" size={17}/> : null}{params.slotProps.input.endAdornment}</> } }} />}
  />;
}
