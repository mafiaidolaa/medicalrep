/**
 * 🏭 EP Group System - Stock Permissions Management
 * نظام إدارة صلاحيات المخازن والأمان
 */

import { getOptimizedDb } from '../database/optimized-db';
import type { Database } from 'better-sqlite3';
import type { UserWarehousePermissions } from './stock-management-service';

// ==================================================================
// أنواع الصلاحيات والأدوار
// ==================================================================

export interface StockRole {
  id: string;
  name: string;
  name_ar: string;
  description: string;
  permissions: StockPermission[];
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
  resource: string; // warehouse, product, request, movement, report
  action: string; // view, create, update, delete, approve, issue, receive
  is_system_permission: boolean;
}

export interface UserStockRole {
  id: string;
  user_id: string;
  user_name: string;
  role_id: string;
  warehouse_id?: string; // null للصلاحيات العامة
  assigned_by: string;
  assigned_at: string;
  expires_at?: string;
  is_active: boolean;
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

export class StockPermissionService {
  private db: Database;
  private static instance: StockPermissionService;
  private permissionCache: Map<string, StockPermission[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();

  constructor() {
    this.db = getOptimizedDb();
  }

  static getInstance(): StockPermissionService {
    if (!StockPermissionService.instance) {
      StockPermissionService.instance = new StockPermissionService();
    }
    return StockPermissionService.instance;
  }

  // ==================================================================
  // إدارة الأدوار (Role Management)
  // ==================================================================

  async createRole(role: Omit<StockRole, 'id' | 'created_at' | 'updated_at'>): Promise<StockRole> {
    const stmt = this.db.prepare(`
      INSERT INTO stock_roles (name, name_ar, description, is_system_role, is_active)
      VALUES (?, ?, ?, ?, ?)
      RETURNING *
    `);

    return stmt.get(
      role.name,
      role.name_ar,
      role.description,
      role.is_system_role ? 1 : 0,
      role.is_active ? 1 : 0
    ) as StockRole;
  }

  async getSystemRoles(): Promise<StockRole[]> {
    const stmt = this.db.prepare(`
      SELECT sr.*,
        GROUP_CONCAT(sp.name) as permission_names
      FROM stock_roles sr
      LEFT JOIN role_permissions rp ON sr.id = rp.role_id
      LEFT JOIN stock_permissions sp ON rp.permission_id = sp.id
      WHERE sr.is_system_role = 1 AND sr.is_active = 1
      GROUP BY sr.id
      ORDER BY sr.name_ar
    `);

    return stmt.all() as StockRole[];
  }

  async assignRoleToUser(
    userId: string,
    userName: string,
    roleId: string,
    warehouseId?: string,
    assignedBy: string,
    expiresAt?: string
  ): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO user_stock_roles (
        user_id, user_name, role_id, warehouse_id, assigned_by, expires_at, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, 1)
    `);

    stmt.run(userId, userName, roleId, warehouseId, assignedBy, expiresAt);
    this.clearUserCache(userId);
  }

  async removeRoleFromUser(userId: string, roleId: string, warehouseId?: string): Promise<void> {
    let query = 'UPDATE user_stock_roles SET is_active = 0 WHERE user_id = ? AND role_id = ?';
    const params: any[] = [userId, roleId];

    if (warehouseId) {
      query += ' AND warehouse_id = ?';
      params.push(warehouseId);
    }

    const stmt = this.db.prepare(query);
    stmt.run(...params);
    this.clearUserCache(userId);
  }

  // ==================================================================
  // إدارة الصلاحيات (Permission Management)
  // ==================================================================

  async getSystemPermissions(): Promise<StockPermission[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM stock_permissions
      WHERE is_system_permission = 1
      ORDER BY category, name_ar
    `);

    return stmt.all() as StockPermission[];
  }

  async getUserPermissions(userId: string, warehouseId?: string): Promise<StockPermission[]> {
    const cacheKey = `${userId}_${warehouseId || 'global'}`;
    
    // التحقق من الكاش
    if (this.permissionCache.has(cacheKey) && 
        this.cacheExpiry.get(cacheKey)! > Date.now()) {
      return this.permissionCache.get(cacheKey)!;
    }

    let query = `
      SELECT DISTINCT sp.*
      FROM stock_permissions sp
      JOIN role_permissions rp ON sp.id = rp.permission_id
      JOIN user_stock_roles usr ON rp.role_id = usr.role_id
      WHERE usr.user_id = ? 
        AND usr.is_active = 1
        AND (usr.expires_at IS NULL OR usr.expires_at > CURRENT_TIMESTAMP)
    `;
    const params: any[] = [userId];

    if (warehouseId) {
      query += ' AND (usr.warehouse_id = ? OR usr.warehouse_id IS NULL)';
      params.push(warehouseId);
    }

    query += ' ORDER BY sp.category, sp.name_ar';

    const stmt = this.db.prepare(query);
    const permissions = stmt.all(...params) as StockPermission[];

    // حفظ في الكاش لمدة 5 دقائق
    this.permissionCache.set(cacheKey, permissions);
    this.cacheExpiry.set(cacheKey, Date.now() + 5 * 60 * 1000);

    return permissions;
  }

