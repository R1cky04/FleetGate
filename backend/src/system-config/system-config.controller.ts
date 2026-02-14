import { Body, Controller, Get, Put } from '@nestjs/common';
import { SystemConfigService } from './system-config.service';

@Controller('system-config')
export class SystemConfigController {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  @Get()
  getConfig() {
    const userId = 1;
    return this.systemConfigService.getConfig(userId);
  }

  @Put()
  updateConfig(@Body() config: Record<string, unknown>) {
    const userId = 1;
    return this.systemConfigService.updateConfig(userId, config);
  }
}
