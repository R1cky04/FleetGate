import { Injectable, CanActivate, ExecutionContext, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma.service';
import type { JwtUser } from '../../auth/types';

/**
 * Guard para validar isolamento de dados por estação
 * Use com @UseGuards(StationIsolationGuard)
 */
@Injectable()
export class StationIsolationGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtUser;

    // IT admin pode acessar tudo
    if (user.role === 'IT') {
      return true;
    }

    // Para outros roles, validar acesso à estação
    if (!user.stationId) {
      throw new ForbiddenException(
        'Utilizador sem estação atribuída não tem permissão'
      );
    }

    // Se é uma query que requer filtrado por estação, o serviço deve fazer isso
    return true;
  }
}

/**
 * Guard para validar se um registo pertence à estação do utilizador
 * Usado para Contract e Reservation
 */
@Injectable()
export class RecordStationAccessGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtUser;

    if (user.role === 'IT') {
      return true;
    }

    if (!user.stationId) {
      throw new ForbiddenException(
        'Utilizador sem estação atribuída não tem permissão'
      );
    }

    const params = request.params;

    // Determinar tipo de registo baseado na rota
    let entityType: 'Contract' | 'Reservation' = 'Contract';
    let recordId: number;

    if ('contractId' in params) {
      entityType = 'Contract';
      recordId = parseInt(params.contractId, 10);
    } else if ('reservationId' in params) {
      entityType = 'Reservation';
      recordId = parseInt(params.reservationId, 10);
    } else {
      return true; // Nenhuma validação necessária
    }

    // Validar acesso ao registo
    if (entityType === 'Contract') {
      const contract = await this.prisma.contract.findFirst({
        where: {
          id: recordId,
          pickupStationId: user.stationId,
        },
      });

      if (!contract) {
        throw new ForbiddenException(
          'Este contrato não está disponível para sua estação'
        );
      }
    } else if (entityType === 'Reservation') {
      const reservation = await this.prisma.reservation.findFirst({
        where: {
          id: recordId,
          pickupStationId: user.stationId,
        },
      });

      if (!reservation) {
        throw new ForbiddenException(
          'Esta reserva não está disponível para sua estação'
        );
      }
    }

    return true;
  }
}
