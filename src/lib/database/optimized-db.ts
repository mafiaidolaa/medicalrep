// خدمة قاعدة البيانات المحسنة مع connection pooling
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { serverCache, withCache, createCacheKey } from '@/lib/cache/server-cache';

export interface DatabaseConfig {
  maxConnections: number;
  connectionTimeout: number;
  idleTimeout: number;
  retryAttempts: number;
}

export interface QueryOptions {
  useCache?: boolean;
  cacheTTL?: number;
  cacheKey?: string;
  cacheTags?: string[];
}

class OptimizedDatabase {
  private client: SupabaseClient;
  private connectionPool: SupabaseClient[] = [];
  private config: DatabaseConfig;
  private activeConnections = 0;

  constructor(config: Partial<DatabaseConfig> = {}) {
    this.config = {
      maxConnections: 10,
      connectionTimeout: 10000,
      idleTimeout: 30000,
      retryAttempts: 3,
      ...config
    };

    // إنشاء العميل الرئيسي
    this.client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { persistSession: false },
        db: {
          schema: 'public',
        },
        global: {
          headers: {
            'x-application-name': 'ep-group-system'
          }
        }
      }
    );

    this.initializeConnectionPool();
  }

  private initializeConnectionPool(): void {
    // إنشاء pool من الاتصالات
    for (let i = 0; i < this.config.maxConnections; i++) {
      const client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: { persistSession: false },
          db: { schema: 'public' }
        }
      );
      this.connectionPool.push(client);
    }
  }

  private async getConnection(): Promise<SupabaseClient> {
    if (this.activeConnections < this.config.maxConnections) {
      this.activeConnections++;
      return this.connectionPool[this.activeConnections - 1] || this.client;
    }
    
    // انتظار توفر اتصال
    await new Promise(resolve => setTimeout(resolve, 100));
    return this.getConnection();
  }

  private releaseConnection(): void {
    if (this.activeConnections > 0) {
      this.activeConnections--;
    }
  }

  // دالة محسنة للاستعلامات مع الكاش
  async query<T = any>(
    tableName: string,
    options: {
      select?: string;
      filters?: Record<string, any>;
      orderBy?: { column: string; ascending?: boolean };
      limit?: number;
      offset?: number;
      queryOptions?: QueryOptions;
    } = {}
  ): Promise<{ data: T[] | null; error: any; count?: number }> {
    const {
      select = '*',
      filters = {},
      orderBy,
      limit,
      offset,
      queryOptions = {}
    } = options;

    // إنشاء مفتاح كاش
    const cacheKey = queryOptions.cacheKey || 
      createCacheKey('query', tableName, JSON.stringify({ select, filters, orderBy, limit, offset }));

    // استخدام الكاش إذا كان مفعلاً
    if (queryOptions.useCache !== false) {
      return withCache(
        cacheKey,
        async () => {
          const client = await this.getConnection();
          
          try {
            let query = client.from(tableName).select(select, { count: 'exact' });

            // تطبيق الفلاتر
            Object.entries(filters).forEach(([key, value]) => {
              if (Array.isArray(value)) {
                query = query.in(key, value);
              } else if (typeof value === 'string' && value.includes('%')) {
                query = query.like(key, value);
              } else {
                query = query.eq(key, value);
              }
            });

            // ترتيب النتائج
            if (orderBy) {
              query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
            }

            // تحديد عدد النتائج
            if (limit) {
              query = query.limit(limit);
            }

            if (offset) {
              query = query.range(offset, offset + (limit || 100) - 1);
            }

            const result = await query;
            return result;
          } finally {
            this.releaseConnection();
          }
        },
        {
          ttl: queryOptions.cacheTTL || 300,
          tags: queryOptions.cacheTags || [tableName]
        }
      );
    }

    // تنفيذ الاستعلام مباشرة بدون كاش
    const client = await this.getConnection();
    try {
      let query = client.from(tableName).select(select, { count: 'exact' });

      Object.entries(filters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else if (typeof value === 'string' && value.includes('%')) {
          query = query.like(key, value);
        } else {
          query = query.eq(key, value);
        }
      });

      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
      }

      if (limit) {
        query = query.limit(limit);
      }

      if (offset) {
        query = query.range(offset, offset + (limit || 100) - 1);
      }

      return await query;
    } finally {
      this.releaseConnection();
    }
  }

  // دالة محسنة للإدراج
  async insert<T = any>(
    tableName: string,
    data: any | any[],
    options: { returning?: string; queryOptions?: QueryOptions } = {}
  ): Promise<{ data: T[] | null; error: any }> {
    const client = await this.getConnection();
    
    try {
      const query = client.from(tableName).insert(data);
      
      if (options.returning) {
        query.select(options.returning);
      }

      const result = await query;

      // إبطال الكاش المرتبط بهذا الجدول
      if (options.queryOptions?.cacheTags) {
        serverCache.invalidateByTags(options.queryOptions.cacheTags);
      } else {
        serverCache.invalidateByTags([tableName]);
      }

      return result;
    } finally {
      this.releaseConnection();
    }
  }

  // دالة محسنة للتحديث
  async update<T = any>(
    tableName: string,
    data: any,
    filters: Record<string, any>,
    options: { returning?: string; queryOptions?: QueryOptions } = {}
  ): Promise<{ data: T[] | null; error: any }> {
    const client = await this.getConnection();
    
    try {
      let query = client.from(tableName).update(data);

      // تطبيق الفلاتر
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      if (options.returning) {
        query.select(options.returning);
      }

      const result = await query;

      // إبطال الكاش المرتبط بهذا الجدول
      if (options.queryOptions?.cacheTags) {
        serverCache.invalidateByTags(options.queryOptions.cacheTags);
      } else {
        serverCache.invalidateByTags([tableName]);
      }

      return result;
    } finally {
      this.releaseConnection();
    }
  }

  // دالة محسنة للحذف
  async delete(
    tableName: string,
    filters: Record<string, any>,
    options: { queryOptions?: QueryOptions } = {}
  ): Promise<{ data: any; error: any }> {
    const client = await this.getConnection();
    
    try {
      let query = client.from(tableName).delete();

      // تطبيق الفلاتر
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      const result = await query;

      // إبطال الكاش المرتبط بهذا الجدول
      if (options.queryOptions?.cacheTags) {
        serverCache.invalidateByTags(options.queryOptions.cacheTags);
      } else {
        serverCache.invalidateByTags([tableName]);
      }

      return result;
    } finally {
      this.releaseConnection();
    }
  }

  // دالة لتنفيذ استعلامات SQL مخصصة
  async rpc<T = any>(
    functionName: string,
    params: Record<string, any> = {},
    options: QueryOptions = {}
  ): Promise<{ data: T | null; error: any }> {
    const cacheKey = options.cacheKey || 
      createCacheKey('rpc', functionName, JSON.stringify(params));

    if (options.useCache !== false) {
      return withCache(
        cacheKey,
        async () => {
          const client = await this.getConnection();
          try {
            return await client.rpc(functionName, params);
          } finally {
            this.releaseConnection();
          }
        },
        {
          ttl: options.cacheTTL || 300,
          tags: options.cacheTags || [`rpc:${functionName}`]
        }
      );
    }

    const client = await this.getConnection();
    try {
      return await client.rpc(functionName, params);
    } finally {
      this.releaseConnection();
    }
  }

  // إحصائيات الاتصالات
  getConnectionStats() {
    return {
      activeConnections: this.activeConnections,
      maxConnections: this.config.maxConnections,
      poolSize: this.connectionPool.length,
      cacheStats: serverCache.getStats()
    };
  }

  // تنظيف الاتصالات
  async cleanup(): Promise<void> {
    // مسح الكاش
    serverCache.clear();
    
    // إعادة تعيين عداد الاتصالات
    this.activeConnections = 0;
  }
}

// إنشاء مثيل واحد من قاعدة البيانات المحسنة
export const optimizedDb = new OptimizedDatabase();

// دوال مساعدة للاستخدام السريع
export const dbQuery = optimizedDb.query.bind(optimizedDb);
export const dbInsert = optimizedDb.insert.bind(optimizedDb);
export const dbUpdate = optimizedDb.update.bind(optimizedDb);
export const dbDelete = optimizedDb.delete.bind(optimizedDb);
export const dbRpc = optimizedDb.rpc.bind(optimizedDb);