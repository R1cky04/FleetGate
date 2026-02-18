import { PartialType } from '@nestjs/mapped-types';
import { CreateVehicleDto } from './create-vehicle.dto';
import { IsOptional, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateVehicleDto extends PartialType(CreateVehicleDto) {
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  stationId?: number; // Allow moving vehicles between stations
}
