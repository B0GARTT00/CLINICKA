import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { CreateClearanceDto, ReviewClearanceDto } from './dto';
import { ClearancesService } from './clearances.service';

type AuthenticatedRequest = Request & { user: { id: string } };

@ApiTags('clearances')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('clearances')
export class ClearancesController {
  constructor(private readonly clearances: ClearancesService) {}

  @Get()
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'CLINIC_STAFF', 'DOCTOR')
  list() {
    return this.clearances.list();
  }

  @Get('eligibility/:patientId')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'CLINIC_STAFF')
  eligibility(@Param('patientId') patientId: string, @Query('academicYearId') academicYearId?: string, @Query('semesterId') semesterId?: string) {
    return this.clearances.eligibility(patientId, academicYearId, semesterId);
  }

  @Post()
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'CLINIC_STAFF')
  create(@Body() dto: CreateClearanceDto, @Req() request: AuthenticatedRequest) {
    return this.clearances.create(dto, request.user.id);
  }

  @Post(':id/review')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE')
  review(@Param('id') id: string, @Body() dto: ReviewClearanceDto, @Req() request: AuthenticatedRequest) {
    return this.clearances.review(id, dto, request.user.id);
  }
}
