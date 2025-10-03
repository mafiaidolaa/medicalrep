/**
 * 🏭 EP Group System - Stock Security & Permissions Management
 * نظام إدارة صلاحيات المخازن والأمان
 */

import { getOptimizedDb } from '../database/optimized-db';
import type { Database } from 'better-sqlite3';

// ==================================================================
// أنواع الصلاحيات والأدوار
// ==================================================================

export interface StockRole {
  id: string;
  name: string;
  name_ar: string;
  description: string;
  approval_limit: number;
  is_system_role: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockPermission {
  id: string;
  name: string;
  name_ar: string;
  description: string;
  category: string;
  resource: string;
  action: string;
  is_system_permission: boolean;
}

export interface PermissionCheck {
  hasPermission: boolean;
  reason?: string;
  requiresApproval?: boolean;
  maxValue?: number;
}

// ==================================================================
// خدمة إدارة الصلاحيات الرئيسية
// ==================================================================

export class StockSecurityService {
  private db: Database;
  private static instance: StockSecurityService;
  private permissionCache: Map<string, any> = new Map();
  private cacheExpiry: Map<string, number> = new Map();

  constructor() {
    this.db = getOptimizedDb();
  }

  static getInstance(): StockSecurityService {
    if (!StockSecurityService.instance) {
      StockSecurityService.instance = new StockSecurityService();
    }
    return StockSecurityService.instance;
  }

  // ==================================================================
  // فحص الصلاحيات الأساسية
  // ==================================================================

  async checkPermission(
    userId: string,
    resource: string,
    action: string,
    warehouseId?: string,
    value?: number
  ): Promise<PermissionCheck> {
    // فحص الصلاحيات من user_warehouse_permissions
    let query = `
      SELECT uwp.*, w.name_ar as warehouse_name
      FROM user_warehouse_permissions uwp
      LEFT JOIN warehouses w ON uwp.warehouse_id = w.id
      WHERE uwp.user_id = ?
    `;
    
    const params: any[] = [userId];
    
    if (warehouseId) {
      query += ' AND uwp.warehouse_id = ?';
      params.push(warehouseId);
    }

    const permissions = this.db.prepare(query).get(...params) as any;

    if (!permissions) {
      return {
        hasPermission: false,
        reason: `لا تملك صلاحية الوصول ${warehouseId ? 'لهذا المخزن' : 'لأي مخزن'}`
      };
    }

    // خريطة الصلاحيات
    const permissionMap: Record<string, string> = {
      'warehouse_view': 'can_view',
      'request_create': 'can_create_requests',
      'request_approve': 'can_approve_requests',
      'stock_issue': 'can_issue_items',
      'stock_receive': 'can_receive_items',
      'stock_manage': 'can_manage_stock',
      'report_view': 'can_view_reports'
    };

    const permissionField = permissionMap[`${resource}_${action}`];
    
    if (!permissionField || !permissions[permissionField]) {
      return {
        hasPermission: false,
        reason: `لا تملك صلاحية ${action} للمورد ${resource}`
      };
    }

    // فحص حدود الموافقة
    if (action === 'approve' && value && !permissions.is_warehouse_manager) {
      const approvalLimit = this.getApprovalLimit(permissions);
      if (value > approvalLimit) {
        return {
          hasPermission: false,
          reason: `القيمة (${value}) تتجاوز حد الموافقة المسموح (${approvalLimit})`,
          requiresApproval: true,
          maxValue: approvalLimit
        };
      }
    }

    return { hasPermission: true };
  }

  private getApprovalLimit(permissions: any): number {
    if (permissions.is_warehouse_manager) return 999999999; // بلا حدود للمدراء
    if (permissions.can_approve_requests) return 50000;
    return 0;
  }

  // ==================================================================
  // صلاحيات محددة للعمليات
  // ==================================================================

  async canCreateRequest(userId: string, warehouseId: string): Promise<PermissionCheck> {
    return this.checkPermission(userId, 'request', 'create', warehouseId);
  }

  async canApproveRequest(userId: string, warehouseId: string, totalValue: number): Promise<PermissionCheck> {
    return this.checkPermission(userId, 'request', 'approve', warehouseId, totalValue);
  }

  async canIssueItems(userId: string, warehouseId: string): Promise<PermissionCheck> {
    return this.checkPermission(userId, 'stock', 'issue', warehouseId);
  }

  async canManageStock(userId: string, warehouseId: string): Promise<PermissionCheck> {
    return this.checkPermission(userId, 'stock', 'manage', warehouseId);
  }

  async canViewReports(userId: string, warehouseId: string): Promise<PermissionCheck> {
    return this.checkPermission(userId, 'report', 'view', warehouseId);
  }

