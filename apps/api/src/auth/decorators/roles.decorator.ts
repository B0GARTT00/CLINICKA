import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../constants/roles';

export const ROLES_KEY = 'authorization:roles';

/**
 * Restricts a route to the listed roles. A caller holding any one of them
 * passes the role check; use `@Permissions(...)` to require capabilities
 * instead of or in addition to roles.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
