/**
 * Caching service using Redis with configurable TTL
 */

import { redisClient } from './redis.js';
import { TokenData } from '../types/token.js';

class CacheService {
  private defaultTTL: number = 300; // Increased to 5 minutes for better fault tolerance

  /**
   * Set default TTL in seconds
   */
  setDefaultTTL(ttl: number): void {
    this.defaultTTL = ttl;
  }

  /**
   * Get default TTL
   */
  getDefaultTTL(): number {
    return this.defaultTTL;
  }

  /**
   * Generate cache key
   */
  private getCacheKey(prefix: string, identifier: string): string {
    return `${prefix}:${identifier}`;
  }

  /**
   * Set token data in cache
   */
  async setToken(tokenId: string, data: TokenData, ttl?: number): Promise<void> {
    try {
      const key = this.getCacheKey('token', tokenId);
      const value = JSON.stringify(data);
      const expiry = ttl || this.defaultTTL;
      
      console.log(`🔧 [Cache] Setting token: ${tokenId} (TTL: ${expiry}s)`);
      await redisClient.setEx(key, expiry, value);
      console.log(`✅ [Cache] Token ${tokenId} cached successfully`);
    } catch (error) {
      console.error(`❌ [Cache] Error setting cache for token ${tokenId}:`, error);
    }
  }

  /**
   * Get token data from cache
   */
  async getToken(tokenId: string): Promise<TokenData | null> {
    try {
      console.log(`🔍 [Cache] Checking cache for token: ${tokenId}`);
      const key = this.getCacheKey('token', tokenId);
      const value = await redisClient.get(key);
      
      if (!value) {
        console.log(`❌ [Cache] Cache MISS for token: ${tokenId}`);
        return null;
      }
      
      console.log(`✅ [Cache] Cache HIT for token: ${tokenId}`);
      const ttl = await redisClient.ttl(key);
      console.log(`⏰ [Cache] Token ${tokenId} TTL: ${ttl}s remaining`);
      
      return JSON.parse(value) as TokenData;
    } catch (error) {
      console.error(`❌ [Cache] Error getting cache for token ${tokenId}:`, error);
      return null;
    }
  }

  /**
   * Set multiple tokens in cache
   */
  async setTokens(tokens: TokenData[], ttl?: number): Promise<void> {
    try {
      console.log(`🔧 [Cache] Setting ${tokens.length} tokens in cache...`);
      const pipeline = redisClient.multi();
      const expiry = ttl || this.defaultTTL;

      tokens.forEach((token) => {
        const key = this.getCacheKey('token', token.tokenId);
        const value = JSON.stringify(token);
        pipeline.setEx(key, expiry, value);
      });

      await pipeline.exec();
      console.log(`✅ [Cache] Successfully cached ${tokens.length} tokens (TTL: ${expiry}s)`);
    } catch (error) {
      console.error('❌ [Cache] Error setting multiple tokens in cache:', error);
    }
  }

  /**
   * Get multiple tokens from cache
   */
  async getTokens(tokenIds: string[]): Promise<Map<string, TokenData>> {
    const results = new Map<string, TokenData>();

    try {
      console.log(`🔍 [Cache] Fetching ${tokenIds.length} tokens from cache...`);
      const keys = tokenIds.map((id) => this.getCacheKey('token', id));
      const values = await redisClient.mGet(keys);

      let hitCount = 0;
      values.forEach((value, index) => {
        if (value && tokenIds[index]) {
          try {
            const token = JSON.parse(value) as TokenData;
            results.set(tokenIds[index], token);
            hitCount++;
          } catch (error) {
            console.error(`❌ [Cache] Error parsing cached token ${tokenIds[index]}:`, error);
          }
        }
      });

      const missCount = tokenIds.length - hitCount;
      console.log(`📊 [Cache] Results: ${hitCount} hits, ${missCount} misses (${((hitCount/tokenIds.length)*100).toFixed(1)}% hit rate)`);
    } catch (error) {
      console.error('❌ [Cache] Error getting multiple tokens from cache:', error);
    }

    return results;
  }

  /**
   * Set aggregated tokens list in cache
   */
  async setAggregatedTokens(data: TokenData[], ttl?: number): Promise<void> {
    try {
      const key = this.getCacheKey('aggregated', 'all');
      const value = JSON.stringify(data);
      const expiry = ttl || this.defaultTTL;
      
      console.log(`🔧 [Cache] Setting aggregated tokens list (${data.length} tokens, TTL: ${expiry}s)`);
      await redisClient.setEx(key, expiry, value);
      console.log(`✅ [Cache] Aggregated tokens list cached successfully`);
    } catch (error) {
      console.error('❌ [Cache] Error setting aggregated tokens in cache:', error);
    }
  }

