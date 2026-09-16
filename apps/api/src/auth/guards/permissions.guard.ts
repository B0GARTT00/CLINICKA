import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { Permission } from '../constants/permissions';
import { ROLE_PERMISSIONS } from '../policies/role-permissions';
import { UserRole } from '../constants/roles';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredPermissions?.length) return true;

    const request = context.switchToHttp().getRequest<{ user?: { roles?: string[] } }>();
    const userRoles = request.user?.roles ?? [];

    const userPermissions = new Set<string>();
    for (const role of userRoles) {
      const permissions = ROLE_PERMISSIONS[role as UserRole];
      if (permissions) {
        for (const permission of permissions) {
          userPermissions.add(permission);
        }
      }
    }

    const hasPermission = requiredPermissions.some((permission) => userPermissions.has(permission));
    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to perform this action');
    }

    return true;
  }
}
