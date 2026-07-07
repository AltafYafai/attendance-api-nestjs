import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { AddEmployeeDto } from './dto/add-employee.dto';
import { ListEmployeesDto } from './dto/list-employees.dto';
import { EmploymentService } from './employment.service';

@ApiTags('employment')
@ApiBearerAuth('access-token')
@Controller()
export class EmploymentController {
  constructor(private readonly employmentService: EmploymentService) {}

  @Post('employees')
  @Roles(Role.OWNER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Owner: add or re-activate an employee by user id' })
  addEmployee(@CurrentUser() owner: AuthenticatedUser, @Body() dto: AddEmployeeDto) {
    return this.employmentService.addEmployee(owner, dto);
  }

  @Get('employees')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: "Owner: list the business's employees" })
  listEmployees(@CurrentUser() owner: AuthenticatedUser, @Query() query: ListEmployeesDto) {
    return this.employmentService.listEmployees(owner, query.status);
  }

  @Delete('employees/:userId')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Owner: deactivate an employment' })
  removeEmployee(@CurrentUser() owner: AuthenticatedUser, @Param('userId') userId: string) {
    return this.employmentService.removeEmployee(owner, userId);
  }

  @Get('me/employments')
  @ApiOperation({ summary: 'Employee: list businesses I actively belong to' })
  listMyEmployments(@CurrentUser() user: AuthenticatedUser) {
    return this.employmentService.listMyEmployments(user);
  }
}
