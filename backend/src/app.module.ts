import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma.module';
import { UsersModule } from './users/users.module';
import { StationsModule } from './stations/stations.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { ContractsModule } from './contracts/contracts.module';
import { ReservationsModule } from './reservations/reservations.module';
import { BrokerApiModule } from './broker-api/broker-api.module';
import { VehicleTransfersModule } from './vehicle-transfers/vehicle-transfers.module';
import { SystemConfigModule } from './system-config/system-config.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    StationsModule,
    VehiclesModule,
    ContractsModule,
    ReservationsModule,
    BrokerApiModule,
    VehicleTransfersModule,
    SystemConfigModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
