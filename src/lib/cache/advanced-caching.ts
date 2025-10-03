// Advanced Caching Strategy with ISR and Service Worker
'use client';

interface CacheConfig {
  defaultTTL: number;
  maxSize: number;
  enableServiceWorker: boolean;
  enableIndexedDB: boolean;
  enableMemoryCache: boolean;
}

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
  version: string;
  size: number;
}

export class AdvancedCache {
  private memoryCache = new Map<string, CacheEntry>();
  private config: CacheConfig;
  private indexedDB: IDBDatabase | null = null;
  private currentVersion = '1.0.0';

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 300000, // 5 minutes
      maxSize: 50 * 1024 * 1024, // 50MB
      enableServiceWorker: 'serviceWorker' in navigator,
      enableIndexedDB: 'indexedDB' in window,
      enableMemoryCache: true,
      ...config
    };

    if (this.config.enableIndexedDB) {
      this.initIndexedDB();
    }

    if (this.config.enableServiceWorker) {
      this.registerServiceWorker();
    }
  }

  // Initialize IndexedDB for persistent caching
  private async initIndexedDB() {
    try {
      const request = indexedDB.open('AdvancedCache', 1);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('cache')) {
          const store = db.createObjectStore('cache', { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('version', 'version');
        }
      };

      request.onsuccess = (event) => {
        this.indexedDB = (event.target as IDBOpenDBRequest).result;
        this.cleanupExpiredEntries();
      };

      request.onerror = () => {
        console.warn('IndexedDB initialization failed, falling back to memory cache');
      };
    } catch (error) {
      console.warn('IndexedDB not supported:', error);
    }
  }

  // Register service worker for network caching
  private async registerServiceWorker() {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration);
        
        // Listen for service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed') {
                this.handleServiceWorkerUpdate();
              }
            });
          }
        });
      }
    } catch (error) {
      console.warn('Service Worker registration failed:', error);
    }
  }

  // Handle service worker updates
  private handleServiceWorkerUpdate() {
    // Invalidate cache when service worker updates
    this.clear();
    console.log('Cache cleared due to service worker update');
  }

  // Get data from cache with fallback strategy
  async get<T>(key: string): Promise<T | null> {
    try {
      // 1. Try memory cache first (fastest)
      if (this.config.enableMemoryCache) {
        const memoryEntry = this.memoryCache.get(key);
        if (memoryEntry && this.isValidEntry(memoryEntry)) {
          return memoryEntry.data as T;
        }
      }

      // 2. Try IndexedDB (persistent)
      if (this.config.enableIndexedDB && this.indexedDB) {
        const indexedEntry = await this.getFromIndexedDB(key);
        if (indexedEntry && this.isValidEntry(indexedEntry)) {
          // Promote to memory cache
          if (this.config.enableMemoryCache) {
            this.memoryCache.set(key, indexedEntry);
          }
          return indexedEntry.data as T;
        }
      }

      return null;
    } catch (error) {
      console.warn('Cache get error:', error);
      return null;
    }
  }

  // Set data in cache with multi-layer strategy
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
      version: this.currentVersion,
      size: this.estimateSize(data)
    };

    try {
      // 1. Set in memory cache
      if (this.config.enableMemoryCache) {
        this.memoryCache.set(key, entry);
        this.enforceMemoryLimit();
      }

      // 2. Set in IndexedDB for persistence
      if (this.config.enableIndexedDB && this.indexedDB) {
        await this.setInIndexedDB(key, entry);
      }
    } catch (error) {
      console.warn('Cache set error:', error);
    }
  }

  // Invalidate specific cache entry
  async invalidate(key: string): Promise<void> {
    try {
      // Remove from memory
      this.memoryCache.delete(key);

      // Remove from IndexedDB
      if (this.indexedDB) {
        const transaction = this.indexedDB.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        await store.delete(key);
      }
    } catch (error) {
      console.warn('Cache invalidate error:', error);
    }
  }

  // Clear all cache
  async clear(): Promise<void> {
    try {
      // Clear memory cache
      this.memoryCache.clear();

      // Clear IndexedDB
      if (this.indexedDB) {
        const transaction = this.indexedDB.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        await store.clear();
      }

      console.log('Cache cleared');
    } catch (error) {
      console.warn('Cache clear error:', error);
    }
  }

  // Get from IndexedDB
  private getFromIndexedDB(key: string): Promise<CacheEntry | null> {
    return new Promise((resolve, reject) => {
      if (!this.indexedDB) {
        resolve(null);
        return;
      }

      const transaction = this.indexedDB.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.entry : null);
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Set in IndexedDB
  private setInIndexedDB(key: string, entry: CacheEntry): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.indexedDB) {
        resolve();
        return;
      }

      const transaction = this.indexedDB.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.put({ key, entry });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Check if cache entry is valid
  private isValidEntry(entry: CacheEntry): boolean {
    const now = Date.now();
    const isExpired = (now - entry.timestamp) > entry.ttl;
    const isVersionValid = entry.version === this.currentVersion;
    
    return !isExpired && isVersionValid;
  }

  // Estimate data size for cache management
  private estimateSize(data: any): number {
    try {
      return JSON.stringify(data).length * 2; // Rough estimate (UTF-16)
    } catch {
      return 1000; // Default estimate
    }
  }

  // Enforce memory cache size limits
  private enforceMemoryLimit() {
    let totalSize = 0;
    const entries = Array.from(this.memoryCache.entries())
      .map(([key, entry]) => ({ key, entry }))
      .sort((a, b) => b.entry.timestamp - a.entry.timestamp); // Sort by newest first

    for (const { key, entry } of entries) {
      totalSize += entry.size;
      if (totalSize > this.config.maxSize) {
        this.memoryCache.delete(key);
      }
    }
  }

  // Cleanup expired entries periodically
  private async cleanupExpiredEntries() {
    try {
      // Cleanup memory cache
      const now = Date.now();
      for (const [key, entry] of this.memoryCache) {
        if (!this.isValidEntry(entry)) {
          this.memoryCache.delete(key);
        }
      }

      // Cleanup IndexedDB
      if (this.indexedDB) {
        const transaction = this.indexedDB.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        const index = store.index('timestamp');
        const range = IDBKeyRange.upperBound(now - this.config.defaultTTL);
        
        const request = index.openCursor(range);
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          }
        };
      }

      // Schedule next cleanup
      setTimeout(() => this.cleanupExpiredEntries(), 60000); // Every minute
    } catch (error) {
      console.warn('Cache cleanup error:', error);
    }
  }

  // Cache statistics
  getStats() {
    const memoryEntries = this.memoryCache.size;
    const memorySize = Array.from(this.memoryCache.values())
      .reduce((total, entry) => total + entry.size, 0);

    return {
      memoryEntries,
      memorySize: Math.round(memorySize / 1024) + ' KB',
      version: this.currentVersion,
      config: this.config
    };
  }
}

