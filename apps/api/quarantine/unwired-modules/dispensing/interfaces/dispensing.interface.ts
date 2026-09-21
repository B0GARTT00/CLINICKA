export interface Dispensing {
  id: string;
  patientId: string;
  inventoryItemId: string;
  quantity: number;
  dispensedAt: Date;
  dispensedBy?: string;
  notes?: string;
  createdAt: Date;
}
