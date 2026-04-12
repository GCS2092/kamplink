import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * Light Cache Service for frequently accessed data
 * - Minimal TTL (30s - 2min max)
 * - Small objects only
 * - Never cache critical data
 * - Graceful fallback if Redis down
 * 
 * Redis Key Patterns:
 * - cache:profile:<userId> - User profile (light)
 * - cache:canal:<canalId> - Canal info (light)
 * - cache:espace:<espaceId> - Espace info (light)
 * - cache:count:<key> - Computed counts
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  // TTL constants (all short to save memory)
  private readonly PROFILE_TTL = 60;      // 1 minute
  private readonly CANAL_TTL = 120;       // 2 minutes
  private readonly ESPACE_TTL = 120;    // 2 minutes
  private readonly COUNT_TTL = 30;      // 30 seconds
  private readonly MAX_SIZE = 5000;     // Max 5KB per cached item

  constructor(private redisService: RedisService) {}

  // ─────────────────────────────────────────
  // PROFILE CACHE
  // ─────────────────────────────────────────

  /**
   * Cache user profile (lightweight data only)
   */
  async cacheProfile(userId: string, profile: any): Promise<void> {
    if (!this.isCacheable(profile)) return;

    const lightProfile = this.lightenProfile(profile);
    await this.redisService.set(
      `cache:profile:${userId}`,
      lightProfile,
      this.PROFILE_TTL,
    );
  }

  async getCachedProfile(userId: string): Promise<any | null> {
    return this.redisService.get(`cache:profile:${userId}`);
  }

  async invalidateProfile(userId: string): Promise<void> {
    await this.redisService.del(`cache:profile:${userId}`);
  }

  // ─────────────────────────────────────────
  // CANAL/ESPACE CACHE
  // ─────────────────────────────────────────

  async cacheCanal(canalId: string, canal: any): Promise<void> {
    if (!this.isCacheable(canal)) return;

    const lightCanal = this.lightenCanal(canal);
    await this.redisService.set(
      `cache:canal:${canalId}`,
      lightCanal,
      this.CANAL_TTL,
    );
  }

  async getCachedCanal(canalId: string): Promise<any | null> {
    return this.redisService.get(`cache:canal:${canalId}`);
  }

  async invalidateCanal(canalId: string): Promise<void> {
    await this.redisService.del(`cache:canal:${canalId}`);
  }

  async cacheEspace(espaceId: string, espace: any): Promise<void> {
    if (!this.isCacheable(espace)) return;

    const lightEspace = this.lightenEspace(espace);
    await this.redisService.set(
      `cache:espace:${espaceId}`,
      lightEspace,
      this.ESPACE_TTL,
    );
  }

  async getCachedEspace(espaceId: string): Promise<any | null> {
    return this.redisService.get(`cache:espace:${espaceId}`);
  }

  async invalidateEspace(espaceId: string): Promise<void> {
    await this.redisService.del(`cache:espace:${espaceId}`);
  }

  // ─────────────────────────────────────────
  // COMPUTED VALUES (counts, etc)
  // ─────────────────────────────────────────

  async cacheCount(key: string, count: number): Promise<void> {
    await this.redisService.set(
      `cache:count:${key}`,
      count,
      this.COUNT_TTL,
    );
  }

  async getCachedCount(key: string): Promise<number | null> {
    return this.redisService.get<number>(`cache:count:${key}`);
  }

  // ─────────────────────────────────────────
  // BULK INVALIDATION
  // ─────────────────────────────────────────

  /**
   * Invalidate all profile caches (e.g., after mass update)
   * Use sparingly - O(N) operation
   */
  async invalidateAllProfiles(): Promise<void> {
    if (!this.redisService.isConnected()) return;

    try {
      const keys = await this.redisService.keys('cache:profile:*');
      for (const key of keys.slice(0, 100)) { // Limit to avoid blocking
        await this.redisService.del(key);
      }
    } catch (error) {
      this.logger.warn(`Failed to invalidate profiles: ${error.message}`);
    }
  }

  /**
   * Invalidate all canal caches
   */
  async invalidateAllCanals(): Promise<void> {
    if (!this.redisService.isConnected()) return;

    try {
      const keys = await this.redisService.keys('cache:canal:*');
      for (const key of keys.slice(0, 100)) {
        await this.redisService.del(key);
      }
    } catch (error) {
      this.logger.warn(`Failed to invalidate canals: ${error.message}`);
    }
  }

  // ─────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────

  /**
   * Check if object is cacheable (size limit)
   */
  private isCacheable(obj: any): boolean {
    if (!this.redisService.isConnected()) return false;

    const size = JSON.stringify(obj).length;
    if (size > this.MAX_SIZE) {
      this.logger.warn(`Object too large to cache (${size} bytes)`);
      return false;
    }
    return true;
  }

  /**
   * Extract only essential profile fields
   */
  private lightenProfile(profile: any): any {
    return {
      id: profile.id,
      prenom: profile.prenom,
      nom: profile.nom,
      avatarUrl: profile.avatarUrl,
      statutVerification: profile.statutVerification,
      scoreReputation: profile.scoreReputation,
      // NO: bio, location, full history, etc.
    };
  }

  /**
   * Extract only essential canal fields
   */
  private lightenCanal(canal: any): any {
    return {
      id: canal.id,
      nom: canal.nom,
      description: canal.description,
      estPublic: canal.estPublic,
      espaceId: canal.espaceId,
      // NO: full member list, all messages, etc.
    };
  }

  /**
   * Extract only essential espace fields
   */
  private lightenEspace(espace: any): any {
    return {
      id: espace.id,
      nom: espace.nom,
      description: espace.description,
      type: espace.type,
      universiteId: espace.universiteId,
      // NO: full member list, all documents, etc.
    };
  }

  // ─────────────────────────────────────────
  // MONITORING
  // ─────────────────────────────────────────

  async getCacheStats(): Promise<{
    connected: boolean;
    profiles: number;
    canals: number;
    espaces: number;
    counts: number;
  }> {
    if (!this.redisService.isConnected()) {
      return {
        connected: false,
        profiles: 0,
        canals: 0,
        espaces: 0,
        counts: 0,
      };
    }

    try {
      const [profileKeys, canalKeys, espaceKeys, countKeys] = await Promise.all([
        this.redisService.keys('cache:profile:*'),
        this.redisService.keys('cache:canal:*'),
        this.redisService.keys('cache:espace:*'),
        this.redisService.keys('cache:count:*'),
      ]);

      return {
        connected: true,
        profiles: profileKeys.length,
        canals: canalKeys.length,
        espaces: espaceKeys.length,
        counts: countKeys.length,
      };
    } catch (error) {
      return {
        connected: true,
        profiles: 0,
        canals: 0,
        espaces: 0,
        counts: 0,
      };
    }
  }
}
