import {
  IsString,
  IsInt,
  IsEnum,
  IsOptional,
  IsDateString,
  IsNumber,
  IsBoolean,
  IsEmail,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReservationStatus } from '../../../generated/prisma';

// DTO para dados de cliente (quando vem do broker)
export class ClientDataDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  phone: string;

  @IsString()
  @IsOptional()
  alternativePhone?: string;

  @IsString()
  @IsOptional()
  cpf?: string;

  @IsString()
  @IsOptional()
  nif?: string;

  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  licenseNumber?: string;

  @IsDateString()
  @IsOptional()
  licenseExpiry?: string;

  @IsDateString()
  @IsOptional()
  licenseIssueDate?: string;

  @IsString()
  @IsOptional()
  licenseCountry?: string;

  @IsString()
  @IsOptional()
  idCardNumber?: string;

  @IsDateString()
  @IsOptional()
  idCardExpiry?: string;
}

export class CreateReservationDto {
  // Pode ser clientId (cliente existente) OU clientData (novo cliente do broker)
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  clientId?: number;

  @ValidateNested()
  @Type(() => ClientDataDto)
  @IsOptional()
  clientData?: ClientDataDto;

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  vehicleId?: number; // Specific vehicle

  @IsString()
  @IsOptional()
  vehicleGroupId?: string; // Or just a vehicle group

  @IsString()
  pickupStationId: string;

  @IsString()
  returnStationId: string;

  @IsDateString()
  pickupDate: string;

  @IsDateString()
  returnDate: string;

  @IsNumber()
  @Min(0)
  dailyRate: number;

  @IsInt()
  @Min(1)
  totalDays: number;

  @IsNumber()
  @Min(0)
  estimatedTotal: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  depositPaid?: number;

  @IsBoolean()
  @IsOptional()
  includeInsurance?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  insuranceCost?: number;

  @IsString()
  @IsOptional()
  insuranceType?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  additionalDrivers?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  additionalDriverCost?: number;

  @IsOptional()
  extras?: any; // JSON object

  @IsString()
  @IsOptional()
  clientNotes?: string;

  @IsString()
  @IsOptional()
  stationNotes?: string;

  // Para identificar se veio do broker
  @IsString()
  @IsOptional()
  brokerReference?: string;

  @IsString()
  @IsOptional()
  source?: string; // 'broker', 'web', 'phone', 'walk-in'
}
