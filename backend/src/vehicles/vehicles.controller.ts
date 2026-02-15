import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { FilterVehicleDto } from './dto/filter-vehicle.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtUser } from '../auth/types';

@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  create(
    @Body() createVehicleDto: CreateVehicleDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.vehiclesService.create(createVehicleDto, user.id);
  }

  @Get()
  findAll(
    @Query() filterDto: FilterVehicleDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.vehiclesService.findAll(filterDto, user.id);
  }

  @Get('station/:stationId')
  getByStation(
    @Param('stationId') stationId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.vehiclesService.getVehiclesByStation(stationId, user.id);
  }

  @Get('available')
  getAvailable(
    @Query('stationId') stationId: string,
    @Query('pickupDate') pickupDate: string,
    @Query('returnDate') returnDate: string,
  ) {
    return this.vehiclesService.getAvailableVehicles(
      stationId,
      new Date(pickupDate),
      new Date(returnDate),
    );
  }

  @Get(':id/history')
  getHistory(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtUser) {
    return this.vehiclesService.getHistory(id, user.id);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtUser,
  ) {
    return this.vehiclesService.findOne(id, user.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateVehicleDto: UpdateVehicleDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.vehiclesService.update(id, updateVehicleDto, user.id);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtUser,
  ) {
    return this.vehiclesService.remove(id, user.id);
  }
}
