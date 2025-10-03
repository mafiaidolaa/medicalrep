/**
 * 🚀 نظام Connection Pooling متقدم لـ Supabase
 * يحسن الأداء ويقلل زمن الاستجابة بشكل كبير
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface PoolConnection {
  client: SupabaseClient;
  lastUsed: number;
  inUse: boolean;
  id: string;
}

interface PoolConfig {
  min: number;
  max: number;
  acquireTimeout: number;
  idleTimeout: number;
  reapInterval: number;
}

class SupabaseConnectionPool {
  private connections: Map<string, PoolConnection> = new Map();
  private queue: Array<(client: SupabaseClient) => void> = [];
  private config: PoolConfig;
  private cleanupInterval?: NodeJS.Timeout;
  private stats = {
    created: 0,
    destroyed: 0,
    acquired: 0,
    released: 0,
    timeouts: 0,
  };

  constructor(config: Partial<PoolConfig> = {}) {
    this.config = {
      min: 2,           // حد أدنى من الاتصالات
      max: 10,          // حد أقصى من الاتصالات  
      acquireTimeout: 30000,  // 30 ثانية timeout
      idleTimeout: 300000,    // 5 دقائق idle timeout
      reapInterval: 60000,    // دقيقة واحدة cleanup interval
      ...config,
    };

    this.initialize();
  }

  /**
   * تهيئة الـ pool
   */
  private async initialize() {
    // إنشاء الحد الأدنى من الاتصالات
    for (let i = 0; i < this.config.min; i++) {
      await this.createConnection();
    }

    // بدء عملية التنظيف التلقائي
    this.startCleanupInterval();

    console.log(`🔗 تم تهيئة Supabase Connection Pool بنجاح (${this.config.min}-${this.config.max})`);
  }

  /**
   * إنشاء اتصال جديد
   */
  private async createConnection(): Promise<PoolConnection> {
    const id = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        realtime: {
          params: {
            eventsPerSecond: 2, // تقليل الأحداث
          },
        },
        global: {
          headers: {
            'x-connection-pool': 'true',
            'x-connection-id': id,
          },
        },
      }
    );

    const connection: PoolConnection = {
      client,
      lastUsed: Date.now(),
      inUse: false,
      id,
    };

    this.connections.set(id, connection);
    this.stats.created++;

    console.log(`➕ إنشاء اتصال جديد: ${id}`);
    return connection;
  }

  /**
   * الحصول على اتصال من الـ pool
   */
  async acquire(): Promise<SupabaseClient> {
    return new Promise((resolve, reject) => {
      // البحث عن اتصال متاح
      for (const [id, connection] of this.connections) {
        if (!connection.inUse) {
          connection.inUse = true;
          connection.lastUsed = Date.now();
          this.stats.acquired++;
          
          console.log(`🔗 استخدام اتصال موجود: ${id}`);
          resolve(connection.client);
          return;
        }
      }

      // إنشاء اتصال جديد إذا أمكن
      if (this.connections.size < this.config.max) {
        this.createConnection()
          .then(connection => {
            connection.inUse = true;
            this.stats.acquired++;
            resolve(connection.client);
          })
          .catch(reject);
        return;
      }

      // إضافة للطابور إذا وصلنا للحد الأقصى
      this.queue.push(resolve);
      
      // Timeout للطابور
      setTimeout(() => {
        const index = this.queue.indexOf(resolve);
        if (index !== -1) {
          this.queue.splice(index, 1);
          this.stats.timeouts++;
          reject(new Error(`Connection pool timeout after ${this.config.acquireTimeout}ms`));
        }
      }, this.config.acquireTimeout);
    });
  }

  /**
   * تحرير اتصال للـ pool
   */
  release(client: SupabaseClient) {
    for (const [id, connection] of this.connections) {
      if (connection.client === client) {
        connection.inUse = false;
        connection.lastUsed = Date.now();
        this.stats.released++;

        console.log(`🔓 تحرير اتصال: ${id}`);

        // خدمة الطابور إذا كان هناك طلبات منتظرة
        if (this.queue.length > 0) {
          const resolve = this.queue.shift()!;
          connection.inUse = true;
          resolve(connection.client);
        }
        
        return;
      }
    }

    console.warn('⚠️ محاولة تحرير اتصال غير موجود في الـ pool');
  }

  /**
   * تشغيل cleanup interval للاتصالات القديمة
   */
  private startCleanupInterval() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleConnections();
    }, this.config.reapInterval);
  }

  /**
   * تنظيف الاتصالات الخاملة
   */
  private cleanupIdleConnections() {
    const now = Date.now();
    const toDestroy: string[] = [];

    for (const [id, connection] of this.connections) {
      const isIdle = !connection.inUse && 
                    (now - connection.lastUsed) > this.config.idleTimeout;
      
      // الاحتفاظ بالحد الأدنى من الاتصالات
      const canDestroy = this.connections.size > this.config.min;

      if (isIdle && canDestroy) {
        toDestroy.push(id);
      }
    }

    toDestroy.forEach(id => {
      const connection = this.connections.get(id);
      if (connection) {
        this.connections.delete(id);
        this.stats.destroyed++;
        console.log(`🗑️ حذف اتصال خامل: ${id}`);
      }
    });

    if (toDestroy.length > 0) {
      console.log(`🧹 تنظيف ${toDestroy.length} اتصال خامل`);
    }
  }

  /**
   * الحصول على إحصائيات الـ pool
   */
  getStats() {
    const activeConnections = Array.from(this.connections.values())
      .filter(c => c.inUse).length;
    
    return {
      ...this.stats,
      totalConnections: this.connections.size,
      activeConnections,
      idleConnections: this.connections.size - activeConnections,
      queueLength: this.queue.length,
      hitRate: this.stats.acquired > 0 ? 
        ((this.stats.acquired - this.stats.created + this.config.min) / this.stats.acquired) * 100 : 0,
    };
  }

  /**
   * إغلاق الـ pool
   */
  async destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // إغلاق جميع الاتصالات
    this.connections.clear();
    this.queue.length = 0;

    console.log('💥 تم إغلاق Connection Pool');
  }
}

// Singleton instance
let poolInstance: SupabaseConnectionPool | null = null;

/**
 * الحصول على instance الـ pool (Singleton)
 */
export function getSupabasePool(): SupabaseConnectionPool {
  if (!poolInstance) {
    poolInstance = new SupabaseConnectionPool({
      min: parseInt(process.env.SUPABASE_POOL_MIN || '2'),
      max: parseInt(process.env.SUPABASE_POOL_MAX || '10'),
      acquireTimeout: parseInt(process.env.SUPABASE_POOL_ACQUIRE_TIMEOUT || '30000'),
      idleTimeout: parseInt(process.env.SUPABASE_POOL_IDLE_TIMEOUT || '300000'),
    });
  }
  return poolInstance;
}

/**
 * Wrapper function لاستخدام connection من الـ pool
 */
export async function withPooledConnection<T>(
  fn: (client: SupabaseClient) => Promise<T>
): Promise<T> {
  const pool = getSupabasePool();
  const client = await pool.acquire();
  
  try {
    const result = await fn(client);
    return result;
  } finally {
    pool.release(client);
  }
}

/**
 * Hook للحصول على إحصائيات الـ pool (للمراقبة)
 */
export function usePoolStats() {
  const pool = getSupabasePool();
  return pool.getStats();
}