  // ==================================================================
  // فحص الصلاحيات (Permission Checking)
  // ==================================================================

  async checkPermission(
    userId: string,
    resource: string,
    action: string,
    warehouseId?: string,
    value?: number
  ): Promise<PermissionCheck> {
    const permissions = await this.getUserPermissions(userId, warehouseId);
    const permissionName = `${resource}_${action}`;
    
    const hasPermission = permissions.some(p => p.name === permissionName);
    
    if (!hasPermission) {
      return {
        hasPermission: false,
        reason: `لا تملك صلاحية ${action} للمورد ${resource}`
      };
    }

    // فحص القيود الإضافية للصلاحيات الحساسة
    if (action === 'approve' && value) {
      const approvalLimit = await this.getUserApprovalLimit(userId, warehouseId);
      if (approvalLimit > 0 && value > approvalLimit) {
        return {
          hasPermission: false,
          reason: `القيمة تتجاوز حد الموافقة المسموح (${approvalLimit} جنيه)`,
          requiresApproval: true,
          maxValue: approvalLimit
        };
      }
    }

    return { hasPermission: true };
  }

  async canCreateRequest(userId: string, warehouseId: string, totalValue?: number): Promise<PermissionCheck> {
    return this.checkPermission(userId, 'request', 'create', warehouseId, totalValue);
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

  async canViewReports(userId: string, warehouseId?: string): Promise<PermissionCheck> {
    return this.checkPermission(userId, 'report', 'view', warehouseId);
  }

  // ==================================================================
  // إدارة المخازن المخصصة للمستخدم
  // ==================================================================

  async getUserWarehouses(userId: string): Promise<string[]> {
    const stmt = this.db.prepare(`
      SELECT DISTINCT warehouse_id
      FROM user_stock_roles
      WHERE user_id = ? AND is_active = 1 AND warehouse_id IS NOT NULL
      UNION
      SELECT warehouse_id
      FROM user_warehouse_permissions
      WHERE user_id = ? AND can_view = 1
    `);

    const results = stmt.all(userId, userId) as { warehouse_id: string }[];
    return results.map(r => r.warehouse_id);
  }

  async isWarehouseAccessible(userId: string, warehouseId: string): Promise<boolean> {
    // أولاً: فحص الأدوار العامة (بدون مخزن محدد)
    const globalRoleCount = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM user_stock_roles
      WHERE user_id = ? AND warehouse_id IS NULL AND is_active = 1
    `).get(userId) as { count: number };

    if (globalRoleCount.count > 0) {
      return true; // صلاحية عامة لجميع المخازن
    }

    // ثانياً: فحص الصلاحيات المحددة للمخزن
    const warehouseRoleCount = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM user_stock_roles
      WHERE user_id = ? AND warehouse_id = ? AND is_active = 1
    `).get(userId, warehouseId) as { count: number };

    if (warehouseRoleCount.count > 0) {
      return true;
    }

    // ثالثاً: فحص الصلاحيات القديمة (للتوافق مع النظام السابق)
    const legacyPermissionCount = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM user_warehouse_permissions
      WHERE user_id = ? AND warehouse_id = ? AND can_view = 1
    `).get(userId, warehouseId) as { count: number };

    return legacyPermissionCount.count > 0;
  }

  // ==================================================================
  // حدود الموافقة (Approval Limits)
  // ==================================================================

  async getUserApprovalLimit(userId: string, warehouseId?: string): Promise<number> {
    // الحصول على أعلى حد موافقة من جميع الأدوار المخصصة للمستخدم
    let query = `
      SELECT MAX(sr.approval_limit) as max_limit
      FROM user_stock_roles usr
      JOIN stock_roles sr ON usr.role_id = sr.id
      WHERE usr.user_id = ? AND usr.is_active = 1
    `;
    const params: any[] = [userId];

    if (warehouseId) {
      query += ' AND (usr.warehouse_id = ? OR usr.warehouse_id IS NULL)';
      params.push(warehouseId);
    }

    const result = this.db.prepare(query).get(...params) as { max_limit: number | null };
    return result.max_limit || 0;
  }

  async setUserApprovalLimit(userId: string, warehouseId: string, limit: number, setBy: string): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO user_approval_limits (
        user_id, warehouse_id, approval_limit, set_by, set_at
      ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    stmt.run(userId, warehouseId, limit, setBy);
    this.clearUserCache(userId);
  }

  // ==================================================================
  // تسجيل العمليات الأمنية (Security Audit)
  // ==================================================================

  async logSecurityEvent(
    userId: string,
    action: string,
    resource: string,
    resourceId: string,
    details: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO stock_security_log (
        user_id, action, resource, resource_id, details, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(userId, action, resource, resourceId, details, ipAddress, userAgent);
  }

  async getSecurityLog(filters?: {
    user_id?: string;
    action?: string;
    resource?: string;
    from_date?: string;
    to_date?: string;
    limit?: number;
  }): Promise<any[]> {
    let query = `
      SELECT ssl.*, u.name as user_name
      FROM stock_security_log ssl
      LEFT JOIN users u ON ssl.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.user_id) {
      query += ' AND ssl.user_id = ?';
      params.push(filters.user_id);
    }

