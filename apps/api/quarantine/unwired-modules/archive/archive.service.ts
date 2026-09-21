import { Injectable } from '@nestjs/common';
import { ArchiveEntity } from './entities/archive.entity';
import { CreateArchiveDto, RestoreArchiveDto } from './dto';

@Injectable()
export class ArchiveService {
  private archives: ArchiveEntity[] = [];

  findAll(): ArchiveEntity[] {
    return this.archives;
  }

  findOne(id: string): ArchiveEntity {
    const archive = this.archives.find((a) => a.id === id);
    if (!archive) {
      throw new Error('Archive record not found');
    }
    return archive;
  }

  create(dto: CreateArchiveDto): ArchiveEntity {
    const archive = new ArchiveEntity();
    archive.id = crypto.randomUUID();
    archive.recordType = dto.recordType;
    archive.recordId = dto.recordId;
    archive.data = dto.data;
    archive.archivedBy = dto.archivedBy;
    archive.archivedAt = new Date();
    archive.reason = dto.reason;
    archive.createdAt = new Date();
    this.archives.push(archive);
    return archive;
  }

  restore(id: string, dto: RestoreArchiveDto): ArchiveEntity {
    const index = this.archives.findIndex((a) => a.id === id);
    if (index === -1) {
      throw new Error('Archive record not found');
    }
    this.archives[index] = { ...this.archives[index], restoredAt: new Date(), reason: dto.restoredBy };
    return this.archives[index];
  }
}
