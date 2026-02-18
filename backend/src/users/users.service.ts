import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { GrantPermissionDto, MoveStaffDto, RevokePermissionDto } from './dto/user-permissions.dto';
import { UserRole, UserStatus, DEFAULT_PERMISSIONS, Permission } from './enums/user-role.enum';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private readonly userInclude = {
    tenant: {
      select: {
        code: true,
      },
    },
    station: true,
    clientProfile: true,
    staffProfile: {
      include: {
        station: true,
        department: true,
      },
    },
    permissions: {
      where: { isActive: true },
    },
  } as const;

  async create(createUserDto: CreateUserDto, createdBy?: number) {
    try {
      const dto = createUserDto as any;
      const { password, firstName, lastName, userCode } = createUserDto;

      // Validações específicas por role
      await this.validateUserRole(createUserDto);

      // Hash da senha se fornecida (não obrigatória para CLIENT)
      let hashedPassword: string | undefined;
      if (password && createUserDto.role !== UserRole.CLIENT) {
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
      const autoEmployeeNumber = [UserRole.STAFF, UserRole.ADMIN, UserRole.FLEET, UserRole.IT].includes(createUserDto.role)
        ? await this.getNextEmployeeNumber()
        : undefined;

      const dateOfBirth = this.parseDateValue(dto.dateOfBirth);
      const hireDate = this.parseDateValue(dto.hireDate);
      const licenseExpiry = this.parseDateValue(dto.licenseExpiry);
      const licenseIssueDate = this.parseDateValue(dto.licenseIssueDate);
      const idCardExpiry = this.parseDateValue(dto.idCardExpiry);

      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          role: dto.role,
          status: UserStatus.ACTIVE,
          firstName,
          lastName,
          fullName,
          phone: dto.phone,
          alternativePhone: dto.alternativePhone,
          cpf: dto.cpf,
          userCode: normalizedUserCode,
          password: hashedPassword,
          dateOfBirth,
          address: dto.address,
          city: dto.city,
          postalCode: dto.postalCode,
          country: dto.country || 'Portugal',
          stationId: dto.stationId,
          profileImage: dto.profileImage,
          emailVerified: dto.emailVerified ?? false,
          phoneVerified: dto.phoneVerified ?? false,
          acceptedTerms: dto.acceptedTerms ?? false,
          acceptedMarketing: dto.acceptedMarketing ?? false,
          createdBy,
          ...(createUserDto.role !== UserRole.DEV
            ? {
                clientProfile: {
                  create: {
                    nif: dto.nif,
                    licenseNumber: dto.licenseNumber,
                    licenseExpiry,
                    licenseIssueDate,
                    licenseCountry: dto.licenseCountry,
                    idCardNumber: dto.idCardNumber,
                    idCardExpiry,
                    customerType: dto.customerType,
                    companyName: dto.companyName,
                    companyTaxId: dto.companyTaxId,
                    brokerName: dto.brokerName,
                    brokerReference: dto.brokerReference,
                    isBlacklisted: dto.isBlacklisted ?? false,
                    blacklistReason: dto.blacklistReason,
                    blacklistedAt: this.parseDateValue(dto.blacklistedAt),
                    blacklistedBy: dto.blacklistedBy,
                    clientRating: dto.clientRating,
                    totalRentals: dto.totalRentals ?? 0,
                  },
                },
              }
            : {}),
          ...([UserRole.STAFF, UserRole.ADMIN, UserRole.FLEET, UserRole.IT].includes(createUserDto.role)
            ? {
                staffProfile: {
                  create: {
                    employeeNumber: dto.employeeNumber || autoEmployeeNumber || String(Date.now()),
                    hireDate,
                    departmentId: dto.departmentId,
                    stationId: dto.stationId as number,
                  },
                },
              }
            : {}),
        },
        include: this.userInclude,
      });

      // Criar permissões padrão baseadas no role (não deve bloquear criação do usuário)
      try {
        await this.grantDefaultPermissions(user.id, user.role as UserRole, createdBy);
      } catch (permissionError) {
        console.error('Failed to grant default permissions:', permissionError);
      }

      // Remover senha do retorno
      const userWithoutPassword = this.mapUserForResponse(user);

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
    stationId?: number;
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
      where.OR = [
        { stationId: filters.stationId },
        { staffProfile: { is: { stationId: filters.stationId } } },
      ];
    }

    if (filters?.customerType) {
      where.AND = [...(where.AND || []), { clientProfile: { is: { customerType: filters.customerType } } }];
    }

    if (filters?.companyName) {
      where.AND = [...(where.AND || []), { clientProfile: { is: { companyName: { contains: filters.companyName, mode: 'insensitive' } } } }];
    }

    if (filters?.brokerName) {
      where.AND = [...(where.AND || []), { clientProfile: { is: { brokerName: { contains: filters.brokerName, mode: 'insensitive' } } } }];
    }

    if (filters?.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search } },
        { cpf: { contains: filters.search } },
        { clientProfile: { is: { nif: { contains: filters.search } } } },
        { userCode: { contains: filters.search, mode: 'insensitive' } },
        { staffProfile: { is: { employeeNumber: { contains: filters.search } } } },
        { clientProfile: { is: { companyName: { contains: filters.search, mode: 'insensitive' } } } },
        { clientProfile: { is: { brokerName: { contains: filters.search, mode: 'insensitive' } } } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      include: this.userInclude,
      orderBy: { createdAt: 'desc' },
    });

    // Remover senhas
    return users.map(user => this.mapUserForResponse(user));
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: this.userInclude,
    });

    if (!user) {
      throw new NotFoundException(`Usuário com ID ${id} não encontrado`);
    }

    return this.mapUserForResponse(user);
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
      include: this.userInclude,
    });

    if (!existingUser) {
      throw new NotFoundException(`Usuário com ID ${id} não encontrado`);
    }

    const dto = updateUserDto as any;
    const { password, firstName, lastName, userCode } = updateUserDto;
    const targetRole = (dto.role ?? existingUser.role) as UserRole;

    let hashedPassword: string | undefined;
    if (password && targetRole !== UserRole.CLIENT) {
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
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(fullName && { fullName }),
        ...(hashedPassword && { password: hashedPassword }),
        ...(targetRole === UserRole.CLIENT && { password: null }),
        ...(userCode && { userCode: userCode.toUpperCase() }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.alternativePhone !== undefined && { alternativePhone: dto.alternativePhone }),
        ...(dto.cpf !== undefined && { cpf: dto.cpf }),
        ...(dto.dateOfBirth !== undefined && { dateOfBirth: this.parseDateValue(dto.dateOfBirth) }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.postalCode !== undefined && { postalCode: dto.postalCode }),
        ...(dto.country !== undefined && { country: dto.country }),
        ...(dto.stationId !== undefined && { stationId: dto.stationId }),
        ...(dto.profileImage !== undefined && { profileImage: dto.profileImage }),
        ...(dto.emailVerified !== undefined && { emailVerified: dto.emailVerified }),
        ...(dto.phoneVerified !== undefined && { phoneVerified: dto.phoneVerified }),
        ...(dto.acceptedTerms !== undefined && { acceptedTerms: dto.acceptedTerms }),
        ...(dto.acceptedMarketing !== undefined && { acceptedMarketing: dto.acceptedMarketing }),
      },
      include: this.userInclude,
    });

    const clientProfileData: any = {};
    if (dto.nif !== undefined) clientProfileData.nif = dto.nif || null;
    if (dto.licenseNumber !== undefined) clientProfileData.licenseNumber = dto.licenseNumber || null;
    if (dto.licenseExpiry !== undefined) clientProfileData.licenseExpiry = this.parseDateValue(dto.licenseExpiry) || null;
    if (dto.licenseIssueDate !== undefined) clientProfileData.licenseIssueDate = this.parseDateValue(dto.licenseIssueDate) || null;
    if (dto.licenseCountry !== undefined) clientProfileData.licenseCountry = dto.licenseCountry || null;
    if (dto.idCardNumber !== undefined) clientProfileData.idCardNumber = dto.idCardNumber || null;
    if (dto.idCardExpiry !== undefined) clientProfileData.idCardExpiry = this.parseDateValue(dto.idCardExpiry) || null;
    if (dto.customerType !== undefined) clientProfileData.customerType = dto.customerType || null;
    if (dto.companyName !== undefined) clientProfileData.companyName = dto.companyName || null;
    if (dto.companyTaxId !== undefined) clientProfileData.companyTaxId = dto.companyTaxId || null;
    if (dto.brokerName !== undefined) clientProfileData.brokerName = dto.brokerName || null;
    if (dto.brokerReference !== undefined) clientProfileData.brokerReference = dto.brokerReference || null;
    if (dto.isBlacklisted !== undefined) clientProfileData.isBlacklisted = dto.isBlacklisted;
    if (dto.blacklistReason !== undefined) clientProfileData.blacklistReason = dto.blacklistReason || null;
    if (dto.blacklistedAt !== undefined) clientProfileData.blacklistedAt = this.parseDateValue(dto.blacklistedAt) || null;
    if (dto.blacklistedBy !== undefined) clientProfileData.blacklistedBy = dto.blacklistedBy ?? null;
    if (dto.clientRating !== undefined) clientProfileData.clientRating = dto.clientRating ?? null;
    if (dto.totalRentals !== undefined) clientProfileData.totalRentals = dto.totalRentals ?? 0;

    if (Object.keys(clientProfileData).length > 0 && targetRole !== UserRole.DEV) {
      await this.prisma.clientProfile.upsert({
        where: { userId: id },
        create: {
          ...clientProfileData,
          totalRentals: clientProfileData.totalRentals ?? 0,
        },
        update: clientProfileData,
      });
    }

    if (targetRole === UserRole.DEV) {
      await this.prisma.clientProfile.deleteMany({ where: { userId: id } });
    }

    if (targetRole === UserRole.CLIENT || targetRole === UserRole.DEV) {
      await this.prisma.staffProfile.deleteMany({ where: { userId: id } });
    } else {
      const resolvedStationId = dto.stationId ?? user.stationId ?? existingUser.staffProfile?.stationId;
      if (!resolvedStationId) {
        throw new BadRequestException(`${targetRole} precisa estar associado a uma estação`);
      }

      await this.prisma.staffProfile.upsert({
        where: { userId: id },
        create: {
          userId: id,
          employeeNumber: dto.employeeNumber || existingUser.staffProfile?.employeeNumber || await this.getNextEmployeeNumber(),
          hireDate: dto.hireDate !== undefined ? this.parseDateValue(dto.hireDate) : existingUser.staffProfile?.hireDate,
          departmentId: dto.departmentId !== undefined ? dto.departmentId : existingUser.staffProfile?.departmentId,
          stationId: Number(resolvedStationId),
        },
        update: {
          ...(dto.employeeNumber !== undefined && { employeeNumber: dto.employeeNumber }),
          ...(dto.hireDate !== undefined && { hireDate: this.parseDateValue(dto.hireDate) || null }),
          ...(dto.departmentId !== undefined && { departmentId: dto.departmentId || null }),
          stationId: Number(resolvedStationId),
        },
      });
    }

    const refreshedUser = await this.prisma.user.findUnique({
      where: { id },
      include: this.userInclude,
    });

    await this.logActivity(id, 'user.updated', 'User', id.toString(), {
      fields: Object.keys(updateUserDto || {}),
    });

    return this.mapUserForResponse(refreshedUser || user);
  }

  async remove(id: number, removedBy: number) {
    await this.findOne(id);

    const actor = await this.prisma.user.findUnique({ where: { id: removedBy } });
    if (!actor) {
      throw new NotFoundException('Usuário executor não encontrado');
    }

    if (![UserRole.DEV, UserRole.IT, UserRole.ADMIN].includes(actor.role as UserRole)) {
      throw new ForbiddenException('Apenas DEV/IT/ADMIN podem remover usuários');
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
    if (![UserRole.DEV, UserRole.ADMIN, UserRole.IT].includes(mover.role as UserRole)) {
      throw new ForbiddenException('Apenas DEV, ADMIN e IT podem mover staff entre estações');
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
      data: {
        stationId: dto.newStationId,
        staffProfile: {
          upsert: {
            create: {
              stationId: dto.newStationId,
              employeeNumber: await this.getNextEmployeeNumber(),
            },
            update: {
              stationId: dto.newStationId,
            },
          },
        },
      },
      include: this.userInclude,
    });

    await this.logActivity(movedBy, 'staff.moved', 'User', dto.userId.toString(), {
      from: user.staffProfile?.station?.name || user.station?.name,
      to: station.name,
      reason: dto.reason,
    });

    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  async getStaffByStation(stationId: number) {
    return this.findAll({
      stationId,
      status: UserStatus.ACTIVE,
    });
  }

  async suspendStaff(userId: number, changedBy: number) {
    return this.updateStaffStatus(userId, changedBy, UserStatus.SUSPENDED);
  }

  async deactivateStaff(userId: number, changedBy: number) {
    return this.updateStaffStatus(userId, changedBy, UserStatus.INACTIVE);
  }

  async activateStaff(userId: number, changedBy: number) {
    return this.updateStaffStatus(userId, changedBy, UserStatus.ACTIVE);
  }

  // ===== STATION VALIDATION =====

  async validateStationAccess(userId: number, stationId: number): Promise<boolean> {
    const user = await this.findOne(userId);

    // IT tem acesso a todas as estações
    if (user.role === UserRole.IT || user.role === UserRole.DEV) {
      return true;
    }

    // CLIENT não tem estação
    if (user.role === UserRole.CLIENT) {
      return false;
    }

    // STAFF e FLEET só podem acessar sua própria estação
    if ([UserRole.STAFF, UserRole.FLEET].includes(user.role as UserRole)) {
      return this.getUserStationId(user) === stationId;
    }

    // ADMIN pode acessar sua estação
    if (user.role === UserRole.ADMIN) {
      return this.getUserStationId(user) === stationId;
    }

    return false;
  }

  async canManageStation(userId: number, stationId?: number): Promise<boolean> {
    const user = await this.findOne(userId);

    // Apenas IT pode criar/deletar estações
    if (!stationId) {
      return user.role === UserRole.DEV || user.role === UserRole.IT;
    }

    // IT pode gerenciar qualquer estação
    if (user.role === UserRole.DEV || user.role === UserRole.IT) {
      return true;
    }

    // ADMIN pode gerenciar apenas sua própria estação
    if (user.role === UserRole.ADMIN) {
      return this.getUserStationId(user) === stationId;
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

  private parseDateValue(value?: string | Date | null) {
    if (!value) return undefined;

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? undefined : value;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  private async getNextEmployeeNumber(): Promise<string> {
    const usersWithEmployeeNumber = await this.prisma.staffProfile.findMany({
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

  private getUserStationId(user: any): number | undefined {
    const stationId = user?.staffProfile?.stationId ?? user?.stationId;
    if (stationId === null || stationId === undefined) return undefined;
    return Number(stationId);
  }

  private async updateStaffStatus(userId: number, changedBy: number, status: UserStatus) {
    const actor = await this.prisma.user.findUnique({ where: { id: changedBy } });
    if (!actor) {
      throw new NotFoundException('Usuário executor não encontrado');
    }

    if (![UserRole.DEV, UserRole.IT, UserRole.ADMIN].includes(actor.role as UserRole)) {
      throw new ForbiddenException('Apenas DEV/IT/ADMIN podem alterar estado de staff');
    }

    if (userId === changedBy) {
      throw new BadRequestException('Não pode alterar o seu próprio estado');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      include: this.userInclude,
    });

    if (!target) {
      throw new NotFoundException(`Usuário com ID ${userId} não encontrado`);
    }

    if (target.role === UserRole.CLIENT) {
      throw new BadRequestException('A ação é apenas para contas staff');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { status },
      include: this.userInclude,
    });

    const action = status === UserStatus.SUSPENDED
      ? 'staff.suspended'
      : status === UserStatus.INACTIVE
        ? 'staff.deactivated'
        : 'staff.activated';

    await this.logActivity(changedBy, action, 'User', userId.toString(), {
      fromStatus: target.status,
      toStatus: status,
      targetRole: target.role,
      targetUserCode: target.userCode,
    });

    return this.mapUserForResponse(updated);
  }

  private mapUserForResponse(user: any) {
    const { password: _, ...safeUser } = user;
    return {
      ...safeUser,
      nif: safeUser.clientProfile?.nif ?? null,
      licenseNumber: safeUser.clientProfile?.licenseNumber ?? null,
      licenseExpiry: safeUser.clientProfile?.licenseExpiry ?? null,
      licenseIssueDate: safeUser.clientProfile?.licenseIssueDate ?? null,
      licenseCountry: safeUser.clientProfile?.licenseCountry ?? null,
      idCardNumber: safeUser.clientProfile?.idCardNumber ?? null,
      idCardExpiry: safeUser.clientProfile?.idCardExpiry ?? null,
      customerType: safeUser.clientProfile?.customerType ?? null,
      companyName: safeUser.clientProfile?.companyName ?? null,
      companyTaxId: safeUser.clientProfile?.companyTaxId ?? null,
      brokerName: safeUser.clientProfile?.brokerName ?? null,
      brokerReference: safeUser.clientProfile?.brokerReference ?? null,
      isBlacklisted: safeUser.clientProfile?.isBlacklisted ?? false,
      blacklistReason: safeUser.clientProfile?.blacklistReason ?? null,
      blacklistedAt: safeUser.clientProfile?.blacklistedAt ?? null,
      blacklistedBy: safeUser.clientProfile?.blacklistedBy ?? null,
      clientRating: safeUser.clientProfile?.clientRating ?? null,
      totalRentals: safeUser.clientProfile?.totalRentals ?? 0,
      employeeNumber: safeUser.staffProfile?.employeeNumber ?? null,
      hireDate: safeUser.staffProfile?.hireDate ?? null,
      departmentId: safeUser.staffProfile?.departmentId ?? null,
      department: safeUser.staffProfile?.department ?? null,
      stationId: safeUser.staffProfile?.stationId ?? safeUser.stationId ?? null,
      station: safeUser.staffProfile?.station ?? safeUser.station ?? null,
      tenantCode: safeUser.tenant?.code ?? null,
    };
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
