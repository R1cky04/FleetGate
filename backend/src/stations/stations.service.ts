import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateStationDto } from './dto/create-station.dto';
import { UpdateStationDto } from './dto/update-station.dto';
import { UserRole } from '../users/enums/user-role.enum';
import { PrismaClient } from '../../generated/prisma';

@Injectable()
export class StationsService {
  constructor(private prisma: PrismaService) {}

  async create(createStationDto: CreateStationDto, createdById: number) {
    // Validar que apenas DEV/IT podem criar estações
    const creator = await this.prisma.user.findUnique({
      where: { id: createdById },
    });

    if (!creator) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (creator.role !== UserRole.DEV && creator.role !== UserRole.IT) {
      throw new ForbiddenException('Apenas DEV/IT podem criar estações');
    }

    await this.validateTenantForCreation((createStationDto as any).tenantId);

    const station = await this.prisma.station.create({
      data: createStationDto,
    });

    await this.logActivity(createdById, 'station.created', station.id, {
      name: station.name,
    });

    return station;
  }

  async findAll(filters?: {
    isActive?: boolean;
    isFictitious?: boolean;
    city?: string;
  }) {
    const where: any = {};

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.isFictitious !== undefined) {
      where.isFictitious = filters.isFictitious;
    }

    if (filters?.city) {
      where.city = { contains: filters.city, mode: 'insensitive' };
    }

    return this.prisma.station.findMany({
      where,
      include: {
        tenant: {
          select: {
            code: true,
          },
        },
        _count: {
          select: {
            users: true,
            vehicles: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    const station = await this.prisma.station.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            status: true,
          },
        },
        vehicles: {
          select: {
            id: true,
            licensePlate: true,
            make: true,
            model: true,
            status: true,
          },
        },
        _count: {
          select: {
            reservationsPickup: true,
            reservationsReturn: true,
            contractsPickup: true,
            contractsReturn: true,
          },
        },
      },
    });

    if (!station) {
      throw new NotFoundException('Estação não encontrada');
    }

    return station;
  }

  async update(id: number, updateStationDto: UpdateStationDto, updatedById: number) {
    await this.findOne(id);

    // Validar permissões
    const updater = await this.prisma.user.findUnique({
      where: { id: updatedById },
    });

    if (!updater) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // DEV/IT podem atualizar qualquer estação
    // ADMIN só pode atualizar sua própria estação
    if (updater.role !== UserRole.DEV && updater.role !== UserRole.IT) {
      if (updater.role !== UserRole.ADMIN || updater.stationId !== id) {
        throw new ForbiddenException('Você não tem permissão para atualizar esta estação');
      }
    }

    const station = await this.prisma.station.update({
      where: { id },
      data: updateStationDto,
    });

    await this.logActivity(updatedById, 'station.updated', id, {
      fields: Object.keys(updateStationDto || {}),
    });

    return station;
  }

  async remove(id: number, deletedById: number) {
    await this.findOne(id);

    // Apenas DEV/IT podem deletar estações
    const deleter = await this.prisma.user.findUnique({
      where: { id: deletedById },
    });

    if (!deleter) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (deleter.role !== UserRole.DEV && deleter.role !== UserRole.IT) {
      throw new ForbiddenException('Apenas DEV/IT podem deletar estações');
    }

    // Verificar se há usuários ou veículos associados
    const station = await this.prisma.station.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            vehicles: true,
          },
        },
      },
    });

    if (!station) {
      throw new NotFoundException('Estação não encontrada');
    }

    if (station._count.users > 0) {
      throw new BadRequestException(
        `Não é possível deletar estação com ${station._count.users} usuário(s) associado(s)`,
      );
    }

    if (station._count.vehicles > 0) {
      throw new BadRequestException(
        `Não é possível deletar estação com ${station._count.vehicles} veículo(s) associado(s)`,
      );
    }

    const deleted = await this.prisma.station.delete({
      where: { id },
    });

    await this.logActivity(deletedById, 'station.deleted', id, {
      name: deleted.name,
    });

    return deleted;
  }

  private async logActivity(userId: number, action: string, stationId: number, details?: any) {
    try {
      await this.prisma.activityLog.create({
        data: {
          userId,
          action,
          entityType: 'Station',
          entityId: String(stationId),
          details: details ? JSON.stringify(details) : null,
        },
      });
    } catch (error) {
      console.error('Failed to log station activity:', error);
    }
  }

  private async validateTenantForCreation(tenantId?: number) {
    if (!tenantId) {
      throw new BadRequestException('tenantId é obrigatório');
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { id: Number(tenantId) } });
    if (!tenant) {
      throw new BadRequestException('Tenant não encontrado');
    }

    if (!tenant.isActive) {
      throw new BadRequestException('Tenant está inativo');
    }

    if (tenant.dbMode === 'DEDICATED') {
      const connectionUrl = this.resolveTenantConnectionUrl(tenant);
      if (!connectionUrl) {
        throw new BadRequestException('Dedicated tenant database config is incomplete');
      }

      const dedicatedClient = new PrismaClient({
        datasources: {
          db: {
            url: connectionUrl,
          },
        },
      });

      try {
        await dedicatedClient.$connect();
        await dedicatedClient.$queryRaw`SELECT 1`;
      } catch {
        throw new BadRequestException('Dedicated tenant database is unreachable');
      } finally {
        await dedicatedClient.$disconnect();
      }
    }
  }

  private resolveTenantConnectionUrl(tenant: {
    dbUrl?: string | null;
    dbHost?: string | null;
    dbPort?: string | null;
    dbName?: string | null;
    dbUser?: string | null;
    dbPassword?: string | null;
  }): string | null {
    const dbUrl = String(tenant.dbUrl || '').trim();
    if (dbUrl) {
      return dbUrl;
    }

    const dbHost = String(tenant.dbHost || '').trim();
    const dbPort = String(tenant.dbPort || '').trim() || '5432';
    const dbName = String(tenant.dbName || '').trim();
    const dbUser = String(tenant.dbUser || '').trim();
    const dbPassword = String(tenant.dbPassword || '').trim();

    if (!dbHost || !dbName || !dbUser || !dbPassword) {
      return null;
    }

    return `postgresql://${encodeURIComponent(dbUser)}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}`;
  }
}
