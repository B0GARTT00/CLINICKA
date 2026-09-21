import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { CreateRequirementDto } from './dto';
import { RequirementsService } from './requirements.service';

type AuthenticatedRequest = Request & { user: { id: string } };

@ApiTags('requirements')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('requirements')
export class RequirementsController {
  constructor(private readonly requirements: RequirementsService) {}

  @Get()
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'CLINIC_STAFF', 'DOCTOR', 'STUDENT', 'FACULTY_STAFF')
  listRequirements() {
    return this.requirements.listRequirements();
  }

  @Post()
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE')
  createRequirement(@Body() dto: CreateRequirementDto, @Req() request: AuthenticatedRequest) {
    return this.requirements.createRequirement(dto, request.user.id);
  }

}
