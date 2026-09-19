import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { CapacityChecker } from './capacity/capacity-checker';
import { AppointmentStateMachine } from './state-machine/appointment-state-machine';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, CapacityChecker, AppointmentStateMachine],
})
export class AppointmentsModule {}