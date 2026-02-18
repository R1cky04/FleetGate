import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service';
import { LoginDto } from './dto/login.dto';
import { PrismaClient, UserRole, UserStatus } from '../../generated/prisma';

type TenantDbMode = 'SHARED' | 'DEDICATED';

interface TenantConfig {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
  dbMode: TenantDbMode;
  dbName?: string | null;
  dbHost?: string | null;
  dbPort?: string | null;
  dbUser?: string | null;
  dbPassword?: string | null;
  dbUrl?: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(userCode: string, password: string) {
    const normalizedUserCode = userCode.toUpperCase();

    const sharedUser = await this.prisma.user.findUnique({
      where: { userCode: normalizedUserCode },
    });

    if (!sharedUser) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tenant = await this.resolveTenantForUser(sharedUser.tenantId ?? null, sharedUser.role);

    const { prismaClient, disconnect } = await this.getPrismaClientForTenant(tenant);

    const user = await prismaClient.user.findUnique({
      where: { userCode: normalizedUserCode },
    });

    if (!user || !user.password) {
      if (disconnect) {
        await disconnect();
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      if (disconnect) {
        await disconnect();
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== UserStatus.ACTIVE) {
      if (disconnect) {
        await disconnect();
      }
      throw new UnauthorizedException('User is not active');
    }

    if (user.role === UserRole.CLIENT) {
      if (disconnect) {
        await disconnect();
      }
      throw new UnauthorizedException('Client profile has no login access');
    }

    return { user, tenant, prismaClient, disconnect };
  }

  async login(dto: LoginDto) {
    const { user, tenant, prismaClient, disconnect } = await this.validateUser(dto.userCode, dto.password);

    try {
      const payload = {
        sub: user.id,
        userCode: user.userCode,
        email: user.email,
        role: user.role,
        stationId: user.stationId,
        tenantId: user.tenantId,
        companyCode: tenant.code,
        tenantDbMode: tenant.dbMode,
      };

      const accessToken = this.jwtService.sign(payload);

      await prismaClient.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      const { password, ...safeUser } = user;
      return {
        accessToken,
        user: {
          ...safeUser,
          tenantId: user.tenantId,
          companyCode: tenant.code,
          tenantDbMode: tenant.dbMode,
        },
      };
    } finally {
      if (disconnect) {
        await disconnect();
      }
    }
  }

  private async resolveTenantForUser(userTenantId: number | null, role: UserRole): Promise<TenantConfig> {
    if (userTenantId) {
      const tenant = await this.prisma.tenant.findUnique({ where: { id: userTenantId } });
      if (!tenant) {
        throw new UnauthorizedException('User tenant not found');
      }

      if (!tenant.isActive) {
        throw new UnauthorizedException('Tenant is inactive');
      }

      return {
        id: tenant.id,
        code: tenant.code,
        name: tenant.name,
        isActive: tenant.isActive,
        dbMode: tenant.dbMode,
        dbName: tenant.dbName,
        dbHost: tenant.dbHost,
        dbPort: tenant.dbPort,
        dbUser: tenant.dbUser,
        dbPassword: tenant.dbPassword,
        dbUrl: tenant.dbUrl,
      };
    }

    if (role !== UserRole.DEV) {
      throw new UnauthorizedException('User is not associated to a company');
    }

    const fallbackTenants = await this.prisma.tenant.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
    });

    const fallbackTenant = fallbackTenants.find((tenant) => this.isTenantDatabaseConfigured(tenant));

    if (!fallbackTenant) {
      return {
        id: 0,
        code: 'GLOBAL',
        name: 'Global DEV Access',
        isActive: true,
        dbMode: 'SHARED',
      };
    }

    return {
      id: fallbackTenant.id,
      code: fallbackTenant.code,
      name: fallbackTenant.name,
      isActive: fallbackTenant.isActive,
      dbMode: fallbackTenant.dbMode,
      dbName: fallbackTenant.dbName,
      dbHost: fallbackTenant.dbHost,
      dbPort: fallbackTenant.dbPort,
      dbUser: fallbackTenant.dbUser,
      dbPassword: fallbackTenant.dbPassword,
      dbUrl: fallbackTenant.dbUrl,
    };
  }

  private async getPrismaClientForTenant(tenant: TenantConfig): Promise<{
    prismaClient: PrismaService | PrismaClient;
    disconnect: null | (() => Promise<void>);
  }> {
    if (tenant.dbMode !== 'DEDICATED') {
      return {
        prismaClient: this.prisma,
        disconnect: null,
      };
    }

    const connectionUrl = this.resolveTenantConnectionUrl(tenant);
    if (!connectionUrl) {
      throw new UnauthorizedException('Dedicated tenant database connection is not configured');
    }

    const tenantPrisma = new PrismaClient({
      datasources: {
        db: {
          url: connectionUrl,
        },
      },
    });

    try {
      await tenantPrisma.$connect();
      return {
        prismaClient: tenantPrisma,
        disconnect: async () => {
          await tenantPrisma.$disconnect();
        },
      };
    } catch {
      await tenantPrisma.$disconnect();
      throw new UnauthorizedException('Unable to connect to dedicated tenant database');
    }
  }

  private resolveTenantConnectionUrl(tenant: {
    dbUrl?: string | null;
    dbHost?: string | null;
    dbPort?: string | null;
    dbName?: string | null;
    dbUser?: string | null;
    dbPassword?: string | null;
  }): string | null {
    const dbUrl = String(tenant.dbUrl || '').trim();
    if (dbUrl) {
      return dbUrl;
    }

    const dbHost = String(tenant.dbHost || '').trim();
    const dbPort = String(tenant.dbPort || '').trim() || '5432';
    const dbName = String(tenant.dbName || '').trim();
    const dbUser = String(tenant.dbUser || '').trim();
    const dbPassword = String(tenant.dbPassword || '').trim();

    if (!dbHost || !dbName || !dbUser || !dbPassword) {
      return null;
    }

    return `postgresql://${encodeURIComponent(dbUser)}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}`;
  }

  private isTenantDatabaseConfigured(tenant: {
    dbMode: TenantDbMode;
    dbUrl?: string | null;
    dbHost?: string | null;
    dbName?: string | null;
    dbUser?: string | null;
    dbPassword?: string | null;
  }) {
    if (tenant.dbMode !== 'DEDICATED') {
      return true;
    }

    const dbUrl = String(tenant.dbUrl || '').trim();
    if (dbUrl) {
      return true;
    }

    const dbHost = String(tenant.dbHost || '').trim();
    const dbName = String(tenant.dbName || '').trim();
    const dbUser = String(tenant.dbUser || '').trim();
    const dbPassword = String(tenant.dbPassword || '').trim();

    return Boolean(dbHost && dbName && dbUser && dbPassword);
  }

}
