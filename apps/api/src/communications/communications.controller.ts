import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiForbiddenResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { ACCESS_TOKEN_SCHEME } from '../auth/constants/api-security';
import { Permission } from '../auth/constants/permissions';
import { UserRole } from '../auth/constants/roles';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CommunicationsService } from './communications.service';
import { CreateAnnouncementDto } from './dto';


/** Announcements and notifications are readable by every authenticated role. */
const ALL_ROLES = [
  UserRole.ADMINISTRATOR,
  UserRole.CLINIC_NURSE,
  UserRole.CLINIC_STAFF,
  UserRole.DOCTOR,
  UserRole.STUDENT,
  UserRole.FACULTY_STAFF,
] as const;

/** Publishing announcements is limited to staff responsible for clinic comms. */
const PUBLISHER_ROLES = [UserRole.ADMINISTRATOR, UserRole.CLINIC_NURSE] as const;

@ApiTags('communications')
@ApiBearerAuth(ACCESS_TOKEN_SCHEME)
@Controller()
export class CommunicationsController {
  constructor(private readonly communications: CommunicationsService) {}

  @Get('announcements')
  @Roles(...ALL_ROLES)
  @Permissions(Permission.ANNOUNCEMENTS_READ)
  @ApiOperation({ summary: 'List published announcements', description: 'Requires announcements.read permission.' })
  @ApiResponse({ status: 200, description: 'Announcements retrieved.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  listAnnouncements() {
    return this.communications.listAnnouncements();
  }

  @Post('announcements')
  @Roles(...PUBLISHER_ROLES)
  @Permissions(Permission.ANNOUNCEMENTS_MANAGE)
  @ApiOperation({ summary: 'Draft an announcement', description: 'Requires announcements.manage permission.' })
  @ApiResponse({ status: 201, description: 'Announcement drafted.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  createAnnouncement(@Body() dto: CreateAnnouncementDto, @Req() request: AuthenticatedRequest) {
    return this.communications.createAnnouncement(dto, request.user.id);
  }

  @Post('announcements/:id/publish')
  @Roles(...PUBLISHER_ROLES)
  @Permissions(Permission.ANNOUNCEMENTS_MANAGE)
  @ApiOperation({ summary: 'Publish a drafted announcement', description: 'Requires announcements.manage permission.' })
  @ApiParam({ name: 'id', description: 'Announcement ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 201, description: 'Announcement published.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  publishAnnouncement(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.communications.publishAnnouncement(id, request.user.id);
  }

  @Get('notifications')
  @Roles(...ALL_ROLES)
  @Permissions(Permission.NOTIFICATIONS_READ)
  @ApiOperation({
    summary: 'List the caller\'s notifications',
    description: 'Returns only notifications addressed to the authenticated user. Requires notifications.read permission.',
  })
  @ApiResponse({ status: 200, description: 'Notifications retrieved.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  listNotifications(@Req() request: AuthenticatedRequest) {
    return this.communications.listNotifications(request.user.id);
  }

  @Post('notifications/read-all')
  @Roles(...ALL_ROLES)
  @Permissions(Permission.NOTIFICATIONS_READ)
  @ApiOperation({ summary: 'Mark all of the caller\'s notifications as read' })
  markAllNotificationsRead(@Req() request: AuthenticatedRequest) {
    return this.communications.markAllNotificationsRead(request.user.id);
  }

  @Post('notifications/:id/read')
  @Roles(...ALL_ROLES)
  @Permissions(Permission.NOTIFICATIONS_READ)
  @ApiOperation({
    summary: 'Mark one of the current user\'s notifications as read',
    description:
      'Marks a notification as READ only when it belongs to the authenticated user. Other users receive a not-found response.',
  })
  @ApiParam({ name: 'id', description: 'Notification ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'The owner notification was marked as READ.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  @ApiNotFoundResponse({ description: 'Notification not found for the authenticated user.' })
  markNotificationRead(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.communications.markNotificationRead(id, request.user.id);
  }
}
