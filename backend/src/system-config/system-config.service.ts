import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { promises as fs } from 'fs';
import * as path from 'path';
import { UserRole } from '../../generated/prisma';

@Injectable()
export class SystemConfigService {
  private readonly configPath = path.join(process.cwd(), 'config', 'system.config.json');

  constructor(private prisma: PrismaService) {}

  async getConfig(userId: number) {
    await this.ensureItUser(userId);
    const content = await fs.readFile(this.configPath, 'utf-8');
    return JSON.parse(content);
  }

  async updateConfig(userId: number, config: Record<string, unknown>) {
    await this.ensureItUser(userId);

    const updatedConfig = {
      ...config,
      lastUpdated: new Date().toISOString(),
      updatedBy: `user:${userId}`,
    };

    await fs.writeFile(this.configPath, JSON.stringify(updatedConfig, null, 2), 'utf-8');
    return updatedConfig;
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
