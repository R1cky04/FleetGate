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
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtUser } from '../auth/types';

@Controller('vehicle-transfers')
export class VehicleTransfersController {
  constructor(private readonly vehicleTransfersService: VehicleTransfersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDto: CreateVehicleTransferDto, @CurrentUser() user: JwtUser) {
    return this.vehicleTransfersService.create(createDto, user.id);
  }

  @Get()
  findAll(@Query() filterDto: FilterVehicleTransferDto, @CurrentUser() user: JwtUser) {
    return this.vehicleTransfersService.findAll(filterDto, user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.vehicleTransfersService.findOne(id, user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateVehicleTransferDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.vehicleTransfersService.update(id, updateDto, user.id);
  }

  @Post(':id/start')
  start(
    @Param('id') id: string,
    @Body() startDto: StartVehicleTransferDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.vehicleTransfersService.startTransfer(id, startDto, user.id);
  }

  @Post(':id/complete')
  complete(
    @Param('id') id: string,
    @Body() completeDto: CompleteVehicleTransferDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.vehicleTransfersService.completeTransfer(id, completeDto, user.id);
  }

  @Post(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Body() cancelDto: CancelVehicleTransferDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.vehicleTransfersService.cancelTransfer(id, cancelDto, user.id);
  }
}
