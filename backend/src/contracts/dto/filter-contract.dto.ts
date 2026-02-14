import { IsDateString, IsInt, IsString, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CompleteContractDto {
  @IsDateString()
  actualReturnDate: string;

  @IsInt()
  @Min(0)
  kmIn: number;

  @IsString()
  fuelLevelIn: string; // '1/4', '1/2', '3/4', 'Full'

  @IsNumber()
  @Min(0)
  @IsOptional()
  fuelCharge?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  lateFee?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  damageCost?: number;

  @IsOptional()
  damagesIn?: any; // JSON array

  @IsString()
  @IsOptional()
  damageOnReturn?: string;

  @IsString()
  @IsOptional()
  clientNotes?: string;

  @IsString()
  @IsOptional()
  stationNotes?: string;

  @IsBoolean()
  @IsOptional()
  depositReturned?: boolean;
}

export class CancelContractDto {
  @IsString()
  reason: string;

  @IsString()
  @IsOptional()
  clientNotes?: string;

  @IsString()
  @IsOptional()
  stationNotes?: string;
}

export class FilterContractDto {
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
  search?: string; // Search by contract number or client name

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
