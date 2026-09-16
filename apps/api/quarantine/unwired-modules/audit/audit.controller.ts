import {
  Controller,
  Get,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permission } from '../../auth/constants/permissions';
import { AuditService } from './audit.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { AuditAction } from '@prisma/client';

@ApiTags('audit-logs')
@ApiBearerAuth('access-token')
@Controller('audit-logs')
@UseGuards(AuthGuard('jwt'), RolesGuard, PermissionsGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles('ADMINISTRATOR')
  @Permissions(Permission.AUDIT_READ)
  @ApiOperation({
    summary: 'Get all audit logs',
    description: 'Retrieves a paginated list of audit logs with optional filtering. Admin-only endpoint. Requires audit.read permission.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'userId', required: false, type: String, example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiQuery({
    name: 'action',
    required: false,
    type: String,
    enum: [
      'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'LOGIN_FAILED',
      'APPROVE', 'REJECT', 'DISPENSE', 'EXPORT', 'ARCHIVE', 'RESTORE',
      'LIST_USERS', 'VIEW_USER', 'CREATE_USER', 'UPDATE_USER', 'DELETE_USER',
      'ASSIGN_ROLE', 'ROLE_CHANGE', 'STATUS_CHANGE', 'PASSWORD_CHANGE',
      'PASSWORD_RESET', 'OTHER',
    ],
    example: 'CREATE_USER',
  })
  @ApiQuery({ name: 'entityType', required: false, type: String, example: 'User' })
  @ApiQuery({ name: 'entityId', required: false, type: String, example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiQuery({ name: 'startDate', required: false, type: String, example: '2024-01-01' })
  @ApiQuery({ name: 'endDate', required: false, type: String, example: '2024-12-31' })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  findAll(@Query() query: AuditLogQueryDto) {
    const page = query.page ? Number(query.page) : undefined;
    const limit = query.limit ? Number(query.limit) : undefined;

    return this.auditService.findAll({
      page,
      limit,
      userId: query.userId,
      action: query.action as AuditAction | undefined,
      entityType: query.entityType,
      entityId: query.entityId,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    });
  }

  @Get(':id')
  @Roles('ADMINISTRATOR')
  @Permissions(Permission.AUDIT_READ)
  @ApiOperation({
    summary: 'Get audit log by ID',
    description: 'Retrieves a single audit log entry by its unique ID. Admin-only endpoint. Requires audit.read permission.',
  })
  @ApiParam({ name: 'id', description: 'Audit log ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Audit log retrieved successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  @ApiNotFoundResponse({ description: 'Audit log not found.' })
  findOne(@Param('id') id: string) {
    return this.auditService.findOne(id);
  }
}
