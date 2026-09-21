import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { AcademicModule } from './academic/academic.module';
import { AuditModule } from './audit/audit.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { ClearancesModule } from './clearances/clearances.module';
import { CommunicationsModule } from './communications/communications.module';
import { CertificatesModule } from './certificates/certificates.module';
import { EmergenciesModule } from './emergencies/emergencies.module';
import { DispensingModule } from './dispensing/dispensing.module';
import { HealthModule } from './health/health.module';
import { InventoryModule } from './inventory/inventory.module';
import { PatientsModule } from './modules/patients/patients.module';
import { RequirementsModule } from './requirements/requirements.module';
import { ReportsModule } from './reports/reports.module';
import { ScreeningsModule } from './screenings/screenings.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './modules/users/users.module';
import { VisitsModule } from './visits/visits.module';
import { EvidenceModule } from './evidence/evidence.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
      },
    ]),
    PrismaModule,
    HealthModule,
    InventoryModule,
    AuthModule,
    AcademicModule,
    AuditModule,
    AppointmentsModule,
    ClearancesModule,
    CommunicationsModule,
    CertificatesModule,
    EmergenciesModule,
    DispensingModule,
    UsersModule,
    PatientsModule,
    RequirementsModule,
    ReportsModule,
    ScreeningsModule,
    VisitsModule,
    EvidenceModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
