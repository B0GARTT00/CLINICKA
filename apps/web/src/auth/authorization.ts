import type { UserRoleName } from '@bchealth/types';

/**
 * Front-end route gating. This is a user-experience affordance only — it hides
 * screens a user cannot use. It is never the security boundary: every request
 * goes to the API, which authorizes it independently from the caller's token.
 * A `403` from the server is authoritative and is surfaced through
 * `SERVER_FORBIDDEN_EVENT` in `services/api.ts`.
 *
 * `apps/api/src/auth/policies/role-permissions.ts` and
 * `apps/api/src/auth/constants/permissions.ts` are the authority for both the
 * permission names and the role-to-permission mapping below. The API's
 * `AuthorizationGuard` is conjunctive in the same way `canAccessPath` is, so a
 * path is only offered when the server would also accept the call.
 */
export type Permission =
  | 'users.manage'
  | 'roles.manage'
  | 'audit.read'
  | 'academic.read'
  | 'academic.manage'
  | 'patients.read'
  | 'patients.manage'
  | 'own_profile.read'
  | 'own_account.read'
  | 'own_session.manage'
  | 'clinical.read'
  | 'clinical.manage'
  | 'visits.read'
  | 'visits.manage'
  | 'emergencies.read'
  | 'emergencies.manage'
  | 'certificates.read'
  | 'certificates.manage'
  | 'screenings.read'
  | 'screenings.manage'
  | 'vaccinations.read'
  | 'vaccinations.manage'
  | 'appointments.read'
  | 'appointments.manage'
  | 'appointments.check_in'
  | 'requirements.read'
  | 'requirements.manage'
  | 'clearances.read'
  | 'clearances.request'
  | 'clearances.manage'
  | 'clearances.review'
  | 'evidence.submit'
  | 'evidence.read'
  | 'evidence.review'
  | 'documents.read'
  | 'documents.manage'
  | 'inventory.read'
  | 'inventory.manage'
  | 'inventory.transactions.read'
  | 'dispensing.read'
  | 'dispensing.manage'
  | 'dispensing.reconcile'
  | 'announcements.read'
  | 'announcements.manage'
  | 'notifications.read'
  | 'reports.read'
  | 'reports.export';

/** Mirrors `ROLE_PERMISSIONS` in the API. */
export const ROLE_PERMISSIONS: Record<UserRoleName, Permission[]> = {
  ADMINISTRATOR: [
    'users.manage', 'roles.manage', 'audit.read', 'academic.read', 'academic.manage',
    'patients.read', 'patients.manage', 'own_profile.read', 'own_account.read', 'own_session.manage',
    'clinical.read', 'clinical.manage', 'visits.read', 'visits.manage', 'emergencies.read', 'emergencies.manage',
    'certificates.read', 'certificates.manage', 'screenings.read', 'screenings.manage',
    'vaccinations.read', 'vaccinations.manage', 'appointments.read', 'appointments.manage',
    'appointments.check_in', 'requirements.read', 'requirements.manage', 'clearances.read', 'clearances.request',
    'clearances.manage', 'clearances.review', 'evidence.submit', 'evidence.read', 'evidence.review',
    'documents.read', 'documents.manage', 'inventory.read', 'inventory.manage',
    'inventory.transactions.read', 'dispensing.read', 'dispensing.manage', 'dispensing.reconcile',
    'announcements.read', 'announcements.manage', 'notifications.read', 'reports.read',
    'reports.export',
  ],
  CLINIC_NURSE: [
    'academic.read', 'appointments.read', 'appointments.manage', 'appointments.check_in',
    'certificates.read', 'certificates.manage', 'clearances.read', 'clearances.request', 'clearances.manage', 'clearances.review',
    'clinical.read', 'clinical.manage', 'dispensing.read', 'dispensing.manage', 'dispensing.reconcile',
    'documents.read', 'documents.manage', 'emergencies.read', 'emergencies.manage', 'evidence.read',
    'evidence.review', 'inventory.read', 'inventory.manage', 'inventory.transactions.read',
    'notifications.read', 'announcements.read', 'announcements.manage', 'patients.read', 'patients.manage',
    'reports.read', 'requirements.read', 'requirements.manage', 'screenings.read', 'screenings.manage',
    'reports.export',
    'vaccinations.read', 'vaccinations.manage', 'visits.read', 'visits.manage',
    'own_account.read', 'own_session.manage',
  ],
  DOCTOR: [
    'appointments.read', 'appointments.check_in', 'certificates.read', 'certificates.manage',
    'clearances.read', 'clearances.request', 'clinical.read', 'clinical.manage', 'dispensing.read', 'dispensing.reconcile',
    'documents.read', 'documents.manage', 'emergencies.read', 'emergencies.manage', 'evidence.read',
    'evidence.review', 'notifications.read', 'announcements.read', 'patients.read', 'patients.manage',
    'reports.read', 'requirements.read', 'screenings.read', 'vaccinations.read', 'visits.read',
    'visits.manage', 'own_account.read', 'own_session.manage',
  ],
  CLINIC_STAFF: [
    'academic.read', 'appointments.read', 'appointments.manage', 'appointments.check_in',
    'certificates.read', 'certificates.manage', 'clearances.read', 'clearances.request', 'clearances.manage',
    'clinical.read', 'clinical.manage', 'dispensing.read', 'documents.read', 'documents.manage',
    'evidence.read', 'inventory.read', 'inventory.transactions.read', 'notifications.read',
    'announcements.read', 'announcements.manage', 'patients.read', 'patients.manage', 'reports.read', 'requirements.read',
    'requirements.manage', 'screenings.read', 'screenings.manage', 'vaccinations.read',
    'vaccinations.manage', 'visits.read', 'visits.manage', 'own_account.read', 'own_session.manage',
  ],
  STUDENT: [
    'clearances.request', 'documents.read', 'evidence.read', 'evidence.submit', 'notifications.read',
    'own_profile.read', 'requirements.read', 'own_account.read', 'own_session.manage',
  ],
  FACULTY_STAFF: [
    'clearances.request', 'documents.read', 'evidence.read', 'evidence.submit', 'notifications.read',
    'own_profile.read', 'requirements.read', 'own_account.read', 'own_session.manage',
  ],
};

