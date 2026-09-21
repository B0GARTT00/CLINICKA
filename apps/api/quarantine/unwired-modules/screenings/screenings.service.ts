import { Injectable } from '@nestjs/common';
import { ScreeningEntity } from './entities/screenings.entity';
import { CreateScreeningDto, UpdateScreeningDto } from './dto';

@Injectable()
export class ScreeningsService {
  private screenings: ScreeningEntity[] = [];

  findAll(): ScreeningEntity[] {
    return this.screenings;
  }

  findOne(id: string): ScreeningEntity {
    const screening = this.screenings.find((s) => s.id === id);
    if (!screening) {
      throw new Error('Screening not found');
    }
    return screening;
  }

  create(dto: CreateScreeningDto): ScreeningEntity {
    const screening = new ScreeningEntity();
    screening.id = crypto.randomUUID();
    screening.patientId = dto.patientId;
    screening.screeningType = dto.screeningType;
    screening.result = dto.result;
    screening.status = dto.status || 'PENDING';
    screening.screenedAt = dto.screenedAt;
    screening.screenedBy = dto.screenedBy;
    screening.notes = dto.notes;
    screening.createdAt = new Date();
    screening.updatedAt = new Date();
    this.screenings.push(screening);
    return screening;
  }

  update(id: string, dto: UpdateScreeningDto): ScreeningEntity {
    const index = this.screenings.findIndex((s) => s.id === id);
    if (index === -1) {
      throw new Error('Screening not found');
    }
    this.screenings[index] = { ...this.screenings[index], ...dto, updatedAt: new Date() };
    return this.screenings[index];
  }
}
