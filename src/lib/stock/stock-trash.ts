/**
 * 🏭 EP Group System - Stock Trash Management System
 * نظام سلة المحذوفات للمخازن مع إمكانية الاسترداد
 */

import { getOptimizedDb } from '../database/optimized-db';
import type { Database } from 'better-sqlite3';

// ==================================================================
// أنواع البيانات
// ==================================================================

export interface DeletedRecord {
  id: string;
  original_table: string;
  original_id: string;
  original_data: any; // JSON data
  deletion_reason?: string;
  deleted_by: string;
  deleted_by_name?: string;
  deleted_at: string;
  can_restore: boolean;
  restored_at?: string;
  restored_by?: string;
  retention_days: number;
  auto_delete_date: string;
}

export interface TrashSummary {
  total_items: number;
  by_table: Record<string, number>;
  by_user: Record<string, number>;
  expiring_soon: number;
  restorable: number;
  permanent: number;
}

export interface RestoreResult {
  success: boolean;
  restored_id?: string;
  error?: string;
  conflicts?: string[];
}

// ==================================================================
// خدمة إدارة سلة المحذوفات
// ==================================================================

export class StockTrashService {
  private db: Database;
  private static instance: StockTrashService;

  constructor() {
    this.db = getOptimizedDb();
  }

  static getInstance(): StockTrashService {
    if (!StockTrashService.instance) {
      StockTrashService.instance = new StockTrashService();
    }
    return StockTrashService.instance;
  }

  // ==================================================================
  // عمليات الحذف الآمن
  // ==================================================================

  async softDelete(
    tableName: string,
    recordId: string,
    deletedBy: string,
    deletedByName: string,
    reason?: string,
    retentionDays: number = 30
  ): Promise<void> {
    const transaction = this.db.transaction(() => {
      // الحصول على البيانات الأصلية
      const originalData = this.getOriginalData(tableName, recordId);
      
      if (!originalData) {
        throw new Error(`السجل ${recordId} غير موجود في جدول ${tableName}`);
      }

      // نقل البيانات إلى سلة المحذوفات
      const stmt = this.db.prepare(`
        INSERT INTO stock_deleted_records (
          original_table, original_id, original_data, deletion_reason,
          deleted_by, deleted_by_name, retention_days, can_restore
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      `);

      stmt.run(
        tableName,
        recordId,
        JSON.stringify(originalData),
        reason,
        deletedBy,
        deletedByName,
        retentionDays
      );

      // حذف السجل من الجدول الأصلي
      this.deleteFromOriginalTable(tableName, recordId);

      // تسجيل العملية في سجل التدقيق
      this.logDeletionAudit(tableName, recordId, deletedBy, reason);
    });

    transaction();
  }

