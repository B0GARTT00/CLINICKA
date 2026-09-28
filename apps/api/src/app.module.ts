import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { join } from 'node:path';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { AuthorizationGuard } from './auth/guards/authorization.guard';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
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
import { validateEnvironment } from './config/env.validation';
import { DocumentsModule } from './documents/documents.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      // npm workspaces launch the API with apps/api as the working directory,
      // while the repository's documented .env file lives at the workspace
      // root. Resolve from this module so loading is stable in source, dist,
      // watch mode, and direct launches.
      envFilePath: join(__dirname, '..', '..', '..', '.env'),
      // Aborts the boot with an EnvironmentValidationError when a secret is
      // missing, weak, or shared between the access and refresh token classes.
      validate: validateEnvironment,
      // Do not let a stray .env file in the production image change the answer.
      ignoreEnvFile: process.env.NODE_ENV === 'production',
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
      },
    ]),
    PrismaModule,
    PassportModule,
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
    DocumentsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Authentication is global and fails closed: a route is reachable without a
    // token only when it is explicitly marked `@Public()`. Authorization then
    // runs as a single gate over `@Roles(...)` and `@Permissions(...)`.
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AuthorizationGuard,
    },
  ],
})
export class AppModule {}
