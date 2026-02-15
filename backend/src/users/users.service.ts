import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { GrantPermissionDto, MoveStaffDto, RevokePermissionDto } from './dto/user-permissions.dto';
import { UserRole, UserStatus, DEFAULT_PERMISSIONS, ROLE_HIERARCHY, Permission } from './enums/user-role.enum';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto, createdBy?: number) {
    const { password, firstName, lastName, userCode, ...rest } = createUserDto;

    // Validações específicas por role
    await this.validateUserRole(createUserDto);

    // Hash da senha se fornecida (não obrigatória para CLIENT)
    let hashedPassword: string | undefined;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    if (userCode) {
      const normalizedUserCode = userCode.toUpperCase();
      const existing = await this.prisma.user.findUnique({
        where: { userCode: normalizedUserCode },
      });

      if (existing && existing.id !== id) {
        throw new BadRequestException('userCode já está em uso');
      }
    }

    // Criar fullName
    const fullName = `${firstName} ${lastName}`;

    const normalizedUserCode = userCode.toUpperCase();

    const user = await this.prisma.user.create({
      data: {
        ...rest,
        firstName,
        lastName,
        fullName,
        userCode: normalizedUserCode,
        password: hashedPassword,
        createdBy,
        status: UserStatus.ACTIVE,
      },
      include: {
        station: true,
        department: true,
        permissions: true,
      },
    });

    // Criar permissões padrão baseadas no role
    await this.grantDefaultPermissions(user.id, user.role as UserRole);

    // Remover senha do retorno
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async findAll(filters?: {
    role?: UserRole;
    status?: UserStatus;
    stationId?: string;
    customerType?: string;
    companyName?: string;
    brokerName?: string;
    search?: string;
  }) {
    const where: any = {};

    if (filters?.role) {
      where.role = filters.role;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.stationId) {
      where.stationId = filters.stationId;
    }

    if (filters?.customerType) {
      where.customerType = filters.customerType;
    }

    if (filters?.companyName) {
      where.companyName = { contains: filters.companyName, mode: 'insensitive' };
    }

    if (filters?.brokerName) {
      where.brokerName = { contains: filters.brokerName, mode: 'insensitive' };
    }

    if (filters?.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search } },
        { cpf: { contains: filters.search } },
        { nif: { contains: filters.search } },
        { userCode: { contains: filters.search, mode: 'insensitive' } },
        { companyName: { contains: filters.search, mode: 'insensitive' } },
        { brokerName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      include: {
        station: true,
        department: true,
        permissions: {
          where: { isActive: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Remover senhas
    return users.map(({ password, ...user }) => user);
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        station: true,
        department: true,
        permissions: {
          where: { isActive: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`Usuário com ID ${id} não encontrado`);
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    await this.findOne(id); // Verifica se existe

    const { password, firstName, lastName, userCode, ...rest } = updateUserDto;

    let hashedPassword: string | undefined;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Atualizar fullName se primeiro ou último nome mudaram
    let fullName: string | undefined;
    if (firstName || lastName) {
      const user = await this.prisma.user.findUnique({ where: { id } });
      if (user) {
        fullName = `${firstName || user.firstName} ${lastName || user.lastName}`;
      }
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...rest,
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(fullName && { fullName }),
        ...(hashedPassword && { password: hashedPassword }),
        ...(userCode && { userCode: userCode.toUpperCase() }),
      },
      include: {
        station: true,
        department: true,
        permissions: {
          where: { isActive: true },
        },
      },
    });

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async remove(id: number) {
    await this.findOne(id);

    // Soft delete - apenas inativa
    return this.update(id, { status: UserStatus.INACTIVE });
  }

  // ===== PERMISSIONS =====

  async grantPermissions(dto: GrantPermissionDto, grantedBy: number) {
    const user = await this.findOne(dto.userId);

    // Verificar se as permissões são válidas
    const validPermissions = Object.values(Permission);
    const invalidPermissions = dto.permissions.filter(p => !validPermissions.includes(p as Permission));
    
    if (invalidPermissions.length > 0) {
      throw new BadRequestException(`Permissões inválidas: ${invalidPermissions.join(', ')}`);
    }

    // Criar permissões
    const permissions = await Promise.all(
      dto.permissions.map(permission =>
        this.prisma.userPermission.create({
          data: {
            userId: dto.userId,
            permission,
            grantedBy,
            expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
          },
        }),
      ),
    );

    await this.logActivity(grantedBy, 'permission.granted', 'UserPermission', dto.userId.toString(), {
      permissions: dto.permissions,
      targetUser: user.fullName,
    });

    return permissions;
  }

  async revokePermissions(dto: RevokePermissionDto, revokedBy: number) {
    const user = await this.findOne(dto.userId);

    await this.prisma.userPermission.updateMany({
      where: {
        userId: dto.userId,
        permission: { in: dto.permissions },
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    await this.logActivity(revokedBy, 'permission.revoked', 'UserPermission', dto.userId.toString(), {
      permissions: dto.permissions,
      targetUser: user.fullName,
    });

    return { message: 'Permissões revogadas com sucesso' };
  }

  async getUserPermissions(userId: number): Promise<string[]> {
    const user = await this.findOne(userId);

    // Permissões padrão do role
    const defaultPerms = DEFAULT_PERMISSIONS[user.role] || [];

    // Permissões personalizadas ativas
    const customPerms = await this.prisma.userPermission.findMany({
      where: {
        userId,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gte: new Date() } },
        ],
      },
    });

    const customPermissions = customPerms.map(p => p.permission);

    // Combinar e remover duplicadas
    return [...new Set([...defaultPerms, ...customPermissions])];
  }

  async hasPermission(userId: number, permission: Permission): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissions.includes(permission);
  }

  async hasAnyPermission(userId: number, permissions: Permission[]): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    return permissions.some(p => userPermissions.includes(p));
  }

  async hasAllPermissions(userId: number, permissions: Permission[]): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    return permissions.every(p => userPermissions.includes(p));
  }

  // ===== STAFF MANAGEMENT =====

  async moveStaff(dto: MoveStaffDto, movedBy: number) {
    const mover = await this.findOne(movedBy);
    
    // Apenas ADMIN e IT podem mover staff
    if (![UserRole.ADMIN, UserRole.IT].includes(mover.role as UserRole)) {
      throw new ForbiddenException('Apenas ADMIN e IT podem mover staff entre estações');
    }

    const user = await this.findOne(dto.userId);

    // Verificar se é staff
    const allowedRoles = [UserRole.STAFF, UserRole.ADMIN, UserRole.FLEET];
    if (!allowedRoles.includes(user.role as UserRole)) {
      throw new BadRequestException('Apenas staff pode ser movido entre estações');
    }

    // Verificar se estação existe
    const station = await this.prisma.station.findUnique({
      where: { id: dto.newStationId },
    });

    if (!station) {
      throw new NotFoundException('Estação não encontrada');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: dto.userId },
      data: { stationId: dto.newStationId },
      include: { station: true },
    });

    await this.logActivity(movedBy, 'staff.moved', 'User', dto.userId.toString(), {
      from: user.station?.name,
      to: station.name,
      reason: dto.reason,
    });

    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  async getStaffByStation(stationId: string) {
    return this.findAll({
      stationId,
      status: UserStatus.ACTIVE,
    });
  }

  // ===== STATION VALIDATION =====

  async validateStationAccess(userId: number, stationId: string): Promise<boolean> {
    const user = await this.findOne(userId);

    // IT tem acesso a todas as estações
    if (user.role === UserRole.IT) {
      return true;
    }

    // CLIENT não tem estação
    if (user.role === UserRole.CLIENT) {
      return false;
    }

    // STAFF e FLEET só podem acessar sua própria estação
    if ([UserRole.STAFF, UserRole.FLEET].includes(user.role as UserRole)) {
      return user.stationId === stationId;
    }

    // ADMIN pode acessar sua estação
    if (user.role === UserRole.ADMIN) {
      return user.stationId === stationId;
    }

    return false;
  }

  async canManageStation(userId: number, stationId?: string): Promise<boolean> {
    const user = await this.findOne(userId);

    // Apenas IT pode criar/deletar estações
    if (!stationId) {
      return user.role === UserRole.IT;
    }

    // IT pode gerenciar qualquer estação
    if (user.role === UserRole.IT) {
      return true;
    }

    // ADMIN pode gerenciar apenas sua própria estação
    if (user.role === UserRole.ADMIN) {
      return user.stationId === stationId;
    }

    return false;
  }

  // ===== HELPERS =====

  private async validateUserRole(dto: CreateUserDto) {
    if (!dto.userCode) {
      throw new BadRequestException('userCode é obrigatório');
    }

    if (!dto.password && dto.role !== UserRole.CLIENT) {
      throw new BadRequestException(`${dto.role} precisa de password`);
    }

    // Staff, Admin e IT precisam de estação
    if ([UserRole.STAFF, UserRole.ADMIN, UserRole.FLEET].includes(dto.role) && !dto.stationId) {
      throw new BadRequestException(
        `${dto.role} precisa estar associado a uma estação`,
      );
    }

    const normalizedUserCode = dto.userCode.toUpperCase();
    const existingCode = await this.prisma.user.findUnique({
      where: { userCode: normalizedUserCode },
    });
    if (existingCode) {
      throw new BadRequestException('userCode já está em uso');
    }

    if (dto.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existing) {
        throw new BadRequestException('Email já está em uso');
      }
    }
  }

  private async grantDefaultPermissions(userId: number, role: UserRole) {
    const permissions = DEFAULT_PERMISSIONS[role] || [];

    if (permissions.length === 0) return;

    await Promise.all(
      permissions.map(permission =>
        this.prisma.userPermission.create({
          data: {
            userId,
            permission,
            grantedBy: 1, // System user ID
          },
        }),
      ),
    );
  }

  private async logActivity(
    userId: number,
    action: string,
    entityType: string,
    entityId: string,
    details?: any,
  ) {
    try {
      await this.prisma.activityLog.create({
        data: {
          userId,
          action,
          entityType,
          entityId,
          details: details ? JSON.stringify(details) : null,
        },
      });
    } catch (error) {
      // Log error but don't fail the operation
      console.error('Failed to log activity:', error);
    }
  }
}
