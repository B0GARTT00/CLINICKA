import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarDays,
  CalendarRange,
  ClipboardCheck,
  Clock3,
  FileCheck,
  Megaphone,
  Package,
  RefreshCw,
  Stethoscope,
  Users,
} from 'lucide-react';
import {
  getAnnouncements,
  getAppointments,
  getMedicines,
  getReportsSummary,
  getVisitQueue,
  type Appointment,
  type ClinicVisit,
  type Medicine,
} from '../services/api';

const panelClass = 'rounded-2xl border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,54,64,0.04)]';

function PanelSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`${panelClass} animate-pulse p-5 sm:p-6 ${className}`} aria-label="Loading dashboard widget">
      <div className="h-5 w-40 rounded bg-slate-200" />
      <div className="mt-3 h-4 w-64 max-w-full rounded bg-slate-100" />
      <div className="mt-7 h-40 rounded-xl bg-slate-100" />
    </div>
  );
}

function WidgetError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center px-6 text-center" role="alert">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-rose-50 text-rose-600"><AlertCircle className="h-5 w-5" /></span>
      <p className="mt-3 text-[14px] font-semibold text-slate-800">{message}</p>
      <button type="button" onClick={onRetry} className="mt-3 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-semibold text-emerald-700 hover:bg-emerald-50">
        <RefreshCw className="h-4 w-4" /> Try again
      </button>
    </div>
  );
}

