import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { CreateScreeningDto, CreateVaccinationDto } from './dto';
import { ScreeningsService } from './screenings.service';

type AuthenticatedRequest = Request & { user: { id: string } };

@ApiTags('vaccination-history-screenings')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('health-records')
export class ScreeningsController {
  constructor(private readonly screenings: ScreeningsService) {}

  @Get('vaccinations')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'CLINIC_STAFF', 'DOCTOR')
  @ApiOperation({ summary: 'List externally received vaccination history' })
  listVaccinations() {
    return this.screenings.listVaccinations();
  }

  @Post('vaccinations')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'CLINIC_STAFF')
  @ApiOperation({ summary: 'Document externally received vaccination history', description: 'Documentation-only; this endpoint does not administer vaccines, manage inventory, or schedule doses.' })
  createVaccination(@Body() dto: CreateVaccinationDto, @Req() request: AuthenticatedRequest) {
    return this.screenings.createVaccination(dto, request.user.id);
  }

  @Get('screenings')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'CLINIC_STAFF', 'DOCTOR')
  listScreenings() {
    return this.screenings.listScreenings();
  }

  @Post('screenings')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'CLINIC_STAFF')
  createScreening(@Body() dto: CreateScreeningDto, @Req() request: AuthenticatedRequest) {
    return this.screenings.createScreening(dto, request.user.id);
  }
}
