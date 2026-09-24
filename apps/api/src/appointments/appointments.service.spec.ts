import { AppointmentStatus, AppointmentType } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { CapacityChecker } from './capacity/capacity-checker';
import { AppointmentsService } from './appointments.service';
import { AppointmentStateMachine } from './state-machine/appointment-state-machine';

describe('AppointmentsService scheduling integration', () => {
  const prisma = {
    patient: { findFirst: jest.fn() },
    appointment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const audit = { record: jest.fn() };
  const stateMachine = { transition: jest.fn(), checkIn: jest.fn() };
  const capacity = new CapacityChecker(prisma as never);
  const service = new AppointmentsService(
    prisma as never,
    audit as unknown as AuditService,
    capacity,
    stateMachine as unknown as AppointmentStateMachine,
  );
  const patient = { id: 'patient-1' };
  const requested = {
    patientId: patient.id,
    scheduledAt: '2026-09-20T10:15:00.000Z',
    durationMins: 30,
    purpose: 'Consultation',
    type: AppointmentType.CONSULTATION,
    assignedToId: 'doctor-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.patient.findFirst.mockResolvedValue(patient);
    prisma.$transaction.mockImplementation(
      (operation: (client: typeof prisma) => unknown) => operation(prisma),
    );
    prisma.appointment.create.mockResolvedValue({ id: 'appointment-1', patient });
    audit.record.mockResolvedValue({});
  });

  it('rejects a competing partially overlapping slot', async () => {
    prisma.appointment.findMany.mockResolvedValue([
      {
        id: 'existing',
        patientId: 'patient-2',
        assignedToId: 'doctor-1',
        scheduledAt: new Date('2026-09-20T10:00:00.000Z'),
        durationMins: 30,
        status: AppointmentStatus.CONFIRMED,
      },
    ]);

    await expect(service.create(requested, 'staff-1')).rejects.toThrow(
      'Appointment overlaps with existing booking',
    );
    expect(prisma.appointment.create).not.toHaveBeenCalled();
  });

  it('accepts the immediately adjacent slot in the same serializable transaction', async () => {
    prisma.appointment.findMany.mockResolvedValue([
      {
        id: 'existing',
        patientId: 'patient-2',
        assignedToId: 'doctor-1',
        scheduledAt: new Date('2026-09-20T10:00:00.000Z'),
        durationMins: 30,
        status: AppointmentStatus.CONFIRMED,
      },
    ]);

    await expect(
      service.create({ ...requested, scheduledAt: '2026-09-20T10:30:00.000Z' }, 'staff-1'),
    ).resolves.toMatchObject({ id: 'appointment-1' });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.appointment.create).toHaveBeenCalledTimes(1);
  });

  it('routes CHECKED_IN through the linked-visit operation', async () => {
    stateMachine.checkIn.mockResolvedValue({ visit: { id: 'visit-1' } });

    await service.updateStatus('appointment-1', AppointmentStatus.CHECKED_IN, 'staff-1');

    expect(stateMachine.checkIn).toHaveBeenCalledWith('appointment-1', 'staff-1');
    expect(stateMachine.transition).not.toHaveBeenCalled();
  });
});
