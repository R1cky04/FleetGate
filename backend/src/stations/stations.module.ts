import { Module } from '@nestjs/common';
import { StationsService } from './stations.service';
import { StationsController } from './stations.controller';
import { PrismaModule } from '../prisma.module';
import { StationsBootstrapService } from './stations-bootstrap.service';

@Module({
  imports: [PrismaModule],
  controllers: [StationsController],
  providers: [StationsService, StationsBootstrapService],
  exports: [StationsService],
})
export class StationsModule {}
