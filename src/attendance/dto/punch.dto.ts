import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class PunchDto {
  @ApiPropertyOptional({
    description: 'Required only when the employee belongs to more than one business',
    example: 'BIZ-AB12CD',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  businessId?: string;
}
