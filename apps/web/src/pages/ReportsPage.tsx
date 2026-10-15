import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { Activity, CalendarDays, ClipboardCheck, Download, FileCheck, Package, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState, MutationFeedback } from '../components/ui/States';
import { permissionsForRoles } from '../auth/authorization';
import { useAuth } from '../hooks/useAuth';
import {
  exportOperationalReport,
  getOperationalReport,
  type OperationalReport,
  type ReportFilters,
  type ClinicReportFilters,
} from '../services/api';

const panel = 'rounded-2xl border border-slate-200/80 bg-white shadow-[0_10px_35px_rgba(15,54,64,0.055)]';

function dateInput(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function initialFilters(): ReportFilters {
  const today = new Date();
  return {
    from: dateInput(new Date(today.getFullYear(), today.getMonth(), 1)),
    to: dateInput(today),
    domain: 'ALL',
    patientType: 'ALL',
  };
}

function metrics(report: OperationalReport) {
  return [
    { label: 'Active patients', value: report.activePatients, icon: Users },
    ...(report.clinical ? [
      { label: 'Clinic visits', value: report.clinical.visits, icon: Activity },
      { label: 'Completed visits', value: report.clinical.completedVisits, icon: ShieldCheck },
      { label: 'Appointments', value: report.clinical.appointments, icon: CalendarDays },
    ] : []),
    ...(report.compliance ? [
      { label: 'Evidence submitted', value: report.compliance.evidenceSubmitted, icon: ClipboardCheck },
      { label: 'Evidence verified', value: report.compliance.evidenceVerified, icon: ShieldCheck },
      { label: 'Clearances requested', value: report.compliance.clearancesRequested, icon: FileCheck },
      { label: 'Clearances issued', value: report.compliance.clearancesIssued, icon: ShieldCheck },
    ] : []),
    ...(report.inventory ? [
      { label: 'Medicines', value: report.inventory.medicines, icon: Package },
      { label: 'Low-stock medicines', value: report.inventory.lowStock, icon: Package },
      { label: 'Inventory transactions', value: report.inventory.transactions, icon: RefreshCw },
    ] : []),
  ];
}

export function OperationalReportsPage({ onOpenReport, initialPeriod }: {
  onOpenReport?: (kind: 'utilization' | 'medicine-summary' | 'logbook', filters: ReportFilters) => void;
  initialPeriod?: ClinicReportFilters;
} = {}) {
  const auth = useAuth();
  const canExport = Boolean(auth.user && permissionsForRoles(auth.user.roles).has('reports.export'));
  const startingFilters = () => ({ ...initialFilters(), ...(initialPeriod ? { from: initialPeriod.from, to: initialPeriod.to, patientType: initialPeriod.patientType || 'ALL' as const } : {}) });
  const [draft, setDraft] = useState<ReportFilters>(startingFilters);
  const [filters, setFilters] = useState<ReportFilters>(startingFilters);
  const report = useQuery({ queryKey: ['operational-report', filters], queryFn: () => getOperationalReport(filters) });
  const exportReport = useMutation({ mutationFn: () => exportOperationalReport(filters) });
  const invalidRange = Boolean(draft.from && draft.to && draft.from > draft.to);
  const cards = report.data ? metrics(report.data) : [];
  const empty = Boolean(report.data && cards.every((card) => card.value === 0));

  return (
    <div className="space-y-5 pb-4">
      <MutationFeedback open={exportReport.isSuccess} message="Aggregate CSV exported. The export was recorded in the audit log." onClose={() => exportReport.reset()} />
      <header className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(125deg,#064e3b_0%,#08705b_58%,#0f766e_100%)] px-6 py-7 text-white shadow-[0_18px_45px_rgba(6,78,59,0.18)] sm:px-8">
        <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-emerald-200">Reports</p>
        <h1 className="mt-2 text-[32px] font-bold tracking-tight">Clinic reports</h1>
        <p className="mt-2 max-w-2xl text-[14px] text-emerald-50/85">A quick overview of clinic activity. Open a detailed report below to explore visits, medicine usage, or the clinic logbook.</p>
      </header>

      <form
        className={`${panel} grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto] xl:items-end`}
        onSubmit={(event) => { event.preventDefault(); if (!invalidRange) setFilters(draft); }}
      >
        <TextField label="From" type="date" value={draft.from} onChange={(event) => setDraft({ ...draft, from: event.target.value })} slotProps={{ inputLabel: { shrink: true } }} required />
        <TextField label="To" type="date" value={draft.to} onChange={(event) => setDraft({ ...draft, to: event.target.value })} slotProps={{ inputLabel: { shrink: true } }} required error={invalidRange} helperText={invalidRange ? 'End date must not be before start date.' : 'Maximum range: 366 days'} />
        <TextField select label="Report domain" value={draft.domain} onChange={(event) => setDraft({ ...draft, domain: event.target.value as ReportFilters['domain'] })}>
          <MenuItem value="ALL">All approved domains</MenuItem>
          <MenuItem value="CLINICAL">Clinical operations</MenuItem>
          <MenuItem value="COMPLIANCE">Requirements and clearances</MenuItem>
          <MenuItem value="INVENTORY">Inventory</MenuItem>
        </TextField>
        <TextField select label="Patient type" value={draft.patientType} onChange={(event) => setDraft({ ...draft, patientType: event.target.value as ReportFilters['patientType'] })} disabled={draft.domain === 'INVENTORY'}>
          <MenuItem value="ALL">All patient types</MenuItem>
          <MenuItem value="STUDENT">Students</MenuItem>
          <MenuItem value="FACULTY">Faculty</MenuItem>
          <MenuItem value="STAFF">Staff</MenuItem>
        </TextField>
        <Button type="submit" variant="contained" disabled={invalidRange} sx={{ minHeight: 48 }}>Apply filters</Button>
      </form>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Clinic overview</h2>
          {report.data && <p className="mt-1 text-sm text-slate-500">{report.data.period.from} through {report.data.period.to} · {report.data.filters.domain.toLowerCase()} · {report.data.filters.patientType.toLowerCase()}</p>}
        </div>
        {canExport ? (
          <Button variant="outlined" startIcon={<Download size={17} />} onClick={() => exportReport.mutate()} disabled={!report.data || exportReport.isPending}>
            {exportReport.isPending ? 'Preparing…' : 'Export aggregate CSV'}
          </Button>
        ) : <p className="text-sm text-slate-500">CSV export is restricted to clinic nurses.</p>}
      </div>

      {exportReport.isError && <Alert severity="error">The report could not be exported. Your access may have changed; refresh and try again.</Alert>}
      {report.isLoading && <div className={panel}><LoadingState label="Loading filtered report..." /></div>}
      {report.isError && <div className={panel}><ErrorState message="Unable to load the filtered report." onRetry={() => void report.refetch()} /></div>}
      {empty && <div className={panel}><EmptyState title="No report activity" description="No aggregate activity matched the selected date and domain filters." /></div>}
      {report.data && !empty && (
        <section aria-label="Aggregate report metrics" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cards.map((card) => (
            <article key={card.label} className={`${panel} p-5`}>
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><card.icon className="h-5 w-5" /></span>
              <p className="mt-5 text-3xl font-bold text-slate-950">{card.value}</p>
              <p className="mt-2 text-sm font-semibold text-slate-600">{card.label}</p>
            </article>
          ))}
        </section>
      )}

      {onOpenReport && <section aria-label="Detailed reports" className="space-y-3">
        <div><h2 className="text-lg font-bold text-slate-950">Explore detailed reports</h2><p className="mt-1 text-sm text-slate-500">Choose a report to see the records behind your clinic activity. Your date range and patient type carry over.</p></div>
        <div className="grid gap-4 md:grid-cols-3">
          {([
            { kind: 'utilization' as const, title: 'Clinic visits', description: 'Visits and unique patients by department, course, week, or month.', icon: Activity },
            { kind: 'medicine-summary' as const, title: 'Medicine usage', description: 'Quantities dispensed and transaction counts by week or month.', icon: Package },
            ...(auth.user && permissionsForRoles(auth.user.roles).has('clinical.read') ? [{ kind: 'logbook' as const, title: 'Clinic logbook', description: 'Individual visits, diagnoses, prescriptions, and follow-up notes.', icon: FileCheck }] : []),
          ]).map(item => <Button key={item.kind} variant="outlined" onClick={() => onOpenReport(item.kind, filters)} sx={{ p: 3, textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textTransform: 'none', borderColor: 'divider', bgcolor: 'background.paper', borderRadius: 3 }}>
            <item.icon size={22} /><span className="mt-4 text-base font-bold">{item.title}</span><span className="mt-2 text-sm font-normal text-slate-500">{item.description}</span><span className="mt-4 text-sm font-semibold">View report →</span>
          </Button>)}
        </div>
      </section>}

      <Alert severity="info">Exports contain aggregate counts and filter context only. They exclude direct identifiers and clinical narrative. Every successful export records the actor, period, filters, format, and exported fields.</Alert>
    </div>
  );
}
