import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateVehicleTransferDto } from './dto/create-vehicle-transfer.dto';
import { UpdateVehicleTransferDto } from './dto/update-vehicle-transfer.dto';
import {
  CancelVehicleTransferDto,
  CompleteVehicleTransferDto,
  FilterVehicleTransferDto,
  StartVehicleTransferDto,
} from './dto/filter-vehicle-transfer.dto';
import { UserRole, VehicleStatus, VehicleTransferStatus } from '../../generated/prisma';

@Injectable()
export class VehicleTransfersService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateVehicleTransferDto, createdById: number) {
    const user = await this.prisma.user.findUnique({ where: { id: createdById } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const allowedRoles: UserRole[] = [UserRole.FLEET, UserRole.STAFF, UserRole.ADMIN, UserRole.IT];
    if (!allowedRoles.includes(user.role as UserRole)) {
      throw new ForbiddenException('Você não tem permissão para criar transfers');
    }

    if (createDto.fromStationId === createDto.toStationId) {
      throw new BadRequestException('A estação de origem e destino devem ser diferentes');
    }

    const [vehicle, fromStation, toStation, driver] = await Promise.all([
      this.prisma.vehicle.findUnique({ where: { id: createDto.vehicleId } }),
      this.prisma.station.findUnique({ where: { id: createDto.fromStationId } }),
      this.prisma.station.findUnique({ where: { id: createDto.toStationId } }),
      this.prisma.user.findUnique({ where: { id: createDto.driverId } }),
    ]);

    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado');
    }

    if (!fromStation) {
      throw new NotFoundException('Estação de origem não encontrada');
    }

    if (!toStation) {
      throw new NotFoundException('Estação de destino não encontrada');
    }

    if (!driver) {
      throw new NotFoundException('Condutor não encontrado');
    }

    if (driver.role === UserRole.CLIENT) {
      throw new BadRequestException('Condutor deve ser staff autorizado');
    }

    if (vehicle.stationId !== createDto.fromStationId) {
      throw new BadRequestException('Veículo não está na estação de origem');
    }

    if (user.role === UserRole.STAFF || user.role === UserRole.FLEET) {
      if (user.stationId !== createDto.fromStationId) {
        throw new ForbiddenException('Você só pode criar transfers da sua estação');
      }
    }

    const [activeReservations, activeContracts, activeTransfers] = await Promise.all([
      this.prisma.reservation.count({
        where: {
          vehicleId: createDto.vehicleId,
          status: { in: ['PENDING', 'CONFIRMED', 'ACTIVE'] },
        },
      }),
      this.prisma.contract.count({
        where: {
          vehicleId: createDto.vehicleId,
          status: { in: ['DRAFT', 'ACTIVE'] },
        },
      }),
      this.prisma.vehicleTransfer.count({
        where: {
          vehicleId: createDto.vehicleId,
          status: { in: [VehicleTransferStatus.PENDING, VehicleTransferStatus.IN_TRANSIT] },
        },
      }),
    ]);

    if (activeReservations > 0) {
      throw new BadRequestException('Não é possível transferir veículo com reservas ativas');
    }

    if (activeContracts > 0) {
      throw new BadRequestException('Não é possível transferir veículo com contratos ativos');
    }

    if (activeTransfers > 0) {
      throw new BadRequestException('Já existe uma transferência em curso para este veículo');
    }

    const transferNumber = await this.generateTransferNumber();

    return this.prisma.vehicleTransfer.create({
      data: {
        transferNumber,
        vehicleId: createDto.vehicleId,
        fromStationId: createDto.fromStationId,
        toStationId: createDto.toStationId,
        driverId: createDto.driverId,
        scheduledDate: new Date(createDto.scheduledDate),
        reason: createDto.reason,
        clientNotes: createDto.clientNotes,
        stationNotes: createDto.stationNotes,
        cost: createDto.cost || 0,
        createdById,
      },
      include: {
        vehicle: true,
        fromStation: true,
        toStation: true,
        driver: true,
      },
    });
  }

  async findAll(filterDto: FilterVehicleTransferDto, userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const { page = 1, limit = 20, fromDate, toDate, ...filters } = filterDto;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.vehicleId) {
      where.vehicleId = filters.vehicleId;
    }

    if (filters.driverId) {
      where.driverId = filters.driverId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.stationId) {
      where.OR = [
        { fromStationId: filters.stationId },
        { toStationId: filters.stationId },
      ];
    } else if (user.role === UserRole.STAFF || user.role === UserRole.FLEET) {
      if (!user.stationId) {
        throw new ForbiddenException('Usuário sem estação associada');
      }
      where.OR = [{ fromStationId: user.stationId }, { toStationId: user.stationId }];
    }

    if (fromDate || toDate) {
      where.scheduledDate = {
        ...(fromDate && { gte: new Date(fromDate) }),
        ...(toDate && { lte: new Date(toDate) }),
      };
    }

    const [transfers, total] = await Promise.all([
      this.prisma.vehicleTransfer.findMany({
        where,
        skip,
        take: limit,
        include: {
          vehicle: true,
          fromStation: true,
          toStation: true,
          driver: true,
        },
        orderBy: { scheduledDate: 'desc' },
      }),
      this.prisma.vehicleTransfer.count({ where }),
    ]);

