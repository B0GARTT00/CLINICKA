import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateDoctorAvailabilityDto, DoctorAvailabilityQueryDto } from './dto';

const MINUTE = 60_000;
const ACTIVE_STATUSES = ['PENDING', 'APPROVED', 'CONFIRMED', 'CHECKED_IN'] as const;
const localDate = (value: Date) => new Date(value.getTime() + 8 * 60 * MINUTE).toISOString().slice(0, 10);
export function scheduleConflict(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
    throw new ConflictException('The schedule changed while saving. Refresh available times and try again.');
  }
  throw error;
}
export const overlaps = (start: Date, end: Date, other: { scheduledAt: Date; durationMins: number }) => start < new Date(other.scheduledAt.getTime() + other.durationMins * MINUTE) && other.scheduledAt < end;

// Slots start every 15 minutes relative to the configured session start. The
// complete appointment must fit in a single session; breaks are separate rows.
export function availableStarts(window: { startsAt: Date; endsAt: Date }, durationMins: number, bookings: { scheduledAt: Date; durationMins: number }[], now = Date.now()) {
  const slots: string[] = [];
  for (let time = window.startsAt.getTime(); time + durationMins * MINUTE <= window.endsAt.getTime(); time += 15 * MINUTE) {
    if (time <= now) continue;
    const start = new Date(time), end = new Date(time + durationMins * MINUTE);
    if (!bookings.some(booking => overlaps(start, end, booking))) slots.push(start.toISOString());
  }
  return slots;
}

@Injectable()
export class DoctorAvailabilityService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  doctors() {
    return this.prisma.user.findMany({ where: { status: 'ACTIVE', deletedAt: null, roles: { some: { role: { name: 'DOCTOR' } } } }, select: { id: true, displayName: true }, orderBy: { displayName: 'asc' } });
  }

  private async assertDoctor(id: string, client: Prisma.TransactionClient = this.prisma) {
    const doctor = await client.user.findFirst({ where: { id, status: 'ACTIVE', deletedAt: null, roles: { some: { role: { name: 'DOCTOR' } } } }, select: { id: true } });
    if (!doctor) throw new NotFoundException('Active doctor not found.');
    return doctor;
  }

  listSessions() {
    return this.prisma.doctorAvailability.findMany({ where: { isActive: true, endsAt: { gt: new Date() }, doctor: { status: 'ACTIVE', deletedAt: null, roles: { some: { role: { name: 'DOCTOR' } } } } },
      include: { doctor: { select: { id: true, displayName: true } } }, orderBy: [{ startsAt: 'asc' }, { doctorId: 'asc' }],
    });
  }

  async createSession(dto: CreateDoctorAvailabilityDto, actorId: string) {
    const startsAt = new Date(dto.startsAt), endsAt = new Date(dto.endsAt);
    if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime()) || startsAt.getTime() <= Date.now() || startsAt >= endsAt || localDate(startsAt) !== localDate(endsAt) || startsAt.getUTCSeconds() || endsAt.getUTCSeconds() || startsAt.getUTCMilliseconds() || endsAt.getUTCMilliseconds()) {
      throw new BadRequestException('Choose future start and end times on the same Philippine calendar date, without seconds.');
    }
    return this.prisma.$transaction(async tx => {
      await this.assertDoctor(dto.doctorId, tx);
      // Serializes session changes and bookings for this doctor.
      await tx.user.update({ where: { id: dto.doctorId }, data: { updatedAt: new Date() } });
      const conflict = await tx.doctorAvailability.findFirst({ where: { doctorId: dto.doctorId, isActive: true, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } });
      if (conflict) throw new ConflictException('This doctor already has an overlapping schedule.');
      const session = await tx.doctorAvailability.create({ data: { doctorId: dto.doctorId, startsAt, endsAt } });
      await this.audit.record(actorId, 'CREATE', 'DoctorAvailability', session.id, {}, tx);
      return session;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }).catch(scheduleConflict);
  }

  async closeSession(id: string, actorId: string) {
    return this.prisma.$transaction(async tx => {
      const session = await tx.doctorAvailability.findUnique({ where: { id } });
      if (!session || !session.isActive) throw new NotFoundException('Active doctor schedule not found.');
      await tx.user.update({ where: { id: session.doctorId }, data: { updatedAt: new Date() } });
      const bookings = await tx.appointment.findMany({ where: { assignedToId: session.doctorId, status: { in: [...ACTIVE_STATUSES] }, scheduledAt: { gte: new Date(session.startsAt.getTime() - 240 * MINUTE), lt: session.endsAt } }, select: { scheduledAt: true, durationMins: true } });
      if (bookings.some(booking => overlaps(session.startsAt, session.endsAt, booking))) throw new ConflictException('This schedule has active appointments. Reschedule or cancel them before removing it.');
      const closed = await tx.doctorAvailability.update({ where: { id }, data: { isActive: false } });
      await this.audit.record(actorId, 'UPDATE', 'DoctorAvailability', id, { metadata: { isActive: false } }, tx);
      return closed;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }).catch(scheduleConflict);
  }

  async availability(query: DoctorAvailabilityQueryDto) {
    await this.assertDoctor(query.doctorId);
    const from = new Date(query.from + 'T00:00:00+08:00');
    const to = new Date(new Date(query.to + 'T00:00:00+08:00').getTime() + 86_400_000);
    if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || from >= to || to.getTime() - from.getTime() > 93 * 86_400_000) throw new BadRequestException('Choose an ordered availability range of at most 93 days.');
    const [windows, bookings] = await Promise.all([
      this.prisma.doctorAvailability.findMany({ where: { doctorId: query.doctorId, isActive: true, startsAt: { gte: from, lt: to } }, orderBy: { startsAt: 'asc' } }),
      this.prisma.appointment.findMany({ where: { scheduledAt: { gte: new Date(from.getTime() - 240 * MINUTE), lt: to }, status: { in: [...ACTIVE_STATUSES] }, OR: [{ assignedToId: query.doctorId }, ...(query.patientId ? [{ patientId: query.patientId }] : [])] }, select: { scheduledAt: true, durationMins: true } }),
    ]);
    const days = new Map<string, string[]>();
    for (const window of windows) {
      const date = localDate(window.startsAt);
      days.set(date, [...(days.get(date) || []), ...availableStarts(window, query.durationMins || 30, bookings)]);
    }
    return { doctorId: query.doctorId, timezone: 'Asia/Manila', days: [...days].filter(([, starts]) => starts.length).map(([date, starts]) => ({ date, starts: [...new Set(starts)].sort() })) };
  }

  async validateBooking(doctorId: string | undefined, startsAt: Date, durationMins: number, tx: Prisma.TransactionClient) {
    if (!doctorId) throw new BadRequestException('Select a doctor before booking.');
    if (!Number.isFinite(startsAt.getTime()) || startsAt.getTime() <= Date.now()) throw new BadRequestException('Choose a future appointment time.');
    await this.assertDoctor(doctorId, tx);
    await tx.user.update({ where: { id: doctorId }, data: { updatedAt: new Date() } });
    const session = await tx.doctorAvailability.findFirst({ where: { doctorId, isActive: true, startsAt: { lte: startsAt }, endsAt: { gte: new Date(startsAt.getTime() + durationMins * MINUTE) } } });
    if (!session || (startsAt.getTime() - session.startsAt.getTime()) % (15 * MINUTE) !== 0) throw new ConflictException('This time is outside the doctor’s available schedule. Refresh available dates and times.');
  }
}
