export class EmergencyEntity {
  id: string;
  patientId: string;
  priorityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'TREATED' | 'TRANSFERRED' | 'DISCHARGED';
  chiefComplaint?: string;
  treatment?: string;
  attendedAt?: string;
  dischargedAt?: string;
  createdAt: Date;
  updatedAt: Date;
}
