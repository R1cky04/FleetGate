import {
  IsString,
  IsInt,
  IsEnum,
  IsOptional,
  IsDateString,
  IsNumber,
  IsBoolean,
  Min,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ContractStatus } from '../../../generated/prisma';

export class CreateContractDto {
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  reservationId?: number;

  @IsInt()
  @Type(() => Number)
  clientId: number;

  @IsInt()
  @Type(() => Number)
  vehicleId: number;

  @IsString()
  pickupStationId: string;

  @IsString()
  returnStationId: string;

  @IsDateString()
  pickupDate: string;

  @IsDateString()
  plannedReturnDate: string;

  @IsDateString()
  @IsOptional()
  actualPickupDate?: string;

  @IsInt()
  @Min(0)
  kmOut: number;

  @IsString()
  fuelLevelOut: string; // '1/4', '1/2', '3/4', 'Full'

  @IsNumber()
  @Min(0)
  dailyRate: number;

  @IsInt()
  @Min(1)
  totalDays: number;

  @IsNumber()
  @Min(0)
  subtotal: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  insuranceCost?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  extrasCost?: number;

  @IsNumber()
  @Min(0)
  totalAmount: number;

  @IsNumber()
  @Min(0)
  depositAmount: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  kmIncluded?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  extraKmCost?: number;

  @IsOptional()
  extras?: any; // JSON object

  @IsOptional()
  damagesOut?: any; // JSON array

  @IsString()
  @IsOptional()
  clientNotes?: string;

  @IsString()
  @IsOptional()
  stationNotes?: string;

  @IsString()
  @IsOptional()
  clientSignature?: string;

  @IsString()
  @IsOptional()
  staffSignature?: string;
}