    return {
      data: transfers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const transfer = await this.prisma.vehicleTransfer.findUnique({
      where: { id },
      include: {
        vehicle: true,
        fromStation: true,
        toStation: true,
        driver: true,
      },
    });

    if (!transfer) {
      throw new NotFoundException('Transfer não encontrado');
    }

    if ((user.role === UserRole.STAFF || user.role === UserRole.FLEET) && user.stationId) {
      if (transfer.fromStationId !== user.stationId && transfer.toStationId !== user.stationId) {
        throw new ForbiddenException('Você só pode visualizar transfers da sua estação');
      }
    }

    return transfer;
  }

  async update(id: string, updateDto: UpdateVehicleTransferDto, userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const transfer = await this.prisma.vehicleTransfer.findUnique({ where: { id } });
    if (!transfer) {
      throw new NotFoundException('Transfer não encontrado');
    }

    if (transfer.status !== VehicleTransferStatus.PENDING) {
      throw new BadRequestException('Apenas transfers pendentes podem ser atualizados');
    }

    if (user.role === UserRole.STAFF || user.role === UserRole.FLEET) {
      if (user.stationId !== transfer.fromStationId) {
        throw new ForbiddenException('Você só pode atualizar transfers da sua estação');
      }
    }

    return this.prisma.vehicleTransfer.update({
      where: { id },
      data: {
        ...updateDto,
        ...(updateDto.scheduledDate && { scheduledDate: new Date(updateDto.scheduledDate) }),
      },
      include: {
        vehicle: true,
        fromStation: true,
        toStation: true,
        driver: true,
      },
    });
  }

  async startTransfer(id: string, startDto: StartVehicleTransferDto, userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const transfer = await this.prisma.vehicleTransfer.findUnique({
      where: { id },
      include: { vehicle: true },
    });

    if (!transfer) {
      throw new NotFoundException('Transfer não encontrado');
    }

    if (transfer.status !== VehicleTransferStatus.PENDING) {
      throw new BadRequestException('Apenas transfers pendentes podem iniciar');
    }

    if (user.role === UserRole.STAFF || user.role === UserRole.FLEET) {
      if (user.stationId !== transfer.fromStationId) {
        throw new ForbiddenException('Você só pode iniciar transfers da sua estação');
      }
    }

    const kmAtDeparture = startDto.kmAtDeparture ?? transfer.vehicle.currentKm;

    const updatedTransfer = await this.prisma.vehicleTransfer.update({
      where: { id },
      data: {
        status: VehicleTransferStatus.IN_TRANSIT,
        departureDate: startDto.departureDate ? new Date(startDto.departureDate) : new Date(),
        kmAtDeparture,
      },
      include: {
        vehicle: true,
        fromStation: true,
        toStation: true,
        driver: true,
      },
    });

    await this.prisma.vehicle.update({
      where: { id: transfer.vehicleId },
      data: { status: VehicleStatus.OUT_OF_SERVICE },
    });

    return updatedTransfer;
  }

  async completeTransfer(id: string, completeDto: CompleteVehicleTransferDto, userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const transfer = await this.prisma.vehicleTransfer.findUnique({
      where: { id },
      include: { vehicle: true },
    });

    if (!transfer) {
      throw new NotFoundException('Transfer não encontrado');
    }

    if (transfer.status !== VehicleTransferStatus.IN_TRANSIT) {
      throw new BadRequestException('Apenas transfers em trânsito podem ser concluídos');
    }

    const kmAtArrival = completeDto.kmAtArrival ?? transfer.vehicle.currentKm;

    const updatedTransfer = await this.prisma.vehicleTransfer.update({
      where: { id },
      data: {
        status: VehicleTransferStatus.COMPLETED,
        arrivalDate: completeDto.arrivalDate ? new Date(completeDto.arrivalDate) : new Date(),
        kmAtArrival,
        completedAt: new Date(),
      },
      include: {
        vehicle: true,
        fromStation: true,
        toStation: true,
        driver: true,
      },
    });

    await this.prisma.vehicle.update({
      where: { id: transfer.vehicleId },
      data: {
        status: VehicleStatus.AVAILABLE,
        stationId: transfer.toStationId,
        currentKm: kmAtArrival,
      },
    });

    return updatedTransfer;
  }

  async cancelTransfer(id: string, cancelDto: CancelVehicleTransferDto, userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const transfer = await this.prisma.vehicleTransfer.findUnique({
      where: { id },
    });

    if (!transfer) {
      throw new NotFoundException('Transfer não encontrado');
    }

    if (transfer.status === VehicleTransferStatus.COMPLETED) {
      throw new BadRequestException('Não é possível cancelar transfer concluído');
    }

    if (user.role === UserRole.STAFF || user.role === UserRole.FLEET) {
      if (user.stationId !== transfer.fromStationId) {
        throw new ForbiddenException('Você só pode cancelar transfers da sua estação');
      }
    }

    const updatedTransfer = await this.prisma.vehicleTransfer.update({
      where: { id },
      data: {
        status: VehicleTransferStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: cancelDto.reason,
        clientNotes: cancelDto.clientNotes || transfer.clientNotes,
        stationNotes: cancelDto.stationNotes || transfer.stationNotes,
      },
      include: {
        vehicle: true,
        fromStation: true,
        toStation: true,
        driver: true,
      },
    });

    return updatedTransfer;
  }

  private async generateTransferNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.vehicleTransfer.count();
    const number = (count + 1).toString().padStart(6, '0');
    return `TR${year}${number}`;
  }
}
