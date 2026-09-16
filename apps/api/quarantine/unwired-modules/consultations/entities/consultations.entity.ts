export class ConsultationEntity {
  id: string;
  patientId: string;
  clinicVisitId?: string;
  symptoms?: string;
  findings?: string;
  diagnosis?: string;
  treatment?: string;
  notes?: string;
  consultedAt: string;
  createdAt: Date;
  updatedAt: Date;
}