    if (filters?.action) {
      query += ' AND ssl.action = ?';
      params.push(filters.action);
    }

    if (filters?.resource) {
      query += ' AND ssl.resource = ?';
      params.push(filters.resource);
    }

    if (filters?.from_date) {
      query += ' AND DATE(ssl.created_at) >= ?';
      params.push(filters.from_date);
    }

    if (filters?.to_date) {
      query += ' AND DATE(ssl.created_at) <= ?';
      params.push(filters.to_date);
    }

    query += ' ORDER BY ssl.created_at DESC';

    if (filters?.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  // ==================================================================
  // إدارة الجلسات والأمان
  // ==================================================================

  async createUserSession(userId: string, warehouseId?: string, ipAddress?: string): Promise<string> {
    const sessionId = this.generateSessionId();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 ساعات

    const stmt = this.db.prepare(`
      INSERT INTO user_sessions (
        session_id, user_id, warehouse_id, ip_address, expires_at, is_active
      ) VALUES (?, ?, ?, ?, ?, 1)
    `);

    stmt.run(sessionId, userId, warehouseId, ipAddress, expiresAt.toISOString());
    return sessionId;
  }

  async validateSession(sessionId: string): Promise<{ valid: boolean; userId?: string; warehouseId?: string }> {
    const stmt = this.db.prepare(`
      SELECT user_id, warehouse_id, expires_at
      FROM user_sessions
      WHERE session_id = ? AND is_active = 1
    `);

    const session = stmt.get(sessionId) as { user_id: string; warehouse_id?: string; expires_at: string } | undefined;

    if (!session) {
      return { valid: false };
    }

    if (new Date(session.expires_at) < new Date()) {
      // الجلسة منتهية الصلاحية
      this.invalidateSession(sessionId);
      return { valid: false };
    }

    return {
      valid: true,
      userId: session.user_id,
      warehouseId: session.warehouse_id
    };
  }

  async invalidateSession(sessionId: string): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE user_sessions 
      SET is_active = 0, ended_at = CURRENT_TIMESTAMP
      WHERE session_id = ?
    `);

    stmt.run(sessionId);
  }

  // ==================================================================
  // التحقق من التوقيعات الرقمية
  // ==================================================================

  async signDocument(
    userId: string,
    documentType: string,
    documentId: string,
    documentHash: string,
    signature: string
  ): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO digital_signatures (
        user_id, document_type, document_id, document_hash, signature, signed_at
      ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    stmt.run(userId, documentType, documentId, documentHash, signature);
  }

  async verifyDocumentSignature(documentType: string, documentId: string): Promise<boolean> {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM digital_signatures
      WHERE document_type = ? AND document_id = ?
    `);

