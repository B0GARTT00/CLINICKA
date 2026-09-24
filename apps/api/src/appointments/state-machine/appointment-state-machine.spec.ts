import { AppointmentStatus } from '@prisma/client';
import { AuditService } from '../../audit/audit.service';
import { AppointmentStateMachine } from './appointment-state-machine';

describe('AppointmentStateMachine check-in integration', () => {
  const prisma = {
    appointment: { findUnique: jest.fn(), update: jest.fn() },
    clinicVisit: { findFirst: jest.fn(), create: jest.fn() },
    $transaction: jest.fn(),
  };
  const audit = {
    record: jest.fn(),
    recordEntityStatusTransition: jest.fn(),
  };
  const machine = new AppointmentStateMachine(prisma as never, audit as unknown as AuditService);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((operation: (client: typeof prisma) => unknown) => operation(prisma));
    prisma.appointment.findUnique.mockResolvedValue({
      id: 'appointment-1',
      patientId: 'patient-1',
      purpose: 'Headache',
      notes: null,
      status: AppointmentStatus.CONFIRMED,
    });
    prisma.clinicVisit.findFirst.mockResolvedValue(null);
    prisma.clinicVisit.create.mockResolvedValue({ id: 'visit-1' });
    prisma.appointment.update.mockResolvedValue({
      id: 'appointment-1',
      status: AppointmentStatus.CHECKED_IN,
    });
    audit.record.mockResolvedValue({});
    audit.recordEntityStatusTransition.mockResolvedValue({});
  });

  it('creates exactly one linked visit and checks in atomically', async () => {
    await expect(machine.checkIn('appointment-1', 'staff-1')).resolves.toMatchObject({
      appointment: { id: 'appointment-1', status: AppointmentStatus.CHECKED_IN },
      visit: { id: 'visit-1' },
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.clinicVisit.create).toHaveBeenCalledTimes(1);
    expect(prisma.clinicVisit.create).toHaveBeenCalledWith({
      data: {
        patientId: 'patient-1',
        chiefComplaint: 'Headache',
        notes: undefined,
        appointmentId: 'appointment-1',
      },
    });
  });

  it('rejects a repeated check-in without creating another visit', async () => {
    prisma.clinicVisit.findFirst.mockResolvedValue({ id: 'visit-1' });

    await expect(machine.checkIn('appointment-1', 'staff-1')).rejects.toThrow(
      'Appointment has already been checked in',
    );
    expect(prisma.clinicVisit.create).not.toHaveBeenCalled();
  });

  it.each([
    AppointmentStatus.PENDING,
    AppointmentStatus.CHECKED_IN,
    AppointmentStatus.COMPLETED,
    AppointmentStatus.CANCELLED,
    AppointmentStatus.NO_SHOW,
    AppointmentStatus.RESCHEDULED,
  ])('rejects check-in from %s', async (status) => {
    prisma.appointment.findUnique.mockResolvedValue({
      id: 'appointment-1',
      patientId: 'patient-1',
      purpose: 'Headache',
      status,
    });

    await expect(machine.checkIn('appointment-1', 'staff-1')).rejects.toThrow(
      'Cannot check in appointment',
    );
    expect(prisma.clinicVisit.create).not.toHaveBeenCalled();
  });
});
