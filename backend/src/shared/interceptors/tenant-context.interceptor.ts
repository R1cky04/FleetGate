import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtUser } from '../../auth/types';
import { TenantContextService } from '../services/tenant-context.service';

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(private readonly tenantContext: TenantContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ user?: JwtUser; headers?: Record<string, string | string[] | undefined> }>();
    const requestedTenantScope = String(request.headers?.['x-tenant-scope'] || '').toLowerCase();
    const shouldForceSelfTenantScope = requestedTenantScope === 'self';
    const userTenantId = typeof request.user?.tenantId === 'number' ? request.user.tenantId : null;

    const tenantId = request.user?.role === 'DEV'
      ? (shouldForceSelfTenantScope ? userTenantId : null)
      : userTenantId;

    return this.tenantContext.run(tenantId, () => next.handle());
  }
}