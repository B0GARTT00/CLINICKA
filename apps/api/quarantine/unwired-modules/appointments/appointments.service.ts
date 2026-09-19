import { Injectable } from '@nestjs/common';
import { AppointmentEntity } from './entities/appointments.entity';
import { CreateAppointmentDto, UpdateAppointmentDto } from './dto';

@Injectable()
export class AppointmentsService {
  private appointments: AppointmentEntity[] = [];

  findAll(): AppointmentEntity[] {
    return this.appointments;
  }

  findOne(id: string): AppointmentEntity {
    const appointment = this.appointments.find((a) => a.id === id);
    if (!appointment) {
      throw new Error('Appointment not found');
    }
    return appointment;
  }

  create(dto: CreateAppointmentDto): AppointmentEntity {
    const appointment = new AppointmentEntity();
    appointment.id = crypto.randomUUID();
    appointment.patientId = dto.patientId;
    appointment.appointmentDate = dto.appointmentDate;
    appointment.reason = dto.reason;
    appointment.status = dto.status || 'SCHEDULED';
    appointment.notes = dto.notes;
    appointment.createdAt = new Date();
    appointment.updatedAt = new Date();
    this.appointments.push(appointment);
    return appointment;
  }

  update(id: string, dto: UpdateAppointmentDto): AppointmentEntity {
    const index = this.appointments.findIndex((a) => a.id === id);
    if (index === -1) {
      throw new Error('Appointment not found');
    }
    this.appointments[index] = { ...this.appointments[index], ...dto, updatedAt: new Date() };
    return this.appointments[index];
  }

  remove(id: string): void {
    const index = this.appointments.findIndex((a) => a.id === id);
    if (index === -1) {
      throw new Error('Appointment not found');
    }
    this.appointments[index] = { ...this.appointments[index], status: 'CANCELLED', updatedAt: new Date() };
  }
}
