import { ForbiddenException } from '@nestjs/common';
import { assertPatientOwnership, isClinicalPrincipal } from './patient-ownership';

const principal = (patientId: string | null, ...roles: string[]) => ({
  patientId,
  roles: roles.map((name) => ({ role: { name } })),
});

describe('patient ownership policy', () => {
  it('allows a patient-facing user to access the linked patient only', () => {
    expect(() => assertPatientOwnership(principal('patient-1', 'STUDENT'), 'patient-1')).not.toThrow();
    expect(() => assertPatientOwnership(principal('patient-1', 'STUDENT'), 'patient-2')).toThrow(ForbiddenException);
  });

  it('rejects an unlinked or non-patient-facing account', () => {
    expect(() => assertPatientOwnership(principal(null, 'STUDENT'), 'patient-1')).toThrow(ForbiddenException);
    expect(() => assertPatientOwnership(principal('patient-1'), 'patient-1')).toThrow(ForbiddenException);
  });

  it.each(['ADMINISTRATOR', 'CLINIC_NURSE', 'CLINIC_STAFF', 'DOCTOR'])(
    'preserves cross-patient access for %s',
    (role) => {
      const user = principal(null, role);
      expect(isClinicalPrincipal(user)).toBe(true);
      expect(() => assertPatientOwnership(user, 'patient-2')).not.toThrow();
    },
  );
});
