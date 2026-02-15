import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
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
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { MetricsModule } from './metrics/metrics.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'default',
          ttl: 60000,
          limit: 100,
        },
        {
          name: 'login',
          ttl: 60000,
          limit: 5,
        },
      ],
    }),
    UsersModule,
    StationsModule,
    VehiclesModule,
    ContractsModule,
    ReservationsModule,
    BrokerApiModule,
    VehicleTransfersModule,
    PaymentsModule,
    SystemConfigModule,
    MetricsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
