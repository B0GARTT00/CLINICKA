import { useMemo, useState } from 'react';
import {
  Bell, CalendarDays, ChevronDown, ClipboardCheck, ClipboardList,
  FileCheck, GraduationCap, Inbox, LayoutDashboard, LogOut, Menu, Megaphone,
  Package, Search, Settings, ShieldCheck, Stethoscope, Syringe, UserCog, Users,
  X, ScrollText,
} from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import type { UserRoleName } from '@bchealth/types';
import { useAuth } from '../hooks/useAuth';

const navItems = [
  { group: 'Workspace', to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { group: 'Clinic', to: '/patients', label: 'Patients', icon: Users },
  { group: 'Clinic', to: '/appointments', label: 'Appointments', icon: CalendarDays },
  { group: 'Clinic', to: '/clinic/visits', label: 'Clinic queue', icon: ClipboardList },
  { group: 'Health records', to: '/clearances', label: 'Requirements & Clearances', icon: FileCheck },
  { group: 'Health records', to: '/vaccinations', label: 'Vaccination History', icon: Syringe },
  { group: 'Health records', to: '/screenings', label: 'Health Screening', icon: ClipboardCheck },
  { group: 'Health records', to: '/certificates', label: 'Certificates', icon: Stethoscope },
  { group: 'Inventory', to: '/inventory/medicines', label: 'Medicines', icon: Package },
  { group: 'Inventory', to: '/inventory/dispensing', label: 'Dispensing', icon: ClipboardList },
  { group: 'Communication', to: '/announcements', label: 'Announcements', icon: Megaphone },
  { group: 'Communication', to: '/notifications', label: 'Notifications', icon: Inbox },
  { group: 'Administration', to: '/admin/users', label: 'Users', icon: UserCog },
  { group: 'Administration', to: '/admin/academic-years', label: 'Academic Years', icon: GraduationCap },
  { group: 'Administration', to: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText },
  { group: 'Administration', to: '/admin/settings', label: 'Settings', icon: Settings },
];

type Permission =
  | 'patients.read' | 'patients.manage' | 'clinical.read' | 'clinical.manage'
  | 'appointments.manage' | 'requirements.manage' | 'clearances.manage'
  | 'inventory.manage' | 'reports.read' | 'users.manage' | 'roles.manage'
  | 'audit.read' | 'own_profile.read';

const ROLE_PERMISSIONS: Record<UserRoleName, Permission[]> = {
  ADMINISTRATOR: ['users.manage', 'roles.manage', 'reports.read', 'audit.read'],
  CLINIC_NURSE: ['patients.read', 'patients.manage', 'clinical.read', 'clinical.manage', 'appointments.manage', 'requirements.manage', 'clearances.manage', 'inventory.manage', 'reports.read'],
  DOCTOR: ['patients.read', 'clinical.read', 'clinical.manage'],
  CLINIC_STAFF: ['patients.read', 'patients.manage', 'appointments.manage', 'requirements.manage', 'clearances.manage'],
  STUDENT: ['own_profile.read'],
  FACULTY_STAFF: ['own_profile.read'],
};

const NAV_PERMISSIONS: Record<string, Permission[]> = {
  '/dashboard': [],
  '/patients': ['patients.read'],
  '/clinic/visits': ['clinical.read'],
  '/appointments': ['appointments.manage'],
  '/clearances': ['requirements.manage', 'clearances.manage'],
  '/vaccinations': ['clinical.manage'],
  '/screenings': ['clinical.manage'],
  '/certificates': ['clinical.manage'],
  '/inventory/medicines': ['inventory.manage'],
  '/inventory/dispensing': ['inventory.manage'],
  '/announcements': [],
  '/notifications': [],
  '/admin/users': ['users.manage'],
  '/admin/academic-years': ['users.manage', 'roles.manage'],
  '/admin/audit-logs': ['audit.read'],
  '/admin/settings': ['users.manage', 'roles.manage'],
};

function initials(name?: string) {
  if (!name) return 'CL';
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

export function AppLayout() {
  const auth = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const userPermissions = useMemo(() => {
    if (!auth.user) return new Set<Permission>();
    if (auth.user.roles.includes('ADMINISTRATOR')) return new Set<Permission>(Object.values(NAV_PERMISSIONS).flat());
    const permissions = new Set<Permission>();
    for (const role of auth.user.roles) ROLE_PERMISSIONS[role]?.forEach((permission) => permissions.add(permission));
    return permissions;
  }, [auth.user]);

  const visibleNavItems = useMemo(() => navItems.filter((item) => {
    const required = NAV_PERMISSIONS[item.to];
    return !required?.length || required.every((permission) => userPermissions.has(permission));
  }), [userPermissions]);
  const visibleGroups = useMemo(() => Array.from(new Set(visibleNavItems.map((item) => item.group))), [visibleNavItems]);
  const currentPage = navItems.find((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`))?.label
    ?? (location.pathname.startsWith('/patients/') ? 'Patient Profile' : 'Dashboard');

  return (
    <div className="min-h-screen bg-[#f6f9fb] text-slate-950">
      <aside className={`clinic-sidebar fixed inset-y-0 left-0 z-40 flex h-screen w-[268px] flex-col text-white transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="relative flex h-[102px] shrink-0 items-center gap-3 border-b border-white/15 px-6">
          <img src="/clinova-emblem.png" alt="CLINICKA emblem" width="58" height="58" className="h-[58px] w-[58px] object-contain" />
          <div className="min-w-0">
            <img src="/clinicka-wordmark.png" alt="CLINICKA" width="142" height="47" className="h-[25px] w-auto max-w-[140px] object-contain" />
            <p className="mt-1 text-[12px] text-cyan-50/65">Campus Health System</p>
          </div>
          <button type="button" onClick={() => setSidebarOpen(false)} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-lg text-white/70 hover:bg-white/10 lg:hidden" aria-label="Close navigation">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="sidebar-navigation relative z-10 min-h-0 flex-1 space-y-5 overflow-x-hidden overflow-y-auto px-2.5 py-5">
          {visibleGroups.map((group) => (
            <div key={group} className="space-y-1">
              <p className="mb-1.5 px-4 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-50/55">{group}</p>
              {visibleNavItems.filter((item) => item.group === group).map((item) => (
                <NavLink key={item.to} to={item.to} onClick={() => setSidebarOpen(false)} className={({ isActive }) => `relative flex h-10 items-center gap-3 rounded-[10px] px-4 text-[14px] font-medium transition-all ${isActive ? 'bg-cyan-300/20 text-white shadow-[inset_3px_0_0_#65eaff]' : 'text-cyan-50/90 hover:bg-white/10 hover:text-white'}`}>
                  <item.icon className="h-[19px] w-[19px] shrink-0" strokeWidth={1.9} />
                  <span>{item.label}</span>
                  {item.to === '/notifications' && <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-cyan-200 px-1 text-[11px] font-bold text-teal-950">3</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="relative z-10 m-3 mt-1 shrink-0 rounded-xl border border-cyan-100/10 bg-white/[0.08] px-3.5 py-3">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-cyan-50"><ShieldCheck className="h-[18px] w-[18px] text-cyan-200" /> Protected workspace</div>
          <p className="mt-1 pl-[26px] text-[11px] text-cyan-100/55">Audit logging enabled</p>
        </div>
      </aside>

      {sidebarOpen && <button type="button" className="fixed inset-0 z-30 bg-slate-950/45 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close navigation overlay" />}

      <div className="min-h-screen lg:pl-[268px]">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur md:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setSidebarOpen(true)} className="grid h-9 w-9 place-items-center rounded-lg text-slate-700 hover:bg-slate-100" aria-label="Open navigation"><Menu className="h-5 w-5" /></button>
            <div className="hidden items-center gap-2 text-[14px] sm:flex"><span className="text-slate-500">Clinic</span><span className="text-slate-300">/</span><span className="font-semibold text-slate-900">{currentPage}</span></div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <button className="hidden h-10 w-[180px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-[13px] text-slate-500 transition hover:border-teal-200 hover:bg-white xl:flex" aria-label="Search">
              <Search className="h-4 w-4 text-slate-700" /><span>Search...</span><kbd className="ml-auto rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] text-slate-400">⌘K</kbd>
            </button>
            <button className="relative grid h-10 w-10 place-items-center rounded-xl text-slate-700 hover:bg-slate-100" aria-label="Notifications">
              <Bell className="h-5 w-5" /><span className="absolute right-2 top-1.5 h-2 w-2 rounded-full border-2 border-white bg-rose-500" />
            </button>
            <div className="relative">
              <button type="button" onClick={() => setProfileOpen((open) => !open)} className="flex items-center gap-3 rounded-xl px-1.5 py-1 hover:bg-slate-50" aria-expanded={profileOpen}>
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[#075f67] text-[13px] font-bold text-white">{initials(auth.user?.displayName)}</span>
                <span className="hidden min-w-[150px] text-left md:block"><span className="block truncate text-[14px] font-semibold text-slate-900">{auth.user?.displayName}</span><span className="block truncate text-[11px] uppercase tracking-wide text-slate-500">{auth.user?.roles.join(', ')}</span></span>
                <ChevronDown className="hidden h-4 w-4 text-slate-500 md:block" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-12 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                  <button type="button" onClick={() => auth.logout()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-rose-50 hover:text-rose-600"><LogOut className="h-4 w-4" /> Log out</button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