  async canDeleteRequest(userId: string, warehouseId: string, requestOwnerId: string): Promise<PermissionCheck> {
    // يمكن حذف الطلب إذا كان المستخدم:
    // 1. مدير المخزن
    // 2. صاحب الطلب (إذا كان الطلب معلق)
    
    const permissions = await this.getUserWarehousePermissions(userId, warehouseId);
    
    if (permissions?.is_warehouse_manager) {
      return { hasPermission: true };
    }
    
    if (userId === requestOwnerId) {
      return { hasPermission: true };
    }

    return {
      hasPermission: false,
      reason: 'لا يمكنك حذف طلبات المستخدمين الآخرين'
    };
  }

  // ==================================================================
  // إدارة المخازن المتاحة للمستخدم
  // ==================================================================

  async getUserWarehouses(userId: string): Promise<Array<{
    id: string;
    name_ar: string;
    code: string;
    permissions: any;
  }>> {
    const stmt = this.db.prepare(`
      SELECT 
        w.id, w.name_ar, w.code,
        uwp.can_view, uwp.can_create_requests, uwp.can_approve_requests,
        uwp.can_issue_items, uwp.can_receive_items, uwp.can_manage_stock,
        uwp.can_view_reports, uwp.is_warehouse_manager,
        uwp.assigned_at
      FROM user_warehouse_permissions uwp
      JOIN warehouses w ON uwp.warehouse_id = w.id
      WHERE uwp.user_id = ? AND uwp.can_view = 1 AND w.is_active = 1
      ORDER BY uwp.is_warehouse_manager DESC, w.name_ar
    `);

    const results = stmt.all(userId) as any[];
    
    return results.map(row => ({
      id: row.id,
      name_ar: row.name_ar,
      code: row.code,
      permissions: {
        can_view: row.can_view === 1,
        can_create_requests: row.can_create_requests === 1,
        can_approve_requests: row.can_approve_requests === 1,
        can_issue_items: row.can_issue_items === 1,
        can_receive_items: row.can_receive_items === 1,
        can_manage_stock: row.can_manage_stock === 1,
        can_view_reports: row.can_view_reports === 1,
        is_warehouse_manager: row.is_warehouse_manager === 1
      }
    }));
  }

  async getUserWarehousePermissions(userId: string, warehouseId: string): Promise<any> {
    const stmt = this.db.prepare(`
      SELECT uwp.*, w.name_ar as warehouse_name, w.code as warehouse_code
      FROM user_warehouse_permissions uwp
      JOIN warehouses w ON uwp.warehouse_id = w.id
      WHERE uwp.user_id = ? AND uwp.warehouse_id = ?
    `);

    return stmt.get(userId, warehouseId);
  }

