import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtUser } from '../../auth/types';
import { TenantContextService } from '../services/tenant-context.service';

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(private readonly tenantContext: TenantContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ user?: JwtUser }>();
    const tenantId = request.user?.role === 'DEV'
      ? null
      : (typeof request.user?.tenantId === 'number' ? request.user.tenantId : null);
    return this.tenantContext.run(tenantId, () => next.handle());
  }
}