  private getOriginalData(tableName: string, recordId: string): any {
    const allowedTables = [
      'stock_requests', 'stock_request_items', 'warehouses', 
      'products', 'stock_levels', 'stock_movements',
      'issue_orders', 'issue_order_items', 'stock_transfers',
      'stock_transfer_items', 'user_warehouse_permissions'
    ];

    if (!allowedTables.includes(tableName)) {
      throw new Error(`غير مسموح بحذف السجلات من جدول ${tableName}`);
    }

    const stmt = this.db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`);
    return stmt.get(recordId);
  }

  private deleteFromOriginalTable(tableName: string, recordId: string): void {
    // حذف حسب نوع الجدول مع مراعاة العلاقات
    switch (tableName) {
      case 'stock_requests':
        // حذف عناصر الطلب أولاً
        this.db.prepare('DELETE FROM stock_request_items WHERE request_id = ?').run(recordId);
        this.db.prepare('DELETE FROM stock_request_approvals WHERE request_id = ?').run(recordId);
        this.db.prepare('DELETE FROM stock_requests WHERE id = ?').run(recordId);
        break;
        
      case 'warehouses':
        // فحص وجود بيانات مرتبطة
        const relatedCount = this.db.prepare(`
          SELECT COUNT(*) as count FROM stock_levels WHERE warehouse_id = ?
        `).get(recordId) as { count: number };
        
        if (relatedCount.count > 0) {
          throw new Error('لا يمكن حذف المخزن لوجود منتجات مرتبطة به');
        }
        
        this.db.prepare('DELETE FROM user_warehouse_permissions WHERE warehouse_id = ?').run(recordId);
        this.db.prepare('DELETE FROM warehouses WHERE id = ?').run(recordId);
        break;

      case 'products':
        // فحص وجود مخزون
        const stockCount = this.db.prepare(`
          SELECT COUNT(*) as count FROM stock_levels 
          WHERE product_id = ? AND (available_quantity > 0 OR reserved_quantity > 0)
        `).get(recordId) as { count: number };
        
        if (stockCount.count > 0) {
          throw new Error('لا يمكن حذف المنتج لوجود مخزون متاح');
        }
        
        this.db.prepare('DELETE FROM stock_levels WHERE product_id = ?').run(recordId);
        this.db.prepare('DELETE FROM products WHERE id = ?').run(recordId);
        break;

      default:
        this.db.prepare(`DELETE FROM ${tableName} WHERE id = ?`).run(recordId);
        break;
    }
  }

  private logDeletionAudit(tableName: string, recordId: string, deletedBy: string, reason?: string): void {
    const stmt = this.db.prepare(`
      INSERT INTO stock_audit_log (
        table_name, record_id, action, user_id, user_name,
        old_values, new_values, changed_fields
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      tableName,
      recordId,
      'DELETE',
      deletedBy,
      'system',
      JSON.stringify({ status: 'active' }),
      JSON.stringify({ status: 'deleted', reason: reason }),
      'status'
    );
  }

  // ==================================================================
  // عمليات الاستعلام والعرض
  // ==================================================================

  async getTrashItems(filters?: {
    table?: string;
    deleted_by?: string;
    from_date?: string;
    to_date?: string;
    can_restore?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<DeletedRecord[]> {
    let query = `
      SELECT sdr.*, 
        CASE 
          WHEN sdr.original_table = 'stock_requests' THEN json_extract(sdr.original_data, '$.title')
          WHEN sdr.original_table = 'warehouses' THEN json_extract(sdr.original_data, '$.name_ar')
          WHEN sdr.original_table = 'products' THEN json_extract(sdr.original_data, '$.name_ar')
          ELSE sdr.original_id
        END as display_name,
        CASE 
          WHEN DATE(sdr.auto_delete_date) <= DATE('now', '+7 days') THEN 1
          ELSE 0
        END as expiring_soon
      FROM stock_deleted_records sdr
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.table) {
      query += ' AND sdr.original_table = ?';
      params.push(filters.table);
    }

    if (filters?.deleted_by) {
      query += ' AND sdr.deleted_by = ?';
      params.push(filters.deleted_by);
    }

    if (filters?.from_date) {
      query += ' AND DATE(sdr.deleted_at) >= ?';
      params.push(filters.from_date);
    }

    if (filters?.to_date) {
      query += ' AND DATE(sdr.deleted_at) <= ?';
      params.push(filters.to_date);
    }

    if (filters?.can_restore !== undefined) {
      query += ' AND sdr.can_restore = ?';
      params.push(filters.can_restore ? 1 : 0);
    }

    query += ' ORDER BY sdr.deleted_at DESC';

    if (filters?.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
      
      if (filters.offset) {
        query += ' OFFSET ?';
        params.push(filters.offset);
      }
    }

    const stmt = this.db.prepare(query);
    const results = stmt.all(...params) as any[];

    return results.map(row => ({
      ...row,
      original_data: JSON.parse(row.original_data)
    }));
  }

  async getTrashSummary(): Promise<TrashSummary> {
    // العدد الإجمالي
    const total = this.db.prepare(`
      SELECT COUNT(*) as count FROM stock_deleted_records
    `).get() as { count: number };

    // حسب الجدول
    const byTable = this.db.prepare(`
      SELECT original_table, COUNT(*) as count
      FROM stock_deleted_records
      GROUP BY original_table
    `).all() as Array<{ original_table: string; count: number }>;

    // حسب المستخدم
    const byUser = this.db.prepare(`
      SELECT deleted_by_name, COUNT(*) as count
      FROM stock_deleted_records
      WHERE deleted_by_name IS NOT NULL
      GROUP BY deleted_by_name
    `).all() as Array<{ deleted_by_name: string; count: number }>;

    // العناصر التي ستنتهي صلاحيتها قريباً
    const expiringSoon = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM stock_deleted_records
      WHERE DATE(auto_delete_date) <= DATE('now', '+7 days')
        AND can_restore = 1
    `).get() as { count: number };

    // العناصر القابلة للاسترداد
    const restorable = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM stock_deleted_records
      WHERE can_restore = 1
    `).get() as { count: number };

    // العناصر المحذوفة نهائياً
    const permanent = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM stock_deleted_records
      WHERE can_restore = 0
    `).get() as { count: number };

    return {
      total_items: total.count,
      by_table: Object.fromEntries(byTable.map(item => [item.original_table, item.count])),
      by_user: Object.fromEntries(byUser.map(item => [item.deleted_by_name, item.count])),
      expiring_soon: expiringSoon.count,
      restorable: restorable.count,
      permanent: permanent.count
    };
  }

