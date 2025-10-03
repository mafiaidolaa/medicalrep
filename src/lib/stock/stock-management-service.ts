/**
 * 🏭 EP Group System - Stock Management Service
 * خدمة إدارة المخازن المتكاملة
 * 
 * تتضمن:
 * - إدارة المخازن والمنتجات
 * - معالجة الطلبات والموافقات
 * - تتبع المخزون والحركات
 * - نظام الصلاحيات والإشعارات
 */

import { getOptimizedDb } from '../database/optimized-db';
import type { Database } from 'better-sqlite3';

// ==================================================================
// أنواع البيانات (Types)
// ==================================================================

export interface Warehouse {
  id: string;
  name: string;
  name_ar: string;
  code: string;
  description?: string;
  location?: string;
  manager_id?: string;
  manager_name?: string;
  capacity_limit: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface Product {
  id: string;
  name: string;
  name_ar: string;
  code: string;
  barcode?: string;
  description?: string;
  category?: string;
  unit: string;
  cost_price: number;
  selling_price: number;
  currency: string;
  min_stock_level: number;
  max_stock_level: number;
  reorder_level: number;
  brand?: string;
  model?: string;
  specifications?: string;
  image_path?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
}

export interface StockLevel {
  id: string;
  warehouse_id: string;
  product_id: string;
  available_quantity: number;
  reserved_quantity: number;
  total_quantity: number;
  shelf_location?: string;
  bin_location?: string;
  last_updated: string;
  updated_by?: string;
  // Relations
  warehouse?: Warehouse;
  product?: Product;
}

export interface RequestType {
  id: string;
  name: string;
  name_ar: string;
  description?: string;
  requires_manager_approval: boolean;
  requires_accounting_approval: boolean;
  auto_approve_limit: number;
  color: string;
  sort_order: number;
  is_active: boolean;
}

export interface StockRequest {
  id: string;
  request_number: string;
  request_type_id: string;
  request_type: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  warehouse_id: string;
  requested_by: string;
  requested_by_name?: string;
  department?: string;
  status: string;
  request_date: string;
  required_date?: string;
  approved_date?: string;
  issued_date?: string;
  completed_date?: string;
  total_value: number;
  currency: string;
  external_order_id?: string;
  external_invoice_id?: string;
  notes?: string;
  rejection_reason?: string;
  cancellation_reason?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
  // Relations
  warehouse?: Warehouse;
  request_type_info?: RequestType;
  items?: StockRequestItem[];
  approvals?: StockRequestApproval[];
}

export interface StockRequestItem {
  id: string;
  request_id: string;
  product_id: string;
  requested_quantity: number;
  approved_quantity: number;
  issued_quantity: number;
  remaining_quantity: number;
  unit_price: number;
  total_price: number;
  currency: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Relations
  product?: Product;
}

export interface StockRequestApproval {
  id: string;
  request_id: string;
  approver_id: string;
  approver_name: string;
  approver_email?: string;
  approver_role: string;
  approval_level: number;
  action: 'pending' | 'approved' | 'rejected' | 'delegated';
  action_date?: string;
  comments?: string;
  delegated_to?: string;
  delegated_at?: string;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  movement_number: string;
  movement_type: 'in' | 'out' | 'transfer' | 'adjustment' | 'return';
  movement_date: string;
  warehouse_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_value: number;
  currency: string;
  balance_before: number;
  balance_after: number;
  reference_type?: string;
  reference_id?: string;
  reference_number?: string;
  description?: string;
  processed_by: string;
  processed_by_name?: string;
  created_at: string;
  // Relations
  warehouse?: Warehouse;
  product?: Product;
}

export interface UserWarehousePermissions {
  id: string;
  user_id: string;
  user_name?: string;
  warehouse_id: string;
  can_view: boolean;
  can_create_requests: boolean;
  can_approve_requests: boolean;
  can_issue_items: boolean;
  can_receive_items: boolean;
  can_manage_stock: boolean;
  can_view_reports: boolean;
  is_warehouse_manager: boolean;
  assigned_by: string;
  assigned_at: string;
}

// ==================================================================
// خدمة إدارة المخازن الرئيسية
// ==================================================================

export class StockManagementService {
  private db: Database;
  private static instance: StockManagementService;

  constructor() {
    this.db = getOptimizedDb();
  }

  static getInstance(): StockManagementService {
    if (!StockManagementService.instance) {
      StockManagementService.instance = new StockManagementService();
    }
    return StockManagementService.instance;
  }

  // ==================================================================
  // إدارة المخازن (Warehouse Management)
  // ==================================================================

