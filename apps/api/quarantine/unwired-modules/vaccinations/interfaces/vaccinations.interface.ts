export interface Vaccination {
  id: string;
  patientId: string;
  vaccineName: string;
  doseNumber: number;
  totalDoses: number;
  administeredAt: Date;
  nextDoseAt?: Date;
  administeredBy?: string;
  createdAt: Date;
  updatedAt: Date;
}
