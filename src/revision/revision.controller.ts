import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateRevisionDto } from './dto/create-revision.dto';
import { ListBusinessRevisionsDto, ListMyRevisionsDto } from './dto/list-revisions.dto';
import { ReviewRevisionDto } from './dto/review-revision.dto';
import { RevisionService } from './revision.service';

@ApiTags('revisions')
@ApiBearerAuth('access-token')
@Controller('revisions')
export class RevisionController {
  constructor(private readonly revisionService: RevisionService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Employee: request a time correction or leave' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRevisionDto) {
    return this.revisionService.create(user, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Employee: list my revision requests' })
  listMine(@CurrentUser() user: AuthenticatedUser, @Query() query: ListMyRevisionsDto) {
    return this.revisionService.listMine(user, query);
  }

  @Get()
  @Roles(Role.OWNER)
  @ApiOperation({ summary: "Owner: list the business's revision requests" })
  listForBusiness(
    @CurrentUser() owner: AuthenticatedUser,
    @Query() query: ListBusinessRevisionsDto,
  ) {
    return this.revisionService.listForBusiness(owner, query);
  }

  @Patch(':id')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Owner: approve or reject a request (approval applies changes)' })
  review(
    @CurrentUser() owner: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReviewRevisionDto,
  ) {
    return this.revisionService.review(owner, id, dto);
  }
}
