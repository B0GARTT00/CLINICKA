import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { CreateDispensationDto } from './dto';
import { DispensingService } from './dispensing.service';

type AuthenticatedRequest = Request & { user: { id: string } };

@ApiTags('medicine-dispensing')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('inventory/dispensing')
export class DispensingController {
  constructor(private readonly dispensing: DispensingService) {}

  @Get()
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'CLINIC_STAFF', 'DOCTOR')
  list() {
    return this.dispensing.list();
  }

  @Get('exceptions')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'DOCTOR')
  exceptionReport() {
    return this.dispensing.getExceptionReport();
  }

  @Get('visits/:clinicVisitId/reconciliation')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'DOCTOR')
  visitReconciliation(@Param('clinicVisitId') clinicVisitId: string) {
    return this.dispensing.getVisitReconciliation(clinicVisitId);
  }

  @Post()
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE')
  create(@Body() dto: CreateDispensationDto, @Req() request: AuthenticatedRequest) {
    return this.dispensing.create(dto, request.user.id);
  }
}
