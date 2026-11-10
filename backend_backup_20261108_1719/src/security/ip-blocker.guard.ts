import { CanActivate, ExecutionContext, Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { SecurityService } from './security.service';

@Injectable()
export class IpBlockerGuard implements CanActivate {
  private readonly logger = new Logger(IpBlockerGuard.name);

  constructor(private securityService: SecurityService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = this.getClientIp(request);

    const isBlocked = await this.securityService.isIpBlocked(ip);
    
    if (isBlocked) {
      this.logger.warn(`Requête bloquée - IP interdite: ${ip}`);
      throw new ForbiddenException('Accès interdit');
    }

    return true;
  }

  private getClientIp(request: any): string {
    // Priorité aux headers de proxy/load balancer
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return realIp;
    }
    
    return request.ip || request.connection?.remoteAddress || 'unknown';
  }
}
