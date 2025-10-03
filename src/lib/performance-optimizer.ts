/**
 * Performance Optimizer
 * Utilities for preventing common performance issues and errors
 */

// Prevent multiple concurrent operations
class OperationLock {
  private locks: Map<string, Promise<any>> = new Map();
  private lockTimeouts: Map<string, NodeJS.Timeout> = new Map();

  async acquire<T>(key: string, operation: () => Promise<T>, timeoutMs = 30000): Promise<T> {
    // If there's an existing operation, wait for it
    const existing = this.locks.get(key);
    if (existing) {
      console.debug(`⏳ Waiting for existing operation: ${key}`);
      try {
        await existing;
      } catch (e) {
        // Previous operation failed, continue with new one
      }
    }

    // Create new operation with timeout
    const promise = new Promise<T>(async (resolve, reject) => {
      // Set timeout to prevent hanging
      const timeout = setTimeout(() => {
        this.locks.delete(key);
        reject(new Error(`Operation timeout: ${key}`));
      }, timeoutMs);
      
      this.lockTimeouts.set(key, timeout);

      try {
        const result = await operation();
        resolve(result);
      } catch (error) {
        reject(error);
      } finally {
        // Clean up
        clearTimeout(timeout);
        this.lockTimeouts.delete(key);
        setTimeout(() => this.locks.delete(key), 100); // Small delay before removing lock
      }
    });

    this.locks.set(key, promise);
    return promise;
  }

  isLocked(key: string): boolean {
    return this.locks.has(key);
  }

  clear(key?: string): void {
    if (key) {
      this.locks.delete(key);
      const timeout = this.lockTimeouts.get(key);
      if (timeout) {
        clearTimeout(timeout);
        this.lockTimeouts.delete(key);
      }
    } else {
      // Clear all locks
      this.lockTimeouts.forEach(timeout => clearTimeout(timeout));
      this.locks.clear();
      this.lockTimeouts.clear();
    }
  }
}

// Request deduplication
class RequestDeduplicator {
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private requestCounts: Map<string, number> = new Map();
  private lastCleanup = Date.now();

  async deduplicate<T>(
    key: string,
    requestFn: () => Promise<T>,
    maxRetries = 3
  ): Promise<T> {
    // Cleanup old entries periodically
    this.cleanupIfNeeded();

    // Check if there's already a pending request
    const pending = this.pendingRequests.get(key);
    if (pending) {
      console.debug(`♻️ Reusing pending request: ${key}`);
      return pending;
    }

    // Track request count
    const count = this.requestCounts.get(key) || 0;
    if (count >= maxRetries) {
      console.warn(`⚠️ Max retries reached for: ${key}`);
      throw new Error(`Max retries exceeded for ${key}`);
    }

    // Create new request
    const promise = requestFn()
      .then(result => {
        this.pendingRequests.delete(key);
        this.requestCounts.delete(key);
        return result;
      })
      .catch(error => {
        this.pendingRequests.delete(key);
        this.requestCounts.set(key, count + 1);
        throw error;
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  private cleanupIfNeeded() {
    const now = Date.now();
    if (now - this.lastCleanup > 60000) { // Cleanup every minute
      this.pendingRequests.clear();
      this.requestCounts.clear();
      this.lastCleanup = now;
      console.debug('🧹 Cleaned up request deduplicator');
    }
  }
}

// Resource pool for managing expensive resources
class ResourcePool<T> {
  private resources: T[] = [];
  private inUse: Set<T> = new Set();
  private waiting: ((resource: T) => void)[] = [];

  constructor(
    private factory: () => T | Promise<T>,
    private maxSize = 10,
    private minSize = 2
  ) {
    // Pre-create minimum resources
    this.initialize();
  }

  private async initialize() {
    for (let i = 0; i < this.minSize; i++) {
      try {
        const resource = await this.factory();
        this.resources.push(resource);
      } catch (error) {
        console.warn('Failed to create initial resource:', error);
      }
    }
  }

  async acquire(): Promise<T> {
    // Try to get available resource
    const available = this.resources.find(r => !this.inUse.has(r));
    if (available) {
      this.inUse.add(available);
      return available;
    }

    // Create new resource if under limit
    if (this.resources.length < this.maxSize) {
      try {
        const resource = await this.factory();
        this.resources.push(resource);
        this.inUse.add(resource);
        return resource;
      } catch (error) {
        console.error('Failed to create resource:', error);
        throw error;
      }
    }

    // Wait for available resource
    return new Promise((resolve) => {
      this.waiting.push(resolve);
    });
  }

  release(resource: T): void {
    this.inUse.delete(resource);
    
    // Give to waiting consumer
    const waiter = this.waiting.shift();
    if (waiter) {
      this.inUse.add(resource);
      waiter(resource);
    }
  }

  async destroy(): Promise<void> {
    this.waiting = [];
    this.inUse.clear();
    this.resources = [];
  }
}

// Memory-aware cache with automatic cleanup
class SmartCache<T> {
  private cache: Map<string, { value: T; timestamp: number; size?: number }> = new Map();
  private totalSize = 0;
  private maxSize = 50 * 1024 * 1024; // 50MB default
  private maxAge = 5 * 60 * 1000; // 5 minutes default

  constructor(maxSize?: number, maxAge?: number) {
    if (maxSize) this.maxSize = maxSize;
    if (maxAge) this.maxAge = maxAge;

    // Auto cleanup every minute
    setInterval(() => this.cleanup(), 60000);
  }

  set(key: string, value: T, size?: number): void {
    const entry = { value, timestamp: Date.now(), size };
    
    // Remove old entry if exists
    const existing = this.cache.get(key);
    if (existing && existing.size) {
      this.totalSize -= existing.size;
    }

    // Check if new entry fits
    if (size) {
      // Evict entries if needed
      while (this.totalSize + size > this.maxSize && this.cache.size > 0) {
        const oldestKey = this.getOldestKey();
        if (oldestKey) this.delete(oldestKey);
      }
      this.totalSize += size;
    }

    this.cache.set(key, entry);
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check if expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.delete(key);
      return undefined;
    }

    return entry.value;
  }

  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      if (entry.size) this.totalSize -= entry.size;
      return this.cache.delete(key);
    }
    return false;
  }

