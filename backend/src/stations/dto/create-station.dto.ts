import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsInt, IsLatitude, IsLongitude, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateStationDto {
  @IsInt()
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : Number(value)))
  tenantId?: number;

  @IsString()
  @MinLength(3)
  name: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

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
