import { Injectable } from '@nestjs/common';
import { HealthRequirementEntity } from './entities/health-requirements.entity';
import { CreateHealthRequirementDto, UpdateHealthRequirementDto } from './dto';

@Injectable()
export class HealthRequirementsService {
  private requirements: HealthRequirementEntity[] = [];

  findAll(): HealthRequirementEntity[] {
    return this.requirements;
  }

  findOne(id: string): HealthRequirementEntity {
    const requirement = this.requirements.find((r) => r.id === id);
    if (!requirement) {
      throw new Error('Health requirement not found');
    }
    return requirement;
  }

  create(dto: CreateHealthRequirementDto): HealthRequirementEntity {
    const requirement = new HealthRequirementEntity();
    requirement.id = crypto.randomUUID();
    requirement.patientId = dto.patientId;
    requirement.requirementType = dto.requirementType;
    requirement.description = dto.description;
    requirement.status = dto.status || 'PENDING';
    requirement.submittedAt = dto.submittedAt;
    requirement.verifiedAt = dto.verifiedAt;
    requirement.createdAt = new Date();
    requirement.updatedAt = new Date();
    this.requirements.push(requirement);
    return requirement;
  }

  update(id: string, dto: UpdateHealthRequirementDto): HealthRequirementEntity {
    const index = this.requirements.findIndex((r) => r.id === id);
    if (index === -1) {
      throw new Error('Health requirement not found');
    }
    this.requirements[index] = { ...this.requirements[index], ...dto, updatedAt: new Date() };
    return this.requirements[index];
  }
}
