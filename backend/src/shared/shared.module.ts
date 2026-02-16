import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from '../prisma.module';
import { RecordLockService } from './services/record-lock.service';
import { VehicleValidationService } from './services/vehicle-validation.service';
import { StationIsolationGuard, RecordStationAccessGuard } from './guards/station-isolation.guard';
import { RecordLockInterceptor } from './interceptors/record-lock.interceptor';
import { LocksController } from './controllers/locks.controller';

@Module({
  imports: [PrismaModule],
  providers: [
    RecordLockService,
    VehicleValidationService,
    StationIsolationGuard,
    RecordStationAccessGuard,
    {
      provide: APP_INTERCEPTOR,
      useClass: RecordLockInterceptor,
    },
  ],
  exports: [RecordLockService, VehicleValidationService, StationIsolationGuard, RecordStationAccessGuard],
  controllers: [LocksController],
})
export class SharedModule {}
