import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req, StreamableFile, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { EvidenceService } from './evidence.service';
import { EvidenceStatus } from './state-machine/evidence-transitions';
import { IsBase64, IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

type AuthenticatedRequest = Request & { user: { id: string; role: string; patientId?: string } };

class SubmitEvidenceDto {
  @IsString()
  requirementId!: string;

  @IsString()
  @MaxLength(255)
  filename!: string;

  @IsString()
  mimeType!: string;

  @IsBase64()
  contentBase64!: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

class ReviewEvidenceDto {
  @IsEnum(EvidenceStatus)
  status!: EvidenceStatus;

  @IsString()
  @IsNotEmpty()
  notes?: string;
}

@ApiTags('evidence')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('evidence')
export class EvidenceController {
  constructor(private readonly evidence: EvidenceService) {}

  @Post('submissions')
  @Roles('STUDENT', 'FACULTY_STAFF')
  submit(
    @Body() dto: SubmitEvidenceDto,
    @Req() request: AuthenticatedRequest,
  ) {
    if (!request.user.patientId) throw new BadRequestException('Your account is not linked to a patient record.');
    return this.evidence.uploadAndSubmit(dto.requirementId, request.user.patientId, request.user.id, {
      filename: dto.filename,
      mimeType: dto.mimeType,
      contentBase64: dto.contentBase64,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });
  }

  @Get('submissions')
  @Roles('STUDENT', 'FACULTY_STAFF', 'CLINIC_NURSE', 'CLINIC_STAFF', 'DOCTOR', 'ADMINISTRATOR')
  listSubmissions(
    @Req() request: AuthenticatedRequest,
    @Query('status') status?: string,
    @Query('patientId') patientId?: string,
  ) {
    return this.evidence.listSubmissions(request.user.id, {
      status: status as EvidenceStatus | undefined,
      patientId,
    });
  }

  @Get('submissions/:id')
  @Roles('STUDENT', 'FACULTY_STAFF', 'CLINIC_NURSE', 'CLINIC_STAFF', 'DOCTOR', 'ADMINISTRATOR')
  findOne(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.evidence.findOne(id, request.user.id);
  }

  @Get('submissions/:id/history')
  @Roles('STUDENT', 'FACULTY_STAFF', 'CLINIC_NURSE', 'CLINIC_STAFF', 'DOCTOR', 'ADMINISTRATOR')
  getHistory(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.evidence.getHistory(id, request.user.id);
  }

  @Get('submissions/:id/document')
  @Roles('STUDENT', 'FACULTY_STAFF', 'CLINIC_NURSE', 'CLINIC_STAFF', 'DOCTOR', 'ADMINISTRATOR')
  async downloadDocument(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    const document = await this.evidence.getDocument(id, request.user.id);
    return new StreamableFile(document.buffer, {
      type: document.mimeType,
      disposition: `attachment; filename="${document.filename.replace(/["\r\n]/g, '_')}"`,
    });
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
