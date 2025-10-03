// نظام تتبع العمليات التلقائي للخادم
import { dbInsert, dbQuery } from '@/lib/database/optimized-db';
import { serverCache, createCacheKey } from '@/lib/cache/server-cache';
import { DatabaseErrorHandler, executeWithErrorHandling } from '@/lib/database/database-error-handler';

// أنواع العمليات المدعومة
export enum ActivityType {
  VISIT_CREATED = 'visit_created',
  VISIT_UPDATED = 'visit_updated',
  VISIT_DELETED = 'visit_deleted',
  INVOICE_CREATED = 'invoice_created',
  INVOICE_UPDATED = 'invoice_updated',
  INVOICE_PAID = 'invoice_paid',
  DEBT_ADDED = 'debt_added',
  DEBT_PAID = 'debt_paid',
  DEBT_UPDATED = 'debt_updated',
  CLINIC_ADDED = 'clinic_added',
  CLINIC_UPDATED = 'clinic_updated',
  PLAN_CREATED = 'plan_created',
  PLAN_UPDATED = 'plan_updated',
  ORDER_CREATED = 'order_created',
  ORDER_UPDATED = 'order_updated',
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  SYSTEM_ERROR = 'system_error'
}

// واجهة بيانات النشاط
export interface ActivityData {
  type: ActivityType;
  userId?: string;
  userName?: string;
  entityId?: string;
  entityType?: string;
  details?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp?: Date;
}

// واجهة إعدادات السجل
export interface LoggerConfig {
  enableCaching?: boolean;
  batchSize?: number;
  flushInterval?: number;
  retentionDays?: number;
}

