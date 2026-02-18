import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import {
  FilterReservationDto,
  ConfirmReservationDto,
  CancelReservationDto,
  CheckAvailabilityDto,
} from './dto/filter-reservation.dto';
import { UserRole, ReservationStatus, VehicleStatus, UserStatus, ContractStatus } from '../../generated/prisma';
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
    let resolvedDailyRate = createReservationDto.dailyRate;
    if (createReservationDto.vehicleGroupId) {
      const group = await this.prisma.vehicleGroup.findUnique({
        where: { id: createReservationDto.vehicleGroupId },
      });

      if (!group) {
        throw new NotFoundException('Grupo de veículo não encontrado');
      }

      resolvedDailyRate = group.dailyRate;
    }

    if (createReservationDto.vehicleId && !createReservationDto.vehicleGroupId) {
      const assignedVehicle = await this.prisma.vehicle.findUnique({
        where: { id: createReservationDto.vehicleId },
        include: { group: true },
      });

      if (assignedVehicle?.group) {
        resolvedDailyRate = assignedVehicle.group.dailyRate;
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

    const { insuranceCost, insuranceType } = await this.resolveInsuranceCost(createReservationDto);

    // Preparar dados da reserva
    const pricing = await this.calculateReservationPricing(
      { ...createReservationDto, dailyRate: resolvedDailyRate, insuranceCost },
      pickupStation.country,
    );

    const depositPaid = await this.resolveDepositPaid(
      pricing.baseTotal,
      createReservationDto.depositPaid,
    );

    const reservationData: any = {
      reservationNumber,
      clientId,
      pickupStationId: createReservationDto.pickupStationId,
      returnStationId: createReservationDto.returnStationId,
      pickupDate: new Date(createReservationDto.pickupDate),
      returnDate: new Date(createReservationDto.returnDate),
      dailyRate: resolvedDailyRate,
      totalDays: createReservationDto.totalDays,
      estimatedTotal: pricing.baseTotal,
      depositPaid,
      includeInsurance: createReservationDto.includeInsurance || false,
      insuranceCost,
      insuranceType,
      additionalDrivers: createReservationDto.additionalDrivers || 0,
      additionalDriverCost: createReservationDto.additionalDriverCost || 0,
      extras,
      vehicleAmount: pricing.vehicleAmount,
      extrasAmount: pricing.extrasAmount,
      insuranceAmount: pricing.insuranceAmount,
      taxRate: pricing.taxRate,
      taxAmount: pricing.taxAmount,
      totalWithTax: pricing.totalWithTax,
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

    await this.ensureExtrasAvailability(
      createReservationDto.extras,
      createReservationDto.pickupStationId,
      new Date(createReservationDto.pickupDate),
      new Date(createReservationDto.returnDate),
    );

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
    const { page = 1, limit = 20, search, fromDate, toDate, ...filters } = filterDto;
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

    if (fromDate || toDate) {
      where.pickupDate = {
        ...(fromDate && { gte: new Date(fromDate) }),
        ...(toDate && { lte: new Date(toDate) }),
      };
    }

    if (search) {
      const parsedStationId = Number(search);
      const searchOr = [
        { reservationNumber: { contains: search, mode: 'insensitive' } },
        { client: { fullName: { contains: search, mode: 'insensitive' } } },
        { client: { email: { contains: search, mode: 'insensitive' } } },
        { client: { phone: { contains: search, mode: 'insensitive' } } },
        { vehicle: { licensePlate: { contains: search, mode: 'insensitive' } } },
        { pickupStation: { name: { contains: search, mode: 'insensitive' } } },
        { returnStation: { name: { contains: search, mode: 'insensitive' } } },
        ...(!Number.isNaN(parsedStationId)
          ? [{ pickupStationId: parsedStationId }, { returnStationId: parsedStationId }]
          : []),
      ];

      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchOr }];
        delete where.OR;
      } else {
        where.OR = searchOr;
      }
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
              name: true,
              city: true,
            },
          },
          returnStation: {
            select: {
              id: true,
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

  async reopenReservation(id: number, userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (user.role !== UserRole.IT) {
      throw new ForbiddenException('Apenas IT pode reabrir reservas');
    }

    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: { contract: true },
    });

    if (!reservation) {
      throw new NotFoundException('Reserva não encontrada');
    }

    if (reservation.contract) {
      throw new BadRequestException('Não é possível reabrir reserva que já virou contrato');
    }

    if (
      reservation.status !== ReservationStatus.CANCELLED &&
      reservation.status !== ReservationStatus.COMPLETED
    ) {
      throw new BadRequestException('Apenas reservas canceladas ou completadas podem ser reabertas');
    }

    return this.prisma.reservation.update({
      where: { id },
      data: {
        status: ReservationStatus.PENDING,
        cancelledAt: null,
        cancelReason: null,
      },
      include: {
        client: true,
        vehicle: true,
        pickupStation: true,
        returnStation: true,
      },
    });
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

  private async calculateReservationPricing(
    dto: CreateReservationDto,
    country: string,
  ): Promise<{
    vehicleAmount: number;
    extrasAmount: number;
    insuranceAmount: number;
    baseTotal: number;
    taxRate: number | null;
    taxAmount: number | null;
    totalWithTax: number | null;
  }> {
    const vehicleAmount = dto.dailyRate * dto.totalDays;
    const insuranceAmount = dto.insuranceCost || 0;
    const extrasAmount = (dto.additionalDriverCost || 0) + (await this.calculateExtrasAmount(dto.extras));
    const baseTotal = dto.estimatedTotal || vehicleAmount + insuranceAmount + extrasAmount;

    const vatRate = await this.getVatRate(country);
    const taxAmount = vatRate != null ? baseTotal * vatRate : null;
    const totalWithTax = vatRate != null && taxAmount != null ? baseTotal + taxAmount : null;

    return {
      vehicleAmount,
      extrasAmount,
      insuranceAmount,
      baseTotal,
      taxRate: vatRate,
      taxAmount,
      totalWithTax,
    };
  }

  private async calculateExtrasAmount(extras: any): Promise<number> {
    if (!extras) {
      return 0;
    }

    const config = await this.getSystemConfig();
    const extrasConfig = Array.isArray(config?.extras) ? config.extras : [];
    const codes = Array.isArray(extras) ? extras : [];

    return codes.reduce((total, code) => {
      const item = extrasConfig.find((extra: any) => extra.code === code);
      if (!item || typeof item.price !== 'number') {
        return total;
      }
      return total + item.price;
    }, 0);
  }

  private async ensureExtrasAvailability(
    extras: any,
    stationId: number,
    pickupDate: Date,
    returnDate: Date,
  ): Promise<void> {
    if (!extras || !Array.isArray(extras)) {
      return;
    }

    const config = await this.getSystemConfig();
    const extrasConfig = Array.isArray(config?.extras) ? config.extras : [];
    const usageCounts = this.countExtras(extras);

    for (const [code, count] of Object.entries(usageCounts)) {
      const extraConfig = extrasConfig.find((extra: any) => extra.code === code);
      if (!extraConfig || !extraConfig.stockByStation) {
        continue;
      }

      const stock = extraConfig.stockByStation[String(stationId)];
      if (stock == null) {
        continue;
      }

      const reservedCount = await this.countExtrasReserved(code, stationId, pickupDate, returnDate);
      if (reservedCount + count > stock) {
        throw new BadRequestException(
          `Extra ${code} indisponivel para a estacao ${stationId}. Disponivel: ${stock - reservedCount}`,
        );
      }
    }
  }

  private countExtras(extras: string[]): Record<string, number> {
    return extras.reduce<Record<string, number>>((acc, code) => {
      acc[code] = (acc[code] || 0) + 1;
      return acc;
    }, {});
  }

  private async countExtrasReserved(
    code: string,
    stationId: number,
    pickupDate: Date,
    returnDate: Date,
  ): Promise<number> {
    const [reservationCount, contractCount] = await Promise.all([
      this.prisma.reservation.count({
        where: {
          pickupStationId: stationId,
          status: { in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED, ReservationStatus.ACTIVE] },
          pickupDate: { lte: returnDate },
          returnDate: { gte: pickupDate },
          extras: { contains: code },
        },
      }),
      this.prisma.contract.count({
        where: {
          pickupStationId: stationId,
          status: { in: [ContractStatus.DRAFT, ContractStatus.ACTIVE] },
          pickupDate: { lte: returnDate },
          plannedReturnDate: { gte: pickupDate },
          extras: { contains: code },
        },
      }),
    ]);

    return reservationCount + contractCount;
  }

  private async getVatRate(country: string): Promise<number | null> {
    const config = await this.getSystemConfig();
    const vatRates = Array.isArray(config?.systemSettings?.vatRates)
      ? config.systemSettings.vatRates
      : [];
    const entry = vatRates.find((rate: any) => rate.country === country);
    return entry?.rate ?? null;
  }

  private async resolveInsuranceCost(
    dto: CreateReservationDto,
  ): Promise<{ insuranceCost: number; insuranceType: string | null }> {
    if (!dto.includeInsurance) {
      return { insuranceCost: 0, insuranceType: null };
    }

    const config = await this.getSystemConfig();
    const insuranceTypes = Array.isArray(config?.insuranceTypes) ? config.insuranceTypes : [];
    const defaultCode =
      typeof config?.systemSettings?.defaultInsuranceType === 'string'
        ? config.systemSettings.defaultInsuranceType
        : null;

    const defaultType =
      insuranceTypes.find((item: any) => item?.isDefault) ||
      (defaultCode ? insuranceTypes.find((item: any) => item?.code === defaultCode) : null);

    const selectedType = dto.insuranceType
      ? insuranceTypes.find((item: any) => item?.code === dto.insuranceType)
      : defaultType;

    if (dto.insuranceType && !selectedType) {
      throw new BadRequestException('Tipo de seguro inválido');
    }

    const dailyCost =
      typeof selectedType?.dailyCost === 'number'
        ? selectedType.dailyCost
        : typeof config?.systemSettings?.insuranceDailyCost === 'number'
          ? config.systemSettings.insuranceDailyCost
          : 0;

    const defaultTotal = dailyCost * dto.totalDays;
    const providedCost = dto.insuranceCost ?? defaultTotal;

    if (providedCost < defaultTotal) {
      throw new BadRequestException('Valor do seguro não pode ser inferior ao default');
    }

    const insuranceType = selectedType?.code || defaultType?.code || null;

    return { insuranceCost: providedCost, insuranceType };
  }

  private async resolveDepositPaid(
    baseTotal: number,
    depositPaid?: number,
  ): Promise<number> {
    const config = await this.getSystemConfig();
    const rules = config?.systemSettings?.depositRules || {};
    const defaultPercentage =
      typeof rules.defaultDepositPercentage === 'number'
        ? rules.defaultDepositPercentage
        : typeof config?.systemSettings?.defaultDepositPercentage === 'number'
          ? config.systemSettings.defaultDepositPercentage
          : 0;

    const minDeposit = typeof rules.minDepositAmount === 'number' ? rules.minDepositAmount : null;
    const maxDeposit = typeof rules.maxDepositAmount === 'number' ? rules.maxDepositAmount : null;

    const defaultDeposit = (baseTotal * defaultPercentage) / 100;
    let resolved = depositPaid ?? defaultDeposit;

    if (depositPaid == null) {
      if (minDeposit != null && resolved < minDeposit) {
        resolved = minDeposit;
      }
      if (maxDeposit != null && resolved > maxDeposit) {
        resolved = maxDeposit;
      }
      return resolved;
    }

    if (minDeposit != null && resolved < minDeposit) {
      throw new BadRequestException('Caução abaixo do mínimo configurado');
    }

    if (maxDeposit != null && resolved > maxDeposit) {
      throw new BadRequestException('Caução acima do máximo configurado');
    }

    return resolved;
  }

  private async getSystemConfig(): Promise<any> {
    const configPath = path.join(process.cwd(), 'config', 'system.config.json');
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content);
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
        userCode: await this.generateUserCode('CLI'),
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

  private async generateUserCode(prefix: string): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const suffix = Math.floor(Math.random() * 1e6)
        .toString()
        .padStart(6, '0');
      const code = `${prefix}${suffix}`;

      const existing = await this.prisma.user.findUnique({
        where: { userCode: code },
        select: { id: true },
      });

      if (!existing) {
        return code;
      }
    }

    throw new BadRequestException('Não foi possível gerar userCode');
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
