/**
 * 🏭 EP Group System - Stock Notifications Service
 * خدمة الإشعارات لنظام المخازن
 */

import { getOptimizedDb } from '../database/optimized-db';
import type { Database } from 'better-sqlite3';
import type { StockRequest, StockLevel, Product, Warehouse } from './stock-management-service';

// ==================================================================
// أنواع الإشعارات (Notification Types)
// ==================================================================

export interface StockNotification {
  id: string;
  recipient_id: string;
  recipient_email?: string;
  notification_type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  warehouse_id?: string;
  request_id?: string;
  product_id?: string;
  is_read: boolean;
  sent_at?: string;
  read_at?: string;
  created_at: string;
}

export interface NotificationTemplate {
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

// ==================================================================
// خدمة الإشعارات الرئيسية
// ==================================================================

export class StockNotificationService {
  private db: Database;
  private static instance: StockNotificationService;

  constructor() {
    this.db = getOptimizedDb();
  }

  static getInstance(): StockNotificationService {
    if (!StockNotificationService.instance) {
      StockNotificationService.instance = new StockNotificationService();
    }
    return StockNotificationService.instance;
  }

  // ==================================================================
  // إنشاء الإشعارات (Create Notifications)
  // ==================================================================

  async createNotification(notification: Omit<StockNotification, 'id' | 'created_at'>): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO stock_notifications (
        recipient_id, recipient_email, notification_type, title, message,
        priority, warehouse_id, request_id, product_id, is_read
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      notification.recipient_id,
      notification.recipient_email,
      notification.notification_type,
      notification.title,
      notification.message,
      notification.priority,
      notification.warehouse_id,
      notification.request_id,
      notification.product_id,
      notification.is_read ? 1 : 0
    );
  }

