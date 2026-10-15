// Shared by catalogue and clearance evaluation so configured targets agree.
export function matchesRequirement(requirement: { applicableTo: string; departmentIds?: unknown; programIds?: unknown; yearLevels?: unknown }, patient: { type: string; studentProfile?: { departmentId: string | null; programId: string | null; yearLevel: number | null } | null }) {
  const scopes = patient.type === 'STUDENT' ? ['ALL', 'STUDENT', 'COLLEGE']
    : ['ALL', patient.type, ...(['FACULTY', 'STAFF'].includes(patient.type) ? ['FACULTY_STAFF'] : [])];
  if (!scopes.includes(requirement.applicableTo)) return false;
  const departments = Array.isArray(requirement.departmentIds) ? requirement.departmentIds : [];
  const programs = Array.isArray(requirement.programIds) ? requirement.programIds : [];
  const years = Array.isArray(requirement.yearLevels) ? requirement.yearLevels : [];
  const profile = patient.studentProfile;
  return (!departments.length || Boolean(profile?.departmentId && departments.includes(profile.departmentId)))
    && (!programs.length || Boolean(profile?.programId && programs.includes(profile.programId)))
    && (!years.length || Boolean(profile?.yearLevel && years.includes(profile.yearLevel)));
}
