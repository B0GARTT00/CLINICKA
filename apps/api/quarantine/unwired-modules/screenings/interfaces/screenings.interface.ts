export interface Screening {
  id: string;
  patientId: string;
  screeningType: string;
  result?: string;
  status: 'PENDING' | 'COMPLETED' | 'FOLLOW_UP_REQUIRED';
  screenedAt: Date;
  screenedBy?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
