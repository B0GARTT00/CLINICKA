export class CertificateEntity {
  id: string;
  patientId: string;
  certificateType: string;
  purpose?: string;
  status: 'PENDING' | 'ISSUED' | 'VERIFIED' | 'EXPIRED';
  issuedAt?: string;
  validUntil?: string;
  issuedBy?: string;
  verificationCode?: string;
  createdAt: Date;
  updatedAt: Date;
}
