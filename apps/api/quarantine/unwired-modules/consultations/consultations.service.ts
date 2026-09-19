import { Injectable } from '@nestjs/common';
import { ConsultationEntity } from './entities/consultations.entity';
import { CreateConsultationDto, UpdateConsultationDto } from './dto';

@Injectable()
export class ConsultationsService {
  private consultations: ConsultationEntity[] = [];

  findAll(): ConsultationEntity[] {
    return this.consultations;
  }

  findOne(id: string): ConsultationEntity {
    const consultation = this.consultations.find((c) => c.id === id);
    if (!consultation) {
      throw new Error('Consultation not found');
    }
    return consultation;
  }

  create(dto: CreateConsultationDto): ConsultationEntity {
    const consultation = new ConsultationEntity();
    consultation.id = crypto.randomUUID();
    consultation.patientId = dto.patientId;
    consultation.clinicVisitId = dto.clinicVisitId;
    consultation.symptoms = dto.symptoms;
    consultation.findings = dto.findings;
    consultation.diagnosis = dto.diagnosis;
    consultation.treatment = dto.treatment;
    consultation.notes = dto.notes;
    consultation.consultedAt = dto.consultedAt;
    consultation.createdAt = new Date();
    consultation.updatedAt = new Date();
    this.consultations.push(consultation);
    return consultation;
  }

  update(id: string, dto: UpdateConsultationDto): ConsultationEntity {
    const index = this.consultations.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new Error('Consultation not found');
    }
    this.consultations[index] = { ...this.consultations[index], ...dto, updatedAt: new Date() };
    return this.consultations[index];
  }
}
