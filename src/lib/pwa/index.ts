// @ts-nocheck
import { supabase } from '../supabase';

// Types for PWA and mobile functionality
export interface PWASettings {
  id: string;
  enabled: boolean;
  offline_enabled: boolean;
  push_notifications_enabled: boolean;
  background_sync_enabled: boolean;
  auto_update_enabled: boolean;
  cache_strategy: 'network-first' | 'cache-first' | 'stale-while-revalidate' | 'network-only' | 'cache-only';
  cache_max_age_hours: number;
  offline_fallback_pages: string[];
  installable: boolean;
  app_shortcuts: AppShortcut[];
  created_at: string;
  updated_at: string;
}

export interface AppShortcut {
  name: string;
  short_name: string;
  description: string;
  url: string;
  icons: PWAIcon[];
}

export interface PWAIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: 'any' | 'maskable' | 'monochrome';
}

export interface PWAManifest {
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  display: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  orientation: 'any' | 'natural' | 'landscape' | 'portrait';
  theme_color: string;
  background_color: string;
  lang: string;
  dir: 'ltr' | 'rtl';
  scope: string;
  icons: PWAIcon[];
  shortcuts: AppShortcut[];
  screenshots: {
    src: string;
    sizes: string;
    type: string;
    platform?: 'wide' | 'narrow';
  }[];
  categories: string[];
  iarc_rating_id?: string;
}

export interface OfflineData {
  id: string;
  type: 'expense_request' | 'expense_item' | 'form_data' | 'attachment';
  data: any;
  sync_status: 'pending' | 'syncing' | 'synced' | 'failed';
  created_offline_at: string;
  last_sync_attempt?: string;
  sync_error?: string;
  retry_count: number;
  user_id: string;
}

export interface BackgroundSyncTask {
  id: string;
  type: 'sync_offline_data' | 'update_cache' | 'fetch_updates' | 'send_analytics';
  data?: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  scheduled_at: string;
  executed_at?: string;
  error_message?: string;
  retry_count: number;
  max_retries: number;
}

export interface DeviceInfo {
  id: string;
  user_id: string;
  device_type: 'mobile' | 'tablet' | 'desktop';
  platform: 'android' | 'ios' | 'windows' | 'macos' | 'linux' | 'unknown';
  browser: string;
  browser_version: string;
  screen_width: number;
  screen_height: number;
  is_pwa: boolean;
  is_offline_capable: boolean;
  supports_notifications: boolean;
  supports_background_sync: boolean;
  last_online: string;
  created_at: string;
  updated_at: string;
}

export interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

class PWAService {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private installPromptEvent: InstallPromptEvent | null = null;
  private isOnline: boolean = navigator.onLine;
  private offlineQueue: OfflineData[] = [];
  private syncInProgress: boolean = false;

  constructor() {
    this.initializeEventListeners();
  }

  // Initialize PWA
  async initialize(): Promise<boolean> {
    try {
      const settings = await this.getPWASettings();
      if (!settings?.enabled) return false;

      // Register service worker
      await this.registerServiceWorker();
      
      // Setup offline capabilities
      if (settings.offline_enabled) {
        await this.setupOfflineCapabilities();
      }
      
      // Setup background sync
      if (settings.background_sync_enabled) {
        await this.setupBackgroundSync();
      }
      
      // Setup push notifications
      if (settings.push_notifications_enabled) {
        await this.setupPushNotifications();
      }
      
      // Setup install prompt
      await this.setupInstallPrompt();
      
      // Register device info
      await this.registerDeviceInfo();
      
      return true;
    } catch (error) {
      console.error('PWA initialization failed:', error);
      return false;
    }
  }

