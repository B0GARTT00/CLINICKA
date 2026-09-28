import { Permission } from '../constants/permissions';
import { UserRole } from '../constants/roles';
import { ROLE_PERMISSIONS } from './role-permissions';

function isUserRole(value: string): value is UserRole {
  return Object.values(UserRole).includes(value as UserRole);
}

/**
 * Flattens the caller's roles into the set of permissions they hold.
 *
 * Unknown roles contribute nothing rather than being trusted, so a token
 * carrying a role the API does not recognise grants no privileges.
 */
export function permissionsForRoles(roles: readonly string[] | undefined | null): Set<Permission> {
  const permissions = new Set<Permission>();
  for (const role of roles ?? []) {
    if (!isUserRole(role)) continue;
    for (const permission of ROLE_PERMISSIONS[role]) {
      permissions.add(permission);
    }
  }
  return permissions;
}

export function rolesAreKnown(roles: readonly string[] | undefined | null): boolean {
  return (roles ?? []).every(isUserRole);
}
