// Advanced Memory Management and Optimization System
'use client';

import React from 'react';

// Memory pressure monitoring
class MemoryPressureMonitor {
  private static instance: MemoryPressureMonitor;
  private isMonitoring = false;
  private memoryCheckInterval: NodeJS.Timeout | null = null;
  private callbacks = new Set<(pressure: number) => void>();
  private lastGCTime = Date.now();

  static getInstance(): MemoryPressureMonitor {
    if (!MemoryPressureMonitor.instance) {
      MemoryPressureMonitor.instance = new MemoryPressureMonitor();
    }
    return MemoryPressureMonitor.instance;
  }

  startMonitoring(intervalMs = 5000) {
    if (this.isMonitoring || typeof window === 'undefined') return;

    this.isMonitoring = true;
    this.memoryCheckInterval = setInterval(() => {
      this.checkMemoryPressure();
    }, intervalMs);

    console.log('🧠 Memory pressure monitoring started');
  }

  stopMonitoring() {
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }
    this.isMonitoring = false;
    console.log('🧠 Memory pressure monitoring stopped');
  }

  onMemoryPressure(callback: (pressure: number) => void) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  private checkMemoryPressure() {
    if (typeof window === 'undefined' || !('performance' in window)) return;

    try {
      const performance = window.performance as any;
      
      // Use memory API if available
      if (performance.memory) {
        const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = performance.memory;
        const pressure = usedJSHeapSize / jsHeapSizeLimit;
        
        this.callbacks.forEach(callback => callback(pressure));
        
        // Trigger GC if pressure is high
        if (pressure > 0.8) {
          this.suggestGarbageCollection();
        }
      }
    } catch (error) {
      console.warn('Memory monitoring failed:', error);
    }
  }

  private suggestGarbageCollection() {
    const now = Date.now();
    const timeSinceLastGC = now - this.lastGCTime;
    
    // Only suggest GC every 30 seconds at most
    if (timeSinceLastGC < 30000) return;
    
    this.lastGCTime = now;
    
    // Force garbage collection if possible
    if (typeof window !== 'undefined' && (window as any).gc) {
      (window as any).gc();
      console.log('🧹 Forced garbage collection');
    } else {
      // Trigger GC indirectly
      this.triggerIndirectGC();
    }
  }

  private triggerIndirectGC() {
    // Create and release memory to encourage GC
    const temp = new Array(1000).fill(0).map(() => new Array(1000).fill(0));
    temp.length = 0;
    console.log('🧹 Encouraged garbage collection');
  }

  getMemoryStats() {
    if (typeof window === 'undefined' || !('performance' in window)) {
      return null;
    }

    const performance = window.performance as any;
    if (!performance.memory) return null;

    const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = performance.memory;
    
    return {
      used: Math.round(usedJSHeapSize / 1024 / 1024), // MB
      total: Math.round(totalJSHeapSize / 1024 / 1024), // MB
      limit: Math.round(jsHeapSizeLimit / 1024 / 1024), // MB
      pressure: usedJSHeapSize / jsHeapSizeLimit,
      available: Math.round((jsHeapSizeLimit - usedJSHeapSize) / 1024 / 1024), // MB
    };
  }
}

// Intelligent object pooling for performance
class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn: (obj: T) => void;
  private maxSize: number;

  constructor(
    createFn: () => T,
    resetFn: (obj: T) => void = () => {},
    maxSize: number = 100
  ) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
  }

  get(): T {
    const obj = this.pool.pop();
    if (obj) {
      return obj;
    }
    return this.createFn();
  }

  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.resetFn(obj);
      this.pool.push(obj);
    }
  }

  clear(): void {
    this.pool.length = 0;
  }

  size(): number {
    return this.pool.length;
  }
}

// Memory-efficient event emitter
class MemoryEfficientEventEmitter {
  private events = new Map<string, Set<Function>>();

  on(event: string, callback: Function) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(callback);

    // Return cleanup function
    return () => this.off(event, callback);
  }

  off(event: string, callback: Function) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.events.delete(event);
      }
    }
  }

  emit(event: string, ...args: any[]) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error('Event callback error:', error);
        }
      });
    }
  }

  clear() {
    this.events.clear();
  }

  getEventCount() {
    return this.events.size;
  }

  getListenerCount(event?: string) {
    if (event) {
      return this.events.get(event)?.size || 0;
    }
    return Array.from(this.events.values()).reduce((total, set) => total + set.size, 0);
  }
}

// Automatic cleanup for React components
export const useMemoryOptimizedEffect = (
  effect: () => void | (() => void),
  deps?: React.DependencyList
) => {
  React.useEffect(() => {
    const cleanup = effect();
    
    return () => {
      if (typeof cleanup === 'function') {
        cleanup();
      }
      
      // Force cleanup of any lingering references
      if (deps) {
        deps.forEach(dep => {
          if (dep && typeof dep === 'object' && 'cleanup' in dep) {
            (dep as any).cleanup?.();
          }
        });
      }
    };
  }, deps);
};

// Memory leak detection
class MemoryLeakDetector {
  private static instance: MemoryLeakDetector;
  private baselines = new Map<string, number>();
  private detectionInterval: NodeJS.Timeout | null = null;

  static getInstance(): MemoryLeakDetector {
    if (!MemoryLeakDetector.instance) {
      MemoryLeakDetector.instance = new MemoryLeakDetector();
    }
    return MemoryLeakDetector.instance;
  }

