import { RevisionStatus } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ListMyRevisionsDto {
  @ApiPropertyOptional({ enum: RevisionStatus })
  @IsOptional()
  @IsEnum(RevisionStatus)
  status?: RevisionStatus;
}

export class ListBusinessRevisionsDto {
  @ApiPropertyOptional({ enum: RevisionStatus })
  @IsOptional()
  @IsEnum(RevisionStatus)
  status?: RevisionStatus;

  @ApiPropertyOptional({ description: 'Filter to a specific employee user id', example: '25-26-01' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  userId?: string;
}
