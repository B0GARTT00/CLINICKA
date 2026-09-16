import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentStatus, AuditAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto';

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAppointmentDto, actorId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { deletedAt: null, OR: [{ id: dto.patientId }, { patientNumber: dto.patientId }] },
    });
    if (!patient) throw new NotFoundException('Active patient not found.');

    const scheduledAt = new Date(dto.scheduledAt);
    const conflicting = await this.prisma.appointment.findFirst({
      where: {
        scheduledAt,
        status: { in: [AppointmentStatus.PENDING, AppointmentStatus.APPROVED, AppointmentStatus.CONFIRMED] },
      },
    });
    if (conflicting) throw new BadRequestException('That appointment time is already reserved.');

    const appointment = await this.prisma.appointment.create({
      data: { ...dto, patientId: patient.id, scheduledAt },
      include: { patient: true },
    });
    await this.audit(actorId, AuditAction.APPOINTMENT_CREATED, appointment.id);
    return appointment;
  }

  upcoming() {
    return this.prisma.appointment.findMany({
      where: {
        scheduledAt: { gte: new Date() },
        status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW, AppointmentStatus.COMPLETED] },
      },
      include: { patient: true },
      orderBy: { scheduledAt: 'asc' },
      take: 100,
    });
  }

  async updateStatus(id: string, status: AppointmentStatus, actorId: string) {
    const appointment = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appointment) throw new NotFoundException('Appointment not found.');
    const updated = await this.prisma.appointment.update({ where: { id }, data: { status } });
    const statusAction = `APPOINTMENT_STATUS_${status}` as AuditAction;
    await this.audit(actorId, statusAction, id);
    return updated;
  }

  async checkIn(id: string, actorId: string) {
    const appointment = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appointment) throw new NotFoundException('Appointment not found.');
    if (appointment.status !== AppointmentStatus.APPROVED && appointment.status !== AppointmentStatus.CONFIRMED) {
      throw new BadRequestException('Only approved or confirmed appointments can be checked in.');
    }

    const visit = await this.prisma.$transaction(async (transaction) => {
      const clinicVisit = await transaction.clinicVisit.create({
        data: {
          patientId: appointment.patientId,
          chiefComplaint: appointment.purpose,
          notes: appointment.notes,
        },
        include: { patient: true },
      });
      await transaction.appointment.update({ where: { id }, data: { status: AppointmentStatus.COMPLETED } });
      return clinicVisit;
    });
    await this.audit(actorId, AuditAction.APPOINTMENT_CHECKED_IN, id);
    return visit;
  }

  private audit(actorId: string, action: AuditAction, appointmentId: string) {
    return this.prisma.auditLog.create({ data: { actorId, action, entity: 'Appointment', entityId: appointmentId } });
  }
}
