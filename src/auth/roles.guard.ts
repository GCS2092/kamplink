import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// Guard qui vérifie le rôle de l'utilisateur
// Utilisé conjointement avec @Roles() decorator
// Toujours utilisé APRÈS AuthGuard (qui charge req.user)
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Récupère les rôles requis définis par @Roles()
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());

    // Si pas de @Roles() défini, accès libre
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }

    // Vérifie si le rôle de l'utilisateur est dans la liste des rôles requis
    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException('Permissions insuffisantes');
    }

    return true;
  }
}