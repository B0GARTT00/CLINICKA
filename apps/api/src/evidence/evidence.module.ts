import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { EvidenceController } from './evidence.controller';
import { EvidenceService } from './evidence.service';
import { EvidenceSubmissionStateMachine } from './state-machine/evidence-state-machine';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [PrismaModule, AuditModule, DocumentsModule],
  controllers: [EvidenceController],
  providers: [EvidenceService, EvidenceSubmissionStateMachine],
})
export class EvidenceModule {}
