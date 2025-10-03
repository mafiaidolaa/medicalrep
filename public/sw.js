// Service Worker for EP Group Expenses System PWA
const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `ep-expenses-${CACHE_VERSION}`;
const OFFLINE_PAGE = '/offline';
const DATABASE_NAME = 'EPGroupPWA';

// Define what to cache
const STATIC_CACHE_URLS = [
  '/',
  '/offline',
  '/login',
  
  // العيادات
  '/clinics',
  '/clinics/register',
  '/visits',
  '/visits/new',
  
  // المحاسبة
  '/accounting',
  '/accounts',
  '/accounts/expenses',
  '/accounts/expenses/new',
  '/accounts/expenses/reports',
  '/accounts/invoices',
  '/accounts/payments',
  '/accounts/receivables',
  
  // المستخدمين
  '/users',
  '/users/new',
  '/users/profile',
  
  // المخزون
  '/stock',
  
  // الطلبات
  '/orders',
  
  // الخطط
  '/plans',
  '/plans/new-task',
  
  // التقارير
  '/reports',
  '/reports/user-profile',
  
  // الإعدادات
  '/settings',
  
  // الإشعارات
  '/notifications',
  
  // الملفات الثابتة
  '/manifest.json',
  '/_next/static/css/',
  '/_next/static/js/',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Define API routes for network-first strategy
const API_ROUTES = [
  '/api/auth',
  '/api/expenses',
  '/api/notifications',
  '/api/reports',
  '/supabase'
];

// Define routes that should always be fresh
const NETWORK_ONLY_ROUTES = [
  '/api/auth/callback',
  '/api/payments',
  '/api/upload'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_CACHE_URLS);
    }).then(() => {
      // Force immediate activation
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName.startsWith('ep-expenses-') && cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Claim all clients
      self.clients.claim()
    ])
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }
  
  // Handle different types of requests
  if (isNetworkOnlyRoute(url.pathname)) {
    event.respondWith(networkOnly(request));
  } else if (isAPIRoute(url.pathname)) {
    event.respondWith(networkFirstWithFallback(request));
  } else if (isStaticAsset(request)) {
    event.respondWith(cacheFirstWithNetworkFallback(request));
  } else {
    event.respondWith(staleWhileRevalidate(request));
  }
});

// Background Sync event - handle offline data sync
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(syncOfflineData());
  } else if (event.tag === 'sync_offline_data') {
    event.waitUntil(syncOfflineData());
  } else if (event.tag === 'update_cache') {
    event.waitUntil(updateCache());
  } else if (event.tag === 'fetch_updates') {
    event.waitUntil(fetchUpdates());
  } else if (event.tag === 'send_analytics') {
    event.waitUntil(sendAnalytics());
  }
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received:', event);
  
  if (!event.data) {
    return;
  }
  
  const data = event.data.json();

  // Silent sync/update: don't show notification, just inform clients
  if (data?.silent || data?.kind === 'update') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => client.postMessage({ type: 'NOTIFICATIONS_SYNC', data }));
      })
    );
    return;
  }

  const options = {
    body: data.body || 'إشعار جديد من نظام المصروفات',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    image: data.image,
    dir: 'rtl',
    lang: 'ar',
    vibrate: [200, 100, 200],
    actions: [
      {
        action: 'view',
        title: 'عرض',
        icon: '/icons/view-action.png'
      },
      {
        action: 'close',
        title: 'إغلاق',
        icon: '/icons/close-action.png'
      }
    ],
    data: {
      url: data.url || '/',
      id: data.id,
      type: data.type
    },
    tag: data.tag || 'default',
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false,
    timestamp: Date.now()
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'نظام المصروفات', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  
  event.notification.close();
  
  const { action, data } = event;
  const url = data?.url || '/';
  
  if (action === 'view' || !action) {
    // Open the app
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.navigate(url);
            return;
          }
        }
        
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
    );
  } else if (action === 'close') {
    // Just close the notification (already done above)
    return;
  }
  
  // Track notification interaction
  trackNotificationInteraction(data?.id, action);
});

