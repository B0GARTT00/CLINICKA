import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Delete,
  Body,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { AuthenticatedRequest } from '../../auth/types/authenticated-request';
import { ACCESS_TOKEN_SCHEME } from '../../auth/constants/api-security';
import { Permission } from '../../auth/constants/permissions';
import { UserRole } from '../../auth/constants/roles';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-users.dto';
import { UpdateUserDto } from './dto/update-users.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { QueryUsersDto } from './dto/query-users.dto';


/**
 * Every route here is administrator-only. User management and the role
 * catalogue are the two capabilities that let a caller grant themselves access,
 * so they are never reachable by a clinic role.
 */
@ApiTags('users')
@ApiBearerAuth(ACCESS_TOKEN_SCHEME)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Roles(UserRole.ADMINISTRATOR)
  @Permissions(Permission.USERS_MANAGE)
  @ApiOperation({
    summary: 'List system users',
    description: 'Retrieves a paginated list of system users. Requires users.manage permission.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'jane' })
  @ApiQuery({ name: 'role', required: false, type: String, example: 'CLINIC_NURSE' })
  @ApiQuery({ name: 'status', required: false, type: String, enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'], example: 'ACTIVE' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully.', isArray: true })
  @ApiBadRequestResponse({ description: 'Invalid query parameters.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  findAll(@Query() query: QueryUsersDto, @Req() req: AuthenticatedRequest) {
    return this.users.findAll(query, req.user.id, req.ip, req.get?.('user-agent'));
  }

  @Get('roles')
  @Roles(UserRole.ADMINISTRATOR)
  @Permissions(Permission.ROLES_MANAGE)
  @ApiOperation({
    summary: 'List configured roles and permissions',
    description: 'Returns the role catalogue and the permissions each role grants. Requires roles.manage permission.',
  })
  @ApiResponse({ status: 200, description: 'Roles retrieved successfully.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  findRoles() {
    return this.users.findRoles();
  }

  @Get(':id')
  @Roles(UserRole.ADMINISTRATOR)
  @Permissions(Permission.USERS_MANAGE)
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Retrieves a single user by their unique ID. Requires users.manage permission.',
  })
  @ApiParam({ name: 'id', description: 'User ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  @ApiNotFoundResponse({ description: 'User not found.' })
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.users.findOne(id, req.user.id, req.ip, req.get?.('user-agent'));
  }

  @Post()
  @Roles(UserRole.ADMINISTRATOR)
  @Permissions(Permission.USERS_MANAGE)
  @ApiOperation({
    summary: 'Create a new system user',
    description: 'Creates a new user account with the specified role. Requires users.manage permission.',
  })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'User created successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid request data or invalid role.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  @ApiConflictResponse({ description: 'Email already in use.' })
  create(@Body() dto: CreateUserDto, @Req() req: AuthenticatedRequest) {
    return this.users.create(dto, req.user.id, req.ip, req.get?.('user-agent'));
  }

  @Patch(':id')
  @Roles(UserRole.ADMINISTRATOR)
  @Permissions(Permission.USERS_MANAGE)
  @ApiOperation({
    summary: 'Update user profile and status',
    description: 'Updates a user\'s email, display name, or account status. Requires users.manage permission.',
  })
  @ApiParam({ name: 'id', description: 'User ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, description: 'User updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid request data or invalid role.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  @ApiNotFoundResponse({ description: 'User not found.' })
  @ApiConflictResponse({ description: 'Email already in use by another account.' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @Req() req: AuthenticatedRequest) {
    return this.users.update(id, dto, req.user.id, req.ip, req.get?.('user-agent'));
  }

  @Delete(':id')
  @Roles(UserRole.ADMINISTRATOR)
  @Permissions(Permission.USERS_MANAGE)
  @ApiOperation({
    summary: 'Soft delete a system user',
    description: 'Soft deletes a user account by marking it as deleted. Requires users.manage permission.',
  })
  @ApiParam({ name: 'id', description: 'User ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'User deleted successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  @ApiNotFoundResponse({ description: 'User not found.' })
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.users.softDelete(id, req.user.id, req.ip, req.get?.('user-agent'));
  }

  @Post(':id/roles')
  @Roles(UserRole.ADMINISTRATOR)
  @Permissions(Permission.USERS_MANAGE)
  @ApiOperation({
    summary: 'Assign or change a user role',
    description: 'Assigns a new role to a user, replacing any existing role. Requires users.manage permission.',
  })
  @ApiParam({ name: 'id', description: 'User ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiBody({ type: AssignRoleDto })
  @ApiResponse({ status: 200, description: 'Role assigned successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid role name.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  @ApiNotFoundResponse({ description: 'User not found or role not found.' })
  assignRole(@Param('id') id: string, @Body() dto: AssignRoleDto, @Req() req: AuthenticatedRequest) {
    return this.users.assignRole(id, dto.role, req.user.id, req.ip, req.get?.('user-agent'));
  }
}
