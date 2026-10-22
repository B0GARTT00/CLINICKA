import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, RefreshToken, User, UserRole, Role, AuditAction, PatientType } from '@prisma/client';
import argon2 from 'argon2';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClinicianInvitationDto, LoginDto, RedeemClinicianTicketDto, SignupDto } from './dto';
import { RegisterDto } from './dto/register.dto';
import { JwtSecrets } from './jwt-secrets';
import { PatientProvisioningService } from '../patients/patient-provisioning.service';
import { roleForPatientType } from '../patients/patient-identity';
import { EmailService } from '../email/email.service';

type AuthUser = User & {
  roles: (UserRole & { role: Role })[];
};

type JwtPayload = {
  sub: string;
  email: string;
  roles: string[];
  patientId?: string | null;
  temporaryExpiresAt?: string | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly secrets: JwtSecrets,
    private readonly patientProvisioning: PatientProvisioningService,
    private readonly email: EmailService,
  ) {}

  async register(dto: RegisterDto, ipAddress?: string, userAgent?: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new BadRequestException('Email already in use.');
    }

    const passwordHash = await argon2.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        displayName: dto.displayName,
        status: 'ACTIVE',
      },
      include: { roles: { include: { role: true } } },
    }) as AuthUser;

    const session = await this.createSession(user);

    await this.prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: AuditAction.CREATE,
        entity: 'User',
        entityId: user.id,
        ipAddress,
        userAgent,
      },
    });

    return {
      ...session,
      user: this.toSafeUser(user),
    };
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    // Unverified users live in a separate table until they verify their email.
    const unverified = await this.prisma.unverifiedUser.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (unverified) {
      throw new ForbiddenException('Please verify your email before signing in.', { cause: { code: 'EMAIL_NOT_VERIFIED' } });
    }

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { roles: { include: { role: true } } },
    });

    if (!user) {
      throw new NotFoundException('No account found with this email address.', { cause: { code: 'USER_NOT_FOUND' } });
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('Your account has been disabled. Please contact the administrator.', { cause: { code: 'ACCOUNT_DISABLED' } });
    }
    if (user.isTemporary && (!user.temporaryExpiresAt || user.temporaryExpiresAt <= new Date())) {
      throw new ForbiddenException('This temporary clinician account has expired.', { cause: { code: 'TEMPORARY_ACCOUNT_EXPIRED' } });
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);

    if (!valid) {
      await this.prisma.auditLog.create({
        data: {
          actorId: user.id,
          action: AuditAction.LOGIN_FAILED,
          entity: 'User',
          entityId: user.id,
          ipAddress,
          userAgent,
          metadata: { event: 'INVALID_PASSWORD' },
        },
      });

      throw new UnauthorizedException('Invalid credentials.', { cause: { code: 'INVALID_CREDENTIALS' } });
    }

    const session = await this.createSession(user);

    await this.prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: AuditAction.LOGIN,
        entity: 'User',
        entityId: user.id,
        ipAddress,
        userAgent,
      },
    });

    return {
      ...session,
      user: this.toSafeUser(user),
    };
  }

  async redeemClinicianTicket(dto: RedeemClinicianTicketDto, ipAddress?: string, userAgent?: string) {
    const tickets = await this.prisma.temporaryClinicianTicket.findMany({
      where: { clinicianEmail: dto.clinicianEmail.toLowerCase(), redeemedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    const ticket = await (async () => {
      for (const candidate of tickets) {
        if (await argon2.verify(candidate.tokenHash, dto.ticket)) return candidate;
      }

      return null;
    })();
    if (!ticket) throw new UnauthorizedException('This clinician ticket is invalid, expired, or already used.');
    const role = await this.prisma.role.findUnique({ where: { name: ticket.roleName } });
    if (!role) throw new ConflictException('The clinician role is not configured. Run the database seed first.');
    const existing = await this.prisma.user.findUnique({ where: { email: ticket.clinicianEmail } });
    if (existing) throw new ConflictException('An account already exists for this clinician email.');
    const passwordHash = await argon2.hash(dto.password);
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: ticket.clinicianEmail,
          passwordHash,
          displayName: ticket.clinicianName,
          emailVerifiedAt: new Date(),
          isTemporary: true,
          temporaryExpiresAt: ticket.expiresAt,
          roles: { create: { roleId: role.id } },
        },
        include: { roles: { include: { role: true } } },
      });
      await tx.temporaryClinicianTicket.update({ where: { id: ticket.id }, data: { redeemedAt: new Date(), userId: created.id } });
      await tx.auditLog.create({ data: { actorId: created.id, action: AuditAction.CREATE, entity: 'User', entityId: created.id, metadata: { temporaryClinician: true, ticketId: ticket.id } } });
      return created;
    }) as AuthUser;
    return { ...(await this.createSession(user)), user: this.toSafeUser(user) };
  }

  async completeClinicianInvitation(token: string, password: string) {
    const invitation = await this.prisma.unverifiedUser.findFirst({
      where: { verificationTokenHash: this.hashVerificationToken(token), verificationExpiresAt: { gt: new Date() } },
    });
    if (!invitation) throw new UnauthorizedException('This invitation is invalid or expired.');
    const profile = invitation.registrationProfile as { roleId?: string; clinician?: boolean } | null;
    if (!profile?.clinician || !profile.roleId) throw new UnauthorizedException('This invitation is invalid or expired.');
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: invitation.email,
          passwordHash: await argon2.hash(password),
          displayName: invitation.displayName,
          registrationProfile: invitation.registrationProfile as Prisma.InputJsonValue,
          emailVerifiedAt: new Date(),
          roles: { create: { roleId: profile.roleId! } },
        },
        include: { roles: { include: { role: true } } },
      });
      await tx.unverifiedUser.delete({ where: { id: invitation.id } });
      await tx.auditLog.create({ data: { actorId: created.id, action: AuditAction.OTHER, entity: 'User', entityId: created.id, metadata: { event: 'CLINICIAN_INVITATION_COMPLETED' } } });
      return created;
    }) as AuthUser;
    return { ...(await this.createSession(user)), user: this.toSafeUser(user) };
  }

  async createClinicianInvitation(dto: CreateClinicianInvitationDto, actorId: string, ipAddress?: string, userAgent?: string) {
    const role = await this.prisma.role.findUnique({ where: { name: dto.role } });
    if (!role) throw new ConflictException(`${dto.role} role is not configured. Run the database seed first.`);
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    const pending = await this.prisma.unverifiedUser.findUnique({ where: { email } });
    if (existing || pending) throw new ConflictException('An account or pending invitation already exists for this email.');
    const token = randomUUID();
    const invitation = await this.prisma.unverifiedUser.create({
      data: {
        email,
        displayName: dto.displayName.trim(),
        passwordHash: await argon2.hash(randomUUID()),
        verificationTokenHash: this.hashVerificationToken(token),
        verificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        registrationProfile: { clinician: true, roleId: role.id, roleName: dto.role },
      },
    });
    const url = `${this.config.get<string>('frontendUrl') ?? process.env.FRONTEND_URL ?? 'http://localhost:5173'}/clinician/complete?token=${encodeURIComponent(token)}`;
    const sent = await this.email.sendVerificationEmail(email, url, invitation.displayName);
    await this.prisma.auditLog.create({ data: { actorId, action: AuditAction.CREATE, entity: 'ClinicianInvitation', entityId: invitation.id, ipAddress, userAgent, metadata: { role: dto.role, email } } });
    return { message: sent ? 'Invitation sent successfully.' : 'Invitation created, but the email could not be sent.', email, role: dto.role };
  }

  async signup(dto: SignupDto) {
    const patientType = dto.patientType ?? PatientType.STUDENT;
    const roleName = roleForPatientType(patientType);
    const role = await this.prisma.role.findUnique({ where: { name: roleName } });
    if (!role) throw new ConflictException(`${roleName} role is not configured. Run the database seed first.`);
    if (!dto.departmentId) throw new BadRequestException('Department is required for registration.');
    const department = await this.prisma.department.findUnique({
      where: { id: dto.departmentId },
      include: { programs: { select: { id: true } } },
    });
    if (!department) throw new BadRequestException('Selected department was not found.');
    if (patientType === PatientType.STUDENT) {
      if (!dto.studentId || !dto.yearLevel) {
        throw new BadRequestException('Student ID, department, and year level are required for student registration.');
      }
      if (department.programs.length && !dto.programId) {
        throw new BadRequestException('Program is required for the selected department.');
      }
      if (dto.programId && !department.programs.some((program) => program.id === dto.programId)) {
        throw new BadRequestException('The selected program does not belong to the selected department.');
      }
    } else if (!dto.employeeId) {
      throw new BadRequestException('Employee ID and department are required for faculty and staff registration.');
    }

    try {
      const verificationToken = randomUUID();
      const unverifiedUser = await this.prisma.unverifiedUser.create({
        data: {
          email: dto.email.toLowerCase(),
          displayName: dto.displayName.trim(),
          registrationProfile: {
            patientType,
            studentId: dto.studentId,
            employeeId: dto.employeeId,
            departmentId: dto.departmentId,
            programId: dto.programId,
            yearLevel: dto.yearLevel,
            section: dto.section,
            roleId: role.id,
          },
          passwordHash: await argon2.hash(dto.password),
          verificationTokenHash: this.hashVerificationToken(verificationToken),
          verificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
      await this.prisma.auditLog.create({ data: { action: AuditAction.SIGNUP, entity: 'UnverifiedUser', entityId: unverifiedUser.id } });
      const verificationUrl = this.getVerificationUrl(verificationToken, dto.verificationSessionId);
      const emailSent = await this.email.sendVerificationEmail(unverifiedUser.email, verificationUrl, unverifiedUser.displayName);
      return {
        message: emailSent
          ? 'Account created. Check your email for the verification link.'
          : 'Account created, but the verification email could not be sent. Please contact the clinic administrator.',
        verificationUrl,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('An account with this email already exists.');
      }
      throw error;
    }
  }

  academicCatalog() {
    return this.prisma.department.findMany({
      include: { programs: { orderBy: { name: 'asc' } } },
      orderBy: { name: 'asc' },
    });
  }

  async verifyEmail(token: string) {
    if (!token || !/^[0-9a-f-]{36}$/i.test(token)) throw new UnauthorizedException('This activation link is invalid or expired.');
    const tokenHash = this.hashVerificationToken(token);
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await this.prisma.$transaction(async (tx) => {
          const unverifiedUser = await tx.unverifiedUser.findFirst({
            where: {
              verificationTokenHash: tokenHash,
              verificationExpiresAt: { gt: new Date() },
            },
          });
          if (!unverifiedUser) throw new UnauthorizedException('This activation link is invalid or expired.');

          const profile = unverifiedUser.registrationProfile && typeof unverifiedUser.registrationProfile === 'object' && !Array.isArray(unverifiedUser.registrationProfile)
            ? unverifiedUser.registrationProfile as { roleId?: string; patientType?: string; studentId?: string; employeeId?: string; departmentId?: string; programId?: string; yearLevel?: number; section?: string }
            : {};
          const roleId = profile.roleId;
          if (!roleId) throw new UnauthorizedException('This activation link is invalid or expired.');

          const user = await tx.user.create({
            data: {
              email: unverifiedUser.email,
              passwordHash: unverifiedUser.passwordHash,
              displayName: unverifiedUser.displayName,
              ...(unverifiedUser.registrationProfile !== null
                ? { registrationProfile: unverifiedUser.registrationProfile as Prisma.InputJsonValue }
                : {}),
              status: 'ACTIVE',
              emailVerifiedAt: new Date(),
              roles: { create: { roleId } },
            },
            include: { roles: { include: { role: true } } },
          });

          await this.patientProvisioning.provision(tx, user.id);
          await tx.auditLog.create({ data: { actorId: user.id, action: AuditAction.OTHER, entity: 'User', entityId: user.id, metadata: { event: 'EMAIL_VERIFIED' } } });
          await tx.unverifiedUser.delete({ where: { id: unverifiedUser.id } });
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
        return { message: 'Your account has been verified successfully.' };
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(error.code) && attempt < 2) continue;
        throw error;
      }
    }
    throw new ConflictException('Verification could not be completed. Please try again.');
  }

  async resendVerification(email: string) {
    const unverifiedUser = await this.prisma.unverifiedUser.findUnique({ where: { email: email.toLowerCase() } });
    if (!unverifiedUser) {
      return { message: 'If the account is eligible, a new verification email has been sent.' };
    }

    const verificationToken = randomUUID();
    await this.prisma.unverifiedUser.update({
      where: { id: unverifiedUser.id },
      data: {
        verificationTokenHash: this.hashVerificationToken(verificationToken),
        verificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const sent = await this.email.sendVerificationEmail(
      unverifiedUser.email,
      this.getVerificationUrl(verificationToken),
      unverifiedUser.displayName,
    );
    return {
      message: sent
        ? 'A new verification email has been sent. Check your inbox and spam folder.'
        : 'The verification email could not be sent. Contact the clinic administrator.',
    };
  }

  async requestPasswordReset(email: string) {
    void email;
    return { message: 'Password-reset email delivery is temporarily unavailable. Contact the clinic administrator for account recovery.' };
  }

  async completePasswordReset(token: string, password: string) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new UnauthorizedException('This password reset link is invalid or expired.');
    const tokenHash = this.hashToken(token);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findFirst({
        where: {
          passwordResetTokenHash: tokenHash,
          passwordResetExpiresAt: { gt: now },
          status: 'ACTIVE',
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!user) throw new UnauthorizedException('This password reset link is invalid or expired.');

      const consumed = await tx.user.updateMany({
        where: { id: user.id, passwordResetTokenHash: tokenHash, passwordResetExpiresAt: { gt: now } },
        data: {
          passwordHash: await argon2.hash(password),
          passwordResetTokenHash: null,
          passwordResetExpiresAt: null,
        },
      });
      if (consumed.count !== 1) throw new UnauthorizedException('This password reset link is invalid or expired.');

      await tx.refreshToken.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: now } });
      await tx.auditLog.create({
        data: { actorId: user.id, action: AuditAction.PASSWORD_RESET, entity: 'User', entityId: user.id },
      });
    });

    return { message: 'Your password has been reset. Sign in with your new password.' };
  }

  async refresh(refreshToken: string) {
    const payload = await this.verifyRefreshToken(refreshToken);
    const storedTokens = await this.prisma.refreshToken.findMany({
      where: {
        userId: payload.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    const storedToken = await this.findMatchingRefreshToken(refreshToken, storedTokens);
    if (!storedToken) throw new UnauthorizedException('Invalid refresh token.');

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { roles: { include: { role: true } } },
    }) as AuthUser | null;

    if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException('Invalid refresh token.');

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    return {
      ...(await this.createSession(user)),
      user: this.toSafeUser(user),
    };
  }

  async logout(refreshToken?: string, actorId?: string, ipAddress?: string, userAgent?: string) {
    if (refreshToken) {
      const payload = await this.verifyRefreshToken(refreshToken).catch(() => null);
      if (payload) {
        const storedTokens = await this.prisma.refreshToken.findMany({
          where: { userId: payload.sub, revokedAt: null },
        });
        const storedToken = await this.findMatchingRefreshToken(refreshToken, storedTokens);
        if (storedToken) {
          await this.prisma.refreshToken.update({
            where: { id: storedToken.id },
            data: { revokedAt: new Date() },
          });
        }
      }
    }

    if (actorId) {
      await this.prisma.auditLog.create({
        data: {
          actorId,
          action: AuditAction.LOGOUT,
          entity: 'User',
          entityId: actorId,
          ipAddress,
          userAgent,
        },
      });
    }

    return { message: 'Logged out.' };
  }

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    }) as AuthUser | null;

    if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException('User is inactive.');
    return this.toSafeUser(user);
  }

  async updateCurrentUser(userId: string, displayName: string, ipAddress?: string, userAgent?: string) {
    const name = displayName.trim();
    if (name.length < 2) throw new BadRequestException('Display name must contain at least 2 characters.');
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { displayName: name },
      include: { roles: { include: { role: true } } },
    }) as AuthUser;
    await this.prisma.auditLog.create({
      data: { actorId: userId, action: AuditAction.UPDATE, entity: 'User', entityId: userId, ipAddress, userAgent, metadata: { changedFields: ['displayName'] } },
    });
    return this.toSafeUser(user);
  }

  private async createSession(user: AuthUser) {
    const roles = user.roles.map((entry) => entry.role.name);
    const payload: JwtPayload = { sub: user.id, email: user.email, roles, patientId: user.patientId, temporaryExpiresAt: user.temporaryExpiresAt?.toISOString() };
    // Access and refresh tokens are signed with independent secrets, so a
    // captured refresh token cannot be presented as an access token.
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.secrets.accessSecret,
      expiresIn: this.config.get<string>('jwt.expiresIn') ?? '15m',
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.secrets.refreshSecret,
      expiresIn: this.config.get<string>('jwt.refreshExpiresIn') ?? '7d',
    });

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: await argon2.hash(refreshToken),
        expiresAt: this.getRefreshExpiry(),
      },
    });

    return { accessToken, refreshToken };
  }

  private async verifyRefreshToken(refreshToken: string) {
    try {
      return await this.jwt.verifyAsync<JwtPayload>(refreshToken, { secret: this.secrets.refreshSecret });
    } catch {
      throw new UnauthorizedException('Invalid refresh token.');
    }
  }

  private async findMatchingRefreshToken(refreshToken: string, storedTokens: RefreshToken[]) {
    for (const storedToken of storedTokens) {
      if (await argon2.verify(storedToken.tokenHash, refreshToken)) return storedToken;
    }
    return null;
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private hashVerificationToken(token: string) {
    return this.hashToken(token);
  }

  private getVerificationUrl(token: string, session?: string) {
    const apiUrl = new URL(this.config.get<string>('PUBLIC_API_URL') ?? 'http://localhost:3000');
    const prefix = this.config.get<string>('apiPrefix') ?? 'api/v1';
    apiUrl.pathname = `/${prefix.replace(/^\/+|\/+$/g, '')}/auth/verify-email`;
    apiUrl.searchParams.set('token', token);
    if (session) apiUrl.searchParams.set('session', session);
    return apiUrl.toString();
  }

  private getRefreshExpiry() {
    const configured = this.config.get<string>('jwt.refreshExpiresIn') ?? '7d';
    const match = configured.match(/^(\d+)([dhm])$/);
    if (!match) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const amount = Number(match[1]);
    const unit = match[2];
    const multipliers = { m: 60_000, h: 60 * 60_000, d: 24 * 60 * 60_000 };
    return new Date(Date.now() + amount * multipliers[unit as keyof typeof multipliers]);
  }

  private toSafeUser(user: AuthUser) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      roles: user.roles.map((entry) => entry.role.name),
      patientId: user.patientId,
    };
  }
}
