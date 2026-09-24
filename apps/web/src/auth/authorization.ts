import type { UserRoleName } from '@bchealth/types';

export type Permission =
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

export const ROLE_PERMISSIONS: Record<UserRoleName, Permission[]> = {
  ADMINISTRATOR: ['users.manage', 'roles.manage', 'reports.read', 'audit.read'],
  CLINIC_NURSE: ['patients.read', 'patients.manage', 'clinical.read', 'clinical.manage', 'appointments.manage', 'requirements.manage', 'clearances.manage', 'inventory.manage', 'inventory.transactions.read', 'reports.read'],
  DOCTOR: ['patients.read', 'patients.manage', 'clinical.read', 'clinical.manage'],
  CLINIC_STAFF: ['patients.read', 'patients.manage', 'appointments.manage', 'requirements.manage', 'clearances.manage', 'inventory.transactions.read'],
  STUDENT: ['own_profile.read'],
  FACULTY_STAFF: ['own_profile.read'],
};

export const ROUTE_PERMISSIONS: Record<string, Permission[]> = {
  '/dashboard': [],
  '/patients': ['patients.read'],
  '/patients/:id': ['patients.read'],
  '/clinic/visits': ['clinical.read'],
  '/clinic/visits/new': ['clinical.manage'],
  '/appointments': ['appointments.manage'],
  '/requirements': [],
  '/requirements/submissions': ['requirements.manage'],
  '/clearances': ['requirements.manage', 'clearances.manage'],
  '/vaccinations': ['clinical.manage'],
  '/screenings': ['clinical.manage'],
  '/certificates': ['clinical.manage'],
  '/emergencies': ['clinical.manage'],
  '/inventory': ['inventory.manage'],
  '/inventory/medicines': ['inventory.manage'],
  '/inventory/transactions': ['inventory.transactions.read'],
  '/inventory/dispensing': ['inventory.manage'],
  '/announcements': [],
  '/notifications': [],
  '/reports': ['reports.read'],
  '/admin/users': ['users.manage'],
  '/admin/roles': ['roles.manage'],
  '/admin/academic-years': ['users.manage', 'roles.manage'],
  '/admin/audit-logs': ['audit.read'],
  '/admin/settings': ['users.manage', 'roles.manage'],
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

export function requiredPermissionsForPath(pathname: string) {
  const match = Object.entries(ROUTE_PERMISSIONS).find(([pattern]) => matchesRoute(pattern, pathname));
  return match?.[1] ?? null;
}

export function canAccessPath(pathname: string, roles: UserRoleName[]) {
  const required = requiredPermissionsForPath(pathname);
  if (required === null) return false;
  if (required.length === 0 || roles.includes('ADMINISTRATOR')) return true;
  const granted = permissionsForRoles(roles);
  return required.every((permission) => granted.has(permission));
}
