import { useQuery } from '@tanstack/react-query';
import { Activity, AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, ClipboardCheck, Clock3, FileCheck, Megaphone, Package, Stethoscope, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatusChip } from '../components/ui/StatusChip';
import { getAnnouncements, getAppointments, getMedicines, getReportsSummary, getVisitQueue, type Appointment, type ClinicVisit } from '../services/api';

const surface = 'rounded-2xl border border-slate-200/80 bg-white shadow-[0_10px_35px_rgba(15,54,64,0.055)]';

function patientName(record: Appointment | ClinicVisit) {
  return `${record.patient.firstName} ${record.patient.lastName}`;
}

function EmptyState({ icon: Icon, title, detail }: { icon: typeof Activity; title: string; detail: string }) {
  return <div className="flex min-h-[180px] flex-col items-center justify-center px-6 text-center"><span className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-slate-400"><Icon className="h-5 w-5" /></span><p className="mt-3 text-[14px] font-bold text-slate-800">{title}</p><p className="mt-1 text-[13px] text-slate-500">{detail}</p></div>;
}

export function DashboardPage() {
  const summary = useQuery({ queryKey: ['reports-summary'], queryFn: getReportsSummary });
  const queue = useQuery({ queryKey: ['dashboard-visit-queue'], queryFn: getVisitQueue });
  const appointments = useQuery({ queryKey: ['dashboard-appointments'], queryFn: getAppointments });
  const inventory = useQuery({ queryKey: ['dashboard-inventory'], queryFn: getMedicines });
  const announcements = useQuery({ queryKey: ['dashboard-announcements'], queryFn: getAnnouncements });
  const waiting = queue.data?.filter((visit) => visit.status === 'OPEN') ?? [];
  const nowServing = queue.data?.filter((visit) => visit.status === 'IN_CONSULTATION') ?? [];
  const upcoming = appointments.data?.slice(0, 4) ?? [];
  const stockAlerts = inventory.data?.filter((medicine) => medicine.lowStock).length ?? 0;
  const latestAnnouncement = announcements.data?.[0];
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const metrics = [
    { label: 'Patients', value: summary.data?.patients ?? 0, icon: Users, tone: 'bg-emerald-50 text-emerald-700' },
    { label: "Today's visits", value: summary.data?.visitsToday ?? 0, icon: Activity, tone: 'bg-teal-50 text-teal-700' },
    { label: 'Waiting', value: waiting.length, icon: Clock3, tone: 'bg-amber-50 text-amber-700' },
    { label: 'Appointments', value: summary.data?.appointmentsUpcoming ?? 0, icon: CalendarDays, tone: 'bg-blue-50 text-blue-700' },
    { label: 'For review', value: (summary.data?.pendingRequirements ?? 0) + (summary.data?.clearancesForReview ?? 0), icon: ClipboardCheck, tone: 'bg-cyan-50 text-cyan-700' },
    { label: 'Low-stock medicines', value: stockAlerts, icon: AlertTriangle, tone: 'bg-rose-50 text-rose-700' },
  ];

  return <div className="space-y-5 pb-4">
    <header className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(125deg,#064e3b_0%,#08705b_58%,#0f766e_100%)] px-6 py-6 text-white shadow-[0_18px_45px_rgba(6,78,59,0.18)] sm:px-8 sm:py-7">
      <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border-[42px] border-white/[0.06]" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[12px] font-bold uppercase tracking-[0.2em] text-emerald-200">Clinic workspace</p><h1 className="mt-2 text-[30px] font-bold tracking-[-0.035em] text-white sm:text-[36px]">Dashboard</h1><p className="mt-1.5 text-[15px] text-emerald-50/80">{today} · Here’s what needs attention today.</p></div><div className="flex flex-wrap gap-2.5"><Link to="/clinic/visits" className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-[13px] font-semibold text-white transition hover:bg-white/15"><Stethoscope className="h-4 w-4" /> Open queue</Link><Link to="/appointments" className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-[13px] font-semibold text-emerald-800 shadow-sm"><CalendarDays className="h-4 w-4" /> Appointments</Link></div></div>
    </header>

    <section aria-label="Today's clinic summary" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">{metrics.map((metric) => <article key={metric.label} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_25px_rgba(15,54,64,0.045)]"><span className={`grid h-10 w-10 place-items-center rounded-xl ${metric.tone}`}><metric.icon className="h-5 w-5" /></span><p className="mt-4 text-[27px] font-bold leading-none tracking-tight text-slate-950">{summary.isLoading ? '—' : metric.value}</p><p className="mt-2 text-[12px] font-bold uppercase tracking-[0.07em] text-slate-500">{metric.label}</p></article>)}</section>

    <section className="grid gap-5 xl:grid-cols-[1.15fr_.95fr_.8fr]">
      <article className={surface}>
        <div className="flex items-start justify-between border-b border-slate-100 p-5 sm:px-6"><div><h2 className="text-[17px] font-bold text-slate-950">Today’s Queue</h2><p className="mt-1 text-[14px] text-slate-500">Patients waiting or in consultation.</p></div><Link to="/clinic/visits" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold text-emerald-700 hover:bg-emerald-50">View all <ArrowRight className="h-4 w-4" /></Link></div>
        <dl className="grid grid-cols-2 border-b border-slate-100 bg-slate-50/70"><div className="px-5 py-4 sm:px-6"><dt className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">Now serving</dt><dd className="mt-1 text-2xl font-bold text-teal-700">{nowServing.length}</dd></div><div className="border-l border-slate-100 px-5 py-4 sm:px-6"><dt className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">Waiting</dt><dd className="mt-1 text-2xl font-bold text-amber-600">{waiting.length}</dd></div></dl>
        {queue.data?.length ? <div className="divide-y divide-slate-100">{queue.data.slice(0, 4).map((visit) => <div key={visit.id} className="flex items-center gap-3 px-5 py-3.5 sm:px-6"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-700"><Stethoscope className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-[14px] font-semibold text-slate-900">{patientName(visit)}</p><p className="truncate text-[12px] text-slate-500">{visit.chiefComplaint || 'Clinic visit'}</p></div><StatusChip state={visit.status} sx={{ fontSize: 10 }} /></div>)}</div> : <EmptyState icon={CheckCircle2} title="Queue is clear" detail="Checked-in patients will appear here." />}
      </article>

      <article className={surface}>
        <div className="flex items-start justify-between border-b border-slate-100 p-5"><div><h2 className="text-[17px] font-bold text-slate-950">Next Appointments</h2><p className="mt-1 text-[14px] text-slate-500">Upcoming clinic schedule.</p></div><Link to="/appointments" className="rounded-lg p-2 text-emerald-700 hover:bg-emerald-50" aria-label="View appointments"><ArrowRight className="h-4 w-4" /></Link></div>
        {upcoming.length ? <div className="divide-y divide-slate-100">{upcoming.map((appointment) => <div key={appointment.id} className="px-5 py-4"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><CalendarDays className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-[14px] font-semibold text-slate-900">{patientName(appointment)}</p><p className="mt-0.5 truncate text-[12px] text-slate-500">{appointment.purpose}</p><p className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-slate-600"><Clock3 className="h-3.5 w-3.5" />{new Date(appointment.scheduledAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p></div></div></div>)}</div> : <EmptyState icon={CalendarDays} title="Schedule is open" detail="No upcoming appointments." />}
      </article>

      <aside><article className={`${surface} p-5`}><h2 className="text-[17px] font-bold text-slate-950">Needs Attention</h2><div className="mt-4 space-y-2.5"><Link to="/clearances" className="flex items-center gap-3 rounded-xl bg-emerald-50/70 p-3.5 hover:bg-emerald-50"><FileCheck className="h-5 w-5 text-emerald-700" /><div><p className="text-[13px] font-bold text-slate-800">Clearance requests</p><p className="text-[12px] text-slate-500">{(summary.data?.pendingRequirements ?? 0) + (summary.data?.clearancesForReview ?? 0)} evidence and clearance reviews</p></div><ArrowRight className="ml-auto h-4 w-4 text-slate-400" /></Link><Link to="/inventory/medicines" className="flex items-center gap-3 rounded-xl bg-rose-50/70 p-3.5 hover:bg-rose-50"><Package className="h-5 w-5 text-rose-600" /><div><p className="text-[13px] font-bold text-slate-800">Medicine stock</p><p className="text-[12px] text-slate-500">{stockAlerts} alerts</p></div><ArrowRight className="ml-auto h-4 w-4 text-slate-400" /></Link></div></article></aside>
    </section>

    {latestAnnouncement && <section className={`${surface} flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:px-6`}><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Megaphone className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="text-[12px] font-bold uppercase tracking-wider text-emerald-700">Latest announcement</p><h2 className="mt-1 truncate text-[15px] font-bold text-slate-900">{latestAnnouncement.title}</h2><p className="mt-1 line-clamp-1 text-[13px] text-slate-500">{latestAnnouncement.body}</p></div><Link to="/announcements" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-emerald-700">Read updates <ArrowRight className="h-4 w-4" /></Link></section>}
  </div>;
}
