import { IsEnum, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { VehicleStatus } from '../../../generated/prisma';
import { Type } from 'class-transformer';

export class FilterVehicleDto {
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  stationId?: number;

  @IsString()
  @IsOptional()
  groupId?: string;

  @IsEnum(VehicleStatus)
  @IsOptional()
  status?: VehicleStatus;

  @IsString()
  @IsOptional()
  make?: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  year?: number;

  @IsString()
  @IsOptional()
  search?: string; // Search by license plate, VIN, make, or model

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