  async createBulkNotifications(notifications: Omit<StockNotification, 'id' | 'created_at'>[]): Promise<void> {
    const transaction = this.db.transaction(() => {
      const stmt = this.db.prepare(`
        INSERT INTO stock_notifications (
          recipient_id, recipient_email, notification_type, title, message,
          priority, warehouse_id, request_id, product_id, is_read
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      notifications.forEach(notification => {
        stmt.run(
          notification.recipient_id,
          notification.recipient_email,
          notification.notification_type,
          notification.title,
          notification.message,
          notification.priority,
          notification.warehouse_id,
          notification.request_id,
          notification.product_id,
          notification.is_read ? 1 : 0
        );
      });
    });

    transaction();
  }

  // ==================================================================
  // إشعارات الطلبات (Request Notifications)
  // ==================================================================

  async notifyRequestCreated(request: StockRequest, notifyUsers: string[]): Promise<void> {
    const notifications = notifyUsers.map(userId => ({
      recipient_id: userId,
      notification_type: 'request_created',
      title: 'طلب جديد من المخزن',
      message: `تم إنشاء طلب جديد: ${request.title} - رقم الطلب: ${request.request_number}`,
      priority: request.priority as 'low' | 'medium' | 'high' | 'critical',
      warehouse_id: request.warehouse_id,
      request_id: request.id,
      is_read: false
    }));

    await this.createBulkNotifications(notifications);
  }

  async notifyRequestApproved(request: StockRequest, approverName: string, notifyUsers: string[]): Promise<void> {
    const notifications = notifyUsers.map(userId => ({
      recipient_id: userId,
      notification_type: 'request_approved',
      title: 'تمت موافقة الطلب',
      message: `تمت موافقة الطلب ${request.request_number} من قبل ${approverName}`,
      priority: 'medium' as const,
      warehouse_id: request.warehouse_id,
      request_id: request.id,
      is_read: false
    }));

    await this.createBulkNotifications(notifications);
  }

  async notifyRequestRejected(request: StockRequest, rejectionReason: string, notifyUsers: string[]): Promise<void> {
    const notifications = notifyUsers.map(userId => ({
      recipient_id: userId,
      notification_type: 'request_rejected',
      title: 'تم رفض الطلب',
      message: `تم رفض الطلب ${request.request_number}. السبب: ${rejectionReason}`,
      priority: 'high' as const,
      warehouse_id: request.warehouse_id,
      request_id: request.id,
      is_read: false
    }));

    await this.createBulkNotifications(notifications);
  }

  async notifyRequestReadyForIssue(request: StockRequest, notifyUsers: string[]): Promise<void> {
    const notifications = notifyUsers.map(userId => ({
      recipient_id: userId,
      notification_type: 'request_ready',
      title: 'الطلب جاهز للصرف',
      message: `الطلب ${request.request_number} جاهز للصرف من المخزن`,
      priority: 'medium' as const,
      warehouse_id: request.warehouse_id,
      request_id: request.id,
      is_read: false
    }));

    await this.createBulkNotifications(notifications);
  }

  async notifyRequestCompleted(request: StockRequest, notifyUsers: string[]): Promise<void> {
    const notifications = notifyUsers.map(userId => ({
      recipient_id: userId,
      notification_type: 'request_completed',
      title: 'تم إكمال الطلب',
      message: `تم إكمال الطلب ${request.request_number} بنجاح`,
      priority: 'low' as const,
      warehouse_id: request.warehouse_id,
      request_id: request.id,
      is_read: false
    }));

    await this.createBulkNotifications(notifications);
  }

  // ==================================================================
  // إشعارات المخزون (Stock Level Notifications)
  // ==================================================================

  async notifyLowStock(stockLevel: StockLevel, product: Product, warehouse: Warehouse, notifyUsers: string[]): Promise<void> {
    const notifications = notifyUsers.map(userId => ({
      recipient_id: userId,
      notification_type: 'low_stock',
      title: 'تحذير: مخزون منخفض',
      message: `المنتج "${product.name_ar}" في مخزن "${warehouse.name_ar}" وصل للحد الأدنى. المتوفر: ${stockLevel.available_quantity} ${product.unit}`,
      priority: 'high' as const,
      warehouse_id: warehouse.id,
      product_id: product.id,
      is_read: false
    }));

    await this.createBulkNotifications(notifications);
  }

  async notifyOutOfStock(product: Product, warehouse: Warehouse, notifyUsers: string[]): Promise<void> {
    const notifications = notifyUsers.map(userId => ({
      recipient_id: userId,
      notification_type: 'out_of_stock',
      title: 'تحذير: نفد المخزون',
      message: `المنتج "${product.name_ar}" نفد من مخزن "${warehouse.name_ar}"`,
      priority: 'critical' as const,
      warehouse_id: warehouse.id,
      product_id: product.id,
      is_read: false
    }));

    await this.createBulkNotifications(notifications);
  }

  async notifyReorderPoint(stockLevel: StockLevel, product: Product, warehouse: Warehouse, notifyUsers: string[]): Promise<void> {
    const notifications = notifyUsers.map(userId => ({
      recipient_id: userId,
      notification_type: 'reorder_point',
      title: 'تحذير: وصل لنقطة إعادة الطلب',
      message: `المنتج "${product.name_ar}" في مخزن "${warehouse.name_ar}" وصل لنقطة إعادة الطلب. المتوفر: ${stockLevel.available_quantity} ${product.unit}`,
      priority: 'medium' as const,
      warehouse_id: warehouse.id,
      product_id: product.id,
      is_read: false
    }));

    await this.createBulkNotifications(notifications);
  }

  // ==================================================================
  // إشعارات النظام (System Notifications)
  // ==================================================================

  async notifyStockMovement(
    movementType: string,
    quantity: number,
    product: Product,
    warehouse: Warehouse,
    processedBy: string,
    notifyUsers: string[]
  ): Promise<void> {
    const movementTypeAr = this.getMovementTypeArabic(movementType);
    const notifications = notifyUsers.map(userId => ({
      recipient_id: userId,
      notification_type: 'stock_movement',
      title: 'حركة مخزون',
      message: `تم ${movementTypeAr} ${Math.abs(quantity)} ${product.unit} من المنتج "${product.name_ar}" في مخزن "${warehouse.name_ar}" بواسطة ${processedBy}`,
      priority: 'low' as const,
      warehouse_id: warehouse.id,
      product_id: product.id,
      is_read: false
    }));

    await this.createBulkNotifications(notifications);
  }

  async notifyOverdueRequest(request: StockRequest, daysPastDue: number, notifyUsers: string[]): Promise<void> {
    const notifications = notifyUsers.map(userId => ({
      recipient_id: userId,
      notification_type: 'overdue_request',
      title: 'طلب متأخر',
      message: `الطلب ${request.request_number} متأخر ${daysPastDue} يوم عن التاريخ المطلوب`,
      priority: 'high' as const,
      warehouse_id: request.warehouse_id,
      request_id: request.id,
      is_read: false
    }));

    await this.createBulkNotifications(notifications);
  }

  // ==================================================================
  // استعلام الإشعارات (Query Notifications)
  // ==================================================================

  async getUserNotifications(
    userId: string,
    filters?: {
      is_read?: boolean;
      notification_type?: string;
      warehouse_id?: string;
      priority?: string;
      limit?: number;
    }
  ): Promise<StockNotification[]> {
    let query = `
      SELECT 
        sn.*,
        w.name_ar as warehouse_name,
        p.name_ar as product_name
      FROM stock_notifications sn
      LEFT JOIN warehouses w ON sn.warehouse_id = w.id
      LEFT JOIN products p ON sn.product_id = p.id
      WHERE sn.recipient_id = ?
    `;
    const params: any[] = [userId];

    if (filters?.is_read !== undefined) {
      query += ' AND sn.is_read = ?';
      params.push(filters.is_read ? 1 : 0);
    }

    if (filters?.notification_type) {
      query += ' AND sn.notification_type = ?';
      params.push(filters.notification_type);
    }

    if (filters?.warehouse_id) {
      query += ' AND sn.warehouse_id = ?';
      params.push(filters.warehouse_id);
    }

    if (filters?.priority) {
      query += ' AND sn.priority = ?';
      params.push(filters.priority);
    }

    query += ' ORDER BY sn.created_at DESC';

    if (filters?.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    const stmt = this.db.prepare(query);
    return stmt.all(...params) as StockNotification[];
  }

  async getUnreadCount(userId: string): Promise<number> {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM stock_notifications
      WHERE recipient_id = ? AND is_read = 0
    `);
    const result = stmt.get(userId) as { count: number };
    return result.count;
  }

  async markAsRead(notificationIds: string[]): Promise<void> {
    if (notificationIds.length === 0) return;

    const placeholders = notificationIds.map(() => '?').join(',');
    const stmt = this.db.prepare(`
      UPDATE stock_notifications 
      SET is_read = 1, read_at = CURRENT_TIMESTAMP
      WHERE id IN (${placeholders})
    `);
    
    stmt.run(...notificationIds);
  }

  async markAllAsRead(userId: string): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE stock_notifications 
      SET is_read = 1, read_at = CURRENT_TIMESTAMP
      WHERE recipient_id = ? AND is_read = 0
    `);
    
    stmt.run(userId);
  }

  // ==================================================================
  // إدارة المستخدمين المُشعرين (Notification Recipients)
  // ==================================================================

  async getWarehouseStakeholders(warehouseId: string): Promise<string[]> {
    // الحصول على المستخدمين المهتمين بهذا المخزن
    const stmt = this.db.prepare(`
      SELECT DISTINCT user_id
      FROM user_warehouse_permissions
      WHERE warehouse_id = ? AND (
        can_approve_requests = 1 OR
        can_manage_stock = 1 OR
        is_warehouse_manager = 1
      )
    `);
    
    const results = stmt.all(warehouseId) as { user_id: string }[];
    return results.map(r => r.user_id);
  }

  async getManagersForApproval(): Promise<string[]> {
    // يمكن تخصيصه حسب هيكل الصلاحيات في النظام
    // هنا نفترض وجود جدول أو آلية لتحديد المديرين
    return []; // سيتم تنفيذه لاحقاً حسب هيكل النظام
  }

  // ==================================================================
  // إشعارات مجدولة (Scheduled Notifications)
  // ==================================================================

  async checkAndNotifyLowStock(): Promise<void> {
    const lowStockItems = this.db.prepare(`
      SELECT 
        sl.*,
        p.*,
        w.*
      FROM stock_levels sl
      JOIN products p ON sl.product_id = p.id
      JOIN warehouses w ON sl.warehouse_id = w.id
      WHERE sl.available_quantity <= p.min_stock_level
        AND p.is_active = 1
        AND w.is_active = 1
    `).all() as Array<StockLevel & Product & Warehouse>;

    for (const item of lowStockItems) {
      const notifyUsers = await this.getWarehouseStakeholders(item.warehouse_id);
      
      if (item.available_quantity === 0) {
        await this.notifyOutOfStock(item, item, notifyUsers);
      } else if (item.available_quantity <= item.reorder_level) {
        await this.notifyReorderPoint(item, item, item, notifyUsers);
      } else {
        await this.notifyLowStock(item, item, item, notifyUsers);
      }
    }
  }

  async checkAndNotifyOverdueRequests(): Promise<void> {
    const overdueRequests = this.db.prepare(`
      SELECT *
      FROM stock_requests
      WHERE required_date < DATE('now') 
        AND status IN ('pending', 'manager_approved', 'accounting_approved', 'ready_for_issue')
    `).all() as StockRequest[];

    for (const request of overdueRequests) {
      const daysPastDue = Math.ceil(
        (new Date().getTime() - new Date(request.required_date!).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      const notifyUsers = await this.getWarehouseStakeholders(request.warehouse_id);
      await this.notifyOverdueRequest(request, daysPastDue, notifyUsers);
    }
  }

  // ==================================================================
  // حذف الإشعارات القديمة
  // ==================================================================

  async cleanupOldNotifications(daysOld: number = 30): Promise<number> {
    const stmt = this.db.prepare(`
      DELETE FROM stock_notifications
      WHERE created_at < datetime('now', '-' || ? || ' days')
    `);
    
    const result = stmt.run(daysOld);
    return result.changes;
  }

  // ==================================================================
  // دوال مساعدة (Helper Functions)
  // ==================================================================

  private getMovementTypeArabic(movementType: string): string {
    const types: Record<string, string> = {
      'in': 'إدخال',
      'out': 'صرف',
      'transfer': 'تحويل',
      'adjustment': 'تسوية',
      'return': 'إرجاع'
    };
    
    return types[movementType] || movementType;
  }

  // ==================================================================
  // إحصائيات الإشعارات
  // ==================================================================

  async getNotificationStats(userId: string): Promise<{
    total: number;
    unread: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
  }> {
    const stats = {
      total: 0,
      unread: 0,
      byType: {} as Record<string, number>,
      byPriority: {} as Record<string, number>
    };

    // العدد الإجمالي وغير المقروء
    const countResult = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_read = 0 THEN 1 END) as unread
      FROM stock_notifications
      WHERE recipient_id = ?
    `).get(userId) as { total: number; unread: number };

    stats.total = countResult.total;
    stats.unread = countResult.unread;

    // حسب النوع
    const byTypeResults = this.db.prepare(`
      SELECT notification_type, COUNT(*) as count
      FROM stock_notifications
      WHERE recipient_id = ?
      GROUP BY notification_type
    `).all(userId) as Array<{ notification_type: string; count: number }>;

    byTypeResults.forEach(item => {
      stats.byType[item.notification_type] = item.count;
    });

    // حسب الأولوية
    const byPriorityResults = this.db.prepare(`
      SELECT priority, COUNT(*) as count
      FROM stock_notifications
      WHERE recipient_id = ?
      GROUP BY priority
    `).all(userId) as Array<{ priority: string; count: number }>;

    byPriorityResults.forEach(item => {
      stats.byPriority[item.priority] = item.count;
    });

    return stats;
  }
}

// تصدير نسخة واحدة من الخدمة
export const stockNotificationService = StockNotificationService.getInstance();