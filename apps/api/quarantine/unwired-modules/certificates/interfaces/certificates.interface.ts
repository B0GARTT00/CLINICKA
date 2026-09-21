export interface Certificate {
  id: string;
  patientId: string;
  certificateType: string;
  purpose?: string;
  status: 'PENDING' | 'ISSUED' | 'VERIFIED' | 'EXPIRED';
  issuedAt?: Date;
  validUntil?: Date;
  issuedBy?: string;
  verificationCode?: string;
  createdAt: Date;
  updatedAt: Date;
}
