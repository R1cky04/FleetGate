import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

/**
 * Serviço para validações de estado de veículos
 * Verifica restricções baseadas no status do veículo
 */
@Injectable()
export class VehicleValidationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Verificar se um veículo está disponível para aluguel/reserva
   * Rejeita se está em IN_REPAIR, MAINTENANCE, ou OUT_OF_SERVICE
   */
  async validateVehicleAvailableForRental(vehicleId: number) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { id: true, licensePlate: true, status: true },
    });

    if (!vehicle) {
      return { isValid: false, reason: 'Vehicle not found' };
    }

    const unavailableStatuses = ['IN_REPAIR', 'MAINTENANCE', 'OUT_OF_SERVICE', 'RETIRED'];

    if (unavailableStatuses.includes(vehicle.status)) {
      return {
        isValid: false,
        reason: `Vehicle ${vehicle.licensePlate} is currently unavailable (${vehicle.status})`,
        vehicleStatus: vehicle.status,
      };
    }

    return { isValid: true };
  }

  /**
   * Verificar se um veículo está em reparação ativa
   */
  async isVehicleInActiveRepair(vehicleId: number) {
    const repair = await this.prisma.vehicleRepair.findFirst({
      where: {
        vehicleId,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
      select: { id: true, status: true, openedBy: { select: { fullName: true } } },
    });

    if (repair) {
      return { inRepair: true, repairId: repair.id, openedBy: repair.openedBy?.fullName };
    }

    return { inRepair: false };
  }

  /**
   * Obter informação de reparação ativa se existir
   */
  async getActiveRepairInfo(vehicleId: number) {
    return this.prisma.vehicleRepair.findFirst({
      where: {
        vehicleId,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
      select: {
        id: true,
        repairNumber: true,
        status: true,
        reason: true,
        openedAt: true,
        openedBy: { select: { id: true, fullName: true } },
        fromStation: { select: { id: true, code: true, name: true } },
      },
    });
  }

  /**
   * Lançar exceção se veículo estiver em reparação
   */
  async throwIfVehicleInRepair(vehicleId: number, context: string) {
    const repairInfo = await this.getActiveRepairInfo(vehicleId);

    if (repairInfo) {
      throw new ConflictException(
        `Cannot ${context}: Vehicle is in active repair. ` +
          `Repair: ${repairInfo.repairNumber}, Status: ${repairInfo.status}, ` +
          `Opened by: ${repairInfo.openedBy.fullName}`
      );
    }
  }
}
