export class InventoryItemEntity {
  id: string;
  itemName: string;
  category: string;
  quantity: number;
  unit: string;
  reorderLevel: number;
  lastStockIn?: Date;
  lastStockOut?: Date;
  createdAt: Date;
  updatedAt: Date;
}
