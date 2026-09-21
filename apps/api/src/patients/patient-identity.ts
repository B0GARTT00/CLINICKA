import { PatientType, Prisma } from '@prisma/client';
import { ConflictException } from '@nestjs/common';

export type RegistrationProfile = { patientType: PatientType };

export function roleForPatientType(type: PatientType) {
  return type === PatientType.STUDENT ? 'STUDENT' : 'FACULTY_STAFF';
}

export function patientTypeForRoles(roles: string[], profile: Prisma.JsonValue | null): PatientType | null {
  if (roles.some((role) => ['ADMINISTRATOR', 'CLINIC_NURSE', 'DOCTOR', 'CLINIC_STAFF', 'SUPER_ADMIN'].includes(role))) return null;
  if (roles.includes('STUDENT')) return PatientType.STUDENT;
  if (!roles.includes('FACULTY_STAFF')) return null;
  if (profile && typeof profile === 'object' && !Array.isArray(profile)) {
    const type = profile.patientType;
    if (type === PatientType.FACULTY || type === PatientType.STAFF) return type;
  }
  return null;
}

export function splitDisplayName(displayName: string) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] || 'Unknown', lastName: parts.slice(1).join(' ') || 'Unknown' };
}

// The year row is incremented inside the same transaction that creates the
// patient. MySQL serializes concurrent updates to this primary-key row.
export async function generatePatientNumber(tx: Prisma.TransactionClient, now = new Date()) {
  const year = now.getUTCFullYear();
  const sequence = await tx.patientNumberSequence.upsert({
    where: { year },
    create: { year, lastValue: 1 },
    update: { lastValue: { increment: 1 } },
  });
  if (sequence.lastValue > 99_999) throw new ConflictException(`Patient ID capacity for ${year} has been reached.`);
  return `CLN-${year}-${String(sequence.lastValue).padStart(5, '0')}`;
}
