import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class StationsBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(StationsBootstrapService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.ensureDefaultStations();
  }

  private async ensureDefaultStations() {
    const defaults = [
      {
        name: 'Manutenção',
        isFictitious: true,
        purpose: 'MAINTENANCE',
        isPickupPoint: false,
        isReturnPoint: false,
      },
      {
        name: 'Roubadas',
        isFictitious: true,
        purpose: 'STOLEN',
        isPickupPoint: false,
        isReturnPoint: false,
      },
      {
        name: 'Lisboa',
        city: 'Lisboa',
        isFictitious: false,
      },
      {
        name: 'Porto',
        city: 'Porto',
        isFictitious: false,
      },
      {
        name: 'Faro',
        city: 'Faro',
        isFictitious: false,
      },
    ] as const;

    for (const station of defaults) {
      const existing = await this.prisma.station.findFirst({
        where: {
          name: {
            equals: station.name,
            mode: 'insensitive',
          },
        },
        select: { id: true },
      });

      if (!existing) {
        await this.prisma.station.create({
          data: {
            ...station,
            country: 'Portugal',
          },
        });
        this.logger.log(`Created default station: ${station.name}`);
      }
    }
  }
}
