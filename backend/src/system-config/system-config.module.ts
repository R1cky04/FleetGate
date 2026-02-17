import { Module } from '@nestjs/common';
import { SystemConfigController } from './system-config.controller';
import { ActivityLogsController } from './activity-logs.controller';
import { SystemConfigService } from './system-config.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [SystemConfigController, ActivityLogsController],
  providers: [SystemConfigService, PrismaService],
})
export class SystemConfigModule {}
