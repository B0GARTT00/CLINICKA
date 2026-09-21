import { Test } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '../../auth/constants/roles';
import { UserStatus } from '@prisma/client';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: jest.Mocked<PrismaService>;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    passwordHash: 'hashed',
    displayName: 'Test User',
    status: 'ACTIVE' as UserStatus,
    patientId: null,
    deletedAt: null,
    createdAt: new Date('2026-09-07T00:00:00.000Z'),
    updatedAt: new Date('2026-09-07T00:00:00.000Z'),
    roles: [{ role: { id: 'role-1', name: UserRole.ADMINISTRATOR, description: 'Admin' } }],
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            role: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
            },
            userRole: {
              deleteMany: jest.fn(),
              create: jest.fn(),
            },
            auditLog: {
              create: jest.fn(),
            },
          } as unknown as PrismaService,
        },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
    prisma = moduleRef.get(PrismaService) as unknown as jest.Mocked<PrismaService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      (prisma.user.findMany as jest.Mock).mockResolvedValue([mockUser] as any);
      (prisma.user.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 } as any);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });

    it('should filter by search term', async () => {
      (prisma.user.findMany as jest.Mock).mockResolvedValue([mockUser] as any);
      (prisma.user.count as jest.Mock).mockResolvedValue(1);

      await service.findAll({ page: 1, limit: 10, search: 'Test' } as any, 'actor-1');
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
            OR: [
              { email: { contains: 'Test', mode: 'insensitive' } },
              { displayName: { contains: 'Test', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('should filter by role', async () => {
      (prisma.user.findMany as jest.Mock).mockResolvedValue([mockUser] as any);
      (prisma.user.count as jest.Mock).mockResolvedValue(1);

      await service.findAll({ page: 1, limit: 10, role: 'ADMINISTRATOR' } as any, 'actor-1');
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
            roles: { some: { role: { name: 'ADMINISTRATOR' } } },
          }),
        }),
      );
    });

    it('should exclude soft-deleted users', async () => {
      (prisma.user.findMany as jest.Mock).mockResolvedValue([] as any);
      (prisma.user.count as jest.Mock).mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 10 } as any);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null },
        }),
      );
    });
  });

  describe('findRoles', () => {
    it('returns configured roles with permissions and user counts', async () => {
      (prisma.role.findMany as jest.Mock).mockResolvedValue([]);
      await expect(service.findRoles()).resolves.toEqual([]);
      expect(prisma.role.findMany).toHaveBeenCalledWith({
        include: {
          permissions: { include: { permission: true } },
          _count: { select: { users: true } },
        },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser as any);

      const result = await service.findOne('user-1', 'actor-1', '127.0.0.1', 'test-agent');
      expect(result.email).toBe('test@example.com');
    });

    it('should throw NotFoundException for missing user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('missing', 'actor-1')).rejects.toThrow('User not found.');
    });

    it('should throw NotFoundException for soft-deleted user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...mockUser, deletedAt: new Date() } as any);

      await expect(service.findOne('user-1', 'actor-1')).rejects.toThrow('User not found.');
    });
  });

  describe('create', () => {
    it('should create a user with hashed password', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.role.findUnique as jest.Mock).mockResolvedValue({ id: 'role-1', name: UserRole.ADMINISTRATOR } as any);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser as any);
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({} as any);

      const result = await service.create(
        { email: 'test@example.com', password: 'SecurePass123!', displayName: 'Test', role: UserRole.ADMINISTRATOR },
        'actor-1',
        '127.0.0.1',
        'test-agent',
      );

      expect(result.email).toBe('test@example.com');
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'CREATE_USER',
            entity: 'User',
            entityId: 'user-1',
          }),
        }),
      );
    });

    it('should throw ConflictException for duplicate email', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser as any);

      await expect(
        service.create(
          { email: 'test@example.com', password: 'SecurePass123!', displayName: 'Test', role: UserRole.ADMINISTRATOR },
          'actor-1',
        ),
      ).rejects.toThrow('Email already in use.');
    });

    it('should throw BadRequestException for invalid role', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.role.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.create(
          { email: 'test@example.com', password: 'SecurePass123!', displayName: 'Test', role: 'INVALID_ROLE' as any },
          'actor-1',
        ),
      ).rejects.toThrow('Invalid role.');
    });
  });

  describe('update', () => {
    it('should update user fields', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser as any);
      (prisma.user.update as jest.Mock).mockResolvedValue({ ...mockUser, displayName: 'Updated' } as any);
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({} as any);

      const result = await service.update('user-1', { displayName: 'Updated' }, 'actor-1');
      expect(result.displayName).toBe('Updated');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: { displayName: 'Updated' },
        }),
      );
    });

    it('should throw ConflictException for duplicate email on update', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser as any);
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser as any).mockResolvedValueOnce({ ...mockUser, id: 'other-user' } as any);

      await expect(
        service.update('user-1', { email: 'other@example.com' }, 'actor-1'),
      ).rejects.toThrow('Email already in use.');
    });

    it('should throw NotFoundException for missing user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.update('missing', { displayName: 'Test' }, 'actor-1')).rejects.toThrow('User not found.');
    });
  });

  describe('softDelete', () => {
    it('should soft delete a user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser as any);
      (prisma.user.update as jest.Mock).mockResolvedValue({ ...mockUser, deletedAt: new Date(), status: 'INACTIVE' } as any);
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({} as any);

      const result = await service.softDelete('user-1', 'actor-1');
      expect(result).toEqual({ message: 'User deleted successfully.' });
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: { deletedAt: expect.any(Date), status: 'INACTIVE' },
        }),
      );
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'DELETE_USER',
            entity: 'User',
            entityId: 'user-1',
          }),
        }),
      );
    });

    it('should throw NotFoundException for already deleted user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...mockUser, deletedAt: new Date() } as any);

      await expect(service.softDelete('user-1', 'actor-1')).rejects.toThrow('User not found.');
    });
  });

  describe('assignRole', () => {
    it('should assign a role to user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser as any);
      (prisma.role.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'role-2', name: UserRole.CLINIC_NURSE, description: 'Nurse' } as any);
      (prisma.userRole.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 1 } as any);
      (prisma.userRole.create as jest.Mock).mockResolvedValueOnce({ userId: 'user-1', roleId: 'role-2' } as any);
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ ...mockUser, roles: [{ role: { id: 'role-2', name: UserRole.CLINIC_NURSE } }] } as any);
      (prisma.auditLog.create as jest.Mock).mockResolvedValueOnce({} as any);

      const result = await service.assignRole('user-1', UserRole.CLINIC_NURSE, 'actor-1');
      expect(result.roles[0]?.name).toBe(UserRole.CLINIC_NURSE);
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'ROLE_CHANGE',
            entity: 'User',
            entityId: 'user-1',
            metadata: { previousRole: UserRole.ADMINISTRATOR, newRole: UserRole.CLINIC_NURSE },
          }),
        }),
      );
    });

    it('should throw NotFoundException for missing user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(service.assignRole('missing', UserRole.ADMINISTRATOR, 'actor-1')).rejects.toThrow('User not found.');
    });

    it('should throw BadRequestException for invalid role', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser as any);
      (prisma.role.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(service.assignRole('user-1', 'INVALID_ROLE' as any, 'actor-1')).rejects.toThrow('Invalid role.');
    });

    it('should log ROLE_CHANGE when changing existing role', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser as any);
      (prisma.role.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'role-2', name: UserRole.CLINIC_NURSE, description: 'Nurse' } as any);
      (prisma.userRole.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 1 } as any);
      (prisma.userRole.create as jest.Mock).mockResolvedValueOnce({ userId: 'user-1', roleId: 'role-2' } as any);
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ ...mockUser, roles: [{ role: { id: 'role-2', name: UserRole.CLINIC_NURSE } }] } as any);
      (prisma.auditLog.create as jest.Mock).mockResolvedValueOnce({} as any);

      await service.assignRole('user-1', UserRole.CLINIC_NURSE, 'actor-1');
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'ROLE_CHANGE',
          }),
        }),
      );
    });
  });
});
