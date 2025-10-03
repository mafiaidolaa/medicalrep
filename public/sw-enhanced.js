// Service Worker محسن للأداء العالي - EP Group System v2.0
const CACHE_VERSION = 'v2.0.0';
const CACHE_NAME = `ep-group-enhanced-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;
const IMAGE_CACHE = `images-${CACHE_VERSION}`;
const OFFLINE_PAGE = '/offline.html';
const DATABASE_NAME = 'EPGroupEnhanced';

// الموارد الأساسية للتخزين المؤقت المحسن
const CORE_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/clinics',
  '/visits', 
  '/orders',
  '/accounting',
  '/reports',
  '/plans',
  '/stock',
  '/settings',
  '/notifications'
];

// أنماط URL للتخزين المؤقت المحسن
const ENHANCED_CACHE_PATTERNS = {
  // الملفات الثابتة
  static: /\/_next\/static\/.+\.(js|css|woff2|woff|ttf)$/,
  
  // الصور والأيقونات
  images: /\.(jpg|jpeg|png|gif|webp|svg|ico|avif)$/,
  
  // API calls
  api: /\/api\//,
  
  // صفحات التطبيق
  pages: /\/(clinics|visits|orders|accounting|reports|plans|stock|settings|users|activity-log|notifications)/,
  
  // ملفات JSON والبيانات
  data: /\.(json)$/,
  
  // الخطوط
  fonts: /\.(woff2|woff|ttf|eot)$/
};

// استراتيجيات التخزين المؤقت المحسنة
const CACHE_STRATEGIES = {
  static: {
    strategy: 'CacheFirst',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 يوم
    maxEntries: 100
  },
  images: {
    strategy: 'CacheFirst',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 أيام
    maxEntries: 150
  },
  api: {
    strategy: 'NetworkFirst',
    maxAge: 5 * 60 * 1000, // 5 دقائق
    maxEntries: 75,
    networkTimeout: 5000
  },
  pages: {
    strategy: 'StaleWhileRevalidate',
    maxAge: 30 * 60 * 1000, // 30 دقيقة
    maxEntries: 50
  },
  data: {
    strategy: 'NetworkFirst',
    maxAge: 10 * 60 * 1000, // 10 دقائق
    maxEntries: 25
  },
  fonts: {
    strategy: 'CacheFirst',
    maxAge: 365 * 24 * 60 * 60 * 1000, // سنة كاملة
    maxEntries: 20
  }
};

// قائمة الـ API routes الحساسة التي تحتاج Network Only
const NETWORK_ONLY_ROUTES = [
  '/api/auth/callback',
  '/api/payments',
  '/api/upload',
  '/api/sync',
  '/api/logs'
];

// Install Event - تحسين التثبيت
self.addEventListener('install', (event) => {
  console.log(`[SW Enhanced] Installing version ${CACHE_VERSION}...`);
  
  event.waitUntil(
    (async () => {
      try {
        // تخزين الموارد الأساسية
        const cache = await caches.open(CACHE_NAME);
        console.log('[SW Enhanced] Caching core assets');
        
        // تخزين متوازي للسرعة
        await Promise.all([
          cache.addAll(CORE_ASSETS.slice(0, 5)),
          cache.addAll(CORE_ASSETS.slice(5))
        ]);
        
        // تفعيل فوري
        await self.skipWaiting();
        
        console.log('[SW Enhanced] Installation completed successfully');
      } catch (error) {
        console.error('[SW Enhanced] Installation failed:', error);
        // محاولة تخزين الموارد الأساسية فقط في حالة الفشل
        try {
          const cache = await caches.open(CACHE_NAME);
          await cache.add('/');
          await cache.add('/offline.html');
        } catch (fallbackError) {
          console.error('[SW Enhanced] Fallback installation failed:', fallbackError);
        }
      }
    })()
  );
});

// Activate Event - تحسين التفعيل
self.addEventListener('activate', (event) => {
  console.log(`[SW Enhanced] Activating version ${CACHE_VERSION}...`);
  
  event.waitUntil(
    (async () => {
      try {
        // تنظيف الكاش القديم بذكاء
        const cacheNames = await caches.keys();
        const validCaches = [CACHE_NAME, RUNTIME_CACHE, API_CACHE, IMAGE_CACHE];
        
        const deletionPromises = cacheNames
          .filter(name => {
            const isEPGroupCache = name.startsWith('ep-group-') || name.startsWith('ep-expenses-');
            const isValidCache = validCaches.includes(name);
            return isEPGroupCache && !isValidCache;
          })
          .map(async (name) => {
            console.log('[SW Enhanced] Deleting old cache:', name);
            return caches.delete(name);
          });
        
        await Promise.all(deletionPromises);
        
        // السيطرة على العملاء
        await self.clients.claim();
        
        // تحسين الكاش الموجود
        await optimizeExistingCaches();
        
        console.log('[SW Enhanced] Activation completed successfully');
      } catch (error) {
        console.error('[SW Enhanced] Activation failed:', error);
      }
    })()
  );
});

// Fetch Event - معالج محسن للطلبات
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // تجاهل الطلبات غير HTTP/HTTPS
  if (!request.url.startsWith('http')) return;
  
  // تجاهل extensions
  if (url.protocol === 'chrome-extension:' || url.protocol === 'moz-extension:') return;
  
  // معالجة الطلبات المختلفة
  event.respondWith(handleEnhancedRequest(request));
});

// معالج الطلبات المحسن
async function handleEnhancedRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  try {
    // تسجيل نشاط الطلب
    logRequestActivity(request);
    
    // الطلبات الحساسة - Network Only
    if (isNetworkOnlyRoute(pathname) || request.method !== 'GET') {
      return await handleNetworkOnly(request);
    }
    
    // الملفات الثابتة - Cache First Enhanced
    if (ENHANCED_CACHE_PATTERNS.static.test(pathname)) {
      return await enhancedCacheFirst(request, CACHE_NAME, CACHE_STRATEGIES.static);
    }
    
    // الخطوط - Cache First مع TTL طويل
    if (ENHANCED_CACHE_PATTERNS.fonts.test(pathname)) {
      return await enhancedCacheFirst(request, CACHE_NAME, CACHE_STRATEGIES.fonts);
    }
    
    // الصور - Cache First مع Image Optimization
    if (ENHANCED_CACHE_PATTERNS.images.test(pathname)) {
      return await enhancedImageCache(request);
    }
    
    // API calls - Network First Enhanced
    if (ENHANCED_CACHE_PATTERNS.api.test(pathname)) {
      return await enhancedNetworkFirst(request, API_CACHE, CACHE_STRATEGIES.api);
    }
    
    // البيانات - Network First مع Cache قصير
    if (ENHANCED_CACHE_PATTERNS.data.test(pathname)) {
      return await enhancedNetworkFirst(request, API_CACHE, CACHE_STRATEGIES.data);
    }
    
    // صفحات التطبيق - Stale While Revalidate Enhanced
    if (ENHANCED_CACHE_PATTERNS.pages.test(pathname) || pathname === '/') {
      return await enhancedStaleWhileRevalidate(request, RUNTIME_CACHE, CACHE_STRATEGIES.pages);
    }
    
    // الطلبات الأخرى - Network First مع Fallback
    return await enhancedNetworkFirst(request, RUNTIME_CACHE, CACHE_STRATEGIES.pages);
    
  } catch (error) {
    console.error('[SW Enhanced] Request handling failed:', error);
    return await handleOfflineEnhanced(request);
  }
}

// Enhanced Cache First Strategy
async function enhancedCacheFirst(request, cacheName, strategy) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // فحص صلاحية الكاش
  if (cachedResponse && !isCacheExpired(cachedResponse, strategy.maxAge)) {
    // تحديث في الخلفية إذا اقترب من انتهاء الصلاحية
    if (shouldUpdateInBackground(cachedResponse, strategy.maxAge)) {
      updateCacheInBackground(request, cacheName);
    }
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // تحديث الكاش مع تحسين الأداء
      const responseClone = networkResponse.clone();
      cache.put(request, responseClone).catch(console.warn);
      
      // تنظيف الكاش إذا تجاوز الحد الأقصى
      maintainCacheSize(cache, strategy.maxEntries);
    }
    
    return networkResponse;
  } catch (error) {
    // إرجاع الكاش المنتهي الصلاحية كبديل
    if (cachedResponse) {
      console.warn('[SW Enhanced] Serving stale cache due to network error');
      return addStaleHeader(cachedResponse);
    }
    throw error;
  }
}

// Enhanced Network First Strategy
async function enhancedNetworkFirst(request, cacheName, strategy) {
  const cache = await caches.open(cacheName);
  
  try {
    // محاولة الشبكة مع timeout
    const networkResponse = await Promise.race([
      fetch(request.clone()),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Network timeout')), strategy.networkTimeout || 3000)
      )
    ]);
    
    if (networkResponse.ok) {
      // تحديث الكاش
      const responseClone = networkResponse.clone();
      cache.put(request, responseClone).catch(console.warn);
      
      // تنظيف الكاش
      maintainCacheSize(cache, strategy.maxEntries);
      
      return networkResponse;
    }
  } catch (error) {
    console.warn('[SW Enhanced] Network failed, trying cache:', error.message);
  }
  
  // البحث في الكاش
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return addCacheHeader(cachedResponse);
  }
  
  throw new Error('Both network and cache failed');
}

// Enhanced Stale While Revalidate Strategy
async function enhancedStaleWhileRevalidate(request, cacheName, strategy) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // تحديث في الخلفية دائماً
  const fetchPromise = fetch(request.clone())
    .then(async (response) => {
      if (response.ok) {
        const responseClone = response.clone();
        await cache.put(request, responseClone);
        maintainCacheSize(cache, strategy.maxEntries);
        
        // إشعار العملاء بالتحديث
        notifyClientsOfUpdate(request.url);
      }
      return response;
    })
    .catch((error) => {
      console.warn('[SW Enhanced] Background update failed:', error.message);
    });
  
  // إرجاع الكاش فوراً إن وجد
  if (cachedResponse && !isCacheExpired(cachedResponse, strategy.maxAge)) {
    return cachedResponse;
  }
  
  // انتظار الشبكة إذا لم يكن هناك كاش صالح
  try {
    return await fetchPromise;
  } catch (error) {
    if (cachedResponse) {
      return addStaleHeader(cachedResponse);
    }
    throw error;
  }
}

// Enhanced Image Caching
async function enhancedImageCache(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // تحسين ضغط الصور إذا أمكن
      const optimizedResponse = await optimizeImageResponse(networkResponse);
      cache.put(request, optimizedResponse.clone()).catch(console.warn);
      
      maintainCacheSize(cache, CACHE_STRATEGIES.images.maxEntries);
      return optimizedResponse;
    }
    
    return networkResponse;
  } catch (error) {
    // إرجاع صورة placeholder
    return createPlaceholderImageResponse();
  }
}

// Network Only للطلبات الحساسة
async function handleNetworkOnly(request) {
  try {
    const response = await fetch(request);
    
    // تسجيل العمليات المهمة
    if (request.method !== 'GET') {
      logImportantOperation(request, response);
    }
    
    return response;
  } catch (error) {
    // إرجاع استجابة خطأ مناسبة
    if (request.headers.get('accept')?.includes('application/json')) {
      return new Response(
        JSON.stringify({ 
          error: 'network_error', 
          message: 'فشل في الاتصال بالخادم',
          offline: true 
        }),
        { 
          status: 503, 
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    throw error;
  }
}

// معالجة حالة عدم الاتصال المحسنة
async function handleOfflineEnhanced(request) {
  const url = new URL(request.url);
  
  // للصفحات - محاولة العثور على صفحة مشابهة
  if (request.mode === 'navigate') {
    const cache = await caches.open(RUNTIME_CACHE);
    
    // البحث عن الصفحة المطلوبة
    const cachedPage = await cache.match(request);
    if (cachedPage) return cachedPage;
    
    // البحث عن صفحات مشابهة
    const similarPage = await findSimilarCachedPage(cache, url.pathname);
    if (similarPage) return similarPage;
    
    // صفحة عدم الاتصال
    const offlinePage = await cache.match(OFFLINE_PAGE);
    if (offlinePage) return offlinePage;
  }
  
  // للصور
  if (ENHANCED_CACHE_PATTERNS.images.test(url.pathname)) {
    return createPlaceholderImageResponse();
  }
  
  // للAPI
  if (ENHANCED_CACHE_PATTERNS.api.test(url.pathname)) {
    return new Response(
      JSON.stringify({ 
        error: 'offline', 
        message: 'التطبيق غير متصل بالإنترنت',
        cached: false 
      }),
      { 
        status: 503, 
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  return new Response('غير متاح بدون اتصال إنترنت', { 
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}

// Helper Functions

// فحص انتهاء صلاحية الكاش
function isCacheExpired(response, maxAge) {
  const dateHeader = response.headers.get('sw-cached-at') || response.headers.get('date');
  if (!dateHeader) return false;
  
  const cacheTime = new Date(dateHeader).getTime();
  const now = Date.now();
  
  return (now - cacheTime) > maxAge;
}

// فحص الحاجة لتحديث في الخلفية
function shouldUpdateInBackground(response, maxAge) {
  const dateHeader = response.headers.get('sw-cached-at') || response.headers.get('date');
  if (!dateHeader) return true;
  
  const cacheTime = new Date(dateHeader).getTime();
  const now = Date.now();
  const age = now - cacheTime;
  
  // تحديث إذا تم استخدام 70% من وقت الصلاحية
  return age > (maxAge * 0.7);
}

// تحديث الكاش في الخلفية
async function updateCacheInBackground(request, cacheName) {
  try {
    const response = await fetch(request.clone());
    if (response.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(request, response);
    }
  } catch (error) {
    console.warn('[SW Enhanced] Background update failed:', error.message);
  }
}

// الحفاظ على حجم الكاش
async function maintainCacheSize(cache, maxEntries) {
  try {
    const keys = await cache.keys();
    if (keys.length <= maxEntries) return;
    
    // حذف الأقدم
    const entriesToDelete = keys.length - maxEntries;
    const keysToDelete = keys.slice(0, entriesToDelete);
    
    await Promise.all(keysToDelete.map(key => cache.delete(key)));
  } catch (error) {
    console.warn('[SW Enhanced] Cache maintenance failed:', error.message);
  }
}

// إضافة headers للاستجابة
function addStaleHeader(response) {
  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: new Headers(response.headers)
  });
  newResponse.headers.set('SW-Cache-Status', 'stale');
  return newResponse;
}

function addCacheHeader(response) {
  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: new Headers(response.headers)
  });
  newResponse.headers.set('SW-Cache-Status', 'hit');
  return newResponse;
}

// تحسين الصور
async function optimizeImageResponse(response) {
  // في المستقبل يمكن إضافة ضغط الصور هنا
  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: new Headers(response.headers)
  });
  newResponse.headers.set('SW-Cached-At', new Date().toISOString());
  return newResponse;
}

// إنشاء صورة placeholder
function createPlaceholderImageResponse() {
  const svg = `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg" style="background:#f5f5f5">
    <rect width="100%" height="100%" fill="#e0e0e0"/>
    <text x="50%" y="50%" font-family="Arial" font-size="16" fill="#666" text-anchor="middle" dy=".3em">
      غير متاح بدون إنترنت
    </text>
  </svg>`;
  
  return new Response(svg, {
    headers: { 
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-cache'
    }
  });
}

// البحث عن صفحة مشابهة في الكاش
async function findSimilarCachedPage(cache, pathname) {
  const keys = await cache.keys();
  
  // البحث عن صفحات في نفس المجلد
  const pathSegments = pathname.split('/');
  const baseRoute = pathSegments.slice(0, 2).join('/');
  
  for (const key of keys) {
    const keyUrl = new URL(key.url);
    if (keyUrl.pathname.startsWith(baseRoute) && keyUrl.pathname !== pathname) {
      const response = await cache.match(key);
      if (response) return response;
    }
  }
  
  return null;
}

// تحسين الكاش الموجود
async function optimizeExistingCaches() {
  try {
    const cacheNames = [CACHE_NAME, RUNTIME_CACHE, API_CACHE, IMAGE_CACHE];
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      
      // إزالة الكاش المنتهي الصلاحية
      for (const key of keys) {
        const response = await cache.match(key);
        if (response && isCacheExpired(response, 24 * 60 * 60 * 1000)) { // يوم واحد
          await cache.delete(key);
        }
      }
    }
  } catch (error) {
    console.warn('[SW Enhanced] Cache optimization failed:', error.message);
  }
}

// تسجيل نشاط الطلبات
function logRequestActivity(request) {
  // يمكن إضافة تسجيل مفصل هنا
  if (request.url.includes('/api/')) {
    console.log(`[SW Enhanced] API Request: ${request.method} ${request.url}`);
  }
}

// تسجيل العمليات المهمة
function logImportantOperation(request, response) {
  const operation = {
    method: request.method,
    url: request.url,
    status: response.status,
    timestamp: Date.now()
  };
  
  // إرسال للعملاء
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'OPERATION_LOGGED',
        data: operation
      });
    });
  });
}

// إشعار العملاء بالتحديث
function notifyClientsOfUpdate(url) {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'CACHE_UPDATED',
        data: { url, timestamp: Date.now() }
      });
    });
  });
}

// Route classification helpers
function isNetworkOnlyRoute(pathname) {
  return NETWORK_ONLY_ROUTES.some(route => pathname.startsWith(route));
}

// Message handling محسن
self.addEventListener('message', (event) => {
  const { type, data } = event.data || {};
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0]?.postMessage({ version: CACHE_VERSION });
      break;
      
    case 'GET_CACHE_STATS':
      getCacheStats().then(stats => {
        event.ports[0]?.postMessage(stats);
      });
      break;
      
    case 'CLEAR_CACHE':
      clearSpecificCache(data?.cacheName).then(success => {
        event.ports[0]?.postMessage({ success });
      });
      break;
      
    case 'PREFETCH_ROUTES':
      prefetchRoutes(data?.routes || []).then(success => {
        event.ports[0]?.postMessage({ success });
      });
      break;
      
    case 'OPTIMIZE_CACHES':
      optimizeExistingCaches().then(() => {
        event.ports[0]?.postMessage({ success: true });
      });
      break;
  }
});

// Cache management functions
async function getCacheStats() {
  try {
    const cacheNames = await caches.keys();
    const stats = {};
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      stats[cacheName] = {
        count: keys.length,
        size: await calculateCacheSize(cache)
      };
    }
    
    return stats;
  } catch (error) {
    console.error('[SW Enhanced] Failed to get cache stats:', error);
    return {};
  }
}

async function calculateCacheSize(cache) {
  try {
    const keys = await cache.keys();
    let totalSize = 0;
    
    for (const key of keys.slice(0, 10)) { // عينة من الكاش
      const response = await cache.match(key);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
    
    return Math.round(totalSize * keys.length / 10); // تقدير
  } catch {
    return 0;
  }
}

async function clearSpecificCache(cacheName) {
  try {
    return await caches.delete(cacheName);
  } catch (error) {
    console.error('[SW Enhanced] Failed to clear cache:', error);
    return false;
  }
}

async function prefetchRoutes(routes) {
  try {
    const cache = await caches.open(RUNTIME_CACHE);
    const prefetchPromises = routes.map(async (route) => {
      try {
        const response = await fetch(route);
        if (response.ok) {
          await cache.put(route, response);
        }
      } catch (error) {
        console.warn(`[SW Enhanced] Failed to prefetch ${route}:`, error.message);
      }
    });
    
    await Promise.allSettled(prefetchPromises);
    return true;
  } catch (error) {
    console.error('[SW Enhanced] Prefetch failed:', error);
    return false;
  }
}

console.log(`[SW Enhanced] Service Worker v${CACHE_VERSION} loaded successfully`);