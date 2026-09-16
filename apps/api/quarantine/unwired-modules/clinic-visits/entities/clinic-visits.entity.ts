export class ClinicVisitEntity {
  id: string;
  patientId: string;
  visitType: string;
  status: string;
  reason?: string;
  notes?: string;
  visitedAt: string;
  createdAt: Date;
  updatedAt: Date;
}
