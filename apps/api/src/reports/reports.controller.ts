import { Controller, Get, Post, Query, Req, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { ACCESS_TOKEN_SCHEME } from '../auth/constants/api-security';
import { Permission } from '../auth/constants/permissions';
import { UserRole } from '../auth/constants/roles';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ReportFiltersDto } from './dto';
import { ClinicReportsService } from './clinic-reports.service';
import { ReportsService } from './reports.service';

const REPORT_READER_ROLES = [UserRole.CLINIC_NURSE, UserRole.DOCTOR, UserRole.CLINIC_STAFF] as const;

@ApiTags('reports')
@ApiBearerAuth(ACCESS_TOKEN_SCHEME)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService, private readonly clinicReports: ClinicReportsService) {}

  @Get('options')
  @Roles(...REPORT_READER_ROLES)
  @Permissions(Permission.REPORTS_READ)
  options() { return this.clinicReports.options(); }

  @Get('utilization')
  @Roles(...REPORT_READER_ROLES)
  @Permissions(Permission.REPORTS_READ)
  utilization(@Query() filters: ReportFiltersDto) { return this.clinicReports.utilization(filters); }

  @Get('medicine-summary')
  @Roles(...REPORT_READER_ROLES)
  @Permissions(Permission.REPORTS_READ)
  medicineSummary(@Query() filters: ReportFiltersDto) { return this.clinicReports.medicines(filters); }

  @Get('logbook')
  @Roles(...REPORT_READER_ROLES)
  @Permissions(Permission.REPORTS_READ, Permission.CLINICAL_READ)
  logbook(@Query() filters: ReportFiltersDto) { return this.clinicReports.logbook(filters); }

  @Post('utilization/export')
  @Roles(UserRole.CLINIC_NURSE)
  @Permissions(Permission.REPORTS_EXPORT)
  async exportUtilization(@Query() filters: ReportFiltersDto, @Req() request: AuthenticatedRequest) {
    return this.csvFile(await this.clinicReports.exportCsv('utilization', filters, request.user.id));
  }

  @Post('medicine-summary/export')
  @Roles(UserRole.CLINIC_NURSE)
  @Permissions(Permission.REPORTS_EXPORT)
  async exportMedicines(@Query() filters: ReportFiltersDto, @Req() request: AuthenticatedRequest) {
    return this.csvFile(await this.clinicReports.exportCsv('medicines', filters, request.user.id));
  }

  @Post('logbook/export')
  @Roles(UserRole.CLINIC_NURSE)
  @Permissions(Permission.REPORTS_EXPORT, Permission.CLINICAL_READ)
  async exportLogbook(@Query() filters: ReportFiltersDto, @Req() request: AuthenticatedRequest) {
    return this.csvFile(await this.clinicReports.exportCsv('logbook', filters, request.user.id));
  }

  private csvFile(result: { csv: string; filename: string }) {
    return new StreamableFile(Buffer.from(result.csv, 'utf8'), { type: 'text/csv; charset=utf-8', disposition: 'attachment; filename="' + result.filename + '"' });
  }

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
  @Roles(UserRole.CLINIC_NURSE)
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
