import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, AuditAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAcademicYearDto, CreateSemesterDto } from './dto';

@Injectable()
export class AcademicService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.academicYear.findMany({ include: { semesters: true, _count: { select: { requirements: true, clearances: true } } }, orderBy: { startsAt: 'desc' } });
  }

  async createYear(dto: CreateAcademicYearDto, actorId: string) {
    try {
      const year = await this.prisma.academicYear.create({ data: { ...dto, startsAt: new Date(dto.startsAt), endsAt: new Date(dto.endsAt) } });
      await this.audit(actorId, AuditAction.ACADEMIC_YEAR_CREATED, year.id);
      return year;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Academic year already exists.');
      throw error;
    }
  }

  async createSemester(dto: CreateSemesterDto, actorId: string) {
    const year = await this.prisma.academicYear.findUnique({ where: { id: dto.academicYearId } });
    if (!year) throw new NotFoundException('Academic year not found.');
    const semester = await this.prisma.semester.create({ data: { ...dto, term: dto.term as 'FIRST' | 'SECOND' | 'SUMMER', startsAt: new Date(dto.startsAt), endsAt: new Date(dto.endsAt) } });
    await this.audit(actorId, AuditAction.SEMESTER_CREATED, semester.id);
    return semester;
  }

  private audit(actorId: string, action: AuditAction, entityId: string) {
    return this.prisma.auditLog.create({ data: { actorId, action, entity: 'AcademicYear', entityId } });
  }
}
