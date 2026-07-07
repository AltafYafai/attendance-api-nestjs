import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { AttendanceService } from './attendance.service';
import { PunchDto } from './dto/punch.dto';
import { QueryBusinessAttendanceDto } from './dto/query-business-attendance.dto';
import { QueryMyAttendanceDto } from './dto/query-my-attendance.dto';

@ApiTags('attendance')
@ApiBearerAuth('access-token')
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('punch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Employee: punch (first of the day = check-in, next = check-out)' })
  punch(@CurrentUser() user: AuthenticatedUser, @Body() dto: PunchDto) {
    return this.attendanceService.punch(user, dto.businessId);
  }

  @Get('me')
  @ApiOperation({ summary: 'Employee: list my attendance records' })
  listMine(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryMyAttendanceDto) {
    return this.attendanceService.listMine(user, query);
  }

  @Get()
  @Roles(Role.OWNER)
  @ApiOperation({ summary: "Owner: list the business's attendance records" })
  listForBusiness(
    @CurrentUser() owner: AuthenticatedUser,
    @Query() query: QueryBusinessAttendanceDto,
  ) {
    return this.attendanceService.listForBusiness(owner, query);
  }
}
