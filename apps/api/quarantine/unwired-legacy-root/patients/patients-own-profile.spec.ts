import { NotFoundException } from '@nestjs/common';
import { PatientsService } from './patients.service';

describe('patient self-service ownership', () => {
  const userFindUnique = jest.fn();
  const patientFindUnique = jest.fn();
  const service = new PatientsService({ user: { findUnique: userFindUnique }, patient: { findUnique: patientFindUnique } } as never);

  beforeEach(() => jest.clearAllMocks());

  it('resolves the patient from the authenticated user ID', async () => {
    userFindUnique.mockResolvedValue({ patientId: 'patient-owned', emailVerifiedAt: new Date(), status: 'ACTIVE' });
    patientFindUnique.mockResolvedValue({ id: 'patient-owned', deletedAt: null });
    await expect(service.findOwn('signed-in-user')).resolves.toMatchObject({ id: 'patient-owned' });
    expect(userFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'signed-in-user' } }));
    expect(patientFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'patient-owned' } }));
  });

  it('does not expose a profile to a user without a linked patient', async () => {
    userFindUnique.mockResolvedValue({ patientId: null, emailVerifiedAt: new Date(), status: 'ACTIVE' });
    await expect(service.findOwn('unlinked-user')).rejects.toBeInstanceOf(NotFoundException);
    expect(patientFindUnique).not.toHaveBeenCalled();
  });
});
