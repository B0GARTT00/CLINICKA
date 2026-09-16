import { PatientType } from '@prisma/client';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { PatientsController } from './patients.controller';
import { PatientsModule } from './patients.module';

describe('active PatientsModule', () => {
  const patientFindMany = jest.fn();
  const patientFindUnique = jest.fn();
  const patientFindFirst = jest.fn();
  const patientCreate = jest.fn();
  const userFindUnique = jest.fn();
  const auditCreate = jest.fn();
  const sequenceUpsert = jest.fn();
  let controller: PatientsController;

  beforeEach(async () => {
    jest.clearAllMocks();
    sequenceUpsert.mockResolvedValue({ lastValue: 1 });
    const moduleRef = await Test.createTestingModule({ imports: [PatientsModule] })
      .overrideProvider(PrismaService)
      .useValue({ patient: { findMany: patientFindMany, findUnique: patientFindUnique, findFirst: patientFindFirst, create: patientCreate }, user: { findUnique: userFindUnique }, auditLog: { create: auditCreate }, $transaction: (callback: (client: unknown) => unknown) => callback({ patient: { findFirst: patientFindFirst, create: patientCreate }, patientNumberSequence: { upsert: sequenceUpsert }, user: { findUnique: userFindUnique }, auditLog: { create: auditCreate } }) })
      .compile();
    controller = moduleRef.get(PatientsController);
  });

  it('lists stored patients with search, type, and pagination', async () => {
    const records = [{ id: 'patient-1', patientNumber: 'BC-001' }];
    patientFindMany.mockResolvedValue(records);

    await expect(controller.findAll('BC-001', '2', '10', PatientType.STUDENT)).resolves.toBe(records);
    expect(patientFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        deletedAt: null,
        type: PatientType.STUDENT,
        OR: expect.arrayContaining([{ patientNumber: { contains: 'BC-001' } }]),
      }),
      include: expect.objectContaining({ studentProfile: true, employeeProfile: true }),
      skip: 10,
      take: 10,
    }));
  });

  it('loads a stored patient profile by ID', async () => {
    const record = { id: 'patient-1', patientNumber: 'BC-001' };
    patientFindUnique.mockResolvedValue(record);

    await expect(controller.findOne(record.id)).resolves.toBe(record);
    expect(patientFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: record.id } }));
  });

  it('persists new patients rather than keeping them in memory', async () => {
    const input = { type: PatientType.STUDENT, firstName: 'Test', lastName: 'Patient' };
    const record = { id: 'patient-2', patientNumber: 'CLN-2026-00001', ...input };
    patientCreate.mockResolvedValue(record);

    await expect(controller.create(input, { user: { id: 'staff-1' } })).resolves.toBe(record);
    expect(patientCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ ...input, patientNumber: expect.stringMatching(/^CLN-\d{4}-\d{5}$/) }) });
    expect(auditCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ entityId: record.id, actorId: 'staff-1' }) });
  });

  it('rejects a possible manual duplicate before creating a record', async () => {
    patientFindFirst.mockResolvedValueOnce({ id: 'existing-patient' });
    await expect(controller.create({ type: PatientType.STUDENT, firstName: 'Pat', lastName: 'Example', email: 'pat@brokenshire.edu.ph' }, { user: { id: 'staff-1' } })).rejects.toThrow('A patient may already exist');
    expect(patientCreate).not.toHaveBeenCalled();
  });
});
