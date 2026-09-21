import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, NotificationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAnnouncementDto } from './dto';

@Injectable()
export class CommunicationsService {
  constructor(private readonly prisma: PrismaService) {}

  listAnnouncements() {
    return this.prisma.announcement.findMany({ where: { OR: [{ publishedAt: { not: null } }, { createdById: { not: null } }] }, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  async createAnnouncement(dto: CreateAnnouncementDto, actorId: string) {
    const announcement = await this.prisma.announcement.create({ data: { ...dto, expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined, createdById: actorId } });
    await this.audit(actorId, AuditAction.ANNOUNCEMENT_CREATED, announcement.id);
    return announcement;
  }

  async publishAnnouncement(id: string, actorId: string) {
    const announcement = await this.prisma.announcement.findUnique({ where: { id } });
    if (!announcement) throw new NotFoundException('Announcement not found.');
    const published = await this.prisma.announcement.update({ where: { id }, data: { publishedAt: new Date() } });
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

  private audit(actorId: string, action: AuditAction, entityId: string) {
    return this.prisma.auditLog.create({ data: { actorId, action, entity: 'Announcement', entityId } });
  }
}
