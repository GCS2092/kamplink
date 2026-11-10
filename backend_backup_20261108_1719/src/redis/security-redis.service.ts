import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class SecurityRedisService {
  private readonly logger = new Logger(SecurityRedisService.name);

  private readonly MAX_LOGIN_ATTEMPTS = 3;
  private readonly LOGIN_BLOCK_DURATION = 900;
  private readonly LOGIN_WINDOW = 900;
  private readonly RESET_TOKEN_TTL = 600;
  private readonly MAX_RESET_TOKENS_PER_USER = 2;

  constructor(private redisService: RedisService) {}

  async recordFailedLogin(identifier: string): Promise<number | null> {
    if (!this.redisService.isConnected()) {
      this.logger.warn(`Redis down - cannot track login attempts for ${identifier}`);
      return 1;
    }

    const key = `auth:login:${identifier}`;
    const blockKey = `auth:block:${identifier}`;

    try {
      const isBlocked = await this.redisService.exists(blockKey);
      if (isBlocked) return null;

      const attempts = await this.redisService.incr(key, this.LOGIN_WINDOW);

      if (attempts >= this.MAX_LOGIN_ATTEMPTS) {
        await this.redisService.set(blockKey, '1', this.LOGIN_BLOCK_DURATION);
        await this.redisService.del(key);
        this.logger.warn(`Account blocked: ${identifier}`);
        return null;
      }

      return this.MAX_LOGIN_ATTEMPTS - attempts;
    } catch (error) {
      this.logger.error(`Failed to record login attempt: ${(error as Error).message}`);
      return 1;
    }
  }

  async isLoginBlocked(identifier: string): Promise<{ blocked: boolean; remainingSeconds?: number }> {
    if (!this.redisService.isConnected()) return { blocked: false };

    const blockKey = `auth:block:${identifier}`;

    try {
      const isBlocked = await this.redisService.exists(blockKey);
      if (!isBlocked) return { blocked: false };

      const ttl = await this.redisService.ttl(blockKey);
      return { blocked: true, remainingSeconds: ttl > 0 ? ttl : this.LOGIN_BLOCK_DURATION };
    } catch (error) {
      this.logger.error(`Failed to check block status: ${(error as Error).message}`);
      return { blocked: false };
    }
  }

  async clearLoginAttempts(identifier: string): Promise<void> {
    if (!this.redisService.isConnected()) return;

    const key = `auth:login:${identifier}`;
    const blockKey = `auth:block:${identifier}`;

    try {
      await this.redisService.del(key);
      await this.redisService.del(blockKey);
    } catch (error) {
      this.logger.warn(`Failed to clear login attempts: ${(error as Error).message}`);
    }
  }

  async createResetToken(userId: string): Promise<string | null> {
    if (!this.redisService.isConnected()) {
      this.logger.error('Redis down - cannot create reset token');
      return null;
    }

    try {
      const userTokensKey = `auth:reset:user:${userId}`;
      const existingTokens = await this.redisService.get<string[]>(userTokensKey) || [];

      if (existingTokens.length >= this.MAX_RESET_TOKENS_PER_USER) {
        this.logger.warn(`Too many reset tokens for user ${userId}`);
        return null;
      }

      const token = uuidv4();
      const tokenHash = await bcrypt.hash(token, 10);

      const tokenKey = `auth:reset:${tokenHash.substring(0, 20)}`;
      await this.redisService.set(tokenKey, { userId, createdAt: Date.now() }, this.RESET_TOKEN_TTL);

      const updatedTokens = [...existingTokens, tokenHash.substring(0, 20)];
      await this.redisService.set(userTokensKey, updatedTokens, this.RESET_TOKEN_TTL);

      return token;
    } catch (error) {
      this.logger.error(`Failed to create reset token: ${(error as Error).message}`);
      return null;
    }
  }

  async validateResetToken(token: string): Promise<string | null> {
    if (!this.redisService.isConnected()) {
      this.logger.error('Redis down - cannot validate reset token');
      return null;
    }

    try {
      const tokenHash = await bcrypt.hash(token, 10);
      const tokenKey = `auth:reset:${tokenHash.substring(0, 20)}`;

      const data = await this.redisService.get<{ userId: string; createdAt: number }>(tokenKey);
      if (!data) return null;

      return data.userId;
    } catch (error) {
      this.logger.error(`Failed to validate reset token: ${(error as Error).message}`);
      return null;
    }
  }

  async invalidateResetTokens(userId: string): Promise<void> {
    if (!this.redisService.isConnected()) return;

    try {
      const userTokensKey = `auth:reset:user:${userId}`;
      const tokens = await this.redisService.get<string[]>(userTokensKey) || [];

      for (const tokenHash of tokens) {
        await this.redisService.del(`auth:reset:${tokenHash}`);
      }

      await this.redisService.del(userTokensKey);
    } catch (error) {
      this.logger.warn(`Failed to invalidate reset tokens: ${(error as Error).message}`);
    }
  }

  async invalidateResetToken(token: string): Promise<void> {
    if (!this.redisService.isConnected()) return;

    try {
      const tokenHash = await bcrypt.hash(token, 10);
      await this.redisService.del(`auth:reset:${tokenHash.substring(0, 20)}`);
    } catch (error) {
      this.logger.warn(`Failed to invalidate token: ${(error as Error).message}`);
    }
  }

  async isIpBlocked(ip: string): Promise<boolean> {
    if (!this.redisService.isConnected()) return false;

    const key = `ip:block:${ip.replace(/:/g, '_')}`;

    try {
      return await this.redisService.exists(key);
    } catch {
      return false;
    }
  }

  async blockIp(ip: string, durationSeconds: number = 3600): Promise<void> {
    if (!this.redisService.isConnected()) return;

    const key = `ip:block:${ip.replace(/:/g, '_')}`;

    try {
      await this.redisService.set(key, '1', durationSeconds);
      this.logger.warn(`IP blocked: ${ip} for ${durationSeconds}s`);
    } catch (error) {
      this.logger.warn(`Failed to block IP: ${(error as Error).message}`);
    }
  }

  async getStats(): Promise<{
    connected: boolean;
    loginAttempts: number;
    blockedAccounts: number;
    resetTokens: number;
  }> {
    if (!this.redisService.isConnected()) {
      return { connected: false, loginAttempts: 0, blockedAccounts: 0, resetTokens: 0 };
    }

    try {
      const [loginKeys, blockKeys, resetKeys] = await Promise.all([
        this.redisService.keys('auth:login:*'),
        this.redisService.keys('auth:block:*'),
        this.redisService.keys('auth:reset:*'),
      ]);

      return {
        connected: true,
        loginAttempts: loginKeys.length,
        blockedAccounts: blockKeys.length,
        resetTokens: resetKeys.length,
      };
    } catch {
      return { connected: true, loginAttempts: 0, blockedAccounts: 0, resetTokens: 0 };
    }
  }
}