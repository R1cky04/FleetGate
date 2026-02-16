import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RecordLockService } from '../services/record-lock.service';
import { JwtUser } from '../../auth/types';

/**
 * Interceptor para gerenciar locks em Contracts e Reservations
 * - GET: Adiciona informação de quem está a editar
 * - PUT/PATCH: Valida se o utilizador tem lock ativo
 */
@Injectable()
export class RecordLockInterceptor implements NestInterceptor {
  constructor(private lockService: RecordLockService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const user = request.user as JwtUser;

    const method = request.method;
    const path = request.path;
    const params = request.params;

    // Determinar se é um contrato ou reserva
    let entityType: 'Contract' | 'Reservation' | null = null;
    let entityId: string | null = null;

    if (path.includes('/contracts/') && params.id) {
      entityType = 'Contract';
      entityId = params.id;
    } else if (path.includes('/reservations/') && params.id) {
      entityType = 'Reservation';
      entityId = params.id;
    }

    // Se é GET, adicionar informação de lock
    if (method === 'GET' && entityType && entityId && user?.stationId) {
      const lockInfo = await this.lockService.getLockInfo(entityType, entityId, user.stationId);
      request.lockInfo = lockInfo;
    }

    // Se é PUT/PATCH/DELETE (edit), validar lock
    if (['PUT', 'PATCH', 'DELETE'].includes(method) && entityType && entityId && user?.stationId) {
      const lockInfo = await this.lockService.getLockInfo(entityType, entityId, user.stationId);

      // Se não tem lock ativo, não pode editar
      if (!lockInfo.isLocked) {
        throw new BadRequestException(
          `Deve adquirir um lock antes de editar este ${entityType.toLowerCase()}`
        );
      }

      // Se o lock é de outro utilizador, não pode editar
      if (lockInfo.lockedBy !== user.id) {
        throw new ConflictException(
          `${lockInfo.lockedByName} está a editar este ${entityType.toLowerCase()}. Volte a tentar mais tarde.`
        );
      }

      // Se está expirado, não pode editar
      if (lockInfo.isExpired) {
        throw new BadRequestException(
          `Seu lock expirou. Adquira um novo lock e tente novamente.`
        );
      }
    }

    // Processar requisição
    return next.handle().pipe(
      map((data) => {
        // Se é GET, adicionar lockInfo à resposta
        if (method === 'GET' && request.lockInfo) {
          // Se é um objeto com dados
          if (data && typeof data === 'object') {
            return {
              ...data,
              _lockInfo: request.lockInfo,
            };
          }
        }

        return data;
      })
    );
  }
}
