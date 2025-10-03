// نظام تحسين API وقاعدة البيانات متقدم

// Cache in-memory بسيط وسريع
class MemoryCache {
  private cache = new Map<string, { data: any; expires: number }>();
  
  set(key: string, data: any, ttl: number = 5 * 60 * 1000) { // 5 دقائق افتراضي
    const expires = Date.now() + ttl;
    this.cache.set(key, { data, expires });
    
    // تنظيف تلقائي
    setTimeout(() => {
      if (this.cache.has(key) && this.cache.get(key)!.expires <= Date.now()) {
        this.cache.delete(key);
      }
    }, ttl);
  }
  
  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (item.expires <= Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }
  
  delete(key: string): void {
    this.cache.delete(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  size(): number {
    return this.cache.size;
  }
}

// إنشاء Cache instance
export const apiCache = new MemoryCache();

// Debounce function للحد من الطلبات المتكررة
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle function للحد من معدل الطلبات
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Request deduplication - منع الطلبات المكررة
class RequestDeduplicator {
  private pending = new Map<string, Promise<any>>();
  
  async dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
    if (this.pending.has(key)) {
      return this.pending.get(key);
    }
    
    const promise = fn().finally(() => {
      this.pending.delete(key);
    });
    
    this.pending.set(key, promise);
    return promise;
  }
}

export const requestDeduplicator = new RequestDeduplicator();

// Optimized API caller مع cache وerror handling
interface ApiOptions {
  cache?: boolean;
  cacheTTL?: number;
  retries?: number;
  timeout?: number;
  dedupe?: boolean;
}

export async function optimizedApiCall<T>(
  url: string,
  options: RequestInit & ApiOptions = {}
): Promise<T> {
  const {
    cache: useCache = true,
    cacheTTL = 5 * 60 * 1000, // 5 دقائق
    retries = 2,
    timeout = 10000, // 10 ثواني
    dedupe = true,
    ...fetchOptions
  } = options;
  
  const cacheKey = `api:${url}:${JSON.stringify(fetchOptions)}`;
  
  // تحقق من Cache أولاً
  if (useCache && fetchOptions.method !== 'POST' && fetchOptions.method !== 'PUT' && fetchOptions.method !== 'DELETE') {
    const cached = apiCache.get(cacheKey);
    if (cached) {
      return cached;
    }
  }
  
  const makeRequest = async (): Promise<T> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // حفظ في Cache إذا كان GET request
      if (useCache && (!fetchOptions.method || fetchOptions.method === 'GET')) {
        apiCache.set(cacheKey, data, cacheTTL);
      }
      
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };
  
  // تطبيق deduplication إذا مطلوب
  if (dedupe && (!fetchOptions.method || fetchOptions.method === 'GET')) {
    return requestDeduplicator.dedupe(cacheKey, makeRequest);
  }
  
  // إعادة المحاولة في حالة الفشل
  for (let i = 0; i <= retries; i++) {
    try {
      return await makeRequest();
    } catch (error) {
      if (i === retries) throw error;
      
      // انتظار متزايد بين المحاولات
      const delay = Math.min(1000 * Math.pow(2, i), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Max retries exceeded');
}

// Supabase query optimizer
export class SupabaseOptimizer {
  private static queryCache = new Map<string, any>();
  
  static async optimizedQuery(
    queryBuilder: any,
    cacheKey?: string,
    cacheTTL: number = 5 * 60 * 1000
  ) {
    const key = cacheKey || JSON.stringify(queryBuilder);
    
    // تحقق من Cache
    const cached = apiCache.get(`supabase:${key}`);
    if (cached) {
      return cached;
    }
    
    try {
      const { data, error } = await queryBuilder;
      
      if (error) {
        console.error('Supabase query error:', error);
        throw error;
      }
      
      // حفظ في Cache
      apiCache.set(`supabase:${key}`, data, cacheTTL);
      
      return data;
    } catch (error) {
      console.error('Optimized query failed:', error);
      throw error;
    }
  }
  
  // Batch operations للحد من عدد الاستدعاءات
  static async batchSelect(
    table: string,
    ids: string[],
    columns: string = '*'
  ) {
    const cacheKey = `batch:${table}:${columns}:${ids.sort().join(',')}`;
    const cached = apiCache.get(cacheKey);
    if (cached) return cached;
    
    // يمكن تنفيذها مع Supabase client
    // const result = await supabase.from(table).select(columns).in('id', ids);
    // apiCache.set(cacheKey, result.data);
    // return result.data;
    
    return []; // placeholder
  }
}

// Performance monitoring
export class PerformanceMonitor {
  private static metrics = new Map<string, number[]>();
  
  static startTimer(label: string): () => void {
    const start = performance.now();
    
    return () => {
      const duration = performance.now() - start;
      
      if (!this.metrics.has(label)) {
        this.metrics.set(label, []);
      }
      
      const times = this.metrics.get(label)!;
      times.push(duration);
      
      // احتفظ بآخر 100 قياس فقط
      if (times.length > 100) {
        times.shift();
      }
      
      // إذا كان الأداء بطيئاً، اطبع تحذير
      if (duration > 1000) {
        console.warn(`⚠️ Slow operation: ${label} took ${duration.toFixed(2)}ms`);
      }
    };
  }
  
  static getStats(label: string) {
    const times = this.metrics.get(label);
    if (!times || times.length === 0) return null;
    
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    
    return { avg, min, max, count: times.length };
  }
  
  static getAllStats() {
    const stats: Record<string, any> = {};
    this.metrics.forEach((times, label) => {
      stats[label] = this.getStats(label);
    });
    return stats;
  }
}

// Hook مخصص للاستدعاءات المحسنة
export function useOptimizedQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  options: {
    enabled?: boolean;
    refetchInterval?: number;
    cacheTime?: number;
  } = {}
) {
  const { enabled = true, refetchInterval, cacheTime = 5 * 60 * 1000 } = options;
  
  // يمكن تنفيذها مع React Query أو SWR
  // هذا مجرد مثال للهيكل
  
  const fetchData = async () => {
    if (!enabled) return null;
    
    const stopTimer = PerformanceMonitor.startTimer(`query:${key}`);
    
    try {
      const result = await queryFn();
      stopTimer();
      return result;
    } catch (error) {
      stopTimer();
      throw error;
    }
  };
  
  return { data: null, isLoading: false, error: null }; // placeholder
}

export default {
  apiCache,
  optimizedApiCall,
  SupabaseOptimizer,
  PerformanceMonitor,
  debounce,
  throttle,
  useOptimizedQuery
};