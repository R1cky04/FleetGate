import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { VehicleTransferStatus } from '../../../generated/prisma';

export class FilterVehicleTransferDto {
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  vehicleId?: number;

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  driverId?: number;

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  stationId?: number;

  @IsEnum(VehicleTransferStatus)
  @IsOptional()
  status?: VehicleTransferStatus;

  @IsString()
  @IsOptional()
  search?: string;

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

export class StartVehicleTransferDto {
  @IsDateString()
  @IsOptional()
  departureDate?: string;

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  kmAtDeparture?: number;
}

export class CompleteVehicleTransferDto {
  @IsDateString()
  @IsOptional()
  arrivalDate?: string;

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  kmAtArrival?: number;
}

export class CancelVehicleTransferDto {
  @IsString()
  reason: string;

  @IsString()
  @IsOptional()
  clientNotes?: string;

  @IsString()
  @IsOptional()
  stationNotes?: string;
}
