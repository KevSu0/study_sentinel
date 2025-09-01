import { BaseRepository } from './base.repository';
import { CachedAIResponse, getDB } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';

export class CachedAIResponsesRepository extends BaseRepository<CachedAIResponse, string> {
  constructor() {
    super(() => getDB().cachedAIResponses);
  }

  private createMessageHash(message: string): string {
    // Create a simple hash for browser compatibility
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
      const char = message.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  async cacheResponse(
    message: string,
    response: string,
    ttlHours: number = 24
  ): Promise<CachedAIResponse> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (ttlHours * 60 * 60 * 1000));
    
    const cachedResponse: CachedAIResponse = {
      id: uuidv4(),
      messageHash: this.createMessageHash(message.toLowerCase().trim()),
      message,
      response,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    };

    await this.add(cachedResponse);
    return cachedResponse;
  }

  async getCachedResponse(message: string): Promise<string | null> {
    try {
      const messageHash = this.createMessageHash(message.toLowerCase().trim());
      const now = new Date().toISOString();
      
      const cached = await this.table
        .where('messageHash')
        .equals(messageHash)
        .and(item => item.expiresAt > now)
        .first();

      return cached ? cached.response : null;
    } catch (error) {
      console.warn('Failed to get cached AI response:', error);
      return null;
    }
  }

  async getRecentResponses(limit: number = 10): Promise<CachedAIResponse[]> {
    try {
      const now = new Date().toISOString();
      
      return await this.table
        .where('expiresAt')
        .above(now)
        .reverse()
        .sortBy('createdAt')
        .then(results => results.slice(0, limit));
    } catch (error) {
      console.warn('Failed to get recent AI responses:', error);
      return [];
    }
  }

  async cleanupExpiredResponses(): Promise<number> {
    try {
      const now = new Date().toISOString();
      
      const expiredCount = await this.table
        .where('expiresAt')
        .below(now)
        .count();

      await this.table
        .where('expiresAt')
        .below(now)
        .delete();

      console.log(`Cleaned up ${expiredCount} expired AI responses`);
      return expiredCount;
    } catch (error) {
      console.warn('Failed to cleanup expired AI responses:', error);
      return 0;
    }
  }

  async getCacheStats(): Promise<{
    total: number;
    expired: number;
    valid: number;
    oldestValidDate: string | null;
    newestValidDate: string | null;
  }> {
    try {
      const now = new Date().toISOString();
      
      const total = await this.table.count();
      const expired = await this.table
        .where('expiresAt')
        .below(now)
        .count();
      
      const validResponses = await this.table
        .where('expiresAt')
        .above(now)
        .toArray();
      
      const valid = validResponses.length;
      const dates = validResponses.map(r => r.createdAt).sort();
      
      return {
        total,
        expired,
        valid,
        oldestValidDate: dates.length > 0 ? dates[0] : null,
        newestValidDate: dates.length > 0 ? dates[dates.length - 1] : null
      };
    } catch (error) {
      console.warn('Failed to get cache stats:', error);
      return {
        total: 0,
        expired: 0,
        valid: 0,
        oldestValidDate: null,
        newestValidDate: null
      };
    }
  }

  async clearAllCache(): Promise<void> {
    try {
      await this.table.clear();
      console.log('Cleared all AI response cache');
    } catch (error) {
      console.warn('Failed to clear AI response cache:', error);
    }
  }
}

export const cachedAIResponsesRepository = new CachedAIResponsesRepository();
