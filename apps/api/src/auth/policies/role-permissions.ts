import { Permission } from '../constants/permissions';
import { UserRole } from '../constants/roles';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  // Administrators manage the full system, including clinical configuration
  // and patient records. Keeping this derived from the enum prevents newly
  // introduced permissions from silently locking administrators out.
  [UserRole.ADMINISTRATOR]: Object.values(Permission),
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
  ],
  [UserRole.DOCTOR]: [
    Permission.PATIENTS_READ,
    Permission.PATIENTS_MANAGE,
    Permission.CLINICAL_READ,
    Permission.CLINICAL_MANAGE,
  ],
  [UserRole.CLINIC_STAFF]: [
    Permission.PATIENTS_READ,
    Permission.PATIENTS_MANAGE,
    Permission.APPOINTMENTS_MANAGE,
    Permission.REQUIREMENTS_MANAGE,
    Permission.CLEARANCES_MANAGE,
  ],
  [UserRole.STUDENT]: [Permission.OWN_PROFILE_READ],
  [UserRole.FACULTY_STAFF]: [Permission.OWN_PROFILE_READ],
};
