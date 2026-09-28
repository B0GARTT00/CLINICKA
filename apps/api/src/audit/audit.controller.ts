import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiForbiddenResponse } from '@nestjs/swagger';
import { ACCESS_TOKEN_SCHEME } from '../auth/constants/api-security';
import { Permission } from '../auth/constants/permissions';
import { UserRole } from '../auth/constants/roles';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditService } from './audit.service';

@ApiTags('audit-logs')
@ApiBearerAuth(ACCESS_TOKEN_SCHEME)
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @Roles(UserRole.ADMINISTRATOR)
  @Permissions(Permission.AUDIT_READ)
  @ApiOperation({
    summary: 'Read the audit trail',
    description: 'Returns audit entries. The trail records who changed what and is readable only by administrators, because it exposes security-relevant history. Requires audit.read permission.',
  })
  @ApiQuery({ name: 'action', required: false, type: String, example: 'PATIENT_UPDATE' })
  @ApiQuery({ name: 'entity', required: false, type: String, example: 'Patient' })
  @ApiResponse({ status: 200, description: 'Audit entries retrieved.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  list(@Query('action') action?: string, @Query('entity') entity?: string) {
    return this.audit.list(action, entity);
  }
}
