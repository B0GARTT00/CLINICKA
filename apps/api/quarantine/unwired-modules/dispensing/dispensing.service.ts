import { Injectable } from '@nestjs/common';
import { DispensingEntity } from './entities/dispensing.entity';
import { CreateDispensingDto } from './dto';

@Injectable()
export class DispensingService {
  private dispensings: DispensingEntity[] = [];

  findAll(): DispensingEntity[] {
    return this.dispensings;
  }

  findOne(id: string): DispensingEntity {
    const dispensing = this.dispensings.find((d) => d.id === id);
    if (!dispensing) {
      throw new Error('Dispensing record not found');
    }
    return dispensing;
  }

  create(dto: CreateDispensingDto): DispensingEntity {
    const dispensing = new DispensingEntity();
    dispensing.id = crypto.randomUUID();
    dispensing.patientId = dto.patientId;
    dispensing.inventoryItemId = dto.inventoryItemId;
    dispensing.quantity = dto.quantity;
    dispensing.dispensedAt = dto.dispensedAt;
    dispensing.dispensedBy = dto.dispensedBy;
    dispensing.notes = dto.notes;
    dispensing.createdAt = new Date();
    this.dispensings.push(dispensing);
    return dispensing;
  }
}
