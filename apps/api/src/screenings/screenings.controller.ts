import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiResponse, ApiForbiddenResponse } from '@nestjs/swagger';
import { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { ACCESS_TOKEN_SCHEME } from '../auth/constants/api-security';
import { Permission } from '../auth/constants/permissions';
import { UserRole } from '../auth/constants/roles';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateScreeningDto, CreateVaccinationDto } from './dto';
import { ScreeningsService } from './screenings.service';


const CLINICAL_ROLES = [
  UserRole.ADMINISTRATOR,
  UserRole.CLINIC_NURSE,
  UserRole.CLINIC_STAFF,
  UserRole.DOCTOR,
] as const;

const RECORDING_ROLES = [UserRole.ADMINISTRATOR, UserRole.CLINIC_NURSE, UserRole.CLINIC_STAFF] as const;

@ApiTags('vaccination-history-screenings')
@ApiBearerAuth(ACCESS_TOKEN_SCHEME)
@Controller('health-records')
export class ScreeningsController {
  constructor(private readonly screenings: ScreeningsService) {}

  @Get('vaccinations')
  @Roles(...CLINICAL_ROLES)
  @Permissions(Permission.VACCINATIONS_READ)
  @ApiOperation({ summary: 'List externally received vaccination history', description: 'Requires vaccinations.read permission.' })
  @ApiResponse({ status: 200, description: 'Vaccination history retrieved.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  listVaccinations() {
    return this.screenings.listVaccinations();
  }

  @Post('vaccinations')
  @Roles(...RECORDING_ROLES)
  @Permissions(Permission.VACCINATIONS_MANAGE)
  @ApiOperation({
    summary: 'Document externally received vaccination history',
    description: 'Documentation-only; this endpoint does not administer vaccines, manage inventory, or schedule doses. Requires vaccinations.manage permission.',
  })
  @ApiResponse({ status: 201, description: 'Vaccination history documented.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  createVaccination(@Body() dto: CreateVaccinationDto, @Req() request: AuthenticatedRequest) {
    return this.screenings.createVaccination(dto, request.user.id);
  }

  @Get('screenings')
  @Roles(...CLINICAL_ROLES)
  @Permissions(Permission.SCREENINGS_READ)
  @ApiOperation({ summary: 'List health screenings', description: 'Requires screenings.read permission.' })
  @ApiResponse({ status: 200, description: 'Screenings retrieved.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  listScreenings() {
    return this.screenings.listScreenings();
  }

  @Post('screenings')
  @Roles(...RECORDING_ROLES)
  @Permissions(Permission.SCREENINGS_MANAGE)
  @ApiOperation({ summary: 'Record a health screening', description: 'Requires screenings.manage permission.' })
  @ApiResponse({ status: 201, description: 'Screening recorded.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  createScreening(@Body() dto: CreateScreeningDto, @Req() request: AuthenticatedRequest) {
    return this.screenings.createScreening(dto, request.user.id);
  }
}
