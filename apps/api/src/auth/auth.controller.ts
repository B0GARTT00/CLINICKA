import { Body, Controller, Get, HttpStatus, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RefreshDto, SignupDto } from './dto';

type AuthenticatedRequest = Request & {
  user: { id: string };
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('signup')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  signup(@Body() dto: SignupDto) {
    return this.auth.signup(dto);
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string, @Res() response: Response) {
    try {
      await this.auth.verifyEmail(token);
      return response.redirect(`${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/verify-email?status=success`);
    } catch {
      return response.status(HttpStatus.FOUND).redirect(`${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/verify-email?status=error`);
    }
  }

  @Post('refresh')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Generates a new access token using a valid refresh token. Rate limited to 10 requests per minute.',
  })
  @ApiBody({ type: RefreshDto })
  @ApiResponse({ status: 200, description: 'New access and refresh tokens generated successfully.' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Logout user',
    description: 'Invalidates the provided refresh token. Requires authentication.',
  })
  @ApiBody({ type: RefreshDto })
  @ApiResponse({ status: 200, description: 'Logged out successfully.' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token.' })
  logout(@Body() dto: RefreshDto, @Req() request: AuthenticatedRequest) {
    return this.auth.logout(dto.refreshToken, request.user.id, request.ip, request.get('user-agent'));
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get current user',
    description: 'Returns the profile of the currently authenticated user.',
  })
  @ApiResponse({ status: 200, description: 'Current user profile retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token.' })
  @ApiResponse({ status: 403, description: 'User account is inactive.' })
  me(@Req() request: AuthenticatedRequest) {
    return this.auth.getCurrentUser(request.user.id);
  }
}
