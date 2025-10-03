/**
 * 🏢 EP Group System - Professional Expense Management Service
 * خدمة إدارة النفقات الاحترافية
 * 
 * يوفر هذا المديول نظاماً متكاملاً لإدارة النفقات يشمل:
 * - إدارة طلبات النفقات
 * - التسلسل الهرمي للموافقات
 * - إدارة الميزانيات والحدود
 * - التوثيق والطباعة
 * - الإشعارات والتنبيهات
 * - التحليلات والتقارير
 */

import { supabase } from '../supabase';
import { getSiteSettingsByCategory, getExpenseSettings } from '../site-settings';

// ===== أنواع البيانات الأساسية =====
export interface ExpenseCategory {
  id: string;
  name: string;
  name_ar: string;
  name_en: string;
  description?: string;
  icon: string;
  color: string;
  parent_id?: string;
  is_active: boolean;
  requires_receipt: boolean;
  max_amount?: number;
  auto_approve_threshold?: number;
  approval_workflow?: ApprovalLevel[];
  created_at: string;
  updated_at: string;
}

export interface ExpenseRequest {
  id: string;
  request_number: string;
  title: string;
  description?: string;
  amount: number;
  currency: string;
  exchange_rate: number;

  // Request Details
  category_id: string;
  expense_date: string;
  location?: string;
  vendor_name?: string;
  vendor_details?: any;

  // User Information
  user_id: string;
  department?: string;
  cost_center?: string;
  project_code?: string;

  // Status and Workflow
  status: ExpenseStatus;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  current_approval_level: number;
  required_approval_levels: number;
  approval_workflow?: ApprovalLevel[];

  // Payment Information
  payment_method?: string;
  payment_reference?: string;
  payment_date?: string;
  paid_amount: number;

  // Attachments and Documentation
  receipt_files: FileAttachment[];
  supporting_documents: FileAttachment[];
  approval_documents: FileAttachment[];

  // Additional Information
  tags: string[];
  metadata: Record<string, any>;
  notes?: string;
  internal_notes?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  approved_at?: string;
  rejected_at?: string;
  paid_at?: string;

  // Relations
  category?: ExpenseCategory;
  approvals?: ExpenseApproval[];
  user?: any;
}

export interface ExpenseApproval {
  id: string;
  expense_request_id: string;
  approval_level: number;
  approver_id: string;
  approver_role: string;
  status: 'pending' | 'approved' | 'rejected' | 'delegated';
  decision_date?: string;
  comments?: string;
  conditions?: string;
  delegated_to?: string;
  delegated_at?: string;
  delegation_reason?: string;
  max_amount_authorized?: number;
  approval_scope?: string;
  approval_method: 'manual' | 'auto' | 'delegated';
  created_at: string;
  updated_at: string;
}

export interface ApprovalLevel {
  level: number;
  role: string;
  max_amount: number;
  required: boolean;
  auto_approve?: boolean;
  delegation_allowed?: boolean;
  timeout_days?: number;
}

export type ExpenseStatus = 
  | 'draft' 
  | 'submitted' 
  | 'under_review' 
  | 'manager_approved' 
  | 'admin_approved' 
  | 'accounting_approved' 
  | 'approved' 
  | 'rejected' 
  | 'cancelled' 
  | 'paid' 
  | 'partially_paid';

export interface FileAttachment {
  id: string;
  filename: string;
  original_name: string;
  file_type: string;
  file_size: number;
  file_path: string;
  uploaded_at: string;
  uploaded_by: string;
}

export interface ExpenseBudget {
  id: string;
  name: string;
  description?: string;
  department?: string;
  cost_center?: string;
  category_id?: string;
  user_id?: string;
  total_budget: number;
  used_budget: number;
  available_budget: number;
  period_type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  period_start: string;
  period_end: string;
  allow_overspend: boolean;
  overspend_limit?: number;
  alert_threshold_percent: number;
  status: 'draft' | 'active' | 'suspended' | 'expired';
  created_at: string;
  updated_at: string;
}

// ===== كلاس إدارة النفقات الرئيسي =====
export class ExpenseManagementService {
  private static instance: ExpenseManagementService;

  private constructor() {}

  public static getInstance(): ExpenseManagementService {
    if (!ExpenseManagementService.instance) {
      ExpenseManagementService.instance = new ExpenseManagementService();
    }
    return ExpenseManagementService.instance;
  }

