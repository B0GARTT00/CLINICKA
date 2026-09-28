import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiForbiddenResponse } from '@nestjs/swagger';
import { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { ACCESS_TOKEN_SCHEME } from '../auth/constants/api-security';
import { Permission } from '../auth/constants/permissions';
import { UserRole } from '../auth/constants/roles';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CancelAppointmentDto,
  CreateAppointmentDto,
  RescheduleAppointmentDto,
  UpdateAppointmentStatusDto,
} from './dto';
import { AppointmentsService } from './appointments.service';


const SCHEDULING_ROLES = [UserRole.ADMINISTRATOR, UserRole.CLINIC_NURSE, UserRole.CLINIC_STAFF] as const;

@ApiTags('appointments')
@ApiBearerAuth(ACCESS_TOKEN_SCHEME)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Get()
  @Roles(UserRole.ADMINISTRATOR, UserRole.CLINIC_NURSE, UserRole.CLINIC_STAFF, UserRole.DOCTOR)
  @Permissions(Permission.APPOINTMENTS_READ)
  @ApiOperation({ summary: 'List upcoming appointments', description: 'Requires appointments.read permission.' })
  @ApiResponse({ status: 200, description: 'Upcoming appointments retrieved.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  upcoming() {
    return this.appointments.upcoming();
  }

  @Post()
  @Roles(...SCHEDULING_ROLES)
  @Permissions(Permission.APPOINTMENTS_MANAGE)
  @ApiOperation({ summary: 'Book an appointment', description: 'Requires appointments.manage permission.' })
  @ApiResponse({ status: 201, description: 'Appointment created.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  create(@Body() dto: CreateAppointmentDto, @Req() request: AuthenticatedRequest) {
    return this.appointments.create(dto, request.user.id);
  }

  @Patch(':id/status')
  @Roles(...SCHEDULING_ROLES)
  @Permissions(Permission.APPOINTMENTS_MANAGE)
  @ApiOperation({ summary: 'Change an appointment status', description: 'Requires appointments.manage permission.' })
  @ApiResponse({ status: 200, description: 'Appointment status updated.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentStatusDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.appointments.updateStatus(id, dto.status as AppointmentStatus, request.user.id);
  }

  @Post(':id/check-in')
  @Roles(UserRole.ADMINISTRATOR, UserRole.CLINIC_NURSE, UserRole.CLINIC_STAFF, UserRole.DOCTOR)
  @Permissions(Permission.APPOINTMENTS_CHECK_IN)
  @ApiOperation({
    summary: 'Check a patient in',
    description: 'Records arrival for the day of the appointment. Requires appointments.check_in permission.',
  })
  @ApiResponse({ status: 201, description: 'Patient checked in.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  checkIn(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.appointments.checkIn(id, request.user.id);
  }

  @Post(':id/reschedule')
  @Roles(...SCHEDULING_ROLES)
  @Permissions(Permission.APPOINTMENTS_MANAGE)
  @ApiOperation({ summary: 'Reschedule an appointment', description: 'Requires appointments.manage permission.' })
  @ApiResponse({ status: 201, description: 'Appointment rescheduled.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  reschedule(
    @Param('id') id: string,
    @Body() dto: RescheduleAppointmentDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.appointments.reschedule(id, dto, request.user.id);
  }

  @Post(':id/cancel')
  @Roles(...SCHEDULING_ROLES)
  @Permissions(Permission.APPOINTMENTS_MANAGE)
  @ApiOperation({ summary: 'Cancel an appointment', description: 'Requires appointments.manage permission.' })
  @ApiResponse({ status: 201, description: 'Appointment cancelled.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelAppointmentDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.appointments.cancel(id, dto.reason, request.user.id);
  }

  @Post(':id/no-show')
  @Roles(...SCHEDULING_ROLES)
  @Permissions(Permission.APPOINTMENTS_MANAGE)
  @ApiOperation({ summary: 'Mark an appointment as a no-show', description: 'Requires appointments.manage permission.' })
  @ApiResponse({ status: 201, description: 'Appointment marked as a no-show.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  markNoShow(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.appointments.markNoShow(id, request.user.id);
  }
}
