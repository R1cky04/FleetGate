import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { promises as fs } from 'fs';
import * as path from 'path';
import { UserRole } from '../../generated/prisma';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

@Injectable()
export class SystemConfigService {
  private readonly configPath = path.join(process.cwd(), 'config', 'system.config.json');

  private readonly DEFAULT_CONFIG = {
    systemName: 'FleetGate',
    apiUrl: 'http://localhost:3000',
    dbHost: 'localhost',
    debugMode: false,
    tenants: [],
  } as const;

  constructor(private prisma: PrismaService) {}

  async getConfig(userId: number) {
    await this.ensureDevUser(userId);
    const [fileConfig, dbConfig] = await Promise.all([
      this.readFileConfig(),
      this.readDbConfig(),
    ]);

    if (!fileConfig && !dbConfig) {
      throw new NotFoundException('Configuração não encontrada');
    }

    if (fileConfig && !dbConfig) {
      await this.saveDbConfig(fileConfig);
      return fileConfig;
    }

    if (!fileConfig && dbConfig) {
      await this.writeFileConfig(dbConfig);
      return dbConfig;
    }

    const fileUpdatedAt = this.parseUpdatedAt(fileConfig?.lastUpdated);
    const dbUpdatedAt = this.parseUpdatedAt(dbConfig?.lastUpdated);

    if (fileUpdatedAt >= dbUpdatedAt) {
      await this.saveDbConfig(fileConfig);
      return fileConfig;
    }

    await this.writeFileConfig(dbConfig);
    return dbConfig;
  }

  async updateConfig(userId: number, config: Record<string, unknown>) {
    await this.ensureDevUser(userId);
    await this.validateConfigOrThrow(config);

    const updatedConfig = {
      ...config,
      lastUpdated: new Date().toISOString(),
      updatedBy: `user:${userId}`,
    };

    await this.writeFileConfig(updatedConfig);
    await this.saveDbConfig(updatedConfig);
    return updatedConfig;
  }

  async getTenants(userId: number) {
    await this.ensureDevUser(userId);
    const config = await this.getOrCreateConfig();
    return this.normalizeTenants(config);
  }

  async createTenant(userId: number, payload: Record<string, unknown>) {
    await this.ensureDevUser(userId);
    const config = await this.getOrCreateConfig();
    const tenants = this.normalizeTenants(config);

    const code = String(payload.code || '').trim().toUpperCase();
    const name = String(payload.name || '').trim();

    if (!code || !name) {
      throw new BadRequestException('code e name são obrigatórios');
    }

    if (tenants.some((tenant) => tenant.code === code)) {
      throw new BadRequestException('Já existe um tenant com esse código');
    }

    const now = new Date().toISOString();
    const tenant = {
      id: this.getNextTenantId(tenants),
      code,
      name,
      isActive: payload.isActive === undefined ? true : Boolean(payload.isActive),
      dbMode: this.normalizeDbMode(payload.dbMode),
      dbName: String(payload.dbName || '').trim() || null,
      dbHost: String(payload.dbHost || '').trim() || null,
      dbPort: String(payload.dbPort || '').trim() || null,
      dbUser: String(payload.dbUser || '').trim() || null,
      dbPassword: String(payload.dbPassword || '').trim() || null,
      dbUrl: String(payload.dbUrl || '').trim() || null,
      notes: String(payload.notes || '').trim() || null,
      createdAt: now,
      updatedAt: now,
    };

    const updatedTenants = [...tenants, tenant];
    await this.persistTenants(config, updatedTenants, userId);
    return tenant;
  }