// Message event - handle messages from main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  const { type, data } = event.data;
  
  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  } else if (type === 'CLEAR_CACHE') {
    clearCache().then(() => {
      event.ports[0].postMessage({ success: true });
    });
  } else if (type === 'SYNC_OFFLINE_DATA') {
    syncOfflineData().then(() => {
      event.ports[0].postMessage({ success: true });
    });
  } else if (type === 'UPDATE_SETTINGS') {
    updatePWASettings(data);
  }
});

// Caching Strategies Implementation

// Network-first strategy for API routes
async function networkFirstWithFallback(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', error);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline fallback for HTML pages
    if (request.headers.get('accept')?.includes('text/html')) {
      return caches.match(OFFLINE_PAGE);
    }
    
    throw error;
  }
}

// Cache-first strategy for static assets
async function cacheFirstWithNetworkFallback(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Update cache in background
    updateCacheInBackground(request);
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Failed to fetch asset:', error);
    throw error;
  }
}

// Stale-while-revalidate strategy for general content
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);
  
  // Always try to update cache in background
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      const cache = caches.open(CACHE_NAME);
      cache.then(c => c.put(request, networkResponse.clone()));
    }
    return networkResponse;
  }).catch((error) => {
    console.log('[SW] Background fetch failed:', error);
  });
  
  // Return cached version immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Otherwise wait for network
  try {
    return await fetchPromise;
  } catch (error) {
    // Fallback to offline page for HTML requests
    if (request.headers.get('accept')?.includes('text/html')) {
      return caches.match(OFFLINE_PAGE);
    }
    throw error;
  }
}

// Network-only strategy for sensitive routes
async function networkOnly(request) {
  return fetch(request);
}

// Background cache update
async function updateCacheInBackground(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, networkResponse);
    }
  } catch (error) {
    console.log('[SW] Background cache update failed:', error);
  }
}

// Route classification helpers
function isAPIRoute(pathname) {
  return API_ROUTES.some(route => pathname.startsWith(route));
}

function isNetworkOnlyRoute(pathname) {
  return NETWORK_ONLY_ROUTES.some(route => pathname.startsWith(route));
}

function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|woff2?|ttf|ico)$/) ||
         url.pathname.startsWith('/_next/static/');
}

// Background sync operations
async function syncOfflineData() {
  console.log('[SW] Starting offline data sync...');
  
  try {
    const db = await openDatabase();
    const offlineData = await getAllOfflineData(db);
    
    if (offlineData.length === 0) {
      console.log('[SW] No offline data to sync');
      return;
    }
    
    console.log(`[SW] Syncing ${offlineData.length} offline items`);
    
    for (const item of offlineData) {
      try {
        await syncSingleOfflineItem(item);
        await removeOfflineData(db, item.id);
      } catch (error) {
        console.error('[SW] Failed to sync item:', error);
        await updateOfflineDataRetry(db, item.id, error.message);
      }
    }
    
    console.log('[SW] Offline data sync completed');
    
    // Notify all clients about sync completion
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'OFFLINE_SYNC_COMPLETED',
        data: { syncedCount: offlineData.length }
      });
    });
  } catch (error) {
    console.error('[SW] Offline sync failed:', error);
  }
}

async function syncSingleOfflineItem(item) {
  const { type, data } = item;
  
  switch (type) {
    case 'expense_request':
      return await syncExpenseRequest(data);
    case 'expense_item':
      return await syncExpenseItem(data);
    case 'form_data':
      return await syncFormData(data);
    case 'attachment':
      return await syncAttachment(data);
    default:
      throw new Error(`Unknown sync type: ${type}`);
  }
}

