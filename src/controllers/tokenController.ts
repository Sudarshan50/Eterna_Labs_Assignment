/**
 * Token controller - handles API requests for token data
 */

import { Request, Response, NextFunction } from 'express';
import { tokenAggregationService } from '../lib/tokenAggregation.js';
import { cacheService } from '../lib/cacheService.js';
import { schedulerService } from '../lib/schedulerService.js';
import { apiClient } from '../lib/apiClients.js';
import { successResponse, errorResponse } from '../lib/responseUtils.js';
import { TokenData, TokenFilters, PaginatedTokenResponse } from '../types/token.js';
import { csvParser } from '../lib/csvParser.js';

class TokenController {
  /**
   * Apply filters to token list
   */
  private applyFilters(tokens: TokenData[], filters: TokenFilters): TokenData[] {
    let filtered = [...tokens];

    // Filter by minimum volume
    if (filters.minVolume) {
      const volumeKey = this.getVolumeKey(filters.timePeriod);
      filtered = filtered.filter(token => {
        const volume = token.volume[volumeKey] || 0;
        return volume >= (filters.minVolume || 0);
      });
    }

    // Filter by minimum price change
    if (filters.minPriceChange !== undefined) {
      const priceChangeKey = this.getPriceChangeKey(filters.timePeriod);
      filtered = filtered.filter(token => {
        const priceChange = token.priceChange[priceChangeKey] || 0;
        return priceChange >= (filters.minPriceChange || 0);
      });
    }

    // Filter by minimum market cap
    if (filters.minMarketCap) {
      filtered = filtered.filter(token => {
        return (token.marketCap || 0) >= (filters.minMarketCap || 0);
      });
    }

    // Filter by minimum liquidity
    if (filters.minLiquidity) {
      filtered = filtered.filter(token => {
        return (token.liquidity || 0) >= (filters.minLiquidity || 0);
      });
    }

    return filtered;
  }

  /**
   * Get volume key based on time period
   */
  private getVolumeKey(timePeriod?: '1h' | '6h' | '24h' | '7d'): 'h1' | 'h6' | 'h24' {
    switch (timePeriod) {
      case '1h':
        return 'h1';
      case '6h':
        return 'h6';
      case '7d':
      case '24h':
      default:
        return 'h24'; // Default to 24h for 7d as well (most recent 24h data)
    }
  }

  /**
   * Get price change key based on time period
   */
  private getPriceChangeKey(timePeriod?: '1h' | '6h' | '24h' | '7d'): 'h1' | 'h6' | 'h24' {
    switch (timePeriod) {
      case '1h':
        return 'h1';
      case '6h':
        return 'h6';
      case '7d':
      case '24h':
      default:
        return 'h24'; // Default to 24h for 7d as well
    }
  }

  /**
   * Sort token list
   */
  private sortTokens(tokens: TokenData[], filters: TokenFilters): TokenData[] {
    const { sortBy = 'volume', sortOrder = 'desc', timePeriod = '24h' } = filters;
    
    return tokens.sort((a, b) => {
      let valueA: number;
      let valueB: number;

      switch (sortBy) {
        case 'volume':
          const volumeKey = this.getVolumeKey(timePeriod);
          valueA = a.volume[volumeKey] || 0;
          valueB = b.volume[volumeKey] || 0;
          break;
          
        case 'priceChange':
          const priceChangeKey = this.getPriceChangeKey(timePeriod);
          valueA = a.priceChange[priceChangeKey] || 0;
          valueB = b.priceChange[priceChangeKey] || 0;
          break;
          
        case 'marketCap':
          valueA = a.marketCap || 0;
          valueB = b.marketCap || 0;
          break;
          
        case 'fdv':
          valueA = a.fdv || 0;
          valueB = b.fdv || 0;
          break;
          
        case 'price':
          valueA = a.priceUsd || 0;
          valueB = b.priceUsd || 0;
          break;
          
        case 'liquidity':
          valueA = a.liquidity || 0;
          valueB = b.liquidity || 0;
          break;
          
        case 'transactions':
          const txKey = this.getVolumeKey(timePeriod);
          valueA = (a.transactions[txKey]?.buys || 0) + (a.transactions[txKey]?.sells || 0);
          valueB = (b.transactions[txKey]?.buys || 0) + (b.transactions[txKey]?.sells || 0);
          break;
          
        default:
          valueA = a.volume.h24 || 0;
          valueB = b.volume.h24 || 0;
      }

      return sortOrder === 'asc' ? valueA - valueB : valueB - valueA;
    });
  }

  /**
   * Paginate token list with cursor-based pagination
   */
  private paginate(
    tokens: TokenData[],
    limit: number,
    cursor?: string
  ): PaginatedTokenResponse {
    // Validate and parse cursor
    const startIndex = cursor ? Math.max(0, parseInt(cursor, 10)) : 0;
    
    // Ensure limit is within reasonable bounds
    const safeLimit = Math.min(Math.max(1, limit), 100); // Min 1, Max 100
    
    const endIndex = startIndex + safeLimit;
    const paginatedTokens = tokens.slice(startIndex, endIndex);
    const hasMore = endIndex < tokens.length;

    return {
      data: paginatedTokens,
      pagination: {
        total: tokens.length,
        limit: safeLimit,
        cursor: startIndex.toString(),
        nextCursor: hasMore ? endIndex.toString() : null,
        hasMore,
      },
    };
  }

