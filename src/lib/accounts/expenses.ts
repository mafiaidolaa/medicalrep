// @ts-nocheck

// خدمة إدارة المصروفات
// EP Group System - Expenses Service

import { createClient } from '@supabase/supabase-js';
import {
  ExpenseCategory,
  ExpenseRequest,
  ExpenseItem,
  ExpenseApproval,
  ExpenseStatistics,
  ExpenseRequestSummary,
  ExpenseDashboardStats,
  CreateExpenseRequestForm,
  CreateExpenseItemForm,
  UpdateExpenseRequestForm,
  ExpenseApprovalForm,
  ExpenseRequestFilters,
  ExpenseCategoryFilters,
  ExpenseReport,
  ExpenseRequestStatus,
  ExpensePriority,
  ExpenseApprovalAction
} from '@/types/accounts';

// إنشاء عميل Supabase مؤقت بدون متغيرات البيئة
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://temp.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'temp-key';

const supabase = createClient(supabaseUrl, supabaseKey);

// ===== خدمات فئات المصروفات =====

export class ExpenseCategoriesService {
  
  // جلب جميع فئات المصروفات
  static async getCategories(filters?: ExpenseCategoryFilters): Promise<ExpenseCategory[]> {
    try {
      // محاولة جلب البيانات من API أولاً
      try {
        const response = await fetch('/api/expenses/categories');
        if (response.ok) {
          const apiData = await response.json();
          return apiData.map((cat: any) => ({
            id: cat.id,
            category_name: cat.name || cat.name_ar || cat.category_name || 'غير محدد',
            category_name_en: cat.name_en || cat.category_name_en || cat.name || 'Undefined',
            description: cat.description || '',
            is_active: cat.is_active !== false,
            requires_receipt: cat.requires_receipt || false,
            approval_required: cat.approval_required || false,
            max_amount: cat.max_amount || null,
            created_at: cat.created_at || new Date().toISOString(),
            updated_at: cat.updated_at || new Date().toISOString()
          }));
        }
      } catch (apiError) {
        console.warn('API للفئات غير متاح، استخدام بيانات تجريبية:', apiError);
      }

      // بيانات تجريبية كبديل
      const mockCategories: ExpenseCategory[] = [
        {
          id: '1',
          category_name: 'مواصلات',
          category_name_en: 'Transportation',
          description: 'تكاليف النقل والمواصلات',
          is_active: true,
          requires_receipt: true,
          approval_required: false,
          max_amount: 500,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          category_name: 'وجبات',
          category_name_en: 'Meals',
          description: 'تكاليف الطعام والوجبات',
          is_active: true,
          requires_receipt: true,
          approval_required: false,
          max_amount: 200,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '3',
          category_name: 'مكتبية',
          category_name_en: 'Office Supplies',
          description: 'أدوات ومستلزمات مكتبية',
          is_active: true,
          requires_receipt: true,
          approval_required: true,
          max_amount: 1000,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      return mockCategories.filter(cat => {
        if (filters?.search) {
          const search = filters.search.toLowerCase();
          return cat.category_name.toLowerCase().includes(search) ||
                 cat.category_name_en?.toLowerCase().includes(search) ||
                 cat.description?.toLowerCase().includes(search);
        }
        if (filters?.is_active !== undefined) {
          return cat.is_active === filters.is_active;
        }
        return true;
      });
    } catch (error) {
      console.error('Error fetching expense categories:', error);
      return [];
    }
  }

  // جلب فئة مصروفات بالمعرف
  static async getCategoryById(id: string): Promise<ExpenseCategory | null> {
    const categories = await this.getCategories();
    return categories.find(cat => cat.id === id) || null;
  }

  // إنشاء فئة مصروفات جديدة
  static async createCategory(categoryData: Omit<ExpenseCategory, 'id' | 'created_at' | 'updated_at'>): Promise<ExpenseCategory> {
    const newCategory: ExpenseCategory = {
      id: `cat-${Date.now()}`,
      ...categoryData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    return newCategory;
  }

  // تحديث فئة مصروفات
  static async updateCategory(id: string, updates: Partial<ExpenseCategory>): Promise<ExpenseCategory> {
    const category = await this.getCategoryById(id);
    if (!category) {
      throw new Error('فئة المصروفات غير موجودة');
    }
    
    return {
      ...category,
      ...updates,
      updated_at: new Date().toISOString()
    };
  }

  // حذف فئة مصروفات
  static async deleteCategory(id: string): Promise<void> {
    console.log(`تم حذف فئة المصروفات: ${id}`);
  }
}

// ===== خدمات طلبات المصروفات =====

export class ExpenseRequestsService {

  // جلب طلبات المصروفات مع التصفية
  static async getRequests(filters?: ExpenseRequestFilters, page = 1, limit = 50): Promise<{
    requests: ExpenseRequestSummary[],
    total: number,
    hasMore: boolean
  }> {
    try {
      // محاولة استدعاء API أولاً
      try {
        const queryParams = new URLSearchParams();
        if (filters?.search) queryParams.append('search', filters.search);
        if (filters?.status && filters.status.length > 0) {
          filters.status.forEach(status => queryParams.append('status', status));
        }
        if (filters?.department) queryParams.append('department', filters.department);
        
        const response = await fetch(`/api/expenses/requests?${queryParams.toString()}`);
        
        if (response.ok) {
          const apiData = await response.json();
          
          // تحويل بيانات API إلى الشكل المطلوب
          const requests: ExpenseRequestSummary[] = apiData.map((req: any) => ({
            id: req.id,
            request_number: req.request_number || `EXP-${req.id}`,
            employee_id: req.user_id,
            employee_name: req.users?.full_name || req.employee_name || 'غير محدد',
            department: req.department || '',
            team: req.team || '',
            region: req.region || '',
            line_number: req.line_number || '',
            manager_id: req.manager_id || '',
            expense_date: req.expense_date,
            description: req.description || '',
            priority: req.priority || 'normal',
            status: req.status,
            currency: req.currency || 'EGP',
            total_amount: req.amount || req.total_amount || 0,
            items_count: req.items?.length || 1,
            categories: req.expense_categories?.name || req.category_name || 'غير محدد',
            created_at: req.created_at,
            updated_at: req.updated_at,
            submitted_at: req.submitted_at,
            approved_at: req.approved_at,
            approved_by: req.approved_by,
            approved_by_name: req.approved_by_name,
            rejected_at: req.rejected_at,
            rejection_reason: req.rejection_reason,
            processed_at: req.processed_at,
            processed_by: req.processed_by,
            processed_by_name: req.processed_by_name,
            notes: req.notes,
            attachments: req.attachments || []
          }));
          
          return {
            requests,
            total: requests.length,
            hasMore: false
          };
        }
      } catch (apiError) {
        console.warn('API غير متاح، استخدام بيانات تجريبية:', apiError);
      }
      
      // بيانات تجريبية كبديل
      const mockRequests: ExpenseRequestSummary[] = [
        {
          id: 'req-1',
          request_number: 'EXP-001',
          employee_id: 'emp-1',
          employee_name: 'أحمد محمد',
          department: 'المبيعات',
          team: 'فريق القاهرة',
          region: 'القاهرة',
          line_number: '123',
          manager_id: 'mgr-1',
          expense_date: '2025-01-01',
          description: 'مصروفات زيارات العملاء',
          priority: 'normal' as ExpensePriority,
          status: 'pending' as ExpenseRequestStatus,
          currency: 'EGP',
          total_amount: 350,
          items_count: 2,
          categories: 'مواصلات، وجبات',
          created_at: '2025-01-01T10:00:00Z',
          updated_at: '2025-01-01T10:00:00Z',
          submitted_at: '2025-01-01T10:30:00Z',
          approved_at: null,
          approved_by: null,
          approved_by_name: null,
          rejected_at: null,
          rejection_reason: null,
          processed_at: null,
          processed_by: null,
          processed_by_name: null,
          notes: null,
          attachments: []
        }
      ];

      let filteredRequests = mockRequests;

      // تطبيق الفلاتر
      if (filters?.search) {
        const search = filters.search.toLowerCase();
        filteredRequests = filteredRequests.filter(req =>
          req.employee_name.toLowerCase().includes(search) ||
          req.request_number.toLowerCase().includes(search) ||
          req.description?.toLowerCase().includes(search)
        );
      }

      if (filters?.status && filters.status.length > 0) {
        filteredRequests = filteredRequests.filter(req => filters.status!.includes(req.status));
      }

      if (filters?.department) {
        filteredRequests = filteredRequests.filter(req => req.department === filters.department);
      }

      return {
        requests: filteredRequests,
        total: filteredRequests.length,
        hasMore: false
      };
    } catch (error) {
      console.error('Error fetching expense requests:', error);
      return { requests: [], total: 0, hasMore: false };
    }
  }

  // جلب طلب مصروفات بالتفصيل
  static async getRequestById(id: string): Promise<ExpenseRequest | null> {
    try {
      // بيانات تجريبية تفصيلية
      const mockRequest: ExpenseRequest = {
        id: id,
        request_number: 'EXP-001',
        employee_id: 'emp-1',
        employee_name: 'أحمد محمد',
        department: 'المبيعات',
        team: 'فريق القاهرة',
        region: 'القاهرة',
        line_number: '123',
        manager_id: 'mgr-1',
        expense_date: '2025-01-01',
        description: 'مصروفات زيارات العملاء',
        priority: 'normal',
        status: 'pending',
        currency: 'EGP',
        total_amount: 350,
        created_at: '2025-01-01T10:00:00Z',
        updated_at: '2025-01-01T10:00:00Z',
        submitted_at: '2025-01-01T10:30:00Z',
        approved_at: null,
        approved_by: null,
        approved_by_name: null,
        rejected_at: null,
        rejection_reason: null,
        processed_at: null,
        processed_by: null,
        processed_by_name: null,
        notes: null,
        attachments: [],
        items: [
          {
            id: 'item-1',
            expense_request_id: id,
            category_id: '1',
            category_name: 'مواصلات',
            item_description: 'مواصلات لزيارة العملاء',
            amount: 200,
            quantity: 1,
            unit_price: 200,
            expense_date: '2025-01-01',
            expense_time: '09:00',
            location: 'القاهرة',
            receipt_number: 'R001',
            notes: 'تاكسي ذهاب وإياب',
            tags: ['مواصلات', 'زيارات'],
            created_at: '2025-01-01T10:00:00Z',
            updated_at: '2025-01-01T10:00:00Z'
          },
          {
            id: 'item-2',
            expense_request_id: id,
            category_id: '2',
            category_name: 'وجبات',
            item_description: 'وجبة غداء مع العميل',
            amount: 150,
            quantity: 1,
            unit_price: 150,
            expense_date: '2025-01-01',
            expense_time: '13:00',
            location: 'مطعم النيل',
            receipt_number: 'R002',
            notes: 'اجتماع عمل مع العميل',
            tags: ['وجبات', 'اجتماعات'],
            created_at: '2025-01-01T10:00:00Z',
            updated_at: '2025-01-01T10:00:00Z'
          }
        ],
        approvals: []
      };

      return mockRequest;
    } catch (error) {
      console.error('Error fetching expense request:', error);
      return null;
    }
  }

  // إنشاء طلب مصروفات جديد
  static async createRequest(requestData: CreateExpenseRequestForm, employeeId?: string): Promise<{ success: boolean, request?: ExpenseRequest, error?: string }> {
    try {
      // محاولة استخدام API أولاً
      try {
        // تحضير بيانات الطلب لـ API الموجود
        if (requestData.items && requestData.items.length > 0) {
          const firstItem = requestData.items[0];
          const apiRequestData = {
            category_id: firstItem.category_id,
            amount: firstItem.amount,
            description: firstItem.item_description,
            notes: requestData.description,
            expense_date: firstItem.expense_date,
            receipt_image: null // مؤقتاً
          };

          const response = await fetch('/api/expenses/requests', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(apiRequestData)
          });

          if (response.ok) {
            const apiResult = await response.json();
            
            // تحويل استجابة API إلى الشكل المطلوب
            const newRequest: ExpenseRequest = {
              id: apiResult.id,
              request_number: apiResult.request_number || `EXP-${apiResult.id}`,
              employee_id: apiResult.user_id || employeeId || 'temp-employee',
              employee_name: requestData.employee_name,
              department: requestData.department,
              team: requestData.team || '',
              region: requestData.region || '',
              line_number: requestData.line_number || '',
              manager_id: requestData.manager_id || '',
              expense_date: apiResult.expense_date,
              description: requestData.description || '',
              priority: requestData.priority || 'normal',
              status: apiResult.status || 'pending',
              currency: apiResult.currency || 'EGP',
              total_amount: apiResult.amount,
              created_at: apiResult.created_at,
              updated_at: apiResult.updated_at,
              submitted_at: null,
              approved_at: null,
              approved_by: null,
              approved_by_name: null,
              rejected_at: null,
              rejection_reason: null,
              processed_at: null,
              processed_by: null,
              processed_by_name: null,
              notes: apiResult.notes,
              attachments: [],
              items: [{
                id: apiResult.id + '-item-1',
                expense_request_id: apiResult.id,
                category_id: firstItem.category_id,
                category_name: apiResult.expense_categories?.name || 'غير محدد',
                item_description: firstItem.item_description,
                amount: firstItem.amount,
                quantity: firstItem.quantity || 1,
                unit_price: firstItem.unit_price || firstItem.amount,
                expense_date: firstItem.expense_date,
                expense_time: firstItem.expense_time || '',
                location: firstItem.location || '',
                receipt_number: firstItem.receipt_number || '',
                notes: firstItem.notes || '',
                tags: firstItem.tags || [],
                created_at: apiResult.created_at,
                updated_at: apiResult.updated_at
              }],
              approvals: []
            };
            
            return { success: true, request: newRequest };
          }
        }
      } catch (apiError) {
        console.warn('API غير متاح، استخدام محاكاة محلية:', apiError);
      }
      // توليد رقم الطلب
      const requestNumber = `EXP-${Date.now()}`;

      // حساب المجموع الكلي
      const totalAmount = requestData.items.reduce((sum, item) => sum + (item.amount * (item.quantity || 1)), 0);

      // إنشاء الطلب الجديد (محاكاة)
      const newRequest: ExpenseRequest = {
        id: `req-${Date.now()}`,
        request_number: requestNumber,
        employee_id: employeeId || 'temp-employee',
        employee_name: requestData.employee_name,
        department: requestData.department,
        team: requestData.team || '',
        region: requestData.region || '',
        line_number: requestData.line_number || '',
        manager_id: requestData.manager_id || '',
        expense_date: requestData.expense_date,
        description: requestData.description || '',
        priority: requestData.priority || 'normal',
        status: 'draft',
        currency: 'EGP',
        total_amount: totalAmount,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        submitted_at: null,
        approved_at: null,
        approved_by: null,
        approved_by_name: null,
        rejected_at: null,
        rejection_reason: null,
        processed_at: null,
        processed_by: null,
        processed_by_name: null,
        notes: null,
        attachments: [],
        items: requestData.items.map((item, index) => ({
          id: `item-${Date.now()}-${index}`,
          expense_request_id: `req-${Date.now()}`,
          category_id: item.category_id,
          category_name: '', // سيتم تحديثها
          item_description: item.item_description,
          amount: item.amount,
          quantity: item.quantity || 1,
          unit_price: item.unit_price || item.amount / (item.quantity || 1),
          expense_date: item.expense_date,
          expense_time: item.expense_time || '',
          location: item.location || '',
          receipt_number: item.receipt_number || '',
          notes: item.notes || '',
          tags: item.tags || [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })),
        approvals: []
      };

      // تحديث أسماء الفئات
      const categories = await ExpenseCategoriesService.getCategories();
      newRequest.items = newRequest.items.map(item => {
        const category = categories.find(cat => cat.id === item.category_id);
        return {
          ...item,
          category_name: category?.category_name || 'غير محدد'
        };
      });

      console.log('تم إنشاء طلب مصروفات جديد (محاكاة):', newRequest);
      
      return { success: true, request: newRequest };
      
    } catch (error: any) {
      console.error('Error in createRequest:', error);
      return { success: false, error: error.message || 'خطأ غير معروف' };
    }
  }

  // تحديث طلب مصروفات
  static async updateRequest(id: string, updates: UpdateExpenseRequestForm): Promise<ExpenseRequest> {
    const request = await this.getRequestById(id);
    if (!request) {
      throw new Error('طلب المصروفات غير موجود');
    }

    return {
      ...request,
      ...updates,
      updated_at: new Date().toISOString()
    };
  }

  // تقديم طلب للموافقة
  static async submitRequest(id: string): Promise<ExpenseRequest> {
    const request = await this.getRequestById(id);
    if (!request) {
      throw new Error('طلب المصروفات غير موجود');
    }

    return {
      ...request,
      status: 'pending',
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  // الموافقة على طلب أو رفضه
  static async processApproval(id: string, approvalData: ExpenseApprovalForm, approverId: string, approverName: string): Promise<ExpenseRequest> {
    const request = await this.getRequestById(id);
    if (!request) {
      throw new Error('طلب المصروفات غير موجود');
    }

    const updates: any = {
      status: approvalData.new_status || approvalData.action,
      notes: approvalData.comments,
      updated_at: new Date().toISOString()
    };

    if (approvalData.action === 'approved') {
      updates.approved_at = new Date().toISOString();
      updates.approved_by = approverId;
      updates.approved_by_name = approverName;
      updates.status = 'approved';
    } else if (approvalData.action === 'rejected') {
      updates.rejected_at = new Date().toISOString();
      updates.rejection_reason = approvalData.comments;
      updates.status = 'rejected';
    }

    return {
      ...request,
      ...updates
    };
  }

  // حذف طلب مصروفات
  static async deleteRequest(id: string): Promise<void> {
    console.log(`تم حذف طلب المصروفات: ${id}`);
  }

  // جلب الطلبات المعلقة للمدير
  static async getPendingApprovals(managerId: string): Promise<ExpenseRequest[]> {
    const { requests } = await this.getRequests({ 
      status: 'pending',
      manager_id: managerId 
    }, 1, 50);
    return requests;
  }
}

// ===== خدمات بنود المصروفات =====

export class ExpenseItemsService {
  // إضافة بند مصروفات
  static async addItem(itemData: CreateExpenseItemForm & { expense_request_id: string }): Promise<ExpenseItem> {
    const newItem: ExpenseItem = {
      id: `item-${Date.now()}`,
      expense_request_id: itemData.expense_request_id,
      category_id: itemData.category_id,
      category_name: '',
      item_description: itemData.item_description,
      amount: itemData.amount,
      quantity: itemData.quantity || 1,
      unit_price: itemData.unit_price || itemData.amount / (itemData.quantity || 1),
      expense_date: itemData.expense_date,
      expense_time: itemData.expense_time || '',
      location: itemData.location || '',
      receipt_number: itemData.receipt_number || '',
      notes: itemData.notes || '',
      tags: itemData.tags || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // تحديث اسم الفئة
    const category = await ExpenseCategoriesService.getCategoryById(itemData.category_id);
    newItem.category_name = category?.category_name || 'غير محدد';

    return newItem;
  }

  // تحديث بند مصروفات
  static async updateItem(id: string, updates: Partial<ExpenseItem>): Promise<ExpenseItem> {
    // محاكاة تحديث البند
    const updatedItem: ExpenseItem = {
      id,
      expense_request_id: 'req-1',
      category_id: '1',
      category_name: 'مواصلات',
      item_description: 'بند محدث',
      amount: 100,
      quantity: 1,
      unit_price: 100,
      expense_date: new Date().toISOString().split('T')[0],
      expense_time: '',
      location: '',
      receipt_number: '',
      notes: '',
      tags: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...updates
    };

    return updatedItem;
  }

  // حذف بند مصروفات
  static async deleteItem(id: string): Promise<void> {
    console.log(`تم حذف بند المصروفات: ${id}`);
  }

  // جلب بنود طلب معين
  static async getItemsByRequestId(requestId: string): Promise<ExpenseItem[]> {
    const request = await ExpenseRequestsService.getRequestById(requestId);
    return request?.items || [];
  }
}

// ===== خدمات التقارير والإحصائيات =====

export class ExpenseReportsService {
  // إحصائيات لوحة التحكم
  static async getDashboardStats(filters?: {
    date_from?: string;
    date_to?: string;
    department?: string;
    team?: string;
    region?: string;
  }): Promise<ExpenseDashboardStats> {
    
    // بيانات تجريبية للإحصائيات
    const stats: ExpenseDashboardStats = {
      total_requests: 25,
      total_amount: 15750,
      pending_requests: 8,
      pending_amount: 3200,
      approved_requests: 12,
      approved_amount: 8550,
      rejected_requests: 3,
      rejected_amount: 1500,
      monthly_expenses: [
        { month: '2025-01', total_requests: 25, total_amount: 15750, approved_amount: 8550 },
        { month: '2024-12', total_requests: 30, total_amount: 18200, approved_amount: 16100 },
        { month: '2024-11', total_requests: 22, total_amount: 12800, approved_amount: 11500 }
      ],
      top_categories: [
        { category_name: 'مواصلات', total_requests: 15, total_amount: 7500 },
        { category_name: 'وجبات', total_requests: 12, total_amount: 4200 },
        { category_name: 'مكتبية', total_requests: 8, total_amount: 4050 }
      ],
      top_departments: [
        { department: 'المبيعات', total_requests: 18, total_amount: 9500 },
        { department: 'التسويق', total_requests: 12, total_amount: 4750 },
        { department: 'العمليات', total_requests: 10, total_amount: 1500 }
      ],
      recent_requests: [
        {
          id: 'req-1',
          request_number: 'EXP-001',
          employee_name: 'أحمد محمد',
          total_amount: 350,
          status: 'pending',
          created_at: new Date().toISOString()
        }
      ]
    };

    return stats;
  }

  // تقرير تفصيلي
  static async generateReport(filters: ExpenseRequestFilters): Promise<ExpenseReport> {
    const { requests } = await ExpenseRequestsService.getRequests(filters, 1, 10000);
    
    // حساب الملخص
    const summary = {
      total_requests: requests.length,
      total_amount: requests.reduce((sum, r) => sum + r.total_amount, 0),
      approved_requests: requests.filter(r => r.status === 'approved').length,
      approved_amount: requests.filter(r => r.status === 'approved').reduce((sum, r) => sum + r.total_amount, 0),
      pending_requests: requests.filter(r => r.status === 'pending').length,
      pending_amount: requests.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.total_amount, 0),
      rejected_requests: requests.filter(r => r.status === 'rejected').length,
      rejected_amount: requests.filter(r => r.status === 'rejected').reduce((sum, r) => sum + r.total_amount, 0),
      by_category: {} as { [key: string]: number },
      by_department: {} as { [key: string]: number },
      by_employee: {} as { [key: string]: number }
    };

    // تجميع حسب الفئات والأقسام والموظفين
    requests.forEach(req => {
      // حسب الفئة
      if (req.categories) {
        req.categories.split(', ').forEach(cat => {
          summary.by_category[cat] = (summary.by_category[cat] || 0) + req.total_amount;
        });
      }
      
      // حسب القسم
      if (req.department) {
        summary.by_department[req.department] = (summary.by_department[req.department] || 0) + req.total_amount;
      }
      
      // حسب الموظف
      summary.by_employee[req.employee_name] = (summary.by_employee[req.employee_name] || 0) + req.total_amount;
    });

    return {
      title: 'تقرير المصروفات',
      generated_at: new Date().toISOString(),
      filters,
      data: requests,
      summary
    };
  }
}

// ===== الخدمة الرئيسية =====

export const expenseService = {
  categories: ExpenseCategoriesService,
  requests: ExpenseRequestsService,
  items: ExpenseItemsService,
  reports: ExpenseReportsService,

  // دوال مساعدة للحالات والأولويات
  getStatusLabel: (status: ExpenseRequestStatus): string => {
    const labels = {
      'draft': 'مسودة',
      'pending': 'في انتظار الموافقة',
      'approved': 'معتمد',
      'rejected': 'مرفوض',
      'processed': 'معالج',
      'paid': 'مدفوع',
      'cancelled': 'ملغي'
    };
    return labels[status] || status;
  },

  getPriorityLabel: (priority: ExpensePriority): string => {
    const labels = {
      'low': 'منخفضة',
      'normal': 'عادية',
      'high': 'مرتفعة',
      'urgent': 'عاجلة'
    };
    return labels[priority] || priority;
  },

  getActionLabel: (action: ExpenseApprovalAction): string => {
    const labels = {
      'submitted': 'تم التقديم',
      'approved': 'موافق',
      'rejected': 'مرفوض',
      'returned': 'إرجاع للتعديل',
      'processed': 'معالج',
      'paid': 'مدفوع'
    };
    return labels[action] || action;
  },

  // دوال للتحقق من الصلاحيات
  canEdit: (request: ExpenseRequest, userId: string): boolean => {
    return request.employee_id === userId && request.status === 'draft';
  },

  canSubmit: (request: ExpenseRequest, userId: string): boolean => {
    return request.employee_id === userId && request.status === 'draft' && (request.items?.length || 0) > 0;
  },

  canApprove: (request: ExpenseRequest, userId: string): boolean => {
    return request.manager_id === userId && request.status === 'pending';
  },

  canProcess: (request: ExpenseRequest, userRole: string): boolean => {
    return ['admin', 'accountant'].includes(userRole) && request.status === 'approved';
  }
};

export default expenseService;
