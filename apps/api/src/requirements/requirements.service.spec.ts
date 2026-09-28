import { BadRequestException } from '@nestjs/common';
import { RequirementsService } from './requirements.service';

describe('RequirementsService academic context', () => {
  const prisma = {
    academicYear: { findUnique: jest.fn() },
    semester: { findUnique: jest.fn() },
    healthRequirement: { create: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const service = new RequirementsService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.academicYear.findUnique.mockResolvedValue({ id: 'ay-1', startsAt: new Date('2027-08-01'), endsAt: new Date('2028-07-31') });
    prisma.semester.findUnique.mockResolvedValue({ id: 'sem-1', academicYearId: 'ay-1', startsAt: new Date('2027-08-01'), endsAt: new Date('2027-12-20') });
  });

  it('rejects a semester from another academic year', async () => {
    prisma.semester.findUnique.mockResolvedValue({ id: 'sem-2', academicYearId: 'ay-2', startsAt: new Date('2027-08-01'), endsAt: new Date('2027-12-20') });
    await expect(service.createRequirement({ name: 'Exam', applicableTo: 'ALL', academicYearId: 'ay-1', semesterId: 'sem-2' }, 'actor'))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a deadline outside the selected semester', async () => {
    await expect(service.createRequirement({ name: 'Exam', applicableTo: 'ALL', academicYearId: 'ay-1', semesterId: 'sem-1', deadline: '2028-01-15' }, 'actor'))
      .rejects.toBeInstanceOf(BadRequestException);
  });
});
