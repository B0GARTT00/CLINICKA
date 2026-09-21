import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permission } from '../../auth/constants/permissions';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth('access-token')
@Controller('reports')
@UseGuards(AuthGuard('jwt'), RolesGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE')
  @Permissions(Permission.REPORTS_READ)
  @ApiOperation({
    summary: 'Get all reports summary',
    description: 'Retrieves a summary of all reports including patients, visits, vaccinations, screenings, and inventory. Requires reports.read permission.',
  })
  @ApiResponse({ status: 200, description: 'Reports summary retrieved successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  findAll() {
    return {
      patients: this.reportsService.getPatientsReport(),
      visits: this.reportsService.getVisitsReport(),
      vaccinations: this.reportsService.getVaccinationsReport(),
      screenings: this.reportsService.getScreeningsReport(),
      inventory: this.reportsService.getInventoryReport(),
    };
  }

  @Get('patients')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE')
  @Permissions(Permission.REPORTS_READ)
  @ApiOperation({ summary: 'Get patients report', description: 'Retrieves the patients summary report. Requires reports.read permission.' })
  @ApiResponse({ status: 200, description: 'Patients report retrieved successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  getPatientsReport() {
    return this.reportsService.getPatientsReport();
  }

  @Get('visits')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE')
  @Permissions(Permission.REPORTS_READ)
  @ApiOperation({ summary: 'Get clinic visits report', description: 'Retrieves the clinic visits summary report. Requires reports.read permission.' })
  @ApiResponse({ status: 200, description: 'Clinic visits report retrieved successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  getVisitsReport() {
    return this.reportsService.getVisitsReport();
  }

  @Get('vaccinations')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE')
  @Permissions(Permission.REPORTS_READ)
  @ApiOperation({ summary: 'Get vaccinations report', description: 'Retrieves the vaccinations summary report. Requires reports.read permission.' })
  @ApiResponse({ status: 200, description: 'Vaccinations report retrieved successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  getVaccinationsReport() {
    return this.reportsService.getVaccinationsReport();
  }

  @Get('screenings')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE')
  @Permissions(Permission.REPORTS_READ)
  @ApiOperation({ summary: 'Get screenings report', description: 'Retrieves the screenings summary report. Requires reports.read permission.' })
  @ApiResponse({ status: 200, description: 'Screenings report retrieved successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  getScreeningsReport() {
    return this.reportsService.getScreeningsReport();
  }

  @Get('inventory')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE')
  @Permissions(Permission.REPORTS_READ)
  @ApiOperation({ summary: 'Get inventory report', description: 'Retrieves the inventory summary report. Requires reports.read permission.' })
  @ApiResponse({ status: 200, description: 'Inventory report retrieved successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  getInventoryReport() {
    return this.reportsService.getInventoryReport();
  }
}
