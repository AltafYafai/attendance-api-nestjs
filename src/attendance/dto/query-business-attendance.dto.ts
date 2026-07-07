import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { DateRangeQueryDto } from '../../common/dto/date-range.dto';

export class QueryBusinessAttendanceDto extends DateRangeQueryDto {
  @ApiPropertyOptional({ description: 'Filter to a specific employee user id', example: '25-26-01' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  userId?: string;
}
