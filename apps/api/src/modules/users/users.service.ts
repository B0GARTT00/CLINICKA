import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-users.dto';
import { UpdateUserDto } from './dto/update-users.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UserStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

type SafeUser = {
  id: string;
  email: string;
  displayName: string;
  status: UserStatus;
  roles: { id: string; name: string }[];
  createdAt: Date;
  updatedAt: Date;
};

type PaginatedUsers = {
  data: SafeUser[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryUsersDto, actorId?: string, ipAddress?: string, userAgent?: string): Promise<PaginatedUsers> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      deletedAt: null,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.role) {
      where.roles = {
        some: {
          role: {
            name: query.role,
          },
        },
      };
    }

    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { displayName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          roles: {
            include: {
              role: true,
            },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    const data = users.map((user) => this.toSafeUser(user));

    if (actorId) {
      await this.prisma.auditLog.create({
        data: {
          actorId,
          action: 'LIST_USERS',
          entity: 'User',
          ipAddress,
          userAgent,
          metadata: { page, limit, total },
        },
      });
    }

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  findRoles() {
    return this.prisma.role.findMany({
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, actorId?: string, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user || user.deletedAt !== null) {
      throw new NotFoundException('User not found.');
    }

    if (actorId) {
      await this.prisma.auditLog.create({
        data: {
          actorId,
          action: 'VIEW_USER',
          entity: 'User',
          entityId: id,
          ipAddress,
          userAgent,
        },
      });
    }

    return this.toSafeUser(user);
  }

  async create(dto: CreateUserDto, actorId: string, ipAddress?: string, userAgent?: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email already in use.');
    }

    const role = await this.prisma.role.findUnique({
      where: { name: dto.role },
    });

    if (!role) {
      throw new BadRequestException('Invalid role.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        displayName: dto.displayName,
        status: 'ACTIVE',
        roles: {
          create: {
            roleId: role.id,
          },
        },
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'CREATE_USER',
        entity: 'User',
        entityId: user.id,
        ipAddress,
        userAgent,
        metadata: { role: dto.role },
      },
    });

    return this.toSafeUser(user);
  }

  async update(id: string, dto: UpdateUserDto, actorId: string, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user || user.deletedAt !== null) {
      throw new NotFoundException('User not found.');
    }

    if (dto.email && dto.email !== user.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException('Email already in use.');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.email && { email: dto.email }),
        ...(dto.displayName && { displayName: dto.displayName }),
        ...(dto.status && { status: dto.status }),
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'UPDATE_USER',
        entity: 'User',
        entityId: id,
        ipAddress,
        userAgent,
        metadata: {
          changes: Object.keys(dto),
        },
      },
    });

    return this.toSafeUser(updated);
  }

  async softDelete(id: string, actorId: string, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user || user.deletedAt !== null) {
      throw new NotFoundException('User not found.');
    }

    await this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: 'INACTIVE',
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'DELETE_USER',
        entity: 'User',
        entityId: id,
        ipAddress,
        userAgent,
      },
    });

    return { message: 'User deleted successfully.' };
  }

  async assignRole(userId: string, roleName: string, actorId: string, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user || user.deletedAt !== null) {
      throw new NotFoundException('User not found.');
    }

    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
    });

    if (!role) {
      throw new BadRequestException('Invalid role.');
    }

    await this.prisma.userRole.deleteMany({
      where: { userId },
    });

    await this.prisma.userRole.create({
      data: {
        userId,
        roleId: role.id,
      },
    });

    const updatedUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    const previousRole = user.roles[0]?.role?.name;

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: previousRole && previousRole !== roleName ? 'ROLE_CHANGE' : 'ASSIGN_ROLE',
        entity: 'User',
        entityId: userId,
        ipAddress,
        userAgent,
        metadata: {
          previousRole: previousRole ?? null,
          newRole: roleName,
        },
      },
    });

    if (!updatedUser) {
      throw new NotFoundException('User not found after role assignment.');
    }

    return this.toSafeUser(updatedUser);
  }

  private toSafeUser(user: { id: string; email: string; displayName: string; status: UserStatus; createdAt: Date; updatedAt: Date; roles: { role: { id: string; name: string } }[] }): SafeUser {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      status: user.status,
      roles: user.roles.map((entry) => ({ id: entry.role.id, name: entry.role.name })),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
