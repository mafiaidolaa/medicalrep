"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useCallback, useRef } from 'react';

// واجهة إعدادات التحميل المسبق
interface PrefetchOptions {
  priority?: 'high' | 'medium' | 'low';
  delay?: number;
  condition?: () => boolean;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

// واجهة بيانات التنقل
interface NavigationData {
  href: string;
  prefetched?: boolean;
  timestamp?: number;
  priority?: string;
}

class PrefetchService {
  private router: any = null;
  private prefetchQueue: Map<string, PrefetchOptions> = new Map();
  private prefetchedRoutes: Set<string> = new Set();
  private isProcessing = false;
  private processingQueue: string[] = [];

  // تهيئة الخدمة
  initialize(router: any) {
    this.router = router;
    this.startQueueProcessor();
  }

  // إضافة مسار للتحميل المسبق
  prefetchRoute(href: string, options: PrefetchOptions = {}) {
    if (!href || this.prefetchedRoutes.has(href)) {
      return;
    }

    const finalOptions: PrefetchOptions = {
      priority: 'medium',
      delay: 0,
      condition: () => true,
      ...options
    };

    this.prefetchQueue.set(href, finalOptions);
    
    if (finalOptions.priority === 'high') {
      this.processingQueue.unshift(href);
    } else {
      this.processingQueue.push(href);
    }

    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  // معالجة طابور التحميل المسبق
  private async processQueue() {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.processingQueue.length > 0) {
      const href = this.processingQueue.shift();
      if (!href) continue;

      const options = this.prefetchQueue.get(href);
      if (!options) continue;

      try {
        // فحص الشرط
        if (options.condition && !options.condition()) {
          continue;
        }

        // تأخير إذا كان مطلوباً
        if (options.delay && options.delay > 0) {
          await new Promise(resolve => setTimeout(resolve, options.delay));
        }

        // تحميل المسار مسبقاً
        if (this.router) {
          await this.router.prefetch(href);
          this.prefetchedRoutes.add(href);
          options.onComplete?.();
        }

      } catch (error) {
        console.warn(`Failed to prefetch ${href}:`, error);
        options.onError?.(error as Error);
      } finally {
        this.prefetchQueue.delete(href);
      }

      // استراحة قصيرة بين العمليات
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    this.isProcessing = false;
  }

  // بدء معالج الطابور
  private startQueueProcessor() {
    // معالجة الطابور كل ثانيتين
    setInterval(() => {
      if (!this.isProcessing && this.processingQueue.length > 0) {
        this.processQueue();
      }
    }, 2000);
  }

  // تحميل مسبق للبيانات
  async prefetchData<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: { ttl?: number; force?: boolean } = {}
  ): Promise<T | null> {
    const cacheKey = `prefetch_${key}`;
    const now = Date.now();

    // فحص الكاش المحلي
    if (!options.force) {
      const cached = this.getCachedData<T>(cacheKey);
      if (cached && (!options.ttl || (now - cached.timestamp) < options.ttl)) {
        return cached.data;
      }
    }

    try {
      const data = await fetchFn();
      this.setCachedData(cacheKey, data);
      return data;
    } catch (error) {
      console.warn(`Failed to prefetch data for ${key}:`, error);
      return null;
    }
  }

  // تخزين البيانات في الكاش المحلي
  private setCachedData<T>(key: string, data: T) {
    try {
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(cacheData));
    } catch (error) {
      // تجاهل أخطاء التخزين المحلي
    }
  }

  // استرجاع البيانات من الكاش المحلي
  private getCachedData<T>(key: string): { data: T; timestamp: number } | null {
    try {
      const cached = localStorage.getItem(key);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      // تجاهل أخطاء قراءة التخزين المحلي
    }
    return null;
  }

  // مسح الكاش المنتهي الصلاحية
  clearExpiredCache(maxAge: number = 24 * 60 * 60 * 1000) { // 24 ساعة افتراضياً
    try {
      const now = Date.now();
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('prefetch_')) {
          const cached = this.getCachedData(key);
          if (cached && (now - cached.timestamp) > maxAge) {
            keysToRemove.push(key);
          }
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      // تجاهل أخطاء تنظيف الكاش
    }
  }

  // إحصائيات الخدمة
  getStats() {
    return {
      queueSize: this.prefetchQueue.size,
      processingQueueSize: this.processingQueue.length,
      prefetchedRoutesCount: this.prefetchedRoutes.size,
      isProcessing: this.isProcessing,
      prefetchedRoutes: Array.from(this.prefetchedRoutes)
    };
  }

  // تنظيف الخدمة
  cleanup() {
    this.prefetchQueue.clear();
    this.prefetchedRoutes.clear();
    this.processingQueue = [];
    this.isProcessing = false;
  }
}

// إنشاء مثيل واحد من الخدمة
export const prefetchService = new PrefetchService();

