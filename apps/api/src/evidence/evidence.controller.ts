import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiForbiddenResponse } from '@nestjs/swagger';
import { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { ACCESS_TOKEN_SCHEME } from '../auth/constants/api-security';
import { Permission } from '../auth/constants/permissions';
import { UserRole } from '../auth/constants/roles';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { EvidenceService } from './evidence.service';
import { EvidenceStatus } from './state-machine/evidence-transitions';
import { IsBase64, IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';


/**
 * A student or faculty member may read evidence submissions, but only their
 * own: `EvidenceService` scopes the query to the patient record linked to the
 * caller, so listing and reading never expose another person's documents.
 */
const READER_ROLES = [
  UserRole.STUDENT,
  UserRole.FACULTY_STAFF,
  UserRole.ADMINISTRATOR,
  UserRole.CLINIC_NURSE,
  UserRole.CLINIC_STAFF,
  UserRole.DOCTOR,
] as const;

const SUBMITTER_ROLES = [UserRole.STUDENT, UserRole.FACULTY_STAFF] as const;

const REVIEWER_ROLES = [UserRole.ADMINISTRATOR, UserRole.CLINIC_NURSE, UserRole.DOCTOR] as const;

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
@ApiBearerAuth(ACCESS_TOKEN_SCHEME)
@Controller('evidence')
export class EvidenceController {
  constructor(private readonly evidence: EvidenceService) {}

  @Post('submissions')
  @Roles(...SUBMITTER_ROLES)
  @Permissions(Permission.EVIDENCE_SUBMIT)
  @ApiOperation({
    summary: 'Submit evidence for one of your own requirements',
    description: 'Submits evidence against a requirement for the patient record linked to the caller. Requires evidence.submit permission.',
  })
  @ApiResponse({ status: 201, description: 'Evidence submitted.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions, or the account has no linked patient record.' })
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
  @Roles(...READER_ROLES)
  @Permissions(Permission.EVIDENCE_READ)
  @ApiOperation({
    summary: 'List evidence submissions',
    description: 'Patients see only their own submissions; clinical staff may filter by patient. Requires evidence.read permission.',
  })
  @ApiResponse({ status: 200, description: 'Submissions retrieved.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
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
  @Roles(...READER_ROLES)
  @Permissions(Permission.EVIDENCE_READ)
  @ApiOperation({ summary: 'Get an evidence submission', description: 'Requires evidence.read permission.' })
  @ApiResponse({ status: 200, description: 'Submission retrieved.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions, or the submission belongs to another patient.' })
  findOne(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.evidence.findOne(id, request.user.id);
  }

  @Get('submissions/:id/history')
  @Roles(...READER_ROLES)
  @Permissions(Permission.EVIDENCE_READ)
  @ApiOperation({ summary: 'Get the status history of an evidence submission', description: 'Requires evidence.read permission.' })
  @ApiResponse({ status: 200, description: 'History retrieved.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions, or the submission belongs to another patient.' })
  getHistory(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.evidence.getHistory(id, request.user.id);
  }

  @Get('submissions/:id/document')
  @Roles(...READER_ROLES)
  @Permissions(Permission.EVIDENCE_READ)
  @ApiOperation({ summary: 'Download the document behind an evidence submission', description: 'Requires evidence.read permission.' })
  @ApiResponse({ status: 200, description: 'Document returned as a file stream.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions, or the submission belongs to another patient.' })
  async downloadDocument(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    const document = await this.evidence.getDocument(id, request.user.id);
    return new StreamableFile(document.buffer, {
      type: document.mimeType,
      disposition: `attachment; filename="${document.filename.replace(/["\r\n]/g, '_')}"`,
    });
  }

  @Post('submissions/:id/review')
  @Roles(...REVIEWER_ROLES)
  @Permissions(Permission.EVIDENCE_REVIEW)
  @ApiOperation({
    summary: 'Approve or reject an evidence submission',
    description: 'Clinical reviewers only; requires evidence.review permission.',
  })
  @ApiResponse({ status: 201, description: 'Submission reviewed.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  review(
    @Param('id') id: string,
    @Body() dto: ReviewEvidenceDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.evidence.review(id, dto.status, request.user.id, dto.notes);
  }
}