class ActivityLogger {
  private config: LoggerConfig;
  private batchQueue: ActivityData[] = [];
  private flushTimer?: NodeJS.Timeout;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      enableCaching: true,
      batchSize: 10,
      flushInterval: 5000, // 5 seconds
      retentionDays: 90,
      ...config
    };

    // بدء مؤقت التفريغ التلقائي
    this.startFlushTimer();
  }

  // تسجيل نشاط جديد
  async logActivity(data: ActivityData): Promise<void> {
    // التأكد من وجود entity_id أو توليد واحد افتراضي
    const entityId = data.entityId || this.generateDefaultEntityId(data);
    
    const activityRecord = {
      ...data,
      entityId, // ضمان وجود entity_id دائماً
      timestamp: data.timestamp || new Date(),
      id: this.generateId(),
      created_at: new Date().toISOString(),
    };

    // إضافة إلى طابور المعالجة المجمعة
    this.batchQueue.push(activityRecord);

    // تفريغ فوري إذا وصل الطابور للحد الأقصى
    if (this.batchQueue.length >= this.config.batchSize!) {
      await this.flushBatch();
    }

    // تحديث الكاش إذا كان مفعلاً
    if (this.config.enableCaching) {
      this.updateCache(activityRecord);
    }
  }

  // تسجيل زيارة جديدة
  async logVisit(visitData: {
    visitId: string;
    clinicId: string;
    clinicName: string;
    userId: string;
    userName: string;
    visitType: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.logActivity({
      type: ActivityType.VISIT_CREATED,
      userId: visitData.userId,
      userName: visitData.userName,
      entityId: visitData.visitId,
      entityType: 'visit',
      details: {
        clinicId: visitData.clinicId,
        clinicName: visitData.clinicName,
        visitType: visitData.visitType,
      },
      ipAddress: visitData.ipAddress,
      userAgent: visitData.userAgent,
    });
  }

  // تسجيل فاتورة جديدة
  async logInvoice(invoiceData: {
    invoiceId: string;
    clinicId: string;
    clinicName: string;
    userId: string;
    userName: string;
    amount: number;
    status: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.logActivity({
      type: ActivityType.INVOICE_CREATED,
      userId: invoiceData.userId,
      userName: invoiceData.userName,
      entityId: invoiceData.invoiceId,
      entityType: 'invoice',
      details: {
        clinicId: invoiceData.clinicId,
        clinicName: invoiceData.clinicName,
        amount: invoiceData.amount,
        status: invoiceData.status,
      },
      ipAddress: invoiceData.ipAddress,
      userAgent: invoiceData.userAgent,
    });
  }

  // تسجيل دين جديد أو تسديد
  async logDebt(debtData: {
    debtId: string;
    clinicId: string;
    clinicName: string;
    userId: string;
    userName: string;
    amount: number;
    action: 'added' | 'paid' | 'updated';
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    const activityType = debtData.action === 'added' ? ActivityType.DEBT_ADDED :
                        debtData.action === 'paid' ? ActivityType.DEBT_PAID :
                        ActivityType.DEBT_UPDATED;

    await this.logActivity({
      type: activityType,
      userId: debtData.userId,
      userName: debtData.userName,
      entityId: debtData.debtId,
      entityType: 'debt',
      details: {
        clinicId: debtData.clinicId,
        clinicName: debtData.clinicName,
        amount: debtData.amount,
        action: debtData.action,
      },
      ipAddress: debtData.ipAddress,
      userAgent: debtData.userAgent,
    });
  }

  // تسجيل عيادة جديدة
  async logClinic(clinicData: {
    clinicId: string;
    clinicName: string;
    userId: string;
    userName: string;
    action: 'added' | 'updated';
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    const activityType = clinicData.action === 'added' ? 
                        ActivityType.CLINIC_ADDED : 
                        ActivityType.CLINIC_UPDATED;

    await this.logActivity({
      type: activityType,
      userId: clinicData.userId,
      userName: clinicData.userName,
      entityId: clinicData.clinicId,
      entityType: 'clinic',
      details: {
        clinicName: clinicData.clinicName,
        action: clinicData.action,
      },
      ipAddress: clinicData.ipAddress,
      userAgent: clinicData.userAgent,
    });
  }

  // تسجيل خطة جديدة
  async logPlan(planData: {
    planId: string;
    planName: string;
    userId: string;
    userName: string;
    action: 'created' | 'updated';
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    const activityType = planData.action === 'created' ? 
                        ActivityType.PLAN_CREATED : 
                        ActivityType.PLAN_UPDATED;

    await this.logActivity({
      type: activityType,
      userId: planData.userId,
      userName: planData.userName,
      entityId: planData.planId,
      entityType: 'plan',
      details: {
        planName: planData.planName,
        action: planData.action,
      },
      ipAddress: planData.ipAddress,
      userAgent: planData.userAgent,
    });
  }

  // استرجاع سجل الأنشطة
  async getActivities(options: {
    userId?: string;
    entityType?: string;
    activityType?: ActivityType;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ data: any[] | null; error: any; count?: number }> {
    const filters: Record<string, any> = {};
    
    if (options.userId) filters.userId = options.userId;
    if (options.entityType) filters.entityType = options.entityType;
    if (options.activityType) filters.type = options.activityType;
    
    // فلترة بالتاريخ (سيحتاج تحسين في الاستعلام الفعلي)
    if (options.fromDate || options.toDate) {
      // يمكن تحسين هذا باستخدام range queries في Supabase
    }

    return await dbQuery('activity_logs', {
      filters,
      orderBy: { column: 'created_at', ascending: false },
      limit: options.limit || 50,
      offset: options.offset || 0,
      queryOptions: {
        useCache: this.config.enableCaching,
        cacheTTL: 300,
        cacheTags: ['activities']
      }
    });
  }

  // إحصائيات النشاط
  async getActivityStats(userId?: string): Promise<{
    totalActivities: number;
    todayActivities: number;
    weekActivities: number;
    monthActivities: number;
    topActivityTypes: Array<{ type: string; count: number }>;
  }> {
    const cacheKey = createCacheKey('activity-stats', userId || 'all');
    
    if (this.config.enableCaching) {
      const cached = serverCache.get(cacheKey);
      if (cached && Object.keys(cached).length > 0) return cached as { totalActivities: number; todayActivities: number; weekActivities: number; monthActivities: number; topActivityTypes: { type: string; count: number; }[]; };
    }

    // هنا يجب تنفيذ الاستعلامات الفعلية لحساب الإحصائيات
    // يمكن استخدام stored procedures في Supabase للحصول على أداء أفضل
    
    const stats = {
      totalActivities: 0,
      todayActivities: 0,
      weekActivities: 0,
      monthActivities: 0,
      topActivityTypes: []
    };

    if (this.config.enableCaching) {
      serverCache.set(cacheKey, stats, { ttl: 600 }); // 10 minutes
    }

    return stats;
  }

  // تفريغ الطابور إلى قاعدة البيانات
  private async flushBatch(): Promise<void> {
    if (this.batchQueue.length === 0) return;

    const batch = [...this.batchQueue];
    this.batchQueue = [];

    // استخدام معالج الأخطاء المتقدم مع إعادة المحاولة
    const { data, error } = await executeWithErrorHandling(
      () => DatabaseErrorHandler.retryOperation(
        () => dbInsert('activity_logs', batch, {
          queryOptions: { 
            cacheTags: ['activities'] 
          }
        })
      ),
      { 
        operation: 'flush_activity_batch', 
        batchSize: batch.length,
        timestamp: new Date().toISOString()
      }
    );

    if (error) {
      // إعادة إدراج البيانات في الطابور فقط إذا كان الخطأ قابل للإعادة
      if (error.retryable) {
        this.batchQueue.unshift(...batch);
      } else {
        // تسجيل البيانات الفاشلة في ملف منفصل للمراجعة اللاحقة
        console.error('Failed activity batch (non-retryable):', {
          error: error.message,
          failedRecords: batch.length,
          suggestion: error.suggestion
        });
      }
    }
  }

  // بدء مؤقت التفريغ التلقائي
  private startFlushTimer(): void {
    this.flushTimer = setInterval(async () => {
      await this.flushBatch();
    }, this.config.flushInterval);
  }

  // تحديث الكاش
  private updateCache(activity: ActivityData): void {
    // تحديث كاش الأنشطة الحديثة
    const recentKey = createCacheKey('recent-activities', activity.userId || 'all');
    const recent = serverCache.get<ActivityData[]>(recentKey) || [];
    recent.unshift(activity);
    
    // الاحتفاظ بآخر 20 نشاط فقط
    if (recent.length > 20) {
      recent.splice(20);
    }
    
    serverCache.set(recentKey, recent, { ttl: 300 });
  }

  // إنشاء معرف فريد
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // توليد entity_id افتراضي عند عدم وجوده
  private generateDefaultEntityId(data: ActivityData): string {
    // إنشاء معرف مبني على نوع النشاط والمستخدم والتوقيت
    const timestamp = Date.now();
    const userPart = data.userId ? data.userId.slice(-4) : 'anon';
    const typePart = data.type.replace('_', '-');
    
    return `${typePart}-${userPart}-${timestamp}`;
  }

  // تنظيف الموارد
  async cleanup(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    // تفريغ آخر الأنشطة
    await this.flushBatch();
  }

  // حذف الأنشطة القديمة
  async cleanupOldActivities(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays!);

    // يجب تنفيذ استعلام حذف للأنشطة الأقدم من cutoffDate
    // يمكن استخدام stored procedure أو scheduled job
  }
}

// إنشاء مثيل واحد من المسجل
export const activityLogger = new ActivityLogger();

// دوال مساعدة للاستخدام السريع
export const logVisit = activityLogger.logVisit.bind(activityLogger);
export const logInvoice = activityLogger.logInvoice.bind(activityLogger);
export const logDebt = activityLogger.logDebt.bind(activityLogger);
export const logClinic = activityLogger.logClinic.bind(activityLogger);
export const logPlan = activityLogger.logPlan.bind(activityLogger);
export const getActivities = activityLogger.getActivities.bind(activityLogger);
export const getActivityStats = activityLogger.getActivityStats.bind(activityLogger);

// Hook React لاستخدام المسجل
export function useActivityLogger() {
  return {
    logVisit,
    logInvoice,
    logDebt,
    logClinic,
    logPlan,
    getActivities,
    getActivityStats
  };
}