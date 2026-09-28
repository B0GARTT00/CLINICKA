import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
    const academicYear = await this.prisma.academicYear.findUnique({ where: { id: dto.academicYearId } });
    if (!academicYear) throw new NotFoundException('Academic year not found.');

    const semester = dto.semesterId
      ? await this.prisma.semester.findUnique({ where: { id: dto.semesterId } })
      : null;
    if (dto.semesterId && !semester) throw new NotFoundException('Semester not found.');
    if (semester && semester.academicYearId !== dto.academicYearId) {
      throw new BadRequestException('Semester does not belong to the selected academic year.');
    }

    const deadline = dto.deadline ? new Date(dto.deadline) : undefined;
    const periodStart = semester?.startsAt ?? academicYear.startsAt;
    const periodEnd = semester?.endsAt ?? academicYear.endsAt;
    if (deadline && (deadline < periodStart || deadline > periodEnd)) {
      throw new BadRequestException('Requirement deadline must fall within its academic period.');
    }

    const requirement = await this.prisma.healthRequirement.create({
      data: {
        ...dto,
        deadline,
      },
    });
    await this.audit(actorId, AuditAction.REQUIREMENT_CREATED, requirement.id);
    return requirement;
  }

  private audit(actorId: string, action: AuditAction, entityId: string) {
    return this.prisma.auditLog.create({ data: { actorId, action, entity: 'Requirement', entityId } });
  }
}
