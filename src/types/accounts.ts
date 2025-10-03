// أنواع البيانات لنظام الحسابات
// EP Group System - Accounts Module Types

export interface Customer {
  id: string;
  customer_code: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  tax_number?: string;
  credit_limit: number;
  balance: number;
  status: 'active' | 'inactive' | 'blocked';
  customer_type: 'regular' | 'vip' | 'wholesale';
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer?: Customer; // للاستعلامات التي تتضمن بيانات العميل
  invoice_date: string;
  due_date: string;
  invoice_type: 'sales' | 'purchase' | 'return_sales' | 'return_purchase';
  status: 'draft' | 'sent' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';
  
  // المبالغ
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  
  // معلومات إضافية
  notes?: string;
  terms_conditions?: string;
  payment_terms?: string;
  
  // تواريخ النظام
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  
  // البنود
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  item_code?: string;
  item_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  discount_amount: number;
  tax_percentage: number;
  tax_amount: number;
  line_total: number;
  created_at: string;
  updated_at: string;
}

export interface Receivable {
  id: string;
  customer_id: string;
  customer?: Customer;
  invoice_id?: string;
  invoice?: Invoice;
  reference_number?: string;
  
  // المبالغ
  original_amount: number;
  remaining_amount: number;
  
  // التواريخ
  due_date: string;
  overdue_days: number;
  
  // الحالة
  status: 'pending' | 'partially_paid' | 'paid' | 'written_off';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  
  // معلومات إضافية
  notes?: string;
  
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface Payment {
  id: string;
  payment_number: string;
  customer_id: string;
  customer?: Customer;
  invoice_id?: string;
  invoice?: Invoice;
  receivable_id?: string;
  receivable?: Receivable;
  
  // المبالغ
  amount: number;
  
  // طريقة الدفع
  payment_method: 'cash' | 'check' | 'bank_transfer' | 'credit_card' | 'online';
  payment_reference?: string; // رقم الشيك أو رقم التحويل
  
  // التواريخ
  payment_date: string;
  bank_date?: string; // تاريخ استحقاق الشيك أو التحويل
  
  // الحالة
  status: 'pending' | 'confirmed' | 'bounced' | 'cancelled';
  
  // معلومات إضافية
  notes?: string;
  bank_name?: string;
  
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  
  // التوزيعات
  allocations?: PaymentAllocation[];
}

export interface PaymentAllocation {
  id: string;
  payment_id: string;
  invoice_id?: string;
  receivable_id?: string;
  allocated_amount: number;
  created_at: string;
  created_by?: string;
}

export interface CollectionHistory {
  id: string;
  customer_id: string;
  customer?: Customer;
  action_type: 'call' | 'visit' | 'email' | 'sms' | 'letter' | 'meeting';
  action_date: string;
  action_time?: string;
  
  // تفاصيل الإجراء
  contact_person?: string;
  result?: 'no_answer' | 'promised_payment' | 'partial_payment' | 'full_payment' | 'dispute' | 'unable_to_pay';
  promised_date?: string;
  promised_amount?: number;
  
  // الملاحظات
  notes?: string;
  next_action?: string;
  next_action_date?: string;
  
  created_at: string;
  created_by?: string;
}

// أنواع للتقارير والإحصائيات
export interface OverdueInvoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_phone?: string;
  invoice_date: string;
  due_date: string;
  overdue_days: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: string;
}

export interface CustomerBalance {
  id: string;
  customer_code: string;
  name: string;
  phone?: string;
  email?: string;
  balance: number;
  credit_limit: number;
  balance_status: 'over_limit' | 'has_balance' | 'clear';
  total_invoices: number;
  overdue_invoices: number;
}

export interface MonthlyCollection {
  month: string;
  payment_count: number;
  total_collected: number;
  cash_amount: number;
  check_amount: number;
  transfer_amount: number;
}

// أنواع للنماذج (Forms)
export interface CreateCustomerForm {
  customer_code: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  tax_number?: string;
  credit_limit: number;
  customer_type: 'regular' | 'vip' | 'wholesale';
}

export interface CreateInvoiceForm {
  customer_id: string;
  invoice_date: string;
  due_date: string;
  invoice_type: 'sales' | 'purchase' | 'return_sales' | 'return_purchase';
  discount_amount?: number;
  notes?: string;
  terms_conditions?: string;
  payment_terms?: string;
  items: CreateInvoiceItemForm[];
}

export interface CreateInvoiceItemForm {
  item_code?: string;
  item_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  discount_percentage?: number;
  tax_percentage?: number;
}

export interface CreatePaymentForm {
  customer_id: string;
  amount: number;
  payment_method: 'cash' | 'check' | 'bank_transfer' | 'credit_card' | 'online';
  payment_reference?: string;
  payment_date: string;
  bank_date?: string;
  notes?: string;
  bank_name?: string;
  allocations: CreatePaymentAllocationForm[];
}

export interface CreatePaymentAllocationForm {
  invoice_id?: string;
  receivable_id?: string;
  allocated_amount: number;
}

