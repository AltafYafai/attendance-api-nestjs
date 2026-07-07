import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional } from 'class-validator';

// from/to are calendar dates (YYYY-MM-DD) or full ISO timestamps.
export class DateRangeQueryDto {
  @ApiPropertyOptional({ description: 'Start of range (inclusive)', example: '2026-07-01' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: 'End of range (inclusive)', example: '2026-07-31' })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