  async updateTenant(userId: number, tenantId: number, payload: Record<string, unknown>) {
    await this.ensureDevUser(userId);
    const config = await this.getOrCreateConfig();
    const tenants = this.normalizeTenants(config);
    const index = tenants.findIndex((tenant) => tenant.id === tenantId);

    if (index === -1) {
      throw new NotFoundException('Tenant não encontrado');
    }

    const current = tenants[index];
    const nextCode = payload.code === undefined
      ? current.code
      : String(payload.code || '').trim().toUpperCase();
    const nextName = payload.name === undefined
      ? current.name
      : String(payload.name || '').trim();

    if (!nextCode || !nextName) {
      throw new BadRequestException('code e name são obrigatórios');
    }

    if (tenants.some((tenant) => tenant.id !== tenantId && tenant.code === nextCode)) {
      throw new BadRequestException('Já existe um tenant com esse código');
    }

    const updatedTenant = {
      ...current,
      code: nextCode,
      name: nextName,
      isActive: payload.isActive === undefined ? current.isActive : Boolean(payload.isActive),
      dbMode: payload.dbMode === undefined ? current.dbMode : this.normalizeDbMode(payload.dbMode),
      dbName: payload.dbName === undefined ? current.dbName : (String(payload.dbName || '').trim() || null),
      dbHost: payload.dbHost === undefined ? current.dbHost : (String(payload.dbHost || '').trim() || null),
      dbPort: payload.dbPort === undefined ? current.dbPort : (String(payload.dbPort || '').trim() || null),
      dbUser: payload.dbUser === undefined ? current.dbUser : (String(payload.dbUser || '').trim() || null),
      dbPassword: payload.dbPassword === undefined ? current.dbPassword : (String(payload.dbPassword || '').trim() || null),
      dbUrl: payload.dbUrl === undefined ? current.dbUrl : (String(payload.dbUrl || '').trim() || null),
      notes: payload.notes === undefined ? current.notes : (String(payload.notes || '').trim() || null),
      updatedAt: new Date().toISOString(),
    };

    const updatedTenants = [...tenants];
    updatedTenants[index] = updatedTenant;
    await this.persistTenants(config, updatedTenants, userId);
    return updatedTenant;
  }

  async removeTenant(userId: number, tenantId: number) {
    await this.ensureDevUser(userId);
    const config = await this.getOrCreateConfig();
    const tenants = this.normalizeTenants(config);
    const target = tenants.find((tenant) => tenant.id === tenantId);

    if (!target) {
      throw new NotFoundException('Tenant não encontrado');
    }

    const updatedTenants = tenants.filter((tenant) => tenant.id !== tenantId);
    await this.persistTenants(config, updatedTenants, userId);
    return { deleted: true, id: tenantId };
  }

  async getActivityLogs(
    userId: number,
    filters?: { search?: string; action?: string; limit?: number },
  ) {
    await this.ensureDevUser(userId);

    const normalizedLimit = Math.min(Math.max(filters?.limit ?? 300, 1), 1000);
    const where: any = {};

    if (filters?.action) {
      where.action = filters.action;
    }

    if (filters?.search?.trim()) {
      const search = filters.search.trim();
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { entityType: { contains: search, mode: 'insensitive' } },
        { entityId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const logs = await this.prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: normalizedLimit,
      include: {
        tenant: {
          select: {
            code: true,
          },
        },
        user: {
          select: {
            id: true,
            userCode: true,
          },
        },
      },
    });

    return logs.map((entry) => ({
      id: entry.id,
      action: entry.action,
      subject: `${entry.entityType}:${entry.entityId}`,
      userId: entry.userId,
      userCode: entry.user?.userCode ?? null,
      tenantId: entry.tenantId,
      tenantCode: entry.tenant?.code ?? null,
      timestamp: entry.createdAt,
      details: entry.details,
      entityType: entry.entityType,
      entityId: entry.entityId,
    }));
  }

  async clearActivityLogs(userId: number) {
    await this.ensureDevUser(userId);
    const result = await this.prisma.activityLog.deleteMany();
    return { deleted: result.count };
  }

  async getSystemInfo(userId: number) {
    await this.ensureDevUser(userId);

    const [activeUsers, totalUsers, totalStations, totalRequests] = await Promise.all([
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
      this.prisma.user.count(),
      this.prisma.station.count(),
      this.prisma.activityLog.count(),
    ]);

    return {
      activeUsers,
      totalUsers,
      totalStations,
      totalRequests,
      apiStatus: 'RUNNING',
      databaseStatus: 'CONNECTED',
      generatedAt: new Date().toISOString(),
    };
  }

  async restartServices(userId: number) {
    await this.ensureDevUser(userId);
    return {
      status: 'accepted',
      message: 'Restart request registered successfully',
      requestedAt: new Date().toISOString(),
      requestedBy: userId,
    };
  }

