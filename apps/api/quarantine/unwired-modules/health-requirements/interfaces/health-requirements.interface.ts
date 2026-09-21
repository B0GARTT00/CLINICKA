export interface HealthRequirement {
  id: string;
  patientId: string;
  requirementType: string;
  description?: string;
  status: 'PENDING' | 'SUBMITTED' | 'VERIFIED' | 'MISSING';
  submittedAt?: Date;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
