import { unstable_batchedUpdates } from 'react-dom';
import { startTransition } from 'react';

// Batch multiple state updates to prevent unnecessary re-renders
export function batchUpdates(callback: () => void) {
  if (typeof unstable_batchedUpdates === 'function') {
    unstable_batchedUpdates(callback);
  } else {
    callback();
  }
}

// Use React 18's concurrent features for non-urgent updates
export function deferredUpdate(callback: () => void) {
  startTransition(() => {
    callback();
  });
}

// Optimized event handler wrapper that prevents event propagation issues
export function optimizedHandler<T extends (...args: any[]) => any>(
  handler: T,
  options?: {
    preventDefault?: boolean;
    stopPropagation?: boolean;
    passive?: boolean;
    capture?: boolean;
  }
): T {
  return ((event: any, ...args: any[]) => {
    if (options?.preventDefault && event?.preventDefault) {
      event.preventDefault();
    }
    if (options?.stopPropagation && event?.stopPropagation) {
      event.stopPropagation();
    }
    
    // Use requestIdleCallback for non-critical updates
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => {
        handler(event, ...args);
      }, { timeout: 50 });
    } else {
      // Fallback to requestAnimationFrame
      requestAnimationFrame(() => {
        handler(event, ...args);
      });
    }
  }) as T;
}

// Memory-efficient memoization with size limit
export function createMemoizer<T>(maxSize: number = 100) {
  const cache = new Map<string, { value: T; timestamp: number }>();
  
  return {
    get(key: string): T | undefined {
      const cached = cache.get(key);
      if (cached) {
        // Move to end (LRU)
        cache.delete(key);
        cache.set(key, cached);
        return cached.value;
      }
      return undefined;
    },
    
    set(key: string, value: T): void {
      // Remove oldest if at capacity
      if (cache.size >= maxSize) {
        const firstKey = cache.keys().next().value as string | undefined;
        if (firstKey !== undefined) {
          cache.delete(firstKey);
        }
      }
      cache.set(key, { value, timestamp: Date.now() });
    },
    
    clear(): void {
      cache.clear();
    },
    
    size(): number {
      return cache.size;
    }
  };
}

// Optimized scroll handler with passive event listener
export function optimizedScrollHandler(
  element: HTMLElement | null,
  handler: (event: Event) => void,
  options?: {
    throttle?: number;
    passive?: boolean;
  }
) {
  if (!element) return () => {};
  
  let ticking = false;
  let lastScrollY = 0;
  
  const throttledHandler = (event: Event) => {
    lastScrollY = window.scrollY;
    
    if (!ticking) {
      requestAnimationFrame(() => {
        handler(event);
        ticking = false;
      });
      ticking = true;
    }
  };
  
  element.addEventListener('scroll', throttledHandler, {
    passive: options?.passive !== false,
    capture: false
  });
  
  return () => {
    element.removeEventListener('scroll', throttledHandler);
  };
}

// Intersection Observer factory for lazy loading
export function createLazyLoader(
  callback: (entry: IntersectionObserverEntry) => void,
  options?: IntersectionObserverInit
) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        callback(entry);
        observer.unobserve(entry.target);
      }
    });
  }, {
    rootMargin: '50px',
    threshold: 0.01,
    ...options
  });
  
  return {
    observe: (element: Element) => observer.observe(element),
    unobserve: (element: Element) => observer.unobserve(element),
    disconnect: () => observer.disconnect()
  };
}

// Performance monitoring decorator
export function measurePerformance(name: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = function (...args: any[]) {
      const start = performance.now();
      const result = originalMethod.apply(this, args);
      const end = performance.now();
      
      if (end - start > 16) { // Slower than 60fps
        console.warn(`[Performance] ${name}.${propertyKey} took ${(end - start).toFixed(2)}ms`);
      }
      
      return result;
    };
    
    return descriptor;
  };
}

// Web Worker utility for heavy computations
export function offloadToWorker<T, R>(
  workerFunction: (data: T) => R
): (data: T) => Promise<R> {
  const workerCode = `
    self.onmessage = function(e) {
      const fn = ${workerFunction.toString()};
      const result = fn(e.data);
      self.postMessage(result);
    }
  `;
  
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  const workerUrl = URL.createObjectURL(blob);
  
  return (data: T): Promise<R> => {
    return new Promise((resolve, reject) => {
      const worker = new Worker(workerUrl);
      
      worker.onmessage = (e) => {
        resolve(e.data);
        worker.terminate();
      };
      
      worker.onerror = (error) => {
        reject(error);
        worker.terminate();
      };
      
      worker.postMessage(data);
    });
  };
}

// Request Animation Frame scheduler
export class RAFScheduler {
  private tasks: Map<string, () => void> = new Map();
  private rafId: number | null = null;
  
  schedule(id: string, task: () => void) {
    this.tasks.set(id, task);
    
    if (!this.rafId) {
      this.rafId = requestAnimationFrame(() => {
        this.flush();
      });
    }
  }
  
  cancel(id: string) {
    this.tasks.delete(id);
  }
  
  flush() {
    const tasks = Array.from(this.tasks.values());
    this.tasks.clear();
    this.rafId = null;
    
    tasks.forEach(task => task());
  }
  
  destroy() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    this.tasks.clear();
  }
}