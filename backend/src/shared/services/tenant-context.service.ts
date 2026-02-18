import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

interface TenantContextStore {
  tenantId: number | null;
}

@Injectable()
export class TenantContextService {
  private readonly asyncLocalStorage = new AsyncLocalStorage<TenantContextStore>();

  run<T>(tenantId: number | null, callback: () => T): T {
    return this.asyncLocalStorage.run({ tenantId }, callback);
  }

  getTenantId(): number | null {
    return this.asyncLocalStorage.getStore()?.tenantId ?? null;
  }
}