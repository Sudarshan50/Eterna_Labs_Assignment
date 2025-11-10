/**
 * Token aggregation service - merges data from multiple DEX sources
 */

import { TokenData, DexScreenerPair, GeckoTerminalToken, TokenMetadata } from '../types/token.js';
import { apiClient } from './apiClients.js';
import { cacheService } from './cacheService.js';
import { csvParser } from './csvParser.js';

class TokenAggregationService {
  // Cache recently merged data in memory to avoid redundant processing
  private memoryCache: Map<string, { data: TokenData; timestamp: number }> = new Map();
  private readonly MEMORY_CACHE_TTL = 30000; // 30 seconds in-memory cache

  /**
   * Get from memory cache if available and not expired
   */
  private getFromMemoryCache(address: string): TokenData | null {
    const cached = this.memoryCache.get(address);
    if (cached && Date.now() - cached.timestamp < this.MEMORY_CACHE_TTL) {
      return cached.data;
    }
    // Clean up expired entry
    if (cached) {
      this.memoryCache.delete(address);
    }
    return null;
  }

  /**
   * Store in memory cache
   */
  private setMemoryCache(address: string, data: TokenData): void {
    this.memoryCache.set(address, { data, timestamp: Date.now() });
    
    // Limit memory cache size to 100 entries
    if (this.memoryCache.size > 100) {
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey) this.memoryCache.delete(firstKey);
    }
  }
  /**
   * Normalize DexScreener data to TokenData format
   */
  private normalizeDexScreenerData(
    pair: DexScreenerPair,
    metadata: TokenMetadata
  ): Partial<TokenData> {
    return {
      tokenId: metadata.tokenAddress,
      name: metadata.name,
      symbol: metadata.symbol,
      chainId: pair.chainId,
      priceUsd: parseFloat(pair.priceUsd) || 0,
      priceNative: parseFloat(pair.priceNative) || 0,
      priceChange: {
        h1: pair.priceChange?.h1 || 0,
        h6: pair.priceChange?.h6 || 0,
        h24: pair.priceChange?.h24 || 0,
      },
      volume: {
        h1: pair.volume?.h1 || 0,
        h6: pair.volume?.h6 || 0,
        h24: pair.volume?.h24 || 0,
      },
      transactions: {
        h1: {
          buys: pair.txns?.h1?.buys || 0,
          sells: pair.txns?.h1?.sells || 0,
        },
        h6: {
          buys: pair.txns?.h6?.buys || 0,
          sells: pair.txns?.h6?.sells || 0,
        },
        h24: {
          buys: pair.txns?.h24?.buys || 0,
          sells: pair.txns?.h24?.sells || 0,
        },
      },
      fdv: pair.fdv || 0,
      marketCap: pair.marketCap || null,
      liquidity: 0, // Not provided by DexScreener
      pairAddress: pair.pairAddress,
      dexId: pair.dexId,
      sources: ['dexscreener'],
      lastUpdated: new Date(),
    };
  }

  /**
   * Normalize GeckoTerminal data to TokenData format
   */
  private normalizeGeckoTerminalData(
    data: GeckoTerminalToken,
    metadata: TokenMetadata
  ): Partial<TokenData> {
    const pool = data.included?.[0];
    const attributes = data.data.attributes;

    return {
      tokenId: metadata.tokenAddress,
      name: metadata.name,
      symbol: metadata.symbol,
      chainId: 'solana',
      priceUsd: parseFloat(attributes.price_usd) || 0,
      priceNative: pool ? parseFloat(pool.attributes.base_token_price_native_currency) : 0,
      priceChange: {
        h1: pool ? parseFloat(pool.attributes.price_change_percentage?.h1 || '0') : 0,
        h6: pool ? parseFloat(pool.attributes.price_change_percentage?.h6 || '0') : 0,
        h24: pool ? parseFloat(pool.attributes.price_change_percentage?.h24 || '0') : 0,
      },
      volume: {
        h1: pool ? parseFloat(pool.attributes.volume_usd?.h1 || '0') : 0,
        h6: pool ? parseFloat(pool.attributes.volume_usd?.h6 || '0') : 0,
        h24: parseFloat(attributes.volume_usd?.h24 || '0'),
      },
      transactions: {
        h1: {
          buys: pool?.attributes.transactions?.h1?.buys || 0,
          sells: pool?.attributes.transactions?.h1?.sells || 0,
        },
        h6: {
          buys: pool?.attributes.transactions?.h6?.buys || 0,
          sells: pool?.attributes.transactions?.h6?.sells || 0,
        },
        h24: {
          buys: pool?.attributes.transactions?.h24?.buys || 0,
          sells: pool?.attributes.transactions?.h24?.sells || 0,
        },
      },
      fdv: parseFloat(attributes.fdv_usd) || 0,
      marketCap: attributes.market_cap_usd ? parseFloat(attributes.market_cap_usd) : null,
      liquidity: parseFloat(attributes.total_reserve_in_usd) || 0,
      pairAddress: pool?.attributes.address || '',
      dexId: 'unknown',
      sources: ['geckoterminal'],
      lastUpdated: new Date(),
    };
  }

  /**
   * Merge data from multiple sources intelligently
   */
  private mergeTokenData(
    dexScreenerPairs: DexScreenerPair[],
    geckoTerminalData: GeckoTerminalToken | null,
    metadata: TokenMetadata
  ): TokenData {
    const mergedData: Partial<TokenData> = {
      tokenId: metadata.tokenAddress,
      name: metadata.name,
      symbol: metadata.symbol,
      chainId: 'solana',
      sources: [],
      lastUpdated: new Date(),
    };

    // Merge DexScreener data (take the first pair with most volume)
    if (dexScreenerPairs && dexScreenerPairs.length > 0) {
      const bestPair = dexScreenerPairs.reduce((prev, current) =>
        (current.volume?.h24 || 0) > (prev.volume?.h24 || 0) ? current : prev
      );
      const dexData = this.normalizeDexScreenerData(bestPair, metadata);
      Object.assign(mergedData, dexData);
    }

    // Merge GeckoTerminal data (prefer if available, or average with DexScreener)
    if (geckoTerminalData) {
      const geckoData = this.normalizeGeckoTerminalData(geckoTerminalData, metadata);
      
      // If we have data from both sources, average the prices and volumes
      if (mergedData.sources && mergedData.sources.length > 0) {
        mergedData.priceUsd = ((mergedData.priceUsd || 0) + (geckoData.priceUsd || 0)) / 2;
        mergedData.volume = {
          h1: ((mergedData.volume?.h1 || 0) + (geckoData.volume?.h1 || 0)) / 2,
          h6: ((mergedData.volume?.h6 || 0) + (geckoData.volume?.h6 || 0)) / 2,
          h24: ((mergedData.volume?.h24 || 0) + (geckoData.volume?.h24 || 0)) / 2,
        };
        if (geckoData.liquidity !== undefined) {
          mergedData.liquidity = geckoData.liquidity;
        }
        mergedData.sources?.push('geckoterminal');
      } else {
        // Use GeckoTerminal data if DexScreener is not available
        Object.assign(mergedData, geckoData);
      }
    }

    return mergedData as TokenData;
  }

  /**
   * Fetch and aggregate a single token
   */
  async aggregateToken(tokenAddress: string): Promise<TokenData | null> {
    try {
      console.log(`\n🔄 [Aggregation] Starting aggregation for token: ${tokenAddress}`);
      
      // Check memory cache first (fastest)
      const memCached = this.getFromMemoryCache(tokenAddress);
      if (memCached) {
        console.log(`⚡ [Aggregation] Using in-memory cache for ${tokenAddress}`);
        return memCached;
      }

      // Check Redis cache
      const cached = await cacheService.getToken(tokenAddress);
      if (cached) {
        console.log(`✅ [Aggregation] Using Redis cache for ${tokenAddress}`);
        // Store in memory cache for faster subsequent access
        this.setMemoryCache(tokenAddress, cached);
        return cached;
      }

      console.log(`⚠️  [Aggregation] Cache miss - fetching fresh data for ${tokenAddress}`);

      // Get metadata from CSV
      const metadata = csvParser.getToken(tokenAddress);
      if (!metadata) {
        console.error(`❌ [Aggregation] Token ${tokenAddress} not found in CSV`);
        return null;
      }

      console.log(`📋 [Aggregation] Token metadata: ${metadata.name} (${metadata.symbol})`);

      // Fetch from both APIs in parallel (faster)
      console.log(`🌐 [Aggregation] Fetching from DexScreener and GeckoTerminal...`);
      const [dexScreenerPairs, geckoTerminalData] = await Promise.allSettled([
        apiClient.fetchFromDexScreener(tokenAddress),
        apiClient.fetchFromGeckoTerminal(tokenAddress),
      ]);

      const dexData = dexScreenerPairs.status === 'fulfilled' ? dexScreenerPairs.value : [];
      const geckoData = geckoTerminalData.status === 'fulfilled' ? geckoTerminalData.value : null;

      console.log(`📊 [Aggregation] API Results - DexScreener: ${dexData.length} pair(s), GeckoTerminal: ${geckoData ? '✓' : '✗'}`);

      // Merge data - even if only ONE source has data, we'll use it!
      const tokenData = this.mergeTokenData(dexData, geckoData, metadata);

      // Only cache and return if we have at least ONE source of data
      if (!tokenData.sources || tokenData.sources.length === 0) {
        console.error(`❌ [Aggregation] No data available from any source for ${tokenAddress}`);
        return null;
      }

      console.log(`✅ [Aggregation] Merged token data - Sources: [${tokenData.sources.join(', ')}]`);
      console.log(`💰 [Aggregation] Price: $${tokenData.priceUsd.toFixed(8)}, Vol 24h: $${tokenData.volume.h24.toFixed(2)}`);

      // Cache in both Redis and memory
      await cacheService.setToken(tokenAddress, tokenData, 300);
      this.setMemoryCache(tokenAddress, tokenData);
      console.log(`📦 [Aggregation] Cached in Redis + Memory (${tokenData.sources.length} source(s))`);

      return tokenData;
    } catch (error) {
      console.error(`❌ [Aggregation] Error aggregating token ${tokenAddress}:`, error);
      return null;
    }
  }

  /**
   * Fetch and aggregate all tokens from CSV
   */
  async aggregateAllTokens(): Promise<TokenData[]> {
    try {
      console.log(`\n🔄 [Aggregation] Starting aggregation for ALL tokens...`);
      
      // Check cache first
      const cached = await cacheService.getAggregatedTokens();
      if (cached) {
        console.log(`✅ [Aggregation] Using cached aggregated data (${cached.length} tokens)`);
        return cached;
      }

      console.log('⚠️  [Aggregation] Cache miss - fetching fresh data for all tokens...');

      const allTokens = csvParser.getAllTokens();
      console.log(`📋 [Aggregation] Found ${allTokens.length} tokens in CSV`);
      
      // First, check individual token caches to minimize API calls
      const results: TokenData[] = [];
      const uncachedTokens: TokenMetadata[] = [];

      console.log(`\n🔍 [Aggregation] Checking individual token caches...`);
      for (const token of allTokens) {
        const cached = await cacheService.getToken(token.tokenAddress);
        if (cached) {
          results.push(cached);
          console.log(`✅ [Cache HIT] ${token.symbol}`);
        } else {
          uncachedTokens.push(token);
          console.log(`⚠️  [Cache MISS] ${token.symbol}`);
        }
      }

      console.log(`\n📊 [Cache Stats] ${results.length} cached, ${uncachedTokens.length} need fetching`);

      // Only fetch uncached tokens
      if (uncachedTokens.length > 0) {
        console.log(`\n🌐 [Aggregation] Fetching ${uncachedTokens.length} tokens from APIs (concurrency: 2)...`);
        
        // Process tokens in small chunks and cache immediately
        const chunks: TokenMetadata[][] = [];
        for (let i = 0; i < uncachedTokens.length; i += 2) {
          chunks.push(uncachedTokens.slice(i, i + 2));
        }

        console.log(`📦 [Aggregation] Split into ${chunks.length} chunk(s) for immediate caching`);

        let successCount = 0;
        let failCount = 0;

        for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
          const chunk = chunks[chunkIndex];
          if (!chunk) continue;
          
          console.log(`\n� [Aggregation] Processing chunk ${chunkIndex + 1}/${chunks.length}...`);
          
          const tokenAddresses = chunk.map(t => t.tokenAddress);
          const rawData = await apiClient.fetchMultipleTokens(tokenAddresses, 2);

          // Process and cache each token IMMEDIATELY after fetch
          for (const [address, data] of rawData.entries()) {
            const metadata = csvParser.getToken(address);
            if (!metadata) {
              console.warn(`⚠️  [Aggregation] Skipping ${address} - metadata not found`);
              failCount++;
              continue;
            }

            try {
              const tokenData = this.mergeTokenData(
                data.dexScreener,
                data.geckoTerminal,
                metadata
              );

              // ✨ Cache even if only ONE API returned data (partial data is better than no data!)
              if (tokenData.sources && tokenData.sources.length > 0) {
                await cacheService.setToken(address, tokenData, 300);
                console.log(`💾 [Cache] Immediately cached ${metadata.symbol} with 5min TTL (Sources: ${tokenData.sources.join(', ')})`);
                
                results.push(tokenData);
                successCount++;
                console.log(`✅ [Aggregation] ${metadata.symbol}: $${tokenData.priceUsd.toFixed(8)} from [${tokenData.sources.join(', ')}]`);
              } else {
                console.warn(`⚠️  [Aggregation] ${metadata.symbol} - No data from any source, skipping`);
                failCount++;
              }
            } catch (error) {
              console.error(`❌ [Aggregation] Failed to merge data for ${metadata.symbol}:`, error);
              failCount++;
            }
          }

          // Add delay between chunks
          if (chunkIndex < chunks.length - 1) {
            console.log(`⏳ [Aggregation] Waiting 2s before next chunk...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
          // ✨ Cache the aggregated list progressively after each chunk (5 minutes)
          console.log(`💾 [Cache] Progressive update: Caching ${results.length} tokens so far...`);
          await cacheService.setAggregatedTokens(results, 300);
        }

        console.log(`\n📊 [Aggregation] Fetch results: ${successCount} succeeded, ${failCount} failed`);
      }

      console.log(`\n💾 [Aggregation] Caching full list (${results.length} tokens) with 5min TTL...`);

      // Cache the full aggregated list with longer TTL (5 minutes)
      await cacheService.setAggregatedTokens(results, 300);

      console.log(`✅ [Aggregation] Completed! Total: ${results.length} tokens\n`);
      return results;
    } catch (error) {
      console.error('❌ [Aggregation] Error aggregating all tokens:', error);
      return [];
    }
  }

  /**
   * Refresh a specific token (bypass cache)
   */
  async refreshToken(tokenAddress: string): Promise<TokenData | null> {
    console.log(`🔄 [Aggregation] Refreshing token: ${tokenAddress} (bypassing cache)`);
    // Clear both caches
    this.memoryCache.delete(tokenAddress);
    await cacheService.deleteToken(tokenAddress);
    return this.aggregateToken(tokenAddress);
  }

  /**
   * Refresh all tokens (bypass cache)
   */
  async refreshAllTokens(): Promise<TokenData[]> {
    console.log(`🔄 [Aggregation] Refreshing ALL tokens (bypassing cache)`);
    // Clear both caches
    this.memoryCache.clear();
    await cacheService.clearAll();
    return this.aggregateAllTokens();
  }

  /**
   * Clear memory cache (useful for testing/debugging)
   */
  clearMemoryCache(): void {
    const size = this.memoryCache.size;
    this.memoryCache.clear();
    console.log(`🧹 [Memory Cache] Cleared ${size} entries`);
  }

  /**
   * Get memory cache stats
   */
  getMemoryCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.memoryCache.size,
      entries: Array.from(this.memoryCache.keys()),
    };
  }
}

// Singleton instance
export const tokenAggregationService = new TokenAggregationService();
