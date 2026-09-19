import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AppointmentStatus } from '@prisma/client';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { CreateAppointmentDto, UpdateAppointmentStatusDto } from './dto';
import { AppointmentsService } from './appointments.service';

type AuthenticatedRequest = Request & { user: { id: string } };

class RescheduleDto {
  scheduledAt!: string;
  durationMins?: number;
  reason?: string;
}

class CancelDto {
  reason?: string;
}

@ApiTags('appointments')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Get()
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'CLINIC_STAFF', 'DOCTOR')
  upcoming() {
    return this.appointments.upcoming();
  }

  @Post()
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'CLINIC_STAFF')
  create(@Body() dto: CreateAppointmentDto, @Req() request: AuthenticatedRequest) {
    return this.appointments.create(dto, request.user.id);
  }

  @Patch(':id/status')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'CLINIC_STAFF')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentStatusDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.appointments.updateStatus(id, dto.status as AppointmentStatus, request.user.id);
  }

  @Post(':id/check-in')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'CLINIC_STAFF', 'DOCTOR')
  checkIn(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.appointments.checkIn(id, request.user.id);
  }

  @Post(':id/reschedule')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'CLINIC_STAFF')
  reschedule(
    @Param('id') id: string,
    @Body() dto: RescheduleDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.appointments.reschedule(id, dto, request.user.id);
  }

  @Post(':id/cancel')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'CLINIC_STAFF')
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.appointments.cancel(id, dto.reason, request.user.id);
  }

  @Post(':id/no-show')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'CLINIC_STAFF')
  markNoShow(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.appointments.markNoShow(id, request.user.id);
  }
}