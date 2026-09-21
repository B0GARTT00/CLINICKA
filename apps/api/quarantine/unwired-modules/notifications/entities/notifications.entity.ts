export class NotificationEntity {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}
