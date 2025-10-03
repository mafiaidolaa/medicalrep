// Advanced Performance Monitoring System
'use client';

import { onCLS, onINP, onFCP, onLCP, onTTFB } from 'web-vitals';

interface PerformanceMetric {
  name: string;
  value: number;
  id: string;
  rating: 'good' | 'needs-improvement' | 'poor';
  navigationType: string;
  timestamp: number;
}

interface PageLoadMetrics {
  url: string;
  loadTime: number;
  domContentLoaded: number;
  firstPaint: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  totalBlockingTime: number;
  userAgent: string;
  connection?: NetworkInformation;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private pageLoadStart: number = 0;
  private isEnabled: boolean = true;

  constructor() {
    this.pageLoadStart = performance.now();
    this.isEnabled = process.env.NODE_ENV === 'production' || 
                    process.env.NEXT_PUBLIC_ENABLE_MONITORING === 'true';
    
    if (this.isEnabled && typeof window !== 'undefined') {
      this.initializeMonitoring();
    }
  }

  private initializeMonitoring() {
    // Web Vitals monitoring
    onCLS(this.handleMetric.bind(this));
    onINP(this.handleMetric.bind(this));
    onFCP(this.handleMetric.bind(this));
    onLCP(this.handleMetric.bind(this));
    onTTFB(this.handleMetric.bind(this));

    // Custom performance observers
    this.observeResourceTiming();
    this.observeNavigationTiming();
    this.observeLongTasks();
    
    // Page visibility changes
    this.observePageVisibility();
    
    // Memory usage (if supported)
    this.monitorMemoryUsage();
  }

  private handleMetric(metric: any) {
    const performanceMetric: PerformanceMetric = {
      name: metric.name,
      value: metric.value,
      id: metric.id,
      rating: metric.rating,
      navigationType: metric.navigationType || 'unknown',
      timestamp: Date.now()
    };

    this.metrics.push(performanceMetric);
    
    // Log critical metrics
    if (metric.rating === 'poor') {
      console.warn(`🚨 Poor ${metric.name}:`, metric.value, 'ms');
    }

    // Send to analytics (if configured)
    this.sendMetricToAnalytics(performanceMetric);
  }

