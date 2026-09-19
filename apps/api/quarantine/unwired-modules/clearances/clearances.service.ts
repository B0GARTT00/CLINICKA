import { Injectable } from '@nestjs/common';
import { ClearanceEntity } from './entities/clearances.entity';
import { CreateClearanceDto, UpdateClearanceDto } from './dto';

@Injectable()
export class ClearancesService {
  private clearances: ClearanceEntity[] = [];

  findAll(): ClearanceEntity[] {
    return this.clearances;
  }

  findOne(id: string): ClearanceEntity {
    const clearance = this.clearances.find((c) => c.id === id);
    if (!clearance) {
      throw new Error('Clearance not found');
    }
    return clearance;
  }

  create(dto: CreateClearanceDto): ClearanceEntity {
    const clearance = new ClearanceEntity();
    clearance.id = crypto.randomUUID();
    clearance.patientId = dto.patientId;
    clearance.clearanceType = dto.clearanceType;
    clearance.reason = dto.reason;
    clearance.status = dto.status || 'PENDING';
    clearance.notes = dto.notes;
    clearance.createdAt = new Date();
    clearance.updatedAt = new Date();
    this.clearances.push(clearance);
    return clearance;
  }

  update(id: string, dto: UpdateClearanceDto): ClearanceEntity {
    const index = this.clearances.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new Error('Clearance not found');
    }
    this.clearances[index] = { ...this.clearances[index], ...dto, updatedAt: new Date() };
    return this.clearances[index];
  }
}
