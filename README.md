# 🚀 Real-Time Meme Coin Aggregation Service

A high-performance **TypeScript** Node.js application that provides real-time cryptocurrency token data aggregation from multiple DEX (Decentralized Exchange) platforms. Built with a robust architecture featuring intelligent caching, rate limiting, WebSocket support, and automated data synchronization.

## 🌟 Key Features

### Core Functionality
- 🔄 **Multi-Source Data Aggregation**: Merges data from DexScreener and GeckoTerminal APIs
- ⚡ **Real-Time Updates**: WebSocket server for live price and volume updates
- 🎯 **Smart Caching**: Two-tier caching system (Redis + In-Memory) for optimal performance
- 📊 **Advanced Filtering & Sorting**: Filter by volume, market cap, liquidity with flexible time periods
- 🔁 **Automated Scheduler**: Configurable periodic updates with intelligent cache management
- 📈 **Rate Limit Management**: Sophisticated rate limiting with exponential backoff and retry logic
- 🎭 **Graceful Error Handling**: Comprehensive error recovery and fault tolerance

### Technical Excellence
- 🏗️ **TypeScript First**: Fully typed codebase with strict type checking
- 🔒 **Production Ready**: Robust error handling, logging, and monitoring
- 📦 **Modular Architecture**: Clean separation of concerns with service-oriented design
- 🚀 **High Performance**: Optimized batch processing and concurrent API calls
- 🎨 **Modern Frontend**: Beautiful real-time dashboard with Socket.io integration
- 🛡️ **Fault Tolerant**: Continues operation even with partial API failures

---

## 📁 Project Architecture

```
eterna_labs/
├── src/
│   ├── index.ts                      # Main application entry point with service initialization
│   ├── controllers/
│   │   └── tokenController.ts        # API request handlers with filtering, sorting, pagination
│   ├── lib/
│   │   ├── apiClients.ts             # External API clients with rate limiting & retry logic
│   │   ├── cacheService.ts           # Redis caching layer with TTL management
│   │   ├── csvParser.ts              # CSV file parser for token metadata
│   │   ├── customErrors.ts           # Custom error classes for better error handling
│   │   ├── db.ts                     # MongoDB connection manager
│   │   ├── redis.ts                  # Redis client configuration and connection
│   │   ├── responseUtils.ts          # Standardized API response formatting
│   │   ├── schedulerService.ts       # Automated periodic update scheduler
│   │   ├── tokenAggregation.ts       # Core aggregation logic with multi-source merging
│   │   └── websocketService.ts       # Real-time WebSocket event broadcasting
│   ├── middleware/
│   │   └── errorHandler.ts           # Global error handling middleware
│   ├── routes/
│   │   └── index.ts                  # API route definitions
│   └── types/
│       ├── environment.d.ts          # Environment variable type definitions
│       └── token.ts                  # Token data types and API response interfaces
├── public/
│   └── index.html                    # Real-time dashboard UI with Socket.io
├── p1.csv                            # Token metadata (name, symbol, address)
├── dist/                             # Compiled JavaScript output
├── package.json                      # Dependencies and scripts
├── tsconfig.json                     # TypeScript configuration
└── README.md                         # This file
```

---

## 🏛️ System Architecture

### Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Client Application                          │
│  (Browser with WebSocket + REST API + Real-time Dashboard)          │
└────────────────┬────────────────────────────┬───────────────────────┘
                 │                            │
                 │ HTTP REST                  │ WebSocket
                 │                            │
┌────────────────▼────────────────────────────▼───────────────────────┐
│                     Express.js Server                                │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │              Token Controller (API Layer)                   │    │
│  │  • Route handlers  • Validation  • Response formatting     │    │
│  └─────────────────────────────────────────────────────────────┘    │
└────────────────┬────────────────────────────┬───────────────────────┘
                 │                            │
                 │                            │
