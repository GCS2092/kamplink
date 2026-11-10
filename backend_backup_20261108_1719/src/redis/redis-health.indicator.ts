import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { RedisService } from './redis.service';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(private redisService: RedisService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const isConnected = this.redisService.isConnected();

    if (isConnected) {
      return this.getStatus(key, true);
    }

    // Redis is optional - don't fail health check
    // Just report as "down" but still healthy overall
    return this.getStatus(key, true, {
      message: 'Redis not connected (running in fallback mode)',
    });
  }
}
