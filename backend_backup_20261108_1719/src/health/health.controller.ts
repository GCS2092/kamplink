import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private prismaService: PrismaService) {}

  @Get()
  async check() {
    try {
      // Vérifier la connexion DB avec une requête simple
      await this.prismaService.$queryRaw`SELECT 1`;
      
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        checks: {
          database: {
            status: 'up',
          },
        },
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        checks: {
          database: {
            status: 'down',
            error: error.message,
          },
        },
      };
    }
  }
}
