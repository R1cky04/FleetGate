import { Injectable, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '../generated/prisma';
import { TenantContextService } from './shared/services/tenant-context.service';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly tenantScopedModels = new Set<string>([
    'User',
    'ClientProfile',
    'StaffProfile',
    'UserPermission',
    'Station',
    'Department',
    'VehicleGroup',
    'Vehicle',
    'Reservation',
    'Contract',
    'Payment',
    'Maintenance',
    'VehicleRepair',
    'VehicleTransfer',
    'AdditionalDriver',
    'DamageType',
    'Notification',
    'ActivityLog',
    'RecordLock',
    'SystemConfig',
  ]);

  constructor(private readonly tenantContext: TenantContextService) {
    super();

    this.$use(async (params, next) => {
      const tenantId = this.tenantContext.getTenantId();
      if (!tenantId || !params.model || !this.tenantScopedModels.has(params.model)) {
        return next(params);
      }

      switch (params.action) {
        case 'findUnique':
          params.action = 'findFirst';
          params.args = params.args || {};
          params.args.where = this.withTenantWhere(params.args.where, tenantId);
          break;
        case 'findUniqueOrThrow':
          params.action = 'findFirstOrThrow';
          params.args = params.args || {};
          params.args.where = this.withTenantWhere(params.args.where, tenantId);
          break;
        case 'findFirst':
        case 'findFirstOrThrow':
        case 'findMany':
        case 'count':
        case 'aggregate':
        case 'groupBy':
        case 'updateMany':
        case 'deleteMany':
          params.args = params.args || {};
          params.args.where = this.withTenantWhere(params.args.where, tenantId);
          break;
        case 'create':
          if (params.args?.data) {
            this.setTenantOnCreateInput(params.args.data, tenantId);
          }
          break;
        case 'createMany':
          if (Array.isArray(params.args?.data)) {
            for (const item of params.args.data) {
              this.setTenantOnCreateInput(item, tenantId);
            }
          } else if (params.args?.data) {
            this.setTenantOnCreateInput(params.args.data, tenantId);
          }
          break;
        case 'update':
        case 'delete': {
          const hasTenantAccess = await this.ensureTenantAccessForUniqueOperation(params, tenantId);
          if (!hasTenantAccess) {
            throw new NotFoundException('Record not found');
          }

          break;
        }
        case 'upsert': {
          const hasTenantAccess = await this.ensureTenantAccessForUniqueOperation(params, tenantId);

          if (params.args?.create) {
            this.setTenantOnCreateInput(params.args.create, tenantId);
          }
          break;
        }
        default:
          break;
      }

      return next(params);
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private withTenantWhere(where: Prisma.InputJsonValue | Record<string, unknown> | undefined, tenantId: number) {
    if (!where || (typeof where === 'object' && Object.keys(where).length === 0)) {
      return { tenantId };
    }

    return {
      AND: [where, { tenantId }],
    };
  }

  private setTenantOnCreateInput(data: Record<string, unknown>, tenantId: number) {
    if (data.tenantId === undefined || data.tenantId === null) {
      data.tenantId = tenantId;
    }
  }

  private async ensureTenantAccessForUniqueOperation(params: Prisma.MiddlewareParams, tenantId: number): Promise<boolean> {
    if (!params.model || !params.args?.where) {
      return false;
    }

    const delegateName = this.modelToDelegateName(params.model);
    const delegate = (this as any)[delegateName] as { findFirst?: (args: any) => Promise<any> } | undefined;
    if (!delegate?.findFirst) {
      return false;
    }

    const record = await delegate.findFirst({
      where: this.withTenantWhere(params.args.where, tenantId),
      select: { tenantId: true },
    });

    return Boolean(record);
  }

  private modelToDelegateName(modelName: string) {
    return `${modelName.charAt(0).toLowerCase()}${modelName.slice(1)}`;
  }
}
