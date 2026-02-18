import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { GrantPermissionDto, MoveStaffDto, RevokePermissionDto } from './dto/user-permissions.dto';
import { UserRole, UserStatus } from './enums/user-role.enum';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtUser } from '../auth/types';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createUserDto: CreateUserDto, @CurrentUser() user: JwtUser) {
    return this.usersService.create(createUserDto, user.id);
  }

  @Get()
  findAll(
    @Query('role') role?: UserRole,
    @Query('status') status?: UserStatus,
    @Query('stationId') stationId?: string,
    @Query('customerType') customerType?: string,
    @Query('companyName') companyName?: string,
    @Query('brokerName') brokerName?: string,
    @Query('search') search?: string,
  ) {
    const stationIdValue = stationId ? Number(stationId) : undefined;
    return this.usersService.findAll({
      role,
      status,
      stationId: Number.isNaN(stationIdValue) ? undefined : stationIdValue,
      customerType,
      companyName,
      brokerName,
      search,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtUser) {
    return this.usersService.remove(id, user.id);
  }

  // ===== PERMISSIONS =====

  @Post('permissions/grant')
  grantPermissions(@Body() dto: GrantPermissionDto, @CurrentUser() user: JwtUser) {
    return this.usersService.grantPermissions(dto, user.id);
  }

  @Post('permissions/revoke')
  revokePermissions(@Body() dto: RevokePermissionDto, @CurrentUser() user: JwtUser) {
    return this.usersService.revokePermissions(dto, user.id);
  }

  @Get(':id/permissions')
  getUserPermissions(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.getUserPermissions(id);
  }

  // ===== STAFF MANAGEMENT =====

  @Post('staff/move')
  moveStaff(@Body() dto: MoveStaffDto, @CurrentUser() user: JwtUser) {
    return this.usersService.moveStaff(dto, user.id);
  }

  @Get('station/:stationId/staff')
  getStaffByStation(@Param('stationId', ParseIntPipe) stationId: number) {
    return this.usersService.getStaffByStation(stationId);
  }
}
