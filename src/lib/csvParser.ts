/**
 * CSV parser utility to read token metadata from p1.csv
 */

import fs from 'fs';
import csv from 'csv-parser';
import path from 'path';
import { TokenMetadata } from '../types/token.js';

class CSVParser {
  private tokens: Map<string, TokenMetadata> = new Map();
  private isLoaded: boolean = false;

  /**
   * Load tokens from CSV file
   */
  async loadTokens(filePath: string = 'p1.csv'): Promise<void> {
    if (this.isLoaded) {
      return;
    }

    return new Promise((resolve, reject) => {
      const csvPath = path.resolve(process.cwd(), filePath);
      const results: TokenMetadata[] = [];

      fs.createReadStream(csvPath)
        .pipe(csv({ separator: '\t', headers: ['name', 'symbol', 'tokenAddress'], skipLines: 1 }))
        .on('data', (data: any) => {
          const token: TokenMetadata = {
            name: data.name?.trim() || '',
            symbol: data.symbol?.trim() || '',
            tokenAddress: data.tokenAddress?.trim() || '',
          };
          
          if (token.tokenAddress) {
            results.push(token);
            this.tokens.set(token.tokenAddress.toLowerCase(), token);
          }
        })
        .on('end', () => {
          this.isLoaded = true;
          console.log(`✅ Loaded ${results.length} tokens from CSV`);
          resolve();
        })
        .on('error', (error: Error) => {
          console.error('❌ Error reading CSV file:', error);
          reject(error);
        });
    });
  }

  /**
   * Get token by address
   */
  getToken(address: string): TokenMetadata | undefined {
    return this.tokens.get(address.toLowerCase());
  }

  /**
   * Get all tokens
   */
  getAllTokens(): TokenMetadata[] {
    return Array.from(this.tokens.values());
  }

  /**
   * Check if CSV is loaded
   */
  isReady(): boolean {
    return this.isLoaded;
  }

  /**
   * Get tokens count
   */
  getTokenCount(): number {
    return this.tokens.size;
  }
}

// Singleton instance
export const csvParser = new CSVParser();