  /**
   * Get all tokens with filtering, sorting, and pagination
   */
  async getAllTokens(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      // Parse and validate query parameters
      const filters: TokenFilters = {
        timePeriod: this.validateTimePeriod(req.query.timePeriod as string),
        sortBy: this.validateSortBy(req.query.sortBy as string),
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') === 'asc' ? 'asc' : 'desc',
        limit: Math.min(Math.max(1, parseInt(req.query.limit as string) || 20), 100),
        cursor: req.query.cursor as string,
      };

      // Parse optional filter parameters
      if (req.query.minVolume) {
        filters.minVolume = Math.max(0, parseFloat(req.query.minVolume as string));
      }

      if (req.query.minPriceChange) {
        filters.minPriceChange = parseFloat(req.query.minPriceChange as string);
      }

      if (req.query.minMarketCap) {
        filters.minMarketCap = Math.max(0, parseFloat(req.query.minMarketCap as string));
      }

      if (req.query.minLiquidity) {
        filters.minLiquidity = Math.max(0, parseFloat(req.query.minLiquidity as string));
      }

      // Get all tokens
      const tokens = await tokenAggregationService.aggregateAllTokens();

      // Apply filters
      let filtered = this.applyFilters(tokens, filters);

      // Sort tokens
      filtered = this.sortTokens(filtered, filters);

      // Paginate
      const result = this.paginate(filtered, filters.limit!, filters.cursor);

      // Add metadata about filters applied
      const metadata = {
        filtersApplied: {
          timePeriod: filters.timePeriod,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
          minVolume: filters.minVolume,
          minPriceChange: filters.minPriceChange,
          minMarketCap: filters.minMarketCap,
          minLiquidity: filters.minLiquidity,
        },
        timestamp: new Date(),
      };

      return successResponse(res, { ...result, metadata }, 'Tokens retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Validate time period parameter
   */
  private validateTimePeriod(timePeriod?: string): '1h' | '6h' | '24h' | '7d' {
    const valid = ['1h', '6h', '24h', '7d'];
    return valid.includes(timePeriod || '') ? (timePeriod as '1h' | '6h' | '24h' | '7d') : '24h';
  }

  /**
   * Validate sort by parameter
   */
  private validateSortBy(sortBy?: string): 'volume' | 'priceChange' | 'marketCap' | 'fdv' | 'transactions' | 'price' | 'liquidity' {
    const valid = ['volume', 'priceChange', 'marketCap', 'fdv', 'transactions', 'price', 'liquidity'];
    return valid.includes(sortBy || '') ? (sortBy as any) : 'volume';
  }

  /**
   * Get a specific token by ID
   */
  async getTokenById(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const tokenId = req.params.tokenId as string;

      if (!tokenId) {
        return errorResponse(res, 'Token ID is required', 400);
      }

      const token = await tokenAggregationService.aggregateToken(tokenId);

      if (!token) {
        return errorResponse(res, 'Token not found', 404);
      }

      return successResponse(res, token, 'Token retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh a specific token (bypass cache)
   */
  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const tokenId = req.params.tokenId as string;

      if (!tokenId) {
        return errorResponse(res, 'Token ID is required', 400);
      }

      const token = await tokenAggregationService.refreshToken(tokenId);

      if (!token) {
        return errorResponse(res, 'Token not found', 404);
      }

      return successResponse(res, token, 'Token refreshed successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh all tokens (bypass cache)
   */
  async refreshAllTokens(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const tokens = await tokenAggregationService.refreshAllTokens();

      return successResponse(
        res,
        { count: tokens.length },
        'All tokens refreshed successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const stats = await cacheService.getStats();
      return successResponse(res, stats, 'Cache statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Clear all cache
   */
  async clearCache(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      await cacheService.clearAll();
      return successResponse(res, null, 'Cache cleared successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get rate limit status
   */
  async getRateLimitStatus(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const status = apiClient.getRateLimitStatus();
      return successResponse(res, status, 'Rate limit status retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get scheduler status
   */
  async getSchedulerStatus(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const status = {
        isRunning: schedulerService.isActive(),
        cacheTTL: cacheService.getDefaultTTL(),
      };
      return successResponse(res, status, 'Scheduler status retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Trigger manual update
   */
  async triggerUpdate(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      schedulerService.triggerManualUpdate();
      return successResponse(res, null, 'Manual update triggered');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get available tokens from CSV
   */
  async getAvailableTokens(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const tokens = csvParser.getAllTokens();
      return successResponse(
        res,
        { count: tokens.length, tokens },
        'Available tokens retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Health check endpoint
   */
  async healthCheck(req: Request, res: Response): Promise<Response> {
    const health = {
      status: 'healthy',
      timestamp: new Date(),
      services: {
        redis: redisClient.isOpen,
        scheduler: schedulerService.isActive(),
        csvLoaded: csvParser.isReady(),
        tokenCount: csvParser.getTokenCount(),
      },
    };

    return successResponse(res, health, 'Service is healthy');
  }
}

// Import redisClient for health check
import { redisClient } from '../lib/redis.js';

export const tokenController = new TokenController();
