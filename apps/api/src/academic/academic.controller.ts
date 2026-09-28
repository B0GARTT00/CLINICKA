import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiForbiddenResponse } from '@nestjs/swagger';
import { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { ACCESS_TOKEN_SCHEME } from '../auth/constants/api-security';
import { Permission } from '../auth/constants/permissions';
import { UserRole } from '../auth/constants/roles';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AcademicService } from './academic.service';
import { CreateAcademicYearDto, CreateSemesterDto } from './dto';


@ApiTags('academic-years')
@ApiBearerAuth(ACCESS_TOKEN_SCHEME)
@Controller('academic-years')
export class AcademicController {
  constructor(private readonly academic: AcademicService) {}

  @Get()
  @Roles(UserRole.ADMINISTRATOR, UserRole.CLINIC_NURSE, UserRole.CLINIC_STAFF)
  @Permissions(Permission.ACADEMIC_READ)
  @ApiOperation({ summary: 'List academic years and semesters', description: 'Requires academic.read permission.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  list() {
    return this.academic.list();
  }

  @Post()
  @Roles(UserRole.ADMINISTRATOR)
  @Permissions(Permission.ACADEMIC_MANAGE)
  @ApiOperation({ summary: 'Create an academic year', description: 'Requires academic.manage permission.' })
  @ApiResponse({ status: 201, description: 'Academic year created.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  createYear(@Body() dto: CreateAcademicYearDto, @Req() request: AuthenticatedRequest) {
    return this.academic.createYear(dto, request.user.id);
  }

  @Post('semesters')
  @Roles(UserRole.ADMINISTRATOR)
  @Permissions(Permission.ACADEMIC_MANAGE)
  @ApiOperation({ summary: 'Create a semester', description: 'Requires academic.manage permission.' })
  @ApiResponse({ status: 201, description: 'Semester created.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  createSemester(@Body() dto: CreateSemesterDto, @Req() request: AuthenticatedRequest) {
    return this.academic.createSemester(dto, request.user.id);
  }
}
