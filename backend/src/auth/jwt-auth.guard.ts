import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      const request = context.switchToHttp().getRequest();
      const hasAuthorization = Boolean(request?.headers?.authorization);
      const path = request?.originalUrl || request?.url || 'unknown';
      const reason = info?.message || err?.message || 'Unauthorized';

      console.warn(`[JWT] Unauthorized ${path} | authHeader=${hasAuthorization} | reason=${reason}`);
      throw err || new UnauthorizedException(reason);
    }

    return user;
  }
}
