import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { FilterPaymentDto } from './dto/filter-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { PaymentStatus, UserRole } from '../../generated/prisma';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filterDto: FilterPaymentDto, userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const where: any = {};

    if (filterDto.contractId) {
      where.contractId = filterDto.contractId;
    }

    if (filterDto.clientId) {
      where.clientId = filterDto.clientId;
    }

    if (filterDto.status) {
      where.status = filterDto.status;
    }

    if (user.role === UserRole.STAFF) {
      if (!user.stationId) {
        throw new ForbiddenException('Usuário sem estação associada');
      }
      where.contract = {
        OR: [
          { pickupStationId: user.stationId },
          { returnStationId: user.stationId },
        ],
      };
    }

    return this.prisma.payment.findMany({
      where,
      include: {
        contract: true,
        client: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        contract: true,
        client: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado');
    }

    if (user.role === UserRole.STAFF) {
      if (!user.stationId) {
        throw new ForbiddenException('Usuário sem estação associada');
      }
      const contractStationIds = [payment.contract.pickupStationId, payment.contract.returnStationId];
      if (!contractStationIds.includes(user.stationId)) {
        throw new ForbiddenException('Você só pode visualizar pagamentos da sua estação');
      }
    }

    return payment;
  }

  async create(createDto: CreatePaymentDto, userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const allowedRoles: UserRole[] = [UserRole.STAFF, UserRole.ADMIN, UserRole.IT];
    if (!allowedRoles.includes(user.role as UserRole)) {
      throw new ForbiddenException('Você não tem permissão para processar pagamentos');
    }

    const contract = await this.prisma.contract.findUnique({
      where: { id: createDto.contractId },
      include: { client: true },
    });

    if (!contract) {
      throw new NotFoundException('Contrato não encontrado');
    }

    if (user.role === UserRole.STAFF) {
      if (!user.stationId) {
        throw new ForbiddenException('Usuário sem estação associada');
      }
      if (
        contract.pickupStationId !== user.stationId &&
        contract.returnStationId !== user.stationId
      ) {
        throw new ForbiddenException('Você só pode processar pagamentos da sua estação');
      }
    }

    const allowedMethods = await this.getAllowedPaymentMethods();
    if (allowedMethods.length > 0 && !allowedMethods.includes(createDto.paymentMethod)) {
      throw new BadRequestException('Método de pagamento não permitido pela configuração');
    }

    const newPaidAmount = contract.paidAmount + createDto.amount;
    const newBalanceDue = contract.totalAmount - newPaidAmount;

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          contractId: contract.id,
          clientId: contract.clientId,
          amount: createDto.amount,
          paymentMethod: createDto.paymentMethod,
          status: PaymentStatus.PAID,
          paymentType: createDto.paymentType,
          reference: createDto.reference,
          notes: createDto.notes,
          processedBy: `user:${userId}`,
          processedAt: new Date(),
        },
        include: {
          contract: true,
          client: true,
        },
      });

      await tx.contract.update({
        where: { id: contract.id },
        data: {
          paidAmount: newPaidAmount,
          balanceDue: newBalanceDue,
        },
      });

      return payment;
    });
  }

  async refund(id: string, refundDto: RefundPaymentDto, userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const allowedRoles: UserRole[] = [UserRole.ADMIN, UserRole.IT];
    if (!allowedRoles.includes(user.role as UserRole)) {
      throw new ForbiddenException('Apenas ADMIN e IT podem reembolsar pagamentos');
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { contract: true },
    });

    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado');
    }

    if (![PaymentStatus.PAID, PaymentStatus.PARTIAL].includes(payment.status as any)) {
      throw new BadRequestException('Apenas pagamentos pagos podem ser reembolsados');
    }

    const refundAmount = refundDto.amount ?? payment.amount;
    if (refundAmount <= 0 || refundAmount > payment.amount) {
      throw new BadRequestException('Valor de reembolso inválido');
    }

    const newPaidAmount = payment.contract.paidAmount - refundAmount;
    const newBalanceDue = payment.contract.totalAmount - newPaidAmount;

    return this.prisma.$transaction(async (tx) => {
      const refundPayment = await tx.payment.create({
        data: {
          contractId: payment.contractId,
          clientId: payment.clientId,
          amount: -refundAmount,
          paymentMethod: payment.paymentMethod,
          status: PaymentStatus.REFUNDED,
          paymentType: 'REFUND',
          reference: payment.reference,
          notes: refundDto.reason || 'Reembolso',
          processedBy: `user:${userId}`,
          processedAt: new Date(),
        },
        include: {
          contract: true,
          client: true,
        },
      });

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: refundAmount === payment.amount ? PaymentStatus.REFUNDED : PaymentStatus.PARTIAL,
          notes: refundDto.reason || payment.notes,
          processedBy: `user:${userId}`,
          processedAt: new Date(),
        },
      });

      await tx.contract.update({
        where: { id: payment.contractId },
        data: {
          paidAmount: newPaidAmount,
          balanceDue: newBalanceDue,
        },
      });

      return refundPayment;
    });
  }

  private async getAllowedPaymentMethods(): Promise<string[]> {
    try {
      const configPath = path.join(process.cwd(), 'config', 'system.config.json');
      const content = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(content);
      const methods = Array.isArray(config?.systemSettings?.paymentMethods)
        ? config.systemSettings.paymentMethods
        : [];
      const profiles = Array.isArray(config?.paymentProfiles) ? config.paymentProfiles : [];
      const profileMethods = profiles
        .filter((profile: any) => profile?.isActive)
        .flatMap((profile: any) => (Array.isArray(profile?.methods) ? profile.methods : []));

      return Array.from(new Set([...methods, ...profileMethods]));
    } catch {
      return [];
    }
  }
}
