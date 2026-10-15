import { ForbiddenException, ConflictException, NotFoundException } from '@nestjs/common';
import { NotificationStatus } from '@prisma/client';
import { CommunicationsService } from './communications.service';

describe('CommunicationsService notification ownership', () => {
  const prisma = {
    announcement: {
      findMany: jest.fn(),
    },
    notification: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    conversation: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };
  const service = new CommunicationsService(prisma as never, {} as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows only published announcements to ordinary readers', async () => {
    prisma.announcement.findMany.mockResolvedValue([]);

    await service.listAnnouncements();

    expect(prisma.announcement.findMany).toHaveBeenCalledWith({
      where: { publishedAt: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  });

  it('includes drafts in the publisher history', async () => {
    prisma.announcement.findMany.mockResolvedValue([]);

    await service.listAnnouncements(true);

    expect(prisma.announcement.findMany).toHaveBeenCalledWith({
      where: undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  });

  it('marks a notification as read for its owner', async () => {
    const notification = { id: 'notification-1', userId: 'owner-1', status: NotificationStatus.UNREAD };
    prisma.notification.findFirst.mockResolvedValue(notification);
    prisma.notification.update.mockResolvedValue({ ...notification, status: NotificationStatus.READ });

    await expect(service.markNotificationRead(notification.id, notification.userId)).resolves.toMatchObject({
      id: notification.id,
      status: NotificationStatus.READ,
    });
    expect(prisma.notification.findFirst).toHaveBeenCalledWith({
      where: { id: notification.id, userId: notification.userId },
    });
    expect(prisma.notification.update).toHaveBeenCalledWith({
      where: { id: notification.id },
      data: { status: NotificationStatus.READ },
    });
  });

  it('does not mark another user\'s notification as read', async () => {
    prisma.notification.findFirst.mockResolvedValue(null);

    await expect(service.markNotificationRead('notification-1', 'different-user')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.notification.findFirst).toHaveBeenCalledWith({
      where: { id: 'notification-1', userId: 'different-user' },
    });
    expect(prisma.notification.update).not.toHaveBeenCalled();
  });

  it('limits patient inboxes to conversations where the caller is a participant', async () => {
    prisma.conversation.findMany.mockResolvedValue([]);
    await service.listConversations('patient-user');
    expect(prisma.conversation.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { participants: { some: { userId: 'patient-user', archivedAt: null } } },
    }));
  });

  it('does not expose another patient\'s conversation by id', async () => {
    prisma.conversation.findUnique.mockResolvedValue({ id: 'conversation-1', participants: [{ userId: 'owner-user' }] });
    await expect(service.getConversation('conversation-1', 'different-user')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.conversation.findUnique).toHaveBeenCalledTimes(1);
  });
});


describe('Secure conversation lifecycle', () => {
  const prisma = {
    conversation: { findUnique: jest.fn(), findMany: jest.fn() },
    conversationParticipant: { upsert: jest.fn() },
    notification: { updateMany: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const service = new CommunicationsService(prisma as never, {} as never);
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.conversation.findUnique.mockResolvedValue({
      id: 'thread', patientId: 'patient', status: 'OPEN', repliesEnabled: true,
      participants: [{ userId: 'patient-user' }],
    });
  });
  it('clears only the caller notifications for the conversation being read', async () => {
    await service.markConversationRead('thread', 'patient-user', ['STUDENT']);
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: 'patient-user', type: 'CLINIC_MESSAGE', status: 'UNREAD', metadata: { path: '$.conversationId', equals: 'thread' } },
      data: { status: 'READ' },
    });
  });
  it('does not change read state for a nonparticipant', async () => {
    await expect(service.markConversationRead('thread', 'outsider', ['DOCTOR'])).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.notification.updateMany).not.toHaveBeenCalled();
    expect(prisma.conversationParticipant.upsert).not.toHaveBeenCalled();
  });
  it('rejects patient replies when replies are disabled', async () => {
    prisma.conversation.findUnique.mockResolvedValue({ status: 'OPEN', repliesEnabled: false, participants: [{ userId: 'patient-user' }] });
    await expect(service.sendMessage('thread', 'Hello', undefined, 'patient-user', ['STUDENT'])).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('rejects new messages in resolved conversations', async () => {
    prisma.conversation.findUnique.mockResolvedValue({ status: 'RESOLVED', participants: [{ userId: 'patient-user' }] });
    await expect(service.sendMessage('thread', 'Hello', undefined, 'patient-user', ['STUDENT'])).rejects.toBeInstanceOf(ConflictException);
  });
  it('omits deleted messages from inbox previews', async () => {
    await service.listConversations('patient-user');
    expect(prisma.conversation.findMany).toHaveBeenCalledWith(expect.objectContaining({
      include: expect.objectContaining({ messages: expect.objectContaining({ where: { deletedAt: null } }) }),
    }));
  });
});
