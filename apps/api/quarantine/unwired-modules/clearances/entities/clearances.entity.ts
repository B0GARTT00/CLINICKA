export class ClearanceEntity {
  id: string;
  patientId: string;
  clearanceType: string;
  reason?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedAt?: string;
  rejectedAt?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
