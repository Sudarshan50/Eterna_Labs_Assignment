/**
 * Token and API response type definitions
 */

// Base token data structure
export interface TokenData {
  tokenId: string;
  name: string;
  symbol: string;
  chainId: string;
  priceUsd: number;
  priceNative: number;
  priceChange: {
    h1: number;
    h6: number;
    h24: number;
  };
  volume: {
    h1: number;
    h6: number;
    h24: number;
  };
  transactions: {
    h1: {
      buys: number;
      sells: number;
    };
    h6: {
      buys: number;
      sells: number;
    };
    h24: {
      buys: number;
      sells: number;
    };
  };
  fdv: number;
  marketCap: number | null;
  liquidity: number;
  pairAddress: string;
  dexId: string;
  sources: string[];
  lastUpdated: Date;
}

// DexScreener API response types
export interface DexScreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd: string;
  txns: {
    m5: { buys: number; sells: number };
    h1: { buys: number; sells: number };
    h6: { buys: number; sells: number };
    h24: { buys: number; sells: number };
  };
  volume: {
    h24: number;
    h6: number;
    h1: number;
    m5: number;
  };
  priceChange: {
    h1: number;
    h6: number;
    h24: number;
  };
  fdv: number;
  marketCap: number;
  pairCreatedAt: number;
}

// GeckoTerminal API response types
export interface GeckoTerminalToken {
  data: {
    id: string;
    type: string;
    attributes: {
      address: string;
      name: string;
      symbol: string;
      decimals: number;
      image_url: string;
      coingecko_coin_id: string | null;
      total_supply: string;
      normalized_total_supply: string;
      price_usd: string;
      fdv_usd: string;
      total_reserve_in_usd: string;
      volume_usd: {
        h24: string;
      };
      market_cap_usd: string | null;
    };
    relationships: {
      top_pools: {
        data: Array<{
          id: string;
          type: string;
        }>;
      };
    };
  };
  included: Array<{
    id: string;
    type: string;
    attributes: {
      base_token_price_usd: string;
      base_token_price_native_currency: string;
      quote_token_price_usd: string;
      quote_token_price_native_currency: string;
      address: string;
      name: string;
      pool_created_at: string;
      token_price_usd: string;
      fdv_usd: string;
      market_cap_usd: string | null;
      price_change_percentage: {
        m5: string;
        m15: string;
        m30: string;
        h1: string;
        h6: string;
        h24: string;
      };
      transactions: {
        m5: { buys: number; sells: number; buyers: number; sellers: number };
        m15: { buys: number; sells: number; buyers: number; sellers: number };
        m30: { buys: number; sells: number; buyers: number; sellers: number };
        h1: { buys: number; sells: number; buyers: number; sellers: number };
        h6: { buys: number; sells: number; buyers: number; sellers: number };
        h24: { buys: number; sells: number; buyers: number; sellers: number };
      };
      volume_usd: {
        m5: string;
        m15: string;
        m30: string;
        h1: string;
        h6: string;
        h24: string;
      };
      reserve_in_usd: string;
    };
  }>;
}

// Token metadata from CSV
export interface TokenMetadata {
  name: string;
  symbol: string;
  tokenAddress: string;
}

// Filter and sort options
export interface TokenFilters {
  timePeriod?: '1h' | '6h' | '24h' | '7d';
  sortBy?: 'volume' | 'priceChange' | 'marketCap' | 'fdv' | 'transactions' | 'price' | 'liquidity';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  cursor?: string;
  minVolume?: number;
  minPriceChange?: number;
  minMarketCap?: number;
  minLiquidity?: number;
}

// Paginated response
export interface PaginatedTokenResponse {
  data: TokenData[];
  pagination: {
    total: number;
    limit: number;
    cursor: string | null;
    nextCursor: string | null;
    hasMore: boolean;
  };
}

// WebSocket event types
export interface WebSocketEvent {
  type: 'price_update' | 'volume_spike' | 'initial_data' | 'error';
  data: any;
  timestamp: Date;
}

// Price update event
export interface PriceUpdateEvent {
  tokenId: string;
  symbol: string;
  priceUsd: number;
  priceChange: number;
  volume: number;
  timestamp: Date;
}

// Volume spike event
export interface VolumeSpikeEvent {
  tokenId: string;
  symbol: string;
  volume: number;
  previousVolume: number;
  percentageIncrease: number;
  timestamp: Date;
}