┌────────────────▼───────────────┐  ┌────────▼───────────────────────┐
│  Token Aggregation Service     │  │   WebSocket Service            │
│  • Multi-source merging        │  │   • Real-time broadcasting     │
│  • Data normalization          │  │   • Price change detection     │
│  • Memory + Redis caching      │  │   • Volume spike alerts        │
└────────────────┬───────────────┘  └────────────────────────────────┘
                 │                            ▲
                 │                            │
┌────────────────▼───────────────────────────┴───────────────────────┐
│                     Scheduler Service                                │
│  • Periodic updates  • Configurable intervals  • Manual triggers   │
└────────────────┬────────────────────────────┬───────────────────────┘
                 │                            │
                 │                            │
┌────────────────▼───────────────┐  ┌────────▼───────────────────────┐
│      Cache Service (Redis)     │  │   API Client (External APIs)   │
│  • Token cache (5 min TTL)     │  │   • DexScreener API            │
│  • Aggregated list cache       │  │   • GeckoTerminal API          │
│  • Statistics tracking         │  │   • Rate limiting (250/min)    │
│  • Memory cache (30s TTL)      │  │   • Exponential backoff        │
└────────────────────────────────┘  │   • Batch processing           │
                                    └────────────────────────────────┘
                 │                            │
                 │                            │
┌────────────────▼───────────────┐  ┌────────▼───────────────────────┐
│      CSV Parser                │  │   MongoDB (Optional)           │
│  • Token metadata              │  │   • Future data persistence    │
│  • Address lookup              │  │   • Historical data            │
└────────────────────────────────┘  └────────────────────────────────┘
```

### Component Interactions

#### 1. **API Client Layer** (`lib/apiClients.ts`)
- **Purpose**: Manages external API calls with intelligent retry and rate limiting
- **Features**:
  - DexScreener: 250 requests/min with auto-throttling
  - GeckoTerminal: 25 requests/min with auto-throttling
  - Exponential backoff (5 retries, 2s to 30s delays)
  - Batch processing with controlled concurrency (2 simultaneous)
  - Automatic rate limit window reset
  - Special handling for 429 (Too Many Requests) errors

#### 2. **Token Aggregation Service** (`lib/tokenAggregation.ts`)
- **Purpose**: Core business logic for merging multi-source data
- **Features**:
  - Two-tier caching: In-memory (30s) + Redis (5min)
  - Smart data merging: Averages prices/volumes from multiple sources
  - Accepts partial data: Works even if only one API responds
  - Progressive caching: Caches results immediately after each batch
  - Memory cache with size limit (100 entries)
  - Detailed logging for debugging and monitoring

#### 3. **Cache Service** (`lib/cacheService.ts`)
- **Purpose**: Redis-based caching layer with intelligent TTL management
- **Features**:
  - Individual token caching with 5-minute TTL
  - Aggregated token list caching (full dataset)
  - Cache statistics and monitoring
  - Batch operations for efficiency
  - TTL tracking and expiry management
  - Cache hit/miss rate tracking

#### 4. **WebSocket Service** (`lib/websocketService.ts`)
- **Purpose**: Real-time event broadcasting to connected clients
- **Features**:
  - Socket.io with auto-reconnection
  - Price update detection and broadcasting
  - Volume spike detection (50% threshold)
  - Client subscription management (per-token channels)
  - Connection health monitoring (ping/pong)
  - Initial data send on connection
  - Graceful disconnect handling

#### 5. **Scheduler Service** (`lib/schedulerService.ts`)
- **Purpose**: Automated periodic data updates
- **Features**:
  - Configurable update intervals (default: 120 seconds)
  - Cron-based scheduling with second precision
  - Manual update triggers
  - Cache-aware updates (uses cached data when available)
  - Broadcast to WebSocket clients after each update
  - Performance monitoring and logging

#### 6. **CSV Parser** (`lib/csvParser.ts`)
- **Purpose**: Loads token metadata from CSV file
- **Features**:
  - Tab-separated values (TSV) support
  - Fast in-memory lookup by address
  - Validates token metadata
  - Singleton pattern for efficiency

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18+ (ES2022 support required)
- **Redis**: v5+ (caching layer)
- **MongoDB**: v6+ (optional, for future features)
- **npm**: v8+

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd eterna_labs
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env` file in the root directory:
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   
   # Redis Configuration
   REDIS_DB_HOST=localhost
   REDIS_DB_PORT=16061
   REDIS_DB_PASS=your_redis_password
   
   # MongoDB Configuration (Optional)
   MONGO_URI=mongodb://localhost:27017/meme_coins
   
   # Scheduler Configuration
   UPDATE_INTERVAL=120  # seconds (default: 2 minutes)
   
   # WebSocket Configuration
   CORS_ORIGIN=*  # or specific domain for production
   ```

4. **Prepare token data**
   Ensure `p1.csv` exists in the root directory with format:
   ```
   name	symbol	tokenAddress
   Dogecoin	DOGE	DUPSxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   Shiba Inu	SHIB	SHIBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

