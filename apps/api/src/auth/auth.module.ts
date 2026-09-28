import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { JwtSecrets } from './jwt-secrets';
import { PatientProvisioningService } from '../patients/patient-provisioning.service';

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtSecrets, PatientProvisioningService],
  exports: [AuthService, JwtSecrets],
})
export class AuthModule {}
