import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { ClearancesController } from './clearances.controller';
import { ClearancesService } from './clearances.service';
import { DeterministicEligibilityEngine } from './eligibility/eligibility-engine';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [ClearancesController],
  providers: [ClearancesService, DeterministicEligibilityEngine],
})
export class ClearancesModule {}