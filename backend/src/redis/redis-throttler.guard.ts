import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RedisService } from './redis.service';

export interface ThrottleOptions {
  ttl: number;        // Time window in seconds
  limit: number;      // Max requests per window
  blockDuration?: number;  // Block duration after exceeding (seconds)
}

const defaultOptions: ThrottleOptions = {
  ttl: 60,      // 1 minute window
  limit: 100,   // 100 requests per minute
  blockDuration: 300,  // 5 minutes block
};

export const THROTTLE_OPTIONS_KEY = 'throttle:options';

/**
 * Optimized Redis-based Throttler
 * - Minimal storage: only counters per key
 * - Fast expiration
 * - Graceful fallback if Redis is down
 */
@Injectable()
export class RedisThrottlerGuard implements CanActivate {
  private readonly logger = new Logger(RedisThrottlerGuard.name);

  constructor(
    private redisService: RedisService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const key = this.getKey(request);

    // Get options from metadata or use defaults
    const options = this.reflector.get<ThrottleOptions>(
      THROTTLE_OPTIONS_KEY,
      context.getHandler(),
    ) || defaultOptions;

    // If Redis is down, allow request (fail open for availability)
    if (!this.redisService.isConnected()) {
      return true;
    }

    try {
      // Check if currently blocked
      const blockKey = `block:${key}`;
      const isBlocked = await this.redisService.exists(blockKey);
      
      if (isBlocked) {
        const ttl = await this.redisService.ttl(blockKey);
        throw new HttpException(
          {
            success: false,
            message: 'Trop de requêtes. Veuillez réessayer plus tard.',
            retryAfter: ttl,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Increment counter
      const counterKey = `rate:${key}`;
      const count = await this.redisService.incr(counterKey, options.ttl);

      // Check if limit exceeded
      if (count > options.limit) {
        // Block the client
        await this.redisService.set(
          blockKey,
          '1',
          options.blockDuration || 300,
        );

        // Clean up counter
        await this.redisService.del(counterKey);

        throw new HttpException(
          {
            success: false,
            message: 'Limite de requêtes dépassée. Veuillez réessayer plus tard.',
            retryAfter: options.blockDuration,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      // Redis error - log and allow (fail open)
      this.logger.warn(`Throttling check failed: ${(error as Error).message}`);
      return true;
    }
  }

  /**
   * Generate throttle key from request
   * Combines IP + userId if available
   */
  private getKey(request: Request): string {
    const ip = this.getClientIp(request);
    const userId = (request as any).user?.id;
    
    // If authenticated, use userId (more precise)
    // Otherwise use IP
    if (userId) {
      return `u:${userId}`;
    }
    
    // Normalize IP (handle IPv6)
    const normalizedIp = ip.replace(/:/g, '_');
    return `ip:${normalizedIp}`;
  }

  private getClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    const ip = forwarded 
      ? request.ip || 'unknown'
      : request.ip || request.connection.remoteAddress || 'unknown';
    return ip;
  }
}

