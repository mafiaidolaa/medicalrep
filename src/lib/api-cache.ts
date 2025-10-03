import { NextRequest, NextResponse } from 'next/server';

// In-memory cache for API responses
const cache = new Map<string, { 
  data: any; 
  timestamp: number; 
  maxAge: number; 
}>();

const DEFAULT_CACHE_TIME = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100; // Maximum number of cached entries

// Cache configuration for different endpoints
const cacheConfig: Record<string, number> = {
  '/api/users': 10 * 60 * 1000,       // 10 minutes
  '/api/clinics': 15 * 60 * 1000,     // 15 minutes
  '/api/products': 30 * 60 * 1000,    // 30 minutes
  '/api/orders': 2 * 60 * 1000,       // 2 minutes
  '/api/visits': 5 * 60 * 1000,       // 5 minutes
  '/api/collections': 5 * 60 * 1000,  // 5 minutes
  '/api/expenses': 10 * 60 * 1000,    // 10 minutes
  '/api/activity-log': 1 * 60 * 1000, // 1 minute
  '/api/notifications': 2 * 60 * 1000, // 2 minutes
};

// Get cache key from request
function getCacheKey(request: NextRequest): string {
  const url = new URL(request.url);
  const params = new URLSearchParams(url.search);
  const sortedParams = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  
  return `${request.method}:${url.pathname}${sortedParams ? `?${sortedParams}` : ''}`;
}

// Clean up expired entries and maintain size limit
function cleanCache() {
  const now = Date.now();
  const entries = Array.from(cache.entries());
  
  // Remove expired entries
  for (const [key, entry] of entries) {
    if (now - entry.timestamp > entry.maxAge) {
      cache.delete(key);
    }
  }
  
  // If still too large, remove oldest entries
  if (cache.size > MAX_CACHE_SIZE) {
    const sortedEntries = Array.from(cache.entries())
      .sort(([,a], [,b]) => a.timestamp - b.timestamp);
    
    const toRemove = sortedEntries.slice(0, cache.size - MAX_CACHE_SIZE + 10);
    toRemove.forEach(([key]) => cache.delete(key));
  }
}

// Check if request is cacheable
function isCacheable(request: NextRequest): boolean {
  // Only cache GET requests
  if (request.method !== 'GET') return false;
  
  // Don't cache authenticated user-specific data
  const url = new URL(request.url);
  if (url.searchParams.has('user_id')) return false;
  
  // Don't cache real-time data
  const pathname = url.pathname;
  if (pathname.includes('/realtime') || pathname.includes('/live')) return false;
  
  return true;
}

// Get cache duration for endpoint
function getCacheDuration(pathname: string): number {
  for (const [path, duration] of Object.entries(cacheConfig)) {
    if (pathname.startsWith(path)) {
      return duration;
    }
  }
  return DEFAULT_CACHE_TIME;
}

// Cache middleware wrapper
export function withCache(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Skip caching for non-cacheable requests
    if (!isCacheable(request)) {
      return handler(request);
    }
    
    const cacheKey = getCacheKey(request);
    const now = Date.now();
    const cached = cache.get(cacheKey);
    
    // Return cached response if valid
    if (cached && (now - cached.timestamp) < cached.maxAge) {
      const response = NextResponse.json(cached.data);
      response.headers.set('X-Cache', 'HIT');
      response.headers.set('Cache-Control', `public, max-age=${Math.floor((cached.maxAge - (now - cached.timestamp)) / 1000)}`);
      return response;
    }
    
    // Execute handler
    try {
      const response = await handler(request);
      
      // Cache successful responses
      if (response.ok && response.status === 200) {
        const data = await response.clone().json();
        const maxAge = getCacheDuration(new URL(request.url).pathname);
        
        cache.set(cacheKey, {
          data,
          timestamp: now,
          maxAge
        });
        
        // Clean cache periodically
        if (cache.size > MAX_CACHE_SIZE * 0.8) {
          cleanCache();
        }
        
        // Add cache headers
        response.headers.set('X-Cache', 'MISS');
        response.headers.set('Cache-Control', `public, max-age=${Math.floor(maxAge / 1000)}`);
      }
      
      return response;
    } catch (error) {
      // Don't cache errors
      return handler(request);
    }
  };
}

// Manual cache invalidation
export function invalidateCache(pattern?: string) {
  if (!pattern) {
    cache.clear();
    return;
  }
  
  const regex = new RegExp(pattern);
  const keysToDelete = Array.from(cache.keys()).filter(key => regex.test(key));
  keysToDelete.forEach(key => cache.delete(key));
}

// Get cache statistics
export function getCacheStats() {
  const now = Date.now();
  const entries = Array.from(cache.values());
  const validEntries = entries.filter(entry => (now - entry.timestamp) < entry.maxAge);
  
  return {
    total: cache.size,
    valid: validEntries.length,
    expired: cache.size - validEntries.length,
    memoryUsage: JSON.stringify([...cache.entries()]).length,
  };
}

// Preload cache with initial data
export async function preloadCache(endpoints: string[]) {
  const promises = endpoints.map(async (endpoint) => {
    try {
      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        const maxAge = getCacheDuration(endpoint);
        cache.set(`GET:${endpoint}`, {
          data,
          timestamp: Date.now(),
          maxAge
        });
      }
    } catch (error) {
      console.warn(`Failed to preload cache for ${endpoint}:`, error);
    }
  });
  
  await Promise.allSettled(promises);
}