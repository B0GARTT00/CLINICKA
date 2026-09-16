import { Module } from '@nestjs/common';
import { HealthRequirementsController } from './health-requirements.controller';
import { HealthRequirementsService } from './health-requirements.service';

@Module({
  controllers: [HealthRequirementsController],
  providers: [HealthRequirementsService],
})
export class HealthRequirementsModule {}
