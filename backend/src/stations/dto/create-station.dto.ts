import { IsBoolean, IsEmail, IsLatitude, IsLongitude, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateStationDto {
  @IsString()
  @MinLength(3)
  code: string;

  @IsString()
  @MinLength(3)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  phone: string;

  @IsString()
  address: string;

  @IsString()
  city: string;

  @IsString()
  postalCode: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsLatitude()
  @IsOptional()
  latitude?: number;

  @IsLongitude()
  @IsOptional()
  longitude?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isPickupPoint?: boolean;

  @IsBoolean()
  @IsOptional()
  isReturnPoint?: boolean;

  @IsBoolean()
  @IsOptional()
  isFictitious?: boolean;

  @IsString()
  @IsOptional()
  purpose?: string; // STOLEN, MAINTENANCE, RETIRED

  @IsString()
  @IsOptional()
  openingHours?: string; // JSON
}
