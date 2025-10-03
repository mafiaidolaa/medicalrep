/**
 * 🏭 EP Group System - Stock Reports & Documents Generator
 * نظام النماذج والتقارير الاحترافية للمخازن
 */

import { getOptimizedDb } from '../database/optimized-db';
import type { Database } from 'better-sqlite3';
import type { StockRequest, StockLevel, Product, Warehouse, StockMovement } from './stock-management-service';

// ==================================================================
// أنواع التقارير والنماذج
// ==================================================================

export interface ReportTemplate {
  id: string;
  name: string;
  name_ar: string;
  description: string;
  type: 'stock_level' | 'movement' | 'request' | 'issue_order' | 'transfer' | 'custom';
  template_data: any;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

export interface ReportData {
  title: string;
  subtitle?: string;
  report_date: string;
  generated_by: string;
  warehouse?: Warehouse;
  filters?: Record<string, any>;
  data: any[];
  summary?: Record<string, any>;
  charts?: ChartData[];
}

export interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'doughnut';
  title: string;
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor?: string[];
      borderColor?: string;
    }>;
  };
}

export interface IssueOrderDocument {
  order: {
    order_number: string;
    request_number: string;
    issue_date: string;
    warehouse: Warehouse;
    requested_by: string;
    issued_by: string;
  };
  items: Array<{
    product_name: string;
    product_code: string;
    unit: string;
    requested_quantity: number;
    issued_quantity: number;
    unit_price: number;
    total_price: number;
    notes?: string;
  }>;
  totals: {
    total_items: number;
    total_quantity: number;
    total_value: number;
  };
  signatures: {
    issued_by: string;
    received_by?: string;
    warehouse_manager?: string;
  };
}

// ==================================================================
// خدمة التقارير والنماذج
// ==================================================================

export class StockReportsService {
  private db: Database;
  private static instance: StockReportsService;

  constructor() {
    this.db = getOptimizedDb();
  }

  static getInstance(): StockReportsService {
    if (!StockReportsService.instance) {
      StockReportsService.instance = new StockReportsService();
    }
    return StockReportsService.instance;
  }

  // ==================================================================
  // تقارير المخزون
  // ==================================================================

