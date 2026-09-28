import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiForbiddenResponse } from '@nestjs/swagger';
import { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { ACCESS_TOKEN_SCHEME } from '../auth/constants/api-security';
import { Permission } from '../auth/constants/permissions';
import { UserRole } from '../auth/constants/roles';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateRequirementDto } from './dto';
import { RequirementsService } from './requirements.service';


/** Every authenticated role may read the requirement catalogue. */
const ALL_ROLES = [
  UserRole.ADMINISTRATOR,
  UserRole.CLINIC_NURSE,
  UserRole.CLINIC_STAFF,
  UserRole.DOCTOR,
  UserRole.STUDENT,
  UserRole.FACULTY_STAFF,
] as const;

const AUTHOR_ROLES = [UserRole.ADMINISTRATOR, UserRole.CLINIC_NURSE] as const;

@ApiTags('requirements')
@ApiBearerAuth(ACCESS_TOKEN_SCHEME)
@Controller('requirements')
export class RequirementsController {
  constructor(private readonly requirements: RequirementsService) {}

  @Get()
  @Roles(...ALL_ROLES)
  @Permissions(Permission.REQUIREMENTS_READ)
  @ApiOperation({ summary: 'List health requirements', description: 'Requires requirements.read permission.' })
  @ApiResponse({ status: 200, description: 'Requirements retrieved.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  listRequirements() {
    return this.requirements.listRequirements();
  }

  @Post()
  @Roles(...AUTHOR_ROLES)
  @Permissions(Permission.REQUIREMENTS_MANAGE)
  @ApiOperation({ summary: 'Create a health requirement', description: 'Requires requirements.manage permission.' })
  @ApiResponse({ status: 201, description: 'Requirement created.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  createRequirement(@Body() dto: CreateRequirementDto, @Req() request: AuthenticatedRequest) {
    return this.requirements.createRequirement(dto, request.user.id);
  }
}
