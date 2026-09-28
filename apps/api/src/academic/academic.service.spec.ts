import { BadRequestException, ConflictException } from '@nestjs/common';
import { AcademicService } from './academic.service';

describe('AcademicService period invariants', () => {
  const prisma = {
    academicYear: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), updateMany: jest.fn(), update: jest.fn() },
    semester: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), updateMany: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  const service = new AcademicService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.academicYear.findFirst.mockResolvedValue(null);
    prisma.semester.findFirst.mockResolvedValue(null);
    prisma.auditLog.create.mockResolvedValue({});
    prisma.$transaction.mockImplementation((callback) => callback(prisma));
  });

  it('rejects an academic year whose start is not before its end', async () => {
    await expect(service.createYear({ label: '2027-2028', startsAt: '2028-01-01', endsAt: '2027-01-01' }, 'actor'))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.academicYear.create).not.toHaveBeenCalled();
  });

  it('rejects overlapping academic years', async () => {
    prisma.academicYear.findFirst.mockResolvedValue({ id: 'existing' });
    await expect(service.createYear({ label: '2027-2028', startsAt: '2027-08-01', endsAt: '2028-07-31' }, 'actor'))
      .rejects.toBeInstanceOf(ConflictException);
  });

  it('requires semester dates to be contained by their academic year', async () => {
    prisma.academicYear.findUnique.mockResolvedValue({ id: 'ay', startsAt: new Date('2027-08-01'), endsAt: new Date('2028-07-31') });
    await expect(service.createSemester({ academicYearId: 'ay', term: 'FIRST' as never, label: 'First', startsAt: '2027-07-01', endsAt: '2027-12-01' }, 'actor'))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects overlapping semesters in one academic year', async () => {
    prisma.academicYear.findUnique.mockResolvedValue({ id: 'ay', startsAt: new Date('2027-08-01'), endsAt: new Date('2028-07-31') });
    prisma.semester.findFirst.mockResolvedValue({ id: 'semester-existing' });
    await expect(service.createSemester({ academicYearId: 'ay', term: 'SECOND' as never, label: 'Second', startsAt: '2027-11-01', endsAt: '2028-03-01' }, 'actor'))
      .rejects.toBeInstanceOf(ConflictException);
  });

  it('activates a semester and its year while deactivating every previous selection', async () => {
    prisma.semester.findUnique.mockResolvedValue({ id: 'semester-2', academicYearId: 'ay-2' });
    prisma.semester.update.mockResolvedValue({ id: 'semester-2', isActive: true });

    await service.activateSemester('semester-2');

    expect(prisma.semester.updateMany).toHaveBeenCalledWith({ data: { isActive: false, activeKey: null } });
    expect(prisma.academicYear.updateMany).toHaveBeenCalledWith({ data: { isActive: false, activeKey: null } });
    expect(prisma.academicYear.update).toHaveBeenCalledWith({ where: { id: 'ay-2' }, data: { isActive: true, activeKey: 1 } });
    expect(prisma.semester.update).toHaveBeenCalledWith({ where: { id: 'semester-2' }, data: { isActive: true, activeKey: 1 } });
  });
});
