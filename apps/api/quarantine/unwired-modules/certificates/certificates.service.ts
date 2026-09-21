import { Injectable } from '@nestjs/common';
import { CertificateEntity } from './entities/certificates.entity';
import { CreateCertificateDto, UpdateCertificateDto } from './dto';

@Injectable()
export class CertificatesService {
  private certificates: CertificateEntity[] = [];

  findAll(): CertificateEntity[] {
    return this.certificates;
  }

  findOne(id: string): CertificateEntity {
    const certificate = this.certificates.find((c) => c.id === id);
    if (!certificate) {
      throw new Error('Certificate not found');
    }
    return certificate;
  }

  create(dto: CreateCertificateDto): CertificateEntity {
    const certificate = new CertificateEntity();
    certificate.id = crypto.randomUUID();
    certificate.patientId = dto.patientId;
    certificate.certificateType = dto.certificateType;
    certificate.purpose = dto.purpose;
    certificate.status = dto.status || 'PENDING';
    certificate.issuedAt = dto.issuedAt;
    certificate.validUntil = dto.validUntil;
    certificate.issuedBy = dto.issuedBy;
    certificate.verificationCode = dto.verificationCode;
    certificate.createdAt = new Date();
    certificate.updatedAt = new Date();
    this.certificates.push(certificate);
    return certificate;
  }

  update(id: string, dto: UpdateCertificateDto): CertificateEntity {
    const index = this.certificates.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new Error('Certificate not found');
    }
    this.certificates[index] = { ...this.certificates[index], ...dto, updatedAt: new Date() };
    return this.certificates[index];
  }
}