  async generateStockLevelReport(filters?: {
    warehouse_id?: string;
    category?: string;
    low_stock_only?: boolean;
    include_zero_stock?: boolean;
  }): Promise<ReportData> {
    let query = `
      SELECT 
        sl.*,
        w.name_ar as warehouse_name,
        w.code as warehouse_code,
        p.name_ar as product_name,
        p.code as product_code,
        p.unit,
        p.category,
        p.cost_price,
        p.selling_price,
        p.min_stock_level,
        p.reorder_level,
        (sl.available_quantity * p.cost_price) as stock_value,
        CASE 
          WHEN sl.available_quantity = 0 THEN 'نفد'
          WHEN sl.available_quantity <= p.min_stock_level THEN 'منخفض'
          WHEN sl.available_quantity <= p.reorder_level THEN 'إعادة طلب'
          ELSE 'طبيعي'
        END as stock_status
      FROM stock_levels sl
      LEFT JOIN warehouses w ON sl.warehouse_id = w.id
      LEFT JOIN products p ON sl.product_id = p.id
      WHERE w.is_active = 1 AND p.is_active = 1
    `;
    const params: any[] = [];

    if (filters?.warehouse_id) {
      query += ' AND sl.warehouse_id = ?';
      params.push(filters.warehouse_id);
    }

    if (filters?.category) {
      query += ' AND p.category = ?';
      params.push(filters.category);
    }

    if (filters?.low_stock_only) {
      query += ' AND sl.available_quantity <= p.min_stock_level';
    }

    if (!filters?.include_zero_stock) {
      query += ' AND sl.available_quantity > 0';
    }

    query += ' ORDER BY w.name_ar, p.name_ar';

    const stmt = this.db.prepare(query);
    const data = stmt.all(...params) as any[];

    // حساب الملخص
    const summary = {
      total_items: data.length,
      total_value: data.reduce((sum, item) => sum + (item.stock_value || 0), 0),
      low_stock_items: data.filter(item => item.stock_status === 'منخفض').length,
      out_of_stock_items: data.filter(item => item.stock_status === 'نفد').length,
      reorder_items: data.filter(item => item.stock_status === 'إعادة طلب').length
    };

    // إحصائيات حسب الفئة
    const categoryStats = data.reduce((acc: any, item) => {
      const category = item.category || 'غير مصنف';
      if (!acc[category]) {
        acc[category] = { count: 0, value: 0 };
      }
      acc[category].count += 1;
      acc[category].value += item.stock_value || 0;
      return acc;
    }, {});

    const charts: ChartData[] = [
      {
        type: 'pie',
        title: 'توزيع المخزون حسب الحالة',
        data: {
          labels: ['طبيعي', 'منخفض', 'نفد', 'إعادة طلب'],
          datasets: [{
            label: 'عدد المنتجات',
            data: [
              data.filter(item => item.stock_status === 'طبيعي').length,
              summary.low_stock_items,
              summary.out_of_stock_items,
              summary.reorder_items
            ],
            backgroundColor: ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
          }]
        }
      },
      {
        type: 'doughnut',
        title: 'قيمة المخزون حسب الفئة',
        data: {
          labels: Object.keys(categoryStats),
          datasets: [{
            label: 'القيمة (ج.م)',
            data: Object.values(categoryStats).map((stat: any) => stat.value),
            backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']
          }]
        }
      }
    ];

    return {
      title: 'تقرير مستويات المخزون',
      subtitle: filters?.warehouse_id ? 'مخزن محدد' : 'جميع المخازن',
      report_date: new Date().toISOString(),
      generated_by: 'نظام إدارة المخازن',
      filters,
      data,
      summary,
      charts
    };
  }

