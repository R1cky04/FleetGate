import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator para extrair informações de lock do contexto da requisição
 * Preenchido pelo RecordLockInterceptor
 */
export const LockInfo = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.lockInfo || null;
});

/**
 * Interface para informação de lock
 */
export interface RecordLockInfo {
  isLocked: boolean;
  lockedBy?: {
    id: number;
    fullName: string;
  };
  lockedAt?: Date;
  expiresAt?: Date;
  isExpired?: boolean;
}
