import { Controller, Get, Post, Query, Req, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { ACCESS_TOKEN_SCHEME } from '../auth/constants/api-security';
import { Permission } from '../auth/constants/permissions';
import { UserRole } from '../auth/constants/roles';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ReportFiltersDto } from './dto';
import { ReportsService } from './reports.service';

const REPORT_READER_ROLES = [UserRole.ADMINISTRATOR, UserRole.CLINIC_NURSE, UserRole.DOCTOR, UserRole.CLINIC_STAFF] as const;

@ApiTags('reports')
@ApiBearerAuth(ACCESS_TOKEN_SCHEME)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('summary')
  @Roles(...REPORT_READER_ROLES)
  @Permissions(Permission.REPORTS_READ)
  @ApiOperation({ summary: 'Read the dashboard summary', description: 'Aggregate clinic counts. Requires reports.read permission.' })
  @ApiResponse({ status: 200, description: 'Summary retrieved.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  summary() {
    return this.reports.summary();
  }

  @Get('operational')
  @Roles(...REPORT_READER_ROLES)
  @Permissions(Permission.REPORTS_READ)
  @ApiOperation({ summary: 'Read a filtered aggregate operational report' })
  operational(@Query() filters: ReportFiltersDto) {
    return this.reports.operational(filters);
  }

  @Post('operational/export')
  @Roles(UserRole.ADMINISTRATOR, UserRole.CLINIC_NURSE)
  @Permissions(Permission.REPORTS_EXPORT)
  @ApiOperation({ summary: 'Export a filtered aggregate operational report as an audited CSV' })
  async export(@Query() filters: ReportFiltersDto, @Req() request: AuthenticatedRequest) {
    const result = await this.reports.exportCsv(filters, request.user.id);
    return new StreamableFile(Buffer.from(result.csv, 'utf8'), {
      type: 'text/csv; charset=utf-8',
      disposition: `attachment; filename="${result.filename}"`,
    });
  }
}
