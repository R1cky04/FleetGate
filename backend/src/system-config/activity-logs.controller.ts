import { Controller, Delete, Get, Query } from '@nestjs/common';
import { SystemConfigService } from './system-config.service';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtUser } from '../auth/types';

@Controller('activity-logs')
export class ActivityLogsController {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  @Get()
  findAll(
    @CurrentUser() user: JwtUser,
    @Query('search') search?: string,
    @Query('action') action?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Number(limit) : undefined;
    return this.systemConfigService.getActivityLogs(user.id, {
      search,
      action,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    });
  }

  @Delete()
  clear(@CurrentUser() user: JwtUser) {
    return this.systemConfigService.clearActivityLogs(user.id);
  }
}
