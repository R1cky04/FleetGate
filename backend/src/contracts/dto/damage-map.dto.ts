import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class DamageMapItemDto {
  @IsString()
  area: string; // e.g., "front-bumper", "left-door"

  @IsNumber()
  @Min(0)
  x: number; // normalized 0..1

  @IsNumber()
  @Min(0)
  y: number; // normalized 0..1

  @IsString()
  damageType: string; // matches system config damageTypes.name

  @IsString()
  @IsOptional()
  photoUrl?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
