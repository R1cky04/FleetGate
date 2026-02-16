import { createParamDecorator, ExecutionContext, applyDecorators, UseInterceptors } from '@nestjs/common';
import { NestInterceptor, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PrismaService } from '../../prisma.service';
import { ConflictException } from '@nestjs/common';

/**
 * Interceptor que valida se um veículo está em reparação (impro)
 * Usado para bloquear tentativas de criar reservações/contratos com carros em IN_REPAIR
 */
export class ValidateVehicleNotInRepairInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const body = request.body;
    const vehicleId = body?.vehicleId;

    if (vehicleId) {
      // Verificar se veículo está em reparação
      const repair = await this.prisma.vehicleRepair.findFirst({
        where: {
          vehicleId: parseInt(vehicleId, 10),
          status: { in: ['OPEN', 'IN_PROGRESS'] },
        },
        include: {
          openedBy: { select: { fullName: true } },
        },
      });

      if (repair) {
        throw new ConflictException(
          `Vehicle is currently in repair (${repair.repairNumber}). ` +
            `Opened by ${repair.openedBy.fullName}. ` +
            `Cannot create reservation/contract until repair is completed.`
        );
      }
    }

    return next.handle();
  }
}

/**
 * Decorator para usar o interceptor de validação
 * Usage: @ValidateVehicleNotInRepair() no controller method
 */
export function ValidateVehicleNotInRepair() {
  return applyDecorators(UseInterceptors(ValidateVehicleNotInRepairInterceptor));
}