function EmptyWidget({ icon: Icon, title, description }: { icon: typeof Activity; title: string; description: string }) {
  return (
    <div className="flex min-h-[148px] flex-col items-center justify-center px-6 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-slate-400"><Icon className="h-5 w-5" /></span>
      <p className="mt-3 text-[14px] font-semibold text-slate-800">{title}</p>
      <p className="mt-1 max-w-sm text-[13px] leading-5 text-slate-500">{description}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusClass = status === 'CONFIRMED' || status === 'IN_CONSULTATION'
    ? 'bg-emerald-50 text-emerald-700'
    : status === 'APPROVED'
      ? 'bg-cyan-50 text-cyan-700'
      : 'bg-amber-50 text-amber-700';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${statusClass}`}>{status.replaceAll('_', ' ')}</span>;
}

function patientName(record: Appointment | ClinicVisit) {
  return `${record.patient.firstName} ${record.patient.lastName}`;
}

function InventoryDonut({ medicines }: { medicines: Medicine[] }) {
  const total = medicines.length;
  const outOfStock = medicines.filter((medicine) => medicine.stock <= 0).length;
  const lowStock = medicines.filter((medicine) => medicine.stock > 0 && medicine.lowStock).length;
  const inStock = medicines.filter((medicine) => medicine.stock > 0 && !medicine.lowStock).length;
  const inStockEnd = total ? (inStock / total) * 100 : 0;
  const lowStockEnd = total ? ((inStock + lowStock) / total) * 100 : 0;
  const chartBackground = total
    ? `conic-gradient(#168c72 0 ${inStockEnd}%, #f2b33d ${inStockEnd}% ${lowStockEnd}%, #dc6b6b ${lowStockEnd}% 100%)`
    : '#e2e8f0';

  return (
    <div className="mt-7 grid items-center gap-7 sm:grid-cols-[210px_1fr]">
      <div className="relative mx-auto h-[170px] w-[170px] rounded-full" style={{ background: chartBackground }} role="img" aria-label={`Inventory status: ${inStock} in stock, ${lowStock} low stock, ${outOfStock} out of stock`}>
        <div className="absolute inset-[23px] grid place-items-center rounded-full bg-white text-center">
          <div><strong className="block text-[28px] text-slate-950">{total}</strong><span className="text-[12px] text-slate-500">Total Medicines</span></div>
        </div>
      </div>
      <dl className="divide-y divide-slate-100 text-[14px]">
        <div className="flex items-center gap-3 py-4"><span className="h-3.5 w-3.5 rounded-full bg-emerald-600" /><dt className="text-slate-600">In Stock</dt><dd className="ml-auto font-bold text-slate-950">{inStock}</dd></div>
        <div className="flex items-center gap-3 py-4"><span className="h-3.5 w-3.5 rounded-full bg-amber-400" /><dt className="text-slate-600">Low Stock</dt><dd className="ml-auto font-bold text-slate-950">{lowStock}</dd></div>
        <div className="flex items-center gap-3 py-4"><span className="h-3.5 w-3.5 rounded-full bg-rose-400" /><dt className="text-slate-600">Out of Stock</dt><dd className="ml-auto font-bold text-slate-950">{outOfStock}</dd></div>
      </dl>
    </div>
  );
}

export function ReportsPage() {
  const summary = useQuery({ queryKey: ['reports-summary'], queryFn: getReportsSummary });
  const queue = useQuery({ queryKey: ['dashboard-visit-queue'], queryFn: getVisitQueue });
  const appointments = useQuery({ queryKey: ['dashboard-appointments'], queryFn: getAppointments });
  const inventory = useQuery({ queryKey: ['dashboard-inventory'], queryFn: getMedicines });
  const announcements = useQuery({ queryKey: ['dashboard-announcements'], queryFn: getAnnouncements });

  const cards = summary.data ? [
    { label: 'Active patients', value: summary.data.patients, support: 'Currently registered', icon: Users, tone: 'emerald' },
    { label: "Today's visits", value: summary.data.visitsToday, support: 'Recorded today', icon: Activity, tone: 'teal' },
    { label: 'Upcoming appointments', value: summary.data.appointmentsUpcoming, support: 'Scheduled', icon: CalendarDays, tone: 'blue' },
    { label: 'Pending requirements', value: summary.data.pendingRequirements, support: 'Awaiting review', icon: ClipboardCheck, tone: 'cyan' },
    { label: 'Clearances for review', value: summary.data.clearancesForReview, support: 'Awaiting action', icon: FileCheck, tone: 'emerald' },
    { label: 'Low-stock medicines', value: summary.data.lowStock, support: 'Needs attention', icon: AlertTriangle, tone: 'amber' },
  ] as const : [];

  const toneClasses = {
    emerald: 'bg-emerald-50 text-emerald-600',
    teal: 'bg-teal-50 text-teal-600',
    blue: 'bg-blue-50 text-blue-600',
    cyan: 'bg-cyan-50 text-cyan-700',
    amber: 'bg-amber-50 text-amber-600',
  };

  const waiting = queue.data?.filter((visit) => visit.status === 'OPEN') ?? [];
  const nowServing = queue.data?.filter((visit) => visit.status === 'IN_CONSULTATION') ?? [];
  const upcomingAppointments = appointments.data?.slice(0, 5) ?? [];
  const inventoryAlerts = inventory.data?.filter((medicine) => medicine.lowStock).sort((a, b) => a.stock - b.stock).slice(0, 5) ?? [];
  const latestAnnouncement = announcements.data?.[0];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-emerald-700">Overview</p>
          <h1 className="mt-2 text-[28px] font-bold tracking-[-0.025em] text-slate-950 sm:text-[32px]">Dashboard</h1>
          <p className="mt-1 text-[15px] text-slate-500">Clinic operations at a glance.</p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-[13px] font-semibold text-emerald-700">
          <BarChart3 className="h-4 w-4" /> Live data <span className="h-2 w-2 rounded-full bg-emerald-500" />
        </span>
      </header>

      <section aria-label="Clinic summary">
        {summary.isLoading && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="min-h-[116px] animate-pulse rounded-2xl border border-slate-200 bg-white p-5"><div className="h-11 w-11 rounded-xl bg-slate-100" /><div className="ml-16 -mt-11 h-3 w-32 rounded bg-slate-200" /><div className="ml-16 mt-4 h-7 w-12 rounded bg-slate-100" /></div>)}</div>}
        {summary.isError && <div className={panelClass}><WidgetError message="Unable to load the clinic summary." onRetry={() => void summary.refetch()} /></div>}
        {summary.data && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => (
              <article key={card.label} className="flex min-h-[116px] items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,54,64,0.04)] sm:px-6">
                <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${toneClasses[card.tone]}`}><card.icon className="h-6 w-6" strokeWidth={2} /></span>
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">{card.label}</p>
                  <p className="mt-2 text-[30px] font-bold leading-none tracking-tight text-slate-950">{card.value}</p>
                  <p className="mt-2 text-[12px] text-slate-500">{card.support}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
        {summary.isLoading ? <PanelSkeleton /> : (
          <article className={`${panelClass} p-5 sm:p-6`}>
            <div className="flex items-start justify-between gap-4">
              <div><h2 className="text-[17px] font-bold text-slate-950">Visit Activity</h2><p className="mt-1 text-[14px] text-slate-500">Completed visits recorded in the system.</p></div>
              <span className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-[12px] font-semibold text-slate-600"><CalendarRange className="h-4 w-4" /> This Year</span>
            </div>
            {summary.isError ? <WidgetError message="Unable to load visit activity." onRetry={() => void summary.refetch()} /> : (
              <div className="mt-5 flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-600"><Activity className="h-6 w-6" /></span>
                <strong className="mt-3 text-[30px] leading-none text-slate-950">{summary.data?.visitsCompleted ?? 0}</strong>
                <p className="mt-2 text-[14px] font-semibold text-slate-700">Completed visits recorded</p>
                <p className="mt-1 max-w-sm text-[13px] leading-5 text-slate-500">Monthly visit history is not available from the current dashboard API, so no trend line is shown.</p>
              </div>
            )}
          </article>
        )}

        {inventory.isLoading ? <PanelSkeleton /> : (
          <article className={`${panelClass} p-5 sm:p-6`}>
            <div className="flex items-start justify-between gap-4">
              <div><h2 className="text-[17px] font-bold text-slate-950">Inventory Overview</h2><p className="mt-1 text-[14px] text-slate-500">Medicine records and stock attention.</p></div>
              <a href="/inventory/medicines" className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-[12px] font-semibold text-emerald-700 hover:bg-emerald-50"><Package className="h-4 w-4" /> View Inventory</a>
            </div>
            {inventory.isError ? <WidgetError message="Unable to load inventory status." onRetry={() => void inventory.refetch()} /> : inventory.data?.length ? <InventoryDonut medicines={inventory.data} /> : <EmptyWidget icon={Package} title="No medicines tracked" description="Medicine records will appear here once they are added to inventory." />}
          </article>
        )}
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        {queue.isLoading ? <PanelSkeleton /> : (
          <article className={panelClass}>
            <div className="flex items-start justify-between border-b border-slate-100 p-5 sm:px-6">
              <div><h2 className="text-[17px] font-bold text-slate-950">Today's Queue</h2><p className="mt-1 text-[14px] text-slate-500">Patients currently waiting or in consultation.</p></div>
              <a href="/clinic/visits" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold text-emerald-700 hover:bg-emerald-50">View All <ArrowRight className="h-4 w-4" /></a>
            </div>
            {queue.isError ? <WidgetError message="Unable to load today's queue." onRetry={() => void queue.refetch()} /> : queue.data?.length ? (
              <div>
                <dl className="grid grid-cols-2 border-b border-slate-100 bg-slate-50/60">
                  <div className="px-5 py-4 sm:px-6"><dt className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">Now serving</dt><dd className="mt-1 text-2xl font-bold text-slate-950">{nowServing.length}</dd></div>
                  <div className="border-l border-slate-100 px-5 py-4 sm:px-6"><dt className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">Waiting</dt><dd className="mt-1 text-2xl font-bold text-slate-950">{waiting.length}</dd></div>
                </dl>
                <div className="divide-y divide-slate-100">
                  {queue.data.slice(0, 4).map((visit) => <div key={visit.id} className="flex items-center gap-3 px-5 py-3.5 sm:px-6"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-700"><Stethoscope className="h-4 w-4" /></span><div className="min-w-0"><p className="truncate text-[14px] font-semibold text-slate-900">{patientName(visit)}</p><p className="truncate text-[12px] text-slate-500">{visit.chiefComplaint || 'Clinic visit'}</p></div><StatusBadge status={visit.status} /></div>)}
                </div>
              </div>
            ) : <EmptyWidget icon={Activity} title="No clinic visits today" description="New visits will appear here once patients are checked in." />}
          </article>
        )}

        {appointments.isLoading ? <PanelSkeleton /> : (
          <article className={panelClass}>
            <div className="flex items-start justify-between border-b border-slate-100 p-5 sm:px-6">
              <div><h2 className="text-[17px] font-bold text-slate-950">Upcoming Appointments</h2><p className="mt-1 text-[14px] text-slate-500">The next scheduled clinic appointments.</p></div>
              <a href="/appointments" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold text-emerald-700 hover:bg-emerald-50">View All <ArrowRight className="h-4 w-4" /></a>
            </div>
            {appointments.isError ? <WidgetError message="Unable to load upcoming appointments." onRetry={() => void appointments.refetch()} /> : upcomingAppointments.length ? (
              <div className="divide-y divide-slate-100">
                {upcomingAppointments.map((appointment) => (
                  <div key={appointment.id} className="grid gap-2 px-5 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:px-6">
                    <div className="min-w-0"><p className="truncate text-[14px] font-semibold text-slate-900">{patientName(appointment)}</p><p className="truncate text-[12px] text-slate-500">{appointment.purpose}</p></div>
                    <span className="flex items-center gap-1.5 text-[12px] text-slate-600"><Clock3 className="h-3.5 w-3.5" />{new Date(appointment.scheduledAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                    <StatusBadge status={appointment.status} />
                  </div>
                ))}
              </div>
            ) : <EmptyWidget icon={CalendarDays} title="No upcoming appointments" description="Scheduled appointments will appear here." />}
          </article>
        )}
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        {inventory.isLoading ? <PanelSkeleton className="min-h-[260px]" /> : (
          <article className={panelClass}>
            <div className="flex items-start justify-between border-b border-slate-100 p-5 sm:px-6"><div><h2 className="text-[17px] font-bold text-slate-950">Inventory Alerts</h2><p className="mt-1 text-[14px] text-slate-500">Medicines requiring stock attention.</p></div><a href="/inventory/medicines" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold text-emerald-700 hover:bg-emerald-50">View All <ArrowRight className="h-4 w-4" /></a></div>
            {inventory.isError ? <WidgetError message="Unable to load inventory alerts." onRetry={() => void inventory.refetch()} /> : inventoryAlerts.length ? (
              <div className="divide-y divide-slate-100">
                {inventoryAlerts.map((medicine) => <div key={medicine.id} className="flex items-center gap-3 px-5 py-3.5 sm:px-6"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${medicine.stock <= 0 ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}><Package className="h-4 w-4" /></span><div className="min-w-0"><p className="truncate text-[14px] font-semibold text-slate-900">{medicine.name}</p><p className="text-[12px] text-slate-500">{medicine.stock} {medicine.unit} remaining</p></div><span className={`ml-auto rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${medicine.stock <= 0 ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{medicine.stock <= 0 ? 'Out of stock' : 'Low stock'}</span></div>)}
              </div>
            ) : <EmptyWidget icon={Package} title="No inventory alerts" description="Medicine stock levels are currently within configured thresholds." />}
          </article>
        )}

        <article className={panelClass}>
          <div className="border-b border-slate-100 p-5 sm:px-6"><h2 className="text-[17px] font-bold text-slate-950">Pending Actions</h2><p className="mt-1 text-[14px] text-slate-500">Reviews that need attention.</p></div>
          {summary.isLoading ? <div className="space-y-3 p-5 sm:px-6">{Array.from({ length: 2 }, (_, index) => <div key={index} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}</div> : summary.isError ? <WidgetError message="Unable to load pending actions." onRetry={() => void summary.refetch()} /> : (
            <div className="divide-y divide-slate-100">
              <a href="/requirements/submissions" className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50 sm:px-6"><span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-50 text-cyan-700"><ClipboardCheck className="h-5 w-5" /></span><div><p className="text-[14px] font-semibold text-slate-900">Health requirements</p><p className="text-[12px] text-slate-500">{summary.data?.pendingRequirements ? `${summary.data.pendingRequirements} awaiting review` : 'No pending requirements'}</p></div><ArrowRight className="ml-auto h-4 w-4 text-slate-400" /></a>
              <a href="/clearances" className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50 sm:px-6"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><FileCheck className="h-5 w-5" /></span><div><p className="text-[14px] font-semibold text-slate-900">Clearances</p><p className="text-[12px] text-slate-500">{summary.data?.clearancesForReview ? `${summary.data.clearancesForReview} awaiting review` : 'No clearances awaiting review'}</p></div><ArrowRight className="ml-auto h-4 w-4 text-slate-400" /></a>
            </div>
          )}
        </article>
      </section>

      {announcements.isLoading ? <PanelSkeleton className="min-h-[190px]" /> : (
        <section className={panelClass}>
          <div className="flex items-start justify-between border-b border-slate-100 p-5 sm:px-6"><div><h2 className="text-[17px] font-bold text-slate-950">Announcements</h2><p className="mt-1 text-[14px] text-slate-500">Latest updates and reminders.</p></div><a href="/announcements" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold text-emerald-700 hover:bg-emerald-50">View All <ArrowRight className="h-4 w-4" /></a></div>
          {announcements.isError ? <WidgetError message="Unable to load announcements." onRetry={() => void announcements.refetch()} /> : latestAnnouncement ? (
            <div className="m-5 flex items-start gap-4 rounded-xl bg-emerald-50/70 px-4 py-4 sm:mx-6">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-emerald-600"><Megaphone className="h-5 w-5" /></span>
              <div className="min-w-0"><p className="text-[14px] font-bold text-slate-900">{latestAnnouncement.title}</p><p className="mt-1 line-clamp-2 text-[13px] leading-5 text-slate-500">{latestAnnouncement.body}</p></div>
              <span className="ml-auto hidden whitespace-nowrap text-[12px] text-slate-500 sm:block">{new Date(latestAnnouncement.publishedAt ?? Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
          ) : <EmptyWidget icon={Megaphone} title="No announcements" description="Published clinic updates will appear here." />}
        </section>
      )}
    </div>
  );
}
