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

@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  create(
    @Body() createVehicleDto: CreateVehicleDto,
  ) {
    // TODO: Get userId from JWT token
    const userId = 1; // Temporary: replace with JWT user ID
    return this.vehiclesService.create(createVehicleDto, userId);
  }

  @Get()
  findAll(
    @Query() filterDto: FilterVehicleDto,
  ) {
    // TODO: Get userId from JWT token
    const userId = 1; // Temporary: replace with JWT user ID
    return this.vehiclesService.findAll(filterDto, userId);
  }

  @Get('station/:stationId')
  getByStation(
    @Param('stationId') stationId: string,
  ) {
    // TODO: Get userId from JWT token
    const userId = 1; // Temporary: replace with JWT user ID
    return this.vehiclesService.getVehiclesByStation(stationId, userId);
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

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    // TODO: Get userId from JWT token
    const userId = 1; // Temporary: replace with JWT user ID
    return this.vehiclesService.findOne(id, userId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateVehicleDto: UpdateVehicleDto,
  ) {
    // TODO: Get userId from JWT token
    const userId = 1; // Temporary: replace with JWT user ID
    return this.vehiclesService.update(id, updateVehicleDto, userId);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
  ) {
    // TODO: Get userId from JWT token
    const userId = 1; // Temporary: replace with JWT user ID
    return this.vehiclesService.remove(id, userId);
  }
}
