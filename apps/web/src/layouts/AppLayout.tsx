import { useMemo } from 'react';
import { Bell, CalendarDays, ClipboardCheck, ClipboardList, History, LayoutDashboard, LogOut, Package, Search, ShieldCheck, Users, Settings, FileCheck, Syringe, Stethoscope, ClipboardPlus, UserCog, GraduationCap, ScrollText, Megaphone, Inbox } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { UserRoleName } from '@bchealth/types';

const navItems = [
  { group: 'Workspace', to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { group: 'Clinic', to: '/patients', label: 'Patients', icon: Users },
  { group: 'Clinic', to: '/clinic/visits', label: 'Clinic Visits', icon: ClipboardList },
  { group: 'Clinic', to: '/appointments', label: 'Appointments', icon: CalendarDays },
  { group: 'Health records', to: '/requirements', label: 'Requirements', icon: ClipboardPlus },
  { group: 'Health records', to: '/clearances', label: 'Clearances', icon: FileCheck },
  { group: 'Health records', to: '/vaccinations', label: 'Vaccination History', icon: Syringe },
  { group: 'Health records', to: '/screenings', label: 'Health Screening', icon: ClipboardCheck },
  { group: 'Health records', to: '/certificates', label: 'Certificates', icon: Stethoscope },
  { group: 'Inventory', to: '/inventory/medicines', label: 'Medicines', icon: Package },
  { group: 'Inventory', to: '/inventory/transactions', label: 'Transactions', icon: History },
  { group: 'Inventory', to: '/inventory/dispensing', label: 'Dispensing', icon: ClipboardList },
  { group: 'Communication', to: '/announcements', label: 'Announcements', icon: Megaphone },
  { group: 'Communication', to: '/notifications', label: 'Notifications', icon: Inbox },
  { group: 'Administration', to: '/admin/users', label: 'Users', icon: UserCog },
  { group: 'Administration', to: '/admin/academic-years', label: 'Academic Years', icon: GraduationCap },
  { group: 'Administration', to: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText },
  { group: 'Administration', to: '/admin/settings', label: 'Settings', icon: Settings },
];

type Permission =
  | 'patients.read'
  | 'patients.manage'
  | 'clinical.read'
  | 'clinical.manage'
  | 'appointments.manage'
  | 'requirements.manage'
  | 'clearances.manage'
  | 'inventory.manage'
  | 'inventory.transactions.read'
  | 'reports.read'
  | 'users.manage'
  | 'roles.manage'
  | 'audit.read'
  | 'own_profile.read';

const ROLE_PERMISSIONS: Record<UserRoleName, Permission[]> = {
  ADMINISTRATOR: ['users.manage', 'roles.manage', 'reports.read', 'audit.read'],
  CLINIC_NURSE: ['patients.read', 'patients.manage', 'clinical.read', 'clinical.manage', 'appointments.manage', 'requirements.manage', 'clearances.manage', 'inventory.manage', 'inventory.transactions.read', 'reports.read'],
  DOCTOR: ['patients.read', 'clinical.read', 'clinical.manage'],
  CLINIC_STAFF: ['patients.read', 'patients.manage', 'appointments.manage', 'requirements.manage', 'clearances.manage', 'inventory.transactions.read'],
  STUDENT: ['own_profile.read'],
  FACULTY_STAFF: ['own_profile.read'],
};

const NAV_PERMISSIONS: Record<string, Permission[]> = {
  '/dashboard': [],
  '/patients': ['patients.read'],
  '/clinic/visits': ['clinical.read'],
  '/appointments': ['appointments.manage'],
  '/requirements': ['requirements.manage'],
  '/clearances': ['clearances.manage'],
  '/vaccinations': ['clinical.manage'],
  '/screenings': ['clinical.manage'],
  '/certificates': ['clinical.manage'],
  '/inventory/medicines': ['inventory.manage'],
  '/inventory/transactions': ['inventory.transactions.read'],
  '/inventory/dispensing': ['inventory.manage'],
  '/announcements': [],
  '/notifications': [],
  '/admin/users': ['users.manage'],
  '/admin/academic-years': ['users.manage', 'roles.manage'],
  '/admin/audit-logs': ['audit.read'],
  '/admin/settings': ['users.manage', 'roles.manage'],
};

export function AppLayout() {
  const auth = useAuth();
  const location = useLocation();

  const userPermissions = useMemo(() => {
    if (!auth.user) return new Set<Permission>();
    if (auth.user.roles.includes('ADMINISTRATOR')) {
      return new Set<Permission>(Object.values(NAV_PERMISSIONS).flat());
    }
    const perms = new Set<Permission>();
    for (const role of auth.user.roles) {
      const rolePerms = ROLE_PERMISSIONS[role];
      if (rolePerms) rolePerms.forEach(p => perms.add(p));
    }
    return perms;
  }, [auth.user]);

  const visibleNavItems = useMemo(() => {
    return navItems.filter((item) => {
      const required = NAV_PERMISSIONS[item.to];
      if (!required || required.length === 0) return true;
      return required.every(perm => userPermissions.has(perm));
    });
  }, [userPermissions]);

  const visibleGroups = useMemo(() => {
    const groups = new Set(visibleNavItems.map(item => item.group));
    return Array.from(groups);
  }, [visibleNavItems]);

  const currentPage = navItems.find((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`))?.label ?? (location.pathname.startsWith('/patients/') ? 'Patient Profile' : 'Dashboard');

  return (
    <div className="min-h-screen bg-clinic-surface text-clinic-ink">
      <aside className="fixed inset-y-0 left-0 hidden h-screen w-[280px] flex-col bg-[var(--color-sidebar-bg)] text-slate-300 md:flex">
        <div className="flex h-[68px] shrink-0 items-center gap-2.5 border-b border-white/10 px-4">
          <img src="/Clinova.png" alt="CLINOVA logo" width="34" height="34" className="h-[34px] w-[34px] rounded-full object-contain ring-1 ring-white/20" />
          <div>
            <p className="text-[15px] font-semibold tracking-tight text-white">CLINOVA</p>
            <p className="text-[11px] text-slate-400">Health Information Management System</p>
          </div>
        </div>
        <nav className="sidebar-navigation min-h-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto px-2.5 py-4">
          {visibleGroups.map((group) => (
            <div key={group} className="space-y-1">
              <p className="mb-1.5 px-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-50/75">{group}</p>
              {visibleNavItems.filter((item) => item.group === group).map((item) => (
                <NavLink key={item.to} to={item.to} className={({ isActive }) => `relative flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-semibold transition-colors ${isActive ? 'bg-white text-slate-950 shadow-sm before:absolute before:left-0 before:h-5 before:w-0.5 before:rounded-full before:bg-brokenshire-600' : 'text-white/90 hover:bg-white/10 hover:text-white'}`}>
                  <item.icon className="h-4 w-4 shrink-0" />{item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="mx-2.5 mb-3 mt-2 shrink-0 rounded-lg border border-white/10 bg-white/[0.08] p-2.5">
          <div className="flex items-center gap-2 text-[11px] text-emerald-50/85"><ShieldCheck className="h-4 w-4 text-emerald-200" /> Protected workspace</div>
          <p className="mt-1 pl-6 text-[10px] text-emerald-100/55">Audit logging enabled</p>
        </div>
      </aside>

      <div className="md:pl-[280px]">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-200/80 bg-white/90 px-5 backdrop-blur md:px-8">
          <div className="flex items-center gap-2 text-[12px] text-slate-500">
            <span>Clinic</span><span className="text-slate-300">/</span><span className="font-medium text-slate-900">{currentPage}</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="hidden h-8 items-center gap-2 rounded-lg border border-slate-200 px-2.5 text-[11px] text-slate-500 hover:bg-slate-50 sm:flex" aria-label="Search patients">
              <Search className="h-3.5 w-3.5" /> Search <kbd className="rounded border border-slate-200 bg-slate-50 px-1 text-[10px]">⌘K</kbd>
            </button>
            <button className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Notifications"><Bell className="h-4 w-4" /></button>
            <div className="ml-1 hidden border-l border-slate-200 pl-3 sm:block"><p className="text-[12px] font-medium">{auth.user?.displayName}</p><p className="text-[10px] text-slate-500">{auth.user?.roles.join(', ')}</p></div>
            <button onClick={() => auth.logout()} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600" aria-label="Log out"><LogOut className="h-4 w-4" /></button>
          </div>
        </header>
        <main className="mx-auto max-w-[1280px] p-5 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
