import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { EvidenceService } from './evidence.service';

type AuthenticatedRequest = Request & { user: { id: string; role: string; patientId?: string } };

class SubmitEvidenceDto {
  documentId!: string;
  expiresAt?: string;
}

class ReviewEvidenceDto {
  status!: 'VERIFIED' | 'REJECTED';
  notes?: string;
}

@ApiTags('evidence')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('evidence')
export class EvidenceController {
  constructor(private readonly evidence: EvidenceService) {}

  @Post('requirements/:requirementId/submissions')
  @Roles('PATIENT')
  submit(
    @Param('requirementId') requirementId: string,
    @Body() dto: SubmitEvidenceDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.evidence.submit(requirementId, dto.documentId, request.user.patientId!, request.user.id, {
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });
  }

  @Get('submissions')
  @Roles('PATIENT', 'CLINIC_NURSE', 'CLINIC_STAFF', 'DOCTOR', 'ADMINISTRATOR')
  listSubmissions(
    @Req() request: AuthenticatedRequest,
    @Query('status') status?: string,
    @Query('patientId') patientId?: string,
  ) {
    return this.evidence.listSubmissions(request.user.id, {
      status: status as 'VERIFIED' | 'REJECTED' | 'SUBMITTED',
      patientId,
    });
  }

  @Get('submissions/:id')
  @Roles('PATIENT', 'CLINIC_NURSE', 'CLINIC_STAFF', 'DOCTOR', 'ADMINISTRATOR')
  findOne(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.evidence.findOne(id, request.user.id);
  }

  @Get('submissions/:id/history')
  @Roles('PATIENT', 'CLINIC_NURSE', 'CLINIC_STAFF', 'DOCTOR', 'ADMINISTRATOR')
  getHistory(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.evidence.getHistory(id, request.user.id);
  }

  @Post('submissions/:id/review')
  @Roles('CLINIC_NURSE', 'DOCTOR', 'ADMINISTRATOR')
  review(
    @Param('id') id: string,
    @Body() dto: ReviewEvidenceDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.evidence.review(id, dto.status, request.user.id, dto.notes);
  }
}