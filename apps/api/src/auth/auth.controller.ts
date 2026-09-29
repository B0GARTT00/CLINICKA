import { Body, Controller, Get, HttpStatus, Post, Query, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { ACCESS_TOKEN_SCHEME } from './constants/api-security';
import { Permission } from './constants/permissions';
import { Permissions } from './decorators/permissions.decorator';
import { Public } from './decorators/public.decorator';
import { AuthService } from './auth.service';
import { AccountEmailDto, CompletePasswordResetDto, LoginDto, RefreshDto, SignupDto } from './dto';


@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Log in',
    description: 'Exchanges credentials for an access token and a refresh token. Public route.',
  })
  @ApiResponse({ status: 200, description: 'Logged in successfully.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials or unverified email.' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Public()
  @Post('signup')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: 'Register an account', description: 'Creates an account and sends a verification email. Public route.' })
  @ApiResponse({ status: 201, description: 'Account created; verification email sent.' })
  @ApiResponse({ status: 400, description: 'Validation error or email already registered.' })
  signup(@Body() dto: SignupDto) {
    return this.auth.signup(dto);
  }

  @Public()
  @Get('verify-email')
  @ApiOperation({ summary: 'Verify an email address', description: 'Consumes a verification token from the emailed link. Public route.' })
  @ApiResponse({ status: 302, description: 'Redirects to the frontend with the verification outcome.' })
  async verifyEmail(@Query('token') token: string, @Res() response: Response) {
    try {
      await this.auth.verifyEmail(token);
      return response.redirect(`${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/verify-email?status=success`);
    } catch {
      return response.status(HttpStatus.FOUND).redirect(`${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/verify-email?status=error`);
    }
  }

  @Public()
  @Post('resend-verification')
  @Throttle({ default: { limit: 3, ttl: 15 * 60_000 } })
  @ApiOperation({ summary: 'Resend account verification', description: 'Returns the same response whether or not an eligible account exists.' })
  @ApiResponse({ status: 201, description: 'Neutral acknowledgement returned.' })
  resendVerification(@Body() dto: AccountEmailDto) {
    return this.auth.resendVerification(dto.email);
  }

  @Public()
  @Post('password-reset/request')
  @Throttle({ default: { limit: 3, ttl: 15 * 60_000 } })
  @ApiOperation({ summary: 'Request password recovery', description: 'Returns the same response whether or not an eligible account exists.' })
  @ApiResponse({ status: 201, description: 'Neutral acknowledgement returned.' })
  requestPasswordReset(@Body() dto: AccountEmailDto) {
    return this.auth.requestPasswordReset(dto.email);
  }

  @Public()
  @Post('password-reset/complete')
  @Throttle({ default: { limit: 5, ttl: 15 * 60_000 } })
  @ApiOperation({ summary: 'Complete password recovery', description: 'Consumes one valid, unexpired reset token and revokes existing sessions.' })
  @ApiResponse({ status: 201, description: 'Password reset successfully.' })
  @ApiResponse({ status: 401, description: 'Reset link is invalid or expired.' })
  completePasswordReset(@Body() dto: CompletePasswordResetDto) {
    return this.auth.completePasswordReset(dto.token, dto.password);
  }

  @Public()
  @Post('refresh')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Generates a new access token using a valid refresh token. Public route. Rate limited to 10 requests per minute.',
  })
  @ApiBody({ type: RefreshDto })
  @ApiResponse({ status: 200, description: 'New access and refresh tokens generated successfully.' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @Permissions(Permission.OWN_SESSION_MANAGE)
  @ApiBearerAuth(ACCESS_TOKEN_SCHEME)
  @ApiOperation({
    summary: 'Logout user',
    description: 'Invalidates the refresh token of the caller\'s own session. Requires authentication.',
  })
  @ApiBody({ type: RefreshDto })
  @ApiResponse({ status: 200, description: 'Logged out successfully.' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token.' })
  logout(@Body() dto: RefreshDto, @Req() request: AuthenticatedRequest) {
    return this.auth.logout(dto.refreshToken, request.user.id, request.ip, request.get?.('user-agent'));
  }

  @Get('me')
  @Permissions(Permission.OWN_ACCOUNT_READ)
  @ApiBearerAuth(ACCESS_TOKEN_SCHEME)
  @ApiOperation({
    summary: 'Get current user',
    description: 'Returns the profile of the currently authenticated user. Available to every authenticated role.',
  })
  @ApiResponse({ status: 200, description: 'Current user profile retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token.' })
  me(@Req() request: AuthenticatedRequest) {
    return this.auth.getCurrentUser(request.user.id);
  }
}
