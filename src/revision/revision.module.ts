import { Module } from '@nestjs/common';
import { EmploymentModule } from '../employment/employment.module';
import { RevisionController } from './revision.controller';
import { RevisionService } from './revision.service';

@Module({
  imports: [EmploymentModule],
  controllers: [RevisionController],
  providers: [RevisionService],
})
export class RevisionModule {}
