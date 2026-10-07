import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, ConversationStatus, ConversationTopic, NotificationStatus, NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAnnouncementDto, CreateConversationDto } from './dto';
import { DocumentsService, PrivateDocumentUpload } from '../documents/documents.service';

@Injectable()
export class CommunicationsService {
  constructor(private readonly prisma: PrismaService, private readonly documents: DocumentsService) {}

  listAnnouncements(includeDrafts = false) {
    return this.prisma.announcement.findMany({
      where: includeDrafts ? undefined : { publishedAt: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async createAnnouncement(dto: CreateAnnouncementDto, actorId: string) {
    const announcement = await this.prisma.announcement.create({ data: { ...dto, expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined, createdById: actorId } });
    await this.audit(actorId, AuditAction.ANNOUNCEMENT_CREATED, announcement.id);
    return announcement;
  }

  async publishAnnouncement(id: string, actorId: string) {
    const announcement = await this.prisma.announcement.findUnique({ where: { id } });
    if (!announcement) throw new NotFoundException('Announcement not found.');
    if (announcement.publishedAt) throw new ConflictException('Announcement has already been published.');
    const published = await this.prisma.announcement.update({ where: { id }, data: { publishedAt: new Date() } });
    const audienceRoles = announcement.audience === 'STUDENT'
      ? ['STUDENT']
      : announcement.audience === 'FACULTY_STAFF'
        ? ['FACULTY_STAFF']
        : announcement.audience === 'CLINIC_STAFF'
          ? ['ADMINISTRATOR', 'CLINIC_NURSE', 'CLINIC_STAFF', 'DOCTOR']
          : undefined;
    const recipients = await this.prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        ...(audienceRoles ? { roles: { some: { role: { name: { in: audienceRoles } } } } } : {}),
      },
      select: { id: true },
    });
    if (recipients.length) {
      await this.prisma.notification.createMany({
        data: recipients.map((recipient) => ({
          userId: recipient.id,
          title: announcement.title,
          body: announcement.body,
          type: NotificationType.ANNOUNCEMENT,
          metadata: { href: '/notifications', entityId: announcement.id },
        })),
      });
    }
    await this.audit(actorId, AuditAction.ANNOUNCEMENT_PUBLISHED, id);
    return published;
  }

  listNotifications(userId: string) {
    return this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  async markNotificationRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!notification) throw new NotFoundException('Notification not found.');
    return this.prisma.notification.update({ where: { id }, data: { status: NotificationStatus.READ } });
  }

  markAllNotificationsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, status: NotificationStatus.UNREAD },
      data: { status: NotificationStatus.READ },
    });
  }

  async createConversation(dto: CreateConversationDto, actorId: string) {
    const message = this.requireMessage(dto.message);
    const subject = dto.subject.trim();
    if (subject.length < 3) throw new BadRequestException('A subject with at least 3 characters is required.');
    const patient = await this.prisma.patient.findFirst({
      where: { OR: [{ id: dto.patientId }, { patientNumber: dto.patientId }], deletedAt: null },
      include: { user: { select: { id: true } } },
    });
    if (!patient) throw new NotFoundException('Active patient not found.');
    if (!patient.user) throw new ConflictException('The patient needs an active linked account before secure messaging can be used.');
    const attachment = dto.attachment ? await this.documents.create(patient.id, actorId, dto.attachment, 'messages') : null;
    try {
      const conversation = await this.prisma.$transaction(async (tx) => {
      const created = await tx.conversation.create({
        data: {
          patientId: patient.id, subject, topic: dto.topic as ConversationTopic,
          repliesEnabled: dto.repliesEnabled ?? true, createdById: actorId,
          relatedType: dto.relatedType || undefined, relatedId: dto.relatedId || undefined,
          participants: { create: [
            { userId: actorId, participantType: 'CLINIC_STAFF', lastReadAt: new Date() },
            { userId: patient.user!.id, participantType: 'PATIENT' },
          ] },
          messages: { create: { senderId: actorId, content: message, allowReply: dto.repliesEnabled ?? true, attachments: attachment ? { create: { documentId: attachment.id } } : undefined } },
        },
      });
      await tx.notification.create({ data: { userId: patient.user!.id, title: 'New clinic message', body: 'You have a new clinic message.', type: NotificationType.CLINIC_MESSAGE, metadata: { href: `/messages/${created.id}`, conversationId: created.id } } });
      await tx.auditLog.create({ data: { actorId, action: AuditAction.CONVERSATION_CREATED, entity: 'Conversation', entityId: created.id, metadata: { patientId: patient.id, topic: dto.topic } } });
      await tx.auditLog.create({ data: { actorId, action: AuditAction.MESSAGE_SENT, entity: 'Conversation', entityId: created.id } });
      return created;
      });
      return this.getConversation(conversation.id, actorId);
    } catch (error) {
      if (attachment) await this.documents.purgeUnlinked(attachment.id);
      throw error;
    }
  }

  async listConversations(userId: string) {
    return this.prisma.conversation.findMany({
      where: { participants: { some: { userId, archivedAt: null } } },
      include: {
        patient: { select: { id: true, patientNumber: true, firstName: true, lastName: true, type: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1, include: { sender: { select: { id: true, displayName: true } } } },
        participants: { where: { userId }, select: { lastReadAt: true } },
      },
      orderBy: { updatedAt: 'desc' }, take: 100,
    });
  }

  async getConversation(id: string, userId: string) {
    await this.assertConversationAccess(id, userId);
    return this.prisma.conversation.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, patientNumber: true, firstName: true, lastName: true, type: true } },
        createdBy: { select: { id: true, displayName: true } },
        participants: { include: { user: { select: { id: true, displayName: true } } } },
        messages: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' }, include: { sender: { select: { id: true, displayName: true } }, attachments: { include: { document: { select: { id: true, filename: true, mimeType: true, sizeBytes: true } } } } } },
      },
    });
  }

  async sendMessage(id: string, content: string, attachmentUpload: PrivateDocumentUpload | undefined, userId: string, roles: string[]) {
    const message = this.requireMessage(content);
    const conversation = await this.assertConversationAccess(id, userId);
    if (conversation.status !== ConversationStatus.OPEN) throw new ConflictException('Resolved or closed conversations cannot receive new messages.');
    const patientSender = !this.isClinicStaff(roles);
    if (patientSender && !conversation.repliesEnabled) throw new ForbiddenException('Replies are disabled for this conversation.');
    const attachment = attachmentUpload ? await this.documents.create(conversation.patientId, userId, attachmentUpload, 'messages') : null;
    try {
      await this.prisma.$transaction(async (tx) => {
      await tx.conversationParticipant.upsert({ where: { conversationId_userId: { conversationId: id, userId } }, update: { lastReadAt: new Date(), archivedAt: null }, create: { conversationId: id, userId, participantType: patientSender ? 'PATIENT' : 'CLINIC_STAFF', lastReadAt: new Date() } });
      await tx.clinicMessage.create({ data: { conversationId: id, senderId: userId, content: message, allowReply: conversation.repliesEnabled, attachments: attachment ? { create: { documentId: attachment.id } } : undefined } });
      await tx.conversation.update({ where: { id }, data: { updatedAt: new Date() } });
      const recipients = await tx.conversationParticipant.findMany({ where: { conversationId: id, userId: { not: userId } }, select: { userId: true } });
      if (recipients.length) await tx.notification.createMany({ data: recipients.map((recipient) => ({ userId: recipient.userId, title: 'New clinic message', body: 'You have a new clinic message.', type: NotificationType.CLINIC_MESSAGE, metadata: { href: `/messages/${id}`, conversationId: id } })) });
      await tx.auditLog.create({ data: { actorId: userId, action: AuditAction.MESSAGE_SENT, entity: 'Conversation', entityId: id } });
      });
      return this.getConversation(id, userId);
    } catch (error) {
      if (attachment) await this.documents.purgeUnlinked(attachment.id);
      throw error;
    }
  }

  async markConversationRead(id: string, userId: string, roles: string[]) {
    await this.assertConversationAccess(id, userId);
    await this.prisma.conversationParticipant.upsert({ where: { conversationId_userId: { conversationId: id, userId } }, update: { lastReadAt: new Date() }, create: { conversationId: id, userId, participantType: this.isClinicStaff(roles) ? 'CLINIC_STAFF' : 'PATIENT', lastReadAt: new Date() } });
    await this.prisma.auditLog.create({ data: { actorId: userId, action: AuditAction.CONVERSATION_READ, entity: 'Conversation', entityId: id } });
    return { read: true };
  }

  async setConversationStatus(id: string, status: ConversationStatus, actorId: string, roles: string[]) {
    if (!this.isClinicStaff(roles)) throw new ForbiddenException('Only clinic personnel can change conversation status.');
    await this.assertConversationAccess(id, actorId);
    const updated = await this.prisma.conversation.update({ where: { id }, data: { status, resolvedAt: status === ConversationStatus.RESOLVED ? new Date() : null } });
    await this.prisma.auditLog.create({ data: { actorId, action: status === ConversationStatus.RESOLVED ? AuditAction.CONVERSATION_RESOLVED : AuditAction.CONVERSATION_REOPENED, entity: 'Conversation', entityId: id } });
    return updated;
  }

  private async assertConversationAccess(id: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({ where: { id }, include: { participants: { select: { userId: true } } } });
    if (!conversation) throw new NotFoundException('Conversation not found.');
    if (!conversation.participants.some((participant) => participant.userId === userId)) throw new NotFoundException('Conversation not found.');
    return conversation;
  }

  private requireMessage(content: string) {
    const message = content.trim();
    if (!message) throw new BadRequestException('Message content is required.');
    return message;
  }

  private isClinicStaff(roles: string[]) {
    return roles.some((role) => ['CLINIC_NURSE', 'DOCTOR', 'CLINIC_STAFF'].includes(role));
  }

  private audit(actorId: string, action: AuditAction, entityId: string) {
    return this.prisma.auditLog.create({ data: { actorId, action, entity: 'Announcement', entityId } });
  }
}
