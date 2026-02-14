import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVehicleTransferDto {
  @IsInt()
  @Type(() => Number)
  vehicleId: number;

  @IsString()
  fromStationId: string;

  @IsString()
  toStationId: string;

  @IsInt()
  @Type(() => Number)
  driverId: number;

  @IsDateString()
  scheduledDate: string;

  @IsString()
  reason: string;

  @IsString()
  @IsOptional()
  clientNotes?: string;

  @IsString()
  @IsOptional()
  stationNotes?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  cost?: number;
}
