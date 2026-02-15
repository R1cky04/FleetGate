import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentStatus } from '../../../generated/prisma';

export class FilterPaymentDto {
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  contractId?: number;

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  clientId?: number;

  @IsEnum(PaymentStatus)
  @IsOptional()
  status?: PaymentStatus;
}
