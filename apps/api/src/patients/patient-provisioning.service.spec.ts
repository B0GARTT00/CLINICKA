import { ConflictException } from '@nestjs/common';
import { PatientType } from '@prisma/client';
import { PatientProvisioningService } from './patient-provisioning.service';
import { generatePatientNumber, patientTypeForRoles } from './patient-identity';

function setup(role: string, type: PatientType | null = null) {
  let lastValue = 0;
  const user = { id: 'user-1', email: 'person@brokenshire.edu.ph', displayName: 'Pat Example', patientId: null as string | null, registrationProfile: type ? { patientType: type } : null, roles: [{ role: { name: role } }] };
  const tx = {
    user: { findUnique: jest.fn().mockImplementation(async () => user), update: jest.fn() },
    patient: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockImplementation(async ({ data }) => ({ id: 'patient-1', ...data })) },
    patientNumberSequence: { upsert: jest.fn().mockImplementation(async () => ({ lastValue: ++lastValue })) },
    auditLog: { create: jest.fn() },
  };
  const service = new PatientProvisioningService({} as never);
  return { user, tx, service };
}

describe('patient provisioning', () => {
  it.each([
    ['STUDENT', PatientType.STUDENT],
    ['FACULTY_STAFF', PatientType.FACULTY],
    ['FACULTY_STAFF', PatientType.STAFF],
  ])('creates and links a %s patient of type %s after verification', async (role, type) => {
    const { tx, service } = setup(role, type);
    await expect(service.provision(tx as never, 'user-1')).resolves.toBe('patient-1');
    expect(tx.patient.create).toHaveBeenCalledWith({ data: expect.objectContaining({ type, patientNumber: expect.stringMatching(/^CLN-\d{4}-\d{5}$/) }) });
    expect(tx.user.update).toHaveBeenCalledWith({ where: { id: 'user-1' }, data: expect.objectContaining({ patientId: 'patient-1' }) });
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ metadata: expect.objectContaining({ event: 'PATIENT_AUTO_CREATED' }) }) });
  });

  it('skips administrators', async () => {
    const { tx, service } = setup('ADMINISTRATOR');
    await expect(service.provision(tx as never, 'user-1')).resolves.toBeNull();
    expect(tx.patient.create).not.toHaveBeenCalled();
  });

  it('returns an existing linked patient without another write', async () => {
    const { tx, user, service } = setup('STUDENT');
    user.patientId = 'existing-patient';
    await expect(service.provision(tx as never, 'user-1')).resolves.toBe('existing-patient');
    expect(tx.patient.create).not.toHaveBeenCalled();
  });

  it('links a matching manual record by verified email', async () => {
    const { tx, service } = setup('STUDENT');
    tx.patient.findUnique.mockResolvedValueOnce({ id: 'manual-patient', type: PatientType.STUDENT, patientNumber: 'LEGACY-1', user: null });
    await expect(service.provision(tx as never, 'user-1')).resolves.toBe('manual-patient');
    expect(tx.patient.create).not.toHaveBeenCalled();
  });

  it('rejects a record already linked to another user', async () => {
    const { tx, service } = setup('STUDENT');
    tx.patient.findUnique.mockResolvedValueOnce({ id: 'other-patient', type: PatientType.STUDENT, user: { id: 'someone-else' } });
    await expect(service.provision(tx as never, 'user-1')).rejects.toBeInstanceOf(ConflictException);
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('does not link an archived manual record', async () => {
    const { tx, service } = setup('STUDENT');
    tx.patient.findUnique.mockResolvedValueOnce({ id: 'archived-patient', type: PatientType.STUDENT, deletedAt: new Date(), user: null });
    await expect(service.provision(tx as never, 'user-1')).rejects.toBeInstanceOf(ConflictException);
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('keeps administrative and ambiguous faculty roles out of automatic creation', () => {
    expect(patientTypeForRoles(['ADMINISTRATOR', 'STUDENT'], { patientType: PatientType.STUDENT })).toBeNull();
    expect(patientTypeForRoles(['FACULTY_STAFF'], null)).toBeNull();
  });

  it('increments and zero-pads IDs within a year', async () => {
    const { tx } = setup('STUDENT');
    await expect(generatePatientNumber(tx as never, new Date('2026-01-01T00:00:00Z'))).resolves.toBe('CLN-2026-00001');
    await expect(generatePatientNumber(tx as never, new Date('2026-01-01T00:00:00Z'))).resolves.toBe('CLN-2026-00002');
    expect(tx.patientNumberSequence.upsert).toHaveBeenCalledWith({ where: { year: 2026 }, create: { year: 2026, lastValue: 1 }, update: { lastValue: { increment: 1 } } });
  });

  it('does not issue a number past the five-digit limit', async () => {
    const { tx } = setup('STUDENT');
    tx.patientNumberSequence.upsert.mockResolvedValueOnce({ lastValue: 100_000 });
    await expect(generatePatientNumber(tx as never, new Date('2026-01-01T00:00:00Z'))).rejects.toBeInstanceOf(ConflictException);
  });
});
