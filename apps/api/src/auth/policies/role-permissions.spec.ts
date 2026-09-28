import { Permission } from '../constants/permissions';
import { ROLE_PERMISSIONS } from './role-permissions';
import { discoverRoutes } from '../../../test/support/route-registry';
import { PUBLIC_ROUTES } from '../constants/api-security';

const routes = discoverRoutes();

/**
 * These assertions are the structural half of the authorization policy. They
 * fail the build when a route is added without a declaration, when a role is
 * listed on a route it cannot actually satisfy, or when `@Public()` and the
 * published public-route list disagree.
 */
describe('authorization policy coverage', () => {
  it('discovers the whole active API surface', () => {
    // Guards against a controller silently dropping out of the registry, which
    // would make every check below vacuously pass.
    expect(routes.length).toBeGreaterThan(60);
    expect(new Set(routes.map((route) => `${route.method} ${route.path}`)).size).toBe(routes.length);
  });

  describe('every route carries an explicit authorization decision', () => {
    it.each(routes.map((route) => [`${route.method.toUpperCase()} ${route.path}`, route] as const))(
      '%s',
      (_label, route) => {
        if (route.isPublic) {
          // A public route must not also claim role or permission requirements.
          expect({ roles: route.roles, permissions: route.permissions }).toEqual({
            roles: [],
            permissions: [],
          });
          return;
        }

        // A reachable-but-undeclared route would let any authenticated user
        // call it, so at least one declaration is mandatory.
        expect({
          path: route.path,
          declarations: route.roles.length + route.permissions.length,
        }).toEqual({
          path: route.path,
          declarations: expect.any(Number),
        });
        expect(route.roles.length + route.permissions.length).toBeGreaterThan(0);
      },
    );
  });

  it('rejects roles that could never satisfy the permissions a route demands', () => {
    const contradictions = routes.flatMap((route) =>
      route.roles
        .filter((role) => !route.permissions.every((permission) => ROLE_PERMISSIONS[role].includes(permission)))
        .map((role) => `${role} is listed on ${route.method.toUpperCase()} ${route.path} but does not hold ${route.permissions.join(', ')}`),
    );

    expect(contradictions).toEqual([]);
  });

  it('grants administrators every permission', () => {
    for (const permission of Object.values(Permission)) {
      expect(ROLE_PERMISSIONS.ADMINISTRATOR).toContain(permission);
    }
  });

  it('does not let student-shaped roles reach clinic or administrative capabilities', () => {
    const forbidden: Permission[] = [
      Permission.USERS_MANAGE,
      Permission.ROLES_MANAGE,
      Permission.AUDIT_READ,
      Permission.ACADEMIC_MANAGE,
      Permission.PATIENTS_READ,
      Permission.PATIENTS_MANAGE,
      Permission.CLINICAL_READ,
      Permission.CLINICAL_MANAGE,
      Permission.VISITS_READ,
      Permission.VISITS_MANAGE,
      Permission.APPOINTMENTS_READ,
      Permission.APPOINTMENTS_MANAGE,
      Permission.CLEARANCES_READ,
      Permission.CLEARANCES_MANAGE,
      Permission.CLEARANCES_REVIEW,
      Permission.EVIDENCE_REVIEW,
      Permission.DOCUMENTS_MANAGE,
      Permission.INVENTORY_READ,
      Permission.INVENTORY_MANAGE,
      Permission.DISPENSING_READ,
      Permission.DISPENSING_MANAGE,
      Permission.REPORTS_READ,
      Permission.ANNOUNCEMENTS_MANAGE,
    ];

    for (const role of ['STUDENT', 'FACULTY_STAFF'] as const) {
      for (const permission of forbidden) {
        expect({ role, permission, held: ROLE_PERMISSIONS[role].includes(permission) }).toEqual({
          role,
          permission,
          held: false,
        });
      }
    }
  });

  it('does not let front-desk staff dispense, review clearances, or read the audit trail', () => {
    const excluded: Permission[] = [
      Permission.DISPENSING_MANAGE,
      Permission.DISPENSING_RECONCILE,
      Permission.CLEARANCES_REVIEW,
      Permission.EVIDENCE_REVIEW,
      Permission.AUDIT_READ,
      Permission.USERS_MANAGE,
      Permission.ROLES_MANAGE,
      Permission.ACADEMIC_MANAGE,
    ];

    for (const permission of excluded) {
      expect(ROLE_PERMISSIONS.CLINIC_STAFF.includes(permission)).toBe(false);
    }
  });

  it('keeps the published public-route list in step with @Public()', () => {
    const declaredPublic = routes
      .filter((route) => route.isPublic)
      .map((route) => `${route.method.toUpperCase()} ${route.path}`)
      .sort();

    const listed = PUBLIC_ROUTES.map((route) => `${route.method.toUpperCase()} ${route.path}`).sort();

    expect(declaredPublic).toEqual(listed);
  });

  it('confines public routes to health and authentication', () => {
    // Anything reachable without a token must stay on a non-clinical,
    // non-administrative surface.
    for (const route of PUBLIC_ROUTES) {
      expect(route.path).toMatch(/^\/api\/v1\/(health|auth)(\/|$)/);
    }
  });

  it('does not publish a public route that exposes patient or administrative data', () => {
    const sensitiveSegments = ['/patients', '/users', '/audit-logs', '/inventory', '/clinic-visits', '/evidence', '/documents'];
    for (const route of PUBLIC_ROUTES) {
      for (const segment of sensitiveSegments) {
        expect(route.path.startsWith(`/api/v1${segment}`)).toBe(false);
      }
    }
  });
});
