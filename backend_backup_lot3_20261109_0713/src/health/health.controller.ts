import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private prismaService: PrismaService) {}

  @Get()
  async check() {
    try {
      await this.prismaService.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        checks: { database: { status: 'up' } },
      };
    } catch (error) {
      throw new ServiceUnavailableException('Base de données indisponible');
    }
  }
}