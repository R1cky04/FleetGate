import { Injectable, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import type { Prisma } from '../../../generated/prisma';

export interface LockRequest {
  entityType: 'Contract' | 'Reservation' | 'Vehicle';
  entityId: string | number;
  userId: number;
  stationId: string;
  action?: 'edit' | 'preview' | 'process';
  ipAddress?: string;
  userAgent?: string;
  durationSeconds?: number; // Default 300 (5 minutos)
}

export interface LockInfo {
  isLocked: boolean;
  lockedBy?: number;
  lockedByName?: string;
  lockedAt?: Date;
  expiresAt?: Date;
  isExpired?: boolean;
  canUnlock?: boolean;
}

@Injectable()
export class RecordLockService {
  private readonly DEFAULT_LOCK_DURATION = 300; // 5 minutos

  constructor(private prisma: PrismaService) {}

  /**
   * Adquirir um lock exclusivo num registo
   * @throws ConflictException se o registo já está locked por outro utilizador
   */
  async acquireLock(request: LockRequest): Promise<RecordLock> {
    const durationSeconds = request.durationSeconds || this.DEFAULT_LOCK_DURATION;
    const expiresAt = new Date(Date.now() + durationSeconds * 1000);

    // Verificar se existe lock ativo
    const existingLock = await this.prisma.recordLock.findUnique({
      where: {
        entityType_entityId_stationId: {
          entityType: request.entityType,
          entityId: String(request.entityId),
          stationId: request.stationId,
        },
      },
      include: {
        user: {
          select: { id: true, fullName: true },
        },
      },
    });

    if (existingLock && existingLock.isActive) {
      // Se o lock expirou, removê-lo
      if (new Date() > existingLock.expiresAt) {
        await this.prisma.recordLock.update({
          where: { id: existingLock.id },
          data: { isActive: false },
        });
      } else {
        // Se é do mesmo utilizador, renovar o lock
        if (existingLock.lockedBy === request.userId) {
          return await this.prisma.recordLock.update({
            where: { id: existingLock.id },
            data: {
              expiresAt,
              updatedAt: new Date(),
            },
            include: {
              user: {
                select: { id: true, fullName: true },
              },
            },
          });
        }

        // Lock está em uso por outro utilizador
        throw new ConflictException(
          `Este registo está siendo editado por ${existingLock.user.fullName}. Volte a tentar em alguns minutos.`
        );
      }
    }

    // Criar novo lock
    return await this.prisma.recordLock.create({
      data: {
        entityType: request.entityType,
        entityId: String(request.entityId),
        lockedBy: request.userId,
        stationId: request.stationId,
        action: request.action || 'edit',
        expiresAt,
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
        isActive: true,
      },
      include: {
        user: {
          select: { id: true, fullName: true },
        },
      },
    }) as any;
  }

  /**
   * Liberar um lock
   */
  async releaseLock(
    entityType: string,
    entityId: string | number,
    stationId: string,
    userId: number
  ): Promise<void> {
    const lock = await this.prisma.recordLock.findUnique({
      where: {
        entityType_entityId_stationId: {
          entityType,
          entityId: String(entityId),
          stationId,
        },
      },
    });

    if (!lock) {
      return; // Sem erro se não existe lock
    }

    // Apenas o utilizador que tem o lock pode liberá-lo
    if (lock.lockedBy !== userId) {
      throw new ForbiddenException('Apenas o utilizador que tem o lock pode liberá-lo');
    }

    await this.prisma.recordLock.update({
      where: { id: lock.id },
      data: { isActive: false },
    });
  }

  /**
   * Verificar informação de um lock
   */
  async getLockInfo(
    entityType: string,
    entityId: string | number,
    stationId: string
  ): Promise<LockInfo> {
    const lock = await this.prisma.recordLock.findUnique({
      where: {
        entityType_entityId_stationId: {
          entityType,
          entityId: String(entityId),
          stationId,
        },
      },
      include: {
        user: {
          select: { id: true, fullName: true },
        },
      },
    });

    if (!lock || !lock.isActive) {
      return { isLocked: false };
    }

    const now = new Date();
    const isExpired = now > lock.expiresAt;

    if (isExpired) {
      // Marcar como inativo se expirou
      await this.prisma.recordLock.update({
        where: { id: lock.id },
        data: { isActive: false },
      });
      return { isLocked: false };
    }

    return {
      isLocked: true,
      lockedBy: lock.lockedBy,
      lockedByName: lock.user?.fullName,
      lockedAt: lock.acquiredAt,
      expiresAt: lock.expiresAt,
      isExpired: false,
    };
  }

  /**
   * Renovar um lock existente
   */
  async renewLock(
    entityType: string,
    entityId: string | number,
    stationId: string,
    userId: number,
    durationSeconds?: number
  ): Promise<RecordLock> {
    const lock = await this.prisma.recordLock.findUnique({
      where: {
        entityType_entityId_stationId: {
          entityType,
          entityId: String(entityId),
          stationId,
        },
      },
    });

    if (!lock) {
      throw new BadRequestException('Nenhum lock encontrado para este registo');
    }

    if (lock.lockedBy !== userId) {
      throw new ForbiddenException(
        'Apenas o utilizador que tem o lock pode renová-lo'
      );
    }

    const expiresAt = new Date(
      Date.now() + (durationSeconds || this.DEFAULT_LOCK_DURATION) * 1000
    );

    return await this.prisma.recordLock.update({
      where: { id: lock.id },
      data: { expiresAt, updatedAt: new Date() },
      include: {
        user: {
          select: { id: true, fullName: true },
        },
      },
    });
  }

  /**
   * Limpar locks expirados
   */
  async cleanupExpiredLocks(): Promise<number> {
    const result = await this.prisma.recordLock.updateMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    return result.count;
  }

  /**
   * Verificar se um utilizador tem acesso a um registo (data isolation)
   */
  async validateStationAccess(
    userId: number,
    stationId: string
  ): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { stationId: true, role: true },
    });

    if (!user) {
      return false;
    }

    // IT pode acessar tudo
    if (user.role === 'IT') {
      return true;
    }

    // ADMIN, STAFF, FLEET só podem acessar sua estação
    return user.stationId === stationId;
  }
}

/**
 * Tipo para o modelo RecordLock do Prisma
 */
export type RecordLock = Prisma.RecordLockGetPayload<{
  include: {
    user: {
      select: { id: true; fullName: true };
    };
  };
}>;