  async isWarehouseAccessible(userId: string, warehouseId: string): Promise<boolean> {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM user_warehouse_permissions
      WHERE user_id = ? AND warehouse_id = ? AND can_view = 1
    `);

    const result = stmt.get(userId, warehouseId) as { count: number };
    return result.count > 0;
  }

  // ==================================================================
  // إدارة الصلاحيات
  // ==================================================================

  async assignWarehousePermissions(
    userId: string,
    userName: string,
    warehouseId: string,
    permissions: {
      can_view?: boolean;
      can_create_requests?: boolean;
      can_approve_requests?: boolean;
      can_issue_items?: boolean;
      can_receive_items?: boolean;
      can_manage_stock?: boolean;
      can_view_reports?: boolean;
      is_warehouse_manager?: boolean;
    },
    assignedBy: string
  ): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO user_warehouse_permissions (
        user_id, user_name, warehouse_id,
        can_view, can_create_requests, can_approve_requests,
        can_issue_items, can_receive_items, can_manage_stock,
        can_view_reports, is_warehouse_manager, assigned_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      userId, userName, warehouseId,
      permissions.can_view ? 1 : 0,
      permissions.can_create_requests ? 1 : 0,
      permissions.can_approve_requests ? 1 : 0,
      permissions.can_issue_items ? 1 : 0,
      permissions.can_receive_items ? 1 : 0,
      permissions.can_manage_stock ? 1 : 0,
      permissions.can_view_reports ? 1 : 0,
      permissions.is_warehouse_manager ? 1 : 0,
      assignedBy
    );

    this.clearUserCache(userId);

    // تسجيل العملية
    await this.logSecurityEvent(
      assignedBy,
      'assign_permissions',
      'user_permissions',
      userId,
      `تم تعديل صلاحيات المستخدم ${userName} في المخزن ${warehouseId}`
    );
  }

  async removeWarehouseAccess(userId: string, warehouseId: string, removedBy: string): Promise<void> {
    const stmt = this.db.prepare(`
      DELETE FROM user_warehouse_permissions
      WHERE user_id = ? AND warehouse_id = ?
    `);

    stmt.run(userId, warehouseId);
    this.clearUserCache(userId);

    // تسجيل العملية
    await this.logSecurityEvent(
      removedBy,
      'remove_access',
      'user_permissions',
      userId,
      `تم إزالة الوصول للمخزن ${warehouseId}`
    );
  }

  // ==================================================================
  // الأدوار المعرفة مسبقاً
  // ==================================================================

  getStandardRoles(): Array<{
    name: string;
    name_ar: string;
    description: string;
    permissions: Record<string, boolean>;
    approval_limit: number;
  }> {
    return [
      {
        name: 'warehouse_manager',
        name_ar: 'مدير المخزن',
        description: 'صلاحيات كاملة لإدارة المخزن',
        approval_limit: 0, // بلا حدود
        permissions: {
          can_view: true,
          can_create_requests: true,
          can_approve_requests: true,
          can_issue_items: true,
          can_receive_items: true,
          can_manage_stock: true,
          can_view_reports: true,
          is_warehouse_manager: true
        }
      },
      {
        name: 'stock_supervisor',
        name_ar: 'مشرف المخزون',
        description: 'إشراف على حركات المخزون والطلبات',
        approval_limit: 50000,
        permissions: {
          can_view: true,
          can_create_requests: true,
          can_approve_requests: true,
          can_issue_items: true,
          can_receive_items: true,
          can_manage_stock: true,
          can_view_reports: true,
          is_warehouse_manager: false
        }
      },
      {
        name: 'stock_clerk',
        name_ar: 'أمين مخزن',
        description: 'تنفيذ عمليات الصرف والاستلام',
        approval_limit: 0,
        permissions: {
          can_view: true,
          can_create_requests: true,
          can_approve_requests: false,
          can_issue_items: true,
          can_receive_items: true,
          can_manage_stock: false,
          can_view_reports: true,
          is_warehouse_manager: false
        }
      },
      {
        name: 'department_user',
        name_ar: 'مستخدم القسم',
        description: 'إنشاء طلبات واستعلام عن المخزون',
        approval_limit: 0,
        permissions: {
          can_view: true,
          can_create_requests: true,
          can_approve_requests: false,
          can_issue_items: false,
          can_receive_items: false,
          can_manage_stock: false,
          can_view_reports: true,
          is_warehouse_manager: false
        }
      },
      {
        name: 'viewer',
        name_ar: 'مستعرض',
        description: 'عرض البيانات فقط بدون تعديل',
        approval_limit: 0,
        permissions: {
          can_view: true,
          can_create_requests: false,
          can_approve_requests: false,
          can_issue_items: false,
          can_receive_items: false,
          can_manage_stock: false,
          can_view_reports: true,
          is_warehouse_manager: false
        }
      }
    ];
  }

  async assignStandardRole(
    userId: string,
    userName: string,
    warehouseId: string,
    roleName: string,
    assignedBy: string
  ): Promise<void> {
    const roles = this.getStandardRoles();
    const role = roles.find(r => r.name === roleName);
    
    if (!role) {
      throw new Error(`الدور ${roleName} غير موجود`);
    }

    await this.assignWarehousePermissions(
      userId,
      userName,
      warehouseId,
      role.permissions,
      assignedBy
    );
  }

  // ==================================================================
  // تسجيل العمليات الأمنية
  // ==================================================================

  async logSecurityEvent(
    userId: string,
    action: string,
    resource: string,
    resourceId: string,
    details: string,
    success: boolean = true,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO stock_audit_log (
        table_name, record_id, action, user_id, user_name,
        old_values, new_values, user_ip, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const eventData = {
      resource,
      success,
      details,
      timestamp: new Date().toISOString()
    };

    stmt.run(
      'security_log',
      resourceId,
      action,
      userId,
      'system',
      JSON.stringify({ action: action, success: !success }),
      JSON.stringify(eventData),
      ipAddress || '',
      userAgent || ''
    );
  }

  async getSecurityLog(filters?: {
    user_id?: string;
    action?: string;
    from_date?: string;
    to_date?: string;
    limit?: number;
  }): Promise<any[]> {
    let query = `
      SELECT *
      FROM stock_audit_log
      WHERE table_name = 'security_log'
    `;
    const params: any[] = [];

    if (filters?.user_id) {
      query += ' AND user_id = ?';
      params.push(filters.user_id);
    }

    if (filters?.action) {
      query += ' AND action = ?';
      params.push(filters.action);
    }

    if (filters?.from_date) {
      query += ' AND DATE(created_at) >= ?';
      params.push(filters.from_date);
    }

    if (filters?.to_date) {
      query += ' AND DATE(created_at) <= ?';
      params.push(filters.to_date);
    }

    query += ' ORDER BY created_at DESC';

    if (filters?.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  // ==================================================================
  // إحصائيات الصلاحيات
  // ==================================================================

  async getPermissionStats(): Promise<{
    totalUsers: number;
    warehouseManagers: number;
    supervisors: number;
    departmentUsers: number;
    viewersOnly: number;
    warehousesCount: number;
  }> {
    const stats = this.db.prepare(`
      SELECT 
        COUNT(DISTINCT user_id) as totalUsers,
        COUNT(CASE WHEN is_warehouse_manager = 1 THEN 1 END) as warehouseManagers,
        COUNT(CASE WHEN can_approve_requests = 1 AND is_warehouse_manager = 0 THEN 1 END) as supervisors,
        COUNT(CASE WHEN can_create_requests = 1 AND can_approve_requests = 0 AND is_warehouse_manager = 0 THEN 1 END) as departmentUsers,
        COUNT(CASE WHEN can_view = 1 AND can_create_requests = 0 THEN 1 END) as viewersOnly,
        COUNT(DISTINCT warehouse_id) as warehousesCount
      FROM user_warehouse_permissions
    `).get() as any;

    return stats;
  }

  async getUsersByWarehouse(warehouseId: string): Promise<Array<{
    user_id: string;
    user_name: string;
    role_type: string;
    permissions: any;
    assigned_at: string;
  }>> {
    const stmt = this.db.prepare(`
      SELECT 
        uwp.*,
        CASE 
          WHEN is_warehouse_manager = 1 THEN 'مدير المخزن'
          WHEN can_approve_requests = 1 THEN 'مشرف'
          WHEN can_issue_items = 1 THEN 'أمين مخزن'
          WHEN can_create_requests = 1 THEN 'مستخدم قسم'
          ELSE 'مستعرض'
        END as role_type
      FROM user_warehouse_permissions uwp
      WHERE uwp.warehouse_id = ?
      ORDER BY uwp.is_warehouse_manager DESC, uwp.assigned_at ASC
    `);

    const results = stmt.all(warehouseId) as any[];
    
    return results.map(row => ({
      user_id: row.user_id,
      user_name: row.user_name,
      role_type: row.role_type,
      permissions: {
        can_view: row.can_view === 1,
        can_create_requests: row.can_create_requests === 1,
        can_approve_requests: row.can_approve_requests === 1,
        can_issue_items: row.can_issue_items === 1,
        can_receive_items: row.can_receive_items === 1,
        can_manage_stock: row.can_manage_stock === 1,
        can_view_reports: row.can_view_reports === 1,
        is_warehouse_manager: row.is_warehouse_manager === 1
      },
      assigned_at: row.assigned_at
    }));
  }

  // ==================================================================
  // middleware للتحقق من الصلاحيات
  // ==================================================================

  createPermissionMiddleware(resource: string, action: string, warehouseIdFromParams?: string) {
    return async (req: any, res: any, next: any) => {
      const userId = req.user?.id;
      const warehouseId = warehouseIdFromParams ? req.params[warehouseIdFromParams] : req.body.warehouse_id;
      
      if (!userId) {
        return res.status(401).json({ error: 'غير مخول للوصول' });
      }

      const permissionCheck = await this.checkPermission(userId, resource, action, warehouseId);
      
      if (!permissionCheck.hasPermission) {
        return res.status(403).json({ 
          error: 'ليس لديك صلاحية لهذه العملية',
          reason: permissionCheck.reason
        });
      }

      req.permissions = permissionCheck;
      next();
    };
  }

  // ==================================================================
  // دوال مساعدة
  // ==================================================================

  private clearUserCache(userId: string): void {
    for (const key of this.permissionCache.keys()) {
      if (key.startsWith(userId)) {
        this.permissionCache.delete(key);
        this.cacheExpiry.delete(key);
      }
    }
  }

  async validateWarehouseAccess(userId: string, warehouseId: string): Promise<boolean> {
    return this.isWarehouseAccessible(userId, warehouseId);
  }

  async getUserRole(userId: string, warehouseId: string): Promise<string> {
    const permissions = await this.getUserWarehousePermissions(userId, warehouseId);
    
    if (!permissions) return 'no_access';
    if (permissions.is_warehouse_manager) return 'warehouse_manager';
    if (permissions.can_approve_requests) return 'supervisor';
    if (permissions.can_issue_items) return 'clerk';
    if (permissions.can_create_requests) return 'department_user';
    if (permissions.can_view) return 'viewer';
    
    return 'no_access';
  }
}

// تصدير نسخة واحدة من الخدمة
export const stockSecurityService = StockSecurityService.getInstance();