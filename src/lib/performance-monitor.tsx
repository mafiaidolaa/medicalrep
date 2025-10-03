// Advanced Real-Time Performance Monitor and Dashboard
'use client';

import React, { useState, useEffect, useCallback } from 'react';

// Type definitions
interface NetworkRequest {
  url: string;
  duration: number;
  status: number;
  size: number;
  timestamp: number;
  error?: boolean;
}

interface UserInteraction {
  type: string;
  timestamp: number;
  target?: string;
}

interface PerformanceMetrics {
  pageLoad: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  memoryUsage: number;
  bundleSize: number;
  networkRequests: NetworkRequest[];
  userInteractions: UserInteraction[];
}

interface PerformanceThresholds {
  good: number;
  poor: number;
}

interface PerformanceThresholdMap {
  [key: string]: PerformanceThresholds;
}

interface PerformanceScoreMap {
  [key: string]: number;
}

interface PerformanceWeights {
  [key: string]: number;
}

interface PerformanceSuggestion {
  metric: string;
  issue: string;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
}

interface PerformanceAnalysis {
  score: number;
  suggestions: PerformanceSuggestion[];
  metrics: PerformanceMetrics;
}

interface PerformanceMonitoringOptions {
  updateInterval?: number;
  enabled?: boolean;
}

// Performance metrics collection
class PerformanceCollector {
  private static instance: PerformanceCollector;
  private metrics: PerformanceMetrics = {
    pageLoad: 0,
    firstContentfulPaint: 0,
    largestContentfulPaint: 0,
    firstInputDelay: 0,
    cumulativeLayoutShift: 0,
    memoryUsage: 0,
    bundleSize: 0,
    networkRequests: [],
    userInteractions: [],
  };
  
  private observers = new Map<string, PerformanceObserver>();

  static getInstance(): PerformanceCollector {
    if (!PerformanceCollector.instance) {
      PerformanceCollector.instance = new PerformanceCollector();
    }
    return PerformanceCollector.instance;
  }

  initialize() {
    if (typeof window === 'undefined') return;

    this.collectNavigationMetrics();
    this.setupPerformanceObservers();
    this.collectMemoryMetrics();
    this.monitorNetworkRequests();
    
    console.log('📊 Performance monitoring initialized');
  }

  private collectNavigationMetrics() {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (navigation) {
      this.metrics.pageLoad = navigation.loadEventEnd - navigation.fetchStart;
    }
  }

  private setupPerformanceObservers() {
    // Core Web Vitals
    if ('PerformanceObserver' in window) {
      // First Contentful Paint
      const paintObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            this.metrics.firstContentfulPaint = entry.startTime;
          }
        });
      });
      paintObserver.observe({ entryTypes: ['paint'] });
      this.observers.set('paint', paintObserver);

      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.metrics.largestContentfulPaint = lastEntry.startTime;
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.set('lcp', lcpObserver);

      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          const performanceEntry = entry as any; // Cast to any due to limited TypeScript support for first-input entries
          this.metrics.firstInputDelay = performanceEntry.processingStart - performanceEntry.startTime;
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.set('fid', fidObserver);

      // Cumulative Layout Shift
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        const entries = list.getEntries();
        entries.forEach((entry) => {
          const layoutShiftEntry = entry as any; // Cast to any due to limited TypeScript support for layout-shift entries
          if (!layoutShiftEntry.hadRecentInput) {
            clsValue += layoutShiftEntry.value;
          }
        });
        this.metrics.cumulativeLayoutShift = clsValue;
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.set('cls', clsObserver);
    }
  }

  private collectMemoryMetrics() {
    const updateMemory = () => {
      const performance = (window.performance as any);
      if (performance && performance.memory) {
        this.metrics.memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024;
      }
    };

    updateMemory();
    setInterval(updateMemory, 5000);
  }

  private monitorNetworkRequests() {
    const originalFetch = window.fetch;
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const startTime = performance.now();
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        
        const networkRequest: NetworkRequest = {
          url: args[0].toString(),
          duration: endTime - startTime,
          status: response.status,
          size: parseInt(response.headers.get('content-length') || '0'),
          timestamp: Date.now(),
        };
        this.metrics.networkRequests.push(networkRequest);
        
        return response;
      } catch (error) {
        const endTime = performance.now();
        const errorRequest: NetworkRequest = {
          url: args[0].toString(),
          duration: endTime - startTime,
          status: 0,
          size: 0,
          timestamp: Date.now(),
          error: true,
        };
        this.metrics.networkRequests.push(errorRequest);
        throw error;
      }
    };
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  getPerformanceScore(): number {
    const weights: PerformanceWeights = {
      fcp: 0.25,
      lcp: 0.25,
      fid: 0.25,
      cls: 0.25,
    };

    const scores: PerformanceScoreMap = {
      fcp: this.getScoreForMetric('fcp', this.metrics.firstContentfulPaint),
      lcp: this.getScoreForMetric('lcp', this.metrics.largestContentfulPaint),
      fid: this.getScoreForMetric('fid', this.metrics.firstInputDelay),
      cls: this.getScoreForMetric('cls', this.metrics.cumulativeLayoutShift),
    };

    const totalScore = Object.keys(weights).reduce((total, metric) => {
      return total + (scores[metric] * weights[metric]);
    }, 0);

    return Math.round(totalScore * 100);
  }

  private getScoreForMetric(metric: string, value: number): number {
    const thresholds: PerformanceThresholdMap = {
      fcp: { good: 1800, poor: 3000 },
      lcp: { good: 2500, poor: 4000 },
      fid: { good: 100, poor: 300 },
      cls: { good: 0.1, poor: 0.25 },
    };

    const threshold = thresholds[metric];
    if (!threshold) return 0; // Handle unknown metrics
    if (value <= threshold.good) return 1;
    if (value >= threshold.poor) return 0;
    
    return 1 - ((value - threshold.good) / (threshold.poor - threshold.good));
  }

  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}

