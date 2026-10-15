import { DoctorAvailabilityService, availableStarts } from './doctor-availability.service';

describe('Doctor-specific dated availability', () => {
  const prisma = {
    user: { findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    doctorAvailability: { findMany: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    appointment: { findMany: jest.fn() }, $transaction: jest.fn(),
  };
  const audit = { record: jest.fn() };
  const service = new DoctorAvailabilityService(prisma as never, audit as never);
  const window = { id: 'session', doctorId: 'doctor-1', startsAt: new Date('2027-01-04T01:00:00Z'), endsAt: new Date('2027-01-04T03:00:00Z'), isActive: true };
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2027-01-01T00:00:00Z').getTime());
    prisma.user.findFirst.mockResolvedValue({ id: 'doctor-1' });
    prisma.appointment.findMany.mockResolvedValue([]);
    prisma.doctorAvailability.findFirst.mockResolvedValue(window);
    prisma.$transaction.mockImplementation(callback => callback(prisma));
  });
  afterEach(() => jest.restoreAllMocks());

  it('returns different available dates and times for the two doctors', async () => {
    prisma.doctorAvailability.findMany.mockImplementation(({ where }) => Promise.resolve(where.doctorId === 'doctor-1' ? [window] : [{ ...window, doctorId: 'doctor-2', startsAt: new Date('2027-01-05T05:00:00Z'), endsAt: new Date('2027-01-05T06:00:00Z') }]));
    const first = await service.availability({ doctorId: 'doctor-1', from: '2027-01-01', to: '2027-01-31' });
    const second = await service.availability({ doctorId: 'doctor-2', from: '2027-01-01', to: '2027-01-31' });
    expect(first.days[0]).toMatchObject({ date: '2027-01-04', starts: expect.arrayContaining(['2027-01-04T01:00:00.000Z']) });
    expect(second.days[0]).toMatchObject({ date: '2027-01-05', starts: expect.arrayContaining(['2027-01-05T05:00:00.000Z']) });
    expect(second.days[0].starts).not.toContain(first.days[0].starts[0]);
    expect(prisma.appointment.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ OR: [{ assignedToId: 'doctor-2' }] }) }));
  });
  it('omits appointments overlapping doctor or patient bookings and allows adjacent times', async () => {
    prisma.doctorAvailability.findMany.mockResolvedValue([window]);
    prisma.appointment.findMany.mockResolvedValue([{ scheduledAt: new Date('2027-01-04T01:00:00Z'), durationMins: 30 }]);
    const result = await service.availability({ doctorId: 'doctor-1', patientId: 'patient-1', from: '2027-01-01', to: '2027-01-31' });
    expect(result.days[0].starts).not.toContain('2027-01-04T01:15:00.000Z');
    expect(result.days[0].starts[0]).toBe('2027-01-04T01:30:00.000Z');
    expect(prisma.appointment.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ OR: [{ assignedToId: 'doctor-1' }, { patientId: 'patient-1' }], status: { in: ['PENDING', 'APPROVED', 'CONFIRMED', 'CHECKED_IN'] } }) }));
  });
  it('does not invent availability for unconfigured or fully booked days', async () => {
    prisma.doctorAvailability.findMany.mockResolvedValue([]);
    expect((await service.availability({ doctorId: 'doctor-1', from: '2027-01-01', to: '2027-01-31' })).days).toEqual([]);
    prisma.doctorAvailability.findMany.mockResolvedValue([window]);
    prisma.appointment.findMany.mockResolvedValue([{ scheduledAt: window.startsAt, durationMins: 120 }]);
    expect((await service.availability({ doctorId: 'doctor-1', from: '2027-01-01', to: '2027-01-31' })).days).toEqual([]);
  });
  it('fits the entire duration and removes past slots', () => {
    expect(availableStarts(window, 60, [], new Date('2027-01-04T02:00:00Z').getTime())).toEqual([]);
    expect(availableStarts(window, 120, [], Date.now())).toEqual(['2027-01-04T01:00:00.000Z']);
    expect(availableStarts(window, 180, [], Date.now())).toEqual([]);
  });
  it('rejects inactive/non-doctors, missing doctor assignments, past times, and off-grid starts', async () => {
    await expect(service.validateBooking(undefined, window.startsAt, 30, prisma as never)).rejects.toThrow('Select a doctor');
    await expect(service.validateBooking('doctor-1', new Date('2026-12-31'), 30, prisma as never)).rejects.toThrow('future');
    await expect(service.validateBooking('doctor-1', new Date('2027-01-04T01:05:00Z'), 30, prisma as never)).rejects.toThrow('outside');
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(service.availability({ doctorId: 'not-doctor', from: '2027-01-01', to: '2027-01-31' })).rejects.toThrow('Active doctor');
  });
  it('checks that a booking is covered by a session within the transaction', async () => {
    await service.validateBooking('doctor-1', window.startsAt, 30, prisma as never);
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'doctor-1' } }));
    expect(prisma.doctorAvailability.findFirst).toHaveBeenCalledWith({ where: { doctorId: 'doctor-1', isActive: true, startsAt: { lte: window.startsAt }, endsAt: { gte: new Date('2027-01-04T01:30:00Z') } } });
    prisma.doctorAvailability.findFirst.mockResolvedValue(null);
    await expect(service.validateBooking('doctor-1', window.startsAt, 30, prisma as never)).rejects.toThrow('outside');
  });
  it('rejects overlapping clinic sessions and invalid hours without inserting data', async () => {
    await expect(service.createSession({ doctorId: 'doctor-1', startsAt: window.startsAt.toISOString(), endsAt: window.endsAt.toISOString() }, 'nurse')).rejects.toThrow('overlapping');
    await expect(service.createSession({ doctorId: 'doctor-1', startsAt: window.endsAt.toISOString(), endsAt: window.startsAt.toISOString() }, 'nurse')).rejects.toThrow('future start and end');
    expect(prisma.doctorAvailability.create).not.toHaveBeenCalled();
  });
  it('creates dated sessions and records the actor in the same transaction', async () => {
    prisma.doctorAvailability.findFirst.mockResolvedValue(null);
    prisma.doctorAvailability.create.mockResolvedValue(window);
    await service.createSession({ doctorId: 'doctor-1', startsAt: window.startsAt.toISOString(), endsAt: window.endsAt.toISOString() }, 'nurse');
    expect(audit.record).toHaveBeenCalledWith('nurse', 'CREATE', 'DoctorAvailability', 'session', {}, prisma);
  });
  it('does not remove hours with active bookings; retains unbooked hours as inactive history', async () => {
    prisma.doctorAvailability.findUnique.mockResolvedValue(window);
    prisma.appointment.findMany.mockResolvedValue([{ scheduledAt: window.startsAt, durationMins: 30 }]);
    await expect(service.closeSession('session', 'nurse')).rejects.toThrow('active appointments');
    expect(prisma.doctorAvailability.update).not.toHaveBeenCalled();
    prisma.appointment.findMany.mockResolvedValue([]);
    await service.closeSession('session', 'nurse');
    expect(prisma.doctorAvailability.update).toHaveBeenCalledWith({ where: { id: 'session' }, data: { isActive: false } });
  });
});
