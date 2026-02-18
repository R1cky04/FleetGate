import { Controller, Post, Delete, Get, Param, Body, UseGuards, Patch, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/current-user.decorator';
import type { JwtUser } from '../../auth/types';
import { RecordLockService } from '../services/record-lock.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@ApiTags('Locks')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('locks')
export class LocksController {
  constructor(private lockService: RecordLockService) {}

  @Post('acquire-edit/:entityType/:entityId/:stationId')
  @ApiOperation({
    summary: 'Entrar em modo EDIT de um registo',
    description: `Adquirir um lock exclusivo para EDITAR um registo (Contract ou Reservation).
    Apenas um utilizador por vez pode ter um lock ativo em modo edit.
    Se outro utilizador tenta editar, recebe erro ConflictException com o nome de quem está a editar.
    Lock dura 5 minutos por padrão.`,
  })
  @ApiResponse({
    status: 201,
    description: 'Modo edit ativado com sucesso',
  })
  @ApiResponse({ status: 409, description: 'Outro utilizador já está a editar este registo' })
  async acquireEditLock(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Param('stationId', ParseIntPipe) stationId: number,
    @CurrentUser() user: JwtUser
  ) {
    return await this.lockService.acquireLock({
      entityType: entityType as any,
      entityId,
      stationId,
      userId: user.id,
      action: 'edit',
      durationSeconds: 300, // 5 minutos
    });
  }

  @Post('acquire-view/:entityType/:entityId/:stationId')
  @ApiOperation({
    summary: 'Entrar em modo VIEW de um registo',
    description: `Registar visualização de um registo (informativo apenas).
    Múltiplos utilizadores podem estar em modo view simultaneamente.
    Não bloqueia edições.`,
  })
  @ApiResponse({
    status: 201,
    description: 'Modo view registado',
  })
  async acquireViewLock(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Param('stationId', ParseIntPipe) stationId: number,
    @CurrentUser() user: JwtUser
  ) {
    // Para view mode, apenas registar sem bloquear
    return await this.lockService.getLockInfo(entityType, entityId, stationId);
  }

  @Patch('renew/:entityType/:entityId/:stationId')
  @ApiOperation({
    summary: 'Renovar um lock ativo',
    description: `Renovar um lock existente para estender o tempo de expiração.
    Útil quando o utilizador continua a editar e quer manter lock ativo.`,
  })
  @ApiResponse({ status: 200, description: 'Lock renovado com sucesso' })
  @ApiResponse({ status: 400, description: 'Nenhum lock encontrado' })
  async renewLock(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Param('stationId', ParseIntPipe) stationId: number,
    @Body() body: { durationSeconds?: number },
    @CurrentUser() user: JwtUser
  ) {
    return await this.lockService.renewLock(
      entityType,
      entityId,
      stationId,
      user.id,
      body.durationSeconds
    );
  }

  @Delete('release/:entityType/:entityId/:stationId')
  @ApiOperation({
    summary: 'Sair do modo EDIT',
    description: `Liberar um lock exclusivo e sair do modo edit.
    Apenas o utilizador que tem o lock pode liberá-lo.`,
  })
  @ApiResponse({ status: 200, description: 'Lock liberado com sucesso' })
  @ApiResponse({ status: 403, description: 'Apenas o utilizador que tem lock pode liberá-lo' })
  async releaseLock(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Param('stationId', ParseIntPipe) stationId: number,
    @CurrentUser() user: JwtUser
  ) {
    await this.lockService.releaseLock(entityType, entityId, stationId, user.id);
    return { message: 'Lock liberado com sucesso' };
  }

  @Get('check/:entityType/:entityId/:stationId')
  @ApiOperation({
    summary: 'Verificar status de lock de um registo',
    description: `Verificar se um registo está em modo edit e por quem.
    Retorna false se não está locked ou se o lock expirou.
    Use isto para mostrar avisos ao utilizador.`,
  })
  @ApiResponse({
    status: 200,
    description: 'Lock info com detalhes de quem está a editar',
    schema: {
      properties: {
        isLocked: { type: 'boolean' },
        lockedBy: { type: 'number' },
        lockedByName: { type: 'string' },
        lockedAt: { type: 'string', format: 'date-time' },
        expiresAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  async checkLock(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Param('stationId', ParseIntPipe) stationId: number
  ) {
    return await this.lockService.getLockInfo(entityType, entityId, stationId);
  }
}
