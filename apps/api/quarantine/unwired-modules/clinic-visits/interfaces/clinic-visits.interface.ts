export interface ClinicVisit {
  id: string;
  patientId: string;
  visitType: string;
  status: string;
  reason?: string;
  notes?: string;
  visitedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
