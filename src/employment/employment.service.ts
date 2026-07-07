import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Employment, EmploymentStatus } from '@prisma/client';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { AddEmployeeDto } from './dto/add-employee.dto';

@Injectable()
export class EmploymentService {
  constructor(private readonly prisma: PrismaService) {}

  private requireBusiness(owner: AuthenticatedUser): string {
    if (!owner.businessId) {
      throw new ForbiddenException('Your account is not linked to a business');
    }
    return owner.businessId;
  }

  async addEmployee(owner: AuthenticatedUser, dto: AddEmployeeDto): Promise<Employment> {
    const businessId = this.requireBusiness(owner);

    if (dto.userId === owner.userId) {
      throw new BadRequestException('You cannot add yourself as an employee');
    }

    const existing = await this.prisma.employment.findUnique({
      where: { businessId_userId: { businessId, userId: dto.userId } },
    });

    if (existing && existing.status === EmploymentStatus.ACTIVE) {
      throw new ConflictException('Employee is already active in this business');
    }

    if (existing) {
      return this.prisma.employment.update({
        where: { id: existing.id },
        data: {
          status: EmploymentStatus.ACTIVE,
          username: dto.username ?? existing.username,
          removedAt: null,
        },
      });
    }

    return this.prisma.employment.create({
      data: {
        businessId,
        userId: dto.userId,
        username: dto.username ?? null,
        status: EmploymentStatus.ACTIVE,
        createdBy: owner.userId,
      },
    });
  }

  async listEmployees(owner: AuthenticatedUser, status?: EmploymentStatus): Promise<Employment[]> {
    const businessId = this.requireBusiness(owner);
    return this.prisma.employment.findMany({
      where: { businessId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async removeEmployee(owner: AuthenticatedUser, userId: string): Promise<Employment> {
    const businessId = this.requireBusiness(owner);

    const employment = await this.prisma.employment.findUnique({
      where: { businessId_userId: { businessId, userId } },
    });

    if (!employment || employment.status === EmploymentStatus.REMOVED) {
      throw new NotFoundException('Active employment not found for this user');
    }

    return this.prisma.employment.update({
      where: { id: employment.id },
      data: { status: EmploymentStatus.REMOVED, removedAt: new Date() },
    });
  }

  async listMyEmployments(user: AuthenticatedUser): Promise<Employment[]> {
    return this.prisma.employment.findMany({
      where: { userId: user.userId, status: EmploymentStatus.ACTIVE },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Resolves the active employment an employee is acting under. When the user
  // belongs to multiple businesses, businessId must be supplied to disambiguate.
  async resolveActiveEmployment(userId: string, businessId?: string): Promise<Employment> {
    if (businessId) {
      const employment = await this.prisma.employment.findUnique({
        where: { businessId_userId: { businessId, userId } },
      });
      if (!employment || employment.status !== EmploymentStatus.ACTIVE) {
        throw new ForbiddenException('You are not an active employee of this business');
      }
      return employment;
    }

    const active = await this.prisma.employment.findMany({
      where: { userId, status: EmploymentStatus.ACTIVE },
    });

    if (active.length === 0) {
      throw new ForbiddenException('You are not an active employee of any business');
    }
    if (active.length > 1) {
      throw new BadRequestException(
        'You belong to multiple businesses; specify businessId for this action',
      );
    }
    return active[0];
  }
}
