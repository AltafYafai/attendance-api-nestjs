import { Injectable } from '@nestjs/common';
import { AttendanceRecord, Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { toDateOnly, today } from '../common/utils/date.util';
import { EmploymentService } from '../employment/employment.service';
import { PrismaService } from '../prisma/prisma.service';
import { QueryBusinessAttendanceDto } from './dto/query-business-attendance.dto';
import { QueryMyAttendanceDto } from './dto/query-my-attendance.dto';

export type PunchAction = 'CHECK_IN' | 'CHECK_OUT';

export interface PunchResult {
  action: PunchAction;
  record: AttendanceRecord;
}

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly employmentService: EmploymentService,
  ) {}

  async punch(user: AuthenticatedUser, businessId?: string): Promise<PunchResult> {
    const employment = await this.employmentService.resolveActiveEmployment(user.userId, businessId);
    const date = today();
    const now = new Date();

    const existing = await this.prisma.attendanceRecord.findUnique({
      where: {
        userId_businessId_date: { userId: user.userId, businessId: employment.businessId, date },
      },
    });

    if (!existing) {
      const record = await this.prisma.attendanceRecord.create({
        data: {
          employmentId: employment.id,
          businessId: employment.businessId,
          userId: user.userId,
          date,
          checkInAt: now,
        },
      });
      return { action: 'CHECK_IN', record };
    }

    const action: PunchAction = existing.checkInAt ? 'CHECK_OUT' : 'CHECK_IN';
    const record = await this.prisma.attendanceRecord.update({
      where: { id: existing.id },
      data: action === 'CHECK_IN' ? { checkInAt: now } : { checkOutAt: now },
    });
    return { action, record };
  }

  async listMine(user: AuthenticatedUser, query: QueryMyAttendanceDto): Promise<AttendanceRecord[]> {
    return this.prisma.attendanceRecord.findMany({
      where: {
        userId: user.userId,
        ...(query.businessId ? { businessId: query.businessId } : {}),
        ...this.dateFilter(query.from, query.to),
      },
      orderBy: { date: 'desc' },
    });
  }

  async listForBusiness(
    owner: AuthenticatedUser,
    query: QueryBusinessAttendanceDto,
  ): Promise<AttendanceRecord[]> {
    return this.prisma.attendanceRecord.findMany({
      where: {
        businessId: owner.businessId ?? '',
        ...(query.userId ? { userId: query.userId } : {}),
        ...this.dateFilter(query.from, query.to),
      },
      orderBy: [{ date: 'desc' }, { userId: 'asc' }],
    });
  }

  private dateFilter(
    from?: string,
    to?: string,
  ): { date?: Prisma.DateTimeFilter } {
    if (!from && !to) {
      return {};
    }
    const range: Prisma.DateTimeFilter = {};
    if (from) {
      range.gte = toDateOnly(from);
    }
    if (to) {
      range.lte = toDateOnly(to);
    }
    return { date: range };
  }
}
