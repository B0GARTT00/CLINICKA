import { AppointmentStatus } from '@prisma/client';
import { CapacityChecker } from './capacity-checker';

describe('CapacityChecker interval policy', () => {
  const prisma = { appointment: { findMany: jest.fn() } };
  const checker = new CapacityChecker(prisma as never);
  const start = new Date('2026-09-20T10:00:00.000Z');

  beforeEach(() => jest.clearAllMocks());

  it('rejects partially overlapping appointments for a capacity-one provider', async () => {
    prisma.appointment.findMany.mockResolvedValue([
      {
        id: 'existing',
        patientId: 'patient-2',
        assignedToId: 'doctor-1',
        scheduledAt: start,
        durationMins: 30,
        status: AppointmentStatus.CONFIRMED,
      },
    ]);

    await expect(
      checker.validate('doctor-1', new Date('2026-09-20T10:15:00.000Z'), 30, {
        patientId: 'patient-1',
      }),
    ).rejects.toThrow('Appointment overlaps with existing booking');
  });

  it('allows adjacent half-open intervals', async () => {
    prisma.appointment.findMany.mockResolvedValue([
      {
        id: 'existing',
        patientId: 'patient-2',
        assignedToId: 'doctor-1',
        scheduledAt: start,
        durationMins: 30,
        status: AppointmentStatus.CONFIRMED,
      },
    ]);

    await expect(
      checker.validate('doctor-1', new Date('2026-09-20T10:30:00.000Z'), 30, {
        patientId: 'patient-1',
      }),
    ).resolves.toBeUndefined();
  });

  it('allows two concurrent vaccination slots but rejects a third', async () => {
    const booking = (id: string, patientId: string) => ({
      id,
      patientId,
      assignedToId: 'nurse-1',
      scheduledAt: start,
      durationMins: 10,
      status: AppointmentStatus.APPROVED,
    });
    prisma.appointment.findMany.mockResolvedValueOnce([booking('first', 'patient-2')]);

    await expect(
      checker.validate('nurse-1', start, 10, { patientId: 'patient-1', maxConcurrent: 2 }),
    ).resolves.toBeUndefined();

    prisma.appointment.findMany.mockResolvedValueOnce([
      booking('first', 'patient-2'),
      booking('second', 'patient-3'),
    ]);
    await expect(
      checker.validate('nurse-1', start, 10, { patientId: 'patient-1', maxConcurrent: 2 }),
    ).rejects.toThrow('Appointment capacity exceeded');
  });

  it('rejects a patient overlap even when providers differ', async () => {
    prisma.appointment.findMany.mockResolvedValue([
      {
        id: 'existing',
        patientId: 'patient-1',
        assignedToId: 'doctor-2',
        scheduledAt: start,
        durationMins: 30,
        status: AppointmentStatus.PENDING,
      },
    ]);

    await expect(
      checker.validate('doctor-1', new Date('2026-09-20T10:10:00.000Z'), 15, {
        patientId: 'patient-1',
      }),
    ).rejects.toThrow("provider 'the patient'");
  });
});
