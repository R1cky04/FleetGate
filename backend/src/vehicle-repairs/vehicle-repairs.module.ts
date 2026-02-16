import { Module } from '@nestjs/common';
import { VehicleRepairsService } from './vehicle-repairs.service';
import { VehicleRepairsController } from './vehicle-repairs.controller';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [VehicleRepairsService],
  controllers: [VehicleRepairsController],
  exports: [VehicleRepairsService],
})
export class VehicleRepairsModule {}
