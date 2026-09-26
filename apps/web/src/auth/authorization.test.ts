import { describe, expect, it } from 'vitest';
import { canAccessPath, requiredPermissionsForPath } from './authorization';

describe('frontend route authorization policy', () => {
  it('allows public authenticated workflows for campus users', () => {
    expect(canAccessPath('/dashboard', ['STUDENT'])).toBe(true);
    expect(canAccessPath('/requirements', ['FACULTY_STAFF'])).toBe(true);
  });

  it('protects direct clinical and inventory URLs by role', () => {
    expect(canAccessPath('/patients/patient-1', ['DOCTOR'])).toBe(true);
    expect(canAccessPath('/patients/patient-1', ['STUDENT'])).toBe(false);
    expect(canAccessPath('/inventory/medicines', ['CLINIC_NURSE'])).toBe(true);
    expect(canAccessPath('/inventory/medicines', ['CLINIC_STAFF'])).toBe(false);
    expect(canAccessPath('/inventory/transactions', ['CLINIC_STAFF'])).toBe(true);
  });

  it('restricts review and administration routes', () => {
    expect(canAccessPath('/requirements/submissions', ['STUDENT'])).toBe(false);
    expect(canAccessPath('/requirements/submissions', ['CLINIC_STAFF'])).toBe(true);
    expect(canAccessPath('/admin/users', ['CLINIC_NURSE'])).toBe(false);
    expect(canAccessPath('/admin/users', ['ADMINISTRATOR'])).toBe(true);
  });

  it('denies routes missing from the explicit policy', () => {
    expect(requiredPermissionsForPath('/not-configured')).toBeNull();
    expect(canAccessPath('/not-configured', ['ADMINISTRATOR'])).toBe(false);
  });
});
