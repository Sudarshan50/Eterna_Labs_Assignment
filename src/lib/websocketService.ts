/**
 * WebSocket service for real-time token updates
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { TokenData, PriceUpdateEvent, VolumeSpikeEvent } from '../types/token.js';
import { tokenAggregationService } from './tokenAggregation.js';

class WebSocketService {
  private io: SocketIOServer | null = null;
  private connectedClients: Set<string> = new Set();
  private previousTokenData: Map<string, TokenData> = new Map();
  private readonly VOLUME_SPIKE_THRESHOLD = 1.5; // 50% increase

  /**
   * Initialize WebSocket server
   */
  initialize(server: HttpServer): void {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
      connectTimeout: 45000,
      maxHttpBufferSize: 1e8,
    });

    this.setupEventHandlers();
    console.log('✅ WebSocket server initialized with enhanced stability');
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: Socket) => {
      this.connectedClients.add(socket.id);
      console.log(`🔌 Client connected: ${socket.id} (Total: ${this.connectedClients.size})`);

      // Send initial data on connection
      this.sendInitialData(socket);

      // Handle subscription to specific tokens
      socket.on('subscribe', (tokenIds: string[]) => {
        console.log(`📡 Client ${socket.id} subscribed to tokens:`, tokenIds);
        socket.join(tokenIds.map(id => `token:${id}`));
      });

      // Handle unsubscription
      socket.on('unsubscribe', (tokenIds: string[]) => {
        console.log(`📴 Client ${socket.id} unsubscribed from tokens:`, tokenIds);
        tokenIds.forEach(id => socket.leave(`token:${id}`));
      });

      // Handle disconnect
      socket.on('disconnect', (reason) => {
        this.connectedClients.delete(socket.id);
        console.log(`🔌 Client disconnected: ${socket.id} - Reason: ${reason} (Total: ${this.connectedClients.size})`);
      });

      // Handle reconnection
      socket.on('reconnect', (attemptNumber) => {
        console.log(`🔄 Client ${socket.id} reconnected after ${attemptNumber} attempts`);
        this.sendInitialData(socket);
      });

      // Handle error
      socket.on('error', (error: Error) => {
        console.error(`❌ Socket error for client ${socket.id}:`, error);
      });
      
      // Handle ping/pong for connection health
      socket.on('ping', () => {
        socket.emit('pong');
      });
    });
  }

  /**
   * Send initial data to newly connected client
   */
  private async sendInitialData(socket: Socket): Promise<void> {
    try {
      const tokens = await tokenAggregationService.aggregateAllTokens();
      socket.emit('initial_data', {
        type: 'initial_data',
        data: tokens,
        timestamp: new Date(),
      });
      console.log(`📤 Sent initial data to client ${socket.id}`);
    } catch (error) {
      console.error('❌ Error sending initial data:', error);
      socket.emit('error', {
        type: 'error',
        message: 'Failed to fetch initial data',
        timestamp: new Date(),
      });
    }
  }

  /**
   * Broadcast price updates to all connected clients
   */
  async broadcastPriceUpdates(tokens: TokenData[]): Promise<void> {
    if (!this.io || this.connectedClients.size === 0) {
      console.log('⚠️  No clients connected, skipping broadcast');
      return;
    }

    console.log(`\n📡 [WebSocket] Broadcasting updates to ${this.connectedClients.size} client(s)...`);

    const updates: PriceUpdateEvent[] = [];
    const volumeSpikes: VolumeSpikeEvent[] = [];

    for (const token of tokens) {
      const previous = this.previousTokenData.get(token.tokenId);

      // Detect price changes
      if (previous && previous.priceUsd !== token.priceUsd) {
        const priceChange = ((token.priceUsd - previous.priceUsd) / previous.priceUsd) * 100;
        
        updates.push({
          tokenId: token.tokenId,
          symbol: token.symbol,
          priceUsd: token.priceUsd,
          priceChange,
          volume: token.volume.h24,
          timestamp: new Date(),
        });

        // Emit to clients subscribed to this specific token
        this.io.to(`token:${token.tokenId}`).emit('price_update', {
          type: 'price_update',
          data: updates[updates.length - 1],
          timestamp: new Date(),
        });
      }

      // Detect volume spikes
      if (previous && token.volume.h24 > 0) {
        const volumeIncrease = token.volume.h24 / (previous.volume.h24 || 1);
        
        if (volumeIncrease >= this.VOLUME_SPIKE_THRESHOLD) {
          const percentageIncrease = ((volumeIncrease - 1) * 100);
          
          volumeSpikes.push({
            tokenId: token.tokenId,
            symbol: token.symbol,
            volume: token.volume.h24,
            previousVolume: previous.volume.h24,
            percentageIncrease,
            timestamp: new Date(),
          });

          // Emit volume spike event
          this.io.to(`token:${token.tokenId}`).emit('volume_spike', {
            type: 'volume_spike',
            data: volumeSpikes[volumeSpikes.length - 1],
            timestamp: new Date(),
          });
        }
      }

      // Update previous data
      this.previousTokenData.set(token.tokenId, token);
    }

    // Broadcast all updates to general subscribers
    if (updates.length > 0) {
      this.io.emit('price_updates', {
        type: 'price_updates',
        data: updates,
        count: updates.length,
        timestamp: new Date(),
      });
      console.log(`✅ [WebSocket] Broadcasted ${updates.length} price update(s)`);
    } else {
      console.log(`ℹ️  [WebSocket] No price changes detected`);
    }

    if (volumeSpikes.length > 0) {
      this.io.emit('volume_spikes', {
        type: 'volume_spikes',
        data: volumeSpikes,
        count: volumeSpikes.length,
        timestamp: new Date(),
      });
      console.log(`🚀 [WebSocket] Broadcasted ${volumeSpikes.length} volume spike(s)`);
    }
    
    // Always broadcast a heartbeat with token count
    this.io.emit('heartbeat', {
      type: 'heartbeat',
      tokenCount: tokens.length,
      clientCount: this.connectedClients.size,
      timestamp: new Date(),
    });
  }

  /**
   * Send update for a specific token
   */
  async sendTokenUpdate(tokenId: string): Promise<void> {
    if (!this.io) return;

    try {
      const token = await tokenAggregationService.aggregateToken(tokenId);
      if (!token) return;

      this.io.to(`token:${tokenId}`).emit('token_update', {
        type: 'price_update',
        data: token,
        timestamp: new Date(),
      });

      console.log(`📡 Sent update for token ${tokenId}`);
    } catch (error) {
      console.error(`❌ Error sending token update for ${tokenId}:`, error);
    }
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  /**
   * Get server instance
   */
  getIO(): SocketIOServer | null {
    return this.io;
  }

  /**
   * Check if WebSocket is initialized
   */
  isInitialized(): boolean {
    return this.io !== null;
  }

  /**
   * Broadcast custom event
   */
  broadcast(event: string, data: any): void {
    if (!this.io) return;
    this.io.emit(event, data);
  }

  /**
   * Close WebSocket server
   */
  close(): void {
    if (this.io) {
      this.io.close();
      this.connectedClients.clear();
      console.log('❌ WebSocket server closed');
    }
  }
}

// Singleton instance
export const webSocketService = new WebSocketService();