  async getDeletedRecord(deletedRecordId: string): Promise<DeletedRecord | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM stock_deleted_records WHERE id = ?
    `);
    
    const result = stmt.get(deletedRecordId) as any;
    
    if (result) {
      result.original_data = JSON.parse(result.original_data);
    }
    
    return result;
  }

  // ==================================================================
  // عمليات الاسترداد
  // ==================================================================

  async restoreRecord(deletedRecordId: string, restoredBy: string): Promise<RestoreResult> {
    const deletedRecord = await this.getDeletedRecord(deletedRecordId);
    
    if (!deletedRecord) {
      return { success: false, error: 'السجل المحذوف غير موجود' };
    }

    if (!deletedRecord.can_restore) {
      return { success: false, error: 'هذا السجل لا يمكن استرداده' };
    }

    // فحص التعارضات
    const conflicts = await this.checkRestoreConflicts(deletedRecord);
    if (conflicts.length > 0) {
      return { success: false, error: 'يوجد تعارضات تمنع الاسترداد', conflicts };
    }

    try {
      const transaction = this.db.transaction(() => {
        const restoredId = this.restoreToOriginalTable(deletedRecord);
        
        // تحديث سجل المحذوفات
        this.db.prepare(`
          UPDATE stock_deleted_records 
          SET restored_at = CURRENT_TIMESTAMP, restored_by = ?, can_restore = 0
          WHERE id = ?
        `).run(restoredBy, deletedRecordId);

        // تسجيل عملية الاسترداد
        this.logRestoreAudit(deletedRecord.original_table, restoredId, restoredBy);

        return restoredId;
      });

      const restoredId = transaction();
      return { success: true, restored_id: restoredId };
      
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async checkRestoreConflicts(deletedRecord: DeletedRecord): Promise<string[]> {
    const conflicts: string[] = [];
    const { original_table, original_data } = deletedRecord;

    switch (original_table) {
      case 'warehouses':
        // فحص تعارض كود المخزن
        const warehouseConflict = this.db.prepare(`
          SELECT COUNT(*) as count FROM warehouses WHERE code = ?
        `).get(original_data.code) as { count: number };
        
        if (warehouseConflict.count > 0) {
          conflicts.push(`يوجد مخزن آخر بنفس الكود: ${original_data.code}`);
        }
        break;

      case 'products':
        // فحص تعارض كود المنتج
        const productConflict = this.db.prepare(`
          SELECT COUNT(*) as count FROM products WHERE code = ?
        `).get(original_data.code) as { count: number };
        
        if (productConflict.count > 0) {
          conflicts.push(`يوجد منتج آخر بنفس الكود: ${original_data.code}`);
        }

        // فحص الباركود إذا كان موجوداً
        if (original_data.barcode) {
          const barcodeConflict = this.db.prepare(`
            SELECT COUNT(*) as count FROM products WHERE barcode = ?
          `).get(original_data.barcode) as { count: number };
          
          if (barcodeConflict.count > 0) {
            conflicts.push(`يوجد منتج آخر بنفس الباركود: ${original_data.barcode}`);
          }
        }
        break;

      case 'stock_requests':
        // فحص تعارض رقم الطلب
        const requestConflict = this.db.prepare(`
          SELECT COUNT(*) as count FROM stock_requests WHERE request_number = ?
        `).get(original_data.request_number) as { count: number };
        
        if (requestConflict.count > 0) {
          conflicts.push(`يوجد طلب آخر بنفس الرقم: ${original_data.request_number}`);
        }
        break;
    }

    return conflicts;
  }

  private restoreToOriginalTable(deletedRecord: DeletedRecord): string {
    const { original_table, original_data } = deletedRecord;
    const data = original_data;

    switch (original_table) {
      case 'stock_requests':
        return this.restoreStockRequest(data);
        
      case 'warehouses':
        return this.restoreWarehouse(data);
        
      case 'products':
        return this.restoreProduct(data);
        
      default:
        return this.restoreGenericRecord(original_table, data);
    }
  }

  private restoreStockRequest(data: any): string {
    // إعادة إدراج الطلب الرئيسي
    const requestFields = Object.keys(data).filter(key => key !== 'id');
    const requestValues = requestFields.map(field => data[field]);
    const placeholders = requestFields.map(() => '?').join(',');

    const stmt = this.db.prepare(`
      INSERT INTO stock_requests (${requestFields.join(',')})
      VALUES (${placeholders})
      RETURNING id
    `);

    const result = stmt.get(...requestValues) as { id: string };
    return result.id;
  }

  private restoreWarehouse(data: any): string {
    const fields = Object.keys(data).filter(key => key !== 'id');
    const values = fields.map(field => data[field]);
    const placeholders = fields.map(() => '?').join(',');

    const stmt = this.db.prepare(`
      INSERT INTO warehouses (${fields.join(',')})
      VALUES (${placeholders})
      RETURNING id
    `);

    const result = stmt.get(...values) as { id: string };
    return result.id;
  }

  private restoreProduct(data: any): string {
    const fields = Object.keys(data).filter(key => key !== 'id');
    const values = fields.map(field => data[field]);
    const placeholders = fields.map(() => '?').join(',');

    const stmt = this.db.prepare(`
      INSERT INTO products (${fields.join(',')})
      VALUES (${placeholders})
      RETURNING id
    `);

    const result = stmt.get(...values) as { id: string };
    return result.id;
  }

  private restoreGenericRecord(tableName: string, data: any): string {
    const fields = Object.keys(data).filter(key => key !== 'id');
    const values = fields.map(field => data[field]);
    const placeholders = fields.map(() => '?').join(',');

    const stmt = this.db.prepare(`
      INSERT INTO ${tableName} (${fields.join(',')})
      VALUES (${placeholders})
      RETURNING id
    `);

    const result = stmt.get(...values) as { id: string };
    return result.id;
  }

  private logRestoreAudit(tableName: string, recordId: string, restoredBy: string): void {
    const stmt = this.db.prepare(`
      INSERT INTO stock_audit_log (
        table_name, record_id, action, user_id, user_name,
        old_values, new_values, changed_fields
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      tableName,
      recordId,
      'RESTORE',
      restoredBy,
      'system',
      JSON.stringify({ status: 'deleted' }),
      JSON.stringify({ status: 'restored' }),
      'status'
    );
  }

  // ==================================================================
  // عمليات التنظيف والصيانة
  // ==================================================================

  async permanentDelete(deletedRecordId: string, deletedBy: string, reason: string): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE stock_deleted_records 
      SET can_restore = 0, deletion_reason = ?
      WHERE id = ?
    `);

    stmt.run(`${reason} (حذف نهائي بواسطة ${deletedBy})`, deletedRecordId);
  }

  async cleanupExpiredRecords(): Promise<number> {
    const expiredRecords = this.db.prepare(`
      SELECT id, original_table, original_id
      FROM stock_deleted_records
      WHERE DATE(auto_delete_date) < DATE('now')
        AND can_restore = 1
    `).all() as Array<{ id: string; original_table: string; original_id: string }>;

    if (expiredRecords.length === 0) {
      return 0;
    }

    const transaction = this.db.transaction(() => {
      expiredRecords.forEach(record => {
        // تحديث السجل ليصبح غير قابل للاسترداد
        this.db.prepare(`
          UPDATE stock_deleted_records 
          SET can_restore = 0, deletion_reason = deletion_reason || ' (منتهي الصلاحية)'
          WHERE id = ?
        `).run(record.id);

        // تسجيل العملية
        this.db.prepare(`
          INSERT INTO stock_audit_log (
            table_name, record_id, action, user_id, user_name,
            old_values, new_values
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          record.original_table,
          record.original_id,
          'EXPIRED',
          'system',
          'system',
          JSON.stringify({ can_restore: true }),
          JSON.stringify({ can_restore: false })
        );
      });
    });

    transaction();
    return expiredRecords.length;
  }

  async emptyTrash(olderThanDays: number = 90): Promise<number> {
    const stmt = this.db.prepare(`
      DELETE FROM stock_deleted_records
      WHERE DATE(deleted_at) < DATE('now', '-' || ? || ' days')
        AND can_restore = 0
    `);

    const result = stmt.run(olderThanDays);
    return result.changes;
  }

  // ==================================================================
  // إحصائيات وتقارير
  // ==================================================================

  async getDeletionTrends(days: number = 30): Promise<Array<{
    date: string;
    total_deletions: number;
    by_table: Record<string, number>;
  }>> {
    const stmt = this.db.prepare(`
      SELECT 
        DATE(deleted_at) as date,
        original_table,
        COUNT(*) as count
      FROM stock_deleted_records
      WHERE DATE(deleted_at) >= DATE('now', '-' || ? || ' days')
      GROUP BY DATE(deleted_at), original_table
      ORDER BY date DESC
    `);

    const results = stmt.all(days) as Array<{
      date: string;
      original_table: string;
      count: number;
    }>;

    // تجميع البيانات حسب التاريخ
    const trendsMap = new Map<string, { date: string; total_deletions: number; by_table: Record<string, number> }>();

    results.forEach(row => {
      if (!trendsMap.has(row.date)) {
        trendsMap.set(row.date, {
          date: row.date,
          total_deletions: 0,
          by_table: {}
        });
      }

      const trend = trendsMap.get(row.date)!;
      trend.total_deletions += row.count;
      trend.by_table[row.original_table] = row.count;
    });

    return Array.from(trendsMap.values());
  }

  async getUserDeletionStats(userId: string): Promise<{
    total_deletions: number;
    by_table: Record<string, number>;
    recent_deletions: DeletedRecord[];
  }> {
    // العدد الإجمالي
    const total = this.db.prepare(`
      SELECT COUNT(*) as count FROM stock_deleted_records WHERE deleted_by = ?
    `).get(userId) as { count: number };

    // حسب الجدول
    const byTable = this.db.prepare(`
      SELECT original_table, COUNT(*) as count
      FROM stock_deleted_records
      WHERE deleted_by = ?
      GROUP BY original_table
    `).all(userId) as Array<{ original_table: string; count: number }>;

    // العمليات الأخيرة
    const recent = await this.getTrashItems({
      deleted_by: userId,
      limit: 10
    });

    return {
      total_deletions: total.count,
      by_table: Object.fromEntries(byTable.map(item => [item.original_table, item.count])),
      recent_deletions: recent
    };
  }
}

// تصدير نسخة واحدة من الخدمة
export const stockTrashService = StockTrashService.getInstance();