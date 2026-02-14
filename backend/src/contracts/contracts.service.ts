import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { CancelContractDto, CompleteContractDto, FilterContractDto } from './dto/filter-contract.dto';
import { UserRole, ContractStatus, VehicleStatus, ReservationStatus } from '../../generated/prisma';

@Injectable()
export class ContractsService {
  constructor(private prisma: PrismaService) {}

  async create(createContractDto: CreateContractDto, createdById: number) {
    // Verificar permissões do usuário
    const user = await this.prisma.user.findUnique({
      where: { id: createdById },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Apenas STAFF, ADMIN, IT podem criar contratos
    const allowedRoles: UserRole[] = [UserRole.STAFF, UserRole.ADMIN, UserRole.IT];
    if (!allowedRoles.includes(user.role as UserRole)) {
      throw new ForbiddenException('Você não tem permissão para criar contratos');
    }

    // STAFF só pode criar contratos na sua estação
    if (user.role === UserRole.STAFF) {
      if (!user.stationId) {
        throw new ForbiddenException('Usuário sem estação associada');
      }
      if (user.stationId !== createContractDto.pickupStationId) {
        throw new ForbiddenException('Você só pode criar contratos na sua estação');
      }
    }

    // Verificar cliente existe
    const client = await this.prisma.user.findUnique({
      where: { id: createContractDto.clientId },
    });

    if (!client) {
      throw new NotFoundException('Cliente não encontrado');
    }

    if (client.role !== UserRole.CLIENT) {
      throw new BadRequestException('O usuário especificado não é um cliente');
    }

    // Verificar veículo existe e está disponível
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: createContractDto.vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado');
    }

    if (vehicle.status !== VehicleStatus.AVAILABLE) {
      throw new BadRequestException(`Veículo não está disponível (status: ${vehicle.status})`);
    }

    // Verificar estações existem
    const [pickupStation, returnStation] = await Promise.all([
      this.prisma.station.findUnique({ where: { id: createContractDto.pickupStationId } }),
      this.prisma.station.findUnique({ where: { id: createContractDto.returnStationId } }),
    ]);

    if (!pickupStation) {
      throw new NotFoundException('Estação de recolha não encontrada');
    }

    if (!returnStation) {
      throw new NotFoundException('Estação de devolução não encontrada');
    }

    // Se veio de uma reserva, verificar que existe
    let reservation: any | null = null;
    if (createContractDto.reservationId) {
      reservation = await this.prisma.reservation.findUnique({
        where: { id: createContractDto.reservationId },
      });

      if (!reservation) {
        throw new NotFoundException('Reserva não encontrada');
      }

      if (reservation.clientId !== createContractDto.clientId) {
        throw new BadRequestException('Reserva não pertence a este cliente');
      }

      if (reservation.status === ReservationStatus.CANCELLED) {
        throw new BadRequestException('Não é possível criar contrato a partir de reserva cancelada');
      }

      if (reservation.vehicleId && reservation.vehicleId !== createContractDto.vehicleId) {
        throw new BadRequestException('Reserva não é para este veículo');
      }

      if (reservation.vehicleGroupId && vehicle.groupId !== reservation.vehicleGroupId) {
        throw new BadRequestException('Veículo não pertence ao grupo reservado');
      }
    }

    // Gerar número de contrato único
    const contractNumber = await this.generateContractNumber();

    // Serializar JSON fields
    const reservationExtras = reservation?.extras ? this.safeParseJson(reservation.extras) : null;
    const mergedExtras = this.mergeExtras(reservationExtras, createContractDto.extras);
    const extras = mergedExtras ? JSON.stringify(mergedExtras) : null;
    const damagesOut = createContractDto.damagesOut ? JSON.stringify(createContractDto.damagesOut) : null;

    // Calcular balance due
    const insuranceCost = createContractDto.insuranceCost ?? reservation?.insuranceCost ?? 0;
    const extrasCost = createContractDto.extrasCost ?? reservation?.additionalDriverCost ?? 0;
    const clientNotes = createContractDto.clientNotes ?? reservation?.clientNotes ?? null;
    const stationNotes = createContractDto.stationNotes ?? reservation?.stationNotes ?? null;
    const originalVehicleGroupId = reservation?.vehicleGroupId ?? null;

    const balanceDue = createContractDto.totalAmount - (createContractDto.depositAmount || 0);

    // Criar contrato
    const contract = await this.prisma.contract.create({
      data: {
        contractNumber,
        reservationId: createContractDto.reservationId,
        clientId: createContractDto.clientId,
        vehicleId: createContractDto.vehicleId,
        pickupStationId: createContractDto.pickupStationId,
        returnStationId: createContractDto.returnStationId,
        pickupDate: new Date(createContractDto.pickupDate),
        plannedReturnDate: new Date(createContractDto.plannedReturnDate),
        actualPickupDate: createContractDto.actualPickupDate
          ? new Date(createContractDto.actualPickupDate)
          : null,
        kmOut: createContractDto.kmOut,
        fuelLevelOut: createContractDto.fuelLevelOut,
        dailyRate: createContractDto.dailyRate,
        totalDays: createContractDto.totalDays,
        subtotal: createContractDto.subtotal,
        insuranceCost,
        extrasCost,
        totalAmount: createContractDto.totalAmount,
        depositAmount: createContractDto.depositAmount,
        paidAmount: createContractDto.depositAmount || 0,
        balanceDue,
        kmIncluded: createContractDto.kmIncluded || 0,
        extraKmCost: createContractDto.extraKmCost || 0,
        extras,
        damagesOut,
        originalVehicleGroupId,
        clientNotes,
        stationNotes,
        clientSignature: createContractDto.clientSignature,
        staffSignature: createContractDto.staffSignature,
        status: ContractStatus.DRAFT,
        createdById,
      },
      include: {
        client: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            licenseNumber: true,
          },
        },
        reservation: true,
        vehicle: {
          include: {
            group: true,
          },
        },
        pickupStation: true,
        returnStation: true,
      },
    });

