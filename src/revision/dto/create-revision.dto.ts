import { RevisionType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateRevisionDto {
  @ApiPropertyOptional({
    description: 'Required only when the employee belongs to more than one business',
    example: 'BIZ-AB12CD',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  businessId?: string;

  @ApiProperty({
    description: 'Calendar day the revision applies to (YYYY-MM-DD or ISO timestamp)',
    example: '2026-07-07',
  })
  @IsISO8601()
  date!: string;

  @ApiProperty({ enum: RevisionType })
  @IsEnum(RevisionType)
  type!: RevisionType;

  @ApiPropertyOptional({ description: 'Requested check-in time', example: '2026-07-07T09:00:00Z' })
  @IsOptional()
  @IsISO8601()
  requestedCheckInAt?: string;

  @ApiPropertyOptional({ description: 'Requested check-out time', example: '2026-07-07T18:00:00Z' })
  @IsOptional()
  @IsISO8601()
  requestedCheckOutAt?: string;

  @ApiProperty({ description: 'Why the revision is needed', example: 'Forgot to punch out' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;
}
