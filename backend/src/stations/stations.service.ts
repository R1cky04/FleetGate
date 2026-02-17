import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateStationDto } from './dto/create-station.dto';
import { UpdateStationDto } from './dto/update-station.dto';
import { UserRole } from '../users/enums/user-role.enum';

@Injectable()
export class StationsService {
  constructor(private prisma: PrismaService) {}

  async create(createStationDto: CreateStationDto, createdById: number) {
    // Validar que apenas IT pode criar estações
    const creator = await this.prisma.user.findUnique({
      where: { id: createdById },
    });

    if (!creator) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (creator.role !== UserRole.IT) {
      throw new ForbiddenException('Apenas IT pode criar estações');
    }

    // Verificar se código já existe
    const existing = await this.prisma.station.findUnique({
      where: { code: createStationDto.code },
    });

    if (existing) {
      throw new BadRequestException('Código de estação já existe');
    }

    const station = await this.prisma.station.create({
      data: createStationDto,
    });

    await this.logActivity(createdById, 'station.created', station.id, {
      code: station.code,
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

  async findOne(id: string) {
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

  async update(id: string, updateStationDto: UpdateStationDto, updatedById: number) {
    await this.findOne(id);

    // Validar permissões
    const updater = await this.prisma.user.findUnique({
      where: { id: updatedById },
    });

    if (!updater) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // IT pode atualizar qualquer estação
    // ADMIN só pode atualizar sua própria estação
    if (updater.role !== UserRole.IT) {
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

  async remove(id: string, deletedById: number) {
    await this.findOne(id);

    // Apenas IT pode deletar estações
    const deleter = await this.prisma.user.findUnique({
      where: { id: deletedById },
    });

    if (!deleter) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (deleter.role !== UserRole.IT) {
      throw new ForbiddenException('Apenas IT pode deletar estações');
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
      code: deleted.code,
      name: deleted.name,
    });

    return deleted;
  }

  private async logActivity(userId: number, action: string, stationId: string, details?: any) {
    try {
      await this.prisma.activityLog.create({
        data: {
          userId,
          action,
          entityType: 'Station',
          entityId: stationId,
          details: details ? JSON.stringify(details) : null,
        },
      });
    } catch (error) {
      console.error('Failed to log station activity:', error);
    }
  }
}
