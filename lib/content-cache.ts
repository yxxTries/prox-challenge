/**
 * Content parsing cache with automatic eviction
 * Prevents re-parsing identical SVG/widget content on every render
 */

interface CacheEntry {
  content: string;
  parsed: any;
  timestamp: number;
}

class ParseCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize = 50; // Keep last 50 parses in memory
  private maxAge = 5 * 60 * 1000; // Evict after 5 minutes

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if entry is too old
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }

    return entry.parsed;
  }

  set(key: string, value: any): void {
    // Evict oldest entry if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      content: key,
      parsed: value,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }

  stats(): { size: number; maxSize: number; maxAge: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      maxAge: this.maxAge,
    };
  }
}

export const parseCache = new ParseCache();
