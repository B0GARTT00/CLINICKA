import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiForbiddenResponse } from '@nestjs/swagger';
import { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { ACCESS_TOKEN_SCHEME } from '../auth/constants/api-security';
import { Permission } from '../auth/constants/permissions';
import { UserRole } from '../auth/constants/roles';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateCertificateDto } from './dto';
import { CertificatesService } from './certificates.service';


const CLINICAL_ROLES = [
  UserRole.ADMINISTRATOR,
  UserRole.CLINIC_NURSE,
  UserRole.CLINIC_STAFF,
  UserRole.DOCTOR,
] as const;
const PATIENT_ROLES = [UserRole.STUDENT, UserRole.FACULTY_STAFF] as const;

@ApiTags('certificates')
@ApiBearerAuth(ACCESS_TOKEN_SCHEME)
@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificates: CertificatesService) {}

  @Get('mine')
  @Roles(...PATIENT_ROLES)
  @Permissions(Permission.OWN_PROFILE_READ)
  @ApiOperation({ summary: 'List certificates issued to the authenticated patient' })
  @ApiResponse({ status: 200, description: 'Patient-owned certificates retrieved.' })
  listMine(@Req() request: AuthenticatedRequest) {
    return this.certificates.listMine(request.user.id);
  }

  @Get()
  @Roles(...CLINICAL_ROLES)
  @Permissions(Permission.CERTIFICATES_READ)
  @ApiOperation({ summary: 'List medical certificates', description: 'Requires certificates.read permission.' })
  @ApiResponse({ status: 200, description: 'Certificates retrieved.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  list() {
    return this.certificates.list();
  }

  @Post()
  @Roles(...CLINICAL_ROLES)
  @Permissions(Permission.CERTIFICATES_MANAGE)
  @ApiOperation({ summary: 'Issue a medical certificate', description: 'Requires certificates.manage permission.' })
  @ApiResponse({ status: 201, description: 'Certificate issued.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  create(@Body() dto: CreateCertificateDto, @Req() request: AuthenticatedRequest) {
    return this.certificates.create(dto, request.user.id);
  }

  @Post(':id/send')
  @Roles(...CLINICAL_ROLES)
  @Permissions(Permission.CERTIFICATES_MANAGE)
  @ApiOperation({ summary: 'Send an issued certificate to the patient portal' })
  @ApiResponse({ status: 201, description: 'Certificate sent and patient notified.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  send(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.certificates.send(id, request.user.id);
  }
}
