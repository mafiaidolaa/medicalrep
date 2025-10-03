/**
 * 🏭 EP Group System - Stock Integration Service
 * خدمة الدمج مع الأقسام الأخرى (Orders، Accounting، إلخ)
 */

import { getOptimizedDb } from '../database/optimized-db';
import type { Database } from 'better-sqlite3';
import { stockService } from './stock-management-service';
import { stockNotificationService } from './stock-notifications';

// ==================================================================
// أنواع البيانات للدمج
// ==================================================================

export interface OrderIntegration {
  order_id: string;
  order_number: string;
  customer_id?: string;
  customer_name?: string;
  items: OrderItem[];
  total_amount: number;
  status: string;
  created_at: string;
  warehouse_id?: string;
}

export interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface AccountingIntegration {
  transaction_type: 'stock_in' | 'stock_out' | 'adjustment';
  reference_id: string;
  reference_type: 'stock_request' | 'stock_movement' | 'issue_order';
  account_code: string;
  debit_amount: number;
  credit_amount: number;
  description: string;
  transaction_date: string;
}

export interface ApprovalWorkflow {
  workflow_id: string;
  entity_type: 'stock_request' | 'stock_transfer' | 'stock_adjustment';
  entity_id: string;
  current_level: number;
  total_levels: number;
  approvers: ApprovalStep[];
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
}

export interface ApprovalStep {
  level: number;
  approver_id: string;
  approver_name: string;
  approver_role: string;
  action?: 'pending' | 'approved' | 'rejected';
  action_date?: string;
  comments?: string;
}

// ==================================================================
// خدمة الدمج الرئيسية
// ==================================================================

export class StockIntegrationService {
  private db: Database;
  private static instance: StockIntegrationService;

  constructor() {
    this.db = getOptimizedDb();
  }

  static getInstance(): StockIntegrationService {
    if (!StockIntegrationService.instance) {
      StockIntegrationService.instance = new StockIntegrationService();
    }
    return StockIntegrationService.instance;
  }

  // ==================================================================
  // الدمج مع نظام الطلبات (Orders)
  // ==================================================================

  async createStockRequestFromOrder(orderData: OrderIntegration): Promise<string> {
    const transaction = this.db.transaction(async () => {
      // التحقق من توفر المنتجات في المخزن المحدد أو المخزن الرئيسي
      const warehouseId = orderData.warehouse_id || await this.getMainWarehouseId();
      
      if (!warehouseId) {
        throw new Error('لم يتم العثور على مخزن مناسب');
      }

      // إنشاء طلب صرف من المخزن
      const stockRequest = await stockService.createStockRequest(
        {
          request_type_id: await this.getOrderRequestTypeId(),
          request_type: 'order',
          title: `طلب صرف للأوردر ${orderData.order_number}`,
          description: `طلب صرف بضائع للعميل: ${orderData.customer_name}`,
          priority: 'medium',
          warehouse_id: warehouseId,
          requested_by: 'order_system',
          requested_by_name: 'نظام الطلبات',
          department: 'المبيعات',
          total_value: orderData.total_amount,
          currency: 'EGP',
          external_order_id: orderData.order_id,
          notes: `تم إنشاؤه تلقائياً من الأوردر رقم: ${orderData.order_number}`,
          created_by: 'system'
        },
        orderData.items.map(item => ({
          product_id: item.product_id,
          requested_quantity: item.quantity,
          unit_price: item.unit_price,
          currency: 'EGP',
          notes: `للعميل: ${orderData.customer_name}`
        }))
      );

      // ربط الطلب بالأوردر
      await this.linkStockRequestToOrder(stockRequest.id, orderData.order_id);

      // إرسال إشعارات للمسؤولين
      const warehouseStakeholders = await stockNotificationService.getWarehouseStakeholders(warehouseId);
      await stockNotificationService.notifyRequestCreated(stockRequest, warehouseStakeholders);

      return stockRequest.id;
    });

    return transaction();
  }

  async updateOrderStatusFromStock(stockRequestId: string, newStatus: string): Promise<void> {
    // الحصول على معرف الأوردر المرتبط
    const orderLink = this.db.prepare(`
      SELECT external_order_id FROM stock_requests WHERE id = ?
    `).get(stockRequestId) as { external_order_id: string } | undefined;

    if (orderLink?.external_order_id) {
      // تحديث حالة الأوردر (سيتم تنفيذه عبر webhook أو message queue)
      await this.notifyOrderSystem({
        order_id: orderLink.external_order_id,
        stock_request_id: stockRequestId,
        new_status: newStatus,
        timestamp: new Date().toISOString()
      });
    }
  }

