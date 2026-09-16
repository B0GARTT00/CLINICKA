export class AnnouncementEntity {
  id: string;
  title: string;
  content: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt?: Date;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}
