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
