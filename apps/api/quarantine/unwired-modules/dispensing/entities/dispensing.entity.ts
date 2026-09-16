export class DispensingEntity {
  id: string;
  patientId: string;
  inventoryItemId: string;
  quantity: number;
  dispensedAt: string;
  dispensedBy?: string;
  notes?: string;
  createdAt: Date;
}
