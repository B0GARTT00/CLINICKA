import { Injectable } from '@nestjs/common';
import { ClinicVisitEntity } from './entities/clinic-visits.entity';
import { CreateClinicVisitDto, UpdateClinicVisitDto } from './dto';

@Injectable()
export class ClinicVisitsService {
  private visits: ClinicVisitEntity[] = [];

  findAll(): ClinicVisitEntity[] {
    return this.visits;
  }

  findOne(id: string): ClinicVisitEntity {
    const visit = this.visits.find((v) => v.id === id);
    if (!visit) {
      throw new Error('Clinic visit not found');
    }
    return visit;
  }

  create(dto: CreateClinicVisitDto): ClinicVisitEntity {
    const visit = new ClinicVisitEntity();
    visit.id = crypto.randomUUID();
    visit.patientId = dto.patientId;
    visit.visitType = dto.visitType;
    visit.status = dto.status;
    visit.reason = dto.reason;
    visit.notes = dto.notes;
    visit.visitedAt = dto.visitedAt;
    visit.createdAt = new Date();
    visit.updatedAt = new Date();
    this.visits.push(visit);
    return visit;
  }

  update(id: string, dto: UpdateClinicVisitDto): ClinicVisitEntity {
    const index = this.visits.findIndex((v) => v.id === id);
    if (index === -1) {
      throw new Error('Clinic visit not found');
    }
    this.visits[index] = { ...this.visits[index], ...dto, updatedAt: new Date() };
    return this.visits[index];
  }
}
