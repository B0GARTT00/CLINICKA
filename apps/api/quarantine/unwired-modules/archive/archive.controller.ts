import { Controller, Get, Param, Post, Patch, Body, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { ArchiveService } from './archive.service';
import { CreateArchiveDto, RestoreArchiveDto } from './dto';

@ApiTags('archive')
@ApiBearerAuth('access-token')
@Controller('archive')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ArchiveController {
  constructor(private readonly archiveService: ArchiveService) {}

  @Get()
  @Roles('ADMINISTRATOR')
  @ApiOperation({ summary: 'Get all archived records', description: 'Retrieves a list of all archived records. Admin only.' })
  @ApiResponse({ status: 200, description: 'Archived records retrieved successfully.', isArray: true })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  findAll() {
    return this.archiveService.findAll();
  }

  @Get(':id')
  @Roles('ADMINISTRATOR')
  @ApiOperation({ summary: 'Get archived record by ID', description: 'Retrieves a single archived record by its unique ID.' })
  @ApiParam({ name: 'id', description: 'Archive record ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Archived record retrieved successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  @ApiNotFoundResponse({ description: 'Archived record not found.' })
  findOne(@Param('id') id: string) {
    return this.archiveService.findOne(id);
  }

  @Post()
  @Roles('ADMINISTRATOR')
  @ApiOperation({ summary: 'Archive a record', description: 'Archives an existing record by creating a new archive entry. Admin only.' })
  @ApiBody({ type: CreateArchiveDto })
  @ApiResponse({ status: 201, description: 'Record archived successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid request data.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  create(@Body() dto: CreateArchiveDto) {
    return this.archiveService.create(dto);
  }

  @Patch(':id/restore')
  @Roles('ADMINISTRATOR')
  @ApiOperation({ summary: 'Restore an archived record', description: 'Restores a previously archived record. Admin only.' })
  @ApiParam({ name: 'id', description: 'Archive record ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiBody({ type: RestoreArchiveDto })
  @ApiResponse({ status: 200, description: 'Archived record restored successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid request data.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  @ApiNotFoundResponse({ description: 'Archived record not found.' })
  restore(@Param('id') id: string, @Body() dto: RestoreArchiveDto) {
    return this.archiveService.restore(id, dto);
  }
}
