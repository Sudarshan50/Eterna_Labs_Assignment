/**
 * API clients for DexScreener and GeckoTerminal with retry logic and rate limiting
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { DexScreenerPair, GeckoTerminalToken } from '../types/token.js';

// Rate limiting configuration
const RATE_LIMIT = {
  dexScreener: {
    maxRequests: 250, // Reduced from 300 to add safety buffer
    perMinute: 60000,
    requestCount: 0,
    resetTime: Date.now() + 60000,
  },
  geckoTerminal: {
    maxRequests: 25, // Reduced from 30 to add safety buffer
    perMinute: 60000,
    requestCount: 0,
    resetTime: Date.now() + 60000,
  },
};

// Exponential backoff configuration
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 5, // Increased from 3 to handle more retries
  baseDelay: 2000, // Increased from 1000ms to 2000ms
  maxDelay: 30000, // Increased from 10000ms to 30000ms
};

class APIClient {
  private dexScreenerClient: AxiosInstance;
  private geckoTerminalClient: AxiosInstance;

  constructor() {
    this.dexScreenerClient = axios.create({
      baseURL: 'https://api.dexscreener.com',
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
      },
    });

    this.geckoTerminalClient = axios.create({
      baseURL: 'https://api.geckoterminal.com/api/v2',
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
      },
    });
  }

  /**
   * Exponential backoff delay calculation
   */
  private calculateBackoffDelay(retryCount: number, config: RetryConfig): number {
    const delay = Math.min(
      config.baseDelay * Math.pow(2, retryCount),
      config.maxDelay
    );
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check and wait for rate limit
   */
  private async checkRateLimit(service: 'dexScreener' | 'geckoTerminal'): Promise<void> {
    const limiter = RATE_LIMIT[service];
    const now = Date.now();

    // Reset counter if time window has passed
    if (now >= limiter.resetTime) {
      if (limiter.requestCount > 0) {
        console.log(`🔄 [Rate Limit] ${service} counter reset (used ${limiter.requestCount}/${limiter.maxRequests} in last window)`);
      }
      limiter.requestCount = 0;
      limiter.resetTime = now + limiter.perMinute;
    }

    // Wait if rate limit exceeded
    if (limiter.requestCount >= limiter.maxRequests) {
      const waitTime = limiter.resetTime - now;
      console.log(`⏳ [Rate Limit] ${service} limit reached (${limiter.maxRequests}/${limiter.maxRequests}). Waiting ${Math.ceil(waitTime/1000)}s...`);
      await this.sleep(waitTime);
      limiter.requestCount = 0;
      limiter.resetTime = Date.now() + limiter.perMinute;
    }

    limiter.requestCount++;
    const remaining = limiter.maxRequests - limiter.requestCount;
    console.log(`📊 [Rate Limit] ${service}: ${limiter.requestCount}/${limiter.maxRequests} used (${remaining} remaining)`);
  }

  /**
   * Generic retry logic with exponential backoff
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    config: RetryConfig = DEFAULT_RETRY_CONFIG
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        const axiosError = error as AxiosError;

        // Log the error details
        console.error(`❌ [API Error] Attempt ${attempt + 1}/${config.maxRetries + 1} failed`);
        if (axiosError.response) {
          console.error(`❌ [API Error] Status: ${axiosError.response.status} ${axiosError.response.statusText}`);
          console.error(`❌ [API Error] URL: ${axiosError.config?.url}`);
          
          // Special handling for 429 (Too Many Requests)
          if (axiosError.response.status === 429) {
            const retryAfter = axiosError.response.headers['retry-after'];
            const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : config.maxDelay;
            console.warn(`⚠️  [API Error] Rate limit exceeded. Waiting ${waitTime}ms before retry...`);
            await this.sleep(waitTime);
          }
        } else if (axiosError.request) {
          console.error(`❌ [API Error] No response received - Network error`);
        } else {
          console.error(`❌ [API Error] ${axiosError.message}`);
        }

        // Don't retry on 4xx errors (except 429)
        if (axiosError.response?.status && 
            axiosError.response.status >= 400 && 
            axiosError.response.status < 500 && 
            axiosError.response.status !== 429) {
          console.error(`❌ [API Error] Non-retryable error (${axiosError.response.status}). Giving up.`);
          throw error;
        }

        if (attempt < config.maxRetries) {
          const delay = this.calculateBackoffDelay(attempt, config);
          console.log(`⚠️  [API Retry] Attempt ${attempt + 1} failed. Retrying in ${Math.ceil(delay/1000)}s...`);
          await this.sleep(delay);
        } else {
          console.error(`❌ [API Error] All ${config.maxRetries + 1} attempts exhausted. Giving up.`);
        }
      }
    }

    throw lastError;
  }

  /**
   * Fetch token data from DexScreener
   */
  async fetchFromDexScreener(tokenAddress: string): Promise<DexScreenerPair[]> {
    await this.checkRateLimit('dexScreener');

    console.log(`🔵 [DexScreener] Fetching token: ${tokenAddress}`);
    console.log(`🔗 [DexScreener] URL: https://api.dexscreener.com/tokens/v1/solana/${tokenAddress}`);

    return this.retryWithBackoff(async () => {
      const startTime = Date.now();
      const response = await this.dexScreenerClient.get<DexScreenerPair[]>(
        `/tokens/v1/solana/${tokenAddress}`
      );
      const duration = Date.now() - startTime;
      
      const pairs = response.data || [];
      console.log(`✅ [DexScreener] Success for ${tokenAddress} - Found ${pairs.length} pair(s) in ${duration}ms`);
      
      if (pairs.length > 0 && pairs[0]) {
        console.log(`📊 [DexScreener] Top pair: ${pairs[0].dexId} - Price: $${pairs[0].priceUsd} - Volume 24h: $${pairs[0].volume?.h24 || 0}`);
      } else {
        console.log(`⚠️  [DexScreener] No pairs found for token ${tokenAddress}`);
      }
      
      return pairs;
    });
  }

  /**
   * Fetch token data from GeckoTerminal
   */
  async fetchFromGeckoTerminal(tokenAddress: string): Promise<GeckoTerminalToken> {
    await this.checkRateLimit('geckoTerminal');

    console.log(`🟢 [GeckoTerminal] Fetching token: ${tokenAddress}`);
    console.log(`🔗 [GeckoTerminal] URL: https://api.geckoterminal.com/api/v2/networks/solana/tokens/${tokenAddress}?include=top_pools&include_composition=false`);

    return this.retryWithBackoff(async () => {
      const startTime = Date.now();
      const response = await this.geckoTerminalClient.get<GeckoTerminalToken>(
        `/networks/solana/tokens/${tokenAddress}`,
        {
          params: {
            include: 'top_pools',
            include_composition: false,
          },
        }
      );
      const duration = Date.now() - startTime;
      
      const data = response.data;
      console.log(`✅ [GeckoTerminal] Success for ${tokenAddress} in ${duration}ms`);
      console.log(`📊 [GeckoTerminal] ${data.data.attributes.name} (${data.data.attributes.symbol}) - Price: $${data.data.attributes.price_usd} - Volume 24h: $${data.data.attributes.volume_usd.h24}`);
      
      if (data.included && data.included.length > 0) {
        console.log(`📊 [GeckoTerminal] Found ${data.included.length} pool(s)`);
      }
      
      return data;
    });
  }

  /**
   * Fetch multiple tokens in batch (with concurrency control)
   */
  async fetchMultipleTokens(
    tokenAddresses: string[],
    concurrency: number = 2 // Reduced from 5 to 2 for better rate limit control
  ): Promise<Map<string, { dexScreener: DexScreenerPair[]; geckoTerminal: GeckoTerminalToken | null }>> {
    console.log(`\n🚀 [Batch Fetch] Starting batch fetch for ${tokenAddresses.length} tokens (concurrency: ${concurrency})`);
    const results = new Map();
    const chunks: string[][] = [];

    // Split into chunks for controlled concurrency
    for (let i = 0; i < tokenAddresses.length; i += concurrency) {
      chunks.push(tokenAddresses.slice(i, i + concurrency));
    }

    console.log(`📦 [Batch Fetch] Split into ${chunks.length} chunk(s)`);

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      if (!chunk) continue;
      
      console.log(`\n📦 [Batch Fetch] Processing chunk ${chunkIndex + 1}/${chunks.length} (${chunk.length} tokens)...`);
      
      const promises = chunk.map(async (address) => {
        try {
          // Fetch DexScreener and GeckoTerminal sequentially to avoid rate limits
          console.log(`🔄 [Batch Fetch] Fetching ${address}...`);
          
          let dexScreener: DexScreenerPair[] = [];
          let geckoTerminal: GeckoTerminalToken | null = null;
          
          try {
            dexScreener = await this.fetchFromDexScreener(address);
          } catch (error) {
            console.error(`⚠️  [Batch Fetch] DexScreener failed for ${address}, continuing...`);
          }
          
          // Add small delay between API calls
          await this.sleep(500);
          
          try {
            geckoTerminal = await this.fetchFromGeckoTerminal(address);
          } catch (error) {
            console.error(`⚠️  [Batch Fetch] GeckoTerminal failed for ${address}, continuing...`);
          }

          const dexSuccess = dexScreener.length > 0;
          const geckoSuccess = geckoTerminal !== null;
          
          console.log(`${dexSuccess || geckoSuccess ? '✅' : '⚠️'} [Batch Fetch] Token ${address}: DexScreener=${dexSuccess ? '✓' : '✗'}, GeckoTerminal=${geckoSuccess ? '✓' : '✗'}`);

          return {
            address,
            dexScreener,
            geckoTerminal,
          };
        } catch (error) {
          console.error(`❌ [Batch Fetch] Error fetching token ${address}:`, error);
          return {
            address,
            dexScreener: [],
            geckoTerminal: null,
          };
        }
      });

      const chunkResults = await Promise.all(promises);
      chunkResults.forEach((result) => {
        results.set(result.address, {
          dexScreener: result.dexScreener,
          geckoTerminal: result.geckoTerminal,
        });
      });
      
      console.log(`✅ [Batch Fetch] Chunk ${chunkIndex + 1}/${chunks.length} completed`);
      
      // Add delay between chunks to respect rate limits
      if (chunkIndex < chunks.length - 1) {
        console.log(`⏳ [Batch Fetch] Waiting 2s before next chunk...`);
        await this.sleep(2000);
      }
    }

    console.log(`\n🎉 [Batch Fetch] Completed! Fetched data for ${results.size}/${tokenAddresses.length} tokens\n`);
    return results;
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus() {
    return {
      dexScreener: {
        remaining: RATE_LIMIT.dexScreener.maxRequests - RATE_LIMIT.dexScreener.requestCount,
        total: RATE_LIMIT.dexScreener.maxRequests,
        resetTime: new Date(RATE_LIMIT.dexScreener.resetTime),
      },
      geckoTerminal: {
        remaining: RATE_LIMIT.geckoTerminal.maxRequests - RATE_LIMIT.geckoTerminal.requestCount,
        total: RATE_LIMIT.geckoTerminal.maxRequests,
        resetTime: new Date(RATE_LIMIT.geckoTerminal.resetTime),
      },
    };
  }
}

// Singleton instance
export const apiClient = new APIClient();