5. **Build the application**
   ```bash
   npm run build
   ```

6. **Start the server**
   ```bash
   npm start
   ```

### Development Mode

For hot-reloading during development:
```bash
npm run dev
```

---

## 📡 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Endpoints

#### 1. **Health Check**
```http
GET /api/health
```
**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-11-11T10:30:00.000Z",
    "services": {
      "redis": true,
      "scheduler": true,
      "csvLoaded": true,
      "tokenCount": 20
    }
  },
  "message": "Service is healthy"
}
```

#### 2. **Get All Tokens** (with filtering & pagination)
```http
GET /api/tokens?timePeriod=24h&sortBy=volume&sortOrder=desc&limit=10&cursor=0
```

**Query Parameters:**
- `timePeriod`: `1h` | `6h` | `24h` | `7d` (default: `24h`)
- `sortBy`: `volume` | `priceChange` | `marketCap` | `fdv` | `liquidity` | `price` | `transactions`
- `sortOrder`: `asc` | `desc` (default: `desc`)
- `limit`: 1-100 (default: 20)
- `cursor`: Pagination cursor (default: `0`)
- `minVolume`: Minimum 24h volume filter
- `minPriceChange`: Minimum price change percentage
- `minMarketCap`: Minimum market cap
- `minLiquidity`: Minimum liquidity

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "tokenId": "DUPSxxxxxxx",
        "name": "Dogecoin",
        "symbol": "DOGE",
        "chainId": "solana",
        "priceUsd": 0.087654,
        "priceNative": 0.000234,
        "priceChange": {
          "h1": 2.5,
          "h6": 5.2,
          "h24": 8.7
        },
        "volume": {
          "h1": 125000,
          "h6": 750000,
          "h24": 3500000
        },
        "transactions": {
          "h24": { "buys": 1234, "sells": 987 }
        },
        "marketCap": 12500000,
        "fdv": 15000000,
        "liquidity": 2500000,
        "pairAddress": "RAYxxxxxx",
        "dexId": "raydium",
        "sources": ["dexscreener", "geckoterminal"],
        "lastUpdated": "2025-11-11T10:30:00.000Z"
      }
    ],
    "pagination": {
      "total": 20,
      "limit": 10,
      "cursor": "0",
      "nextCursor": "10",
      "hasMore": true
    },
    "metadata": {
      "filtersApplied": { ... },
      "timestamp": "2025-11-11T10:30:00.000Z"
    }
  }
}
```

#### 3. **Get Single Token**
```http
GET /api/tokens/:tokenId
```

#### 4. **Get Available Tokens**
```http
GET /api/tokens/available
```
Returns all tokens loaded from CSV.

#### 5. **Refresh Token** (bypass cache)
```http
POST /api/tokens/:tokenId/refresh
```

#### 6. **Refresh All Tokens** (bypass cache)
```http
POST /api/tokens/refresh
```

#### 7. **Cache Management**
```http
GET /api/cache/stats      # Get cache statistics
DELETE /api/cache         # Clear all cache
```

#### 8. **Rate Limit Status**
```http
GET /api/rate-limit
```

