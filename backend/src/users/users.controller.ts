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

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createUserDto: CreateUserDto) {
    // TODO: Pegar userId do token JWT
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll(
    @Query('role') role?: UserRole,
    @Query('status') status?: UserStatus,
    @Query('stationId') stationId?: string,
    @Query('search') search?: string,
  ) {
    return this.usersService.findAll({ role, status, stationId, search });
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
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }

  // ===== PERMISSIONS =====

  @Post('permissions/grant')
  grantPermissions(@Body() dto: GrantPermissionDto) {
    // TODO: Pegar userId do token JWT
    const grantedBy = 1; // Temporary: replace with JWT user ID
    return this.usersService.grantPermissions(dto, grantedBy);
  }

  @Post('permissions/revoke')
  revokePermissions(@Body() dto: RevokePermissionDto) {
    // TODO: Pegar userId do token JWT
    const revokedBy = 1; // Temporary: replace with JWT user ID
    return this.usersService.revokePermissions(dto, revokedBy);
  }

  @Get(':id/permissions')
  getUserPermissions(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.getUserPermissions(id);
  }

  // ===== STAFF MANAGEMENT =====

  @Post('staff/move')
  moveStaff(@Body() dto: MoveStaffDto) {
    // TODO: Pegar userId do token JWT
    const movedBy = 1; // Temporary: replace with JWT user ID
    return this.usersService.moveStaff(dto, movedBy);
  }

  @Get('station/:stationId/staff')
  getStaffByStation(@Param('stationId') stationId: string) {
    return this.usersService.getStaffByStation(stationId);
  }
}