export interface CreateCollectionHistoryForm {
  customer_id: string;
  action_type: 'call' | 'visit' | 'email' | 'sms' | 'letter' | 'meeting';
  action_date: string;
  action_time?: string;
  contact_person?: string;
  result?: 'no_answer' | 'promised_payment' | 'partial_payment' | 'full_payment' | 'dispute' | 'unable_to_pay';
  promised_date?: string;
  promised_amount?: number;
  notes?: string;
  next_action?: string;
  next_action_date?: string;
}

// أنواع للفلترة والبحث
export interface CustomerFilters {
  search?: string;
  status?: 'active' | 'inactive' | 'blocked';
  customer_type?: 'regular' | 'vip' | 'wholesale';
  has_balance?: boolean;
  over_credit_limit?: boolean;
}

export interface InvoiceFilters {
  search?: string;
  customer_id?: string;
  status?: 'draft' | 'sent' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';
  invoice_type?: 'sales' | 'purchase' | 'return_sales' | 'return_purchase';
  date_from?: string;
  date_to?: string;
  amount_from?: number;
  amount_to?: number;
}

export interface PaymentFilters {
  search?: string;
  customer_id?: string;
  payment_method?: 'cash' | 'check' | 'bank_transfer' | 'credit_card' | 'online';
  status?: 'pending' | 'confirmed' | 'bounced' | 'cancelled';
  date_from?: string;
  date_to?: string;
  amount_from?: number;
  amount_to?: number;
}

export interface ReceivableFilters {
  search?: string;
  customer_id?: string;
  status?: 'pending' | 'partially_paid' | 'paid' | 'written_off';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  overdue_only?: boolean;
  date_from?: string;
  date_to?: string;
  amount_from?: number;
  amount_to?: number;
}

// أنواع للتقارير
export interface AccountsReport {
  title: string;
  generated_at: string;
  generated_by?: string;
  filters?: any;
  data: any[];
  totals?: {
    count: number;
    total_amount?: number;
    [key: string]: any;
  };
}

// أنواع لواجهة المستخدم
export interface AccountsStats {
  total_customers: number;
  active_customers: number;
  total_invoices: number;
  overdue_invoices: number;
  total_receivables: number;
  total_collections: number;
  monthly_collections: MonthlyCollection[];
}

export interface NotificationItem {
  id: string;
  type: 'overdue_invoice' | 'payment_received' | 'credit_limit_exceeded' | 'collection_due';
  title: string;
  message: string;
  data?: any;
  created_at: string;
  read: boolean;
}

// ===== أنواع بيانات نظام المصروفات =====

// فئات المصروفات
export interface ExpenseCategory {
  id: string;
  category_name: string;
  category_name_en?: string;
  description?: string;
  is_active: boolean;
  requires_receipt: boolean;
  max_amount?: number;
  approval_required: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

// طلبات المصروفات
export interface ExpenseRequest {
  id: string;
  request_number: string;
  employee_id: string;
  employee_name: string;
  department?: string;
  team?: string;
  region?: string;
  line_number?: string;
  manager_id?: string;
  
  request_date: string;
  expense_date: string;
  
  total_amount: number;
  currency: string;
  
  status: ExpenseRequestStatus;
  priority: ExpensePriority;
  
  description?: string;
  notes?: string;
  rejection_reason?: string;
  
  // تواريخ الموافقة
  submitted_at?: string;
  approved_at?: string;
  rejected_at?: string;
  processed_at?: string;
  
  // معلومات الموافقة
  approved_by?: string;
  approved_by_name?: string;
  processed_by?: string;
  processed_by_name?: string;
  
  // ملفات مرفقة
  attachments: ExpenseAttachment[];
  
  created_at: string;
  updated_at: string;
  
  // البنود
  items?: ExpenseItem[];
  // سجل الموافقات
  approvals?: ExpenseApproval[];
}

// بنود المصروفات
export interface ExpenseItem {
  id: string;
  expense_request_id: string;
  category_id: string;
  category_name: string;
  category?: ExpenseCategory;
  
  item_description: string;
  amount: number;
  quantity: number;
  unit_price?: number;
  
  expense_date: string;
  expense_time?: string;
  location?: string;
  
  receipt_number?: string;
  receipt_image_url?: string;
  
  notes?: string;
  tags: string[];
  
  created_at: string;
  updated_at: string;
}

// موافقات المصروفات
export interface ExpenseApproval {
  id: string;
  expense_request_id: string;
  
  approver_id: string;
  approver_name: string;
  approver_role?: string;
  
  action: ExpenseApprovalAction;
  comments?: string;
  
  action_date: string;
  
  previous_status?: ExpenseRequestStatus;
  new_status?: ExpenseRequestStatus;
  
  created_at: string;
}

// إحصائيات المصروفات
export interface ExpenseStatistics {
  id: string;
  period_type: 'daily' | 'monthly' | 'yearly';
  period_date: string;
  
  employee_id?: string;
  department?: string;
  team?: string;
  region?: string;
  category_id?: string;
  
  total_requests: number;
  total_amount: number;
  approved_requests: number;
  approved_amount: number;
  pending_requests: number;
  pending_amount: number;
  rejected_requests: number;
  rejected_amount: number;
  
