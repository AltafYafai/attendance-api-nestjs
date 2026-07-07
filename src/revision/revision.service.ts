import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AttendanceStatus,
  Prisma,
  RevisionRequest,
  RevisionStatus,
  RevisionType,
} from '@prisma/client';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { toDateOnly } from '../common/utils/date.util';
import { EmploymentService } from '../employment/employment.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRevisionDto } from './dto/create-revision.dto';
import { ListBusinessRevisionsDto, ListMyRevisionsDto } from './dto/list-revisions.dto';
import { RevisionDecision, ReviewRevisionDto } from './dto/review-revision.dto';

@Injectable()
export class RevisionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly employmentService: EmploymentService,
  ) {}

  async create(user: AuthenticatedUser, dto: CreateRevisionDto): Promise<RevisionRequest> {
    const employment = await this.employmentService.resolveActiveEmployment(
      user.userId,
      dto.businessId,
    );

    if (
      dto.type === RevisionType.TIME_CORRECTION &&
      !dto.requestedCheckInAt &&
      !dto.requestedCheckOutAt
    ) {
      throw new BadRequestException(
        'A time correction must include requestedCheckInAt or requestedCheckOutAt',
      );
    }

    const date = toDateOnly(dto.date);

    const record = await this.prisma.attendanceRecord.findUnique({
      where: {
        userId_businessId_date: { userId: user.userId, businessId: employment.businessId, date },
      },
    });

    return this.prisma.revisionRequest.create({
      data: {
        employmentId: employment.id,
        recordId: record?.id ?? null,
        businessId: employment.businessId,
        userId: user.userId,
        date,
        type: dto.type,
        requestedCheckInAt: dto.requestedCheckInAt ? new Date(dto.requestedCheckInAt) : null,
        requestedCheckOutAt: dto.requestedCheckOutAt ? new Date(dto.requestedCheckOutAt) : null,
        reason: dto.reason,
      },
    });
  }

  async listMine(user: AuthenticatedUser, query: ListMyRevisionsDto): Promise<RevisionRequest[]> {
    return this.prisma.revisionRequest.findMany({
      where: { userId: user.userId, ...(query.status ? { status: query.status } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listForBusiness(
    owner: AuthenticatedUser,
    query: ListBusinessRevisionsDto,
  ): Promise<RevisionRequest[]> {
    return this.prisma.revisionRequest.findMany({
      where: {
        businessId: owner.businessId ?? '',
        ...(query.status ? { status: query.status } : {}),
        ...(query.userId ? { userId: query.userId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async review(
    owner: AuthenticatedUser,
    id: string,
    dto: ReviewRevisionDto,
  ): Promise<RevisionRequest> {
    const revision = await this.prisma.revisionRequest.findUnique({ where: { id } });

    if (!revision || revision.businessId !== owner.businessId) {
      throw new NotFoundException('Revision request not found');
    }
    if (revision.status !== RevisionStatus.PENDING) {
      throw new ConflictException('Revision request has already been reviewed');
    }

    const status =
      dto.decision === RevisionDecision.APPROVED
        ? RevisionStatus.APPROVED
        : RevisionStatus.REJECTED;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.revisionRequest.update({
        where: { id: revision.id },
        data: {
          status,
          reviewedBy: owner.userId,
          reviewedAt: new Date(),
          decisionNote: dto.decisionNote ?? null,
        },
      });

      if (status === RevisionStatus.APPROVED) {
        await this.applyApproval(tx, revision);
      }

      return updated;
    });
  }

  // Materializes an approved revision onto the employee's attendance record.
  private async applyApproval(
    tx: Prisma.TransactionClient,
    revision: RevisionRequest,
  ): Promise<void> {
    const create: Prisma.AttendanceRecordCreateInput = {
      employment: { connect: { id: revision.employmentId } },
      businessId: revision.businessId,
      userId: revision.userId,
      date: revision.date,
    };
    const update: Prisma.AttendanceRecordUpdateInput = {};

    if (revision.type === RevisionType.LEAVE) {
      create.status = AttendanceStatus.ON_LEAVE;
      create.checkInAt = null;
      create.checkOutAt = null;
      update.status = AttendanceStatus.ON_LEAVE;
      update.checkInAt = null;
      update.checkOutAt = null;
    } else {
      if (revision.requestedCheckInAt) {
        create.checkInAt = revision.requestedCheckInAt;
        update.checkInAt = revision.requestedCheckInAt;
      }
      if (revision.requestedCheckOutAt) {
        create.checkOutAt = revision.requestedCheckOutAt;
        update.checkOutAt = revision.requestedCheckOutAt;
      }
      create.status = AttendanceStatus.PRESENT;
      update.status = AttendanceStatus.PRESENT;
    }

    await tx.attendanceRecord.upsert({
      where: {
        userId_businessId_date: {
          userId: revision.userId,
          businessId: revision.businessId,
          date: revision.date,
        },
      },
      create,
      update,
    });
  }
}
