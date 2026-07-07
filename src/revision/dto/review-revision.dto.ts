import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum RevisionDecision {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class ReviewRevisionDto {
  @ApiProperty({ enum: RevisionDecision })
  @IsEnum(RevisionDecision)
  decision!: RevisionDecision;

  @ApiPropertyOptional({ description: 'Optional note explaining the decision' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  decisionNote?: string;
}
