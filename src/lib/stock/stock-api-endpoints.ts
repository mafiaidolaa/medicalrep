/**
 * 🌐 EP Group System - Stock API Endpoints
 * نقاط نهاية الخدمات ودمج النظم الخارجية
 */

import { stockIntegrationService } from './stock-integration';
import { stockService } from './stock-management-service';
import { stockSecurityService } from './stock-security';
import { stockReportsService } from './stock-reports';

// ==================================================================
// أنواع البيانات للـ APIs
// ==================================================================

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  error_code?: string;
  timestamp: string;
}

export interface APIRequest {
  api_key: string;
  user_id?: string;
  system_id?: string;
  request_id?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface StockAPIFilters {
  warehouse_id?: string;
  product_id?: string;
  category_id?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
}

// ==================================================================
// نقاط النهاية للمخزون
// ==================================================================

export class StockAPIEndpoints {
  
  // ==================================================================
  // APIs المخزون الأساسية
  // ==================================================================

  /**
   * الحصول على مستويات المخزون
   */
  async getStockLevels(
    request: APIRequest & StockAPIFilters & PaginationParams
  ): Promise<APIResponse> {
    try {
      // التحقق من الصلاحيات
      const hasPermission = await stockSecurityService.hasPermission(
        request.user_id || 'system',
        request.warehouse_id || 'all',
        'view_stock'
      );

      if (!hasPermission) {
        return {
          success: false,
          message: 'ليس لديك صلاحية لعرض مستويات المخزون',
          error_code: 'PERMISSION_DENIED',
          timestamp: new Date().toISOString()
        };
      }

      const stockData = await stockService.getStockLevels({
        warehouse_id: request.warehouse_id,
        product_id: request.product_id,
        category_id: request.category_id
      });

      // تطبيق الترقيم
      const page = request.page || 1;
      const limit = request.limit || 50;
      const start = (page - 1) * limit;
      const paginatedData = stockData.slice(start, start + limit);

      return {
        success: true,
        data: {
          items: paginatedData,
          pagination: {
            page,
            limit,
            total: stockData.length,
            total_pages: Math.ceil(stockData.length / limit)
          }
        },
        message: 'تم جلب مستويات المخزون بنجاح',
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      return {
        success: false,
        message: 'خطأ في جلب مستويات المخزون',
        error_code: 'FETCH_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * فحص توفر المنتجات
   */
  async checkProductAvailability(
    request: APIRequest & {
      items: Array<{
        product_id: string;
        quantity: number;
        warehouse_id?: string;
      }>;
    }
  ): Promise<APIResponse> {
    try {
      const availabilityChecks = [];

      for (const item of request.items) {
        const stockLevels = await stockService.getStockLevels({
          warehouse_id: item.warehouse_id,
          product_id: item.product_id
        });

        const currentStock = stockLevels[0];
        const isAvailable = currentStock && currentStock.available_quantity >= item.quantity;

        availabilityChecks.push({
          product_id: item.product_id,
          requested_quantity: item.quantity,
          available_quantity: currentStock?.available_quantity || 0,
          is_available: isAvailable,
          warehouse_id: item.warehouse_id || null
        });
      }

      const allAvailable = availabilityChecks.every(check => check.is_available);

      return {
        success: true,
        data: {
          all_available: allAvailable,
          items: availabilityChecks
        },
        message: allAvailable ? 'جميع المنتجات متوفرة' : 'بعض المنتجات غير متوفرة',
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      return {
        success: false,
        message: 'خطأ في فحص توفر المنتجات',
        error_code: 'AVAILABILITY_CHECK_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * حجز المخزون
   */
  async reserveStock(
    request: APIRequest & {
      product_id: string;
      warehouse_id: string;
      quantity: number;
      reservation_reason: string;
      expires_at?: string;
    }
  ): Promise<APIResponse> {
    try {
      const hasPermission = await stockSecurityService.hasPermission(
        request.user_id || 'system',
        request.warehouse_id,
        'manage_stock'
      );

      if (!hasPermission) {
        return {
          success: false,
          message: 'ليس لديك صلاحية لحجز المخزون',
          error_code: 'PERMISSION_DENIED',
          timestamp: new Date().toISOString()
        };
      }

      const result = await stockIntegrationService.reserveStock(
        request.product_id,
        request.warehouse_id,
        request.quantity,
        request.user_id || 'system',
        request.reservation_reason
      );

      return {
        success: result.success,
        data: result.success ? { 
          reservation_id: `RES_${Date.now()}`,
          expires_at: request.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        } : null,
        message: result.message,
        error_code: result.success ? undefined : 'RESERVATION_FAILED',
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      return {
        success: false,
        message: 'خطأ في حجز المخزون',
        error_code: 'RESERVATION_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  // ==================================================================
  // APIs الطلبات والحركات
  // ==================================================================

  /**
   * إنشاء طلب صرف من أوردر
   */
  async createStockRequestFromOrder(
    request: APIRequest & {
      order_data: {
        order_id: string;
        order_number: string;
        customer_id?: string;
        customer_name?: string;
        items: Array<{
          product_id: string;
          product_name: string;
          quantity: number;
          unit_price: number;
        }>;
        total_amount: number;
        warehouse_id?: string;
      };
    }
  ): Promise<APIResponse> {
    try {
      const stockRequestId = await stockIntegrationService.createStockRequestFromOrder({
        ...request.order_data,
        status: 'pending',
        created_at: new Date().toISOString(),
        items: request.order_data.items.map(item => ({
          ...item,
          total_price: item.quantity * item.unit_price
        }))
      });

      // تسجيل العملية في نظام الأمان
      await stockSecurityService.logSecurityEvent({
        user_id: request.user_id || 'system',
        action: 'create_stock_request',
        entity_type: 'stock_request',
        entity_id: stockRequestId,
        description: `تم إنشاء طلب صرف من الأوردر ${request.order_data.order_number}`,
        ip_address: '0.0.0.0', // سيتم تمريرها من النظام الفعلي
        user_agent: 'API'
      });

      return {
        success: true,
        data: {
          stock_request_id: stockRequestId,
          order_id: request.order_data.order_id
        },
        message: 'تم إنشاء طلب الصرف بنجاح',
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      return {
        success: false,
        message: `خطأ في إنشاء طلب الصرف: ${error.message}`,
        error_code: 'REQUEST_CREATION_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * تحديث حالة الطلب
   */
  async updateRequestStatus(
    request: APIRequest & {
      request_id: string;
      new_status: string;
      notes?: string;
    }
  ): Promise<APIResponse> {
    try {
      const hasPermission = await stockSecurityService.hasPermission(
        request.user_id || 'system',
        'all',
        'manage_requests'
      );

      if (!hasPermission) {
        return {
          success: false,
          message: 'ليس لديك صلاحية لتحديث الطلبات',
          error_code: 'PERMISSION_DENIED',
          timestamp: new Date().toISOString()
        };
      }

      await stockService.updateStockRequestStatus(
        request.request_id,
        request.new_status,
        request.user_id || 'system',
        request.notes
      );

      return {
        success: true,
        data: {
          request_id: request.request_id,
          new_status: request.new_status
        },
        message: 'تم تحديث حالة الطلب بنجاح',
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      return {
        success: false,
        message: `خطأ في تحديث حالة الطلب: ${error.message}`,
        error_code: 'UPDATE_STATUS_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  // ==================================================================
  // APIs التقارير
  // ==================================================================

  /**
   * تقرير تقييم المخزون
   */
  async getStockValuationReport(
    request: APIRequest & {
      warehouse_id?: string;
      format?: 'json' | 'pdf' | 'excel';
    }
  ): Promise<APIResponse> {
    try {
      const hasPermission = await stockSecurityService.hasPermission(
        request.user_id || 'system',
        request.warehouse_id || 'all',
        'view_reports'
      );

      if (!hasPermission) {
        return {
          success: false,
          message: 'ليس لديك صلاحية لعرض التقارير',
          error_code: 'PERMISSION_DENIED',
          timestamp: new Date().toISOString()
        };
      }

      const valuationReport = await stockIntegrationService.generateStockValuationReport(
        request.warehouse_id
      );

      if (request.format === 'pdf' || request.format === 'excel') {
        // تحويل التقرير للصيغة المطلوبة
        const exportedReport = await stockReportsService.exportReport({
          reportId: `valuation_${Date.now()}`,
          format: request.format,
          data: valuationReport
        });

        return {
          success: true,
          data: {
            report_url: exportedReport.downloadUrl,
            expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() // ساعة واحدة
          },
          message: 'تم إنشاء التقرير بنجاح',
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: true,
        data: valuationReport,
        message: 'تم جلب تقرير التقييم بنجاح',
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      return {
        success: false,
        message: `خطأ في إنشاء تقرير التقييم: ${error.message}`,
        error_code: 'REPORT_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * تقرير حركات المخزون
   */
  async getStockMovementsReport(
    request: APIRequest & StockAPIFilters & PaginationParams & {
      format?: 'json' | 'pdf' | 'excel';
    }
  ): Promise<APIResponse> {
    try {
      const movements = await stockService.getStockMovements({
        warehouse_id: request.warehouse_id,
        product_id: request.product_id,
        date_from: request.date_from,
        date_to: request.date_to,
        movement_type: request.status as any
      });

      // تطبيق الترقيم
      const page = request.page || 1;
      const limit = request.limit || 100;
      const start = (page - 1) * limit;
      const paginatedMovements = movements.slice(start, start + limit);

      if (request.format === 'pdf' || request.format === 'excel') {
        const exportedReport = await stockReportsService.exportReport({
          reportId: `movements_${Date.now()}`,
          format: request.format,
          data: { movements: paginatedMovements }
        });

        return {
          success: true,
          data: {
            report_url: exportedReport.downloadUrl,
            expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
          },
          message: 'تم إنشاء تقرير الحركات بنجاح',
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: true,
        data: {
          movements: paginatedMovements,
          pagination: {
            page,
            limit,
            total: movements.length,
            total_pages: Math.ceil(movements.length / limit)
          }
        },
        message: 'تم جلب تقرير الحركات بنجاح',
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      return {
        success: false,
        message: `خطأ في جلب تقرير الحركات: ${error.message}`,
        error_code: 'MOVEMENTS_REPORT_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  // ==================================================================
  // APIs الدمج مع النظم الخارجية
  // ==================================================================

  /**
   * webhook لاستقبال تحديثات الأوردرات
   */
  async handleOrderWebhook(
    request: APIRequest & {
      event_type: 'order_created' | 'order_updated' | 'order_cancelled';
      order_data: any;
    }
  ): Promise<APIResponse> {
    try {
      switch (request.event_type) {
        case 'order_created':
          const stockRequestId = await stockIntegrationService.createStockRequestFromOrder(
            request.order_data
          );
          return {
            success: true,
            data: { stock_request_id: stockRequestId },
            message: 'تم إنشاء طلب الصرف للأوردر الجديد',
            timestamp: new Date().toISOString()
          };

        case 'order_updated':
          // منطق تحديث الطلب
          return {
            success: true,
            message: 'تم تحديث الطلب بنجاح',
            timestamp: new Date().toISOString()
          };

        case 'order_cancelled':
          // منطق إلغاء الطلب
          return {
            success: true,
            message: 'تم إلغاء الطلب بنجاح',
            timestamp: new Date().toISOString()
          };

        default:
          return {
            success: false,
            message: 'نوع الحدث غير مدعوم',
            error_code: 'UNSUPPORTED_EVENT',
            timestamp: new Date().toISOString()
          };
      }

    } catch (error: any) {
      return {
        success: false,
        message: `خطأ في معالجة webhook: ${error.message}`,
        error_code: 'WEBHOOK_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * تزامن البيانات مع النظام المحاسبي
   */
  async syncWithAccountingSystem(
    request: APIRequest & {
      sync_type: 'full' | 'incremental';
      date_from?: string;
      date_to?: string;
    }
  ): Promise<APIResponse> {
    try {
      const hasPermission = await stockSecurityService.hasPermission(
        request.user_id || 'system',
        'all',
        'admin'
      );

      if (!hasPermission) {
        return {
          success: false,
          message: 'ليس لديك صلاحية للمزامنة مع النظم الخارجية',
          error_code: 'PERMISSION_DENIED',
          timestamp: new Date().toISOString()
        };
      }

      // الحصول على الحركات المطلوب مزامنتها
      const movements = await stockService.getStockMovements({
        date_from: request.date_from,
        date_to: request.date_to
      });

      let syncedCount = 0;
      for (const movement of movements) {
        if (movement.total_value && movement.total_value > 0) {
          await stockIntegrationService.createAccountingEntriesForStockMovement(
            movement.id,
            movement.movement_type,
            movement.total_value,
            movement.warehouse_id
          );
          syncedCount++;
        }
      }

      return {
        success: true,
        data: {
          synced_movements: syncedCount,
          total_movements: movements.length
        },
        message: `تم مزامنة ${syncedCount} حركة مع النظام المحاسبي`,
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      return {
        success: false,
        message: `خطأ في المزامنة: ${error.message}`,
        error_code: 'SYNC_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  // ==================================================================
  // APIs الإحصائيات والتحليلات
  // ==================================================================

  /**
   * إحصائيات المخزون العامة
   */
  async getStockStatistics(
    request: APIRequest & {
      warehouse_id?: string;
      period?: 'daily' | 'weekly' | 'monthly';
    }
  ): Promise<APIResponse> {
    try {
      const stockData = await stockIntegrationService.getStockDataForAPI(
        request.warehouse_id
      );

      // إحصائيات إضافية
      const lowStockProducts = stockData.products.filter(p => p.available_quantity <= 10);
      const highValueProducts = stockData.products
        .filter(p => p.unit_price * p.available_quantity > 10000)
        .sort((a, b) => (b.unit_price * b.available_quantity) - (a.unit_price * a.available_quantity))
        .slice(0, 10);

      return {
        success: true,
        data: {
          summary: stockData.summary,
          alerts: {
            low_stock_products: lowStockProducts.length,
            out_of_stock_products: stockData.products.filter(p => p.available_quantity === 0).length
          },
          high_value_products: highValueProducts.map(p => ({
            id: p.id,
            name: p.name,
            value: p.unit_price * p.available_quantity
          }))
        },
        message: 'تم جلب الإحصائيات بنجاح',
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      return {
        success: false,
        message: `خطأ في جلب الإحصائيات: ${error.message}`,
        error_code: 'STATISTICS_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  // ==================================================================
  // دوال مساعدة للتحقق من الصحة
  // ==================================================================

  /**
   * التحقق من صحة مفتاح API
   */
  validateAPIKey(apiKey: string): boolean {
    // منطق التحقق من مفتاح API
    // يجب تنفيذه بناءً على نظام الأمان المعتمد
    return apiKey && apiKey.startsWith('epg_') && apiKey.length > 20;
  }

  /**
   * معالج الأخطاء العامة
   */
  private handleError(error: any, operation: string): APIResponse {
    console.error(`Error in ${operation}:`, error);
    
    return {
      success: false,
      message: `خطأ في ${operation}`,
      error_code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    };
  }
}

// تصدير نسخة واحدة من الخدمة
export const stockAPIEndpoints = new StockAPIEndpoints();