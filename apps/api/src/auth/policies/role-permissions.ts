import { Permission } from '../constants/permissions';
import { UserRole } from '../constants/roles';

/**
 * Self-service capabilities that every authenticated role holds. They only ever
 * reach data belonging to the caller, so they carry no cross-user reach and are
 * granted unconditionally rather than being repeated six times.
 */
const SELF_SERVICE = [Permission.OWN_ACCOUNT_READ, Permission.OWN_SESSION_MANAGE] as const;
const PATIENT_SELF_SERVICE = [Permission.OWN_PROFILE_READ, Permission.OWN_PROFILE_MANAGE] as const;

/**
 * Single source of truth for what each role may do.
 *
 * Every entry below is derived from the role set the endpoint already required,
 * so the table grants nothing new: it records the existing intent in a form the
 * `AuthorizationGuard` can enforce uniformly. The invariant is one-directional
 * — a role listed on a route's `@Roles(...)` must hold every permission that
 * route demands — and `role-permissions.spec.ts` fails the build when the two
 * drift apart.
 *
 * A role holds only what its operational duties need. Students and faculty see
 * their own record, published announcements, their own notifications, the
 * requirement catalogue, and the evidence they are entitled to see — and
 * nothing else.
 */
export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  [UserRole.ADMINISTRATOR]: Object.values(Permission),

  [UserRole.CLINIC_NURSE]: [
    Permission.ACADEMIC_READ,
    Permission.APPOINTMENTS_READ,
    Permission.APPOINTMENTS_MANAGE,
    Permission.APPOINTMENTS_CHECK_IN,
    Permission.CERTIFICATES_READ,
    Permission.CERTIFICATES_MANAGE,
    Permission.CLEARANCES_READ,
    Permission.CLEARANCES_REQUEST,
    Permission.CLEARANCES_MANAGE,
    Permission.CLEARANCES_REVIEW,
    Permission.CLINICAL_READ,
    Permission.CLINICAL_MANAGE,
    Permission.DISPENSING_READ,
    Permission.DISPENSING_MANAGE,
    Permission.DISPENSING_RECONCILE,
    Permission.DOCUMENTS_READ,
    Permission.DOCUMENTS_MANAGE,
    Permission.EMERGENCIES_READ,
    Permission.EMERGENCIES_MANAGE,
    Permission.EVIDENCE_READ,
    Permission.EVIDENCE_REVIEW,
    Permission.INVENTORY_READ,
    Permission.INVENTORY_MANAGE,
    Permission.INVENTORY_TRANSACTIONS_READ,
    Permission.NOTIFICATIONS_READ,
    Permission.MESSAGES_READ,
    Permission.MESSAGES_MANAGE,
    Permission.ANNOUNCEMENTS_READ,
    Permission.ANNOUNCEMENTS_MANAGE,
    Permission.PATIENTS_READ,
    Permission.PATIENTS_MANAGE,
    Permission.REPORTS_READ,
    Permission.REPORTS_EXPORT,
    Permission.REQUIREMENTS_READ,
    Permission.REQUIREMENTS_MANAGE,
    Permission.SCREENINGS_READ,
    Permission.SCREENINGS_MANAGE,
    Permission.VACCINATIONS_READ,
    Permission.VACCINATIONS_MANAGE,
    Permission.VISITS_READ,
    Permission.VISITS_MANAGE,
    ...SELF_SERVICE,
  ],

  [UserRole.DOCTOR]: [
    Permission.APPOINTMENTS_READ,
    Permission.APPOINTMENTS_CHECK_IN,
    Permission.CERTIFICATES_READ,
    Permission.CERTIFICATES_MANAGE,
    Permission.CLEARANCES_READ,
    Permission.CLEARANCES_REQUEST,
    Permission.CLINICAL_READ,
    Permission.CLINICAL_MANAGE,
    Permission.DISPENSING_READ,
    Permission.DISPENSING_RECONCILE,
    Permission.DOCUMENTS_READ,
    Permission.DOCUMENTS_MANAGE,
    Permission.EMERGENCIES_READ,
    Permission.EMERGENCIES_MANAGE,
    Permission.EVIDENCE_READ,
    Permission.EVIDENCE_REVIEW,
    Permission.NOTIFICATIONS_READ,
    Permission.MESSAGES_READ,
    Permission.MESSAGES_MANAGE,
    Permission.ANNOUNCEMENTS_READ,
    Permission.PATIENTS_READ,
    Permission.PATIENTS_MANAGE,
    Permission.REPORTS_READ,
    Permission.REQUIREMENTS_READ,
    Permission.SCREENINGS_READ,
    Permission.VACCINATIONS_READ,
    Permission.VISITS_READ,
    Permission.VISITS_MANAGE,
    ...SELF_SERVICE,
  ],

  [UserRole.CLINIC_STAFF]: [
    Permission.ACADEMIC_READ,
    Permission.APPOINTMENTS_READ,
    Permission.APPOINTMENTS_MANAGE,
    Permission.APPOINTMENTS_CHECK_IN,
    Permission.CERTIFICATES_READ,
    Permission.CERTIFICATES_MANAGE,
    Permission.CLEARANCES_READ,
    Permission.CLEARANCES_REQUEST,
    Permission.CLEARANCES_MANAGE,
    Permission.CLINICAL_READ,
    Permission.CLINICAL_MANAGE,
    Permission.DISPENSING_READ,
    Permission.DOCUMENTS_READ,
    Permission.DOCUMENTS_MANAGE,
    Permission.EVIDENCE_READ,
    Permission.INVENTORY_READ,
    Permission.INVENTORY_TRANSACTIONS_READ,
    Permission.NOTIFICATIONS_READ,
    Permission.MESSAGES_READ,
    Permission.MESSAGES_MANAGE,
    Permission.ANNOUNCEMENTS_READ,
    Permission.ANNOUNCEMENTS_MANAGE,
    Permission.PATIENTS_READ,
    Permission.PATIENTS_MANAGE,
    Permission.REPORTS_READ,
    Permission.REQUIREMENTS_READ,
    Permission.REQUIREMENTS_MANAGE,
    Permission.SCREENINGS_READ,
    Permission.SCREENINGS_MANAGE,
    Permission.VACCINATIONS_READ,
    Permission.VACCINATIONS_MANAGE,
    Permission.VISITS_READ,
    Permission.VISITS_MANAGE,
    ...SELF_SERVICE,
  ],

  [UserRole.STUDENT]: [
    Permission.ANNOUNCEMENTS_READ,
    Permission.CLEARANCES_REQUEST,
    Permission.DOCUMENTS_READ,
    Permission.EVIDENCE_READ,
    Permission.EVIDENCE_SUBMIT,
    Permission.NOTIFICATIONS_READ,
    Permission.MESSAGES_READ,
    ...PATIENT_SELF_SERVICE,
    Permission.REQUIREMENTS_READ,
    ...SELF_SERVICE,
  ],

  [UserRole.FACULTY_STAFF]: [
    Permission.ANNOUNCEMENTS_READ,
    Permission.CLEARANCES_REQUEST,
    Permission.DOCUMENTS_READ,
    Permission.EVIDENCE_READ,
    Permission.EVIDENCE_SUBMIT,
    Permission.NOTIFICATIONS_READ,
    Permission.MESSAGES_READ,
    ...PATIENT_SELF_SERVICE,
    Permission.REQUIREMENTS_READ,
    ...SELF_SERVICE,
  ],
};
