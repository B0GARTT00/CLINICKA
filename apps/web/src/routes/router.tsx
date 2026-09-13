import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { AppLayout } from '../layouts/AppLayout';
import { DashboardPage } from '../pages/DashboardPage';
import { ClinicVisitsPage } from '../pages/ClinicVisitsPage';
import { AppointmentsPage } from '../pages/AppointmentsPage';
import { ClearancesPage } from '../pages/ClearancesPage';
import { VaccinationHistoryPage } from '../pages/VaccinationHistoryPage';
import { ScreeningsPage } from '../pages/ScreeningsPage';
import { InventoryPage } from '../pages/InventoryPage';
import { CertificatesPage } from '../pages/CertificatesPage';
import { EmergenciesPage } from '../pages/EmergenciesPage';
import { DispensingPage } from '../pages/DispensingPage';
import { AnnouncementsPage } from '../pages/AnnouncementsPage';
import { NotificationsPage } from '../pages/NotificationsPage';
import { AdminUsersPage } from '../pages/AdminUsersPage';
import { AcademicYearsPage } from '../pages/AcademicYearsPage';
import { SettingsPage } from '../pages/SettingsPage';
import { AuditLogsPage } from '../pages/AuditLogsPage';
import { AdminRolesPage } from '../pages/AdminRolesPage';
import { LoginPage } from '../pages/LoginPage';
import { VerifyEmailPage } from '../pages/VerifyEmailPage';
import { PatientsPage } from '../pages/PatientsPage';
import { PatientProfilePage } from '../pages/PatientProfilePage';
import { PlaceholderPage } from '../pages/PlaceholderPage';
import { ProtectedRoute } from './ProtectedRoute';
import { HeartHandshake, ShieldCheck, UsersRound } from 'lucide-react';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  { path: '/login', element: (
    <AuthLayout
      align="right"
      className="max-w-[545px]"
      branding={
        <div className="flex items-center gap-5">
          <img src="/clinova-emblem.png" alt="CLINICKA emblem" width="92" height="92" className="h-[86px] w-[86px] object-contain" />
          <img src="/clinicka-wordmark.png" alt="CLINICKA" width="320" height="106" className="h-[52px] w-auto object-contain" />
        </div>
      }
      marketing={
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.3em] text-cyan-50/90">Brokenshire College</p>
          <h1 className="mt-4 text-[44px] font-bold leading-[1.08] tracking-[-0.03em]">Care that keeps<br />your community well.</h1>
          <p className="mt-4 max-w-[470px] text-[18px] leading-7 text-cyan-50/80">Secure, connected campus healthcare for the Brokenshire College community.</p>
          <div className="mt-8 flex items-center gap-5">
            <div className="flex items-center gap-2.5"><ShieldCheck className="h-7 w-7 text-cyan-200" /><span><b className="block text-[13px]">Secure</b><small className="text-[11px] text-cyan-50/65">Role-based access</small></span></div>
            <span className="h-10 w-px bg-white/25" />
            <div className="flex items-center gap-2.5"><UsersRound className="h-7 w-7 text-cyan-200" /><span><b className="block text-[13px]">Connected</b><small className="text-[11px] text-cyan-50/65">For our community</small></span></div>
            <span className="h-10 w-px bg-white/25" />
            <div className="flex items-center gap-2.5"><HeartHandshake className="h-7 w-7 text-cyan-200" /><span><b className="block text-[13px]">Healthier</b><small className="text-[11px] text-cyan-50/65">A brighter tomorrow</small></span></div>
          </div>
        </div>
      }
    >
      <LoginPage />
    </AuthLayout>
  ) },
  { path: '/verify-email', element: <AuthLayout className="max-w-[460px]"><VerifyEmailPage /></AuthLayout> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/patients', element: <PatientsPage /> },
          { path: '/patients/:id', element: <PatientProfilePage /> },
          { path: '/clinic/visits', element: <ClinicVisitsPage /> },
          { path: '/clinic/visits/new', element: <PlaceholderPage title="Register walk-in visit" /> },
          { path: '/appointments', element: <AppointmentsPage /> },
          { path: '/requirements', element: <Navigate to="/clearances#requirements" replace /> },
          { path: '/requirements/submissions', element: <Navigate to="/clearances#requirements" replace /> },
          { path: '/clearances', element: <ClearancesPage /> },
          { path: '/inventory', element: <PlaceholderPage title="Inventory" /> },
          { path: '/inventory/medicines', element: <InventoryPage /> },
          { path: '/inventory/transactions', element: <PlaceholderPage title="Inventory Transactions" /> },
          { path: '/inventory/dispensing', element: <DispensingPage /> },
          { path: '/emergencies', element: <EmergenciesPage /> },
          { path: '/certificates', element: <CertificatesPage /> },
          { path: '/vaccinations', element: <VaccinationHistoryPage /> },
          { path: '/screenings', element: <ScreeningsPage /> },
          { path: '/reports', element: <Navigate to="/dashboard" replace /> },
          { path: '/notifications', element: <NotificationsPage /> },
          { path: '/announcements', element: <AnnouncementsPage /> },
          { path: '/admin/users', element: <AdminUsersPage /> },
          { path: '/admin/roles', element: <AdminRolesPage /> },
          { path: '/admin/academic-years', element: <AcademicYearsPage /> },
          { path: '/admin/audit-logs', element: <AuditLogsPage /> },
          { path: '/admin/settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
]);
