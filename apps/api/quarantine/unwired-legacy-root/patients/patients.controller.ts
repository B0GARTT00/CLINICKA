import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { PatientType } from '@prisma/client';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import {
  CreateAllergyDto,
  CreateEmergencyContactDto,
  CreateMedicalConditionDto,
  CreateMedicalHistoryDto,
  CreatePatientDto,
  UpdatePatientDto,
} from './dto';
import { PatientsService } from './patients.service';

@ApiTags('patients')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('patients')
export class PatientsController {
  constructor(private readonly patients: PatientsService) {}

  @Get()
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'DOCTOR', 'CLINIC_STAFF')
  findAll(@Query('search') search?: string, @Query('page') page = '1', @Query('limit') limit = '20', @Query('type') type?: PatientType) {
    return this.patients.findAll(search, Number(page), Number(limit), type);
  }

  @Get(':id')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'DOCTOR', 'CLINIC_STAFF')
  findOne(@Param('id') id: string) {
    return this.patients.findOne(id);
  }

  @Post()
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'CLINIC_STAFF')
  create(@Body() dto: CreatePatientDto) {
    return this.patients.create(dto);
  }

  @Patch(':id')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'CLINIC_STAFF')
  update(@Param('id') id: string, @Body() dto: UpdatePatientDto) {
    return this.patients.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE')
  remove(@Param('id') id: string, @Req() request: Request & { user: { id: string } }) {
    return this.patients.remove(id, request.user.id);
  }

  @Post(':id/restore')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE')
  restore(@Param('id') id: string, @Req() request: Request & { user: { id: string } }) {
    return this.patients.restore(id, request.user.id);
  }

  @Post(':id/emergency-contacts')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'CLINIC_STAFF')
  addEmergencyContact(@Param('id') id: string, @Body() dto: CreateEmergencyContactDto, @Req() request: Request & { user: { id: string } }) {
    return this.patients.addEmergencyContact(id, dto, request.user.id);
  }

  @Post(':id/medical-history')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'DOCTOR')
  addMedicalHistory(@Param('id') id: string, @Body() dto: CreateMedicalHistoryDto, @Req() request: Request & { user: { id: string } }) {
    return this.patients.addMedicalHistory(id, dto, request.user.id);
  }

  @Post(':id/conditions')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'DOCTOR')
  addCondition(@Param('id') id: string, @Body() dto: CreateMedicalConditionDto, @Req() request: Request & { user: { id: string } }) {
    return this.patients.addCondition(id, dto, request.user.id);
  }

  @Post(':id/allergies')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'DOCTOR')
  addAllergy(@Param('id') id: string, @Body() dto: CreateAllergyDto, @Req() request: Request & { user: { id: string } }) {
    return this.patients.addAllergy(id, dto, request.user.id);
  }
}