#### 9. **Scheduler Management**
```http
GET /api/scheduler/status        # Get scheduler status
POST /api/scheduler/trigger      # Trigger manual update
```

---

## 🔌 WebSocket Events

### Connection
```javascript
const socket = io('http://localhost:3000');
```

### Events to Listen

#### `initial_data`
Sent immediately after connection with full token list.
```javascript
socket.on('initial_data', (data) => {
  console.log('Received tokens:', data.data);
});
```

#### `price_update`
Single token price update.
```javascript
socket.on('price_update', (event) => {
  const { tokenId, symbol, priceUsd, priceChange } = event.data;
  console.log(`${symbol}: $${priceUsd} (${priceChange}%)`);
});
```

#### `price_updates`
Batch price updates.
```javascript
socket.on('price_updates', (event) => {
  console.log(`Updated ${event.count} tokens`);
});
```

#### `volume_spike`
Volume spike alert (50%+ increase).
```javascript
socket.on('volume_spike', (event) => {
  const { symbol, percentageIncrease } = event.data;
  console.log(`🚀 ${symbol} volume spike: +${percentageIncrease}%`);
});
```

#### `heartbeat`
Periodic health check.
```javascript
socket.on('heartbeat', (data) => {
  console.log(`${data.tokenCount} tokens, ${data.clientCount} clients`);
});
```

### Events to Emit

#### `subscribe`
Subscribe to specific token updates.
```javascript
socket.emit('subscribe', ['tokenId1', 'tokenId2']);
```

#### `unsubscribe`
Unsubscribe from token updates.
```javascript
socket.emit('unsubscribe', ['tokenId1']);
```

---

## 🎨 Frontend Dashboard

The project includes a beautiful real-time dashboard at `http://localhost:3000/index.html`.

### Features:
- 📊 Live token cards with real-time updates
- 🎯 Advanced filtering (volume, liquidity, time period)
- 📈 Sorting options (volume, price change, market cap, etc.)
- 📄 Cursor-based pagination (10 tokens per page)
- 🔄 Manual refresh controls
- 📡 Live event log with color-coded events
- 🎨 Modern gradient UI with animations
- 🌐 WebSocket connection status indicator
- ⚡ Volume spike alerts
- 🔔 Real-time notifications

---

## 🛠️ Technologies & Dependencies

### Production Dependencies
```json
{
  "express": "^5.1.0",         // Web framework
  "socket.io": "^4.7.5",       // WebSocket server
  "axios": "^1.12.2",          // HTTP client for external APIs
  "redis": "^5.8.3",           // Caching layer
  "mongoose": "^8.19.0",       // MongoDB ODM
  "csv-parser": "^3.0.0",      // CSV file parsing
  "node-cron": "^3.0.3",       // Task scheduler
  "cors": "^2.8.5",            // CORS middleware
  "morgan": "^1.10.1",         // HTTP logging
  "dotenv": "^17.2.3"          // Environment variables
}
```

### Development Dependencies
```json
{
  "typescript": "^5.1.6",      // TypeScript compiler
  "tsx": "^3.12.7",            // TypeScript executor
  "nodemon": "^3.1.10",        // Dev server with hot-reload
  "prettier": "^3.1.0",        // Code formatting
  "@types/*": "latest"         // TypeScript type definitions
}
```

---

## ⚙️ Configuration

### TypeScript Configuration (`tsconfig.json`)
- **Target**: ES2022 (modern JavaScript features)
- **Module System**: ESNext with Node.js resolution
- **Strict Mode**: Enabled (full type safety)
- **Source Maps**: Enabled for debugging
- **Declaration Files**: Generated for library usage

### Key Settings:
```json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true,
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true
}
```

### Environment Variables
See `.env.example` for all available configuration options.

---

## 🚦 Rate Limiting Strategy

### DexScreener API
- **Limit**: 250 requests/minute (with safety buffer)
- **Window**: 60 seconds
- **Strategy**: Request counting with auto-reset

