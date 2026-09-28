import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission } from '../constants/permissions';
import { UserRole } from '../constants/roles';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { permissionsForRoles } from '../policies/resolve-permissions';

type AuthenticatedRequest = { user?: { id?: string; roles?: string[] } };

/**
 * The single authorization gate for every route.
 *
 * It applies both declared requirements in one place so that a route cannot
 * accidentally be protected by one mechanism and bypass the other:
 *
 * - `@Roles(...)` passes when the caller holds any one of the listed roles.
 * - `@Permissions(...)` passes only when the caller holds *every* listed
 *   permission. Requiring several permissions therefore means all of them.
 *
 * Both checks fail the same way — a `ForbiddenException` carrying a message
 * that names what was missing — so an unauthorized request is rejected
 * consistently regardless of which declaration caught it.
 *
 * Record-level access (a patient seeing only their own chart, a user reading
 * only their own notifications) is deliberately not enforced here; it depends
 * on the row being touched and lives in the service layer.
 */
@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length && !requiredPermissions?.length) return true;

    const userRoles = context.switchToHttp().getRequest<AuthenticatedRequest>().user?.roles ?? [];
    const missing: string[] = [];

    if (requiredRoles?.length && !requiredRoles.some((role) => userRoles.includes(role))) {
      missing.push(`one of the required roles (${requiredRoles.join(', ')})`);
    }

    if (requiredPermissions?.length) {
      const granted = permissionsForRoles(userRoles);
      const unmet = requiredPermissions.filter((permission) => !granted.has(permission));
      if (unmet.length) {
        missing.push(`the required permission${unmet.length > 1 ? 's' : ''} (${unmet.join(', ')})`);
      }
    }

    if (missing.length) {
      throw new ForbiddenException(`You do not have permission to perform this action: requires ${missing.join(' and ')}.`);
    }

    return true;
  }
}
