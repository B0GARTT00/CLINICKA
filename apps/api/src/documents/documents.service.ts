import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditAction } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { DOCUMENT_MIME_TYPES, MAX_PRIVATE_DOCUMENT_BYTES, PRIVATE_STORAGE, PrivateStorageAdapter, validateDocumentContent } from './private-storage';

export type PrivateDocumentUpload = { filename: string; mimeType: string; contentBase64: string };

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
    @Inject(PRIVATE_STORAGE) private readonly storage: PrivateStorageAdapter,
  ) {}

  async create(patientId: string, actorId: string, upload: PrivateDocumentUpload, prefix = 'documents') {
    const patient = await this.prisma.patient.findFirst({ where: { id: patientId, deletedAt: null } });
    if (!patient) throw new NotFoundException('Patient not found.');
    const content = Buffer.from(upload.contentBase64, 'base64');
    if (!validateDocumentContent(upload.mimeType, content)) {
      throw new BadRequestException(`File must be a valid PDF, JPEG, or PNG and no larger than ${MAX_PRIVATE_DOCUMENT_BYTES / 1024 / 1024} MB.`);
    }
    const extension = DOCUMENT_MIME_TYPES.get(upload.mimeType)!;
    const storageKey = `${prefix}/${randomUUID()}${extension}`;
    await this.storage.put(storageKey, content);
    try {
      const document = await this.prisma.document.create({ data: { patientId, filename: upload.filename, mimeType: upload.mimeType, storageKey, sizeBytes: content.length, isPrivate: true, createdById: actorId } });
      await this.audit.record(actorId, AuditAction.CREATE, 'Document', document.id);
      return this.metadata(document);
    } catch (error) {
      await this.storage.delete(storageKey).catch(() => undefined);
      throw error;
    }
  }

  async getMetadata(id: string, requesterId: string) {
    return this.metadata(await this.authorizedDocument(id, requesterId));
  }

  async download(id: string, requesterId: string) {
    const document = await this.authorizedDocument(id, requesterId);
    return { buffer: await this.storage.get(document.storageKey), filename: document.filename, mimeType: document.mimeType };
  }

  async remove(id: string, requesterId: string) {
    const document = await this.authorizedDocument(id, requesterId, true);
    const links = await this.prisma.document.findUnique({ where: { id }, select: { submissions: { select: { id: true }, take: 1 }, certificate: { select: { id: true } } } });
    if (links?.submissions.length || links?.certificate) throw new ConflictException('Linked clinical documents are retained and cannot be deleted.');
    const retentionDays = this.config.get<number>('privateStorage.retentionDays') ?? 0;
    if (retentionDays > 0 && Date.now() - document.createdAt.getTime() < retentionDays * 86_400_000) {
      throw new ConflictException(`This document is subject to a ${retentionDays}-day retention period.`);
    }
    await this.prisma.document.delete({ where: { id } });
    await this.storage.delete(document.storageKey);
    await this.audit.record(requesterId, AuditAction.DELETE, 'Document', id);
    return { deleted: true };
  }

  async purgeUnlinked(id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: { submissions: { select: { id: true }, take: 1 }, certificate: { select: { id: true } } },
    });
    if (!document || document.submissions.length || document.certificate) return;
    await this.prisma.document.delete({ where: { id } });
    await this.storage.delete(document.storageKey).catch(() => undefined);
  }

  private async authorizedDocument(id: string, requesterId: string, requireClinical = false) {
    const [document, requester] = await Promise.all([
      this.prisma.document.findUnique({ where: { id } }),
      this.prisma.user.findUnique({ where: { id: requesterId }, include: { roles: { include: { role: true } } } }),
    ]);
    if (!document || !document.isPrivate) throw new NotFoundException('Private document not found.');
    if (!requester) throw new NotFoundException('User not found.');
    const clinical = requester.roles.some(({ role }) => ['ADMINISTRATOR', 'CLINIC_NURSE', 'CLINIC_STAFF', 'DOCTOR'].includes(role.name));
    if (!clinical && (requireClinical || !requester.patientId || requester.patientId !== document.patientId)) throw new ForbiddenException('You are not authorized to access this private document.');
    return document;
  }

  private metadata(document: { id: string; patientId: string | null; filename: string; mimeType: string; sizeBytes: number; isPrivate: boolean; createdAt: Date }) {
    return { id: document.id, patientId: document.patientId, filename: document.filename, mimeType: document.mimeType, sizeBytes: document.sizeBytes, isPrivate: document.isPrivate, createdAt: document.createdAt };
  }
}
