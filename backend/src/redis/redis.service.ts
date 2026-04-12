import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from '@upstash/redis';

@Injectable()
export class RedisService implements OnModuleInit {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isAvailable = false;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  /**
   * Connect to Upstash Redis
   * Fails gracefully - app continues without Redis
   */
  private async connect(): Promise<void> {
    const url = this.configService.get<string>('UPSTASH_REDIS_REST_URL');
    const token = this.configService.get<string>('UPSTASH_REDIS_REST_TOKEN');

    if (!url || !token) {
      this.logger.warn('Redis not configured - running without cache');
      this.isAvailable = false;
      return;
    }

    try {
      this.client = new Redis({
        url,
        token,
      });

      // Test connection
      await this.client.ping();
      this.isAvailable = true;
      this.logger.log('✅ Upstash Redis connected');
    } catch (error) {
      this.logger.error(`Redis connection failed: ${error.message}`);
      this.isAvailable = false;
      this.client = null;
    }
  }

  /**
   * Check if Redis is available
   */
  isConnected(): boolean {
    return this.isAvailable && this.client !== null;
  }

  /**
   * Get value with fallback
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isAvailable || !this.client) return null;

    try {
      const value = await this.client.get(key);
      return value as T;
    } catch (error) {
      this.logger.warn(`Redis GET failed for ${key}: ${error.message}`);
      return null;
    }
  }

  /**
   * Set value with mandatory TTL
   * TTL is REQUIRED - no data without expiration
   */
  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    if (!this.isAvailable || !this.client) return;

    if (!ttlSeconds || ttlSeconds <= 0) {
      this.logger.warn(`Refusing to set ${key} without TTL`);
      return;
    }

    try {
      // Optimize: don't store large objects
      const serialized = JSON.stringify(value);
      if (serialized.length > 10000) {
        this.logger.warn(`Value too large for ${key} (${serialized.length} bytes) - skipping`);
        return;
      }

      await this.client.set(key, value, { ex: ttlSeconds });
    } catch (error) {
      this.logger.warn(`Redis SET failed for ${key}: ${error.message}`);
    }
  }

  /**
   * Delete key
   */
  async del(key: string): Promise<void> {
    if (!this.isAvailable || !this.client) return;

    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.warn(`Redis DEL failed for ${key}: ${error.message}`);
    }
  }

  /**
   * Increment counter (atomic)
   */
  async incr(key: string, ttlSeconds?: number): Promise<number> {
    if (!this.isAvailable || !this.client) return 0;

    try {
      const newValue = await this.client.incr(key);
      
      // Set TTL on first increment
      if (ttlSeconds && newValue === 1) {
        await this.client.expire(key, ttlSeconds);
      }
      
      return newValue;
    } catch (error) {
      this.logger.warn(`Redis INCR failed for ${key}: ${error.message}`);
      return 0;
    }
  }

  /**
   * Decrement counter
   */
  async decr(key: string): Promise<number> {
    if (!this.isAvailable || !this.client) return 0;

    try {
      return await this.client.decr(key);
    } catch (error) {
      this.logger.warn(`Redis DECR failed for ${key}: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get TTL remaining
   */
  async ttl(key: string): Promise<number> {
    if (!this.isAvailable || !this.client) return -1;

    try {
      return await this.client.ttl(key);
    } catch (error) {
      this.logger.warn(`Redis TTL failed for ${key}: ${error.message}`);
      return -1;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isAvailable || !this.client) return false;

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.warn(`Redis EXISTS failed for ${key}: ${error.message}`);
      return false;
    }
  }

  /**
   * Set expiration on existing key
   */
  async expire(key: string, ttlSeconds: number): Promise<void> {
    if (!this.isAvailable || !this.client) return;

    try {
      await this.client.expire(key, ttlSeconds);
    } catch (error) {
      this.logger.warn(`Redis EXPIRE failed for ${key}: ${error.message}`);
    }
  }

  /**
   * KEYS pattern - USE SPARINGLY (O(N) operation)
   * Only for maintenance/debug, never in production paths
   */
  async keys(pattern: string): Promise<string[]> {
    if (!this.isAvailable || !this.client) return [];

    try {
      return await this.client.keys(pattern);
    } catch (error) {
      this.logger.warn(`Redis KEYS failed: ${error.message}`);
      return [];
    }
  }
}
