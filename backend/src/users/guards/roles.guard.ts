import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole, ROLE_HIERARCHY } from '../enums/user-role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    
    if (!user) {
      return false;
    }

    // Verificar se o usuário tem um dos roles requeridos
    // ou um role superior na hierarquia
    return requiredRoles.some(role => {
      if (user.role === role) return true;
      
      // Verificar hierarquia - se o role do usuário inclui o role requerido
      const userRoleHierarchy = ROLE_HIERARCHY[user.role] || [];
      return userRoleHierarchy.includes(role);
    });
  }
}
