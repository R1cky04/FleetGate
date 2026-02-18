import { IsArray, IsDateString, IsOptional, IsString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class GrantPermissionDto {
  @IsInt()
  @Type(() => Number)
  userId: number;

  @IsArray()
  @IsString({ each: true })
  permissions: string[];

  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}

export class RevokePermissionDto {
  @IsInt()
  @Type(() => Number)
  userId: number;

  @IsArray()
  @IsString({ each: true })
  permissions: string[];
}

export class MoveStaffDto {
  @IsInt()
  @Type(() => Number)
  userId: number;

  @IsInt()
  @Type(() => Number)
  newStationId: number;

  @IsString()
  @IsOptional()
  reason?: string;
}
