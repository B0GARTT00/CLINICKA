import { Module } from '@nestjs/common';
import { ClinicVisitsController } from './clinic-visits.controller';
import { ClinicVisitsService } from './clinic-visits.service';

@Module({
  controllers: [ClinicVisitsController],
  providers: [ClinicVisitsService],
})
export class ClinicVisitsModule {}
