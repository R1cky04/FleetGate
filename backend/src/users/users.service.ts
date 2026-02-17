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
    try {
      const { password, firstName, lastName, userCode, employeeNumber: _employeeNumber, ...rest } = createUserDto;

      // Validações específicas por role
      await this.validateUserRole(createUserDto);

      // Hash da senha se fornecida (não obrigatória para CLIENT)
      let hashedPassword: string | undefined;
      if (password) {
        hashedPassword = await bcrypt.hash(password, 10);
      }

      if (userCode) {
        const normalizedUserCodeCheck = userCode.toUpperCase();
        const existing = await this.prisma.user.findUnique({
          where: { userCode: normalizedUserCodeCheck },
        });

        if (existing) {
          throw new BadRequestException('userCode já está em uso');
        }
      }

      // Criar fullName
      const fullName = `${firstName} ${lastName}`;
      const normalizedUserCode = userCode.toUpperCase();
      const autoEmployeeNumber = createUserDto.role !== UserRole.CLIENT
        ? await this.getNextEmployeeNumber()
        : undefined;

      const user = await this.prisma.user.create({
        data: {
          ...rest,
          firstName,
          lastName,
          fullName,
          userCode: normalizedUserCode,
          password: hashedPassword,
          ...(autoEmployeeNumber ? { employeeNumber: autoEmployeeNumber } : {}),
          createdBy,
          status: UserStatus.ACTIVE,
        },
        include: {
          station: true,
          department: true,
          permissions: true,
        },
      });

      // Criar permissões padrão baseadas no role (não deve bloquear criação do usuário)
      try {
        await this.grantDefaultPermissions(user.id, user.role as UserRole, createdBy);
      } catch (permissionError) {
        console.error('Failed to grant default permissions:', permissionError);
      }

      // Remover senha do retorno
      const { password: _, ...userWithoutPassword } = user;

      if (createdBy) {
        await this.logActivity(createdBy, 'user.created', 'User', user.id.toString(), {
          userCode: user.userCode,
          role: user.role,
        });
      }

      return userWithoutPassword;
    } catch (error: any) {
      if (error instanceof BadRequestException || error instanceof ForbiddenException || error instanceof NotFoundException) {
        throw error;
      }

      if (error?.code === 'P2002') {
        const target = Array.isArray(error?.meta?.target)
          ? error.meta.target.join(', ')
          : String(error?.meta?.target || 'campo único');
        throw new BadRequestException(`Já existe um registo com o mesmo valor em: ${target}`);
      }

      if (error?.code === 'P2003') {
        throw new BadRequestException('Referência inválida (estação/departamento inexistente).');
      }

      if (error?.code === 'P2000') {
        throw new BadRequestException('Um dos campos excede o tamanho permitido.');
      }

      if (error?.code === 'P2025') {
        throw new BadRequestException('Registo relacionado não encontrado.');
      }

      console.error('Unexpected error creating user:', error);
      const reason = typeof error?.message === 'string' && error.message.trim().length > 0
        ? error.message
        : 'Erro desconhecido.'
      throw new BadRequestException(`Não foi possível criar o utilizador: ${reason}`);
    }
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

    await this.logActivity(id, 'user.updated', 'User', id.toString(), {
      fields: Object.keys(updateUserDto || {}),
    });

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async remove(id: number, removedBy: number) {
    await this.findOne(id);

    const actor = await this.prisma.user.findUnique({ where: { id: removedBy } });
    if (!actor) {
      throw new NotFoundException('Usuário executor não encontrado');
    }

    if (![UserRole.IT, UserRole.ADMIN].includes(actor.role as UserRole)) {
      throw new ForbiddenException('Apenas IT/ADMIN podem remover usuários');
    }

    try {
      await this.prisma.user.delete({ where: { id } });
      await this.logActivity(removedBy, 'user.deleted', 'User', id.toString(), {
        mode: 'hard-delete',
      });
      return { deleted: true, mode: 'hard-delete' };
    } catch (error: any) {
      if (error?.code === 'P2003') {
        await this.update(id, { status: UserStatus.INACTIVE });
        await this.logActivity(removedBy, 'user.deleted', 'User', id.toString(), {
          mode: 'soft-delete',
        });
        return { deleted: true, mode: 'soft-delete' };
      }
      throw error;
    }
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

  private async grantDefaultPermissions(userId: number, role: UserRole, grantedBy?: number) {
    const permissions = DEFAULT_PERMISSIONS[role] || [];

    if (permissions.length === 0) return;

    const effectiveGrantedBy = grantedBy ?? userId;

    await Promise.all(
      permissions.map(permission =>
        this.prisma.userPermission.create({
          data: {
            userId,
            permission,
            grantedBy: effectiveGrantedBy,
          },
        }),
      ),
    );
  }

  private async getNextEmployeeNumber(): Promise<string> {
    const usersWithEmployeeNumber = await this.prisma.user.findMany({
      where: {
        employeeNumber: {
          not: null,
        },
      },
      select: {
        employeeNumber: true,
      },
    });

    let maxValue = 0;
    for (const item of usersWithEmployeeNumber) {
      const rawValue = (item.employeeNumber || '').trim();
      const parsedValue = Number.parseInt(rawValue, 10);
      if (Number.isFinite(parsedValue) && parsedValue > maxValue) {
        maxValue = parsedValue;
      }
    }

    return String(maxValue + 1);
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
