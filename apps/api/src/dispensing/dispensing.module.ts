import { Module } from '@nestjs/common';
import { DispensingController } from './dispensing.controller';
import { DispensingService } from './dispensing.service';
import { AuditModule } from '../audit/audit.module';
import { DispensingValidator } from './validation/dispensing-validator';
import { DispensingDiscrepancyReporter } from './monitoring/discrepancy-reporter';

@Module({
  imports: [AuditModule],
  controllers: [DispensingController],
  providers: [DispensingService, DispensingValidator, DispensingDiscrepancyReporter],
})
export class DispensingModule {}