### GeckoTerminal API
- **Limit**: 25 requests/minute (with safety buffer)
- **Window**: 60 seconds
- **Strategy**: Request counting with auto-reset

### Retry Logic
- **Max Retries**: 5 attempts
- **Base Delay**: 2 seconds
- **Max Delay**: 30 seconds
- **Backoff**: Exponential with jitter
- **Special Handling**: 429 errors use `Retry-After` header

---

## 📊 Caching Strategy

### Two-Tier Architecture

#### 1. **In-Memory Cache** (Fast Layer)
- **TTL**: 30 seconds
- **Purpose**: Ultra-fast repeated access within short time
- **Size Limit**: 100 entries (LRU eviction)
- **Use Case**: Multiple quick requests for same token

#### 2. **Redis Cache** (Persistence Layer)
- **TTL**: 5 minutes
- **Purpose**: Fault tolerance and cross-request persistence
- **Scope**: Individual tokens + aggregated lists
- **Use Case**: Main caching layer with reasonable freshness

### Cache Invalidation
- Manual refresh endpoints bypass cache
- Scheduler uses cache intelligently (only fetches expired data)
- Progressive caching: Updates cache after each batch

---

## 🎯 Performance Optimizations

1. **Batch API Calls**: Process tokens in chunks of 2 (concurrency limit)
2. **Progressive Caching**: Cache results immediately after each batch
3. **Memory Cache**: 30s in-memory cache for repeated access
4. **Smart Aggregation**: Only fetches uncached tokens
5. **Rate Limit Management**: Auto-throttling prevents API blocks
6. **Partial Data Acceptance**: Works with data from single API source
7. **WebSocket Broadcasting**: Efficient real-time updates

---

## 🔧 Scripts

```bash
npm run build        # Compile TypeScript to JavaScript
npm start            # Start production server (requires build)
npm run dev          # Development mode with hot-reload
npm run dev:watch    # Development with file watching
npm run lint         # Format code with Prettier
npm run lint:check   # Check formatting without changes
npm run lint:fix     # Auto-fix formatting issues
```

---

## 🐛 Error Handling

### Global Error Handler
- Custom error classes with status codes
- MongoDB error handling (duplicate keys, cast errors)
- JWT error handling
- Validation error formatting
- Production/development mode responses

### API Client Errors
- Network timeout handling
- Rate limit detection (429)
- Retry with exponential backoff
- Partial failure tolerance (continues with available data)

### Service Errors
- Redis connection failures
- MongoDB connection failures
- External API failures
- WebSocket disconnections
- CSV parsing errors

---

## 📈 Monitoring & Logging

### Console Logging
- Detailed request/response logs
- Cache hit/miss tracking
- Rate limit status
- WebSocket connection events
- Scheduler execution logs
- Error stack traces (development mode)

### Health Checks
- Service status endpoint
- Redis connection status
- MongoDB connection status
- Scheduler status
- CSV load status

---

## 🚀 Deployment

### Production Checklist
1. Set `NODE_ENV=production`
2. Configure Redis with authentication
3. Set up MongoDB connection string
4. Configure CORS origins
5. Set up SSL/TLS certificates
6. Configure reverse proxy (nginx)
7. Set up process manager (PM2)
8. Enable logging to file/service
9. Set up monitoring (e.g., Datadog, New Relic)
10. Configure environment-specific variables

### Recommended Setup
```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start dist/index.js --name "meme-coin-api"

# Save PM2 configuration
pm2 save

# Setup auto-restart on reboot
pm2 startup
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

ISC License - see LICENSE file for details

---

## 👨‍💻 Author

Built with ❤️ for the Eterna Labs Assignment

---

## 🙏 Acknowledgments

- **DexScreener API** - DEX aggregator data
- **GeckoTerminal API** - Token and pool data
- **Socket.io** - Real-time communication
- **Redis** - High-performance caching

---

## 📞 Support

For questions or issues, please open an issue on GitHub or contact the development team.

---

**Happy Trading! 🚀📈**