// ISR (Incremental Static Regeneration) utilities
export class ISRCache {
  private static cache = new AdvancedCache({
    defaultTTL: 3600000, // 1 hour
    maxSize: 100 * 1024 * 1024 // 100MB
  });

  // Get with stale-while-revalidate pattern
  static async getWithRevalidate<T>(
    key: string,
    fetcher: () => Promise<T>,
    staleTime = 300000 // 5 minutes
  ): Promise<T> {
    const cached = await this.cache.get<{ data: T; fetchTime: number }>(key);
    const now = Date.now();

    if (cached) {
      const age = now - cached.fetchTime;
      
      // Return stale data immediately
      if (age < staleTime) {
        return cached.data;
      }

      // Return stale data but revalidate in background
      this.revalidateInBackground(key, fetcher);
      return cached.data;
    }

    // No cached data, fetch fresh
    const freshData = await fetcher();
    await this.cache.set(key, { data: freshData, fetchTime: now });
    return freshData;
  }

  // Background revalidation
  private static async revalidateInBackground<T>(
    key: string,
    fetcher: () => Promise<T>
  ) {
    try {
      const freshData = await fetcher();
      await this.cache.set(key, { data: freshData, fetchTime: Date.now() });
    } catch (error) {
      console.warn('Background revalidation failed:', error);
    }
  }

  // Invalidate ISR cache
  static async invalidate(key: string) {
    await this.cache.invalidate(key);
  }
}

// React hook for cache management
export function useAdvancedCache() {
  const cache = new AdvancedCache();

  return {
    get: cache.get.bind(cache),
    set: cache.set.bind(cache),
    invalidate: cache.invalidate.bind(cache),
    clear: cache.clear.bind(cache),
    getStats: cache.getStats.bind(cache)
  };
}

// Global cache instance
export const globalCache = new AdvancedCache();

export default AdvancedCache;