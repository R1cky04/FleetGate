import { IsString, IsInt, IsEnum, IsOptional, IsBoolean, IsDateString, IsUrl, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { VehicleStatus } from '../../../generated/prisma';

export class CreateVehicleDto {
  @IsString()
  groupId: string;

  @IsInt()
  @Type(() => Number)
  stationId: number;

  @IsString()
  licensePlate: string;

  @IsString()
  vin: string;

  @IsString()
  make: string;

  @IsString()
  model: string;

  @IsInt()
  @Min(1900)
  year: number;

  @IsString()
  color: string;

  @IsEnum(VehicleStatus)
  @IsOptional()
  status?: VehicleStatus;

  @IsInt()
  @Min(0)
  @IsOptional()
  currentKm?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  lastServiceKm?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  nextServiceKm?: number;

  @IsDateString()
  @IsOptional()
  registrationDate?: string;

  @IsDateString()
  @IsOptional()
  registrationExpiry?: string;

  @IsString()
  @IsOptional()
  insuranceNumber?: string;

  @IsDateString()
  @IsOptional()
  insuranceExpiry?: string;

  @IsDateString()
  @IsOptional()
  inspectionExpiry?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsOptional()
  images?: string[]; // Will be serialized to JSON

  @IsBoolean()
  @IsOptional()
  isStolen?: boolean;

  @IsBoolean()
  @IsOptional()
  isSold?: boolean;

  @IsBoolean()
  @IsOptional()
  isBlocked?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
