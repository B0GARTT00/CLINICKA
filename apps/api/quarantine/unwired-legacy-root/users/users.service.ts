import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        displayName: true,
        status: true,
        patientId: true,
        roles: { select: { role: { select: { name: true } } } },
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
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
}
