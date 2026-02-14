import { Module } from '@nestjs/common';
import { VehicleTransfersService } from './vehicle-transfers.service';
import { VehicleTransfersController } from './vehicle-transfers.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [VehicleTransfersController],
  providers: [VehicleTransfersService, PrismaService],
})
export class VehicleTransfersModule {}
