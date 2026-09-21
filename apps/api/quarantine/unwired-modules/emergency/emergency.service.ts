import { Injectable } from '@nestjs/common';
import { EmergencyEntity } from './entities/emergency.entity';
import { CreateEmergencyDto, UpdateEmergencyDto } from './dto';

@Injectable()
export class EmergencyService {
  private emergencies: EmergencyEntity[] = [];

  findAll(): EmergencyEntity[] {
    return this.emergencies;
  }

  findOne(id: string): EmergencyEntity {
    const emergency = this.emergencies.find((e) => e.id === id);
    if (!emergency) {
      throw new Error('Emergency record not found');
    }
    return emergency;
  }

  create(dto: CreateEmergencyDto): EmergencyEntity {
    const emergency = new EmergencyEntity();
    emergency.id = crypto.randomUUID();
    emergency.patientId = dto.patientId;
    emergency.priorityLevel = dto.priorityLevel;
    emergency.status = dto.status || 'PENDING';
    emergency.chiefComplaint = dto.chiefComplaint;
    emergency.treatment = dto.treatment;
    emergency.attendedAt = dto.attendedAt;
    emergency.dischargedAt = dto.dischargedAt;
    emergency.createdAt = new Date();
    emergency.updatedAt = new Date();
    this.emergencies.push(emergency);
    return emergency;
  }

  update(id: string, dto: UpdateEmergencyDto): EmergencyEntity {
    const index = this.emergencies.findIndex((e) => e.id === id);
    if (index === -1) {
      throw new Error('Emergency record not found');
    }
    this.emergencies[index] = { ...this.emergencies[index], ...dto, updatedAt: new Date() };
    return this.emergencies[index];
  }
}
