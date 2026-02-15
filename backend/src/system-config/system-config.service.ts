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

  constructor(private prisma: PrismaService) {}

  async getConfig(userId: number) {
    await this.ensureItUser(userId);
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
    await this.ensureItUser(userId);
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

  private async readFileConfig(): Promise<any | null> {
    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
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

  private async ensureItUser(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (user.role !== UserRole.IT) {
      throw new ForbiddenException('Apenas IT pode alterar a configuração do sistema');
    }
  }
}