// Real-time performance dashboard component
export const PerformanceDashboard: React.FC<{ 
  visible?: boolean; 
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}> = ({ 
  visible = false, 
  position = 'bottom-right' 
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  
  useEffect(() => {
    if (!visible) return;

    const collector = PerformanceCollector.getInstance();
    collector.initialize();

    const interval = setInterval(() => {
      setMetrics(collector.getMetrics());
    }, 1000);

    return () => {
      clearInterval(interval);
      collector.cleanup();
    };
  }, [visible]);

  if (!visible || !metrics) return null;

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  const performanceScore = PerformanceCollector.getInstance().getPerformanceScore();
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className={`fixed z-50 ${positionClasses[position]} 
                     bg-black/90 text-white p-3 rounded-lg text-xs
                     font-mono border border-gray-600 backdrop-blur-sm
                     ${isMinimized ? 'w-32' : 'w-72'}`}>
      
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <span className="font-bold">⚡ Performance</span>
        <button 
          onClick={() => setIsMinimized(!isMinimized)}
          className="text-gray-400 hover:text-white"
        >
          {isMinimized ? '📈' : '📉'}
        </button>
      </div>

      {isMinimized ? (
        <div className="text-center">
          <div className={`text-lg font-bold ${getScoreColor(performanceScore)}`}>
            {performanceScore}
          </div>
          <div className="text-gray-400">Score</div>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Performance Score */}
          <div className="flex justify-between">
            <span>Score:</span>
            <span className={`font-bold ${getScoreColor(performanceScore)}`}>
              {performanceScore}/100
            </span>
          </div>

          {/* Core Web Vitals */}
          <div className="border-t border-gray-600 pt-2">
            <div className="text-gray-400 mb-1">Core Web Vitals</div>
            
            <div className="flex justify-between">
              <span>FCP:</span>
              <span className={metrics.firstContentfulPaint < 1800 ? 'text-green-400' : 'text-yellow-400'}>
                {Math.round(metrics.firstContentfulPaint)}ms
              </span>
            </div>
            
            <div className="flex justify-between">
              <span>LCP:</span>
              <span className={metrics.largestContentfulPaint < 2500 ? 'text-green-400' : 'text-yellow-400'}>
                {Math.round(metrics.largestContentfulPaint)}ms
              </span>
            </div>
            
            <div className="flex justify-between">
              <span>FID:</span>
              <span className={metrics.firstInputDelay < 100 ? 'text-green-400' : 'text-yellow-400'}>
                {Math.round(metrics.firstInputDelay)}ms
              </span>
            </div>
            
            <div className="flex justify-between">
              <span>CLS:</span>
              <span className={metrics.cumulativeLayoutShift < 0.1 ? 'text-green-400' : 'text-yellow-400'}>
                {metrics.cumulativeLayoutShift.toFixed(3)}
              </span>
            </div>
          </div>

          {/* Memory & Network */}
          <div className="border-t border-gray-600 pt-2">
            <div className="text-gray-400 mb-1">Resources</div>
            
            <div className="flex justify-between">
              <span>Memory:</span>
              <span className={metrics.memoryUsage < 50 ? 'text-green-400' : 'text-yellow-400'}>
                {Math.round(metrics.memoryUsage)}MB
              </span>
            </div>
            
            <div className="flex justify-between">
              <span>Requests:</span>
              <span>{metrics.networkRequests.length}</span>
            </div>
            
            <div className="flex justify-between">
              <span>Load Time:</span>
              <span className={metrics.pageLoad < 3000 ? 'text-green-400' : 'text-yellow-400'}>
                {Math.round(metrics.pageLoad)}ms
              </span>
            </div>
          </div>

          {/* Recent Network Activity */}
          {metrics.networkRequests.length > 0 && (
            <div className="border-t border-gray-600 pt-2">
              <div className="text-gray-400 mb-1">Recent Network</div>
              {metrics.networkRequests.slice(-3).map((request, index) => (
                <div key={index} className="flex justify-between text-xs">
                  <span className="truncate max-w-[120px]">
                    {request.url.split('/').pop()}
                  </span>
                  <span className={request.error ? 'text-red-400' : 'text-gray-300'}>
                    {request.error ? 'ERR' : `${Math.round(request.duration)}ms`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Performance optimization suggestions
export const PerformanceOptimizer = {
  analyzeAndSuggest: (): PerformanceAnalysis => {
    const collector = PerformanceCollector.getInstance();
    const metrics = collector.getMetrics();
    const suggestions: PerformanceSuggestion[] = [];

    // FCP suggestions
    if (metrics.firstContentfulPaint > 1800) {
      suggestions.push({
        metric: 'First Contentful Paint',
        issue: 'Slow initial render',
        suggestion: 'Optimize critical CSS and reduce render-blocking resources',
        priority: 'high' as const,
      });
    }

    // LCP suggestions
    if (metrics.largestContentfulPaint > 2500) {
      suggestions.push({
        metric: 'Largest Contentful Paint',
        issue: 'Main content loads slowly',
        suggestion: 'Optimize images and preload critical resources',
        priority: 'high' as const,
      });
    }

    // Memory suggestions
    if (metrics.memoryUsage > 100) {
      suggestions.push({
        metric: 'Memory Usage',
        issue: 'High memory consumption',
        suggestion: 'Check for memory leaks and optimize data structures',
        priority: 'medium' as const,
      });
    }

    // Network suggestions
    const slowRequests = metrics.networkRequests.filter((req: NetworkRequest) => req.duration > 1000);
    if (slowRequests.length > 0) {
      suggestions.push({
        metric: 'Network Performance',
        issue: `${slowRequests.length} slow network requests`,
        suggestion: 'Optimize API responses and implement caching',
        priority: 'medium' as const,
      });
    }

    return {
      score: collector.getPerformanceScore(),
      suggestions,
      metrics,
    };
  },

  // Automatic performance monitoring hook
  usePerformanceMonitoring: (options: PerformanceMonitoringOptions = {}) => {
    const [performanceData, setPerformanceData] = useState<PerformanceMetrics | null>(null);
    const [suggestions, setSuggestions] = useState<PerformanceSuggestion[]>([]);

    useEffect(() => {
      const collector = PerformanceCollector.getInstance();
      collector.initialize();

      const interval = setInterval(() => {
        const analysis = PerformanceOptimizer.analyzeAndSuggest();
        setPerformanceData(analysis.metrics);
        setSuggestions(analysis.suggestions);
      }, options.updateInterval || 5000);

      return () => {
        clearInterval(interval);
        collector.cleanup();
      };
    }, [options.updateInterval]);

    return {
      performanceData,
      suggestions,
      score: performanceData ? PerformanceCollector.getInstance().getPerformanceScore() : 0,
    };
  },
};

// Hook for easy performance monitoring
export const usePerformanceMonitor = (options: PerformanceMonitoringOptions = { enabled: true }) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  
  useEffect(() => {
    if (!options.enabled) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Toggle with Ctrl+Shift+P
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setIsVisible(!isVisible);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [options.enabled, isVisible]);

  const monitoring = PerformanceOptimizer.usePerformanceMonitoring();

  return {
    ...monitoring,
    isVisible,
    setIsVisible,
    toggle: () => setIsVisible(!isVisible),
  };
};

export {
  PerformanceCollector,
};

export default PerformanceDashboard;
