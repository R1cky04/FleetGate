import { PartialType } from '@nestjs/mapped-types';
import { CreateVehicleTransferDto } from './create-vehicle-transfer.dto';

export class UpdateVehicleTransferDto extends PartialType(CreateVehicleTransferDto) {}
