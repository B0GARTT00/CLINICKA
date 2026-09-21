import { Module } from '@nestjs/common';
import { VisitsController } from './visits.controller';
import { VisitsService } from './visits.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { VisitStateMachine } from './state-machine/visit-state-machine';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [VisitsController],
  providers: [VisitsService, VisitStateMachine],
})
export class VisitsModule {}