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

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createReservationDto: CreateReservationDto) {
    // TODO: Get userId from JWT token
    const createdById = 1; // Temporary: replace with JWT user ID
    return this.reservationsService.create(createReservationDto, createdById);
  }

  @Get()
  findAll(@Query() filterDto: FilterReservationDto) {
    // TODO: Get userId from JWT token
    const userId = 1; // Temporary: replace with JWT user ID
    return this.reservationsService.findAll(filterDto, userId);
  }

  @Post('check-availability')
  checkAvailability(@Body() checkDto: CheckAvailabilityDto) {
    return this.reservationsService.checkAvailability(checkDto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    // TODO: Get userId from JWT token
    const userId = 1; // Temporary: replace with JWT user ID
    return this.reservationsService.findOne(id, userId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateReservationDto: UpdateReservationDto,
  ) {
    // TODO: Get userId from JWT token
    const userId = 1; // Temporary: replace with JWT user ID
    return this.reservationsService.update(id, updateReservationDto, userId);
  }

  @Post(':id/confirm')
  confirm(
    @Param('id', ParseIntPipe) id: number,
    @Body() confirmDto: ConfirmReservationDto,
  ) {
    // TODO: Get userId from JWT token
    const userId = 1; // Temporary: replace with JWT user ID
    return this.reservationsService.confirmReservation(id, confirmDto, userId);
  }

  @Post(':id/cancel')
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @Body() cancelDto: CancelReservationDto,
  ) {
    // TODO: Get userId from JWT token
    const userId = 1; // Temporary: replace with JWT user ID
    return this.reservationsService.cancelReservation(id, cancelDto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    // TODO: Get userId from JWT token
    const userId = 1; // Temporary: replace with JWT user ID
    return this.reservationsService.remove(id, userId);
  }
}
