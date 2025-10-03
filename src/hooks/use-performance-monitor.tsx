"use client";

import { useEffect, useRef, useState } from 'react';

interface PerformanceMetrics {
  navigationTiming: number;
  componentRenderTime: number;
  apiCallTime: number;
  memoryUsage?: number;
}

interface PerformanceEntry {
  name: string;
  startTime: number;
  duration: number;
  type: string;
}

export function usePerformanceMonitor(componentName: string) {
  const startTime = useRef<number>(performance.now());
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    navigationTiming: 0,
    componentRenderTime: 0,
    apiCallTime: 0
  });

  // Monitor component render time
  useEffect(() => {
    const renderTime = performance.now() - startTime.current;
    
    setMetrics(prev => ({
      ...prev,
      componentRenderTime: renderTime
    }));

    // Log slow renders (> 100ms)
    if (renderTime > 100) {
      console.warn(`🐌 Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
    }

    // Measure navigation timing
    if (typeof window !== 'undefined' && window.performance && window.performance.navigation) {
      const navTiming = performance.getEntriesByType('navigation')[0] as any;
      if (navTiming) {
        const totalTime = navTiming.loadEventEnd - navTiming.fetchStart;
        setMetrics(prev => ({
          ...prev,
          navigationTiming: totalTime
        }));
      }
    }

    // Monitor memory usage (if available)
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      setMetrics(prev => ({
        ...prev,
        memoryUsage: memory.usedJSHeapSize / 1024 / 1024 // Convert to MB
      }));
    }
  }, [componentName]);

  // Track API call performance
  const trackApiCall = (name: string, startTime: number) => {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    setMetrics(prev => ({
      ...prev,
      apiCallTime: duration
    }));

    // Log slow API calls (> 1000ms)
    if (duration > 1000) {
      console.warn(`🐌 Slow API call detected: ${name} took ${duration.toFixed(2)}ms`);
    }

    return duration;
  };

  // Get performance observer for monitoring
  const startPerformanceObserver = () => {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          // Monitor long tasks (> 50ms)
          if (entry.entryType === 'longtask' && entry.duration > 50) {
            console.warn(`🐌 Long task detected: ${entry.duration.toFixed(2)}ms`);
          }
          
          // Monitor largest contentful paint
          if (entry.entryType === 'largest-contentful-paint') {
            console.log(`📊 LCP: ${entry.startTime.toFixed(2)}ms`);
          }
          
          // Monitor cumulative layout shift
          if (entry.entryType === 'layout-shift' && (entry as any).value > 0.1) {
            console.warn(`📐 Layout shift detected: ${(entry as any).value.toFixed(4)}`);
          }
        });
      });

      // Observe different types of performance entries
      try {
        observer.observe({ entryTypes: ['longtask', 'largest-contentful-paint', 'layout-shift'] });
      } catch (e) {
        // Fallback to individual observations if bulk observation fails
        try {
          observer.observe({ entryTypes: ['longtask'] });
        } catch (e2) {
          console.debug('Performance observer not fully supported');
        }
      }

      return observer;
    } catch (error) {
      console.debug('Performance observer initialization failed:', error);
    }
  };

  useEffect(() => {
    const observer = startPerformanceObserver();
    
    return () => {
      observer?.disconnect();
    };
  }, []);

  return {
    metrics,
    trackApiCall,
    startTime: startTime.current
  };
}

// Performance debug component
export function PerformanceDebugger({ show = false }: { show?: boolean }) {
  const { metrics } = usePerformanceMonitor('PerformanceDebugger');

  if (!show || process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-black/80 text-white p-3 rounded-lg text-xs font-mono max-w-xs">
      <div className="font-bold mb-2">⚡ Performance Metrics</div>
      <div>Render: {metrics.componentRenderTime.toFixed(1)}ms</div>
      <div>Navigation: {metrics.navigationTiming.toFixed(1)}ms</div>
      <div>API: {metrics.apiCallTime.toFixed(1)}ms</div>
      {metrics.memoryUsage && (
        <div>Memory: {metrics.memoryUsage.toFixed(1)}MB</div>
      )}
    </div>
  );
}