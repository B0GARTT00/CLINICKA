import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { DocumentsService } from './documents.service';

describe('DocumentsService private storage and authorization', () => {
  const prisma = {
    patient: { findFirst: jest.fn() },
    user: { findUnique: jest.fn() },
    document: { create: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
  };
  const audit = { record: jest.fn() };
  const config = { get: jest.fn() };
  const storage = { put: jest.fn(), get: jest.fn(), delete: jest.fn() };
  const service = new DocumentsService(prisma as never, audit as never, config as never, storage);

  beforeEach(() => jest.clearAllMocks());

  it('rejects content that does not match its declared MIME type', async () => {
    prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1' });
    await expect(service.create('patient-1', 'user-1', {
      filename: 'fake.pdf',
      mimeType: 'application/pdf',
      contentBase64: Buffer.from('not a pdf').toString('base64'),
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.put).not.toHaveBeenCalled();
  });

  it('denies a patient access to another patient document', async () => {
    prisma.document.findUnique.mockResolvedValue({ id: 'document-1', patientId: 'patient-1', isPrivate: true });
    prisma.user.findUnique.mockResolvedValue({ patientId: 'patient-2', roles: [{ role: { name: 'STUDENT' } }] });
    await expect(service.download('document-1', 'user-2')).rejects.toBeInstanceOf(ForbiddenException);
    expect(storage.get).not.toHaveBeenCalled();
  });

  it('allows the linked patient to download through private storage', async () => {
    const document = { id: 'document-1', patientId: 'patient-1', isPrivate: true, storageKey: 'documents/key.pdf', filename: 'record.pdf', mimeType: 'application/pdf' };
    prisma.document.findUnique.mockResolvedValue(document);
    prisma.user.findUnique.mockResolvedValue({ patientId: 'patient-1', roles: [{ role: { name: 'STUDENT' } }] });
    storage.get.mockResolvedValue(Buffer.from('%PDF-test'));
    await expect(service.download('document-1', 'user-1')).resolves.toEqual(expect.objectContaining({ filename: 'record.pdf' }));
    expect(storage.get).toHaveBeenCalledWith('documents/key.pdf');
  });

  it('retains documents linked to requirement evidence', async () => {
    const document = { id: 'document-1', patientId: 'patient-1', isPrivate: true, storageKey: 'evidence/key.pdf', createdAt: new Date(0) };
    prisma.document.findUnique
      .mockResolvedValueOnce(document)
      .mockResolvedValueOnce({ submissions: [{ id: 'submission-1' }], certificate: null });
    prisma.user.findUnique.mockResolvedValue({ patientId: null, roles: [{ role: { name: 'CLINIC_NURSE' } }] });
    await expect(service.remove('document-1', 'nurse-1')).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.document.delete).not.toHaveBeenCalled();
    expect(storage.delete).not.toHaveBeenCalled();
  });
});
