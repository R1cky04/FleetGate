import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service';
import { LoginDto } from './dto/login.dto';
import { UserRole, UserStatus } from '../../generated/prisma';

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
    const prismaClient = this.prisma;

    const user = await prismaClient.user.findUnique({
      where: { userCode: userCode.toUpperCase() },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User is not active');
    }

    if (user.role === UserRole.CLIENT) {
      throw new UnauthorizedException('Client profile has no login access');
    }

    const tenant = await this.resolveTenantForUser(user.tenantId ?? null, user.role);

    return { user, tenant, prismaClient };
  }

  async login(dto: LoginDto) {
    const { user, tenant, prismaClient } = await this.validateUser(dto.userCode, dto.password);
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

    const fallbackTenant = await this.prisma.tenant.findFirst({
      where: { isActive: true },
      orderBy: { id: 'asc' },
    });

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

}