  private observeResourceTiming() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          // Monitor slow resources
          if (entry.duration > 1000) { // >1s
            console.warn('🐌 Slow resource:', entry.name, `${Math.round(entry.duration)}ms`);
            
            this.sendEvent({
              type: 'slow_resource',
              resource: entry.name,
              duration: entry.duration,
              size: entry.transferSize
            });
          }
        });
      });
      
      observer.observe({ entryTypes: ['resource'] });
    }
  }

  private observeNavigationTiming() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          const metrics: PageLoadMetrics = {
            url: window.location.href,
            loadTime: entry.loadEventEnd - entry.loadEventStart,
            domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
            firstPaint: this.getFirstPaint(),
            firstContentfulPaint: this.getFirstContentfulPaint(),
            largestContentfulPaint: 0, // Will be updated by LCP observer
            firstInputDelay: 0, // Will be updated by FID observer
            cumulativeLayoutShift: 0, // Will be updated by CLS observer
            totalBlockingTime: this.calculateTotalBlockingTime(),
            userAgent: navigator.userAgent,
            connection: (navigator as any).connection
          };

          this.sendPageLoadMetrics(metrics);
        });
      });
      
      observer.observe({ entryTypes: ['navigation'] });
    }
  }

  private observeLongTasks() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          console.warn('⏱️ Long task detected:', `${Math.round(entry.duration)}ms`);
          
          this.sendEvent({
            type: 'long_task',
            duration: entry.duration,
            startTime: entry.startTime,
            attribution: entry.attribution
          });
        });
      });
      
      try {
        observer.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        // longtask not supported
      }
    }
  }

  private observePageVisibility() {
    let visibilityStart = Date.now();
    let wasVisible = !document.hidden;

    document.addEventListener('visibilitychange', () => {
      const now = Date.now();
      const timeOnPage = now - visibilityStart;

      if (document.hidden && wasVisible) {
        // Page became hidden
        this.sendEvent({
          type: 'page_hidden',
          timeVisible: timeOnPage,
          url: window.location.href
        });
      } else if (!document.hidden && !wasVisible) {
        // Page became visible
        this.sendEvent({
          type: 'page_visible',
          timeHidden: timeOnPage,
          url: window.location.href
        });
      }

      visibilityStart = now;
      wasVisible = !document.hidden;
    });
  }

  private monitorMemoryUsage() {
    if ('memory' in performance) {
      setInterval(() => {
        const memInfo = (performance as any).memory;
        const memUsage = {
          used: memInfo.usedJSHeapSize,
          total: memInfo.totalJSHeapSize,
          limit: memInfo.jsHeapSizeLimit
        };

        // Alert if memory usage is high
        const usagePercent = (memUsage.used / memUsage.limit) * 100;
        if (usagePercent > 80) {
          console.warn('🧠 High memory usage:', `${usagePercent.toFixed(1)}%`);
          
          this.sendEvent({
            type: 'high_memory_usage',
            usage: memUsage,
            percentage: usagePercent
          });
        }
      }, 30000); // Check every 30 seconds
    }
  }

  private getFirstPaint(): number {
    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
    return firstPaint ? firstPaint.startTime : 0;
  }

  private getFirstContentfulPaint(): number {
    const paintEntries = performance.getEntriesByType('paint');
    const firstContentfulPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    return firstContentfulPaint ? firstContentfulPaint.startTime : 0;
  }

  private calculateTotalBlockingTime(): number {
    const longTaskEntries = performance.getEntriesByType('longtask');
    return longTaskEntries.reduce((total: number, entry: any) => {
      return total + Math.max(0, entry.duration - 50); // Tasks >50ms block main thread
    }, 0);
  }

  // Analytics integration methods
  private sendMetricToAnalytics(metric: PerformanceMetric) {
    // Send to your analytics service
    this.sendToAnalytics('performance_metric', {
      metric_name: metric.name,
      metric_value: metric.value,
      metric_rating: metric.rating,
      page_url: window.location.href,
      timestamp: metric.timestamp
    });
  }

  private sendPageLoadMetrics(metrics: PageLoadMetrics) {
    this.sendToAnalytics('page_load_complete', metrics);
  }

  private sendEvent(event: Record<string, any>) {
    this.sendToAnalytics('performance_event', {
      ...event,
      page_url: window.location.href,
      timestamp: Date.now()
    });
  }

  private sendToAnalytics(eventName: string, data: any) {
    if (!this.isEnabled) return;

    try {
      // Google Analytics 4 (if configured)
      if (typeof gtag !== 'undefined') {
        gtag('event', eventName, data);
      }

      // Custom analytics endpoint
      if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
        fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            event: eventName,
            data,
            session_id: this.getSessionId(),
            user_id: this.getUserId()
          })
        }).catch(error => {
          console.warn('Analytics send failed:', error);
        });
      }

      // Development logging
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Performance Event:', eventName, data);
      }
    } catch (error) {
      console.warn('Analytics error:', error);
    }
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('performance_session_id');
    if (!sessionId) {
      sessionId = Date.now().toString(36) + Math.random().toString(36);
      sessionStorage.setItem('performance_session_id', sessionId);
    }
    return sessionId;
  }

  private getUserId(): string {
    // Implement your user ID logic
    return localStorage.getItem('user_id') || 'anonymous';
  }

  // Public methods for manual tracking
  public trackUserInteraction(action: string, target: string, value?: number) {
    this.sendEvent({
      type: 'user_interaction',
      action,
      target,
      value,
      timestamp: Date.now()
    });
  }

  public trackCustomMetric(name: string, value: number, unit: string = 'ms') {
    this.sendEvent({
      type: 'custom_metric',
      name,
      value,
      unit,
      timestamp: Date.now()
    });
  }

  public getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  public getPerformanceReport(): string {
    const report = this.metrics.map(metric => 
      `${metric.name}: ${metric.value.toFixed(2)}ms (${metric.rating})`
    ).join('\n');

    return `Performance Report:\n${report}`;
  }
}

// Global performance monitor instance
let performanceMonitor: PerformanceMonitor | null = null;

export function initializePerformanceMonitoring() {
  if (!performanceMonitor && typeof window !== 'undefined') {
    performanceMonitor = new PerformanceMonitor();
  }
  return performanceMonitor;
}

export function getPerformanceMonitor() {
  return performanceMonitor;
}

// React hook for performance monitoring
export function usePerformanceMonitoring() {
  const monitor = initializePerformanceMonitoring();
  
  return {
    trackInteraction: monitor?.trackUserInteraction.bind(monitor),
    trackMetric: monitor?.trackCustomMetric.bind(monitor),
    getMetrics: monitor?.getMetrics.bind(monitor),
    getReport: monitor?.getPerformanceReport.bind(monitor)
  };
}

export default PerformanceMonitor;