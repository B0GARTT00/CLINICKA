import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiForbiddenResponse } from '@nestjs/swagger';
import { ACCESS_TOKEN_SCHEME } from '../auth/constants/api-security';
import { Permission } from '../auth/constants/permissions';
import { UserRole } from '../auth/constants/roles';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth(ACCESS_TOKEN_SCHEME)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('summary')
  @Roles(UserRole.ADMINISTRATOR, UserRole.CLINIC_NURSE, UserRole.DOCTOR, UserRole.CLINIC_STAFF)
  @Permissions(Permission.REPORTS_READ)
  @ApiOperation({
    summary: 'Read the operational summary report',
    description: 'Aggregate clinic counts. Requires reports.read permission.',
  })
  @ApiResponse({ status: 200, description: 'Summary retrieved.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  summary() {
    return this.reports.summary();
  }
}
