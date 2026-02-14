import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import {
  FilterReservationDto,
  ConfirmReservationDto,
  CancelReservationDto,
  CheckAvailabilityDto,
} from './dto/filter-reservation.dto';
import { UserRole, ReservationStatus, VehicleStatus, UserStatus } from '../../generated/prisma';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ReservationsService {
  constructor(private prisma: PrismaService) {}

  async create(createReservationDto: CreateReservationDto, createdById?: number) {
    let clientId = createReservationDto.clientId;

    // Se tem dados de cliente (veio do broker), criar ou buscar cliente
    if (createReservationDto.clientData) {
      clientId = await this.createOrGetClient(createReservationDto.clientData);
    }

    if (!clientId) {
      throw new BadRequestException('Deve fornecer clientId ou clientData');
    }

    // Se tem createdById, verificar permissões
    if (createdById) {
      const user = await this.prisma.user.findUnique({
        where: { id: createdById },
      });

      if (!user) {
        throw new NotFoundException('Usuário não encontrado');
      }

      // Apenas STAFF, ADMIN, IT podem criar reservas
      const allowedRoles: UserRole[] = [UserRole.STAFF, UserRole.ADMIN, UserRole.IT];
      if (!allowedRoles.includes(user.role as UserRole)) {
        throw new ForbiddenException('Você não tem permissão para criar reservas');
      }

      // STAFF só pode criar reservas na sua estação
      if (user.role === UserRole.STAFF) {
        if (!user.stationId) {
          throw new ForbiddenException('Usuário sem estação associada');
        }
        if (user.stationId !== createReservationDto.pickupStationId) {
          throw new ForbiddenException('Você só pode criar reservas na sua estação');
        }
      }
    }

    // Verificar cliente existe
    const client = await this.prisma.user.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundException('Cliente não encontrado');
    }

    // Verificar estações existem
    const [pickupStation, returnStation] = await Promise.all([
      this.prisma.station.findUnique({ where: { id: createReservationDto.pickupStationId } }),
      this.prisma.station.findUnique({ where: { id: createReservationDto.returnStationId } }),
    ]);

    if (!pickupStation) {
      throw new NotFoundException('Estação de recolha não encontrada');
    }

    if (!returnStation) {
      throw new NotFoundException('Estação de devolução não encontrada');
    }

    // Se tem vehicleId específico, verificar disponibilidade
    if (createReservationDto.vehicleId) {
      const vehicle = await this.prisma.vehicle.findUnique({
        where: { id: createReservationDto.vehicleId },
      });

      if (!vehicle) {
        throw new NotFoundException('Veículo não encontrado');
      }

      // Verificar conflitos de agenda
      const hasConflict = await this.checkVehicleConflict(
        createReservationDto.vehicleId,
        new Date(createReservationDto.pickupDate),
        new Date(createReservationDto.returnDate),
      );

      if (hasConflict) {
        throw new BadRequestException('Veículo não disponível para as datas selecionadas');
      }
    }

    // Se tem vehicleGroupId, verificar que existe
    if (createReservationDto.vehicleGroupId) {
      const group = await this.prisma.vehicleGroup.findUnique({
        where: { id: createReservationDto.vehicleGroupId },
      });

      if (!group) {
        throw new NotFoundException('Grupo de veículo não encontrado');
      }
    }

    // Gerar número de reserva único
    const reservationNumber = await this.generateReservationNumber();

    // Serializar extras
    const extras = createReservationDto.extras
      ? JSON.stringify(createReservationDto.extras)
      : null;

    // Adicionar referência do broker às notas internas se houver
    let stationNotes = createReservationDto.stationNotes || '';
    if (createReservationDto.brokerReference) {
      stationNotes = `[BROKER] Ref: ${createReservationDto.brokerReference}\n${stationNotes}`.trim();
    }

    // Preparar dados da reserva
    const reservationData: any = {
      reservationNumber,
      clientId,
      pickupStationId: createReservationDto.pickupStationId,
      returnStationId: createReservationDto.returnStationId,
      pickupDate: new Date(createReservationDto.pickupDate),
      returnDate: new Date(createReservationDto.returnDate),
      dailyRate: createReservationDto.dailyRate,
      totalDays: createReservationDto.totalDays,
      estimatedTotal: createReservationDto.estimatedTotal,
      depositPaid: createReservationDto.depositPaid || 0,
      includeInsurance: createReservationDto.includeInsurance || false,
      insuranceCost: createReservationDto.insuranceCost || 0,
      additionalDrivers: createReservationDto.additionalDrivers || 0,
      additionalDriverCost: createReservationDto.additionalDriverCost || 0,
      extras,
      clientNotes: createReservationDto.clientNotes,
      stationNotes,
      status: ReservationStatus.PENDING,
      createdById: createdById || clientId,
    };

    // Adicionar vehicleId ou vehicleGroupId se fornecidos
    if (createReservationDto.vehicleId) {
      reservationData.vehicleId = createReservationDto.vehicleId;
    }
    if (createReservationDto.vehicleGroupId) {
      reservationData.vehicleGroupId = createReservationDto.vehicleGroupId;
    }

    // Criar reserva
    const reservation = await this.prisma.reservation.create({
      data: reservationData,
      include: {
        client: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
        vehicle: {
          include: {
            group: true,
          },
        },
        pickupStation: true,
        returnStation: true,
      },
    });

    // Se tem veículo específico, marcar como reservado
    if (createReservationDto.vehicleId) {
      await this.prisma.vehicle.update({
        where: { id: createReservationDto.vehicleId },
        data: { status: VehicleStatus.RESERVED },
      });
    }

    return reservation;
  }

  async findAll(filterDto: FilterReservationDto, userId?: number) {
    const { page = 1, limit = 20, search, ...filters } = filterDto;
    const skip = (page - 1) * limit;

    // Construir condições de filtro
    const where: any = {};

    // Se tem userId, verificar permissões
    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (user) {
        // STAFF só pode ver reservas da sua estação
        if (user.role === UserRole.STAFF) {
          if (user.stationId) {
            where.OR = [
              { pickupStationId: user.stationId },
              { returnStationId: user.stationId },
            ];
          }
        }
      }
    }

    if (filters.stationId) {
      where.OR = [
        { pickupStationId: filters.stationId },
        { returnStationId: filters.stationId },
      ];
    }

    if (filters.clientId) {
      where.clientId = filters.clientId;
    }

    if (filters.vehicleId) {
      where.vehicleId = filters.vehicleId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.source) {
      where.stationNotes = { contains: `[${filters.source.toUpperCase()}]`, mode: 'insensitive' };
    }

    if (search) {
      where.OR = [
        { reservationNumber: { contains: search, mode: 'insensitive' } },
        { client: { fullName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [reservations, total] = await Promise.all([
      this.prisma.reservation.findMany({
        where,
        skip,
        take: limit,
        include: {
          client: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
          vehicle: {
            include: {
              group: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                },
              },
            },
          },
          pickupStation: {
            select: {
              id: true,
              code: true,
              name: true,
              city: true,
            },
          },
          returnStation: {
            select: {
              id: true,
              code: true,
              name: true,
              city: true,
            },
          },
        },
        orderBy: { pickupDate: 'asc' },
      }),
      this.prisma.reservation.count({ where }),
    ]);

    return {
      data: reservations,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number, userId?: number) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        client: true,
        vehicle: {
          include: {
            group: true,
          },
        },
        pickupStation: true,
        returnStation: true,
        contract: true,
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reserva não encontrada');
    }

    // Se tem userId, verificar permissões
    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (user && user.role === UserRole.STAFF) {
        if (!user.stationId) {
          throw new ForbiddenException('Usuário sem estação associada');
        }
        if (
          reservation.pickupStationId !== user.stationId &&
          reservation.returnStationId !== user.stationId
        ) {
          throw new ForbiddenException('Você só pode visualizar reservas da sua estação');
        }
      }
    }

    return reservation;
  }

  async findByReservationNumber(reservationNumber: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { reservationNumber },
      include: {
        client: true,
        vehicle: {
          include: {
            group: true,
          },
        },
        pickupStation: true,
        returnStation: true,
        contract: true,
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reserva não encontrada');
    }

    return reservation;
  }

  async update(id: number, updateReservationDto: UpdateReservationDto, userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Apenas STAFF, ADMIN, IT podem atualizar reservas
    const allowedRoles: UserRole[] = [UserRole.STAFF, UserRole.ADMIN, UserRole.IT];
    if (!allowedRoles.includes(user.role as UserRole)) {
      throw new ForbiddenException('Você não tem permissão para atualizar reservas');
    }

    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        contract: true,
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reserva não encontrada');
    }

    // STAFF só pode atualizar reservas da sua estação
    if (user.role === UserRole.STAFF) {
      if (!user.stationId) {
        throw new ForbiddenException('Usuário sem estação associada');
      }
      if (
        reservation.pickupStationId !== user.stationId &&
        reservation.returnStationId !== user.stationId
      ) {
        throw new ForbiddenException('Você só pode atualizar reservas da sua estação');
      }
    }

    // Não pode alterar reservas completadas, canceladas ou que já viraram contrato
    const forbiddenStatuses: ReservationStatus[] = [
      ReservationStatus.COMPLETED,
      ReservationStatus.CANCELLED,
    ];
    if (forbiddenStatuses.includes(reservation.status as ReservationStatus)) {
      throw new BadRequestException('Não é possível alterar reservas completadas ou canceladas');
    }

    if (reservation.contract) {
      throw new BadRequestException('Não é possível alterar reserva que já virou contrato');
    }

    // Se está mudando o veículo, verificar disponibilidade
    if (updateReservationDto.vehicleId && updateReservationDto.vehicleId !== reservation.vehicleId) {
      const vehicle = await this.prisma.vehicle.findUnique({
        where: { id: updateReservationDto.vehicleId },
      });

      if (!vehicle) {
        throw new NotFoundException('Veículo não encontrado');
      }

      const hasConflict = await this.checkVehicleConflict(
        updateReservationDto.vehicleId,
        updateReservationDto.pickupDate
          ? new Date(updateReservationDto.pickupDate)
          : reservation.pickupDate,
        updateReservationDto.returnDate
          ? new Date(updateReservationDto.returnDate)
          : reservation.returnDate,
        id, // Excluir esta reserva da verificação
      );

      if (hasConflict) {
        throw new BadRequestException('Veículo não disponível para as datas selecionadas');
      }
    }

    // Serializar extras se fornecido
    const extras = updateReservationDto.extras
      ? JSON.stringify(updateReservationDto.extras)
      : undefined;

    const { extras: _, clientData: __, ...dataWithoutArrays } = updateReservationDto;

    return this.prisma.reservation.update({
      where: { id },
      data: {
        ...dataWithoutArrays,
        ...(extras !== undefined && { extras }),
        ...(updateReservationDto.pickupDate && {
          pickupDate: new Date(updateReservationDto.pickupDate),
        }),
        ...(updateReservationDto.returnDate && {
          returnDate: new Date(updateReservationDto.returnDate),
        }),
      },
      include: {
        client: true,
        vehicle: {
          include: {
            group: true,
          },
        },
        pickupStation: true,
        returnStation: true,
      },
    });
  }

  async confirmReservation(id: number, confirmDto: ConfirmReservationDto, userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const allowedRoles: UserRole[] = [UserRole.STAFF, UserRole.ADMIN, UserRole.IT];
    if (!allowedRoles.includes(user.role as UserRole)) {
      throw new ForbiddenException('Você não tem permissão para confirmar reservas');
    }

    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
    });

    if (!reservation) {
      throw new NotFoundException('Reserva não encontrada');
    }

    if (reservation.status !== ReservationStatus.PENDING) {
      throw new BadRequestException('Apenas reservas pendentes podem ser confirmadas');
    }

    // Se não tem veículo específico mas o confirmDto tem, atribuir agora
    let vehicleId = reservation.vehicleId;
    if (!vehicleId && confirmDto.vehicleId) {
      const vehicle = await this.prisma.vehicle.findUnique({
        where: { id: confirmDto.vehicleId },
      });

      if (!vehicle) {
        throw new NotFoundException('Veículo não encontrado');
      }

      // Verificar se pertence ao grupo certo (se reserva tem grupo)
      if (reservation.vehicleGroupId && vehicle.groupId !== reservation.vehicleGroupId) {
        throw new BadRequestException('Veículo não pertence ao grupo reservado');
      }

      // Verificar disponibilidade
      const hasConflict = await this.checkVehicleConflict(
        confirmDto.vehicleId,
        reservation.pickupDate,
        reservation.returnDate,
        id,
      );

      if (hasConflict) {
        throw new BadRequestException('Veículo não disponível para as datas selecionadas');
      }

      vehicleId = confirmDto.vehicleId;

      // Marcar veículo como reservado
      await this.prisma.vehicle.update({
        where: { id: vehicleId },
        data: { status: VehicleStatus.RESERVED },
      });
    }

    return this.prisma.reservation.update({
      where: { id },
      data: {
        status: ReservationStatus.CONFIRMED,
        vehicleId,
        confirmedAt: new Date(),
        clientNotes: confirmDto.clientNotes || reservation.clientNotes,
        stationNotes: confirmDto.stationNotes || reservation.stationNotes,
      },
      include: {
        client: true,
        vehicle: {
          include: {
            group: true,
          },
        },
        pickupStation: true,
        returnStation: true,
      },
    });
  }

  async cancelReservation(id: number, cancelDto: CancelReservationDto, userId?: number) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        vehicle: true,
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reserva não encontrada');
    }

    // Se tem userId, verificar permissões
    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (user) {
        const allowedRoles: UserRole[] = [UserRole.STAFF, UserRole.ADMIN, UserRole.IT];
        if (!allowedRoles.includes(user.role as UserRole)) {
          throw new ForbiddenException('Você não tem permissão para cancelar reservas');
        }
      }
    }

    const forbiddenStatuses: ReservationStatus[] = [
      ReservationStatus.COMPLETED,
      ReservationStatus.ACTIVE,
    ];
    if (forbiddenStatuses.includes(reservation.status as ReservationStatus)) {
      throw new BadRequestException('Não é possível cancelar reservas ativas ou completadas');
    }

    // Atualizar reserva
    const updatedReservation = await this.prisma.reservation.update({
      where: { id },
      data: {
        status: ReservationStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: cancelDto.reason,
        clientNotes: cancelDto.clientNotes || reservation.clientNotes,
        stationNotes: cancelDto.stationNotes || reservation.stationNotes,
      },
      include: {
        client: true,
        vehicle: true,
        pickupStation: true,
        returnStation: true,
      },
    });

    // Liberar veículo se estava reservado
    if (
      reservation.vehicleId &&
      reservation.vehicle?.status === VehicleStatus.RESERVED
    ) {
      await this.prisma.vehicle.update({
        where: { id: reservation.vehicleId },
        data: { status: VehicleStatus.AVAILABLE },
      });
    }

    return updatedReservation;
  }

  async checkAvailability(checkDto: CheckAvailabilityDto) {
    const pickupDate = new Date(checkDto.pickupDate);
    const returnDate = new Date(checkDto.returnDate);

    // Buscar veículos disponíveis
    const where: any = {
      stationId: checkDto.pickupStationId,
      isActive: true,
      status: VehicleStatus.AVAILABLE,
    };

    if (checkDto.vehicleGroupId) {
      where.groupId = checkDto.vehicleGroupId;
    }

    const vehicles = await this.prisma.vehicle.findMany({
      where,
      include: {
        group: true,
        reservations: {
          where: {
            status: {
              in: ['CONFIRMED', 'ACTIVE'],
            },
            OR: [
              {
                pickupDate: { lte: returnDate },
                returnDate: { gte: pickupDate },
              },
            ],
          },
        },
        contracts: {
          where: {
            status: 'ACTIVE',
            OR: [
              {
                pickupDate: { lte: returnDate },
                plannedReturnDate: { gte: pickupDate },
              },
            ],
          },
        },
      },
    });

    // Filtrar veículos sem conflitos
    const availableVehicles = vehicles.filter(
      (vehicle) => vehicle.reservations.length === 0 && vehicle.contracts.length === 0,
    );

    // Agrupar por grupo de veículo
    const groupedAvailability = availableVehicles.reduce((acc, vehicle) => {
      const groupId = vehicle.groupId;
      if (!acc[groupId]) {
        acc[groupId] = {
          group: vehicle.group,
          availableCount: 0,
          vehicles: [],
        };
      }
      acc[groupId].availableCount++;
      acc[groupId].vehicles.push({
        id: vehicle.id,
        licensePlate: vehicle.licensePlate,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        color: vehicle.color,
      });
      return acc;
    }, {});

    return {
      pickupDate: checkDto.pickupDate,
      returnDate: checkDto.returnDate,
      pickupStationId: checkDto.pickupStationId,
      returnStationId: checkDto.returnStationId,
      availability: Object.values(groupedAvailability),
    };
  }

  async remove(id: number, userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Apenas IT pode deletar reservas
    if (user.role !== UserRole.IT) {
      throw new ForbiddenException('Apenas IT pode deletar reservas');
    }

    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        contract: true,
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reserva não encontrada');
    }

    // Não pode deletar reservas com contrato associado
    if (reservation.contract) {
      throw new BadRequestException('Não é possível deletar reserva com contrato associado');
    }

    return this.prisma.reservation.delete({
      where: { id },
    });
  }

  // Métodos auxiliares

  private async createOrGetClient(clientData: any): Promise<number> {
    // Tentar encontrar cliente existente por email, CPF ou NIF
    const existingClient = await this.prisma.user.findFirst({
      where: {
        OR: [
          ...(clientData.email ? [{ email: clientData.email }] : []),
          ...(clientData.cpf ? [{ cpf: clientData.cpf }] : []),
          ...(clientData.nif ? [{ nif: clientData.nif }] : []),
        ],
      },
    });

    if (existingClient) {
      return existingClient.id;
    }

    // Criar novo cliente
    const fullName = `${clientData.firstName} ${clientData.lastName}`;

    const newClient = await this.prisma.user.create({
      data: {
        email: clientData.email,
        role: UserRole.CLIENT,
        status: UserStatus.ACTIVE,
        firstName: clientData.firstName,
        lastName: clientData.lastName,
        fullName,
        phone: clientData.phone,
        alternativePhone: clientData.alternativePhone,
        cpf: clientData.cpf,
        nif: clientData.nif,
        dateOfBirth: clientData.dateOfBirth ? new Date(clientData.dateOfBirth) : null,
        address: clientData.address,
        city: clientData.city,
        postalCode: clientData.postalCode,
        country: clientData.country || 'Portugal',
        licenseNumber: clientData.licenseNumber,
        licenseExpiry: clientData.licenseExpiry ? new Date(clientData.licenseExpiry) : null,
        licenseIssueDate: clientData.licenseIssueDate
          ? new Date(clientData.licenseIssueDate)
          : null,
        licenseCountry: clientData.licenseCountry,
        idCardNumber: clientData.idCardNumber,
        idCardExpiry: clientData.idCardExpiry ? new Date(clientData.idCardExpiry) : null,
      },
    });

    return newClient.id;
  }

  private async checkVehicleConflict(
    vehicleId: number,
    pickupDate: Date,
    returnDate: Date,
    excludeReservationId?: number,
  ): Promise<boolean> {
    // Verificar reservas conflitantes
    const conflictingReservations = await this.prisma.reservation.findMany({
      where: {
        vehicleId,
        id: excludeReservationId ? { not: excludeReservationId } : undefined,
        status: {
          in: ['CONFIRMED', 'ACTIVE'],
        },
        OR: [
          {
            pickupDate: { lte: returnDate },
            returnDate: { gte: pickupDate },
          },
        ],
      },
    });

    if (conflictingReservations.length > 0) {
      return true;
    }

    // Verificar contratos conflitantes
    const conflictingContracts = await this.prisma.contract.findMany({
      where: {
        vehicleId,
        status: 'ACTIVE',
        OR: [
          {
            pickupDate: { lte: returnDate },
            plannedReturnDate: { gte: pickupDate },
          },
        ],
      },
    });

    return conflictingContracts.length > 0;
  }

  private async generateReservationNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.reservation.count();
    const number = (count + 1).toString().padStart(6, '0');
    return `RV${year}${number}`;
  }
}
