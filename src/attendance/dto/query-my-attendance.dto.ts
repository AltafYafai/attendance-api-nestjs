import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { DateRangeQueryDto } from '../../common/dto/date-range.dto';

export class QueryMyAttendanceDto extends DateRangeQueryDto {
  @ApiPropertyOptional({ description: 'Filter to a specific business', example: 'BIZ-AB12CD' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  businessId?: string;
}
