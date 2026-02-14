import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { VehicleTransfersService } from './vehicle-transfers.service';
import { CreateVehicleTransferDto } from './dto/create-vehicle-transfer.dto';
import { UpdateVehicleTransferDto } from './dto/update-vehicle-transfer.dto';
import {
  CancelVehicleTransferDto,
  CompleteVehicleTransferDto,
  FilterVehicleTransferDto,
  StartVehicleTransferDto,
} from './dto/filter-vehicle-transfer.dto';

@Controller('vehicle-transfers')
export class VehicleTransfersController {
  constructor(private readonly vehicleTransfersService: VehicleTransfersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDto: CreateVehicleTransferDto) {
    const createdById = 1;
    return this.vehicleTransfersService.create(createDto, createdById);
  }

  @Get()
  findAll(@Query() filterDto: FilterVehicleTransferDto) {
    const userId = 1;
    return this.vehicleTransfersService.findAll(filterDto, userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const userId = 1;
    return this.vehicleTransfersService.findOne(id, userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateVehicleTransferDto) {
    const userId = 1;
    return this.vehicleTransfersService.update(id, updateDto, userId);
  }

  @Post(':id/start')
  start(@Param('id') id: string, @Body() startDto: StartVehicleTransferDto) {
    const userId = 1;
    return this.vehicleTransfersService.startTransfer(id, startDto, userId);
  }

  @Post(':id/complete')
  complete(@Param('id') id: string, @Body() completeDto: CompleteVehicleTransferDto) {
    const userId = 1;
    return this.vehicleTransfersService.completeTransfer(id, completeDto, userId);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @Body() cancelDto: CancelVehicleTransferDto) {
    const userId = 1;
    return this.vehicleTransfersService.cancelTransfer(id, cancelDto, userId);
  }
}
