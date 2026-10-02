/**
 * Canonical catalogue of API permissions.
 *
 * Every active endpoint in the API must declare at least one permission from
 * this catalogue via `@Permissions(...)`. The guard treats the declaration as
 * an AND requirement, so listing several permissions means the caller must hold
 * all of them.
 */
export enum Permission {
  // Administration
  USERS_MANAGE = 'users.manage',
  ROLES_MANAGE = 'roles.manage',
  AUDIT_READ = 'audit.read',
  ACADEMIC_READ = 'academic.read',
  ACADEMIC_MANAGE = 'academic.manage',

  // Patient registry
  PATIENTS_READ = 'patients.read',
  PATIENTS_MANAGE = 'patients.manage',
  OWN_PROFILE_READ = 'own_profile.read',
  OWN_ACCOUNT_READ = 'own_account.read',
  OWN_SESSION_MANAGE = 'own_session.manage',

  // Clinical
  CLINICAL_READ = 'clinical.read',
  CLINICAL_MANAGE = 'clinical.manage',
  VISITS_READ = 'visits.read',
  VISITS_MANAGE = 'visits.manage',
  EMERGENCIES_READ = 'emergencies.read',
  EMERGENCIES_MANAGE = 'emergencies.manage',
  CERTIFICATES_READ = 'certificates.read',
  CERTIFICATES_MANAGE = 'certificates.manage',
  SCREENINGS_READ = 'screenings.read',
  SCREENINGS_MANAGE = 'screenings.manage',
  VACCINATIONS_READ = 'vaccinations.read',
  VACCINATIONS_MANAGE = 'vaccinations.manage',

  // Scheduling
  APPOINTMENTS_READ = 'appointments.read',
  APPOINTMENTS_MANAGE = 'appointments.manage',
  APPOINTMENTS_CHECK_IN = 'appointments.check_in',

  // Compliance
  REQUIREMENTS_READ = 'requirements.read',
  REQUIREMENTS_MANAGE = 'requirements.manage',
  CLEARANCES_READ = 'clearances.read',
  CLEARANCES_REQUEST = 'clearances.request',
  CLEARANCES_MANAGE = 'clearances.manage',
  CLEARANCES_REVIEW = 'clearances.review',
  EVIDENCE_SUBMIT = 'evidence.submit',
  EVIDENCE_READ = 'evidence.read',
  EVIDENCE_REVIEW = 'evidence.review',

  // Documents
  DOCUMENTS_READ = 'documents.read',
  DOCUMENTS_MANAGE = 'documents.manage',

  // Supply chain
  INVENTORY_READ = 'inventory.read',
  INVENTORY_MANAGE = 'inventory.manage',
  INVENTORY_TRANSACTIONS_READ = 'inventory.transactions.read',
  DISPENSING_READ = 'dispensing.read',
  DISPENSING_MANAGE = 'dispensing.manage',
  DISPENSING_RECONCILE = 'dispensing.reconcile',

  // Communications
  ANNOUNCEMENTS_READ = 'announcements.read',
  ANNOUNCEMENTS_MANAGE = 'announcements.manage',
  NOTIFICATIONS_READ = 'notifications.read',

  // Reporting
  REPORTS_READ = 'reports.read',
  REPORTS_EXPORT = 'reports.export',
}

export const ALL_PERMISSIONS = Object.values(Permission);

export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  [Permission.USERS_MANAGE]: 'List, create, update, deactivate, and delete system user accounts.',
  [Permission.ROLES_MANAGE]: 'Inspect the configured role and permission catalogue.',
  [Permission.AUDIT_READ]: 'Read the immutable audit trail.',
  [Permission.ACADEMIC_READ]: 'List academic years and semesters.',
  [Permission.ACADEMIC_MANAGE]: 'Create academic years and semesters.',
  [Permission.PATIENTS_READ]: 'List and read patient registry records.',
  [Permission.PATIENTS_MANAGE]: 'Create, update, archive, and restore patient records.',
  [Permission.OWN_PROFILE_READ]: 'Read the patient profile linked to the caller.',
  [Permission.OWN_ACCOUNT_READ]: 'Read the caller\'s own account record.',
  [Permission.OWN_SESSION_MANAGE]: 'End the caller\'s own session.',
  [Permission.CLINICAL_READ]: 'Read clinical encounter data.',
  [Permission.CLINICAL_MANAGE]: 'Create and update clinical encounter data.',
  [Permission.VISITS_READ]: 'Read the clinic visit queue and visit detail.',
  [Permission.VISITS_MANAGE]: 'Create, progress, and complete clinic visits.',
  [Permission.EMERGENCIES_READ]: 'List emergency cases.',
  [Permission.EMERGENCIES_MANAGE]: 'Record emergency cases.',
  [Permission.CERTIFICATES_READ]: 'List medical certificates.',
  [Permission.CERTIFICATES_MANAGE]: 'Issue medical certificates.',
  [Permission.SCREENINGS_READ]: 'List health screenings.',
  [Permission.SCREENINGS_MANAGE]: 'Record health screenings.',
  [Permission.VACCINATIONS_READ]: 'List externally received vaccination history.',
  [Permission.VACCINATIONS_MANAGE]: 'Document externally received vaccination history.',
  [Permission.APPOINTMENTS_READ]: 'List upcoming appointments.',
  [Permission.APPOINTMENTS_MANAGE]: 'Create, reschedule, cancel, and mark appointments.',
  [Permission.APPOINTMENTS_CHECK_IN]: 'Check patients in for their appointment.',
  [Permission.REQUIREMENTS_READ]: 'List health requirements.',
  [Permission.REQUIREMENTS_MANAGE]: 'Create and update health requirements.',
  [Permission.CLEARANCES_READ]: 'Read clearances and clearance eligibility.',
  [Permission.CLEARANCES_REQUEST]: 'Request and track a clearance linked to the caller\'s own patient record.',
  [Permission.CLEARANCES_MANAGE]: 'Create and update clearances.',
  [Permission.CLEARANCES_REVIEW]: 'Approve or reject a clearance.',
  [Permission.EVIDENCE_SUBMIT]: 'Submit evidence for the caller\'s own requirements.',
  [Permission.EVIDENCE_READ]: 'Read evidence submissions the caller is authorized to see.',
  [Permission.EVIDENCE_REVIEW]: 'Approve or reject an evidence submission.',
  [Permission.DOCUMENTS_READ]: 'Download private documents the caller is authorized to see.',
  [Permission.DOCUMENTS_MANAGE]: 'Attach and delete private documents.',
  [Permission.INVENTORY_READ]: 'List medicines in stock.',
  [Permission.INVENTORY_MANAGE]: 'Create medicines and record stock-in transactions.',
  [Permission.INVENTORY_TRANSACTIONS_READ]: 'Read inventory movement history.',
  [Permission.DISPENSING_READ]: 'List medicine dispensations.',
  [Permission.DISPENSING_MANAGE]: 'Record medicine dispensations.',
  [Permission.DISPENSING_RECONCILE]: 'Read dispensing exception and reconciliation reports.',
  [Permission.ANNOUNCEMENTS_READ]: 'Read published announcements.',
  [Permission.ANNOUNCEMENTS_MANAGE]: 'Create and publish announcements.',
  [Permission.NOTIFICATIONS_READ]: 'Read and acknowledge the caller\'s own notifications.',
  [Permission.REPORTS_READ]: 'Read aggregate reporting summaries.',
  [Permission.REPORTS_EXPORT]: 'Export aggregate reports that contain no patient-level clinical data.',
};
