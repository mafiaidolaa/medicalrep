"use client";

import { useCallback, useEffect, useRef, useState } from 'react';

// Performance measurement hook
export function usePerformance(componentName: string) {
  const startTime = useRef<number>(Date.now());
  const [renderTime, setRenderTime] = useState<number>(0);
  const renderCount = useRef<number>(0);

  useEffect(() => {
    renderCount.current += 1;
    const endTime = Date.now();
    const duration = endTime - startTime.current;
    setRenderTime(duration);
    
    // Only log in development
    if (process.env.NODE_ENV === 'development' && duration > 100) {
      console.warn(`🐌 Slow component render: ${componentName} took ${duration}ms (render #${renderCount.current})`);
    }
  });

  const measureAsync = useCallback(async (name: string, fn: () => Promise<any>) => {
    const start = performance.now();
    try {
      const result = await fn();
      const end = performance.now();
      const duration = end - start;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`⏱️ ${componentName}.${name}: ${duration.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      const end = performance.now();
      const duration = end - start;
      
      if (process.env.NODE_ENV === 'development') {
        console.error(`❌ ${componentName}.${name} failed after ${duration.toFixed(2)}ms:`, error);
      }
      
      throw error;
    }
  }, [componentName]);

  return {
    renderTime,
    renderCount: renderCount.current,
    measureAsync,
  };
}

// Memory usage hook
export function useMemoryMonitor() {
  const [memoryInfo, setMemoryInfo] = useState<any>(null);

  useEffect(() => {
    const updateMemoryInfo = () => {
      if ('memory' in performance) {
        setMemoryInfo((performance as any).memory);
      }
    };

    updateMemoryInfo();
    const interval = setInterval(updateMemoryInfo, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  return memoryInfo;
}

// Debounce hook for performance optimization
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Throttle hook for performance optimization
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef(Date.now());

  return useCallback(
    ((...args) => {
      if (Date.now() - lastRun.current >= delay) {
        callback(...args);
        lastRun.current = Date.now();
      }
    }) as T,
    [callback, delay]
  );
}

// Virtual list hook for large data sets
export function useVirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5,
}: {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}) {
  const [scrollTop, setScrollTop] = useState(0);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1).map((item, index) => ({
    item,
    index: startIndex + index,
  }));

  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  return {
    visibleItems,
    totalHeight,
    offsetY,
    setScrollTop,
  };
}

// Intersection observer hook for lazy loading
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
): [React.RefObject<HTMLElement>, boolean] {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const targetRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = targetRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [options]);

  return [targetRef, isIntersecting];
}

// Performance-optimized search hook
export function useOptimizedSearch<T>(
  items: T[],
  searchTerm: string,
  searchFields: (keyof T)[],
  debounceMs = 300
) {
  const debouncedSearchTerm = useDebounce(searchTerm, debounceMs);
  const [filteredItems, setFilteredItems] = useState<T[]>(items);

  useEffect(() => {
    if (!debouncedSearchTerm.trim()) {
      setFilteredItems(items);
      return;
    }

    const filtered = items.filter((item) =>
      searchFields.some((field) => {
        const value = item[field];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
        }
        if (typeof value === 'number') {
          return value.toString().includes(debouncedSearchTerm);
        }
        return false;
      })
    );

    setFilteredItems(filtered);
  }, [items, debouncedSearchTerm, searchFields]);

  return filteredItems;
}

// Battery API hook for performance adjustments
export function useBatteryStatus() {
  const [batteryInfo, setBatteryInfo] = useState<{
    charging: boolean;
    level: number;
    chargingTime: number;
    dischargingTime: number;
  } | null>(null);

  useEffect(() => {
    const updateBatteryInfo = (battery: any) => {
      setBatteryInfo({
        charging: battery.charging,
        level: battery.level,
        chargingTime: battery.chargingTime,
        dischargingTime: battery.dischargingTime,
      });
    };

    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then(updateBatteryInfo);
    }
  }, []);

  return batteryInfo;
}

// Network status hook for adaptive loading
export function useNetworkStatus() {
  const [networkStatus, setNetworkStatus] = useState<{
    online: boolean;
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  }>({
    online: navigator.onLine,
  });

  useEffect(() => {
    const updateNetworkStatus = () => {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      
      setNetworkStatus({
        online: navigator.onLine,
        effectiveType: connection?.effectiveType,
        downlink: connection?.downlink,
        rtt: connection?.rtt,
      });
    };

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', updateNetworkStatus);
    }

    updateNetworkStatus();

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
      if (connection) {
        connection.removeEventListener('change', updateNetworkStatus);
      }
    };
  }, []);

  return networkStatus;
}