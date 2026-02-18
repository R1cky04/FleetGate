import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TenantContextService } from './shared/services/tenant-context.service';

@Global()
@Module({
  providers: [PrismaService, TenantContextService],
  exports: [PrismaService, TenantContextService],
})
export class PrismaModule {}
