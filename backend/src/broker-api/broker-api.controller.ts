import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ReservationsService } from '../reservations/reservations.service';
import { CreateReservationDto } from '../reservations/dto/create-reservation.dto';
import { CheckAvailabilityDto } from '../reservations/dto/filter-reservation.dto';
import { CancelReservationDto } from '../reservations/dto/filter-reservation.dto';
import { Public } from '../auth/public.decorator';

@Public()
@Controller('api/broker')
export class BrokerApiController {
  constructor(private readonly reservationsService: ReservationsService) {}

  /**
   * Create a new reservation from broker
   * POST /api/broker/reservations
   * Body: CreateReservationDto with clientData (required for broker)
   * Returns: Created reservation with reservationNumber
   */
  @Post('reservations')
  @HttpCode(HttpStatus.CREATED)
  async createReservation(@Body() createReservationDto: CreateReservationDto) {
    // Broker API must provide clientData, not clientId
    if (createReservationDto.clientId) {
      throw new BadRequestException(
        'Broker API must provide clientData, not clientId',
      );
    }

    if (!createReservationDto.clientData) {
      throw new BadRequestException('clientData is required for broker API');
    }

    // Broker reservations should have a source
    if (!createReservationDto.source) {
      throw new BadRequestException('source is required for broker API');
    }

    // Create reservation (userId = undefined for broker)
    // The service will create or find the client automatically
    const reservation = await this.reservationsService.create(
      createReservationDto,
      undefined, // No authenticated user for broker API
    );

    return {
      success: true,
      reservationNumber: reservation.reservationNumber,
      reservation,
    };
  }

  /**
   * Get reservation details by reservation number
   * GET /api/broker/reservations/:reservationNumber
   * Returns: Reservation details
   */
  @Get('reservations/:reservationNumber')
  async getReservation(@Param('reservationNumber') reservationNumber: string) {
    const reservation =
      await this.reservationsService.findByReservationNumber(reservationNumber);

    return {
      success: true,
      reservation,
    };
  }

  /**
   * Cancel reservation by reservation number
   * POST /api/broker/reservations/:reservationNumber/cancel
  * Body: { reason: string, clientNotes?: string, stationNotes?: string }
   * Returns: Cancelled reservation
   */
  @Post('reservations/:reservationNumber/cancel')
  async cancelReservation(
    @Param('reservationNumber') reservationNumber: string,
    @Body() cancelDto: CancelReservationDto,
  ) {
    // Find reservation by number
    const reservation =
      await this.reservationsService.findByReservationNumber(reservationNumber);

    // Cancel it (userId = undefined for broker)
    const cancelled = await this.reservationsService.cancelReservation(
      reservation.id,
      cancelDto,
      undefined,
    );

    return {
      success: true,
      reservation: cancelled,
    };
  }

  /**
   * Check vehicle availability
   * GET /api/broker/availability
   * Query: vehicleGroupId, stationId, startDate, endDate
   * Returns: List of available vehicles
   */
  @Get('availability')
  async checkAvailability(@Query() checkDto: CheckAvailabilityDto) {
    const availability =
      await this.reservationsService.checkAvailability(checkDto);

    return {
      success: true,
      ...availability,
    };
  }

  /**
   * Health check endpoint
   * GET /api/broker/health
   * Returns: API status
   */
  @Get('health')
  health() {
    return {
      success: true,
      message: 'Broker API is running',
      timestamp: new Date().toISOString(),
    };
  }
}
