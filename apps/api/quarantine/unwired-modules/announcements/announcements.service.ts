import { Injectable } from '@nestjs/common';
import { AnnouncementEntity } from './entities/announcements.entity';
import { CreateAnnouncementDto, UpdateAnnouncementDto } from './dto';

@Injectable()
export class AnnouncementsService {
  private announcements: AnnouncementEntity[] = [];

  findAll(): AnnouncementEntity[] {
    return this.announcements;
  }

  findOne(id: string): AnnouncementEntity {
    const announcement = this.announcements.find((a) => a.id === id);
    if (!announcement) {
      throw new Error('Announcement not found');
    }
    return announcement;
  }

  create(dto: CreateAnnouncementDto): AnnouncementEntity {
    const announcement = new AnnouncementEntity();
    announcement.id = crypto.randomUUID();
    announcement.title = dto.title;
    announcement.content = dto.content;
    announcement.status = dto.status || 'DRAFT';
    announcement.createdAt = new Date();
    announcement.updatedAt = new Date();
    this.announcements.push(announcement);
    return announcement;
  }

  update(id: string, dto: UpdateAnnouncementDto): AnnouncementEntity {
    const index = this.announcements.findIndex((a) => a.id === id);
    if (index === -1) {
      throw new Error('Announcement not found');
    }
    this.announcements[index] = { ...this.announcements[index], ...dto, updatedAt: new Date() };
    return this.announcements[index];
  }

  remove(id: string): void {
    const index = this.announcements.findIndex((a) => a.id === id);
    if (index === -1) {
      throw new Error('Announcement not found');
    }
    this.announcements.splice(index, 1);
  }
}
