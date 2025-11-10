/**
 * Scheduler service for periodic token data updates
 */

import cron from 'node-cron';
import { tokenAggregationService } from './tokenAggregation.js';
import { webSocketService } from './websocketService.js';
import { cacheService } from './cacheService.js';

class SchedulerService {
  private updateTask: cron.ScheduledTask | null = null;
  private isRunning: boolean = false;

  /**
   * Start the scheduler with configurable interval
   * @param intervalSeconds - Update interval in seconds (default: 120 = 2 minutes)
   */
  start(intervalSeconds: number = 120): void {
    if (this.isRunning) {
      console.log('⚠️ Scheduler is already running');
      return;
    }

    // Keep cache TTL at 300s (5 minutes) for fault tolerance
    // This allows scheduler to serve cached data even if API calls fail
    const cacheTTL = 300; // 5 minutes
    cacheService.setDefaultTTL(cacheTTL);

    // Create cron expression based on interval
    const cronExpression = this.getCronExpression(intervalSeconds);

    this.updateTask = cron.schedule(cronExpression, async () => {
      await this.performUpdate();
    });

    this.isRunning = true;
    console.log(`✅ Scheduler started with ${intervalSeconds}s interval (Cache TTL: ${cacheTTL}s for fault tolerance)`);

    // Perform initial update
    this.performUpdate();
  }

  /**
   * Convert seconds to cron expression
   */
  private getCronExpression(seconds: number): string {
    if (seconds >= 60) {
      // For intervals >= 60 seconds, use minute-based cron
      const minutes = Math.floor(seconds / 60);
      return `*/${minutes} * * * *`;
    } else {
      // For intervals < 60 seconds, use second-based cron
      return `*/${seconds} * * * * *`;
    }
  }

  /**
   * Perform token data update (uses cache intelligently)
   */
  private async performUpdate(): Promise<void> {
    try {
      console.log('\n🔄 [Scheduler] Starting scheduled token update...');
      const startTime = Date.now();

      // Use aggregateAllTokens instead of refreshAllTokens to utilize cache
      const tokens = await tokenAggregationService.aggregateAllTokens();

      // Broadcast updates via WebSocket
      if (webSocketService.isInitialized()) {
        await webSocketService.broadcastPriceUpdates(tokens);
      }

      const duration = Date.now() - startTime;
      console.log(`✅ [Scheduler] Update completed in ${duration}ms. Total tokens: ${tokens.length}\n`);
    } catch (error) {
      console.error('❌ [Scheduler] Error during scheduled update:', error);
    }
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.updateTask) {
      this.updateTask.stop();
      this.updateTask = null;
      this.isRunning = false;
      console.log('🛑 Scheduler stopped');
    }
  }

  /**
   * Check if scheduler is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Trigger manual update (outside of schedule)
   */
  async triggerManualUpdate(): Promise<void> {
    console.log('🔄 Manual update triggered...');
    await this.performUpdate();
  }

  /**
   * Restart the scheduler with new interval
   */
  restart(intervalSeconds: number = 120): void {
    console.log(`🔄 [Scheduler] Restarting with ${intervalSeconds}s interval...`);
    this.stop();
    this.start(intervalSeconds);
  }
}

// Singleton instance
export const schedulerService = new SchedulerService();
