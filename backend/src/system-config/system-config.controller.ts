import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { SystemConfigService } from './system-config.service';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtUser } from '../auth/types';

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

  @Get('system-info')
  getSystemInfo(@CurrentUser() user: JwtUser) {
    return this.systemConfigService.getSystemInfo(user.id);
  }

  @Put('restart-services')
  restartServices(@CurrentUser() user: JwtUser) {
    return this.systemConfigService.restartServices(user.id);
  }

  @Get('tenants')
  getTenants(@CurrentUser() user: JwtUser) {
    return this.systemConfigService.getTenants(user.id);
  }

  @Post('tenants')
  createTenant(@Body() payload: Record<string, unknown>, @CurrentUser() user: JwtUser) {
    return this.systemConfigService.createTenant(user.id, payload);
  }

  @Put('tenants/:id')
  updateTenant(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: Record<string, unknown>,
    @CurrentUser() user: JwtUser,
  ) {
    return this.systemConfigService.updateTenant(user.id, id, payload);
  }

  @Post('tenants/:id/test-connection')
  testTenantConnection(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtUser) {
    return this.systemConfigService.testTenantConnection(user.id, id);
  }

  @Delete('tenants/:id')
  removeTenant(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtUser) {
    return this.systemConfigService.removeTenant(user.id, id);
  }
}
