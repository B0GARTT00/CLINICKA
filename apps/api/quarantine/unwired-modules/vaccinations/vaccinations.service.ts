import { Injectable } from '@nestjs/common';
import { VaccinationEntity } from './entities/vaccinations.entity';
import { CreateVaccinationDto, UpdateVaccinationDto } from './dto';

@Injectable()
export class VaccinationsService {
  private vaccinations: VaccinationEntity[] = [];

  findAll(): VaccinationEntity[] {
    return this.vaccinations;
  }

  findOne(id: string): VaccinationEntity {
    const vaccination = this.vaccinations.find((v) => v.id === id);
    if (!vaccination) {
      throw new Error('Vaccination not found');
    }
    return vaccination;
  }

  create(dto: CreateVaccinationDto): VaccinationEntity {
    const vaccination = new VaccinationEntity();
    vaccination.id = crypto.randomUUID();
    vaccination.patientId = dto.patientId;
    vaccination.vaccineName = dto.vaccineName;
    vaccination.doseNumber = dto.doseNumber;
    vaccination.totalDoses = dto.totalDoses;
    vaccination.administeredAt = dto.administeredAt;
    vaccination.nextDoseAt = dto.nextDoseAt;
    vaccination.administeredBy = dto.administeredBy;
    vaccination.createdAt = new Date();
    vaccination.updatedAt = new Date();
    this.vaccinations.push(vaccination);
    return vaccination;
  }

  update(id: string, dto: UpdateVaccinationDto): VaccinationEntity {
    const index = this.vaccinations.findIndex((v) => v.id === id);
    if (index === -1) {
      throw new Error('Vaccination not found');
    }
    this.vaccinations[index] = { ...this.vaccinations[index], ...dto, updatedAt: new Date() };
    return this.vaccinations[index];
  }
}