  setBaseline(name: string) {
    const stats = MemoryPressureMonitor.getInstance().getMemoryStats();
    if (stats) {
      this.baselines.set(name, stats.used);
      console.log(`📊 Memory baseline set for "${name}": ${stats.used}MB`);
    }
  }

  checkForLeaks(name: string, threshold = 50) {
    const baseline = this.baselines.get(name);
    const stats = MemoryPressureMonitor.getInstance().getMemoryStats();
    
    if (!baseline || !stats) return false;

    const increase = stats.used - baseline;
    const hasLeak = increase > threshold;

    if (hasLeak) {
      console.warn(`🚨 Potential memory leak detected in "${name}": +${increase}MB`);
      return true;
    }

    return false;
  }

  startAutoDetection(intervalMs = 60000) {
    this.detectionInterval = setInterval(() => {
      const stats = MemoryPressureMonitor.getInstance().getMemoryStats();
      if (stats && stats.pressure > 0.9) {
        console.warn('🚨 High memory pressure detected:', stats);
      }
    }, intervalMs);
  }

  stopAutoDetection() {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }
  }
}

// Smart resource management
class ResourceManager {
  private resources = new Map<string, { 
    cleanup: () => void; 
    lastUsed: number;
    priority: 'high' | 'medium' | 'low';
  }>();

  register(
    id: string, 
    cleanup: () => void, 
    priority: 'high' | 'medium' | 'low' = 'medium'
  ) {
    this.resources.set(id, {
      cleanup,
      lastUsed: Date.now(),
      priority,
    });
  }

  use(id: string) {
    const resource = this.resources.get(id);
    if (resource) {
      resource.lastUsed = Date.now();
    }
  }

  cleanup(id: string) {
    const resource = this.resources.get(id);
    if (resource) {
      resource.cleanup();
      this.resources.delete(id);
    }
  }

  cleanupUnused(maxAge = 300000) { // 5 minutes
    const now = Date.now();
    const toCleanup = [];

    for (const [id, resource] of this.resources.entries()) {
      const age = now - resource.lastUsed;
      const shouldCleanup = age > maxAge && resource.priority === 'low';
      
      if (shouldCleanup) {
        toCleanup.push(id);
      }
    }

    toCleanup.forEach(id => this.cleanup(id));
    
    if (toCleanup.length > 0) {
      console.log(`🧹 Cleaned up ${toCleanup.length} unused resources`);
    }
  }

  cleanupAll() {
    this.resources.forEach((resource, id) => {
      resource.cleanup();
    });
    this.resources.clear();
    console.log('🧹 All resources cleaned up');
  }

  getStats() {
    const byPriority = { high: 0, medium: 0, low: 0 };
    
    this.resources.forEach(resource => {
      byPriority[resource.priority]++;
    });

    return {
      total: this.resources.size,
      byPriority,
    };
  }
}

// Export utilities
export const MemoryManager = {
  monitor: MemoryPressureMonitor.getInstance(),
  leakDetector: MemoryLeakDetector.getInstance(),
  resourceManager: new ResourceManager(),
  
  // Optimized pools for common objects
  arrayPool: new ObjectPool(() => [], arr => arr.length = 0),
  objectPool: new ObjectPool(() => ({}), (obj: Record<string, any>) => {
    for (const key in obj) delete obj[key];
  }),
  
  // Memory-efficient event emitter
  createEventEmitter: () => new MemoryEfficientEventEmitter(),
  
  // Initialize memory optimization
  initialize() {
    this.monitor.startMonitoring();
    this.leakDetector.startAutoDetection();
    
    // Setup cleanup on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.cleanup();
      });

      // Setup automatic cleanup of unused resources
      setInterval(() => {
        this.resourceManager.cleanupUnused();
      }, 300000); // Every 5 minutes
    }
    
    console.log('🧠 Advanced memory management initialized');
  },
  
  cleanup() {
    this.monitor.stopMonitoring();
    this.leakDetector.stopAutoDetection();
    this.resourceManager.cleanupAll();
    this.arrayPool.clear();
    this.objectPool.clear();
    console.log('🧹 Memory management cleanup completed');
  },
  
  getReport() {
    const memStats = this.monitor.getMemoryStats();
    const resourceStats = this.resourceManager.getStats();
    
    return {
      memory: memStats,
      resources: resourceStats,
      pools: {
        arrays: this.arrayPool.size(),
        objects: this.objectPool.size(),
      },
      timestamp: new Date().toISOString(),
    };
  },
};

// React hook for memory management
export const useMemoryManager = () => {
  const [memoryStats, setMemoryStats] = React.useState<ReturnType<typeof MemoryPressureMonitor.prototype.getMemoryStats> | null>(null);
  
  React.useEffect(() => {
    // Memory monitoring effect
    const unsubscribe = MemoryManager.monitor.onMemoryPressure((pressure: number) => {
      setMemoryStats(MemoryManager.monitor.getMemoryStats());
      
      if (pressure > 0.8) {
        console.warn('⚠️ High memory pressure, consider reducing memory usage');
      }
    });
    
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);
  
  return {
    memoryStats,
    cleanup: (id: string) => MemoryManager.resourceManager.cleanup(id),
    register: (id: string, cleanup: () => void, priority?: 'high' | 'medium' | 'low') => 
      MemoryManager.resourceManager.register(id, cleanup, priority),
    getReport: () => MemoryManager.getReport(),
  };
};

