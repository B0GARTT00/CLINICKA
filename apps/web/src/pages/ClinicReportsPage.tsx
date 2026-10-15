import { useState, type Dispatch, type SetStateAction } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Alert, Box, Button, Collapse, MenuItem, Paper, TextField, Typography } from '@mui/material';
import { DataTable } from '../components/ui/DataTable';
import { ErrorState, LoadingState, MutationFeedback } from '../components/ui/States';
import { PageHeader } from '../components/ui/PageHeader';
import { permissionsForRoles } from '../auth/authorization';
import { useAuth } from '../hooks/useAuth';
import { exportClinicReport, getClinicLogbook, getClinicReportOptions, getClinicUtilization, getMedicineSummary, type ClinicReportFilters } from '../services/api';
import { OperationalReportsPage } from './ReportsPage';

function defaults(): ClinicReportFilters {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  return { from: today.slice(0, 7) + '-01', to: today, grouping: 'WEEK' };
}

export function ReportsPage() {
  const [view, setView] = useState<'overview' | 'utilization' | 'medicine-summary' | 'logbook'>('overview');
  const [draft, setDraft] = useState<ClinicReportFilters>(defaults);
  const [filters, setFilters] = useState<ClinicReportFilters>(defaults);
  const auth = useAuth();
  const permissions = permissionsForRoles(auth.user?.roles || []);
  if (view === 'overview') return <OperationalReportsPage onOpenReport={(kind, period) => {
    if (kind === 'logbook' && !permissions.has('clinical.read')) return;
    const next: ClinicReportFilters = { from: period.from, to: period.to, grouping: 'WEEK', patientType: period.patientType === 'ALL' ? undefined : period.patientType };
    setFilters(next); setDraft(next); setView(kind);
  }} initialPeriod={filters} />;
  return <Box sx={{ display: 'grid', gap: 3 }}>
    <Box><Button onClick={() => setView('overview')}>← Back to reports overview</Button></Box>
    <PageHeader title="Reports" description="Clinic statistics, medicine usage, and records for accreditation." />
    <ClinicReport key={view} kind={view} canExport={permissions.has('reports.export')} draft={draft} setDraft={setDraft} filters={filters} setFilters={setFilters} />
  </Box>;
}

