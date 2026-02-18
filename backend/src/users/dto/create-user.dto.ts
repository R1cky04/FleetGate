import { IsEmail, IsEnum, IsOptional, IsString, IsBoolean, IsDateString, MinLength, Matches, IsUUID, IsInt } from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole } from '../enums/user-role.enum';

export class CreateUserDto {
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @Matches(/^[A-Z0-9]+$/)
  userCode: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(8)
  @IsOptional()
  password?: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsString()
  @MinLength(2)
  firstName: string;

  @IsString()
  @MinLength(2)
  lastName: string;

  @IsString()
  @Matches(/^[0-9]{9,15}$/)
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

  // Documentos (para clientes)
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

  // Profissional (para staff)
  @IsString()
  @IsOptional()
  employeeNumber?: string;

  @IsDateString()
  @IsOptional()
  hireDate?: string;

  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @IsInt()
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : Number(value)))
  stationId?: number;

  @IsInt()
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : Number(value)))
  tenantId?: number;

  // Configurações
  @IsBoolean()
  @IsOptional()
  acceptedTerms?: boolean;

  @IsBoolean()
  @IsOptional()
  acceptedMarketing?: boolean;
}