// Hook لاستخدام التحميل المسبق
export function usePrefetch() {
  const router = useRouter();

  useEffect(() => {
    prefetchService.initialize(router);

    // تنظيف الكاش المنتهي الصلاحية عند التحميل
    prefetchService.clearExpiredCache();

    return () => {
      prefetchService.cleanup();
    };
  }, [router]);

  const prefetchRoute = useCallback((href: string, options?: PrefetchOptions) => {
    prefetchService.prefetchRoute(href, options);
  }, []);

  const prefetchData = useCallback(async <T>(
    key: string,
    fetchFn: () => Promise<T>,
    options?: { ttl?: number; force?: boolean }
  ) => {
    return prefetchService.prefetchData(key, fetchFn, options);
  }, []);

  return {
    prefetchRoute,
    prefetchData,
    getStats: prefetchService.getStats.bind(prefetchService),
    clearExpiredCache: prefetchService.clearExpiredCache.bind(prefetchService)
  };
}

// Hook للتحميل المسبق الذكي بناءً على سلوك المستخدم
export function useSmartPrefetch() {
  const { prefetchRoute } = usePrefetch();
  const hoverTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const clickCounts = useRef<Map<string, number>>(new Map());

  const handleMouseEnter = useCallback((href: string) => {
    // تحميل مسبق بعد hover لمدة 300ms
    const timeout = setTimeout(() => {
      prefetchRoute(href, { priority: 'high', delay: 0 });
    }, 300);

    hoverTimeouts.current.set(href, timeout);
  }, [prefetchRoute]);

  const handleMouseLeave = useCallback((href: string) => {
    const timeout = hoverTimeouts.current.get(href);
    if (timeout) {
      clearTimeout(timeout);
      hoverTimeouts.current.delete(href);
    }
  }, []);

  const handleClick = useCallback((href: string) => {
    // تسجيل النقرة لتحليل السلوك
    const count = clickCounts.current.get(href) || 0;
    clickCounts.current.set(href, count + 1);

    // تحميل مسبق فوري للروابط المرتبطة
    const relatedRoutes = getRelatedRoutes(href);
    relatedRoutes.forEach(route => {
      prefetchRoute(route, { priority: 'medium', delay: 100 });
    });
  }, [prefetchRoute]);

  const getSmartPrefetchProps = useCallback((href: string) => {
    return {
      onMouseEnter: () => handleMouseEnter(href),
      onMouseLeave: () => handleMouseLeave(href),
      onClick: () => handleClick(href),
    };
  }, [handleMouseEnter, handleMouseLeave, handleClick]);

  return {
    getSmartPrefetchProps,
    getClickStats: () => Object.fromEntries(clickCounts.current)
  };
}

// دالة لتحديد الروابط المرتبطة
function getRelatedRoutes(currentRoute: string): string[] {
  const routeMap: Record<string, string[]> = {
    '/': ['/clinics', '/visits', '/orders'],
    '/clinics': ['/visits', '/plans'],
    '/visits': ['/clinics', '/orders', '/accounting'],
    '/orders': ['/visits', '/stock', '/accounting'],
    '/plans': ['/clinics', '/visits'],
    '/accounting': ['/visits', '/orders', '/reports'],
    '/reports': ['/accounting', '/stock', '/visits'],
    '/stock': ['/orders', '/reports'],
  };

  return routeMap[currentRoute] || [];
}

// مكون للتحميل المسبق الذكي للروابط
export function SmartLink({ 
  href, 
  children, 
  className = "",
  prefetchOptions,
  ...props 
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  prefetchOptions?: PrefetchOptions;
  [key: string]: any;
}) {
  const { getSmartPrefetchProps } = useSmartPrefetch();
  const { prefetchRoute } = usePrefetch();
  const smartProps = getSmartPrefetchProps(href);

  useEffect(() => {
    // تحميل مسبق للروابط المهمة عند التحميل
    if (prefetchOptions?.priority === 'high') {
      prefetchRoute(href, prefetchOptions);
    }
  }, [href, prefetchRoute, prefetchOptions]);

  // استخدام Link من Next.js بدلاً من React.createElement
  const Link = require('next/link').default;
  
  return {
    href,
    className,
    ...smartProps,
    ...props,
    children
  };
}

// Hook للتحميل المسبق بناءً على viewport
export function useViewportPrefetch(routes: string[], threshold = 0.5) {
  const { prefetchRoute } = usePrefetch();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const targetsRef = useRef<Set<Element>>(new Set());

  useEffect(() => {
    if (!window.IntersectionObserver) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const route = entry.target.getAttribute('data-prefetch-route');
            if (route) {
              prefetchRoute(route, { priority: 'low', delay: 500 });
            }
          }
        });
      },
      { threshold }
    );

    // مراقبة العناصر الموجودة
    targetsRef.current.forEach((target) => {
      observerRef.current?.observe(target);
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [prefetchRoute, threshold]);

  const addTarget = useCallback((element: Element, route: string) => {
    if (element && !targetsRef.current.has(element)) {
      element.setAttribute('data-prefetch-route', route);
      targetsRef.current.add(element);
      observerRef.current?.observe(element);
    }
  }, []);

  const removeTarget = useCallback((element: Element) => {
    if (element && targetsRef.current.has(element)) {
      targetsRef.current.delete(element);
      observerRef.current?.unobserve(element);
    }
  }, []);

  return { addTarget, removeTarget };
}