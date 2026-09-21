import { Injectable } from '@nestjs/common';
import { InventoryItemEntity } from './entities/inventory.entity';
import { CreateInventoryDto, UpdateInventoryDto } from './dto';

@Injectable()
export class InventoryService {
  private items: InventoryItemEntity[] = [];

  findAll(): InventoryItemEntity[] {
    return this.items;
  }

  findOne(id: string): InventoryItemEntity {
    const item = this.items.find((i) => i.id === id);
    if (!item) {
      throw new Error('Inventory item not found');
    }
    return item;
  }

  create(dto: CreateInventoryDto): InventoryItemEntity {
    const item = new InventoryItemEntity();
    item.id = crypto.randomUUID();
    item.itemName = dto.itemName;
    item.category = dto.category;
    item.quantity = dto.quantity;
    item.unit = dto.unit;
    item.reorderLevel = dto.reorderLevel;
    item.createdAt = new Date();
    item.updatedAt = new Date();
    this.items.push(item);
    return item;
  }

  update(id: string, dto: UpdateInventoryDto): InventoryItemEntity {
    const index = this.items.findIndex((i) => i.id === id);
    if (index === -1) {
      throw new Error('Inventory item not found');
    }
    this.items[index] = { ...this.items[index], ...dto, updatedAt: new Date() };
    return this.items[index];
  }

  remove(id: string): void {
    const index = this.items.findIndex((i) => i.id === id);
    if (index === -1) {
      throw new Error('Inventory item not found');
    }
    this.items.splice(index, 1);
  }
}