  async generateMovementReport(filters?: {
    warehouse_id?: string;
    product_id?: string;
    movement_type?: string;
    from_date?: string;
    to_date?: string;
  }): Promise<ReportData> {
    let query = `
      SELECT 
        sm.*,
        w.name_ar as warehouse_name,
        p.name_ar as product_name,
        p.code as product_code,
        p.unit,
        CASE sm.movement_type
          WHEN 'in' THEN 'إدخال'
          WHEN 'out' THEN 'صرف'
          WHEN 'transfer' THEN 'تحويل'
          WHEN 'adjustment' THEN 'تسوية'
          WHEN 'return' THEN 'إرجاع'
        END as movement_type_ar
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
    const data = stmt.all(...params) as any[];

    // حساب الملخص
    const summary = {
      total_movements: data.length,
      total_value: data.reduce((sum, item) => sum + Math.abs(item.total_value || 0), 0),
      in_movements: data.filter(item => item.quantity > 0).length,
      out_movements: data.filter(item => item.quantity < 0).length,
      total_in_quantity: data.filter(item => item.quantity > 0).reduce((sum, item) => sum + item.quantity, 0),
      total_out_quantity: data.filter(item => item.quantity < 0).reduce((sum, item) => sum + Math.abs(item.quantity), 0)
    };

    // إحصائيات يومية
    const dailyStats = data.reduce((acc: any, item) => {
      const date = item.movement_date.split('T')[0];
      if (!acc[date]) {
        acc[date] = { in: 0, out: 0, value: 0 };
      }
      if (item.quantity > 0) {
        acc[date].in += item.quantity;
      } else {
        acc[date].out += Math.abs(item.quantity);
      }
      acc[date].value += Math.abs(item.total_value || 0);
      return acc;
    }, {});

    const charts: ChartData[] = [
      {
        type: 'line',
        title: 'الحركات اليومية',
        data: {
          labels: Object.keys(dailyStats).sort(),
          datasets: [
            {
              label: 'إدخال',
              data: Object.keys(dailyStats).sort().map(date => dailyStats[date].in),
              borderColor: '#10B981'
            },
            {
              label: 'صرف',
              data: Object.keys(dailyStats).sort().map(date => dailyStats[date].out),
              borderColor: '#EF4444'
            }
          ]
        }
      }
    ];

    return {
      title: 'تقرير حركات المخزون',
      subtitle: this.getDateRangeSubtitle(filters?.from_date, filters?.to_date),
      report_date: new Date().toISOString(),
      generated_by: 'نظام إدارة المخازن',
      filters,
      data,
      summary,
      charts
    };
  }

  async generateRequestsReport(filters?: {
    warehouse_id?: string;
    status?: string;
    request_type?: string;
    requested_by?: string;
    from_date?: string;
    to_date?: string;
  }): Promise<ReportData> {
    let query = `
      SELECT 
        sr.*,
        w.name_ar as warehouse_name,
        rt.name_ar as request_type_name,
        CASE sr.status
          WHEN 'pending' THEN 'في الانتظار'
          WHEN 'manager_approved' THEN 'موافقة الإدارة'
          WHEN 'accounting_approved' THEN 'موافقة المحاسبة'
          WHEN 'ready_for_issue' THEN 'جاهز للصرف'
          WHEN 'issued' THEN 'تم الصرف'
          WHEN 'completed' THEN 'مكتمل'
          WHEN 'rejected' THEN 'مرفوض'
          WHEN 'cancelled' THEN 'ملغي'
        END as status_ar,
        CASE sr.priority
          WHEN 'low' THEN 'منخفض'
          WHEN 'medium' THEN 'متوسط'
          WHEN 'high' THEN 'عالي'
          WHEN 'urgent' THEN 'عاجل'
        END as priority_ar
      FROM stock_requests sr
      LEFT JOIN warehouses w ON sr.warehouse_id = w.id
      LEFT JOIN request_types rt ON sr.request_type_id = rt.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.warehouse_id) {
      query += ' AND sr.warehouse_id = ?';
      params.push(filters.warehouse_id);
    }

    if (filters?.status) {
      query += ' AND sr.status = ?';
      params.push(filters.status);
    }

    if (filters?.request_type) {
      query += ' AND sr.request_type = ?';
      params.push(filters.request_type);
    }

    if (filters?.requested_by) {
      query += ' AND sr.requested_by = ?';
      params.push(filters.requested_by);
    }

    if (filters?.from_date) {
      query += ' AND DATE(sr.request_date) >= ?';
      params.push(filters.from_date);
    }

    if (filters?.to_date) {
      query += ' AND DATE(sr.request_date) <= ?';
      params.push(filters.to_date);
    }

    query += ' ORDER BY sr.request_date DESC';

    const stmt = this.db.prepare(query);
    const data = stmt.all(...params) as any[];

    // حساب الملخص
    const summary = {
      total_requests: data.length,
      total_value: data.reduce((sum, item) => sum + (item.total_value || 0), 0),
      pending_requests: data.filter(item => item.status === 'pending').length,
      approved_requests: data.filter(item => ['completed', 'issued'].includes(item.status)).length,
      rejected_requests: data.filter(item => ['rejected', 'cancelled'].includes(item.status)).length,
      average_value: data.length > 0 ? data.reduce((sum, item) => sum + (item.total_value || 0), 0) / data.length : 0
    };

    const charts: ChartData[] = [
      {
        type: 'pie',
        title: 'الطلبات حسب الحالة',
        data: {
          labels: ['في الانتظار', 'مكتملة', 'مرفوضة', 'أخرى'],
          datasets: [{
            label: 'عدد الطلبات',
            data: [
              summary.pending_requests,
              summary.approved_requests,
              summary.rejected_requests,
              data.length - summary.pending_requests - summary.approved_requests - summary.rejected_requests
            ],
            backgroundColor: ['#F59E0B', '#10B981', '#EF4444', '#6B7280']
          }]
        }
      }
    ];

