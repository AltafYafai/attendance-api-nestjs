import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AddEmployeeDto {
  @ApiProperty({ description: "Employee's attendance-auth user id", example: '25-26-01' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  userId!: string;

  @ApiPropertyOptional({ description: 'Optional display username to store', example: 'ramesh' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  username?: string;
}