  private async readFileConfig(): Promise<any | null> {
    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  private normalizeDbMode(value: unknown): 'SHARED' | 'DEDICATED' {
    const normalized = String(value || '').trim().toUpperCase();
    if (normalized === 'DEDICATED') return 'DEDICATED';
    return 'SHARED';
  }

  private normalizeTenants(config: Record<string, any>) {
    const raw = Array.isArray(config?.tenants) ? config.tenants : [];
    return raw
      .map((item: any, index: number) => ({
        id: Number(item?.id) || index + 1,
        code: String(item?.code || '').trim().toUpperCase(),
        name: String(item?.name || '').trim(),
        isActive: Boolean(item?.isActive),
        dbMode: this.normalizeDbMode(item?.dbMode),
        dbName: item?.dbName ?? null,
        dbHost: item?.dbHost ?? null,
        dbPort: item?.dbPort ?? null,
        dbUser: item?.dbUser ?? null,
        dbPassword: item?.dbPassword ?? null,
        dbUrl: item?.dbUrl ?? null,
        notes: item?.notes ?? null,
        createdAt: item?.createdAt || null,
        updatedAt: item?.updatedAt || null,
      }))
      .filter((tenant: any) => tenant.code && tenant.name)
      .sort((a: any, b: any) => a.id - b.id);
  }

  private getNextTenantId(tenants: Array<{ id: number }>) {
    const max = tenants.reduce((currentMax, tenant) => Math.max(currentMax, Number(tenant.id) || 0), 0);
    return max + 1;
  }

  private async getOrCreateConfig() {
    const current = await this.getConfigSnapshot();
    if (current) return current;

    const initial = {
      ...this.DEFAULT_CONFIG,
      lastUpdated: new Date().toISOString(),
      updatedBy: 'system:init',
    };

    await this.writeFileConfig(initial);
    await this.saveDbConfig(initial);
    return initial;
  }

  private async getConfigSnapshot() {
    const [fileConfig, dbConfig] = await Promise.all([this.readFileConfig(), this.readDbConfig()]);
    return fileConfig || dbConfig || null;
  }

  private async persistTenants(config: Record<string, any>, tenants: any[], userId: number) {
    const updatedConfig = {
      ...config,
      tenants,
      lastUpdated: new Date().toISOString(),
      updatedBy: `user:${userId}`,
    };

    await this.writeFileConfig(updatedConfig);
    await this.saveDbConfig(updatedConfig);
    await this.logTenantActivity(userId, 'tenant.updated_registry', {
      totalTenants: tenants.length,
    });
  }

  private async logTenantActivity(userId: number, action: string, details?: any) {
    try {
      await this.prisma.activityLog.create({
        data: {
          userId,
          action,
          entityType: 'Tenant',
          entityId: 'config',
          details: details ? JSON.stringify(details) : null,
        },
      });
    } catch (error) {
      console.error('Failed to log tenant activity:', error);
    }
  }

  private async writeFileConfig(config: Record<string, unknown>) {
    await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
  }

  private async validateConfigOrThrow(config: Record<string, unknown>) {
    try {
      const schemaPath = path.join(process.cwd(), 'config', 'system.config.schema.json');
      const schemaContent = await fs.readFile(schemaPath, 'utf-8');
      const schema = JSON.parse(schemaContent);
      const ajv = new Ajv({ allErrors: true, strict: false });
      addFormats(ajv);
      const validate = ajv.compile(schema);

      const valid = validate(config);
      if (!valid) {
        const errors = validate.errors?.map((error) => error.message).filter(Boolean) || [];
        throw new BadRequestException(`Configuração inválida: ${errors.join('; ')}`);
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Falha ao validar configuração do sistema');
    }
  }

  private async readDbConfig(): Promise<any | null> {
    const record = await this.prisma.systemConfig.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    if (!record) {
      return null;
    }

    try {
      return JSON.parse(record.configJson);
    } catch {
      return null;
    }
  }

  private async saveDbConfig(config: Record<string, unknown>) {
    const existing = await this.prisma.systemConfig.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    const data = {
      version: typeof config.version === 'string' ? config.version : null,
      updatedBy: typeof config.updatedBy === 'string' ? config.updatedBy : null,
      configJson: JSON.stringify(config),
    };

    if (existing) {
      await this.prisma.systemConfig.update({
        where: { id: existing.id },
        data,
      });
      return;
    }

    await this.prisma.systemConfig.create({ data });
  }

  private parseUpdatedAt(value: unknown): number {
    if (typeof value !== 'string') {
      return 0;
    }
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  private async ensureDevUser(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (user.role !== UserRole.DEV) {
      throw new ForbiddenException('Apenas DEV pode alterar a configuração do sistema');
    }
  }
}