  async createWarehouse(warehouse: Omit<Warehouse, 'id' | 'created_at' | 'updated_at'>): Promise<Warehouse> {
    const stmt = this.db.prepare(`
      INSERT INTO warehouses (name, name_ar, code, description, location, manager_id, manager_name, capacity_limit, is_active, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `);

    return stmt.get(
      warehouse.name,
      warehouse.name_ar,
      warehouse.code,
      warehouse.description,
      warehouse.location,
      warehouse.manager_id,
      warehouse.manager_name,
      warehouse.capacity_limit,
      warehouse.is_active ? 1 : 0,
      warehouse.created_by
    ) as Warehouse;
  }

  async getWarehouses(filters?: {
    is_active?: boolean;
    manager_id?: string;
    search?: string;
  }): Promise<Warehouse[]> {
    let query = 'SELECT * FROM warehouses WHERE 1=1';
    const params: any[] = [];

    if (filters?.is_active !== undefined) {
      query += ' AND is_active = ?';
      params.push(filters.is_active ? 1 : 0);
    }

    if (filters?.manager_id) {
      query += ' AND manager_id = ?';
      params.push(filters.manager_id);
    }

    if (filters?.search) {
      query += ' AND (name LIKE ? OR name_ar LIKE ? OR code LIKE ? OR location LIKE ?)';
      const searchParam = `%${filters.search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }

    query += ' ORDER BY name';

    const stmt = this.db.prepare(query);
    return stmt.all(...params) as Warehouse[];
  }

  async getWarehouseById(id: string): Promise<Warehouse | null> {
    const stmt = this.db.prepare('SELECT * FROM warehouses WHERE id = ?');
    return stmt.get(id) as Warehouse | null;
  }

  async updateWarehouse(id: string, updates: Partial<Warehouse>): Promise<Warehouse> {
    const fields = Object.keys(updates).filter(key => key !== 'id');
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => (updates as any)[field]);

    const stmt = this.db.prepare(`
      UPDATE warehouses 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `);

    return stmt.get(...values, id) as Warehouse;
  }

  // ==================================================================
  // إدارة المنتجات (Product Management)
  // ==================================================================

  async createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
    const stmt = this.db.prepare(`
      INSERT INTO products (
        name, name_ar, code, barcode, description, category, unit,
        cost_price, selling_price, currency, min_stock_level, max_stock_level, reorder_level,
        brand, model, specifications, image_path, is_active, created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `);

    return stmt.get(
      product.name, product.name_ar, product.code, product.barcode,
      product.description, product.category, product.unit,
      product.cost_price, product.selling_price, product.currency,
      product.min_stock_level, product.max_stock_level, product.reorder_level,
      product.brand, product.model, product.specifications, product.image_path,
      product.is_active ? 1 : 0, product.created_by
    ) as Product;
  }

  async getProducts(filters?: {
    is_active?: boolean;
    category?: string;
    search?: string;
    warehouse_id?: string; // للحصول على المنتجات المتوفرة في مخزن معين
  }): Promise<Product[]> {
    let query = `
      SELECT DISTINCT p.*
      FROM products p
    `;
    const params: any[] = [];

    if (filters?.warehouse_id) {
      query += `
        INNER JOIN stock_levels sl ON p.id = sl.product_id
        WHERE sl.warehouse_id = ? AND sl.available_quantity > 0
      `;
      params.push(filters.warehouse_id);
    } else {
      query += ' WHERE 1=1';
    }

    if (filters?.is_active !== undefined) {
      query += ' AND p.is_active = ?';
      params.push(filters.is_active ? 1 : 0);
    }

    if (filters?.category) {
      query += ' AND p.category = ?';
      params.push(filters.category);
    }

    if (filters?.search) {
      query += ' AND (p.name LIKE ? OR p.name_ar LIKE ? OR p.code LIKE ? OR p.barcode LIKE ?)';
      const searchParam = `%${filters.search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }

    query += ' ORDER BY p.name';

    const stmt = this.db.prepare(query);
    return stmt.all(...params) as Product[];
  }

  async getProductById(id: string): Promise<Product | null> {
    const stmt = this.db.prepare('SELECT * FROM products WHERE id = ?');
    return stmt.get(id) as Product | null;
  }

  async updateProduct(id: string, updates: Partial<Product>, updatedBy: string): Promise<Product> {
    const fields = Object.keys(updates).filter(key => key !== 'id');
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => (updates as any)[field]);

    const stmt = this.db.prepare(`
      UPDATE products 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP, updated_by = ?
      WHERE id = ?
      RETURNING *
    `);

    return stmt.get(...values, updatedBy, id) as Product;
  }

  // ==================================================================
  // إدارة مستويات المخزون (Stock Level Management)
  // ==================================================================

  async getStockLevels(filters?: {
    warehouse_id?: string;
    product_id?: string;
    low_stock_only?: boolean;
  }): Promise<StockLevel[]> {
    let query = `
      SELECT 
        sl.*,
        w.name as warehouse_name,
        w.name_ar as warehouse_name_ar,
        p.name as product_name,
        p.name_ar as product_name_ar,
        p.unit,
        p.min_stock_level,
        p.reorder_level
      FROM stock_levels sl
      LEFT JOIN warehouses w ON sl.warehouse_id = w.id
      LEFT JOIN products p ON sl.product_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.warehouse_id) {
      query += ' AND sl.warehouse_id = ?';
      params.push(filters.warehouse_id);
    }

    if (filters?.product_id) {
      query += ' AND sl.product_id = ?';
      params.push(filters.product_id);
    }

    if (filters?.low_stock_only) {
      query += ' AND sl.available_quantity <= p.min_stock_level';
    }

    query += ' ORDER BY p.name';

    const stmt = this.db.prepare(query);
    return stmt.all(...params) as StockLevel[];
  }

  async updateStockLevel(
    warehouseId: string,
    productId: string,
    quantityChange: number,
    movementType: 'in' | 'out' | 'adjustment',
    processedBy: string,
    referenceType?: string,
    referenceId?: string,
    referenceNumber?: string,
    description?: string
  ): Promise<void> {
    const transaction = this.db.transaction(() => {
      // الحصول على المخزون الحالي
      const currentStock = this.db.prepare(`
        SELECT available_quantity FROM stock_levels 
        WHERE warehouse_id = ? AND product_id = ?
      `).get(warehouseId, productId) as { available_quantity: number } | undefined;

      const currentQuantity = currentStock?.available_quantity || 0;
      const balanceBefore = currentQuantity;
      const balanceAfter = currentQuantity + quantityChange;

      // التأكد من عدم السماح بالكمية السالبة للصرف
      if (movementType === 'out' && balanceAfter < 0) {
        throw new Error(`المخزون غير كافي. المتوفر: ${currentQuantity}، المطلوب: ${Math.abs(quantityChange)}`);
      }

      // تحديث مستوى المخزون
      this.db.prepare(`
        INSERT OR REPLACE INTO stock_levels (
          warehouse_id, product_id, available_quantity, last_updated, updated_by
        ) VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?)
      `).run(warehouseId, productId, balanceAfter, processedBy);

      // إضافة حركة المخزون
      const movementNumber = this.generateMovementNumber();
      this.db.prepare(`
        INSERT INTO stock_movements (
          movement_number, movement_type, warehouse_id, product_id,
          quantity, balance_before, balance_after, reference_type,
          reference_id, reference_number, description, processed_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        movementNumber, movementType, warehouseId, productId,
        quantityChange, balanceBefore, balanceAfter, referenceType,
        referenceId, referenceNumber, description, processedBy
      );
    });

