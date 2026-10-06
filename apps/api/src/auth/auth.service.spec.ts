import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { AuthService } from './auth.service';
import { clearRegisteredSecrets } from '../common/logging/redact';
import { JwtSecrets } from './jwt-secrets';

jest.mock('bcrypt', () => ({ compare: jest.fn(), hash: jest.fn() }));

const demoUser = {
  id: 'user-1',
  email: 'admin.demo@brokenshire.edu.ph',
  passwordHash: 'hash',
  displayName: 'Demo Administrator',
  status: 'ACTIVE',
  emailVerifiedAt: new Date(),
  emailVerificationTokenHash: null,
  emailVerificationExpiresAt: null,
  patientId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  roles: [{ role: { name: 'ADMINISTRATOR' } }],
};

const compareMock = bcrypt.compare as jest.MockedFunction<
  (password: string, hash: string) => Promise<boolean>
>;
const hashMock = jest.mocked(bcrypt.hash);

function createService() {
  const prisma = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    role: { findUnique: jest.fn() },
    refreshToken: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation(async (callback: (client: typeof prisma) => unknown) => callback(prisma));
  const patientProvisioning = { provision: jest.fn().mockResolvedValue('patient-1') };
  const jwt = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };
  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        'jwt.secret': 'kQ7#vZ2!pR9@xW4$mB6&nH3*jL8^dF5%',
        'jwt.refreshSecret': 'wT1@cD8^sE5%gH2*fJ7!kN9#aP4$uR6&mV3*',
        'jwt.expiresIn': '15m',
        'jwt.refreshExpiresIn': '7d',
      };
      return values[key];
    }),
  };
  // Real provider, so the test exercises the no-fallback path rather than a stub
  // that would happily return undefined.
  const secrets = new JwtSecrets(config as unknown as ConfigService);

  return {
    service: new AuthService(
      prisma as never,
      jwt as unknown as JwtService,
      config as unknown as ConfigService,
      secrets,
      patientProvisioning as never,
    ),
    prisma,
    jwt,
    secrets,
    patientProvisioning,
  };
}

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    hashMock.mockResolvedValue('hashed-refresh-token' as never);
    compareMock.mockResolvedValue(true);
  });

  afterEach(() => {
    // The provider registers secrets with the redactor; keep the registry from
    // leaking between tests.
    clearRegisteredSecrets();
  });

  it('logs in an active user and stores a hashed refresh token', async () => {
    const { service, prisma, jwt } = createService();
    prisma.user.findUnique.mockResolvedValue(demoUser);
    jwt.signAsync.mockResolvedValueOnce('access-token').mockResolvedValueOnce('refresh-token');

    const result = await service.login({
      email: 'admin.demo@brokenshire.edu.ph',
      password: 'a-password-from-the-test-fixture',
    });

    expect(result).toMatchObject({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { email: 'admin.demo@brokenshire.edu.ph', roles: ['ADMINISTRATOR'] },
    });
    expect(prisma.refreshToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tokenHash: expect.any(String) }),
      }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'LOGIN' }) }),
    );
  });

  it('rotates refresh tokens', async () => {
    const { service, prisma, jwt } = createService();
    prisma.refreshToken.findMany.mockResolvedValue([{ id: 'token-1', tokenHash: 'hash' }]);
    prisma.user.findUnique.mockResolvedValue(demoUser);
    jwt.verifyAsync.mockResolvedValue({ sub: 'user-1' });
    jwt.signAsync.mockResolvedValueOnce('new-access').mockResolvedValueOnce('new-refresh');

    const result = await service.refresh('old-refresh');

    expect(result.accessToken).toBe('new-access');
    expect(prisma.refreshToken.update).toHaveBeenCalledWith({
      where: { id: 'token-1' },
      data: { revokedAt: expect.any(Date) },
    });
    expect(prisma.refreshToken.create).toHaveBeenCalled();
  });

  it('verifies an account and invalidates the verification token', async () => {
    const { service, prisma, patientProvisioning } = createService();
    prisma.user.findFirst.mockResolvedValue({ ...demoUser, emailVerifiedAt: null });
    prisma.user.update.mockResolvedValue(demoUser);
    prisma.auditLog.create.mockResolvedValue({});

    await expect(service.verifyEmail('00000000-0000-4000-8000-000000000001')).resolves.toEqual({
      message: 'Your account has been verified successfully.',
    });

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        emailVerificationTokenHash: expect.any(String),
        emailVerificationExpiresAt: { gt: expect.any(Date) },
      },
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: demoUser.id },
      data: expect.objectContaining({
        emailVerifiedAt: expect.any(Date),
        emailVerificationTokenHash: null,
        emailVerificationExpiresAt: null,
      }),
    });
    expect(patientProvisioning.provision).toHaveBeenCalledWith(prisma, demoUser.id);
  });

  it('registers an unverified student without creating a patient', async () => {
    const { service, prisma, patientProvisioning } = createService();
    prisma.role.findUnique.mockResolvedValue({ id: 'student-role' });
    prisma.user.create.mockResolvedValue({ ...demoUser, emailVerifiedAt: null, roles: [{ role: { name: 'STUDENT' } }] });
    const result = await service.signup({ email: 'student@brokenshire.edu.ph', displayName: 'Student Test', password: 'Secret123!', patientType: 'STUDENT' as never });
    expect(result.verificationUrl).toMatch(/^http:\/\/localhost:3000\/api\/v1\/auth\/verify-email\?token=/);
    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ registrationProfile: { patientType: 'STUDENT' }, roles: { create: { roleId: 'student-role' } } }) }));
    expect(patientProvisioning.provision).not.toHaveBeenCalled();
  });

  it('keeps verification uncommitted if patient creation fails', async () => {
    const { service, prisma, patientProvisioning } = createService();
    prisma.user.findFirst.mockResolvedValue({ ...demoUser, emailVerifiedAt: null });
    patientProvisioning.provision.mockRejectedValue(new Error('patient write failed'));
    await expect(service.verifyEmail('00000000-0000-4000-8000-000000000001')).rejects.toThrow('patient write failed');
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it.each(['FACULTY', 'STAFF'])('registers %s with the shared institutional role', async (patientType) => {
    const { service, prisma } = createService();
    prisma.role.findUnique.mockResolvedValue({ id: 'faculty-staff-role' });
    prisma.user.create.mockResolvedValue({ ...demoUser, emailVerifiedAt: null });
    await service.signup({ email: 'person@brokenshire.edu.ph', displayName: 'Pat Example', password: 'Secret123!', patientType: patientType as never });
    expect(prisma.role.findUnique).toHaveBeenCalledWith({ where: { name: 'FACULTY_STAFF' } });
    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ registrationProfile: { patientType } }) }));
  });

  it('does not provision a second patient when an activation link is repeated', async () => {
    const { service, prisma, patientProvisioning } = createService();
    prisma.user.findFirst.mockResolvedValueOnce({ ...demoUser, emailVerifiedAt: null }).mockResolvedValueOnce(null);
    await service.verifyEmail('00000000-0000-4000-8000-000000000001');
    await expect(service.verifyEmail('00000000-0000-4000-8000-000000000001')).rejects.toThrow();
    expect(patientProvisioning.provision).toHaveBeenCalledTimes(1);
  });

  it('retries a concurrent unique-key collision before completing verification', async () => {
    const { service, prisma, patientProvisioning } = createService();
    prisma.user.findFirst.mockResolvedValue({ ...demoUser, emailVerifiedAt: null });
    prisma.$transaction.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError('Concurrent write', { code: 'P2002', clientVersion: '6.19.3' }));
    await expect(service.verifyEmail('00000000-0000-4000-8000-000000000001')).resolves.toMatchObject({ message: expect.stringContaining('verified') });
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(patientProvisioning.provision).toHaveBeenCalledTimes(1);
  });

  it('returns the same password-reset response when no account exists', async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.requestPasswordReset('missing@brokenshire.edu.ph')).resolves.toEqual({
      message: 'Password-reset email delivery is temporarily unavailable. Contact the clinic administrator for account recovery.',
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('does not create a reset token while outbound email is disabled', async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue(demoUser);

    await service.requestPasswordReset(demoUser.email);

    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('atomically consumes a reset token and revokes active sessions', async () => {
    const { service, prisma } = createService();
    const token = 'a'.repeat(43);
    prisma.user.findFirst.mockResolvedValue({ id: demoUser.id });
    prisma.user.updateMany.mockResolvedValue({ count: 1 });
    prisma.refreshToken.updateMany.mockResolvedValue({ count: 2 });
    prisma.auditLog.create.mockResolvedValue({});

    await expect(service.completePasswordReset(token, 'NewPassword123!')).resolves.toEqual({
      message: 'Your password has been reset. Sign in with your new password.',
    });

    const tokenHash = createHash('sha256').update(token).digest('hex');
    expect(prisma.user.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: demoUser.id, passwordResetTokenHash: tokenHash }),
      data: expect.objectContaining({ passwordResetTokenHash: null, passwordResetExpiresAt: null }),
    }));
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: demoUser.id, revokedAt: null },
    }));
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ actorId: demoUser.id, action: 'PASSWORD_RESET' }),
    });
  });

  it('rejects an expired or already-consumed password-reset token', async () => {
    const { service, prisma } = createService();
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(service.completePasswordReset('b'.repeat(43), 'NewPassword123!'))
      .rejects.toThrow('invalid or expired');
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });

  it('reports that verification email delivery is disabled', async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue({ ...demoUser, emailVerifiedAt: null });

    const result = await service.resendVerification(demoUser.email);

    expect(result).toEqual({ message: 'Verification-email delivery is temporarily unavailable. Use the activation link shown when you signed up, or contact the clinic administrator.' });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
