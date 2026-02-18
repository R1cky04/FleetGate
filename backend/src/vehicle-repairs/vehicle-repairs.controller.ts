import {
  Controller,
  Post,
  Delete,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  BadRequestException,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtUser } from '../auth/types';
import { VehicleRepairsService } from './vehicle-repairs.service';
import type { CreateRepairDto, CloseRepairDto } from './vehicle-repairs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Vehicle Repairs')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('vehicle-repairs')
export class VehicleRepairsController {
  constructor(private repairsService: VehicleRepairsService) {}

  @Post('open')
  @ApiOperation({
    summary: 'Marcar um carro como em reparação (impro)',
    description: `Marca um veículo como em reparação/impropriedade.
    O carro fica indisponível para aluguel/reserva.
    Status muda para IN_REPAIR.`,
  })
  @ApiResponse({
    status: 201,
    description: 'Reparação aberta com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Veículo não encontrado' })
  @ApiResponse({ status: 409, description: 'Veículo já está em reparação' })
  async openRepair(
    @Body()
    createDto: CreateRepairDto,
    @CurrentUser() user: JwtUser
  ) {
    if (!user.stationId) {
      throw new BadRequestException('User must be assigned to a station');
    }
    return await this.repairsService.openRepair(createDto, user, user.stationId);
  }

  @Post(':repairId/acquire-close-lock')
  @ApiOperation({
    summary: 'Adquirir lock exclusivo para fechar reparação',
    description: `Adquere um lock exclusivo para fechar a reparação.
    Apenas um utilizador por vez pode estar a fechar.
    Lock dura 5 minutos.`,
  })
  @ApiResponse({
    status: 201,
    description: 'Lock adquirido',
  })
  @ApiResponse({ status: 404, description: 'Reparação não encontrada' })
  @ApiResponse({ status: 409, description: 'Outro utilizador está a fechar' })
  async acquireCloseLock(
    @Param('repairId') repairId: string,
    @CurrentUser() user: JwtUser
  ) {
    return await this.repairsService.acquireCloseLock(repairId, user.id);
  }

  @Patch(':repairId/renew-close-lock')
  @ApiOperation({
    summary: 'Renovar lock de fechamento',
    description: `Renova um lock existente para estender a expiração.
    Útil como heartbeat enquanto completa o processo de fechamento.`,
  })
  @ApiResponse({ status: 200, description: 'Lock renovado' })
  @ApiResponse({ status: 404, description: 'Reparação não encontrada' })
  @ApiResponse({ status: 409, description: 'Não tem lock desta reparação' })
  async renewCloseLock(
    @Param('repairId') repairId: string,
    @CurrentUser() user: JwtUser
  ) {
    return await this.repairsService.renewCloseLock(repairId, user.id);
  }

  @Delete(':repairId/release-close-lock')
  @ApiOperation({
    summary: 'Liberar lock de fechamento',
    description: `Libera o lock exclusivo de fechamento.
    Permite que outro utilizador feche a reparação.`,
  })
  @ApiResponse({ status: 200, description: 'Lock liberado' })
  @ApiResponse({ status: 404, description: 'Reparação não encontrada' })
  @ApiResponse({ status: 409, description: 'Não tem lock desta reparação' })
  async releaseCloseLock(
    @Param('repairId') repairId: string,
    @CurrentUser() user: JwtUser
  ) {
    return await this.repairsService.releaseCloseLock(repairId, user.id);
  }

  @Patch(':repairId/close')
  @ApiOperation({
    summary: 'Fechar reparação',
    description: `Fecha a reparação e disponibiliza o carro na estação de fechamento.
    - Requer lock exclusivo
    - Carro muda para AVAILABLE
    - Carro é movido para estação de fechamento
    - Status muda para COMPLETED`,
  })
  @ApiResponse({
    status: 200,
    description: 'Reparação fechada com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Reparação não encontrada' })
  @ApiResponse({ status: 409, description: 'Sem lock ou já foi fechada' })
  async closeRepair(
    @Param('repairId') repairId: string,
    @Body() closeDto: CloseRepairDto,
    @CurrentUser() user: JwtUser
  ) {
    return await this.repairsService.closeRepair(repairId, closeDto, user);
  }

  @Get(':repairId')
  @ApiOperation({
    summary: 'Obter detalhes de uma reparação',
    description: 'Retorna informações completas sobre a reparação.',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalhes da reparação',
  })
  @ApiResponse({ status: 404, description: 'Reparação não encontrada' })
  async getRepair(@Param('repairId') repairId: string) {
    return await this.repairsService.getRepair(repairId);
  }

  @Get('vehicle/:vehicleId')
  @ApiOperation({
    summary: 'Listar reparações de um veículo',
    description: 'Lista todas as reparações de um veículo, ordenadas por data desc.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de reparações',
  })
  async getVehicleRepairs(
    @Param('vehicleId') vehicleId: string
  ) {
    const id = parseInt(vehicleId, 10);
    if (isNaN(id)) {
      throw new BadRequestException('vehicleId must be a number');
    }
    return await this.repairsService.getVehicleRepairs(id);
  }

  @Get('station/:stationId/open')
  @ApiOperation({
    summary: 'Listar reparações abertas de uma estação',
    description: 'Lista todas as reparações em status OPEN ou IN_PROGRESS da estação.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de reparações abertas',
  })
  async getOpenRepairs(@Param('stationId', ParseIntPipe) stationId: number) {
    return await this.repairsService.getOpenRepairs(stationId);
  }

  @Post(':repairId/cancel')
  @ApiOperation({
    summary: 'Cancelar reparação',
    description: `Cancela uma reparação em aberto.
    Se carro ainda estiver em IN_REPAIR, muda para AVAILABLE.`,
  })
  @ApiResponse({ status: 200, description: 'Reparação cancelada' })
  @ApiResponse({ status: 404, description: 'Reparação não encontrada' })
  @ApiResponse({ status: 409, description: 'Reparação já foi fechada' })
  async cancelRepair(
    @Param('repairId') repairId: string,
    @Body() body: { reason: string },
    @CurrentUser() user: JwtUser
  ) {
    return await this.repairsService.cancelRepair(repairId, user, body.reason);
  }
}