  // ===== إدارة فئات النفقات =====
  
  /**
   * الحصول على جميع فئات النفقات النشطة
   */
  async getExpenseCategories(): Promise<ExpenseCategory[]> {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('is_active', true)
        .order('name_ar');

      if (error) {
        console.error('❌ Error fetching expense categories:', error);
        return this.getDefaultCategories();
      }

      return data || this.getDefaultCategories();
    } catch (error) {
      console.error('❌ Error in getExpenseCategories:', error);
      return this.getDefaultCategories();
    }
  }

  /**
   * إنشاء فئة نفقات جديدة
   */
  async createExpenseCategory(categoryData: Partial<ExpenseCategory>): Promise<ExpenseCategory | null> {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .insert([categoryData])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating expense category:', error);
        return null;
      }

      console.log('✅ Expense category created successfully:', data.name_ar);
      return data;
    } catch (error) {
      console.error('❌ Error in createExpenseCategory:', error);
      return null;
    }
  }

  // ===== إدارة طلبات النفقات =====

  /**
   * إنشاء طلب نفقة جديد
   */
  async createExpenseRequest(requestData: Partial<ExpenseRequest>): Promise<ExpenseRequest | null> {
    try {
      // الحصول على إعدادات النفقات
      const expenseSettings = await getExpenseSettings();
      
      // التحقق من الحدود والقيود
      if (requestData.amount && requestData.amount > expenseSettings.max_expense_amount) {
        throw new Error(`المبلغ يتجاوز الحد الأقصى المسموح: ${expenseSettings.max_expense_amount} ريال`);
      }

      // تحديد مستوى الموافقة المطلوب
      const approvalWorkflow = this.determineApprovalWorkflow(
        requestData.amount || 0,
        expenseSettings.approval_workflow
      );

      const expenseRequest: Partial<ExpenseRequest> = {
        ...requestData,
        status: 'draft' as ExpenseStatus,
        priority: requestData.priority || 'normal',
        current_approval_level: 0,
        required_approval_levels: approvalWorkflow.length,
        approval_workflow: approvalWorkflow,
        currency: requestData.currency || 'SAR',
        exchange_rate: requestData.exchange_rate || 1.0,
        paid_amount: 0,
        receipt_files: requestData.receipt_files || [],
        supporting_documents: requestData.supporting_documents || [],
        approval_documents: [],
        tags: requestData.tags || [],
        metadata: requestData.metadata || {}
      };

      const { data, error } = await supabase
        .from('expense_requests')
        .insert([expenseRequest])
        .select(`
          *,
          category:expense_categories(*)
        `)
        .single();

      if (error) {
        console.error('❌ Error creating expense request:', error);
        return null;
      }

      console.log('✅ Expense request created successfully:', data.request_number);

      // إرسال الإشعارات
      await this.sendNotification(data.user_id, {
        type: 'request_submitted',
        title: 'تم إنشاء طلب نفقة جديد',
        message: `تم إنشاء طلب النفقة رقم ${data.request_number} بمبلغ ${data.amount} ${data.currency}`,
        expense_request_id: data.id,
        action_url: `/expenses/${data.id}`
      });

      return data;
    } catch (error) {
      console.error('❌ Error in createExpenseRequest:', error);
      return null;
    }
  }

  /**
   * تحديث طلب نفقة
   */
  async updateExpenseRequest(id: string, updates: Partial<ExpenseRequest>): Promise<ExpenseRequest | null> {
    try {
      const { data, error } = await supabase
        .from('expense_requests')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          category:expense_categories(*),
          approvals:expense_approvals(*)
        `)
        .single();

      if (error) {
        console.error('❌ Error updating expense request:', error);
        return null;
      }

      console.log('✅ Expense request updated successfully:', data.request_number);
      return data;
    } catch (error) {
      console.error('❌ Error in updateExpenseRequest:', error);
      return null;
    }
  }

  /**
   * تقديم طلب النفقة للمراجعة
   */
  async submitExpenseRequest(id: string, userId: string): Promise<boolean> {
    try {
      const { data: request, error: fetchError } = await supabase
        .from('expense_requests')
        .select('*, category:expense_categories(*)')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (fetchError || !request) {
        console.error('❌ Expense request not found or access denied');
        return false;
      }

      // التحقق من متطلبات التقديم
      const expenseSettings = await getExpenseSettings();
      if (expenseSettings.require_receipt && (!request.receipt_files || request.receipt_files.length === 0)) {
        throw new Error('يجب إرفاق فاتورة أو إيصال');
      }

      // تحديث حالة الطلب
      const { error: updateError } = await supabase
        .from('expense_requests')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) {
        console.error('❌ Error submitting expense request:', updateError);
        return false;
      }

      // إنشاء سجل الموافقة الأول
      await this.initializeApprovalProcess(request);

      console.log('✅ Expense request submitted successfully:', request.request_number);
      return true;
    } catch (error) {
      console.error('❌ Error in submitExpenseRequest:', error);
      return false;
    }
  }

  /**
   * الحصول على طلبات النفقات للمستخدم
   */
  async getUserExpenseRequests(
    userId: string, 
    filters?: {
      status?: ExpenseStatus;
      category?: string;
      fromDate?: string;
      toDate?: string;
      minAmount?: number;
      maxAmount?: number;
    }
  ): Promise<ExpenseRequest[]> {
    try {
      let query = supabase
        .from('expense_requests')
        .select(`
          *,
          category:expense_categories(*),
          approvals:expense_approvals(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // تطبيق الفلاتر
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.category) {
        query = query.eq('category_id', filters.category);
      }
      if (filters?.fromDate) {
        query = query.gte('expense_date', filters.fromDate);
      }
      if (filters?.toDate) {
        query = query.lte('expense_date', filters.toDate);
      }
      if (filters?.minAmount) {
        query = query.gte('amount', filters.minAmount);
      }
      if (filters?.maxAmount) {
        query = query.lte('amount', filters.maxAmount);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching user expense requests:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error in getUserExpenseRequests:', error);
      return [];
    }
  }

  /**
   * الحصول على الطلبات المطلوب موافقتها من المدير
   */
  async getPendingApprovalsForManager(managerId: string): Promise<ExpenseRequest[]> {
    try {
      const { data, error } = await supabase
        .from('expense_requests')
        .select(`
          *,
          category:expense_categories(*),
          approvals:expense_approvals(*),
          user:auth.users(*)
        `)
        .in('status', ['submitted', 'under_review'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching pending approvals:', error);
        return [];
      }

      // فلترة الطلبات التي تحتاج موافقة هذا المدير
      const filteredRequests = (data || []).filter(request => {
        return this.needsManagerApproval(request, managerId);
      });

      return filteredRequests;
    } catch (error) {
      console.error('❌ Error in getPendingApprovalsForManager:', error);
      return [];
    }
  }

  // ===== نظام الموافقات =====

  /**
   * الموافقة على طلب نفقة
   */
  async approveExpenseRequest(
    requestId: string,
    approverId: string,
    approverRole: string,
    comments?: string,
    conditions?: string
  ): Promise<boolean> {
    try {
      const { data: request, error: fetchError } = await supabase
        .from('expense_requests')
        .select(`
          *,
          category:expense_categories(*),
          approvals:expense_approvals(*)
        `)
        .eq('id', requestId)
        .single();

      if (fetchError || !request) {
        console.error('❌ Expense request not found');
        return false;
      }

      // التحقق من صلاحية الموافقة
      const canApprove = await this.canUserApprove(request, approverId, approverRole);
      if (!canApprove) {
        console.error('❌ User does not have permission to approve this request');
        return false;
      }

      // تحديد مستوى الموافقة الحالي
      const currentLevel = request.current_approval_level + 1;

      // إنشاء سجل الموافقة
      const { error: approvalError } = await supabase
        .from('expense_approvals')
        .insert([{
          expense_request_id: requestId,
          approval_level: currentLevel,
          approver_id: approverId,
          approver_role: approverRole,
          status: 'approved',
          decision_date: new Date().toISOString(),
          comments,
          conditions,
          approval_method: 'manual'
        }]);

      if (approvalError) {
        console.error('❌ Error creating approval record:', approvalError);
        return false;
      }

      // تحديث حالة الطلب
      const isFullyApproved = currentLevel >= request.required_approval_levels;
      const newStatus = isFullyApproved ? 'approved' : this.getNextApprovalStatus(currentLevel);

      const updates: Partial<ExpenseRequest> = {
        current_approval_level: currentLevel,
        status: newStatus as ExpenseStatus,
        updated_at: new Date().toISOString()
      };

      if (isFullyApproved) {
        updates.approved_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('expense_requests')
        .update(updates)
        .eq('id', requestId);

      if (updateError) {
        console.error('❌ Error updating expense request status:', updateError);
        return false;
      }

      // إرسال الإشعارات
      await this.sendApprovalNotifications(request, approverId, 'approved', comments);

      console.log('✅ Expense request approved successfully:', request.request_number);
      return true;
    } catch (error) {
      console.error('❌ Error in approveExpenseRequest:', error);
      return false;
    }
  }

  /**
   * رفض طلب نفقة
   */
  async rejectExpenseRequest(
    requestId: string,
    approverId: string,
    approverRole: string,
    reason: string
  ): Promise<boolean> {
    try {
      const { data: request, error: fetchError } = await supabase
        .from('expense_requests')
        .select(`
          *,
          category:expense_categories(*)
        `)
        .eq('id', requestId)
        .single();

      if (fetchError || !request) {
        console.error('❌ Expense request not found');
        return false;
      }

      // التحقق من صلاحية الرفض
      const canApprove = await this.canUserApprove(request, approverId, approverRole);
      if (!canApprove) {
        console.error('❌ User does not have permission to reject this request');
        return false;
      }

      // إنشاء سجل الرفض
      const currentLevel = request.current_approval_level + 1;
      const { error: approvalError } = await supabase
        .from('expense_approvals')
        .insert([{
          expense_request_id: requestId,
          approval_level: currentLevel,
          approver_id: approverId,
          approver_role: approverRole,
          status: 'rejected',
          decision_date: new Date().toISOString(),
          comments: reason,
          approval_method: 'manual'
        }]);

      if (approvalError) {
        console.error('❌ Error creating rejection record:', approvalError);
        return false;
      }

      // تحديث حالة الطلب
      const { error: updateError } = await supabase
        .from('expense_requests')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (updateError) {
        console.error('❌ Error updating expense request status:', updateError);
        return false;
      }

      // إرسال الإشعارات
      await this.sendApprovalNotifications(request, approverId, 'rejected', reason);

      console.log('✅ Expense request rejected successfully:', request.request_number);
      return true;
    } catch (error) {
      console.error('❌ Error in rejectExpenseRequest:', error);
      return false;
    }
  }

  // ===== حذف وأرشفة النفقات =====

  /**
   * حذف طلب نفقة (نقل إلى سلة المهملات)
   */
  async deleteExpenseRequest(
    requestId: string,
    userId: string,
    reason?: string,
    deletionType: 'soft_delete' | 'archive' = 'soft_delete'
  ): Promise<boolean> {
    try {
      // الحصول على بيانات الطلب
      const { data: request, error: fetchError } = await supabase
        .from('expense_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError || !request) {
        console.error('❌ Expense request not found');
        return false;
      }

      // التحقق من الصلاحيات (المستخدم يمكنه حذف طلباته في حالة المسودة أو المرفوضة)
      const canDelete = request.user_id === userId && 
                       (request.status === 'draft' || request.status === 'rejected');
      
      if (!canDelete) {
        console.error('❌ User does not have permission to delete this request');
        return false;
      }

      // حفظ البيانات في جدول المحذوفات
      const { error: archiveError } = await supabase
        .from('expense_deleted')
        .insert([{
          original_expense_id: requestId,
          original_data: request,
          deleted_by: userId,
          deletion_reason: reason,
          deletion_type: deletionType,
          can_recover: true,
          recovery_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 يوم
        }]);

      if (archiveError) {
        console.error('❌ Error archiving deleted expense:', archiveError);
        return false;
      }

      // حذف الطلب من الجدول الرئيسي
      const { error: deleteError } = await supabase
        .from('expense_requests')
        .delete()
        .eq('id', requestId);

      if (deleteError) {
        console.error('❌ Error deleting expense request:', deleteError);
        return false;
      }

      console.log('✅ Expense request deleted successfully:', request.request_number);
      return true;
    } catch (error) {
      console.error('❌ Error in deleteExpenseRequest:', error);
      return false;
    }
  }

  /**
   * استرداد طلب نفقة محذوف
   */
  async recoverDeletedExpenseRequest(deletedId: string, userId: string): Promise<boolean> {
    try {
      // الحصول على البيانات المحذوفة
      const { data: deletedRequest, error: fetchError } = await supabase
        .from('expense_deleted')
        .select('*')
        .eq('id', deletedId)
        .eq('can_recover', true)
        .single();

      if (fetchError || !deletedRequest) {
        console.error('❌ Deleted request not found or cannot be recovered');
        return false;
      }

      // التحقق من صلاحية الاسترداد
      if (deletedRequest.recovery_deadline && 
          new Date(deletedRequest.recovery_deadline) < new Date()) {
        console.error('❌ Recovery deadline has passed');
        return false;
      }

      // إعادة إدراج البيانات
      const { error: restoreError } = await supabase
        .from('expense_requests')
        .insert([{
          ...deletedRequest.original_data,
          updated_at: new Date().toISOString()
        }]);

      if (restoreError) {
        console.error('❌ Error restoring expense request:', restoreError);
        return false;
      }

      // تحديث سجل الحذف
      const { error: updateError } = await supabase
        .from('expense_deleted')
        .update({
          recovered_by: userId,
          recovered_at: new Date().toISOString(),
          can_recover: false
        })
        .eq('id', deletedId);

      if (updateError) {
        console.error('❌ Error updating deletion record:', updateError);
      }

      console.log('✅ Expense request recovered successfully');
      return true;
    } catch (error) {
      console.error('❌ Error in recoverDeletedExpenseRequest:', error);
      return false;
    }
  }

  // ===== الوظائف المساعدة =====

  /**
   * تحديد تدفق الموافقة المطلوب حسب المبلغ
   */
  private determineApprovalWorkflow(amount: number, systemWorkflow: ApprovalLevel[]): ApprovalLevel[] {
    return systemWorkflow.filter(level => {
      if (level.max_amount === -1) return true; // لا توجد حدود
      return amount <= level.max_amount;
    });
  }

  /**
   * التحقق من إمكانية الموافقة
   */
  private async canUserApprove(request: ExpenseRequest, userId: string, userRole: string): Promise<boolean> {
    // التحقق من مستوى الموافقة الحالي
    const nextLevel = request.current_approval_level + 1;
    const requiredApproval = request.approval_workflow?.find(w => w.level === nextLevel);
    
    if (!requiredApproval) return false;
    
    // التحقق من دور المستخدم
    if (requiredApproval.role !== userRole) return false;
    
    // التحقق من الحد المسموح
    if (requiredApproval.max_amount !== -1 && request.amount > requiredApproval.max_amount) {
      return false;
    }
    
    return true;
  }

  /**
   * تحديد الحالة التالية للموافقة
   */
  private getNextApprovalStatus(level: number): string {
    switch (level) {
      case 1: return 'manager_approved';
      case 2: return 'admin_approved';
      case 3: return 'accounting_approved';
      default: return 'under_review';
    }
  }

  /**
   * التحقق من حاجة الطلب لموافقة مدير معين
   */
  private needsManagerApproval(request: ExpenseRequest, managerId: string): boolean {
    // هنا يجب تطبيق منطق تحديد المدير المناسب
    // مثل: نفس القسم، أو نفس فرع العمل
    // هذا مثال مبسط - في التطبيق الحقيقي نحتاج معلومات التسلسل الإداري
    
    const nextLevel = request.current_approval_level + 1;
    const requiredApproval = request.approval_workflow?.find(w => w.level === nextLevel);
    
    return requiredApproval?.role === 'manager' && 
           request.status === 'submitted';
  }

  /**
   * تهيئة عملية الموافقة
   */
  private async initializeApprovalProcess(request: ExpenseRequest): Promise<void> {
    try {
      // إنشاء سجلات الموافقة المطلوبة
      const approvals = request.approval_workflow?.map(level => ({
        expense_request_id: request.id,
        approval_level: level.level,
        approver_role: level.role,
        status: 'pending' as const,
        approval_method: 'manual' as const,
        max_amount_authorized: level.max_amount === -1 ? null : level.max_amount
      })) || [];

      if (approvals.length > 0) {
        await supabase
          .from('expense_approvals')
          .insert(approvals);

        // إرسال إشعار للموافق الأول
        await this.notifyNextApprover(request);
      }
    } catch (error) {
      console.error('❌ Error initializing approval process:', error);
    }
  }

  /**
   * إشعار الموافق التالي
   */
  private async notifyNextApprover(request: ExpenseRequest): Promise<void> {
    const nextLevel = request.current_approval_level + 1;
    const requiredApproval = request.approval_workflow?.find(w => w.level === nextLevel);
    
    if (!requiredApproval) return;

    // هنا يجب تحديد الموافق المناسب حسب الدور والقسم
    // وإرسال الإشعار له
    console.log(`📧 Should notify ${requiredApproval.role} for approval of ${request.request_number}`);
  }

  /**
   * إرسال إشعارات الموافقة
   */
  private async sendApprovalNotifications(
    request: ExpenseRequest, 
    approverId: string, 
    decision: 'approved' | 'rejected',
    comments?: string
  ): Promise<void> {
    try {
      const title = decision === 'approved' ? 'تمت الموافقة على طلبك' : 'تم رفض طلبك';
      const message = `طلب النفقة رقم ${request.request_number} ${decision === 'approved' ? 'تمت الموافقة عليه' : 'تم رفضه'}${comments ? `\nالسبب: ${comments}` : ''}`;

      await this.sendNotification(request.user_id, {
        type: decision,
        title,
        message,
        expense_request_id: request.id,
        action_url: `/expenses/${request.id}`
      });
    } catch (error) {
      console.error('❌ Error sending approval notifications:', error);
    }
  }

  /**
   * إرسال إشعار
   */
  private async sendNotification(
    userId: string,
    notification: {
      type: string;
      title: string;
      message: string;
      expense_request_id?: string;
      action_url?: string;
    }
  ): Promise<void> {
    try {
      await supabase
        .from('expense_notifications')
        .insert([{
          user_id: userId,
          ...notification
        }]);
    } catch (error) {
      console.error('❌ Error sending notification:', error);
    }
  }

  /**
   * الحصول على فئات النفقات الافتراضية
   */
  private getDefaultCategories(): ExpenseCategory[] {
    const now = new Date().toISOString();
    return [
      {
        id: '1',
        name: 'travel',
        name_ar: 'مصاريف السفر',
        name_en: 'Travel Expenses',
        description: 'تكاليف السفر والإقامة والانتقالات',
        icon: 'Plane',
        color: '#3b82f6',
        is_active: true,
        requires_receipt: true,
        created_at: now,
        updated_at: now
      },
      {
        id: '2',
        name: 'office',
        name_ar: 'مصاريف مكتبية',
        name_en: 'Office Supplies',
        description: 'أدوات مكتبية وقرطاسية',
        icon: 'Coffee',
        color: '#10b981',
        is_active: true,
        requires_receipt: true,
        created_at: now,
        updated_at: now
      },
      {
        id: '3',
        name: 'transport',
        name_ar: 'مواصلات',
        name_en: 'Transportation',
        description: 'وقود وصيانة السيارات',
        icon: 'Car',
        color: '#f59e0b',
        is_active: true,
        requires_receipt: true,
        created_at: now,
        updated_at: now
      }
    ];
  }
}

// ===== تصدير النسخة الافتراضية والوظائف المساعدة =====
export const expenseService = ExpenseManagementService.getInstance();

/**
 * الحصول على جميع فئات النفقات
 */
export async function getExpenseCategories(): Promise<ExpenseCategory[]> {
  return await expenseService.getExpenseCategories();
}

/**
 * إنشاء طلب نفقة جديد
 */
export async function createExpenseRequest(requestData: Partial<ExpenseRequest>): Promise<ExpenseRequest | null> {
  return await expenseService.createExpenseRequest(requestData);
}

/**
 * الحصول على طلبات النفقات للمستخدم
 */
export async function getUserExpenseRequests(userId: string, filters?: any): Promise<ExpenseRequest[]> {
  return await expenseService.getUserExpenseRequests(userId, filters);
}

/**
 * الموافقة على طلب نفقة
 */
export async function approveExpenseRequest(
  requestId: string,
  approverId: string,
  approverRole: string,
  comments?: string
): Promise<boolean> {
  return await expenseService.approveExpenseRequest(requestId, approverId, approverRole, comments);
}

/**
 * رفض طلب نفقة
 */
export async function rejectExpenseRequest(
  requestId: string,
  approverId: string,
  approverRole: string,
  reason: string
): Promise<boolean> {
  return await expenseService.rejectExpenseRequest(requestId, approverId, approverRole, reason);
}

export default ExpenseManagementService;