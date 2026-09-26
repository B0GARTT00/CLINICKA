import { Controller, Delete, Get, Param, Req, StreamableFile, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { DocumentsService } from './documents.service';

type AuthenticatedRequest = Request & { user: { id: string } };
const DOCUMENT_ROLES = ['STUDENT', 'FACULTY_STAFF', 'CLINIC_NURSE', 'CLINIC_STAFF', 'DOCTOR', 'ADMINISTRATOR'];

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get(':id')
  @Roles(...DOCUMENT_ROLES)
  @ApiOperation({ summary: 'Get authorized private document metadata' })
  metadata(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.documents.getMetadata(id, request.user.id);
  }

  @Get(':id/content')
  @Roles(...DOCUMENT_ROLES)
  @ApiOperation({ summary: 'Download an authorized private document' })
  async download(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    const document = await this.documents.download(id, request.user.id);
    return new StreamableFile(document.buffer, {
      type: document.mimeType,
      disposition: `attachment; filename="${document.filename.replace(/["\r\n]/g, '_')}"`,
    });
  }

  @Delete(':id')
  @Roles('CLINIC_NURSE', 'CLINIC_STAFF', 'DOCTOR', 'ADMINISTRATOR')
  @ApiOperation({ summary: 'Delete an unlinked private document subject to retention policy' })
  remove(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.documents.remove(id, request.user.id);
  }
}