type RouteRule = {
  /** Every listed permission must be held. */
  permissions?: Permission[];
  /** When present, the caller must hold at least one of these roles. */
  roles?: UserRoleName[];
};

/**
 * Mirrors the API's per-endpoint role lists. A path is only offered to a role
 * the corresponding endpoint would actually let through.
 */
export const ROUTE_PERMISSIONS: Record<string, RouteRule> = {
  // No API call backs the dashboard; it is a landing page for any signed-in user.
  '/dashboard': {},
  '/patients': { permissions: ['patients.read'] },
  '/patients/:id': { permissions: ['patients.read'] },
  '/my-profile': { permissions: ['own_profile.read'], roles: ['STUDENT', 'FACULTY_STAFF'] },
  // The API lets a doctor read and progress visits but not open a new one.
  '/clinic/visits': { permissions: ['visits.read'] },
  '/clinic/visits/new': {
    permissions: ['visits.manage'],
    roles: ['ADMINISTRATOR', 'CLINIC_NURSE', 'CLINIC_STAFF'],
  },
  '/appointments': { permissions: ['appointments.read'] },
  '/requirements': { permissions: ['requirements.read'] },
  '/requirements/submissions': { permissions: ['evidence.review'] },
  '/clearances': { permissions: ['clearances.request'] },
  '/vaccinations': { permissions: ['vaccinations.read'] },
  '/screenings': { permissions: ['screenings.read'] },
  '/certificates': { permissions: ['certificates.read'] },
  '/my-certificates': { permissions: ['own_profile.read'], roles: ['STUDENT', 'FACULTY_STAFF'] },
  '/emergencies': { permissions: ['emergencies.read'] },
  '/inventory': { permissions: ['inventory.read'] },
  '/inventory/medicines': { permissions: ['inventory.read'] },
  '/inventory/transactions': { permissions: ['inventory.transactions.read'] },
  '/inventory/dispensing': { permissions: ['dispensing.read'] },
  '/announcements': { permissions: ['announcements.manage'], roles: ['ADMINISTRATOR', 'CLINIC_NURSE', 'CLINIC_STAFF'] },
  '/notifications': {},
  '/reports': { permissions: ['reports.read'] },
  '/admin/users': { permissions: ['users.manage'] },
  '/admin/roles': { permissions: ['roles.manage'] },
  '/admin/academic-years': { permissions: ['academic.read'] },
  '/admin/audit-logs': { permissions: ['audit.read'] },
  '/admin/settings': { permissions: ['users.manage'] },
};

export function permissionsForRoles(roles: UserRoleName[]) {
  const permissions = new Set<Permission>();
  roles.forEach((role) => ROLE_PERMISSIONS[role]?.forEach((permission) => permissions.add(permission)));
  return permissions;
}

function matchesRoute(pattern: string, pathname: string) {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = pathname.split('/').filter(Boolean);
  return patternParts.length === pathParts.length && patternParts.every((part, index) => part.startsWith(':') || part === pathParts[index]);
}

/** Returns the permissions a path needs, or `null` when the path has no rule. */
export function requiredPermissionsForPath(pathname: string) {
  const match = Object.entries(ROUTE_PERMISSIONS).find(([pattern]) => matchesRoute(pattern, pathname));
  return match ? match[1].permissions ?? [] : null;
}

export function canAccessPath(pathname: string, roles: UserRoleName[]) {
  const match = Object.entries(ROUTE_PERMISSIONS).find(([pattern]) => matchesRoute(pattern, pathname));
  // A path with no rule is not offered at all, so the UI fails closed.
  if (!match) return false;

  const rule = match[1];
  if (rule.roles && !rule.roles.some((role) => roles.includes(role))) return false;

  const required = rule.permissions ?? [];
  if (!required.length) return true;

  const granted = permissionsForRoles(roles);
  return required.every((permission) => granted.has(permission));
}