  created_at: string;
  updated_at: string;
}

// ملفات مرفقة
export interface ExpenseAttachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
}

// أنواع النماذج للمصروفات
export interface CreateExpenseRequestForm {
  employee_name: string;
  department?: string;
  team?: string;
  region?: string;
  line_number?: string;
  manager_id?: string;
  
  expense_date: string;
  description?: string;
  priority?: ExpensePriority;
  
  items: CreateExpenseItemForm[];
  attachments?: File[];
}

export interface CreateExpenseItemForm {
  category_id: string;
  item_description: string;
  amount: number;
  quantity?: number;
  unit_price?: number;
  expense_date: string;
  expense_time?: string;
  location?: string;
  receipt_number?: string;
  notes?: string;
  tags?: string[];
}

export interface UpdateExpenseRequestForm {
  description?: string;
  notes?: string;
  priority?: ExpensePriority;
  status?: ExpenseRequestStatus;
  rejection_reason?: string;
}

export interface ExpenseApprovalForm {
  action: ExpenseApprovalAction;
  comments?: string;
  new_status?: ExpenseRequestStatus;
}

// فلاتر المصروفات
export interface ExpenseRequestFilters {
  search?: string;
  employee_id?: string;
  department?: string;
  team?: string;
  region?: string;
  line_number?: string;
  manager_id?: string;
  status?: ExpenseRequestStatus[];
  priority?: ExpensePriority[];
  category_id?: string;
  date_from?: string;
  date_to?: string;
  amount_from?: number;
  amount_to?: number;
  approved_by?: string;
  processed_by?: string;
}

export interface ExpenseCategoryFilters {
  search?: string;
  is_active?: boolean;
  requires_receipt?: boolean;
  approval_required?: boolean;
}

// تقارير المصروفات
export interface ExpenseReport {
  title: string;
  generated_at: string;
  generated_by?: string;
  filters?: ExpenseRequestFilters;
  data: any[];
  summary: {
    total_requests: number;
    total_amount: number;
    approved_requests: number;
    approved_amount: number;
    pending_requests: number;
    pending_amount: number;
    rejected_requests: number;
    rejected_amount: number;
    by_category: { [category: string]: number };
    by_department: { [department: string]: number };
    by_employee: { [employee: string]: number };
  };
}

// إحصائيات المصروفات للوحة التحكم
export interface ExpenseDashboardStats {
  total_requests: number;
  total_amount: number;
  pending_requests: number;
  pending_amount: number;
  approved_requests: number;
  approved_amount: number;
  rejected_requests: number;
  rejected_amount: number;
  
  // إحصائيات بالفترة
  monthly_expenses: Array<{
    month: string;
    total_requests: number;
    total_amount: number;
    approved_amount: number;
  }>;
  
  // أهم الفئات
  top_categories: Array<{
    category_name: string;
    total_requests: number;
    total_amount: number;
  }>;
  
  // أهم الأقسام
  top_departments: Array<{
    department: string;
    total_requests: number;
    total_amount: number;
  }>;
  
  // الطلبات الأخيرة
  recent_requests: ExpenseRequest[];
}

// ملخص طلب المصروفات
export interface ExpenseRequestSummary {
  id: string;
  request_number: string;
  employee_id: string;
  employee_name: string;
  department?: string;
  team?: string;
  region?: string;
  line_number?: string;
  expense_date: string;
  total_amount: number;
  currency: string;
  status: ExpenseRequestStatus;
  priority: ExpensePriority;
  created_at: string;
  approved_at?: string;
  approved_by_name?: string;
  item_count: number;
  categories: string;
}

// حالات وأولويات المصروفات
export type ExpenseRequestStatus = 
  | 'draft'      // مسودة
  | 'pending'    // في انتظار الموافقة  
  | 'approved'   // موافق عليها
  | 'rejected'   // مرفوضة
  | 'processed'  // تم معالجتها في المحاسبة
  | 'paid'       // تم دفعها
  | 'cancelled'; // ملغاة

export type ExpensePriority = 
  | 'low'        // منخفضة
  | 'normal'     // عادية
  | 'high'       // مرتفعة
  | 'urgent';    // عاجلة

export type ExpenseApprovalAction = 
  | 'submitted'  // تم التقديم
  | 'approved'   // موافق
  | 'rejected'   // مرفوض
  | 'returned'   // إرجاع للتعديل
  | 'processed'  // تم المعالجة
  | 'paid';      // تم الدفع

// تصديرات إضافية للاستعمال العام
export type AccountsStatus = 'active' | 'inactive' | 'draft' | 'confirmed' | 'cancelled';
export type PaymentMethods = 'cash' | 'check' | 'bank_transfer' | 'credit_card' | 'online';
export type CollectionActions = 'call' | 'visit' | 'email' | 'sms' | 'letter' | 'meeting';
export type Priority = 'low' | 'normal' | 'high' | 'urgent';
export type ExpenseActions = 'submit' | 'approve' | 'reject' | 'return' | 'process' | 'pay';
