export interface Emergency {
  id: string;
  patientId: string;
  priorityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'TREATED' | 'TRANSFERRED' | 'DISCHARGED';
  chiefComplaint?: string;
  treatment?: string;
  attendedAt?: Date;
  dischargedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