    // Atualizar status do veículo para RENTED
    await this.prisma.vehicle.update({
      where: { id: createContractDto.vehicleId },
      data: { status: VehicleStatus.RENTED },
    });

    // Se veio de reserva, marcar como concluída
    if (createContractDto.reservationId) {
      await this.prisma.reservation.update({
        where: { id: createContractDto.reservationId },
        data: { status: 'COMPLETED' },
      });
    }

    return contract;
  }

  async findAll(filterDto: FilterContractDto, userId: number) {
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

    // STAFF só pode ver contratos da sua estação
    if (user.role === UserRole.STAFF) {
      if (!user.stationId) {
        throw new ForbiddenException('Usuário sem estação associada');
      }
      where.OR = [
        { pickupStationId: user.stationId },
        { returnStationId: user.stationId },
      ];
    } else if (filters.stationId) {
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

    if (search) {
      where.OR = [
        { contractNumber: { contains: search, mode: 'insensitive' } },
        { client: { fullName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [contracts, total] = await Promise.all([
      this.prisma.contract.findMany({
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
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.contract.count({ where }),
    ]);

    return {
      data: contracts,
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

    const contract = await this.prisma.contract.findUnique({
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
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        reservation: true,
      },
    });

    if (!contract) {
      throw new NotFoundException('Contrato não encontrado');
    }

    // STAFF só pode ver contratos da sua estação
    if (user.role === UserRole.STAFF) {
      if (!user.stationId) {
        throw new ForbiddenException('Usuário sem estação associada');
      }
      if (
        contract.pickupStationId !== user.stationId &&
        contract.returnStationId !== user.stationId
      ) {
        throw new ForbiddenException('Você só pode visualizar contratos da sua estação');
      }
    }

    return contract;
  }

  async update(id: number, updateContractDto: UpdateContractDto, userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Apenas STAFF, ADMIN, IT podem atualizar contratos
    const allowedRoles: UserRole[] = [UserRole.STAFF, UserRole.ADMIN, UserRole.IT];
    if (!allowedRoles.includes(user.role as UserRole)) {
      throw new ForbiddenException('Você não tem permissão para atualizar contratos');
    }

    const contract = await this.prisma.contract.findUnique({
      where: { id },
    });

    if (!contract) {
      throw new NotFoundException('Contrato não encontrado');
    }

    // STAFF só pode atualizar contratos da sua estação
    if (user.role === UserRole.STAFF) {
      if (!user.stationId) {
        throw new ForbiddenException('Usuário sem estação associada');
      }
      if (
        contract.pickupStationId !== user.stationId &&
        contract.returnStationId !== user.stationId
      ) {
        throw new ForbiddenException('Você só pode atualizar contratos da sua estação');
      }
    }

    // Não pode alterar contratos já completados ou cancelados
    const completedStatuses: ContractStatus[] = [ContractStatus.COMPLETED, ContractStatus.CANCELLED];
    if (completedStatuses.includes(contract.status as ContractStatus)) {
      throw new BadRequestException('Não é possível alterar contratos completados ou cancelados');
    }

    // Serializar JSON fields se fornecidos
    const extras = updateContractDto.extras ? JSON.stringify(updateContractDto.extras) : undefined;
    const damagesOut = updateContractDto.damagesOut
      ? JSON.stringify(updateContractDto.damagesOut)
      : undefined;

    const { extras: _, damagesOut: __, ...dataWithoutArrays } = updateContractDto;

    return this.prisma.contract.update({
      where: { id },
      data: {
        ...dataWithoutArrays,
        ...(extras !== undefined && { extras }),
        ...(damagesOut !== undefined && { damagesOut }),
        ...(updateContractDto.pickupDate && { pickupDate: new Date(updateContractDto.pickupDate) }),
        ...(updateContractDto.plannedReturnDate && {
          plannedReturnDate: new Date(updateContractDto.plannedReturnDate),
        }),
        ...(updateContractDto.actualPickupDate && {
          actualPickupDate: new Date(updateContractDto.actualPickupDate),
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

  async completeContract(id: number, completeDto: CompleteContractDto, userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Apenas STAFF, ADMIN, IT podem completar contratos
    const allowedRoles: UserRole[] = [UserRole.STAFF, UserRole.ADMIN, UserRole.IT];
    if (!allowedRoles.includes(user.role as UserRole)) {
      throw new ForbiddenException('Você não tem permissão para completar contratos');
    }

    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: {
        vehicle: true,
      },
    });

    if (!contract) {
      throw new NotFoundException('Contrato não encontrado');
    }

    // STAFF só pode completar contratos da sua estação
    if (user.role === UserRole.STAFF) {
      if (!user.stationId) {
        throw new ForbiddenException('Usuário sem estação associada');
      }
      if (
        contract.pickupStationId !== user.stationId &&
        contract.returnStationId !== user.stationId
      ) {
        throw new ForbiddenException('Você só pode completar contratos da sua estação');
      }
    }

    if (contract.status !== ContractStatus.ACTIVE) {
      throw new BadRequestException('Apenas contratos ativos podem ser completados');
    }

    // Calcular km extras
    const extraKm = Math.max(0, completeDto.kmIn - contract.kmOut - contract.kmIncluded);
    const extraKmCost = extraKm * contract.extraKmCost;

    // Calcular total final
    const finalTotal =
      contract.totalAmount +
      (completeDto.fuelCharge || 0) +
      (completeDto.lateFee || 0) +
      (completeDto.damageCost || 0) +
      extraKmCost;

    const finalBalanceDue = finalTotal - contract.paidAmount;

    // Serializar damagesIn
    const damagesIn = completeDto.damagesIn ? JSON.stringify(completeDto.damagesIn) : null;

    // Atualizar contrato
    const updatedContract = await this.prisma.contract.update({
      where: { id },
      data: {
        actualReturnDate: new Date(completeDto.actualReturnDate),
        kmIn: completeDto.kmIn,
        extraKm,
        extraKmCost,
        fuelLevelIn: completeDto.fuelLevelIn,
        fuelCharge: completeDto.fuelCharge || 0,
        lateFee: completeDto.lateFee || 0,
        damageCost: completeDto.damageCost || 0,
        damagesIn,
        damageOnReturn: completeDto.damageOnReturn || contract.damageOnReturn,
        totalAmount: finalTotal,
        balanceDue: finalBalanceDue,
        depositReturned: completeDto.depositReturned ?? false,
        depositReturnedAt: completeDto.depositReturned ? new Date() : null,
        status: ContractStatus.COMPLETED,
        completedAt: new Date(),
        clientNotes: completeDto.clientNotes || contract.clientNotes,
        stationNotes: completeDto.stationNotes || contract.stationNotes,
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
        payments: true,
      },
    });

    // Atualizar status do veículo para AVAILABLE e kilometragem
    await this.prisma.vehicle.update({
      where: { id: contract.vehicleId },
      data: {
        status: VehicleStatus.AVAILABLE,
        currentKm: completeDto.kmIn,
        stationId: contract.returnStationId, // Vehicle is now at return station
      },
    });

    return updatedContract;
  }

  async cancelContract(id: number, cancelDto: CancelContractDto, userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Apenas ADMIN e IT podem cancelar contratos
    const allowedRoles: UserRole[] = [UserRole.ADMIN, UserRole.IT];
    if (!allowedRoles.includes(user.role as UserRole)) {
      throw new ForbiddenException('Apenas ADMIN e IT podem cancelar contratos');
    }

    const contract = await this.prisma.contract.findUnique({
      where: { id },
    });

    if (!contract) {
      throw new NotFoundException('Contrato não encontrado');
    }

    if (contract.status === ContractStatus.COMPLETED) {
      throw new BadRequestException('Não é possível cancelar contratos já completados');
    }

    // Atualizar contrato
    const updatedContract = await this.prisma.contract.update({
      where: { id },
      data: {
        status: ContractStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledBy: userId,
        cancellationReason: cancelDto.reason,
        clientNotes: cancelDto.clientNotes || contract.clientNotes,
        stationNotes: this.appendStationNote(contract.stationNotes, cancelDto.stationNotes, cancelDto.reason),
      },
      include: {
        client: true,
        vehicle: true,
        pickupStation: true,
        returnStation: true,
      },
    });

    // Liberar veículo se estava alugado
    if (contract.status === ContractStatus.ACTIVE) {
      await this.prisma.vehicle.update({
        where: { id: contract.vehicleId },
        data: { status: VehicleStatus.AVAILABLE },
      });
    }

    return updatedContract;
  }

  async activateContract(id: number, userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const contract = await this.prisma.contract.findUnique({
      where: { id },
    });

    if (!contract) {
      throw new NotFoundException('Contrato não encontrado');
    }

    if (contract.status !== ContractStatus.DRAFT) {
      throw new BadRequestException('Apenas contratos em rascunho podem ser ativados');
    }

    return this.prisma.contract.update({
      where: { id },
      data: {
        status: ContractStatus.ACTIVE,
        actualPickupDate: new Date(),
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

    // Apenas IT pode deletar contratos
    if (user.role !== UserRole.IT) {
      throw new ForbiddenException('Apenas IT pode deletar contratos');
    }

    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            payments: true,
          },
        },
      },
    });

    if (!contract) {
      throw new NotFoundException('Contrato não encontrado');
    }

    // Não pode deletar contratos com pagamentos
    if (contract._count.payments > 0) {
      throw new BadRequestException(
        `Não é possível deletar contrato com ${contract._count.payments} pagamento(s) associado(s)`,
      );
    }

    return this.prisma.contract.delete({
      where: { id },
    });
  }

  private async generateContractNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.contract.count();
    const number = (count + 1).toString().padStart(6, '0');
    return `CT${year}${number}`;
  }

  private safeParseJson(value: string): any | null {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  private mergeExtras(baseExtras: any | null, newExtras: any | null | undefined): any | null {
    if (!baseExtras && !newExtras) {
      return null;
    }

    if (Array.isArray(baseExtras) && Array.isArray(newExtras)) {
      return Array.from(new Set([...baseExtras, ...newExtras]));
    }

    if (baseExtras && typeof baseExtras === 'object' && newExtras && typeof newExtras === 'object') {
      return { ...baseExtras, ...newExtras };
    }

    return newExtras ?? baseExtras;
  }

  private appendStationNote(existing: string | null, incoming: string | undefined, reason: string): string {
    const base = incoming || existing || '';
    const reasonNote = reason ? `[CANCELAMENTO] ${reason}` : '';
    return [base, reasonNote].filter((value) => value.trim().length > 0).join('\n');
  }
}
