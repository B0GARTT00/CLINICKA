import { Permission } from '../constants/permissions';
import { UserRole } from '../constants/roles';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMINISTRATOR]: [
    Permission.USERS_MANAGE,
    Permission.ROLES_MANAGE,
    Permission.REPORTS_READ,
    Permission.AUDIT_READ,
  ],
  [UserRole.CLINIC_NURSE]: [
    Permission.PATIENTS_READ,
    Permission.PATIENTS_MANAGE,
    Permission.CLINICAL_READ,
    Permission.CLINICAL_MANAGE,
    Permission.APPOINTMENTS_MANAGE,
    Permission.REQUIREMENTS_MANAGE,
    Permission.CLEARANCES_MANAGE,
    Permission.INVENTORY_MANAGE,
    Permission.REPORTS_READ,
    Permission.DOCUMENTS_MANAGE,
    Permission.VISITS_MANAGE,
  ],
  [UserRole.DOCTOR]: [
    Permission.PATIENTS_READ,
    Permission.PATIENTS_MANAGE,
    Permission.CLINICAL_READ,
    Permission.CLINICAL_MANAGE,
    Permission.DOCUMENTS_MANAGE,
    Permission.VISITS_MANAGE,
  ],
  [UserRole.CLINIC_STAFF]: [
    Permission.PATIENTS_READ,
    Permission.PATIENTS_MANAGE,
    Permission.CLINICAL_READ,
    Permission.CLINICAL_MANAGE,
    Permission.APPOINTMENTS_MANAGE,
    Permission.REQUIREMENTS_MANAGE,
    Permission.CLEARANCES_MANAGE,
    Permission.DOCUMENTS_MANAGE,
  ],
  [UserRole.STUDENT]: [Permission.OWN_PROFILE_READ],
  [UserRole.FACULTY_STAFF]: [Permission.OWN_PROFILE_READ],
};