  // Service Worker Management
  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported');
      return null;
    }

    try {
      this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('Service Worker registered:', this.swRegistration);

      // Handle updates
      this.swRegistration.addEventListener('updatefound', () => {
        this.handleServiceWorkerUpdate();
      });

      return this.swRegistration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }

  private handleServiceWorkerUpdate(): void {
    if (!this.swRegistration?.installing) return;

    const installingWorker = this.swRegistration.installing;
    
    installingWorker.addEventListener('statechange', () => {
      if (installingWorker.state === 'installed') {
        if (navigator.serviceWorker.controller) {
          // New update available
          this.showUpdateAvailableNotification();
        } else {
          // Content is cached for offline use
          this.showOfflineReadyNotification();
        }
      }
    });
  }

  private showUpdateAvailableNotification(): void {
    // Dispatch custom event for UI to handle
    const event = new CustomEvent('pwaUpdateAvailable');
    window.dispatchEvent(event);
  }

  private showOfflineReadyNotification(): void {
    const event = new CustomEvent('pwaOfflineReady');
    window.dispatchEvent(event);
  }

  async updateServiceWorker(): Promise<void> {
    if (!this.swRegistration?.waiting) return;

    // Tell the waiting service worker to skip waiting
    this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    
    // Reload the page to activate the new service worker
    window.location.reload();
  }

  // PWA Settings Management
  async getPWASettings(): Promise<PWASettings | null> {
    try {
      const { data, error } = await supabase
        .from('pwa_settings')
        .select('*')
        .single();

      if (error && error.code === 'PGRST116') {
        return await this.createDefaultPWASettings();
      }

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get PWA settings failed:', error);
      return null;
    }
  }

  async createDefaultPWASettings(): Promise<PWASettings | null> {
    try {
      const defaultSettings = {
        enabled: true,
        offline_enabled: true,
        push_notifications_enabled: true,
        background_sync_enabled: true,
        auto_update_enabled: true,
        cache_strategy: 'stale-while-revalidate' as const,
        cache_max_age_hours: 24,
        offline_fallback_pages: ['/offline', '/expenses/new'],
        installable: true,
        app_shortcuts: [
          {
            name: 'طلب مصروفات جديد',
            short_name: 'طلب جديد',
            description: 'إنشاء طلب مصروفات جديد بسرعة',
            url: '/expenses/new',
            icons: [{ src: '/icons/add-expense.png', sizes: '96x96', type: 'image/png' }]
          },
          {
            name: 'التقارير',
            short_name: 'تقارير',
            description: 'عرض تقارير المصروفات',
            url: '/accounts/expenses/reports',
            icons: [{ src: '/icons/reports.png', sizes: '96x96', type: 'image/png' }]
          }
        ]
      };

      const { data, error } = await supabase
        .from('pwa_settings')
        .insert(defaultSettings)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create default PWA settings failed:', error);
      return null;
    }
  }

  async updatePWASettings(updates: Partial<PWASettings>): Promise<PWASettings | null> {
    try {
      const { data, error } = await supabase
        .from('pwa_settings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .select()
        .single();

      if (error) throw error;
      
      // Reinitialize if needed
      if (updates.enabled !== undefined) {
        await this.initialize();
      }
      
      return data;
    } catch (error) {
      console.error('Update PWA settings failed:', error);
      return null;
    }
  }

  // App Installation
  private setupInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Save the event so it can be triggered later
      this.installPromptEvent = e as InstallPromptEvent;
      
      // Dispatch custom event for UI to show install button
      const event = new CustomEvent('pwaInstallAvailable');
      window.dispatchEvent(event);
    });

    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
      this.installPromptEvent = null;
      
      // Track installation
      this.trackInstallation();
      
      // Dispatch custom event
      const event = new CustomEvent('pwaInstalled');
      window.dispatchEvent(event);
    });
  }

  async promptInstall(): Promise<boolean> {
    if (!this.installPromptEvent) {
      return false;
    }

    try {
      // Show the install prompt
      await this.installPromptEvent.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await this.installPromptEvent.userChoice;
      
      console.log(`User ${outcome} the install prompt`);
      
      // Clear the saved prompt
      this.installPromptEvent = null;
      
      return outcome === 'accepted';
    } catch (error) {
      console.error('Install prompt failed:', error);
      return false;
    }
  }

  isInstallable(): boolean {
    return this.installPromptEvent !== null;
  }

  isInstalled(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone ||
           document.referrer.includes('android-app://');
  }

  private async trackInstallation(): Promise<void> {
    try {
      // Track installation event
      await supabase
        .from('app_installations')
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          platform: this.getPlatform(),
          device_type: this.getDeviceType(),
          installed_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Track installation failed:', error);
    }
  }

  // Offline Capabilities
  private async setupOfflineCapabilities(): Promise<void> {
    // Load offline data from IndexedDB
    await this.loadOfflineQueue();
    
    // Setup online/offline event listeners
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.dispatchConnectionEvent('online');
      this.syncOfflineData();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.dispatchConnectionEvent('offline');
    });
  }

  private dispatchConnectionEvent(type: 'online' | 'offline'): void {
    const event = new CustomEvent('connectionChange', {
      detail: { isOnline: type === 'online' }
    });
    window.dispatchEvent(event);
  }

  async saveOfflineData(type: OfflineData['type'], data: any, userId: string): Promise<string> {
    const offlineData: Omit<OfflineData, 'id'> = {
      type,
      data,
      sync_status: 'pending',
      created_offline_at: new Date().toISOString(),
      retry_count: 0,
      user_id: userId
    };

    // Save to IndexedDB
    const id = await this.saveToIndexedDB('offline_data', offlineData);
    
    // Add to queue
    this.offlineQueue.push({ id, ...offlineData });
    
    // Try to sync if online
    if (this.isOnline) {
      setTimeout(() => this.syncOfflineData(), 1000);
    }
    
    return id;
  }

  private async loadOfflineQueue(): Promise<void> {
    try {
      this.offlineQueue = await this.getAllFromIndexedDB('offline_data');
    } catch (error) {
      console.error('Load offline queue failed:', error);
      this.offlineQueue = [];
    }
  }

  private async syncOfflineData(): Promise<void> {
    if (this.syncInProgress || !this.isOnline || this.offlineQueue.length === 0) {
      return;
    }

    this.syncInProgress = true;
    console.log(`Syncing ${this.offlineQueue.length} offline items...`);

    const pendingItems = this.offlineQueue.filter(item => item.sync_status === 'pending');
    
    for (const item of pendingItems) {
      try {
        await this.syncSingleItem(item);
      } catch (error) {
        console.error(`Sync failed for item ${item.id}:`, error);
        
        // Update retry count and status
        item.retry_count++;
        item.sync_status = 'failed';
        item.sync_error = error instanceof Error ? error.message : 'Unknown error';
        item.last_sync_attempt = new Date().toISOString();
        
        // Save updated item
        await this.updateInIndexedDB('offline_data', item);
      }
    }

    // Remove successfully synced items
    this.offlineQueue = this.offlineQueue.filter(item => item.sync_status !== 'synced');
    
    this.syncInProgress = false;
    
    // Dispatch sync completion event
    const event = new CustomEvent('offlineSyncCompleted', {
      detail: { 
        totalItems: pendingItems.length,
        syncedItems: pendingItems.filter(item => item.sync_status === 'synced').length
      }
    });
    window.dispatchEvent(event);
  }

  private async syncSingleItem(item: OfflineData): Promise<void> {
    item.sync_status = 'syncing';
    item.last_sync_attempt = new Date().toISOString();
    
    switch (item.type) {
      case 'expense_request':
        await this.syncExpenseRequest(item);
        break;
      case 'expense_item':
        await this.syncExpenseItem(item);
        break;
      case 'form_data':
        await this.syncFormData(item);
        break;
      case 'attachment':
        await this.syncAttachment(item);
        break;
      default:
        throw new Error(`Unknown sync type: ${item.type}`);
    }
    
    item.sync_status = 'synced';
    await this.updateInIndexedDB('offline_data', item);
    await this.removeFromIndexedDB('offline_data', item.id);
  }

  private async syncExpenseRequest(item: OfflineData): Promise<void> {
    const { data, error } = await supabase
      .from('expense_requests')
      .insert(item.data)
      .select()
      .single();

    if (error) throw error;
    
    // Update local reference if needed
    item.data.id = data.id;
  }

  private async syncExpenseItem(item: OfflineData): Promise<void> {
    const { error } = await supabase
      .from('expense_items')
      .insert(item.data);

    if (error) throw error;
  }

  private async syncFormData(item: OfflineData): Promise<void> {
    // Handle generic form data sync
    const { error } = await supabase
      .from(item.data.table)
      .insert(item.data.record);

    if (error) throw error;
  }

  private async syncAttachment(item: OfflineData): Promise<void> {
    // Handle file uploads
    const { data, error } = await supabase.storage
      .from(item.data.bucket)
      .upload(item.data.path, item.data.file);

    if (error) throw error;
  }

  // Background Sync
  private async setupBackgroundSync(): Promise<void> {
    if (!this.swRegistration?.sync) {
      console.warn('Background Sync not supported');
      return;
    }

    try {
      await this.swRegistration.sync.register('background-sync');
      console.log('Background sync registered');
    } catch (error) {
      console.error('Background sync registration failed:', error);
    }
  }

  async scheduleBackgroundTask(type: BackgroundSyncTask['type'], data?: any): Promise<void> {
    const task: Omit<BackgroundSyncTask, 'id'> = {
      type,
      data,
      status: 'pending',
      scheduled_at: new Date().toISOString(),
      retry_count: 0,
      max_retries: 3
    };

    await this.saveToIndexedDB('background_tasks', task);
    
    // Register background sync if supported
    if (this.swRegistration?.sync) {
      await this.swRegistration.sync.register(type);
    }
  }

  // Push Notifications
  private async setupPushNotifications(): Promise<void> {
    if (!('Notification' in window) || !this.swRegistration) {
      console.warn('Push notifications not supported');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Subscribe to push notifications
      await this.subscribeToPushNotifications();
    }
  }

  private async subscribeToPushNotifications(): Promise<void> {
    try {
      const subscription = await this.swRegistration!.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      });

      // Send subscription to server
      await supabase
        .from('push_subscriptions')
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          endpoint: subscription.endpoint,
          keys: {
            p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
            auth: this.arrayBufferToBase64(subscription.getKey('auth')!)
          },
          device_type: this.getDeviceType()
        });

      console.log('Push notification subscription successful');
    } catch (error) {
      console.error('Push notification subscription failed:', error);
    }
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  // PWA Manifest Generation
  async generateManifest(): Promise<PWAManifest> {
    const settings = await this.getPWASettings();
    
    return {
      name: 'نظام إدارة المصروفات - EP Group',
      short_name: 'EP المصروفات',
      description: 'نظام إدارة المصروفات الذكي للشركات',
      start_url: '/',
      display: 'standalone',
      orientation: 'any',
      theme_color: '#2563eb',
      background_color: '#ffffff',
      lang: 'ar',
      dir: 'rtl',
      scope: '/',
      icons: [
        {
          src: '/icons/icon-72x72.png',
          sizes: '72x72',
          type: 'image/png'
        },
        {
          src: '/icons/icon-96x96.png',
          sizes: '96x96',
          type: 'image/png'
        },
        {
          src: '/icons/icon-128x128.png',
          sizes: '128x128',
          type: 'image/png'
        },
        {
          src: '/icons/icon-144x144.png',
          sizes: '144x144',
          type: 'image/png'
        },
        {
          src: '/icons/icon-152x152.png',
          sizes: '152x152',
          type: 'image/png'
        },
        {
          src: '/icons/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: '/icons/icon-384x384.png',
          sizes: '384x384',
          type: 'image/png'
        },
        {
          src: '/icons/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png'
        }
      ],
      shortcuts: settings?.app_shortcuts || [],
      screenshots: [
        {
          src: '/screenshots/desktop-1.png',
          sizes: '1280x720',
          type: 'image/png',
          platform: 'wide'
        },
        {
          src: '/screenshots/mobile-1.png',
          sizes: '375x812',
          type: 'image/png',
          platform: 'narrow'
        }
      ],
      categories: ['business', 'finance', 'productivity']
    };
  }

  // Device Info Management
  private async registerDeviceInfo(): Promise<void> {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) return;

      const deviceInfo = {
        user_id: user.data.user.id,
        device_type: this.getDeviceType(),
        platform: this.getPlatform(),
        browser: this.getBrowser(),
        browser_version: this.getBrowserVersion(),
        screen_width: window.screen.width,
        screen_height: window.screen.height,
        is_pwa: this.isInstalled(),
        is_offline_capable: 'serviceWorker' in navigator,
        supports_notifications: 'Notification' in window,
        supports_background_sync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
        last_online: new Date().toISOString()
      };

      await supabase
        .from('device_info')
        .upsert(deviceInfo, { onConflict: 'user_id' });
    } catch (error) {
      console.error('Register device info failed:', error);
    }
  }

  // Utility Functions
  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/tablet|ipad|playbook|silk/.test(userAgent)) {
      return 'tablet';
    }
    
    if (/mobile|android|blackberry|opera mini|windows phone|iemobile/.test(userAgent)) {
      return 'mobile';
    }
    
    return 'desktop';
  }

  private getPlatform(): DeviceInfo['platform'] {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/android/.test(userAgent)) return 'android';
    if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
    if (/windows/.test(userAgent)) return 'windows';
    if (/macintosh/.test(userAgent)) return 'macos';
    if (/linux/.test(userAgent)) return 'linux';
    
    return 'unknown';
  }

  private getBrowser(): string {
    const userAgent = navigator.userAgent;
    
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('Opera')) return 'Opera';
    
    return 'Unknown';
  }

  private getBrowserVersion(): string {
    const userAgent = navigator.userAgent;
    const match = userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)\/(\d+)/);
    return match ? match[2] : '0';
  }

  // Event Listeners
  private initializeEventListeners(): void {
    // Handle page visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // App became visible, sync if needed
        if (this.isOnline && this.offlineQueue.length > 0) {
          this.syncOfflineData();
        }
      }
    });

    // Handle beforeunload to save pending data
    window.addEventListener('beforeunload', () => {
      // Save any pending form data to offline storage
      this.saveCurrentFormData();
    });
  }

  private saveCurrentFormData(): void {
    // Implementation to save current form data before page unload
    const forms = document.querySelectorAll('form[data-save-offline]');
    forms.forEach(form => {
      const formData = new FormData(form as HTMLFormElement);
      const data = Object.fromEntries(formData);
      
      if (Object.keys(data).length > 0) {
        this.saveOfflineData('form_data', {
          form_id: form.id,
          data,
          url: window.location.pathname
        }, 'current_user_id');
      }
    });
  }

  // IndexedDB Operations
  private async saveToIndexedDB(storeName: string, data: any): Promise<string> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('EPGroupPWA', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        
        // Generate UUID with fallback for older environments
        const id = typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : Date.now().toString(36) + Math.random().toString(36).substr(2);
        const addRequest = store.add({ ...data, id });
        
        addRequest.onsuccess = () => resolve(id);
        addRequest.onerror = () => reject(addRequest.error);
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id' });
        }
      };
    });
  }

  private async getAllFromIndexedDB(storeName: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('EPGroupPWA', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => resolve(getAllRequest.result);
        getAllRequest.onerror = () => reject(getAllRequest.error);
      };
    });
  }

  private async updateInIndexedDB(storeName: string, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('EPGroupPWA', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const putRequest = store.put(data);
        
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
    });
  }

  private async removeFromIndexedDB(storeName: string, id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('EPGroupPWA', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const deleteRequest = store.delete(id);
        
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => reject(deleteRequest.error);
      };
    });
  }

  // Public API
  getConnectionStatus(): boolean {
    return this.isOnline;
  }

  getOfflineQueueCount(): number {
    return this.offlineQueue.length;
  }

  async clearOfflineData(): Promise<void> {
    this.offlineQueue = [];
    
    // Clear IndexedDB
    const request = indexedDB.open('EPGroupPWA', 1);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['offline_data'], 'readwrite');
      const store = transaction.objectStore('offline_data');
      store.clear();
    };
  }

  cleanup(): void {
    // Cleanup resources
    if (this.swRegistration) {
      this.swRegistration = null;
    }
  }
}

export const pwaService = new PWAService();
export default pwaService;