    transaction();
  }

  // ==================================================================
  // إدارة الطلبات (Stock Request Management)
  // ==================================================================

  async createStockRequest(
    requestData: Omit<StockRequest, 'id' | 'request_number' | 'created_at' | 'updated_at' | 'status'>,
    items: Omit<StockRequestItem, 'id' | 'request_id' | 'created_at' | 'updated_at' | 'approved_quantity' | 'issued_quantity' | 'remaining_quantity' | 'total_price'>[]
  ): Promise<StockRequest> {
    const transaction = this.db.transaction(() => {
      const requestNumber = this.generateRequestNumber();
      
      // إنشاء الطلب
      const requestStmt = this.db.prepare(`
        INSERT INTO stock_requests (
          request_number, request_type_id, request_type, title, description, priority,
          warehouse_id, requested_by, requested_by_name, department, total_value,
          currency, external_order_id, external_invoice_id, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING *
      `);

      const request = requestStmt.get(
        requestNumber, requestData.request_type_id, requestData.request_type,
        requestData.title, requestData.description, requestData.priority,
        requestData.warehouse_id, requestData.requested_by, requestData.requested_by_name,
        requestData.department, requestData.total_value, requestData.currency,
        requestData.external_order_id, requestData.external_invoice_id,
        requestData.notes, requestData.created_by
      ) as StockRequest;

      // إضافة العناصر
      const itemStmt = this.db.prepare(`
        INSERT INTO stock_request_items (
          request_id, product_id, requested_quantity, unit_price, currency, notes
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);

      items.forEach(item => {
        itemStmt.run(
          request.id, item.product_id, item.requested_quantity,
          item.unit_price, item.currency, item.notes
        );
      });

      return request;
    });

    return transaction();
  }

  async getStockRequests(filters?: {
    status?: string;
    warehouse_id?: string;
    requested_by?: string;
    request_type?: string;
    search?: string;
    from_date?: string;
    to_date?: string;
  }): Promise<StockRequest[]> {
    let query = `
      SELECT 
        sr.*,
        w.name as warehouse_name,
        w.name_ar as warehouse_name_ar,
        rt.name_ar as request_type_name_ar,
        rt.color as request_type_color
      FROM stock_requests sr
      LEFT JOIN warehouses w ON sr.warehouse_id = w.id
      LEFT JOIN request_types rt ON sr.request_type_id = rt.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.status) {
      query += ' AND sr.status = ?';
      params.push(filters.status);
    }

    if (filters?.warehouse_id) {
      query += ' AND sr.warehouse_id = ?';
      params.push(filters.warehouse_id);
    }

    if (filters?.requested_by) {
      query += ' AND sr.requested_by = ?';
      params.push(filters.requested_by);
    }

    if (filters?.request_type) {
      query += ' AND sr.request_type = ?';
      params.push(filters.request_type);
    }

    if (filters?.search) {
      query += ' AND (sr.request_number LIKE ? OR sr.title LIKE ? OR sr.description LIKE ?)';
      const searchParam = `%${filters.search}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    if (filters?.from_date) {
      query += ' AND DATE(sr.request_date) >= ?';
      params.push(filters.from_date);
    }

    if (filters?.to_date) {
      query += ' AND DATE(sr.request_date) <= ?';
      params.push(filters.to_date);
    }

    query += ' ORDER BY sr.created_at DESC';

    const stmt = this.db.prepare(query);
    return stmt.all(...params) as StockRequest[];
  }

  async getStockRequestById(id: string): Promise<StockRequest | null> {
    const stmt = this.db.prepare(`
      SELECT 
        sr.*,
        w.name as warehouse_name,
        w.name_ar as warehouse_name_ar,
        rt.name_ar as request_type_name_ar,
        rt.color as request_type_color
      FROM stock_requests sr
      LEFT JOIN warehouses w ON sr.warehouse_id = w.id
      LEFT JOIN request_types rt ON sr.request_type_id = rt.id
      WHERE sr.id = ?
    `);
    return stmt.get(id) as StockRequest | null;
  }

  async getStockRequestItems(requestId: string): Promise<StockRequestItem[]> {
    const stmt = this.db.prepare(`
      SELECT 
        sri.*,
        p.name as product_name,
        p.name_ar as product_name_ar,
        p.code as product_code,
        p.unit as product_unit
      FROM stock_request_items sri
      LEFT JOIN products p ON sri.product_id = p.id
      WHERE sri.request_id = ?
      ORDER BY p.name
    `);
    return stmt.all(requestId) as StockRequestItem[];
  }

  async updateStockRequestStatus(
    requestId: string,
    status: string,
    updatedBy: string,
    reason?: string
  ): Promise<void> {
    const updates: any = { status, updated_by: updatedBy };
    
    if (status === 'rejected' && reason) {
      updates.rejection_reason = reason;
    }
    
    if (status === 'cancelled' && reason) {
      updates.cancellation_reason = reason;
    }

    const fields = Object.keys(updates);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => updates[field]);

    const stmt = this.db.prepare(`
      UPDATE stock_requests 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(...values, requestId);
  }

  // ==================================================================
  // إدارة الموافقات (Approval Management)
  // ==================================================================

  async createApproval(approval: Omit<StockRequestApproval, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO stock_request_approvals (
        request_id, approver_id, approver_name, approver_email, approver_role,
        approval_level, action, action_date, comments, delegated_to, delegated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      approval.request_id, approval.approver_id, approval.approver_name,
      approval.approver_email, approval.approver_role, approval.approval_level,
      approval.action, approval.action_date, approval.comments,
      approval.delegated_to, approval.delegated_at
    );
  }

  async getRequestApprovals(requestId: string): Promise<StockRequestApproval[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM stock_request_approvals
      WHERE request_id = ?
      ORDER BY approval_level, created_at
    `);
    return stmt.all(requestId) as StockRequestApproval[];
  }

  // ==================================================================
  // إدارة الصلاحيات (Permission Management)
  // ==================================================================

  async getUserWarehousePermissions(userId: string): Promise<UserWarehousePermissions[]> {
    const stmt = this.db.prepare(`
      SELECT 
        uwp.*,
        w.name as warehouse_name,
        w.name_ar as warehouse_name_ar
      FROM user_warehouse_permissions uwp
      LEFT JOIN warehouses w ON uwp.warehouse_id = w.id
      WHERE uwp.user_id = ?
    `);
    return stmt.all(userId) as UserWarehousePermissions[];
  }

  async checkUserWarehousePermission(
    userId: string,
    warehouseId: string,
    permission: keyof Pick<
      UserWarehousePermissions,
      'can_view' | 'can_create_requests' | 'can_approve_requests' | 
      'can_issue_items' | 'can_receive_items' | 'can_manage_stock' | 'can_view_reports'
    >
  ): Promise<boolean> {
    const stmt = this.db.prepare(`
      SELECT ${permission}
      FROM user_warehouse_permissions
      WHERE user_id = ? AND warehouse_id = ?
    `);
    const result = stmt.get(userId, warehouseId) as any;
    return result?.[permission] === 1;
  }

  // ==================================================================
  // التقارير والإحصائيات (Reports & Analytics)
  // ==================================================================

  async getWarehouseSummary(warehouseId: string): Promise<{
    total_products: number;
    low_stock_items: number;
    total_value: number;
    pending_requests: number;
  }> {
    const summary = this.db.prepare(`
      SELECT 
        COUNT(DISTINCT sl.product_id) as total_products,
        COUNT(CASE WHEN sl.available_quantity <= p.min_stock_level THEN 1 END) as low_stock_items,
        COALESCE(SUM(sl.available_quantity * p.cost_price), 0) as total_value,
        (SELECT COUNT(*) FROM stock_requests WHERE warehouse_id = ? AND status = 'pending') as pending_requests
      FROM stock_levels sl
      LEFT JOIN products p ON sl.product_id = p.id
      WHERE sl.warehouse_id = ?
    `).get(warehouseId, warehouseId) as any;

    return summary;
  }

  async getStockMovements(filters?: {
    warehouse_id?: string;
    product_id?: string;
    movement_type?: string;
    from_date?: string;
    to_date?: string;
  }): Promise<StockMovement[]> {
    let query = `
      SELECT 
        sm.*,
        w.name as warehouse_name,
        p.name as product_name,
        p.code as product_code
      FROM stock_movements sm
      LEFT JOIN warehouses w ON sm.warehouse_id = w.id
      LEFT JOIN products p ON sm.product_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.warehouse_id) {
      query += ' AND sm.warehouse_id = ?';
      params.push(filters.warehouse_id);
    }

    if (filters?.product_id) {
      query += ' AND sm.product_id = ?';
      params.push(filters.product_id);
    }

    if (filters?.movement_type) {
      query += ' AND sm.movement_type = ?';
      params.push(filters.movement_type);
    }

    if (filters?.from_date) {
      query += ' AND DATE(sm.movement_date) >= ?';
      params.push(filters.from_date);
    }

    if (filters?.to_date) {
      query += ' AND DATE(sm.movement_date) <= ?';
      params.push(filters.to_date);
    }

    query += ' ORDER BY sm.movement_date DESC';

    const stmt = this.db.prepare(query);
    return stmt.all(...params) as StockMovement[];
  }

  // ==================================================================
  // Helper Functions - وظائف مساعدة
  // ==================================================================

  private generateRequestNumber(): string {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    
    const lastRequest = this.db.prepare(`
      SELECT request_number FROM stock_requests
      WHERE request_number LIKE ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(`SR${year}${month}%`) as { request_number: string } | undefined;

    let sequence = 1;
    if (lastRequest) {
      const lastSequence = parseInt(lastRequest.request_number.slice(-4));
      sequence = lastSequence + 1;
    }

    return `SR${year}${month}${sequence.toString().padStart(4, '0')}`;
  }

  private generateMovementNumber(): string {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    const lastMovement = this.db.prepare(`
      SELECT movement_number FROM stock_movements
      WHERE movement_number LIKE ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(`MV${year}${month}${day}%`) as { movement_number: string } | undefined;

    let sequence = 1;
    if (lastMovement) {
      const lastSequence = parseInt(lastMovement.movement_number.slice(-3));
      sequence = lastSequence + 1;
    }

    return `MV${year}${month}${day}${sequence.toString().padStart(3, '0')}`;
  }

  // ==================================================================
  // إدارة أنواع الطلبات
  // ==================================================================

  async getRequestTypes(): Promise<RequestType[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM request_types
      WHERE is_active = 1
      ORDER BY sort_order, name_ar
    `);
    return stmt.all() as RequestType[];
  }
}

// تصدير نسخة واحدة من الخدمة
export const stockService = StockManagementService.getInstance();