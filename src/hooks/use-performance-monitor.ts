import { useEffect, useRef, useCallback } from 'react';

interface PerformanceMetrics {
  componentName: string;
  renderTime: number;
  mountTime: number;
  updateCount: number;
  lastRenderTimestamp: number;
}

const performanceData = new Map<string, PerformanceMetrics>();
const slowThreshold = 16; // 16ms = 60fps target

export function usePerformanceMonitor(componentName: string) {
  const renderStartTime = useRef<number>(performance.now());
  const updateCount = useRef<number>(0);
  const mountTime = useRef<number>(0);

  useEffect(() => {
    const renderEndTime = performance.now();
    const renderTime = renderEndTime - renderStartTime.current;
    
    updateCount.current++;
    
    if (updateCount.current === 1) {
      mountTime.current = renderTime;
    }

    // Store metrics
    performanceData.set(componentName, {
      componentName,
      renderTime,
      mountTime: mountTime.current,
      updateCount: updateCount.current,
      lastRenderTimestamp: renderEndTime,
    });

    // Log slow renders
    if (renderTime > slowThreshold) {
      console.warn(`[Performance] Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
    }

    // Reset start time for next render
    renderStartTime.current = performance.now();
  });

  const logMetrics = useCallback(() => {
    const metrics = performanceData.get(componentName);
    if (metrics) {
      console.log(`[Performance Metrics] ${componentName}:`, metrics);
    }
  }, [componentName]);

  return { logMetrics };
}

// Utility to get all performance data
export function getAllPerformanceMetrics() {
  return Array.from(performanceData.values());
}

// Utility to identify problematic components
export function getSlowComponents(threshold = slowThreshold) {
  return getAllPerformanceMetrics().filter(
    (metrics) => metrics.renderTime > threshold
  );
}

// Clear performance data
export function clearPerformanceData() {
  performanceData.clear();
}