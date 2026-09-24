import { Injectable } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRequirementDto } from './dto';

@Injectable()
export class RequirementsService {
  constructor(private readonly prisma: PrismaService) {}

  listRequirements() {
    return this.prisma.healthRequirement.findMany({
      where: { archiveStatus: 'ACTIVE' },
      include: { academicYear: true, semester: true, _count: { select: { submissions: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createRequirement(dto: CreateRequirementDto, actorId: string) {
    const requirement = await this.prisma.healthRequirement.create({
      data: {
        ...dto,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
      },
    });
    await this.audit(actorId, AuditAction.REQUIREMENT_CREATED, requirement.id);
    return requirement;
  }

  private audit(actorId: string, action: AuditAction, entityId: string) {
    return this.prisma.auditLog.create({ data: { actorId, action, entity: 'Requirement', entityId } });
  }
}
