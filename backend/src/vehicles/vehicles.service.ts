import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { FilterVehicleDto } from './dto/filter-vehicle.dto';
import { UserRole, VehicleStatus } from '../../generated/prisma';

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService) {}

  async create(createVehicleDto: CreateVehicleDto, userId: number) {
    // Verificar permissões do usuário
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Apenas FLEET, STAFF, ADMIN, IT, DEV podem criar veículos
    const allowedRoles: UserRole[] = [UserRole.FLEET, UserRole.STAFF, UserRole.ADMIN, UserRole.IT, UserRole.DEV];
    if (!allowedRoles.includes(user.role as UserRole)) {
      throw new ForbiddenException('Você não tem permissão para criar veículos');
    }

    // FLEET e STAFF só podem criar veículos na sua estação
    const stationRestrictedRoles: UserRole[] = [UserRole.FLEET, UserRole.STAFF];
    if (stationRestrictedRoles.includes(user.role as UserRole)) {
      if (!user.stationId) {
        throw new ForbiddenException('Usuário sem estação associada');
      }
      if (user.stationId !== createVehicleDto.stationId) {
        throw new ForbiddenException('Você só pode criar veículos na sua estação');
      }
    }

    // Verificar se a estação existe
    const station = await this.prisma.station.findUnique({
      where: { id: createVehicleDto.stationId },
    });

    if (!station) {
      throw new NotFoundException('Estação não encontrada');
    }

    // Verificar se o grupo existe
    const group = await this.prisma.vehicleGroup.findUnique({
      where: { id: createVehicleDto.groupId },
    });

    if (!group) {
      throw new NotFoundException('Grupo de veículo não encontrado');
    }

    // Verificar duplicados
    const existingVehicle = await this.prisma.vehicle.findFirst({
      where: {
        OR: [
          { licensePlate: createVehicleDto.licensePlate },
          { vin: createVehicleDto.vin },
        ],
      },
    });

    if (existingVehicle) {
      if (existingVehicle.licensePlate === createVehicleDto.licensePlate) {
        throw new BadRequestException('Já existe um veículo com esta matrícula');
      }
      if (existingVehicle.vin === createVehicleDto.vin) {
        throw new BadRequestException('Já existe um veículo com este VIN');
      }
    }

    // Serializar images array para JSON string
    const images = createVehicleDto.images ? JSON.stringify(createVehicleDto.images) : null;

    return this.prisma.vehicle.create({
      data: {
        ...createVehicleDto,
        images,
        status: createVehicleDto.status || VehicleStatus.AVAILABLE,
      },
      include: {
        group: true,
        station: true,
      },
    });
  }

  async findAll(filterDto: FilterVehicleDto, userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const { page = 1, limit = 20, search, ...filters } = filterDto;
    const skip = (page - 1) * limit;

    // Construir condições de filtro
    const where: any = {};

    // FLEET e STAFF só podem ver veículos da sua estação
    const stationRestrictedRolesFindAll: UserRole[] = [UserRole.FLEET, UserRole.STAFF];
    if (stationRestrictedRolesFindAll.includes(user.role as UserRole)) {
      if (!user.stationId) {
        throw new ForbiddenException('Usuário sem estação associada');
      }
      where.stationId = user.stationId;
    } else if (filters.stationId) {
      where.stationId = filters.stationId;
    }

    if (filters.groupId) {
      where.groupId = filters.groupId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.make) {
      where.make = { contains: filters.make, mode: 'insensitive' };
    }

    if (filters.model) {
      where.model = { contains: filters.model, mode: 'insensitive' };
    }

    if (filters.year) {
      where.year = filters.year;
    }

    if (filters.isStolen !== undefined) {
      where.isStolen = filters.isStolen;
    }

    if (filters.isSold !== undefined) {
      where.isSold = filters.isSold;
    }

    if (filters.isBlocked !== undefined) {
      where.isBlocked = filters.isBlocked;
    }

    if (search) {
      where.OR = [
        { licensePlate: { contains: search, mode: 'insensitive' } },
        { vin: { contains: search, mode: 'insensitive' } },
        { make: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [vehicles, total] = await Promise.all([
      this.prisma.vehicle.findMany({
        where,
        skip,
        take: limit,
        include: {
          group: true,
          station: {
            select: {
              id: true,
              name: true,
              city: true,
            },
          },
        },
        orderBy: { id: 'desc' },
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    return {
      data: vehicles,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number, userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: {
        group: true,
        station: true,
        reservations: {
          where: {
            status: {
              in: ['PENDING', 'CONFIRMED', 'ACTIVE'],
            },
          },
          orderBy: { pickupDate: 'asc' },
          take: 5,
        },
        contracts: {
          where: {
            status: {
              in: ['DRAFT', 'ACTIVE'],
            },
          },
          orderBy: { pickupDate: 'desc' },
          take: 5,
        },
        maintenances: {
          orderBy: { scheduledDate: 'desc' },
          take: 5,
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado');
    }

    // FLEET e STAFF só podem ver veículos da sua estação
    const stationRestrictedRolesFindOne: UserRole[] = [UserRole.FLEET, UserRole.STAFF];
    if (stationRestrictedRolesFindOne.includes(user.role as UserRole)) {
      if (!user.stationId) {
        throw new ForbiddenException('Usuário sem estação associada');
      }
      if (vehicle.stationId !== user.stationId) {
        throw new ForbiddenException('Você só pode visualizar veículos da sua estação');
      }
    }

    return vehicle;
  }

  async getHistory(id: number, userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
    });

    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado');
    }

    const stationRestrictedRoles: UserRole[] = [UserRole.FLEET, UserRole.STAFF, UserRole.ADMIN];
    if (stationRestrictedRoles.includes(user.role as UserRole)) {
      if (!user.stationId) {
        throw new ForbiddenException('Usuário sem estação associada');
      }
      if (vehicle.stationId !== user.stationId) {
        throw new ForbiddenException('Você só pode visualizar veículos da sua estação');
      }
    }

    const [reservations, contracts, transfers, maintenances] = await Promise.all([
      this.prisma.reservation.findMany({
        where: { vehicleId: id },
        select: {
          id: true,
          reservationNumber: true,
          status: true,
          pickupDate: true,
          returnDate: true,
          pickupStationId: true,
          returnStationId: true,
          clientId: true,
        },
        orderBy: { pickupDate: 'desc' },
      }),
      this.prisma.contract.findMany({
        where: { vehicleId: id },
        select: {
          id: true,
          contractNumber: true,
          status: true,
          pickupDate: true,
          plannedReturnDate: true,
          actualReturnDate: true,
          pickupStationId: true,
          returnStationId: true,
          clientId: true,
        },
        orderBy: { pickupDate: 'desc' },
      }),
      this.prisma.vehicleTransfer.findMany({
        where: { vehicleId: id },
        select: {
          id: true,
          transferNumber: true,
          status: true,
          scheduledDate: true,
          departureDate: true,
          arrivalDate: true,
          fromStationId: true,
          toStationId: true,
          driverId: true,
        },
        orderBy: { scheduledDate: 'desc' },
      }),
      this.prisma.maintenance.findMany({
        where: { vehicleId: id },
        select: {
          id: true,
          type: true,
          status: true,
          scheduledDate: true,
          startedAt: true,
          completedAt: true,
          cost: true,
        },
        orderBy: { scheduledDate: 'desc' },
      }),
    ]);

    return {
      vehicleId: id,
      reservations,
      contracts,
      transfers,
      maintenances,
    };
  }

  async update(id: number, updateVehicleDto: UpdateVehicleDto, userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Apenas FLEET, STAFF, ADMIN, IT, DEV podem atualizar veículos
    const allowedRoles: UserRole[] = [UserRole.FLEET, UserRole.STAFF, UserRole.ADMIN, UserRole.IT, UserRole.DEV];
    if (!allowedRoles.includes(user.role as UserRole)) {
      throw new ForbiddenException('Você não tem permissão para atualizar veículos');
    }

    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
    });

    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado');
    }

    // FLEET e STAFF só podem atualizar veículos da sua estação
    const stationRestrictedRoles: UserRole[] = [UserRole.FLEET, UserRole.STAFF];
    if (stationRestrictedRoles.includes(user.role as UserRole)) {
      if (!user.stationId) {
        throw new ForbiddenException('Usuário sem estação associada');
      }
      if (vehicle.stationId !== user.stationId) {
        throw new ForbiddenException('Você só pode atualizar veículos da sua estação');
      }
    }

    // Se estiver movendo o veículo entre estações
    if (updateVehicleDto.stationId && updateVehicleDto.stationId !== vehicle.stationId) {
      // Apenas ADMIN, IT e DEV podem mover veículos
      const adminRoles: UserRole[] = [UserRole.ADMIN, UserRole.IT, UserRole.DEV];
      if (!adminRoles.includes(user.role as UserRole)) {
        throw new ForbiddenException('Apenas ADMIN, IT e DEV podem mover veículos entre estações');
      }

      // Verificar se há contratos ou reservas ativas
      const activeRelations = await this.prisma.vehicle.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              reservations: {
                where: {
                  status: { in: ['PENDING', 'CONFIRMED', 'ACTIVE'] },
                },
              },
              contracts: {
                where: {
                  status: { in: ['DRAFT', 'ACTIVE'] },
                },
              },
            },
          },
        },
      });

      if (activeRelations) {
        if (activeRelations._count.reservations > 0) {
          throw new BadRequestException(
            `Não é possível mover veículo com ${activeRelations._count.reservations} reserva(s) ativa(s)`,
          );
        }
        if (activeRelations._count.contracts > 0) {
          throw new BadRequestException(
            `Não é possível mover veículo com ${activeRelations._count.contracts} contrato(s) ativo(s)`,
          );
        }
      }

      // Verificar se a nova estação existe
      const newStation = await this.prisma.station.findUnique({
        where: { id: updateVehicleDto.stationId },
      });

      if (!newStation) {
        throw new NotFoundException('Nova estação não encontrada');
      }
    }

    // Verificar duplicados se matricula ou VIN estão sendo alterados
    if (updateVehicleDto.licensePlate || updateVehicleDto.vin) {
      const existingVehicle = await this.prisma.vehicle.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(updateVehicleDto.licensePlate ? [{ licensePlate: updateVehicleDto.licensePlate }] : []),
            ...(updateVehicleDto.vin ? [{ vin: updateVehicleDto.vin }] : []),
          ],
        },
      });

      if (existingVehicle) {
        if (existingVehicle.licensePlate === updateVehicleDto.licensePlate) {
          throw new BadRequestException('Já existe um veículo com esta matrícula');
        }
        if (existingVehicle.vin === updateVehicleDto.vin) {
          throw new BadRequestException('Já existe um veículo com este VIN');
        }
      }
    }

    // Serializar images array para JSON string se fornecido
    const images = updateVehicleDto.images ? JSON.stringify(updateVehicleDto.images) : undefined;
    const { images: _, ...dataWithoutImages } = updateVehicleDto;

    return this.prisma.vehicle.update({
      where: { id },
      data: {
        ...dataWithoutImages,
        ...(images !== undefined && { images }),
      },
      include: {
        group: true,
        station: true,
      },
    });
  }

  async remove(id: number, userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Apenas DEV/IT podem deletar veículos
    if (user.role !== UserRole.DEV && user.role !== UserRole.IT) {
      throw new ForbiddenException('Apenas DEV/IT podem deletar veículos');
    }

    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            reservations: true,
            contracts: true,
            maintenances: true,
          },
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado');
    }

    // Verificar se há relações existentes
    if (vehicle._count.reservations > 0) {
      throw new BadRequestException(
        `Não é possível deletar veículo com ${vehicle._count.reservations} reserva(s) associada(s)`,
      );
    }

    if (vehicle._count.contracts > 0) {
      throw new BadRequestException(
        `Não é possível deletar veículo com ${vehicle._count.contracts} contrato(s) associado(s)`,
      );
    }

    if (vehicle._count.maintenances > 0) {
      throw new BadRequestException(
        `Não é possível deletar veículo com ${vehicle._count.maintenances} manutenção(ões) associada(s)`,
      );
    }

    return this.prisma.vehicle.delete({
      where: { id },
    });
  }

  async getVehiclesByStation(stationId: number, userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // FLEET e STAFF só podem ver veículos da sua estação
    const stationRestrictedRolesGetByStation: UserRole[] = [UserRole.FLEET, UserRole.STAFF];
    if (stationRestrictedRolesGetByStation.includes(user.role as UserRole)) {
      if (!user.stationId) {
        throw new ForbiddenException('Usuário sem estação associada');
      }
      if (user.stationId !== stationId) {
        throw new ForbiddenException('Você só pode visualizar veículos da sua estação');
      }
    }

    const vehicles = await this.prisma.vehicle.findMany({
      where: { stationId },
      include: {
        group: true,
      },
      orderBy: { licensePlate: 'asc' },
    });

    return vehicles;
  }

  async getAvailableVehicles(stationId: number, pickupDate: Date, returnDate: Date) {
    // Encontrar veículos disponíveis na estação que não têm conflitos de reserva/contrato
    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        stationId,
        status: VehicleStatus.AVAILABLE,
        isActive: true,
      },
      include: {
        group: true,
        reservations: {
          where: {
            status: {
              in: ['CONFIRMED', 'ACTIVE'],
            },
            OR: [
              {
                pickupDate: {
                  lte: returnDate,
                },
                returnDate: {
                  gte: pickupDate,
                },
              },
            ],
          },
        },
        contracts: {
          where: {
            status: {
              in: ['ACTIVE'],
            },
            OR: [
              {
                pickupDate: {
                  lte: returnDate,
                },
                plannedReturnDate: {
                  gte: pickupDate,
                },
              },
            ],
          },
        },
      },
    });

    // Filtrar veículos que não têm conflitos
    const availableVehicles = vehicles.filter(
      (vehicle) => vehicle.reservations.length === 0 && vehicle.contracts.length === 0,
    );

    return availableVehicles;
  }
}
