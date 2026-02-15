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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import {
  FilterReservationDto,
  ConfirmReservationDto,
  CancelReservationDto,
  CheckAvailabilityDto,
} from './dto/filter-reservation.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtUser } from '../auth/types';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() createReservationDto: CreateReservationDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.reservationsService.create(createReservationDto, user.id);
  }

  @Get()
  findAll(@Query() filterDto: FilterReservationDto, @CurrentUser() user: JwtUser) {
    return this.reservationsService.findAll(filterDto, user.id);
  }

  @Post('check-availability')
  checkAvailability(@Body() checkDto: CheckAvailabilityDto) {
    return this.reservationsService.checkAvailability(checkDto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtUser) {
    return this.reservationsService.findOne(id, user.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateReservationDto: UpdateReservationDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.reservationsService.update(id, updateReservationDto, user.id);
  }

  @Post(':id/confirm')
  confirm(
    @Param('id', ParseIntPipe) id: number,
    @Body() confirmDto: ConfirmReservationDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.reservationsService.confirmReservation(id, confirmDto, user.id);
  }

  @Post(':id/cancel')
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @Body() cancelDto: CancelReservationDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.reservationsService.cancelReservation(id, cancelDto, user.id);
  }

  @Post(':id/reopen')
  reopen(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtUser) {
    return this.reservationsService.reopenReservation(id, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtUser) {
    return this.reservationsService.remove(id, user.id);
  }
}
