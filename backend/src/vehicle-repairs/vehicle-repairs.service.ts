import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import type { JwtUser } from '../auth/types';
import { v4 as uuidv4 } from 'uuid';

export interface CreateRepairDto {
  vehicleId: number;
  reason: string;
  description?: string;
  estimatedCost?: number;
  kmWhenOpened: number;
}

export interface CloseRepairDto {
  closedAtStationId: number;
  actualCost?: number;
  kmWhenClosed: number;
  notes?: string;
  internalNotes?: string;
}

@Injectable()
export class VehicleRepairsService {
  private readonly LOCK_DURATION_SECONDS = 300; // 5 minutes

  constructor(private prisma: PrismaService) {}

  /**
   * Marcar um carro como em reparação (impro)
   * - Muda status do veículo para IN_REPAIR
   * - Cria registo de reparação
   * @returns VehicleRepair record
   */
  async openRepair(
    createDto: CreateRepairDto,
    openedBy: JwtUser,
    stationId: number
  ) {
    // Verificar que o veículo existe
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: createDto.vehicleId },
      include: { repairs: { where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } } },
    });

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${createDto.vehicleId} not found`);
    }

    // Verificar que não está já em reparo
    if (vehicle.repairs && vehicle.repairs.length > 0) {
      throw new ConflictException(
        `Vehicle is already in repair. Active repairs: ${vehicle.repairs.map((r) => r.id).join(', ')}`
      );
    }

    // Verificar que o veículo não está em estado de aluguel/reserva
    if (vehicle.status === 'RENTED' || vehicle.status === 'RESERVED') {
      throw new ConflictException(
        `Cannot open repair: vehicle is currently ${vehicle.status.toLowerCase()}`
      );
    }

    // Criar reparação
    const repair = await this.prisma.vehicleRepair.create({
      data: {
        repairNumber: `RPR-${Date.now()}-${uuidv4().substring(0, 8)}`,
        vehicleId: createDto.vehicleId,
        fromStationId: stationId,
        reason: createDto.reason,
        description: createDto.description,
        estimatedCost: createDto.estimatedCost || 0,
        kmWhenOpened: createDto.kmWhenOpened,
        openedById: openedBy.id,
        status: 'OPEN',
      },
      include: {
        vehicle: { select: { id: true, licensePlate: true, make: true, model: true } },
        fromStation: { select: { id: true, name: true } },
        openedBy: { select: { id: true, fullName: true } },
      },
    });

    // Atualizar status do veículo para IN_REPAIR
    await this.prisma.vehicle.update({
      where: { id: createDto.vehicleId },
      data: { status: 'IN_REPAIR' },
    });

    return repair;
  }

  /**
   * Tentar adquirir lock exclusivo para fechar reparação
   * - Apenas um utilizador por vez pode fechar
   * - Lock dura 5 minutos
   */
  async acquireCloseLock(repairId: string, userId: number) {
    const repair = await this.prisma.vehicleRepair.findUnique({
      where: { id: repairId },
      include: { closedBy: true },
    });

    if (!repair) {
      throw new NotFoundException(`Repair with ID ${repairId} not found`);
    }

    if (repair.status === 'COMPLETED' || repair.status === 'CANCELLED') {
      throw new ConflictException(`Repair is already ${repair.status.toLowerCase()}`);
    }

    // Verificar se há lock ativo
    if (repair.lockedBy && repair.lockedExpires && new Date() < repair.lockedExpires) {
      if (repair.lockedBy !== userId) {
        const lockedByUser = await this.prisma.user.findUnique({
          where: { id: repair.lockedBy },
          select: { fullName: true },
        });
        throw new ConflictException(
          `${lockedByUser?.fullName || 'Another user'} is closing this repair`
        );
      }
    }

    // Adquirir ou renovar lock
    const expiresAt = new Date(Date.now() + this.LOCK_DURATION_SECONDS * 1000);
    await this.prisma.vehicleRepair.update({
      where: { id: repairId },
      data: {
        lockedBy: userId,
        lockedAt: new Date(),
        lockedExpires: expiresAt,
      },
    });

    return {
      repairId,
      lockedBy: userId,
      expiresAt,
      durationSeconds: this.LOCK_DURATION_SECONDS,
    };
  }

  /**
   * Renovar lock ativo para fechar reparação
   * - Estende expiration por mais 5 minutos
   * - Útil como heartbeat enquanto utilizador completa o processo
   */
  async renewCloseLock(repairId: string, userId: number) {
    const repair = await this.prisma.vehicleRepair.findUnique({
      where: { id: repairId },
    });

    if (!repair) {
      throw new NotFoundException(`Repair with ID ${repairId} not found`);
    }

    if (!repair.lockedBy || repair.lockedBy !== userId) {
      throw new ConflictException('You do not have the lock for this repair');
    }

    const expiresAt = new Date(Date.now() + this.LOCK_DURATION_SECONDS * 1000);
    await this.prisma.vehicleRepair.update({
      where: { id: repairId },
      data: {
        lockedExpires: expiresAt,
      },
    });

    return {
      repairId,
      lockedBy: userId,
      expiresAt,
      durationSeconds: this.LOCK_DURATION_SECONDS,
    };
  }

  /**
   * Liberar lock de fechamento de reparação
   */
  async releaseCloseLock(repairId: string, userId: number) {
    const repair = await this.prisma.vehicleRepair.findUnique({
      where: { id: repairId },
    });

    if (!repair) {
      throw new NotFoundException(`Repair with ID ${repairId} not found`);
    }

    if (!repair.lockedBy || repair.lockedBy !== userId) {
      throw new ConflictException('You do not have the lock for this repair');
    }

    await this.prisma.vehicleRepair.update({
      where: { id: repairId },
      data: {
        lockedBy: null,
        lockedAt: null,
        lockedExpires: null,
      },
    });

    return { message: 'Lock released' };
  }

  /**
   * Fechar reparação e disponibilizar carro na estação onde foi fechado
   * - Requer lock exclusivo
   * - Muda status para COMPLETED
   * - Move carro para estação de fechamento
   * - Atualiza status do carro para AVAILABLE
   */
  async closeRepair(
    repairId: string,
    closeDto: CloseRepairDto,
    closedBy: JwtUser
  ) {
    const closedAtStationId = Number(closeDto.closedAtStationId);
    if (Number.isNaN(closedAtStationId)) {
      throw new BadRequestException('closedAtStationId must be a number');
    }

    const repair = await this.prisma.vehicleRepair.findUnique({
      where: { id: repairId },
      include: {
        vehicle: true,
        closedAtStation: true,
      },
    });

    if (!repair) {
      throw new NotFoundException(`Repair with ID ${repairId} not found`);
    }

    // Validar lock exclusivo
    if (!repair.lockedBy || repair.lockedBy !== closedBy.id) {
      const lockedByUser = repair.lockedBy
        ? await this.prisma.user.findUnique({
            where: { id: repair.lockedBy },
            select: { fullName: true },
          })
        : null;
      throw new ConflictException(
        `Only ${lockedByUser?.fullName || 'the user who has the lock'} can close this repair`
      );
    }

    if (repair.lockedExpires && new Date() > repair.lockedExpires) {
      throw new ConflictException('Your lock has expired. Please acquire a new lock.');
    }

    if (repair.status === 'COMPLETED' || repair.status === 'CANCELLED') {
      throw new ConflictException(`Repair is already ${repair.status.toLowerCase()}`);
    }

    // Validar estação de fechamento
    const closedAtStation = await this.prisma.station.findUnique({
      where: { id: closedAtStationId },
    });

    if (!closedAtStation) {
      throw new NotFoundException(`Station ${closeDto.closedAtStationId} not found`);
    }

    // Fechar reparação e mover carro
    const updatedRepair = await this.prisma.$transaction(async (tx) => {
      // Fechar reparação
      const closed = await tx.vehicleRepair.update({
        where: { id: repairId },
        data: {
          status: 'COMPLETED',
          closedAt: new Date(),
          closedById: closedBy.id,
          closedAtStationId: closedAtStationId,
          actualCost: closeDto.actualCost,
          kmWhenClosed: closeDto.kmWhenClosed,
          notes: closeDto.notes,
          internalNotes: closeDto.internalNotes,
          lockedBy: null,
          lockedAt: null,
          lockedExpires: null,
        },
        include: {
          vehicle: true,
          closedAtStation: { select: { id: true, name: true } },
          closedBy: { select: { id: true, fullName: true } },
        },
      });

      // Mover carro para estação de fechamento e marcar como AVAILABLE
      await tx.vehicle.update({
        where: { id: repair.vehicleId },
        data: {
          status: 'AVAILABLE',
          stationId: closedAtStationId,
          currentKm: closeDto.kmWhenClosed,
        },
      });

      return closed;
    });

    return updatedRepair;
  }

  /**
   * Obter detalhes de uma reparação
   */
  async getRepair(repairId: string) {
    const repair = await this.prisma.vehicleRepair.findUnique({
      where: { id: repairId },
      include: {
        vehicle: { select: { id: true, licensePlate: true, make: true, model: true } },
        fromStation: { select: { id: true, name: true } },
        closedAtStation: { select: { id: true, name: true } },
        openedBy: { select: { id: true, fullName: true } },
        closedBy: { select: { id: true, fullName: true } },
      },
    });

    if (!repair) {
      throw new NotFoundException(`Repair with ID ${repairId} not found`);
    }

    return repair;
  }

  /**
   * Listar reparações de um veículo
   */
  async getVehicleRepairs(vehicleId: number, status?: string) {
    return this.prisma.vehicleRepair.findMany({
      where: {
        vehicleId,
        ...(status && { status: status as any }),
      },
      include: {
        fromStation: { select: { id: true, name: true } },
        closedAtStation: { select: { id: true, name: true } },
        openedBy: { select: { id: true, fullName: true } },
        closedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { openedAt: 'desc' },
    });
  }

  /**
   * Listar reparações abertas (status OPEN ou IN_PROGRESS)
   */
  async getOpenRepairs(stationId: number) {
    return this.prisma.vehicleRepair.findMany({
      where: {
        fromStationId: stationId,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
      include: {
        vehicle: { select: { id: true, licensePlate: true, make: true, model: true } },
        openedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { openedAt: 'desc' },
    });
  }

  /**
   * Cancelar reparação
   */
  async cancelRepair(repairId: string, cancelledBy: JwtUser, reason: string) {
    const repair = await this.prisma.vehicleRepair.findUnique({
      where: { id: repairId },
    });

    if (!repair) {
      throw new NotFoundException(`Repair with ID ${repairId} not found`);
    }

    if (repair.status === 'COMPLETED' || repair.status === 'CANCELLED') {
      throw new ConflictException(`Repair is already ${repair.status.toLowerCase()}`);
    }

    const cancelled = await this.prisma.$transaction(async (tx) => {
      // Cancelar reparação
      const result = await tx.vehicleRepair.update({
        where: { id: repairId },
        data: {
          status: 'CANCELLED',
          closedAt: new Date(),
          closedById: cancelledBy.id,
          internalNotes: `Cancelled: ${reason}`,
          lockedBy: null,
          lockedAt: null,
          lockedExpires: null,
        },
        include: {
          vehicle: true,
          closedBy: { select: { id: true, fullName: true } },
        },
      });

      // Se o carro ainda está em IN_REPAIR, mover para AVAILABLE
      if (repair.vehicleId) {
        const vehicle = await tx.vehicle.findUnique({
          where: { id: repair.vehicleId },
        });
        if (vehicle && vehicle.status === 'IN_REPAIR') {
          await tx.vehicle.update({
            where: { id: repair.vehicleId },
            data: { status: 'AVAILABLE' },
          });
        }
      }

      return result;
    });

    return cancelled;
  }

  /**
   * Roupa lock expirado (scheduled task ou manual)
   */
  async cleanupExpiredLocks() {
    const now = new Date();
    return this.prisma.vehicleRepair.updateMany({
      where: {
        lockedExpires: { lt: now },
        lockedBy: { not: null },
      },
      data: {
        lockedBy: null,
        lockedAt: null,
        lockedExpires: null,
      },
    });
  }
}
