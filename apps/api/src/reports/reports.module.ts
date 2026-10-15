import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ClinicReportsService } from './clinic-reports.service';
import { ReportsService } from './reports.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [ReportsController],
  providers: [ReportsService, ClinicReportsService],
})
export class ReportsModule {}
