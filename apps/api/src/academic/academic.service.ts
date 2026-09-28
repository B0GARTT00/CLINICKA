import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    this.assertRange(startsAt, endsAt, 'Academic year');

    const overlap = await this.prisma.academicYear.findFirst({
      where: { startsAt: { lte: endsAt }, endsAt: { gte: startsAt } },
      select: { id: true },
    });
    if (overlap) throw new ConflictException('Academic year dates overlap an existing academic year.');

    try {
      const year = await this.prisma.academicYear.create({ data: { ...dto, startsAt, endsAt } });
      await this.audit(actorId, AuditAction.ACADEMIC_YEAR_CREATED, 'AcademicYear', year.id);
      return year;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Academic year already exists.');
      throw error;
    }
  }

  async createSemester(dto: CreateSemesterDto, actorId: string) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    this.assertRange(startsAt, endsAt, 'Semester');

    const year = await this.prisma.academicYear.findUnique({ where: { id: dto.academicYearId } });
    if (!year) throw new NotFoundException('Academic year not found.');
    if (startsAt < year.startsAt || endsAt > year.endsAt) {
      throw new BadRequestException('Semester dates must fall within the selected academic year.');
    }

    const overlap = await this.prisma.semester.findFirst({
      where: { academicYearId: dto.academicYearId, startsAt: { lte: endsAt }, endsAt: { gte: startsAt } },
      select: { id: true },
    });
    if (overlap) throw new ConflictException('Semester dates overlap another semester in this academic year.');

    const semester = await this.prisma.semester.create({ data: { ...dto, startsAt, endsAt } });
    await this.audit(actorId, AuditAction.SEMESTER_CREATED, 'Semester', semester.id);
    return semester;
  }

  async activateYear(id: string) {
    const year = await this.prisma.academicYear.findUnique({ where: { id }, select: { id: true } });
    if (!year) throw new NotFoundException('Academic year not found.');

    return this.prisma.$transaction(async (tx) => {
      await tx.semester.updateMany({ data: { isActive: false, activeKey: null } });
      await tx.academicYear.updateMany({ data: { isActive: false, activeKey: null } });
      return tx.academicYear.update({ where: { id }, data: { isActive: true, activeKey: 1 } });
    });
  }

  async activateSemester(id: string) {
    const semester = await this.prisma.semester.findUnique({ where: { id }, select: { id: true, academicYearId: true } });
    if (!semester) throw new NotFoundException('Semester not found.');

    return this.prisma.$transaction(async (tx) => {
      await tx.semester.updateMany({ data: { isActive: false, activeKey: null } });
      await tx.academicYear.updateMany({ data: { isActive: false, activeKey: null } });
      await tx.academicYear.update({ where: { id: semester.academicYearId }, data: { isActive: true, activeKey: 1 } });
      return tx.semester.update({ where: { id }, data: { isActive: true, activeKey: 1 } });
    });
  }

  private assertRange(startsAt: Date, endsAt: Date, label: string) {
    if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime()) || startsAt >= endsAt) {
      throw new BadRequestException(`${label} start date must be before its end date.`);
    }
  }

  private audit(actorId: string, action: AuditAction, entity: string, entityId: string) {
    return this.prisma.auditLog.create({ data: { actorId, action, entity, entityId } });
  }
}
