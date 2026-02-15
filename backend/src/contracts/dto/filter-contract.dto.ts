import {
  IsDateString,
  IsInt,
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DamageMapItemDto } from './damage-map.dto';

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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DamageMapItemDto)
  @IsOptional()
  damagesIn?: DamageMapItemDto[];

  @IsString()
  @IsOptional()
  damageOnReturn?: string;

  @IsString()
  @IsOptional()
  clientNotes?: string;

  @IsString()
  @IsOptional()
  stationNotes?: string;

  @IsString()
  closeClientSignature: string;

  @IsString()
  closeStaffSignature: string;

  @IsBoolean()
  @IsOptional()
  confirmPaymentReceived?: boolean;

  @IsBoolean()
  @IsOptional()
  depositReturned?: boolean;
}

export class PreCloseContractDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DamageMapItemDto)
  @IsOptional()
  damagesIn?: DamageMapItemDto[];

  @IsString()
  @IsOptional()
  damageOnReturn?: string;

  @IsString()
  preCloseClientSignature: string;

  @IsString()
  preCloseStaffSignature: string;

  @IsString()
  @IsOptional()
  stationNotes?: string;
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

export class ExtendContractDto {
  @IsDateString()
  newPlannedReturnDate: string;

  @IsString()
  @IsOptional()
  stationNotes?: string;
}

export class ReopenContractDto {
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
