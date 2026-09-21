export interface Consultation {
  id: string;
  patientId: string;
  clinicVisitId?: string;
  symptoms?: string;
  findings?: string;
  diagnosis?: string;
  treatment?: string;
  notes?: string;
  consultedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
