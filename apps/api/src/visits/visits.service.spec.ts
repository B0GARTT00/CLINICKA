import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { VisitStatus, AuditAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { VisitStateMachine } from './state-machine/visit-state-machine';
import { VisitsService } from './visits.service';

type MockPrisma = {
  patient: {
    findFirst: jest.Mock;
    findUnique: jest.Mock;
  };
  clinicVisit: {
    findFirst: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  vitalSign: {
    create: jest.Mock;
    count: jest.Mock;
  };
  consultation: {
    create: jest.Mock;
    count: jest.Mock;
  };
  auditLog: {
    create: jest.Mock;
  };
};

const createMockPrisma = (): { prisma: MockPrisma; mocks: MockPrisma } => {
  const mocks: MockPrisma = {
    patient: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    clinicVisit: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    vitalSign: {
      create: jest.fn(),
      count: jest.fn(),
    },
    consultation: {
      create: jest.fn(),
      count: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  return {
    prisma: mocks,
    mocks,
  };
};

describe('VisitsService', () => {
  let service: VisitsService;
  let mocks: MockPrisma;

  beforeEach(() => {
    const { prisma, mocks: mockMocks } = createMockPrisma();
    const audit = new AuditService(prisma as unknown as PrismaService);
    const stateMachine = new VisitStateMachine(prisma as unknown as PrismaService, audit);
    service = new VisitsService(prisma as unknown as PrismaService, audit, stateMachine);
    mocks = mockMocks;
  });

  describe('create', () => {
    it('should create a visit with queue number 1 when no previous visits exist', async () => {
      mocks.patient.findFirst.mockResolvedValue({ id: 'patient-1' });
      mocks.clinicVisit.findFirst.mockResolvedValue(null);
      mocks.clinicVisit.create.mockResolvedValue({ id: 'visit-1', patientId: 'patient-1', queueNumber: 1, status: VisitStatus.OPEN });

      const result = await service.create({ patientId: 'patient-1', chiefComplaint: 'Headache' }, 'user-1');

      expect(mocks.clinicVisit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ patientId: 'patient-1', queueNumber: 1, status: VisitStatus.OPEN }),
        include: { patient: true },
      });
      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: { actorId: 'user-1', action: AuditAction.VISIT_CREATED, entity: 'ClinicVisit', entityId: 'visit-1' },
      });
      expect(result).toEqual({ id: 'visit-1', patientId: 'patient-1', queueNumber: 1, status: VisitStatus.OPEN });
    });

    it('should create a visit with incremented queue number', async () => {
      mocks.patient.findFirst.mockResolvedValue({ id: 'patient-1' });
      mocks.clinicVisit.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ queueNumber: 3 });
      mocks.clinicVisit.create.mockResolvedValue({ id: 'visit-1', patientId: 'patient-1', queueNumber: 4, status: VisitStatus.OPEN });

      await service.create({ patientId: 'patient-1', chiefComplaint: 'Fever' }, 'user-1');

      expect(mocks.clinicVisit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ queueNumber: 4 }),
        include: { patient: true },
      });
    });

    it('should throw NotFoundException when patient does not exist', async () => {
      mocks.patient.findFirst.mockResolvedValue(null);
      await expect(
        service.create({ patientId: 'missing', chiefComplaint: 'Headache' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listQueue', () => {
    it('should return today queue ordered by queueNumber', async () => {
      const visits = [{ id: 'visit-1', queueNumber: 1 }, { id: 'visit-2', queueNumber: 2 }];
      mocks.clinicVisit.findMany.mockResolvedValue(visits);
      const result = await service.listQueue();
      expect(result).toEqual(visits);
    });
  });

  describe('findOne', () => {
    it('should return visit with included relations', async () => {
      const visit = { id: 'visit-1', patientId: 'patient-1' };
      mocks.clinicVisit.findUnique.mockResolvedValue(visit);
      const result = await service.findOne('visit-1');
      expect(result).toEqual(visit);
    });

    it('should throw NotFoundException when visit does not exist', async () => {
      mocks.clinicVisit.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('addVitalSigns', () => {
    it('should create vital signs and audit', async () => {
      mocks.clinicVisit.findUnique.mockResolvedValue({ id: 'visit-1' });
      mocks.vitalSign.create.mockResolvedValue({ id: 'vital-1', clinicVisitId: 'visit-1' });

      const result = await service.addVitalSigns('visit-1', { temperatureC: 36.8, systolicBp: 120 } as any, 'user-1');

      expect(mocks.vitalSign.create).toHaveBeenCalledWith({
        data: { clinicVisitId: 'visit-1', recordedById: 'user-1', temperatureC: 36.8, systolicBp: 120 },
      });
      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: { actorId: 'user-1', action: AuditAction.VISIT_VITAL_SIGNS_RECORDED, entity: 'ClinicVisit', entityId: 'visit-1' },
      });
      expect(result).toEqual({ id: 'vital-1', clinicVisitId: 'visit-1' });
    });
  });

  describe('updateStatus', () => {
    it('should allow OPEN -> IN_CONSULTATION transition', async () => {
      mocks.clinicVisit.findUnique.mockResolvedValue({ id: 'visit-1', status: VisitStatus.OPEN });
      mocks.clinicVisit.update.mockResolvedValue({ id: 'visit-1', status: VisitStatus.IN_CONSULTATION });

      const result = await service.updateStatus('visit-1', VisitStatus.IN_CONSULTATION, 'user-1');

      expect(mocks.clinicVisit.update).toHaveBeenCalledWith({ where: { id: 'visit-1' }, data: { status: VisitStatus.IN_CONSULTATION } });
      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorId: 'user-1',
          action: AuditAction.VISIT_STATUS_IN_CONSULTATION,
          entity: 'ClinicVisit',
          entityId: 'visit-1',
          oldValue: { status: VisitStatus.OPEN },
          newValue: { status: VisitStatus.IN_CONSULTATION },
        }),
      });
      expect(result.previousStatus).toBe(VisitStatus.OPEN);
      expect(result.nextStatus).toBe(VisitStatus.IN_CONSULTATION);
    });

    it('should allow IN_CONSULTATION -> COMPLETED transition when prerequisites met', async () => {
      mocks.clinicVisit.findUnique.mockResolvedValue({ id: 'visit-1', status: VisitStatus.IN_CONSULTATION });
      mocks.vitalSign.count.mockResolvedValue(1);
      mocks.consultation.count.mockResolvedValue(1);
      mocks.clinicVisit.update.mockResolvedValue({ id: 'visit-1', status: VisitStatus.COMPLETED });

      const result = await service.updateStatus('visit-1', VisitStatus.COMPLETED, 'user-1');

      expect(mocks.clinicVisit.update).toHaveBeenCalledWith({ where: { id: 'visit-1' }, data: { status: VisitStatus.COMPLETED } });
      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorId: 'user-1',
          action: AuditAction.VISIT_STATUS_COMPLETED,
          entity: 'ClinicVisit',
          entityId: 'visit-1',
          oldValue: { status: VisitStatus.IN_CONSULTATION },
          newValue: { status: VisitStatus.COMPLETED },
        }),
      });
      expect(result.previousStatus).toBe(VisitStatus.IN_CONSULTATION);
      expect(result.nextStatus).toBe(VisitStatus.COMPLETED);
    });

    it('should reject IN_CONSULTATION -> COMPLETED without vital signs', async () => {
      mocks.clinicVisit.findUnique.mockResolvedValue({ id: 'visit-1', status: VisitStatus.IN_CONSULTATION });
      mocks.vitalSign.count.mockResolvedValue(0);
      mocks.consultation.count.mockResolvedValue(1);

      await expect(service.updateStatus('visit-1', VisitStatus.COMPLETED, 'user-1')).rejects.toThrow(UnprocessableEntityException);
      expect(mocks.clinicVisit.update).not.toHaveBeenCalled();
    });

    it('should reject IN_CONSULTATION -> COMPLETED without consultation', async () => {
      mocks.clinicVisit.findUnique.mockResolvedValue({ id: 'visit-1', status: VisitStatus.IN_CONSULTATION });
      mocks.vitalSign.count.mockResolvedValue(1);
      mocks.consultation.count.mockResolvedValue(0);

      await expect(service.updateStatus('visit-1', VisitStatus.COMPLETED, 'user-1')).rejects.toThrow(UnprocessableEntityException);
      expect(mocks.clinicVisit.update).not.toHaveBeenCalled();
    });

    it('should reject OPEN -> COMPLETED transition (invalid transition)', async () => {
      mocks.clinicVisit.findUnique.mockResolvedValue({ id: 'visit-1', status: VisitStatus.OPEN });

      await expect(service.updateStatus('visit-1', VisitStatus.COMPLETED, 'user-1')).rejects.toThrow(UnprocessableEntityException);
      expect(mocks.clinicVisit.update).not.toHaveBeenCalled();
    });

    it('should reject COMPLETED -> OPEN transition (invalid transition)', async () => {
      mocks.clinicVisit.findUnique.mockResolvedValue({ id: 'visit-1', status: VisitStatus.COMPLETED });

      await expect(service.updateStatus('visit-1', VisitStatus.OPEN, 'user-1')).rejects.toThrow(UnprocessableEntityException);
      expect(mocks.clinicVisit.update).not.toHaveBeenCalled();
    });

    it('should reject CANCELLED -> COMPLETED transition (invalid transition)', async () => {
      mocks.clinicVisit.findUnique.mockResolvedValue({ id: 'visit-1', status: VisitStatus.CANCELLED });

      await expect(service.updateStatus('visit-1', VisitStatus.COMPLETED, 'user-1')).rejects.toThrow(UnprocessableEntityException);
      expect(mocks.clinicVisit.update).not.toHaveBeenCalled();
    });

    it('should allow OPEN -> CANCELLED transition', async () => {
      mocks.clinicVisit.findUnique.mockResolvedValue({ id: 'visit-1', status: VisitStatus.OPEN });
      mocks.clinicVisit.update.mockResolvedValue({ id: 'visit-1', status: VisitStatus.CANCELLED });

      const result = await service.updateStatus('visit-1', VisitStatus.CANCELLED, 'user-1');

      expect(mocks.clinicVisit.update).toHaveBeenCalledWith({ where: { id: 'visit-1' }, data: { status: VisitStatus.CANCELLED } });
      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorId: 'user-1',
          action: AuditAction.VISIT_STATUS_CANCELLED,
          entity: 'ClinicVisit',
          entityId: 'visit-1',
        }),
      });
      expect(result.nextStatus).toBe(VisitStatus.CANCELLED);
    });

    it('should allow IN_CONSULTATION -> CANCELLED transition', async () => {
      mocks.clinicVisit.findUnique.mockResolvedValue({ id: 'visit-1', status: VisitStatus.IN_CONSULTATION });
      mocks.clinicVisit.update.mockResolvedValue({ id: 'visit-1', status: VisitStatus.CANCELLED });

      const result = await service.updateStatus('visit-1', VisitStatus.CANCELLED, 'user-1');

      expect(mocks.clinicVisit.update).toHaveBeenCalledWith({ where: { id: 'visit-1' }, data: { status: VisitStatus.CANCELLED } });
      expect(result.nextStatus).toBe(VisitStatus.CANCELLED);
    });
  });

  describe('addConsultation', () => {
    it('should create consultation with nested records and update visit status to IN_CONSULTATION', async () => {
      mocks.clinicVisit.findUnique.mockResolvedValue({ id: 'visit-1', status: VisitStatus.OPEN });
      mocks.consultation.create.mockResolvedValue({ id: 'consult-1', clinicVisitId: 'visit-1' });
      mocks.clinicVisit.update.mockResolvedValue({ id: 'visit-1', status: VisitStatus.IN_CONSULTATION, clinicianId: 'user-1' });

      const dto = {
        subjective: 'Headache',
        objective: 'Normal',
        assessment: 'Tension headache',
        plan: 'Rest',
        diagnoses: [{ description: 'Tension headache', code: 'R51' }],
        treatments: [{ description: 'Paracetamol' }],
        prescriptionInstructions: 'Take 1 tablet',
        prescriptionItems: [{ medicineName: 'Paracetamol', dosage: '500mg', frequency: 'q6h' }],
      };

      const result = await service.addConsultation('visit-1', dto, 'user-1');

      expect(mocks.consultation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          clinicVisitId: 'visit-1',
          clinicianId: 'user-1',
          diagnoses: { create: dto.diagnoses },
          treatments: { create: dto.treatments },
          prescriptions: expect.objectContaining({
            create: expect.objectContaining({
              instructions: 'Take 1 tablet',
              items: { create: dto.prescriptionItems },
            }),
          }),
        }),
        include: expect.any(Object),
      });
      expect(mocks.clinicVisit.update).toHaveBeenCalledWith({ where: { id: 'visit-1' }, data: { status: VisitStatus.IN_CONSULTATION, clinicianId: 'user-1' } });
      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorId: 'user-1',
          action: AuditAction.VISIT_STATUS_IN_CONSULTATION,
          entity: 'ClinicVisit',
          entityId: 'visit-1',
        }),
      });
      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorId: 'user-1',
          action: AuditAction.VISIT_CONSULTATION_RECORDED,
          entity: 'ClinicVisit',
          entityId: 'visit-1',
        }),
      });
      expect(result).toEqual({ id: 'consult-1', clinicVisitId: 'visit-1' });
    });

    it('should not change status if already IN_CONSULTATION', async () => {
      mocks.clinicVisit.findUnique.mockResolvedValue({ id: 'visit-1', status: VisitStatus.IN_CONSULTATION });
      mocks.consultation.create.mockResolvedValue({ id: 'consult-1', clinicVisitId: 'visit-1' });

      const dto = { subjective: 'Follow up' };
      const result = await service.addConsultation('visit-1', dto, 'user-1');

      expect(mocks.clinicVisit.update).not.toHaveBeenCalled();
      expect(mocks.auditLog.create).toHaveBeenCalledTimes(1); // only VISIT_CONSULTATION_RECORDED
      expect(result).toEqual({ id: 'consult-1', clinicVisitId: 'visit-1' });
    });

    it('should reject adding consultation to a COMPLETED visit', async () => {
      mocks.clinicVisit.findUnique.mockResolvedValue({ id: 'visit-1', status: VisitStatus.COMPLETED });
      mocks.consultation.create.mockResolvedValue({ id: 'consult-1', clinicVisitId: 'visit-1' });

      await expect(service.addConsultation('visit-1', {}, 'user-1')).rejects.toThrow(UnprocessableEntityException);
    });

    it('should reject adding consultation to a CANCELLED visit', async () => {
      mocks.clinicVisit.findUnique.mockResolvedValue({ id: 'visit-1', status: VisitStatus.CANCELLED });
      mocks.consultation.create.mockResolvedValue({ id: 'consult-1', clinicVisitId: 'visit-1' });

      await expect(service.addConsultation('visit-1', {}, 'user-1')).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('complete', () => {
    it('should complete an IN_CONSULTATION visit with vitals and consultation', async () => {
      mocks.clinicVisit.findUnique.mockResolvedValue({ id: 'visit-1', status: VisitStatus.IN_CONSULTATION });
      mocks.vitalSign.count.mockResolvedValue(1);
      mocks.consultation.count.mockResolvedValue(1);
      mocks.clinicVisit.update.mockResolvedValue({ id: 'visit-1', status: VisitStatus.COMPLETED });

      const result = await service.complete('visit-1', 'user-1');

      expect(mocks.clinicVisit.update).toHaveBeenCalledWith({
        where: { id: 'visit-1' },
        data: { status: VisitStatus.COMPLETED },
      });
      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorId: 'user-1',
          action: AuditAction.VISIT_STATUS_COMPLETED,
          entity: 'ClinicVisit',
          entityId: 'visit-1',
          oldValue: { status: VisitStatus.IN_CONSULTATION },
          newValue: { status: VisitStatus.COMPLETED },
        }),
      });
      expect(result.previousStatus).toBe(VisitStatus.IN_CONSULTATION);
      expect(result.nextStatus).toBe(VisitStatus.COMPLETED);
    });

    it('should reject completing an already completed visit', async () => {
      mocks.clinicVisit.findUnique.mockResolvedValue({ id: 'visit-1', status: VisitStatus.COMPLETED });

      await expect(service.complete('visit-1', 'user-1')).rejects.toThrow(UnprocessableEntityException);
      expect(mocks.clinicVisit.update).not.toHaveBeenCalled();
    });

    it('should reject completing a cancelled visit', async () => {
      mocks.clinicVisit.findUnique.mockResolvedValue({ id: 'visit-1', status: VisitStatus.CANCELLED });

      await expect(service.complete('visit-1', 'user-1')).rejects.toThrow(UnprocessableEntityException);
      expect(mocks.clinicVisit.update).not.toHaveBeenCalled();
    });

    it('should reject completing an OPEN visit (invalid transition)', async () => {
      mocks.clinicVisit.findUnique.mockResolvedValue({ id: 'visit-1', status: VisitStatus.OPEN });

      await expect(service.complete('visit-1', 'user-1')).rejects.toThrow(UnprocessableEntityException);
      expect(mocks.clinicVisit.update).not.toHaveBeenCalled();
    });

    it('should reject completing IN_CONSULTATION visit without vitals', async () => {
      mocks.clinicVisit.findUnique.mockResolvedValue({ id: 'visit-1', status: VisitStatus.IN_CONSULTATION });
      mocks.vitalSign.count.mockResolvedValue(0);
      mocks.consultation.count.mockResolvedValue(1);

      await expect(service.complete('visit-1', 'user-1')).rejects.toThrow(UnprocessableEntityException);
      expect(mocks.clinicVisit.update).not.toHaveBeenCalled();
    });

    it('should reject completing IN_CONSULTATION visit without consultation', async () => {
      mocks.clinicVisit.findUnique.mockResolvedValue({ id: 'visit-1', status: VisitStatus.IN_CONSULTATION });
      mocks.vitalSign.count.mockResolvedValue(1);
      mocks.consultation.count.mockResolvedValue(0);

      await expect(service.complete('visit-1', 'user-1')).rejects.toThrow(UnprocessableEntityException);
      expect(mocks.clinicVisit.update).not.toHaveBeenCalled();
    });
  });
});
