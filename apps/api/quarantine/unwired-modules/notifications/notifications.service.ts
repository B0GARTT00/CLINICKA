import { Injectable } from '@nestjs/common';
import { NotificationEntity } from './entities/notifications.entity';

@Injectable()
export class NotificationsService {
  private notifications: NotificationEntity[] = [];

  findAll(): NotificationEntity[] {
    return this.notifications;
  }

  markAsRead(id: string): NotificationEntity {
    const index = this.notifications.findIndex((n) => n.id === id);
    if (index === -1) {
      throw new Error('Notification not found');
    }
    this.notifications[index] = { ...this.notifications[index], isRead: true, readAt: new Date() };
    return this.notifications[index];
  }

  markAllAsRead(): { message: string } {
    this.notifications = this.notifications.map((n) => ({ ...n, isRead: true, readAt: new Date() }));
    return { message: 'All notifications marked as read.' };
  }
}