function ClinicReport({ kind, canExport, draft, setDraft, filters, setFilters }: { kind: 'utilization' | 'medicine-summary' | 'logbook'; canExport: boolean; draft: ClinicReportFilters; setDraft: Dispatch<SetStateAction<ClinicReportFilters>>; filters: ClinicReportFilters; setFilters: Dispatch<SetStateAction<ClinicReportFilters>> }) {
  const [page, setPage] = useState(1);
  const [moreFilters, setMoreFilters] = useState(false);
  const [breakdown, setBreakdown] = useState<'departments' | 'programs' | 'patientTypes' | 'weeks' | 'months'>('departments');
  const options = useQuery({ queryKey: ['clinic-report-options'], queryFn: getClinicReportOptions });
  const utilization = useQuery({ queryKey: ['clinic-utilization', filters], queryFn: () => getClinicUtilization(filters), enabled: kind === 'utilization' });
  const medicines = useQuery({ queryKey: ['medicine-summary', filters], queryFn: () => getMedicineSummary(filters), enabled: kind === 'medicine-summary' });
  const logbook = useQuery({ queryKey: ['clinic-logbook', filters, page], queryFn: () => getClinicLogbook({ ...filters, page, limit: 25 }), enabled: kind === 'logbook' });
  const download = useMutation({ mutationFn: () => exportClinicReport(kind, filters) });
  const active = kind === 'utilization' ? utilization : kind === 'medicine-summary' ? medicines : logbook;
  const departments = options.data?.departments || [];
  const programs = departments.filter(item => !draft.departmentId || item.id === draft.departmentId).flatMap(item => item.programs);
  const years = options.data?.academicYears || [];
  const semesters = years.filter(item => !draft.academicYearId || item.id === draft.academicYearId).flatMap(item => item.semesters);
  const invalid = !draft.from || !draft.to || draft.from > draft.to;
  const pendingFilters = JSON.stringify(draft) !== JSON.stringify(filters);
  const titles = { utilization: ['Clinic visits', 'See how many visits the clinic handled and how many different people used its services.'], 'medicine-summary': ['Medicine usage', 'Review the quantity of each medicine dispensed by week or month.'], logbook: ['Clinic logbook', 'Review individual visits, diagnoses, prescriptions, and follow-up instructions.'] };
  const periodLabel = (value: string) => new Date(value + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const activeLabels = [
    departments.find(item => item.id === filters.departmentId)?.name,
    departments.flatMap(item => item.programs).find(item => item.id === filters.programId)?.name,
    filters.patientType ? { STUDENT: 'Students', FACULTY: 'Faculty', STAFF: 'Staff' }[filters.patientType] : undefined,
    years.find(item => item.id === filters.academicYearId)?.label,
    years.flatMap(item => item.semesters).find(item => item.id === filters.semesterId)?.label,
  ].filter(Boolean);
  const groupColumns = [{ field: 'label', header: 'Group / period' }, { field: 'visits', header: 'Total visits' }, { field: 'uniquePatients', header: 'Unique patients' }];
  return <Box sx={{ display: 'grid', gap: 2.5 }}>
    <Box><Typography variant="h6">{titles[kind][0]}</Typography><Typography variant="body2" color="text.secondary">{titles[kind][1]}</Typography></Box>
    <Paper variant="outlined" component="form" onSubmit={event => { event.preventDefault(); if (!invalid) { setFilters({ ...draft }); setPage(1); } }} sx={{ p: 2.5, display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(4,1fr)' } }}>
      <TextField label="From" type="date" value={draft.from} required onChange={event => setDraft({ ...draft, from: event.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
      <TextField label="To" type="date" value={draft.to} required error={invalid} helperText="Maximum 366 days" onChange={event => setDraft({ ...draft, to: event.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
      <TextField select label="Department" value={draft.departmentId || ''} onChange={event => setDraft({ ...draft, departmentId: event.target.value || undefined, programId: undefined })}><MenuItem value="">All departments</MenuItem>{departments.map(item => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}</TextField>
      {kind === 'medicine-summary' && <TextField select label="Group by" value={draft.grouping} onChange={event => setDraft({ ...draft, grouping: event.target.value as 'WEEK' | 'MONTH' })}><MenuItem value="WEEK">Week</MenuItem><MenuItem value="MONTH">Month</MenuItem></TextField>}
      <Button type="submit" variant="contained" disabled={invalid}>Update report</Button>
      <Box sx={{ gridColumn: '1 / -1', display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button type="button" aria-expanded={moreFilters} aria-controls="report-extra-filters" onClick={() => setMoreFilters(!moreFilters)}>{moreFilters ? 'Hide extra filters' : 'More filters'}</Button>
        <Button type="button" onClick={() => { const initial = defaults(); setDraft(initial); setFilters(initial); setPage(1); }}>Reset filters</Button>
      </Box>
      <Collapse id="report-extra-filters" in={moreFilters} unmountOnExit sx={{ gridColumn: '1 / -1' }}><Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } }}>
      <TextField select label="Patient type" value={draft.patientType || ''} onChange={event => setDraft({ ...draft, patientType: event.target.value as ClinicReportFilters['patientType'] || undefined })}>
        <MenuItem value="">All types</MenuItem><MenuItem value="STUDENT">Students</MenuItem><MenuItem value="FACULTY">Faculty</MenuItem><MenuItem value="STAFF">Staff</MenuItem>
      </TextField>
      <TextField select label="Program / course" value={draft.programId || ''} onChange={event => setDraft({ ...draft, programId: event.target.value || undefined })}><MenuItem value="">All programs</MenuItem>{programs.map(item => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}</TextField>
      <TextField select label="Academic year" value={draft.academicYearId || ''} onChange={event => setDraft({ ...draft, academicYearId: event.target.value || undefined, semesterId: undefined })}><MenuItem value="">All academic years</MenuItem>{years.map(item => <MenuItem key={item.id} value={item.id}>{item.label}</MenuItem>)}</TextField>
      <TextField select label="Semester" value={draft.semesterId || ''} onChange={event => setDraft({ ...draft, semesterId: event.target.value || undefined })}><MenuItem value="">All semesters</MenuItem>{semesters.map(item => <MenuItem key={item.id} value={item.id}>{item.label}</MenuItem>)}</TextField>
      </Box></Collapse>
    </Paper>
    {options.isError && <Alert severity="warning" action={<Button onClick={() => void options.refetch()}>Retry</Button>}>Unable to load department and academic filter options.</Alert>}
    <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
      <Box><Typography sx={{ fontWeight: 600 }}>{periodLabel(filters.from)} – {periodLabel(filters.to)}</Typography><Typography variant="body2" color="text.secondary">{activeLabels.length ? activeLabels.join(' · ') : 'All departments · All patient types'}</Typography></Box>
      {canExport && <Button variant="outlined" disabled={active.isLoading || active.isError || download.isPending || pendingFilters} onClick={() => download.mutate()}>Download CSV</Button>}
    </Box>
    {pendingFilters && <Typography role="status" variant="body2" color="text.secondary">Filters changed. Select Update report to refresh the results.</Typography>}
    {kind === 'logbook' && <Typography variant="body2" color="text.secondary">Confidential patient records — for authorized clinic personnel.</Typography>}
    <MutationFeedback open={download.isSuccess} message="CSV exported and recorded in the audit log." onClose={() => download.reset()} />
    {download.isError && <Alert severity="error">Unable to export. Try again, or narrow the logbook date range if it exceeds 5,000 visits.</Alert>}
    {active.isLoading && <LoadingState label="Loading clinic report..." />}
    {active.isError && <ErrorState message="Unable to load this report. Check the date range and selected academic period." onRetry={() => void active.refetch()} />}
    {kind === 'utilization' && utilization.data && <>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } }}>
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}><Typography color="text.secondary">Total visits</Typography><Typography variant="h4" sx={{ my: 1, fontWeight: 700 }}>{utilization.data.totalVisits}</Typography><Typography variant="body2" color="text.secondary">Each clinic visit counts, including repeat visits.</Typography></Paper>
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}><Typography color="text.secondary">Unique patients</Typography><Typography variant="h4" sx={{ my: 1, fontWeight: 700 }}>{utilization.data.uniquePatients}</Typography><Typography variant="body2" color="text.secondary">Each person counts once in this date range.</Typography></Paper>
      </Box>
      <TextField select label="Break down visits by" value={breakdown} onChange={event => setBreakdown(event.target.value as typeof breakdown)} sx={{ maxWidth: 300 }}>
        <MenuItem value="departments">Department</MenuItem><MenuItem value="programs">Program / course</MenuItem><MenuItem value="patientTypes">Patient type</MenuItem><MenuItem value="weeks">Week</MenuItem><MenuItem value="months">Month</MenuItem>
      </TextField>
      <DataTable key={breakdown} columns={groupColumns} data={utilization.data[breakdown]} emptyMessage="No visits match the selected filters." />
      {(breakdown === 'weeks' || breakdown === 'months') && <Typography variant="caption" color="text.secondary">Totals include only visits within the selected date range. Weeks start Monday.</Typography>}
    </>}
    {kind === 'medicine-summary' && medicines.data && <DataTable columns={[
      { field: 'period', header: filters.grouping === 'MONTH' ? 'Month' : 'Week starting' }, { field: 'medicine', header: 'Medicine' }, { field: 'quantity', header: 'Quantity dispensed' }, { field: 'unit', header: 'Unit' }, { field: 'transactions', header: 'Dispensing transactions' },
    ]} data={medicines.data.rows} emptyMessage="No medicines dispensed in the selected period." />}
    {kind === 'logbook' && logbook.data && <>
      <DataTable pagination={false} columns={[
        { field: 'date', header: 'Date' }, { field: 'patient', header: 'Patient' }, { field: 'gender', header: 'Gender' }, { field: 'age', header: 'Age' },
        { field: 'positionCourse', header: 'Position / course' }, { field: 'diagnosis', header: 'Diagnosis' }, { field: 'medicalOrders', header: 'Medical orders / prescription' }, { field: 'remarksFollowUp', header: 'Remarks / follow-up' },
      ]} data={logbook.data.rows} emptyMessage="No clinic visits match the selected filters." />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}><Button disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button><Typography variant="body2">Page {page} of {Math.max(1, Math.ceil(logbook.data.total / 25))} · {logbook.data.total} visits</Typography><Button disabled={page * 25 >= logbook.data.total} onClick={() => setPage(page + 1)}>Next</Button></Box>
    </>}
  </Box>;
}
