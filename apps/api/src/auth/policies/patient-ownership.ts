import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '../constants/roles';

export type PatientLinkedPrincipal = {
  patientId: string | null;
  roles: { role: { name: string } }[];
};

const CLINICAL_ROLES = new Set<string>([
  UserRole.ADMINISTRATOR,
  UserRole.CLINIC_NURSE,
  UserRole.CLINIC_STAFF,
  UserRole.DOCTOR,
]);

const SELF_SERVICE_ROLES = new Set<string>([
  UserRole.STUDENT,
  UserRole.FACULTY_STAFF,
]);

function hasRole(principal: PatientLinkedPrincipal, roles: ReadonlySet<string>) {
  return principal.roles.some(({ role }) => roles.has(role.name));
}

export function isClinicalPrincipal(principal: PatientLinkedPrincipal) {
  return hasRole(principal, CLINICAL_ROLES);
}

/**
 * Enforces the record-level half of self-service authorization.
 *
 * Clinical personnel retain role-based cross-patient access. Every other
 * caller must hold a patient-facing role and be linked to the exact patient
 * that owns the requested resource. This check belongs beside the database
 * query so changing a URL or query-string identifier cannot bypass it.
 */
export function assertPatientOwnership(
  principal: PatientLinkedPrincipal,
  resourcePatientId: string,
  message = 'You are not authorized to access this patient record.',
) {
  if (isClinicalPrincipal(principal)) return;
  if (
    !hasRole(principal, SELF_SERVICE_ROLES)
    || !principal.patientId
    || principal.patientId !== resourcePatientId
  ) {
    throw new ForbiddenException(message);
  }
}
