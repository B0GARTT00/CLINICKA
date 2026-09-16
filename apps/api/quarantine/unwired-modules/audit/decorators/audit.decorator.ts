import { SetMetadata } from '@nestjs/common';

export const AUDIT_KEY = 'audit';
export const AUDITED_ENTITIES = new Set([
  'User',
  'Patient',
  'ClinicVisit',
  'Consultation',
  'Appointment',
  'HealthRequirement',
  'Clearance',
  'VaccinationRecord',
  'HealthScreening',
  'MedicalCertificate',
  'EmergencyCase',
  'Role',
  'Permission',
]);

export interface AuditMetadata {
  entityType: string;
  entityIdParam?: string;
}

export const Audited = (entityType: string, entityIdParam?: string) =>
  SetMetadata(AUDIT_KEY, { entityType, entityIdParam } as AuditMetadata);
