// خدمة إدارة الكاش المتقدمة للخادم
import { NextRequest, NextResponse } from 'next/server';

export interface CacheConfig {
  ttl: number; // Time to live in seconds
  key: string;
  tags?: string[];
  revalidateOnStale?: boolean;
}

export interface CacheItem<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  tags?: string[];
}

class ServerCache {
  private cache = new Map<string, CacheItem>();
  private maxSize = 1000; // Maximum number of cached items

  // إعداد قيمة في الكاش
  set<T>(key: string, data: T, config: Partial<CacheConfig> = {}): void {
    // تنظيف الكاش إذا وصل للحد الأقصى
    if (this.cache.size >= this.maxSize) {
      this.cleanup();
    }

    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: config.ttl || 300, // 5 minutes default
      tags: config.tags || []
    };

    this.cache.set(key, item);
  }

  // الحصول على قيمة من الكاش
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // فحص انتهاء الصلاحية
    const now = Date.now();
    const isExpired = (now - item.timestamp) / 1000 > item.ttl;

    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  // حذف قيمة من الكاش
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  // حذف بناءً على العلامات
  invalidateByTags(tags: string[]): number {
    let deletedCount = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (item.tags?.some(tag => tags.includes(tag))) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  // تنظيف العناصر المنتهية الصلاحية
  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      const isExpired = (now - item.timestamp) / 1000 > item.ttl;
      if (isExpired) {
        toDelete.push(key);
      }
    }

    // حذف النصف الأقدم من العناصر إذا كان الكاش ممتلئاً
    if (toDelete.length === 0) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const halfSize = Math.floor(entries.length / 2);
      
      for (let i = 0; i < halfSize; i++) {
        toDelete.push(entries[i][0]);
      }
    }

    toDelete.forEach(key => this.cache.delete(key));
  }

  // إحصائيات الكاش
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys())
    };
  }

  // مسح كامل للكاش
  clear(): void {
    this.cache.clear();
  }
}

// إنشاء مثيل واحد للكاش
export const serverCache = new ServerCache();

// دالة مساعدة للكاش مع الدوال
export async function withCache<T>(
  key: string,
  fn: () => Promise<T> | T,
  config: Partial<CacheConfig> = {}
): Promise<T> {
  // محاولة الحصول من الكاش أولاً
  const cached = serverCache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // تشغيل الدالة وتخزين النتيجة
  const result = await fn();
  serverCache.set(key, result, config);
  
  return result;
}

// دالة لإنشاء مفتاح كاش موحد
export function createCacheKey(prefix: string, ...params: (string | number)[]): string {
  return `${prefix}:${params.join(':')}`;
}

// دالة للحصول على كاش headers
export function getCacheHeaders(maxAge: number = 300): Record<string, string> {
  return {
    'Cache-Control': `public, max-age=${maxAge}, s-maxage=${maxAge * 2}`,
    'CDN-Cache-Control': `public, max-age=${maxAge * 4}`,
    'Vary': 'Accept-Encoding, Authorization',
  };
}

// Middleware لإدارة الكاش
export function cacheMiddleware(config: CacheConfig) {
  return async (
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    const cacheKey = config.key || request.url;
    
    // محاولة الحصول من الكاش
    const cached = serverCache.get(cacheKey);
    if (cached && !config.revalidateOnStale) {
      return NextResponse.json(cached, {
        headers: getCacheHeaders(config.ttl)
      });
    }

    // تشغيل المعالج وتخزين النتيجة
    const response = await handler(request);
    
    if (response.ok) {
      const data = await response.clone().json();
      serverCache.set(cacheKey, data, config);
    }

    return response;
  };
}