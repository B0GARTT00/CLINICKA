import { Controller, Delete, Get, Param, Req, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiResponse, ApiForbiddenResponse } from '@nestjs/swagger';
import { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { ACCESS_TOKEN_SCHEME } from '../auth/constants/api-security';
import { Permission } from '../auth/constants/permissions';
import { UserRole } from '../auth/constants/roles';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { DocumentsService } from './documents.service';


/**
 * Every authenticated role may attempt to read a document; the service then
 * narrows to the documents that caller is entitled to. A student or faculty
 * member is served only their own documents, so the role gate here is coarse by
 * design and the ownership decision is made per record.
 */
const READER_ROLES = [
  UserRole.ADMINISTRATOR,
  UserRole.CLINIC_NURSE,
  UserRole.CLINIC_STAFF,
  UserRole.DOCTOR,
  UserRole.STUDENT,
  UserRole.FACULTY_STAFF,
] as const;

@ApiTags('documents')
@ApiBearerAuth(ACCESS_TOKEN_SCHEME)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get(':id')
  @Roles(...READER_ROLES)
  @Permissions(Permission.DOCUMENTS_READ)
  @ApiOperation({ summary: 'Get authorized private document metadata', description: 'Requires documents.read permission.' })
  @ApiResponse({ status: 200, description: 'Document metadata returned.' })
  @ApiForbiddenResponse({ description: 'The caller is not entitled to this document, or lacks documents.read permission.' })
  metadata(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.documents.getMetadata(id, request.user.id);
  }

  @Get(':id/content')
  @Roles(...READER_ROLES)
  @Permissions(Permission.DOCUMENTS_READ)
  @ApiOperation({ summary: 'Download an authorized private document', description: 'Requires documents.read permission.' })
  @ApiResponse({ status: 200, description: 'Document content returned as a file stream.' })
  @ApiForbiddenResponse({ description: 'The caller is not entitled to this document, or lacks documents.read permission.' })
  async download(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    const document = await this.documents.download(id, request.user.id);
    return new StreamableFile(document.buffer, {
      type: document.mimeType,
      disposition: `attachment; filename="${document.filename.replace(/["\r\n]/g, '_')}"`,
    });
  }

  @Delete(':id')
  @Roles(UserRole.ADMINISTRATOR, UserRole.CLINIC_NURSE, UserRole.CLINIC_STAFF, UserRole.DOCTOR)
  @Permissions(Permission.DOCUMENTS_MANAGE)
  @ApiOperation({
    summary: 'Delete an unlinked private document subject to retention policy',
    description: 'Students and faculty cannot delete documents. Requires documents.manage permission.',
  })
  @ApiResponse({ status: 200, description: 'Document deleted.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  remove(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.documents.remove(id, request.user.id);
  }
}
