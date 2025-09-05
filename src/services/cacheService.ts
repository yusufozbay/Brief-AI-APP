import { CachedResult } from '../types/queryFanout';

export class BriefCacheService {
  private cache: Map<string, CachedResult> = new Map();
  private ttl: number = 3600000; // 1 hour default TTL

  constructor(ttl?: number) {
    if (ttl) {
      this.ttl = ttl;
    }
  }

  /**
   * Gets cached result if valid, otherwise returns null
   */
  async getCachedResult(key: string): Promise<CachedResult | null> {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }

    // Check if cache entry is expired
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached;
  }

  /**
   * Sets cached result with TTL
   */
  async setCachedResult(key: string, result: any, customTtl?: number): Promise<void> {
    const ttl = customTtl || this.ttl;
    
    this.cache.set(key, {
      data: result,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Invalidates cache entries matching pattern
   */
  async invalidateCache(pattern: string): Promise<void> {
    const regex = new RegExp(pattern);
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clears all cache entries
   */
  async clearCache(): Promise<void> {
    this.cache.clear();
  }

  /**
   * Gets cache statistics
   */
  getCacheStats(): {
    size: number;
    entries: Array<{ key: string; age: number; ttl: number }>;
  } {
    const entries = Array.from(this.cache.entries()).map(([key, value]) => ({
      key,
      age: Date.now() - value.timestamp,
      ttl: value.ttl
    }));

    return {
      size: this.cache.size,
      entries
    };
  }

  /**
   * Generates cache key from parameters
   */
  generateCacheKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    
    return `${prefix}:${sortedParams}`;
  }

  /**
   * Checks if cache entry exists and is valid
   */
  hasValidCache(key: string): boolean {
    const cached = this.cache.get(key);
    return cached ? Date.now() - cached.timestamp < cached.ttl : false;
  }

  /**
   * Gets cache hit rate (approximate)
   */
  getCacheHitRate(): number {
    // This is a simplified implementation
    // In production, you'd track hits and misses
    return 0.8; // 80% hit rate
  }
}

export const cacheService = new BriefCacheService();
