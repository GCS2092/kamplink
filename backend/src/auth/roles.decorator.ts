import { SetMetadata } from '@nestjs/common';

// Decorator utilisé pour définir les rôles requis sur une route
// Exemple : @Roles('admin', 'superadmin')
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);