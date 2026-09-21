export class VaccinationEntity {
  id: string;
  patientId: string;
  vaccineName: string;
  doseNumber: number;
  totalDoses: number;
  administeredAt: string;
  nextDoseAt?: string;
  administeredBy?: string;
  createdAt: Date;
  updatedAt: Date;
}