    const result = stmt.get(documentType, documentId) as { count: number };
    return result.count > 0;
  }

  // ==================================================================
  // دوال مساعدة (Helper Functions)
  // ==================================================================

  private clearUserCache(userId: string): void {
    for (const key of this.permissionCache.keys()) {
      if (key.startsWith(userId)) {
        this.permissionCache.delete(key);
        this.cacheExpiry.delete(key);
      }
    }
  }

  private generateSessionId(): string {
    return 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2);
  }

  async clearExpiredSessions(): Promise<number> {
    const stmt = this.db.prepare(`
      UPDATE user_sessions 
      SET is_active = 0, ended_at = CURRENT_TIMESTAMP
      WHERE expires_at < CURRENT_TIMESTAMP AND is_active = 1
    `);

    const result = stmt.run();
    return result.changes;
  }

  // ==================================================================
  // إنشاء الأدوار والصلاحيات الافتراضية
  // ==================================================================

  async initializeSystemRolesAndPermissions(): Promise<void> {
    const transaction = this.db.transaction(() => {
      // إنشاء الصلاحيات الأساسية إذا لم تكن موجودة
      this.createSystemPermissions();
      
      // إنشاء الأدوار الأساسية
      this.createSystemRoles();
      
      // ربط الصلاحيات بالأدوار
      this.assignPermissionsToRoles();
    });

    transaction();
  }

  private createSystemPermissions(): void {
    const permissions = [
      // صلاحيات المخازن
      { name: 'warehouse_view', name_ar: 'عرض المخازن', category: 'warehouse', resource: 'warehouse', action: 'view' },
      { name: 'warehouse_create', name_ar: 'إنشاء مخزن', category: 'warehouse', resource: 'warehouse', action: 'create' },
      { name: 'warehouse_update', name_ar: 'تحديث مخزن', category: 'warehouse', resource: 'warehouse', action: 'update' },
      { name: 'warehouse_delete', name_ar: 'حذف مخزن', category: 'warehouse', resource: 'warehouse', action: 'delete' },

      // صلاحيات المنتجات
      { name: 'product_view', name_ar: 'عرض المنتجات', category: 'product', resource: 'product', action: 'view' },
      { name: 'product_create', name_ar: 'إنشاء منتج', category: 'product', resource: 'product', action: 'create' },
      { name: 'product_update', name_ar: 'تحديث منتج', category: 'product', resource: 'product', action: 'update' },
      { name: 'product_delete', name_ar: 'حذف منتج', category: 'product', resource: 'product', action: 'delete' },

      // صلاحيات الطلبات
      { name: 'request_view', name_ar: 'عرض الطلبات', category: 'request', resource: 'request', action: 'view' },
      { name: 'request_create', name_ar: 'إنشاء طلب', category: 'request', resource: 'request', action: 'create' },
      { name: 'request_update', name_ar: 'تحديث طلب', category: 'request', resource: 'request', action: 'update' },
      { name: 'request_delete', name_ar: 'حذف طلب', category: 'request', resource: 'request', action: 'delete' },
      { name: 'request_approve', name_ar: 'موافقة طلب', category: 'request', resource: 'request', action: 'approve' },

      // صلاحيات المخزون
      { name: 'stock_view', name_ar: 'عرض المخزون', category: 'stock', resource: 'stock', action: 'view' },
      { name: 'stock_manage', name_ar: 'إدارة المخزون', category: 'stock', resource: 'stock', action: 'manage' },
      { name: 'stock_issue', name_ar: 'صرف من المخزون', category: 'stock', resource: 'stock', action: 'issue' },
      { name: 'stock_receive', name_ar: 'استلام للمخزون', category: 'stock', resource: 'stock', action: 'receive' },

      // صلاحيات التقارير
      { name: 'report_view', name_ar: 'عرض التقارير', category: 'report', resource: 'report', action: 'view' },
      { name: 'report_export', name_ar: 'تصدير التقارير', category: 'report', resource: 'report', action: 'export' },

      // صلاحيات النظام
      { name: 'system_admin', name_ar: 'إدارة النظام', category: 'system', resource: 'system', action: 'admin' },
      { name: 'user_manage', name_ar: 'إدارة المستخدمين', category: 'system', resource: 'user', action: 'manage' }
    ];

    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO stock_permissions (
        name, name_ar, description, category, resource, action, is_system_permission
      ) VALUES (?, ?, ?, ?, ?, ?, 1)
    `);

    permissions.forEach(p => {
      stmt.run(p.name, p.name_ar, p.name_ar, p.category, p.resource, p.action);
    });
  }

  private createSystemRoles(): void {
    const roles = [
      {
        name: 'super_admin',
        name_ar: 'مدير النظام',
        description: 'صلاحيات كاملة لجميع عمليات النظام',
        approval_limit: 0 // بدون حدود
      },
      {
        name: 'warehouse_manager',
        name_ar: 'مدير المخزن',
        description: 'إدارة كاملة لمخزن محدد',
        approval_limit: 100000
      },
      {
        name: 'stock_supervisor',
        name_ar: 'مشرف المخزون',
        description: 'إشراف على حركات المخزون والطلبات',
        approval_limit: 50000
      },
      {
        name: 'department_user',
        name_ar: 'مستخدم قسم',
        description: 'إنشاء طلبات واستعلام عن المخزون',
        approval_limit: 10000
      },
      {
        name: 'viewer',
        name_ar: 'مستعرض',
        description: 'عرض البيانات فقط بدون تعديل',
        approval_limit: 0
      }
    ];

    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO stock_roles (
        name, name_ar, description, approval_limit, is_system_role, is_active
      ) VALUES (?, ?, ?, ?, 1, 1)
    `);

    roles.forEach(r => {
      stmt.run(r.name, r.name_ar, r.description, r.approval_limit);
    });
  }

  private assignPermissionsToRoles(): void {
    // هنا يتم ربط الصلاحيات بالأدوار حسب مستوى كل دور
    // سيتم تنفيذه بناءً على متطلبات محددة
  }
}

// تصدير نسخة واحدة من الخدمة
export const stockPermissionService = StockPermissionService.getInstance();