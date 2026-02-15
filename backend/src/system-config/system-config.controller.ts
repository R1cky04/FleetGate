import { Body, Controller, Get, Put } from '@nestjs/common';
import { SystemConfigService } from './system-config.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtUser } from '../auth/types';

@Controller('system-config')
export class SystemConfigController {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  @Get()
  getConfig(@CurrentUser() user: JwtUser) {
    return this.systemConfigService.getConfig(user.id);
  }

  @Put()
  updateConfig(@Body() config: Record<string, unknown>, @CurrentUser() user: JwtUser) {
    return this.systemConfigService.updateConfig(user.id, config);
  }
}
