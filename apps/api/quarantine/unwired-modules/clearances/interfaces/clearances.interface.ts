export interface Clearance {
  id: string;
  patientId: string;
  clearanceType: string;
  reason?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedAt?: Date;
  rejectedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
