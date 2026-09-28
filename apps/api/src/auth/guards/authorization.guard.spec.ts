import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthorizationGuard } from './authorization.guard';
import { Permission } from '../constants/permissions';
import { UserRole } from '../constants/roles';
import { Permissions } from '../decorators/permissions.decorator';
import { Roles } from '../decorators/roles.decorator';

class ReadOnlyClinician {
  @Roles(UserRole.DOCTOR)
  @Permissions(Permission.CLINICAL_READ)
  read() {}
}

class ClinicalReview {
  @Permissions(Permission.CLEARANCES_REVIEW, Permission.EVIDENCE_REVIEW)
  handle() {}
}

class NurseOnlyReporting {
  @Roles(UserRole.CLINIC_NURSE)
  @Permissions(Permission.REPORTS_READ)
  report() {}
}

class Undeclared {
  handle() {}
}

describe('AuthorizationGuard', () => {
  const guard = new AuthorizationGuard(new Reflector());

  function contextFor(handler: (...args: never[]) => unknown, roles?: string[]): ExecutionContext {
    const request: { user: { id: string; roles?: string[] } } = { user: { id: 'user-1', roles } };
    return {
      getHandler: () => handler,
      getClass: () => Undeclared,
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
  }

  it('allows any authenticated user through a route that declares nothing', () => {
    expect(guard.canActivate(contextFor(Undeclared.prototype.handle, [UserRole.STUDENT]))).toBe(true);
  });

  it('allows a caller that satisfies both declarations', () => {
    expect(guard.canActivate(contextFor(ReadOnlyClinician.prototype.read, [UserRole.DOCTOR]))).toBe(true);
  });

  it('rejects a caller whose role is not listed even when the role would grant the permission', () => {
    // CLINIC_NURSE holds clinical.read, but the route is narrowed to doctors,
    // so the coarse role gate still applies.
    expect(() => guard.canActivate(contextFor(ReadOnlyClinician.prototype.read, [UserRole.CLINIC_NURSE]))).toThrow(
      /one of the required roles \(DOCTOR\)/,
    );
  });

  it('rejects a caller that satisfies the role but not the permission', () => {
    expect(() => guard.canActivate(contextFor(NurseOnlyReporting.prototype.report, [UserRole.DOCTOR]))).toThrow(
      /one of the required roles/,
    );
  });

  it('rejects an unauthenticated caller instead of treating them as merely unprivileged', () => {
    expect(() => guard.canActivate(contextFor(ReadOnlyClinician.prototype.read, undefined))).toThrow(
      ForbiddenException,
    );
  });

  it('rejects a role the API does not recognise', () => {
    expect(() => guard.canActivate(contextFor(ReadOnlyClinician.prototype.read, ['SUPERUSER']))).toThrow(
      ForbiddenException,
    );
  });

  describe('permission requirements are conjunctive', () => {
    it('allows a caller holding every declared permission', () => {
      expect(guard.canActivate(contextFor(ClinicalReview.prototype.handle, [UserRole.CLINIC_NURSE]))).toBe(true);
    });

    it('rejects a caller holding only one of the declared permissions', () => {
      // A doctor may review evidence but not clearances. The previous OR-based
      // guard treated that single match as sufficient and let the call through.
      expect(() => guard.canActivate(contextFor(ClinicalReview.prototype.handle, [UserRole.DOCTOR]))).toThrow(
        /clearances\.review/,
      );
    });
  });

  describe('failure reporting', () => {
    it('names every unmet permission in a single message', () => {
      expect.assertions(1);
      try {
        guard.canActivate(contextFor(ClinicalReview.prototype.handle, [UserRole.STUDENT]));
      } catch (error) {
        expect((error as ForbiddenException).message).toBe(
          'You do not have permission to perform this action: requires the required permissions (clearances.review, evidence.review).',
        );
      }
    });

    it('reports role and permission shortfalls together when both apply', () => {
      expect.assertions(1);
      try {
        guard.canActivate(contextFor(ReadOnlyClinician.prototype.read, [UserRole.STUDENT]));
      } catch (error) {
        expect((error as ForbiddenException).message).toBe(
          'You do not have permission to perform this action: requires one of the required roles (DOCTOR) and the required permission (clinical.read).',
        );
      }
    });

    it('always answers with 403 and a ForbiddenException', () => {
      expect.assertions(2);
      try {
        guard.canActivate(contextFor(ClinicalReview.prototype.handle, [UserRole.STUDENT]));
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect((error as ForbiddenException).getStatus()).toBe(403);
      }
    });
  });
});