async function syncExpenseRequest(data) {
  const response = await fetch('/api/expenses/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

async function syncExpenseItem(data) {
  const response = await fetch('/api/expenses/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

async function syncFormData(data) {
  const response = await fetch(`/api/${data.table}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data.record)
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

async function syncAttachment(data) {
  const formData = new FormData();
  formData.append('file', data.file);
  formData.append('bucket', data.bucket);
  formData.append('path', data.path);
  
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

// Cache management
async function updateCache() {
  console.log('[SW] Updating cache...');
  
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(STATIC_CACHE_URLS);
    console.log('[SW] Cache updated successfully');
  } catch (error) {
    console.error('[SW] Cache update failed:', error);
  }
}

async function clearCache() {
  console.log('[SW] Clearing cache...');
  
  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
    console.log('[SW] Cache cleared successfully');
  } catch (error) {
    console.error('[SW] Cache clear failed:', error);
  }
}

// Fetch updates
async function fetchUpdates() {
  console.log('[SW] Fetching updates...');
  
  try {
    // Fetch critical updates
    const updates = await fetch('/api/updates/check');
    if (updates.ok) {
      const data = await updates.json();
      
      // Notify clients about updates
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'UPDATES_AVAILABLE',
          data: data
        });
      });
    }
  } catch (error) {
    console.error('[SW] Fetch updates failed:', error);
  }
}

// Send analytics
async function sendAnalytics() {
  console.log('[SW] Sending analytics...');
  
  try {
    const db = await openDatabase();
    const analytics = await getAllAnalytics(db);
    
    if (analytics.length > 0) {
      const response = await fetch('/api/analytics/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: analytics })
      });
      
      if (response.ok) {
        await clearAnalytics(db);
        console.log('[SW] Analytics sent successfully');
      }
    }
  } catch (error) {
    console.error('[SW] Send analytics failed:', error);
  }
}

// IndexedDB operations
async function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Offline data store
      if (!db.objectStoreNames.contains('offline_data')) {
        db.createObjectStore('offline_data', { keyPath: 'id' });
      }
      
      // Background tasks store
      if (!db.objectStoreNames.contains('background_tasks')) {
        db.createObjectStore('background_tasks', { keyPath: 'id' });
      }
      
      // Analytics store
      if (!db.objectStoreNames.contains('analytics')) {
        db.createObjectStore('analytics', { keyPath: 'id' });
      }
      
      // Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
  });
}

async function getAllOfflineData(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['offline_data'], 'readonly');
    const store = transaction.objectStore('offline_data');
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function removeOfflineData(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['offline_data'], 'readwrite');
    const store = transaction.objectStore('offline_data');
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function updateOfflineDataRetry(db, id, error) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['offline_data'], 'readwrite');
    const store = transaction.objectStore('offline_data');
    const getRequest = store.get(id);
    
    getRequest.onsuccess = () => {
      const item = getRequest.result;
      if (item) {
        item.retry_count = (item.retry_count || 0) + 1;
        item.last_error = error;
        item.last_retry = new Date().toISOString();
        
        const putRequest = store.put(item);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        resolve();
      }
    };
    
    getRequest.onerror = () => reject(getRequest.error);
  });
}

async function getAllAnalytics(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['analytics'], 'readonly');
    const store = transaction.objectStore('analytics');
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function clearAnalytics(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['analytics'], 'readwrite');
    const store = transaction.objectStore('analytics');
    const request = store.clear();
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Notification tracking
async function trackNotificationInteraction(notificationId, action) {
  try {
    await fetch('/api/notifications/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notification_id: notificationId,
        action: action,
        timestamp: new Date().toISOString()
      })
    });
  } catch (error) {
    console.error('[SW] Failed to track notification interaction:', error);
  }
}

// PWA settings update
function updatePWASettings(settings) {
  // Update service worker behavior based on settings
  if (settings.cache_strategy) {
    // Implementation would depend on how you want to handle dynamic strategy changes
    console.log('[SW] Cache strategy updated to:', settings.cache_strategy);
  }
  
  if (settings.cache_max_age_hours) {
    // Update cache expiration logic
    console.log('[SW] Cache max age updated to:', settings.cache_max_age_hours, 'hours');
  }
}

console.log('[SW] Service Worker loaded successfully');