  /**
   * Get aggregated tokens list from cache
   */
  async getAggregatedTokens(): Promise<TokenData[] | null> {
    try {
      console.log(`🔍 [Cache] Checking aggregated tokens cache...`);
      const key = this.getCacheKey('aggregated', 'all');
      const value = await redisClient.get(key);
      
      if (!value) {
        console.log(`❌ [Cache] Aggregated tokens cache MISS`);
        return null;
      }
      
      const ttl = await redisClient.ttl(key);
      const tokens = JSON.parse(value) as TokenData[];
      console.log(`✅ [Cache] Aggregated tokens cache HIT (${tokens.length} tokens, TTL: ${ttl}s remaining)`);
      
      return tokens;
    } catch (error) {
      console.error('❌ [Cache] Error getting aggregated tokens from cache:', error);
      return null;
    }
  }

  /**
   * Delete token from cache
   */
  async deleteToken(tokenId: string): Promise<void> {
    try {
      console.log(`🗑️  [Cache] Deleting token from cache: ${tokenId}`);
      const key = this.getCacheKey('token', tokenId);
      const result = await redisClient.del(key);
      console.log(`✅ [Cache] Token ${tokenId} deleted (${result} keys removed)`);
    } catch (error) {
      console.error(`❌ [Cache] Error deleting cache for token ${tokenId}:`, error);
    }
  }

  /**
   * Delete multiple tokens from cache
   */
  async deleteTokens(tokenIds: string[]): Promise<void> {
    try {
      console.log(`🗑️  [Cache] Deleting ${tokenIds.length} tokens from cache...`);
      const keys = tokenIds.map((id) => this.getCacheKey('token', id));
      if (keys.length > 0) {
        const result = await redisClient.del(keys);
        console.log(`✅ [Cache] Deleted ${result} tokens from cache`);
      }
    } catch (error) {
      console.error('❌ [Cache] Error deleting multiple tokens from cache:', error);
    }
  }

  /**
   * Clear all token caches
   */
  async clearAll(): Promise<void> {
    try {
      console.log(`🗑️  [Cache] Clearing all cache entries...`);
      const keys = await redisClient.keys('token:*');
      const aggregatedKeys = await redisClient.keys('aggregated:*');
      const allKeys = [...keys, ...aggregatedKeys];
      
      console.log(`🔍 [Cache] Found ${keys.length} token caches and ${aggregatedKeys.length} aggregated caches`);
      
      if (allKeys.length > 0) {
        await redisClient.del(allKeys);
        console.log(`✅ [Cache] Cleared ${allKeys.length} cache entries successfully`);
      } else {
        console.log(`ℹ️  [Cache] No cache entries to clear`);
      }
    } catch (error) {
      console.error('❌ [Cache] Error clearing cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    tokenCount: number;
    aggregatedCount: number;
    memoryUsage: string | null;
  }> {
    try {
      console.log(`📊 [Cache] Fetching cache statistics...`);
      const tokenKeys = await redisClient.keys('token:*');
      const aggregatedKeys = await redisClient.keys('aggregated:*');
      const info = await redisClient.info('memory');
      
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1] : null;

      const stats = {
        tokenCount: tokenKeys.length,
        aggregatedCount: aggregatedKeys.length,
        memoryUsage: memoryUsage || null,
      };

      console.log(`📊 [Cache] Stats: ${stats.tokenCount} tokens, ${stats.aggregatedCount} aggregated lists, ${stats.memoryUsage || 'N/A'} memory`);

      return stats;
    } catch (error) {
      console.error('❌ [Cache] Error getting cache stats:', error);
      return {
        tokenCount: 0,
        aggregatedCount: 0,
        memoryUsage: null,
      };
    }
  }

  /**
   * Check if token exists in cache
   */
  async hasToken(tokenId: string): Promise<boolean> {
    try {
      console.log(`🔍 [Cache] Checking existence for token: ${tokenId}`);
      const key = this.getCacheKey('token', tokenId);
      const exists = await redisClient.exists(key);
      const result = exists === 1;
      console.log(`${result ? '✅' : '❌'} [Cache] Token ${tokenId} ${result ? 'EXISTS' : 'DOES NOT EXIST'} in cache`);
      return result;
    } catch (error) {
      console.error(`❌ [Cache] Error checking cache for token ${tokenId}:`, error);
      return false;
    }
  }

  /**
   * Get TTL for a token
   */
  async getTokenTTL(tokenId: string): Promise<number> {
    try {
      console.log(`⏰ [Cache] Fetching TTL for token: ${tokenId}`);
      const key = this.getCacheKey('token', tokenId);
      const ttl = await redisClient.ttl(key);
      console.log(`⏰ [Cache] Token ${tokenId} TTL: ${ttl}s ${ttl === -2 ? '(key does not exist)' : ttl === -1 ? '(no expiry set)' : ''}`);
      return ttl;
    } catch (error) {
      console.error(`❌ [Cache] Error getting TTL for token ${tokenId}:`, error);
      return -1;
    }
  }
}

// Singleton instance
export const cacheService = new CacheService();
