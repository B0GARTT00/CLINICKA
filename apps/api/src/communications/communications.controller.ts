import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { CommunicationsService } from './communications.service';
import { CreateAnnouncementDto } from './dto';

type AuthenticatedRequest = Request & { user: { id: string } };

@ApiTags('communications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller()
export class CommunicationsController {
  constructor(private readonly communications: CommunicationsService) {}

  @Get('announcements')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'CLINIC_STAFF', 'DOCTOR', 'STUDENT', 'FACULTY_STAFF')
  listAnnouncements() {
    return this.communications.listAnnouncements();
  }

  @Post('announcements')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE')
  createAnnouncement(@Body() dto: CreateAnnouncementDto, @Req() request: AuthenticatedRequest) {
    return this.communications.createAnnouncement(dto, request.user.id);
  }

  @Post('announcements/:id/publish')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE')
  publishAnnouncement(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.communications.publishAnnouncement(id, request.user.id);
  }

  @Get('notifications')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'CLINIC_STAFF', 'DOCTOR', 'STUDENT', 'FACULTY_STAFF')
  listNotifications(@Req() request: AuthenticatedRequest) {
    return this.communications.listNotifications(request.user.id);
  }

  @Post('notifications/:id/read')
  @ApiOperation({
    summary: 'Mark one of the current user\'s notifications as read',
    description:
      'Marks a notification as READ only when it belongs to the authenticated user. Other users receive a not-found response.',
  })
  @ApiParam({ name: 'id', description: 'Notification ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'The owner notification was marked as READ.' })
  @ApiNotFoundResponse({ description: 'Notification not found for the authenticated user.' })
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'CLINIC_STAFF', 'DOCTOR', 'STUDENT', 'FACULTY_STAFF')
  markNotificationRead(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.communications.markNotificationRead(id, request.user.id);
  }
}