  async checkStockAvailabilityForOrder(orderItems: OrderItem[], warehouseId?: string): Promise<{
    available: boolean;
    insufficient_items: Array<{
      product_id: string;
      required: number;
      available: number;
    }>;
  }> {
    const insufficientItems: any[] = [];
    const defaultWarehouseId = warehouseId || await this.getMainWarehouseId();

    for (const item of orderItems) {
      const stockLevel = await stockService.getStockLevels({
        warehouse_id: defaultWarehouseId,
        product_id: item.product_id
      });

      const availableQuantity = stockLevel[0]?.available_quantity || 0;
      
      if (availableQuantity < item.quantity) {
        insufficientItems.push({
          product_id: item.product_id,
          required: item.quantity,
          available: availableQuantity
        });
      }
    }

    return {
      available: insufficientItems.length === 0,
      insufficient_items: insufficientItems
    };
  }

  // ==================================================================
  // الدمج مع نظام المحاسبة (Accounting)
  // ==================================================================

  async createAccountingEntriesForStockMovement(
    movementId: string,
    movementType: string,
    totalValue: number,
    warehouseId: string
  ): Promise<void> {
    // إنشاء قيود محاسبية حسب نوع الحركة
    const accountingEntries: AccountingIntegration[] = [];

    switch (movementType) {
      case 'in':
        // إدخال مخزون: دائن المخزون، مدين الموردين أو النقدية
        accountingEntries.push({
          transaction_type: 'stock_in',
          reference_id: movementId,
          reference_type: 'stock_movement',
          account_code: '140', // حساب المخزون
          debit_amount: totalValue,
          credit_amount: 0,
          description: 'إدخال بضائع للمخزن',
          transaction_date: new Date().toISOString()
        });
        accountingEntries.push({
          transaction_type: 'stock_in',
          reference_id: movementId,
          reference_type: 'stock_movement',
          account_code: '210', // حساب الموردين
          debit_amount: 0,
          credit_amount: totalValue,
          description: 'التزام للموردين',
          transaction_date: new Date().toISOString()
        });
        break;

      case 'out':
        // صرف مخزون: مدين تكلفة البضاعة المباعة، دائن المخزون
        accountingEntries.push({
          transaction_type: 'stock_out',
          reference_id: movementId,
          reference_type: 'stock_movement',
          account_code: '510', // تكلفة البضاعة المباعة
          debit_amount: totalValue,
          credit_amount: 0,
          description: 'صرف بضائع من المخزن',
          transaction_date: new Date().toISOString()
        });
        accountingEntries.push({
          transaction_type: 'stock_out',
          reference_id: movementId,
          reference_type: 'stock_movement',
          account_code: '140', // حساب المخزون
          debit_amount: 0,
          credit_amount: totalValue,
          description: 'خصم من المخزون',
          transaction_date: new Date().toISOString()
        });
        break;

      case 'adjustment':
        // تسوية مخزون: حسب طبيعة التسوية
        const adjustmentAccount = totalValue > 0 ? '140' : '580'; // مخزون أو خسائر
        accountingEntries.push({
          transaction_type: 'adjustment',
          reference_id: movementId,
          reference_type: 'stock_movement',
          account_code: adjustmentAccount,
          debit_amount: totalValue > 0 ? totalValue : 0,
          credit_amount: totalValue < 0 ? Math.abs(totalValue) : 0,
          description: totalValue > 0 ? 'زيادة مخزون (تسوية)' : 'نقص مخزون (تسوية)',
          transaction_date: new Date().toISOString()
        });
        break;
    }

    // إرسال القيود للنظام المحاسبي
    for (const entry of accountingEntries) {
      await this.sendToAccountingSystem(entry);
    }
  }