  clear(): void {
    this.cache.clear();
    this.totalSize = 0;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.maxAge) {
        this.delete(key);
      }
    }
  }

  private getOldestKey(): string | undefined {
    let oldestKey: string | undefined;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  getSize(): number {
    return this.totalSize;
  }

  getCount(): number {
    return this.cache.size;
  }
}

// Debounce with immediate option
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  let result: any;

  return function(this: any, ...args: Parameters<T>) {
    const context = this;
    const later = () => {
      timeout = null;
      if (!immediate) result = func.apply(context, args);
    };

    const callNow = immediate && !timeout;
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) result = func.apply(context, args);

    return result;
  };
}

// Throttle function calls
function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  let lastArgs: Parameters<T> | null = null;
  let lastContext: any;

  return function(this: any, ...args: Parameters<T>) {
    const context = this;

    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      
      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          func.apply(lastContext, lastArgs);
          lastArgs = null;
          lastContext = null;
        }
      }, limit);
    } else {
      lastArgs = args;
      lastContext = context;
    }
  };
}

// Export singleton instances
export const operationLock = new OperationLock();
export const requestDeduplicator = new RequestDeduplicator();
export const smartCache = new SmartCache();

// Export utilities
export {
  OperationLock,
  RequestDeduplicator,
  ResourcePool,
  SmartCache,
  debounce,
  throttle
};

// Performance monitoring helper
export function measurePerformance<T>(
  name: string,
  fn: () => T | Promise<T>
): T | Promise<T> {
  const start = performance.now();
  
  try {
    const result = fn();
    if (result instanceof Promise) {
      return result.finally(() => {
        const duration = performance.now() - start;
        if (duration > 1000) {
          console.warn(`⚠️ Slow operation: ${name} took ${duration.toFixed(2)}ms`);
        } else {
          console.debug(`⚡ ${name} completed in ${duration.toFixed(2)}ms`);
        }
      });
    } else {
      const duration = performance.now() - start;
      console.debug(`⚡ ${name} completed in ${duration.toFixed(2)}ms`);
      return result;
    }
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`❌ ${name} failed after ${duration.toFixed(2)}ms:`, error);
    throw error;
  }
}

// Batch processor for combining multiple operations
export class BatchProcessor<T, R> {
  private queue: { item: T; resolve: (value: R) => void; reject: (error: any) => void }[] = [];
  private processing = false;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private processor: (items: T[]) => Promise<R[]>,
    private maxBatchSize = 100,
    private maxWaitTime = 100
  ) {}

  async add(item: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.queue.push({ item, resolve, reject });

      // Process immediately if batch is full
      if (this.queue.length >= this.maxBatchSize) {
        this.process();
      } else if (!this.timer) {
        // Set timer for batch processing
        this.timer = setTimeout(() => this.process(), this.maxWaitTime);
      }
    });
  }

  private async process() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    // Extract current batch
    const batch = this.queue.splice(0, this.maxBatchSize);
    const items = batch.map(b => b.item);

    try {
      const results = await this.processor(items);
      
      // Resolve promises
      batch.forEach((b, i) => b.resolve(results[i]));
    } catch (error) {
      // Reject all promises in batch
      batch.forEach(b => b.reject(error));
    } finally {
      this.processing = false;
      
      // Process next batch if queue not empty
      if (this.queue.length > 0) {
        setImmediate(() => this.process());
      }
    }
  }
}