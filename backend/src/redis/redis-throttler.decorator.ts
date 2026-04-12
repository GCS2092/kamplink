import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { RedisThrottlerGuard, THROTTLE_OPTIONS_KEY } from './redis-throttler.guard';

interface ThrottleOptions {
  ttl?: number;           // seconds
  limit?: number;         // max requests
  blockDuration?: number; // seconds
}

/**
 * Decorator for applying Redis-based rate limiting
 * 
 * @example
 * // Strict: 5 requests per minute, 15min block
 * @Throttle({ ttl: 60, limit: 5, blockDuration: 900 })
 * login() { }
 * 
 * @example  
 * // Standard: 100 requests per minute, 5min block
 * @Throttle({ ttl: 60, limit: 100, blockDuration: 300 })
 * getUsers() { }
 * 
 * @example
 * // Lenient: 1000 requests per minute
 * @Throttle({ ttl: 60, limit: 1000 })
 * search() { }
 */
export function Throttle(options: ThrottleOptions) {
  return applyDecorators(
    SetMetadata(THROTTLE_OPTIONS_KEY, {
      ttl: options.ttl || 60,
      limit: options.limit || 100,
      blockDuration: options.blockDuration || 300,
    }),
    UseGuards(RedisThrottlerGuard),
  );
}

/**
 * Pre-configured throttlers for common use cases
 */

// Authentication endpoints (very strict)
export const ThrottleAuth = () => Throttle({ 
  ttl: 900,      // 15 minutes
  limit: 5,      // 5 attempts
  blockDuration: 900, // 15 minutes block
});

// API endpoints (standard)
export const ThrottleApi = () => Throttle({ 
  ttl: 60,       // 1 minute
  limit: 100,    // 100 requests
  blockDuration: 300, // 5 minutes block
});

// Public endpoints (lenient)
export const ThrottlePublic = () => Throttle({ 
  ttl: 60,       // 1 minute
  limit: 1000,   // 1000 requests
  blockDuration: 60,  // 1 minute block
});

// Search endpoints (moderate - search is expensive)
export const ThrottleSearch = () => Throttle({ 
  ttl: 60,       // 1 minute
  limit: 30,     // 30 searches
  blockDuration: 120, // 2 minutes block
});
