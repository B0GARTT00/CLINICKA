import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { AppLayout } from '../layouts/AppLayout';
import { DashboardPage } from '../pages/DashboardPage';
import { ClinicVisitsPage } from '../pages/ClinicVisitsPage';
import { AppointmentsPage } from '../pages/AppointmentsPage';
import { RequirementsPage } from '../pages/RequirementsPage';
import { ClearancesPage } from '../pages/ClearancesPage';
import { VaccinationHistoryPage } from '../pages/VaccinationHistoryPage';
import { ScreeningsPage } from '../pages/ScreeningsPage';
import { InventoryPage } from '../pages/InventoryPage';
import { InventoryTransactionsPage } from '../pages/InventoryTransactionsPage';
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

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  { path: '/login', element: (
    <AuthLayout
      align="right"
      className="max-w-[440px]"
      branding={
        <div className="flex items-center gap-4">
          <img src="/Clinova.png" alt="CLINOVA logo" width="100" height="100" className="h-20 w-20 rounded-full object-contain ring-1 ring-white/20" />
          <h1 className="text-6xl font-semibold tracking-tight text-white">CLINOVA</h1>
        </div>
      }
      marketing={
        <>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-100/85">Brokenshire College</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight">Care that keeps<br />your community well.</h1>
          <p className="mt-3 text-sm leading-6 text-emerald-50/70">A web-based health information management system for private higher education in Davao City.</p>
        </>
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
          { path: '/clinic/visits/new', element: <PlaceholderPage title="New Clinic Visit" /> },
          { path: '/appointments', element: <AppointmentsPage /> },
          { path: '/requirements', element: <RequirementsPage /> },
          { path: '/requirements/submissions', element: <PlaceholderPage title="Requirement Submissions" /> },
          { path: '/clearances', element: <ClearancesPage /> },
          { path: '/inventory', element: <Navigate to="/inventory/medicines" replace /> },
          { path: '/inventory/medicines', element: <InventoryPage /> },
          { path: '/inventory/transactions', element: <InventoryTransactionsPage /> },
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
