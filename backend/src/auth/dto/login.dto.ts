import { IsString, MinLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @Matches(/^[A-Z0-9]+$/)
  userCode: string;

  @IsString()
  @MinLength(6)
  password: string;
}
