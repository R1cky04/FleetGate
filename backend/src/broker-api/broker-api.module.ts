import { Module } from '@nestjs/common';
import { BrokerApiController } from './broker-api.controller';
import { ReservationsModule } from '../reservations/reservations.module';

@Module({
  imports: [ReservationsModule],
  controllers: [BrokerApiController],
})
export class BrokerApiModule {}
