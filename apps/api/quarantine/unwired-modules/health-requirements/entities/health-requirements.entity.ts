export class HealthRequirementEntity {
  id: string;
  patientId: string;
  requirementType: string;
  description?: string;
  status: 'PENDING' | 'SUBMITTED' | 'VERIFIED' | 'MISSING';
  submittedAt?: string;
  verifiedAt?: string;
  createdAt: Date;
  updatedAt: Date;
}