  async generateStockValuationReport(warehouseId?: string): Promise<{
    total_value: number;
    items: Array<{
      product_id: string;
      product_name: string;
      quantity: number;
      unit_cost: number;
      total_value: number;
    }>;
  }> {
    let query = `
      SELECT 
        sl.product_id,
        p.name_ar as product_name,
        sl.available_quantity as quantity,
        p.cost_price as unit_cost,
        (sl.available_quantity * p.cost_price) as total_value
      FROM stock_levels sl
      JOIN products p ON sl.product_id = p.id
      JOIN warehouses w ON sl.warehouse_id = w.id
      WHERE p.is_active = 1 AND w.is_active = 1
    `;
    const params: any[] = [];

    if (warehouseId) {
      query += ' AND sl.warehouse_id = ?';
      params.push(warehouseId);
    }

    const stmt = this.db.prepare(query);
    const items = stmt.all(...params) as any[];

    const totalValue = items.reduce((sum, item) => sum + (item.total_value || 0), 0);

    return {
      total_value: totalValue,
      items: items.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        total_value: item.total_value || 0
      }))
    };
  }

  // ==================================================================
  // الدمج مع نظام الموافقات
  // ==================================================================

  async initiateApprovalWorkflow(
    entityType: string,
    entityId: string,
    requestedBy: string,
    totalValue?: number
  ): Promise<string> {
    // تحديد مستويات الموافقة حسب النوع والقيمة
    const approvalLevels = await this.getRequiredApprovalLevels(entityType, totalValue);

    const workflowId = this.generateWorkflowId();

    // إنشاء سير الموافقة
    const stmt = this.db.prepare(`
      INSERT INTO approval_workflows (
        id, entity_type, entity_id, requested_by, total_levels, status, created_at
      ) VALUES (?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
    `);

    stmt.run(workflowId, entityType, entityId, requestedBy, approvalLevels.length);

    // إضافة خطوات الموافقة
    for (let i = 0; i < approvalLevels.length; i++) {
      const level = approvalLevels[i];
      const stepStmt = this.db.prepare(`
        INSERT INTO approval_steps (
          workflow_id, level, approver_id, approver_name, approver_role, status
        ) VALUES (?, ?, ?, ?, ?, 'pending')
      `);

      stepStmt.run(workflowId, i + 1, level.approver_id, level.approver_name, level.approver_role);
    }

    // إرسال إشعار للموافق الأول
    const firstApprover = approvalLevels[0];
    if (firstApprover) {
      await stockNotificationService.createNotification({
        recipient_id: firstApprover.approver_id,
        notification_type: 'approval_required',
        title: 'مطلوب موافقة',
        message: `يتطلب ${entityType} رقم ${entityId} موافقتك`,
        priority: totalValue && totalValue > 50000 ? 'high' : 'medium',
        is_read: false
      });
    }

    return workflowId;
  }

  async processApprovalStep(
    workflowId: string,
    approverId: string,
    action: 'approved' | 'rejected',
    comments?: string
  ): Promise<{
    workflow_completed: boolean;
    next_approver?: string;
    final_status?: string;
  }> {
    const transaction = this.db.transaction(() => {
      // تحديث خطوة الموافقة الحالية
      const updateStmt = this.db.prepare(`
        UPDATE approval_steps 
        SET status = ?, action_date = CURRENT_TIMESTAMP, comments = ?
        WHERE workflow_id = ? AND approver_id = ? AND status = 'pending'
      `);

      const result = updateStmt.run(action, comments, workflowId, approverId);

      if (result.changes === 0) {
        throw new Error('لم يتم العثور على خطوة موافقة معلقة لهذا المستخدم');
      }

      // الحصول على معلومات سير الموافقة
      const workflow = this.db.prepare(`
        SELECT * FROM approval_workflows WHERE id = ?
      `).get(workflowId) as any;

      if (action === 'rejected') {
        // إذا تم الرفض، إنهاء سير الموافقة
        this.db.prepare(`
          UPDATE approval_workflows SET status = 'rejected' WHERE id = ?
        `).run(workflowId);

        return {
          workflow_completed: true,
          final_status: 'rejected'
        };
      }

      // فحص ما إذا كانت هناك خطوات موافقة أخرى
      const pendingSteps = this.db.prepare(`
        SELECT * FROM approval_steps 
        WHERE workflow_id = ? AND status = 'pending'
        ORDER BY level ASC
      `).all(workflowId) as any[];

      if (pendingSteps.length === 0) {
        // جميع الخطوات تمت الموافقة عليها
        this.db.prepare(`
          UPDATE approval_workflows SET status = 'approved' WHERE id = ?
        `).run(workflowId);

        return {
          workflow_completed: true,
          final_status: 'approved'
        };
      }

      // إرسال إشعار للموافق التالي
      const nextStep = pendingSteps[0];
      return {
        workflow_completed: false,
        next_approver: nextStep.approver_id
      };
    });

    const result = transaction();

    // إرسال الإشعارات المناسبة
    if (result.next_approver) {
      await stockNotificationService.createNotification({
        recipient_id: result.next_approver,
        notification_type: 'approval_required',
        title: 'مطلوب موافقة',
        message: `تم تمرير طلب الموافقة إليك`,
        priority: 'medium',
        is_read: false
      });
    }

    return result;
  }

  // ==================================================================
  // دوال مساعدة
  // ==================================================================

  private async getMainWarehouseId(): Promise<string | null> {
    const warehouse = this.db.prepare(`
      SELECT id FROM warehouses WHERE code = 'WH001' OR name LIKE '%رئيسي%' LIMIT 1
    `).get() as { id: string } | undefined;

    return warehouse?.id || null;
  }

  private async getOrderRequestTypeId(): Promise<string> {
    const requestType = this.db.prepare(`
      SELECT id FROM request_types WHERE name = 'order' LIMIT 1
    `).get() as { id: string } | undefined;

    if (!requestType) {
      throw new Error('نوع طلب الأوردر غير موجود');
    }

    return requestType.id;
  }

  private async linkStockRequestToOrder(stockRequestId: string, orderId: string): Promise<void> {
    // تسجيل الربط في جدول منفصل للتتبع
    const stmt = this.db.prepare(`
      INSERT INTO stock_order_links (stock_request_id, order_id, created_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `);

    try {
      stmt.run(stockRequestId, orderId);
    } catch (error) {
      // الجدول قد لا يكون موجوداً، سنتجاهل الخطأ
      console.warn('Could not create stock-order link:', error);
    }
  }

  private async notifyOrderSystem(data: any): Promise<void> {
    // إرسال webhook أو رسالة إلى نظام الطلبات
    console.log('Notifying order system:', data);
    // TODO: تنفيذ الإرسال الفعلي
  }

  private async sendToAccountingSystem(entry: AccountingIntegration): Promise<void> {
    // إرسال القيد المحاسبي لنظام الحسابات
    console.log('Sending to accounting system:', entry);
    // TODO: تنفيذ الإرسال الفعلي
  }

  private async getRequiredApprovalLevels(entityType: string, totalValue?: number): Promise<ApprovalStep[]> {
    // تحديد مستويات الموافقة حسب النوع والقيمة
    const approvers: ApprovalStep[] = [];

    // موافقة المدير المباشر (دائماً مطلوبة)
    approvers.push({
      level: 1,
      approver_id: 'manager001',
      approver_name: 'المدير المباشر',
      approver_role: 'manager'
    });

    // موافقة المحاسبة للقيم العالية
    if (totalValue && totalValue > 10000) {
      approvers.push({
        level: 2,
        approver_id: 'accounting001',
        approver_name: 'محاسب',
        approver_role: 'accounting'
      });
    }

    // موافقة الإدارة العليا للقيم الكبيرة جداً
    if (totalValue && totalValue > 50000) {
      approvers.push({
        level: 3,
        approver_id: 'admin001',
        approver_name: 'الإدارة العليا',
        approver_role: 'admin'
      });
    }

    return approvers;
  }

  private generateWorkflowId(): string {
    return 'WF' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // ==================================================================
  // APIs للأنظمة الخارجية
  // ==================================================================

  async getStockDataForAPI(warehouseId?: string): Promise<{
    products: Array<{
      id: string;
      name: string;
      code: string;
      available_quantity: number;
      reserved_quantity: number;
      unit_price: number;
    }>;
    summary: {
      total_products: number;
      total_value: number;
      low_stock_count: number;
    };
  }> {
    const stockData = await stockService.getStockLevels({
      warehouse_id: warehouseId
    });

    const products = stockData.map(stock => ({
      id: stock.product_id,
      name: stock.product?.name_ar || '',
      code: stock.product?.code || '',
      available_quantity: stock.available_quantity,
      reserved_quantity: stock.reserved_quantity,
      unit_price: stock.product?.selling_price || 0
    }));

    const summary = {
      total_products: products.length,
      total_value: products.reduce((sum, p) => sum + (p.available_quantity * p.unit_price), 0),
      low_stock_count: products.filter(p => p.available_quantity <= 0).length
    };

    return { products, summary };
  }

  async reserveStock(
    productId: string,
    warehouseId: string,
    quantity: number,
    reservedBy: string,
    reservationReason: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // فحص توفر الكمية
      const stockLevels = await stockService.getStockLevels({
        warehouse_id: warehouseId,
        product_id: productId
      });

      const currentStock = stockLevels[0];
      if (!currentStock || currentStock.available_quantity < quantity) {
        return {
          success: false,
          message: `الكمية المطلوبة غير متوفرة. المتوفر: ${currentStock?.available_quantity || 0}`
        };
      }

      // حجز المخزون
      this.db.prepare(`
        UPDATE stock_levels 
        SET available_quantity = available_quantity - ?, 
            reserved_quantity = reserved_quantity + ?
        WHERE warehouse_id = ? AND product_id = ?
      `).run(quantity, quantity, warehouseId, productId);

      // تسجيل عملية الحجز
      this.db.prepare(`
        INSERT INTO stock_reservations (
          product_id, warehouse_id, quantity, reserved_by, reason, created_at
        ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(productId, warehouseId, quantity, reservedBy, reservationReason);

      return {
        success: true,
        message: `تم حجز ${quantity} وحدة بنجاح`
      };

    } catch (error: any) {
      return {
        success: false,
        message: `خطأ في حجز المخزون: ${error.message}`
      };
    }
  }
}

// تصدير نسخة واحدة من الخدمة
export const stockIntegrationService = StockIntegrationService.getInstance();