import { IsString, IsInt, IsOptional, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterReservationDto {
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  clientId?: number;

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  vehicleId?: number;

  @IsString()
  @IsOptional()
  stationId?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  search?: string; // Search by reservation number or client name

  @IsString()
  @IsOptional()
  source?: string; // Filter by source (broker, web, etc)

  @IsDateString()
  @IsOptional()
  fromDate?: string;

  @IsDateString()
  @IsOptional()
  toDate?: string;

  @IsInt()
  @Type(() => Number)
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @IsInt()
  @Type(() => Number)
  @Min(1)
  @IsOptional()
  limit?: number = 20;
}

export class ConfirmReservationDto {
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  vehicleId?: number; // Assign specific vehicle if not assigned yet

  @IsString()
  @IsOptional()
  clientNotes?: string;

  @IsString()
  @IsOptional()
  stationNotes?: string;
}

export class CancelReservationDto {
  @IsString()
  reason: string;

  @IsString()
  @IsOptional()
  clientNotes?: string;

  @IsString()
  @IsOptional()
  stationNotes?: string;
}

export class CheckAvailabilityDto {
  @IsString()
  pickupStationId: string;

  @IsString()
  returnStationId: string;

  @IsDateString()
  pickupDate: string;

  @IsDateString()
  returnDate: string;

  @IsString()
  @IsOptional()
  vehicleGroupId?: string; // Filter by group
}