    return {
      title: 'تقرير الطلبات',
      subtitle: this.getDateRangeSubtitle(filters?.from_date, filters?.to_date),
      report_date: new Date().toISOString(),
      generated_by: 'نظام إدارة المخازن',
      filters,
      data,
      summary,
      charts
    };
  }

  // ==================================================================
  // النماذج الرسمية
  // ==================================================================

  async generateIssueOrder(requestId: string): Promise<IssueOrderDocument> {
    // الحصول على بيانات الطلب
    const request = this.db.prepare(`
      SELECT 
        sr.*,
        w.name_ar as warehouse_name,
        w.code as warehouse_code,
        w.location
      FROM stock_requests sr
      LEFT JOIN warehouses w ON sr.warehouse_id = w.id
      WHERE sr.id = ?
    `).get(requestId) as any;

    if (!request) {
      throw new Error('الطلب غير موجود');
    }

    // الحصول على عناصر الطلب
    const items = this.db.prepare(`
      SELECT 
        sri.*,
        p.name_ar as product_name,
        p.code as product_code,
        p.unit
      FROM stock_request_items sri
      LEFT JOIN products p ON sri.product_id = p.id
      WHERE sri.request_id = ?
    `).all(requestId) as any[];

    // إنشاء رقم أمر الصرف
    const orderNumber = this.generateOrderNumber();

    // حساب الإجماليات
    const totals = {
      total_items: items.length,
      total_quantity: items.reduce((sum, item) => sum + (item.approved_quantity || item.requested_quantity), 0),
      total_value: items.reduce((sum, item) => sum + ((item.approved_quantity || item.requested_quantity) * item.unit_price), 0)
    };

    return {
      order: {
        order_number: orderNumber,
        request_number: request.request_number,
        issue_date: new Date().toISOString(),
        warehouse: {
          id: request.warehouse_id,
          name_ar: request.warehouse_name,
          code: request.warehouse_code,
          location: request.location
        } as Warehouse,
        requested_by: request.requested_by_name || request.requested_by,
        issued_by: 'أمين المخزن' // سيتم تحديده من المستخدم الحالي
      },
      items: items.map(item => ({
        product_name: item.product_name,
        product_code: item.product_code,
        unit: item.unit,
        requested_quantity: item.requested_quantity,
        issued_quantity: item.approved_quantity || item.requested_quantity,
        unit_price: item.unit_price,
        total_price: (item.approved_quantity || item.requested_quantity) * item.unit_price,
        notes: item.notes
      })),
      totals,
      signatures: {
        issued_by: '',
        received_by: '',
        warehouse_manager: ''
      }
    };
  }

  async generateStockCard(productId: string, warehouseId: string, fromDate?: string, toDate?: string) {
    // بيانات المنتج والمخزن
    const productInfo = this.db.prepare(`
      SELECT 
        p.*,
        w.name_ar as warehouse_name,
        sl.available_quantity as current_stock
      FROM products p
      CROSS JOIN warehouses w
      LEFT JOIN stock_levels sl ON p.id = sl.product_id AND w.id = sl.warehouse_id
      WHERE p.id = ? AND w.id = ?
    `).get(productId, warehouseId) as any;

    if (!productInfo) {
      throw new Error('المنتج أو المخزن غير موجود');
    }

    // حركات المنتج
    let query = `
      SELECT 
        sm.*,
        CASE sm.movement_type
          WHEN 'in' THEN 'إدخال'
          WHEN 'out' THEN 'صرف'
          WHEN 'transfer' THEN 'تحويل'
          WHEN 'adjustment' THEN 'تسوية'
          WHEN 'return' THEN 'إرجاع'
        END as movement_type_ar
      FROM stock_movements sm
      WHERE sm.product_id = ? AND sm.warehouse_id = ?
    `;
    const params = [productId, warehouseId];

    if (fromDate) {
      query += ' AND DATE(sm.movement_date) >= ?';
      params.push(fromDate);
    }

    if (toDate) {
      query += ' AND DATE(sm.movement_date) <= ?';
      params.push(toDate);
    }

    query += ' ORDER BY sm.movement_date ASC';

    const movements = this.db.prepare(query).all(...params) as any[];

    // حساب الرصيد الجاري
    let runningBalance = 0;
    const movementsWithBalance = movements.map(movement => {
      runningBalance += movement.quantity;
      return {
        ...movement,
        running_balance: runningBalance
      };
    });

    return {
      product: productInfo,
      movements: movementsWithBalance,
      period: {
        from_date: fromDate,
        to_date: toDate
      },
      summary: {
        opening_balance: movements.length > 0 ? movements[0].balance_before : 0,
        closing_balance: productInfo.current_stock,
        total_in: movements.filter(m => m.quantity > 0).reduce((sum, m) => sum + m.quantity, 0),
        total_out: movements.filter(m => m.quantity < 0).reduce((sum, m) => sum + Math.abs(m.quantity), 0),
        movements_count: movements.length
      }
    };
  }

  // ==================================================================
  // تقارير متقدمة
  // ==================================================================

  async generateABCAnalysis(warehouseId?: string): Promise<ReportData> {
    let query = `
      SELECT 
        p.id,
        p.name_ar as product_name,
        p.code as product_code,
        p.category,
        sl.available_quantity,
        (sl.available_quantity * p.cost_price) as stock_value,
        COALESCE(
          (SELECT SUM(ABS(quantity)) FROM stock_movements sm 
           WHERE sm.product_id = p.id AND sm.movement_type = 'out' 
           AND DATE(sm.movement_date) >= DATE('now', '-12 months')
           ${warehouseId ? 'AND sm.warehouse_id = ?' : ''}), 0
        ) as annual_usage
      FROM products p
      JOIN stock_levels sl ON p.id = sl.product_id
      ${warehouseId ? 'WHERE sl.warehouse_id = ?' : ''}
      AND p.is_active = 1
    `;
    
    const params = warehouseId ? [warehouseId, warehouseId] : [];
    const stmt = this.db.prepare(query);
    const data = stmt.all(...params) as any[];

    // حساب إجمالي قيمة المخزون
    const totalValue = data.reduce((sum, item) => sum + item.stock_value, 0);

    // ترتيب المنتجات حسب القيمة (تنازلي)
    const sortedData = data
      .map(item => ({
        ...item,
        value_percentage: (item.stock_value / totalValue) * 100
      }))
      .sort((a, b) => b.stock_value - a.stock_value);

    // تصنيف ABC
    let cumulativePercentage = 0;
    const classifiedData = sortedData.map(item => {
      cumulativePercentage += item.value_percentage;
      let classification = 'C';
      
      if (cumulativePercentage <= 80) {
        classification = 'A';
      } else if (cumulativePercentage <= 95) {
        classification = 'B';
      }

      return {
        ...item,
        cumulative_percentage: cumulativePercentage,
        abc_classification: classification
      };
    });

    // الملخص
    const summary = {
      total_items: classifiedData.length,
      class_a_items: classifiedData.filter(item => item.abc_classification === 'A').length,
      class_b_items: classifiedData.filter(item => item.abc_classification === 'B').length,
      class_c_items: classifiedData.filter(item => item.abc_classification === 'C').length,
      class_a_value: classifiedData.filter(item => item.abc_classification === 'A').reduce((sum, item) => sum + item.stock_value, 0),
      class_b_value: classifiedData.filter(item => item.abc_classification === 'B').reduce((sum, item) => sum + item.stock_value, 0),
      class_c_value: classifiedData.filter(item => item.abc_classification === 'C').reduce((sum, item) => sum + item.stock_value, 0),
      total_value: totalValue
    };

    const charts: ChartData[] = [
      {
        type: 'pie',
        title: 'تحليل ABC - توزيع القيم',
        data: {
          labels: ['الفئة A', 'الفئة B', 'الفئة C'],
          datasets: [{
            label: 'القيمة (ج.م)',
            data: [summary.class_a_value, summary.class_b_value, summary.class_c_value],
            backgroundColor: ['#EF4444', '#F59E0B', '#10B981']
          }]
        }
      },
      {
        type: 'bar',
        title: 'تحليل ABC - عدد الأصناف',
        data: {
          labels: ['الفئة A', 'الفئة B', 'الفئة C'],
          datasets: [{
            label: 'عدد الأصناف',
            data: [summary.class_a_items, summary.class_b_items, summary.class_c_items],
            backgroundColor: ['#EF4444', '#F59E0B', '#10B981']
          }]
        }
      }
    ];

    return {
      title: 'تحليل ABC للمخزون',
      subtitle: warehouseId ? 'مخزن محدد' : 'جميع المخازن',
      report_date: new Date().toISOString(),
      generated_by: 'نظام إدارة المخازن',
      data: classifiedData,
      summary,
      charts
    };
  }

  // ==================================================================
  // دوال مساعدة
  // ==================================================================

  private generateOrderNumber(): string {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    // الحصول على آخر رقم أمر في اليوم
    const lastOrder = this.db.prepare(`
      SELECT order_number FROM issue_orders
      WHERE order_number LIKE ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(`IO${year}${month}${day}%`) as { order_number: string } | undefined;

    let sequence = 1;
    if (lastOrder) {
      const lastSequence = parseInt(lastOrder.order_number.slice(-3));
      sequence = lastSequence + 1;
    }

    return `IO${year}${month}${day}${sequence.toString().padStart(3, '0')}`;
  }

  private getDateRangeSubtitle(fromDate?: string, toDate?: string): string {
    if (!fromDate && !toDate) return 'جميع الفترات';
    if (fromDate && !toDate) return `من ${fromDate}`;
    if (!fromDate && toDate) return `حتى ${toDate}`;
    return `من ${fromDate} إلى ${toDate}`;
  }

  async formatCurrency(amount: number): Promise<string> {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 2
    }).format(amount);
  }

  async exportToCSV(reportData: ReportData): Promise<string> {
    if (!reportData.data || reportData.data.length === 0) {
      throw new Error('لا توجد بيانات للتصدير');
    }

    const headers = Object.keys(reportData.data[0]).join(',');
    const rows = reportData.data.map(row => 
      Object.values(row).map(value => 
        typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      ).join(',')
    );

    return [headers, ...rows].join('\n');
  }

  // ==================================================================
  // حفظ واسترداد قوالب التقارير
  // ==================================================================

  async saveReportTemplate(template: Omit<ReportTemplate, 'id' | 'created_at'>): Promise<ReportTemplate> {
    const stmt = this.db.prepare(`
      INSERT INTO report_templates (name, name_ar, description, type, template_data, is_active, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `);

    return stmt.get(
      template.name,
      template.name_ar,
      template.description,
      template.type,
      JSON.stringify(template.template_data),
      template.is_active ? 1 : 0,
      template.created_by
    ) as ReportTemplate;
  }

  async getReportTemplates(type?: string): Promise<ReportTemplate[]> {
    let query = 'SELECT * FROM report_templates WHERE is_active = 1';
    const params: any[] = [];

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    query += ' ORDER BY name_ar';

    const stmt = this.db.prepare(query);
    const results = stmt.all(...params) as any[];

    return results.map(template => ({
      ...template,
      template_data: JSON.parse(template.template_data)
    }));
  }
}

// تصدير نسخة واحدة من الخدمة
export const stockReportsService = StockReportsService.getInstance();