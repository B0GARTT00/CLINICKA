import { describe, expect, it } from 'vitest';
import { canAccessPath, permissionsForRoles, requiredPermissionsForPath, ROLE_PERMISSIONS } from './authorization';



describe('frontend route authorization policy', () => {
  it('allows public authenticated workflows for campus users', () => {
    expect(canAccessPath('/dashboard', ['STUDENT'])).toBe(true);
    expect(canAccessPath('/requirements', ['FACULTY_STAFF'])).toBe(true);
    expect(canAccessPath('/clearances', ['STUDENT'])).toBe(true);
    expect(canAccessPath('/clearances', ['FACULTY_STAFF'])).toBe(true);
  });

  it('allows every supported user role to access settings', () => {
    for (const role of Object.keys(ROLE_PERMISSIONS) as Array<keyof typeof ROLE_PERMISSIONS>) {
      expect(canAccessPath('/settings', [role])).toBe(true);
    }
  });

  it('protects direct clinical and inventory URLs by role', () => {
    expect(canAccessPath('/patients/patient-1', ['DOCTOR'])).toBe(true);
    expect(canAccessPath('/patients/patient-1', ['STUDENT'])).toBe(false);
    // Matches GET /api/v1/inventory/medicines, which front-desk staff may read.
    expect(canAccessPath('/inventory/medicines', ['CLINIC_NURSE'])).toBe(true);
    expect(canAccessPath('/inventory/medicines', ['CLINIC_STAFF'])).toBe(true);
    expect(canAccessPath('/inventory/medicines', ['STUDENT'])).toBe(false);
    expect(canAccessPath('/inventory/transactions', ['CLINIC_STAFF'])).toBe(true);
  });

  it('restricts review and administration routes', () => {
    // Evidence review is limited to the clinical reviewers, matching the API.
    expect(canAccessPath('/requirements/submissions', ['STUDENT'])).toBe(false);
    expect(canAccessPath('/requirements/submissions', ['CLINIC_STAFF'])).toBe(false);
    expect(canAccessPath('/requirements/submissions', ['DOCTOR'])).toBe(true);
    expect(canAccessPath('/admin/users', ['CLINIC_NURSE'])).toBe(false);
    expect(canAccessPath('/admin/users', ['ADMINISTRATOR'])).toBe(true);
    expect(canAccessPath('/announcements', ['STUDENT'])).toBe(false);
    expect(canAccessPath('/announcements', ['FACULTY_STAFF'])).toBe(false);
    expect(canAccessPath('/announcements', ['CLINIC_STAFF'])).toBe(true);
  });

  it('does not offer a doctor the new-visit screen the API would refuse', () => {
    // A doctor holds visits.manage for consultations and status changes, but
    // POST /api/v1/clinic-visits excludes doctors.
    expect(canAccessPath('/clinic/visits/new', ['DOCTOR'])).toBe(false);
    expect(canAccessPath('/clinic/visits/new', ['CLINIC_NURSE'])).toBe(true);
    expect(canAccessPath('/clinic/visits/new', ['CLINIC_STAFF'])).toBe(true);
  });

  it('denies routes missing from the explicit policy', () => {
    expect(requiredPermissionsForPath('/not-configured')).toBeNull();
    expect(canAccessPath('/not-configured', ['ADMINISTRATOR'])).toBe(false);
  });

  it('confines administrators to system administration', () => {
    expect(permissionsForRoles(['ADMINISTRATOR'])).toEqual(new Set(ROLE_PERMISSIONS.ADMINISTRATOR));
    for (const path of ['/patients', '/patients/patient-1', '/clinic/visits', '/appointments', '/reports', '/certificates', '/clearances', '/messages', '/inventory/medicines', '/dental-records', '/vaccinations', '/screenings']) {
      expect(canAccessPath(path, ['ADMINISTRATOR'])).toBe(false);
    }
    for (const path of ['/dashboard', '/admin/users', '/admin/roles', '/admin/academic-years', '/admin/audit-logs', '/admin/settings']) {
      expect(canAccessPath(path, ['ADMINISTRATOR'])).toBe(true);
    }
  });

  it('keeps student and faculty roles away from clinical and administrative screens', () => {
    for (const role of ['STUDENT', 'FACULTY_STAFF'] as const) {
      for (const path of [
        '/patients',
        '/clinic/visits',
        '/inventory/medicines',
        '/reports',
        '/admin/users',
        '/admin/audit-logs',
        '/certificates',
        '/emergencies',
      ]) {
        expect({ role, path, allowed: canAccessPath(path, [role]) }).toEqual({ role, path, allowed: false });
      }
    }
  });
});
