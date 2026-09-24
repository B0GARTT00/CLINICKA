import { DispensingValidator } from './dispensing-validator';

describe('DispensingValidator visit integrity', () => {
  const prisma = {
    medicineBatch: { findUnique: jest.fn() },
    clinicVisit: { findUnique: jest.fn() },
    medicineDispensation: { findMany: jest.fn() },
  };
  const validator = new DispensingValidator(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.medicineBatch.findUnique.mockResolvedValue({ id: 'batch-1', medicine: { name: 'Paracetamol' } });
    prisma.clinicVisit.findUnique.mockResolvedValue({
      patientId: 'patient-1',
      status: 'IN_CONSULTATION',
      consultations: [{ prescriptions: [{ items: [{ medicineName: 'Paracetamol', quantity: 10 }] }] }],
    });
    prisma.medicineDispensation.findMany.mockResolvedValue([]);
  });

  it('counts earlier dispensations before approving a quantity', async () => {
    prisma.medicineDispensation.findMany.mockResolvedValue([
      { items: [{ quantity: 7, medicineBatch: { medicine: { name: 'Paracetamol' } } }] },
    ]);

    const result = await validator.validate('patient-1', 'visit-1', [
      { medicineBatchId: 'batch-1', quantity: 4 },
    ]);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'OVER_DISPENSED' })]));
  });

  it('blocks medicine that was not prescribed for the linked visit', async () => {
    prisma.clinicVisit.findUnique.mockResolvedValue({
      patientId: 'patient-1', status: 'OPEN', consultations: [],
    });

    const result = await validator.validate('patient-1', 'visit-1', [
      { medicineBatchId: 'batch-1', quantity: 1 },
    ]);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'NO_PRESCRIPTION' })]));
  });
});
