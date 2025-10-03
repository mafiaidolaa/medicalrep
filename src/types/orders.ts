// Order Management System Types

export type OrderStatus = 
  | 'draft'           // مسودة
  | 'pending'         // في الانتظار
  | 'approved'        // معتمد
  | 'rejected'        // مرفوض
  | 'processing'      // قيد التجهيز
  | 'shipped'         // تم الشحن
  | 'delivered'       // تم التسليم
  | 'cancelled'       // ملغى
  | 'returned';       // مُرجع

export type OrderPriority = 'low' | 'medium' | 'high' | 'urgent';

export type PaymentMethod = 'cash' | 'bank_transfer' | 'deferred';

export type DiscountType = 'percentage' | 'fixed' | 'demo';

export type UserRole = 'admin' | 'manager' | 'medical_rep' | 'accountant';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  area?: string;
  line?: string;
  phone?: string;
  isActive: boolean;
}

export interface Product {
  id: string;
  name: string;
  nameEn?: string;
  description?: string;
  price: number;
  category: string;
  categoryId?: string;
  inStock: number;
  minStock?: number;
  maxStock?: number;
  unit: string; // قطعة، علبة، كرتون، etc.
  barcode?: string;
  manufacturer?: string;
  expiryDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Clinic {
  id: string;
  name: string;
  nameEn?: string;
  area: string;
  line: string;
  address?: string;
  city?: string;
  district?: string;
  creditLimit?: number;
  currentDebt?: number;
  doctorName?: string;
  doctorPhone?: string;
  clinicPhone?: string;
  email?: string;
  taxNumber?: string;
  commercialRegister?: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productPrice: number;
  quantity: number;
  requestedQuantity?: number; // الكمية المطلوبة أصلاً
  availableQuantity?: number; // الكمية المتاحة
  unit: string;
  discount: number;
  discountType: DiscountType;
  itemTotal: number; // السعر × الكمية
  discountAmount: number; // قيمة الخصم
  finalAmount: number; // المبلغ النهائي بعد الخصم
  notes?: string;
  isDemo?: boolean;
}

export interface OrderDiscount {
  type: DiscountType;
  value: number;
  amount: number; // المبلغ المحسوب
  reason?: string;
}

export interface OrderApproval {
  id: string;
  orderId: string;
  approverType: 'manager' | 'accountant' | 'admin';
  approverId: string;
  approverName: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  approvedAt?: string;
  createdAt: string;
}

export interface OrderHistory {
  id: string;
  orderId: string;
  status: OrderStatus;
  previousStatus?: OrderStatus;
  changedBy: string;
  changedByName: string;
  notes?: string;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string; // رقم الطلب التلقائي
  
  // معلومات العيادة
  clinicId: string;
  clinicName: string;
  clinicArea: string;
  clinicLine: string;
  
  // معلومات مقدم الطلب
  representativeId: string;
  representativeName: string;
  representativeRole: UserRole;
  
  // بنود الطلب
  items: OrderItem[];
  itemsCount: number;
  totalQuantity: number;
  
  // الحسابات المالية
  subtotal: number; // المجموع قبل الخصم
  itemsDiscountAmount: number; // خصم المنتجات
  orderDiscount?: OrderDiscount; // خصم الطلب الإجمالي
  totalDiscountAmount: number; // إجمالي الخصومات
  finalTotal: number; // المبلغ النهائي
  currency: string; // EGP
  
  // تفاصيل الطلب
  paymentMethod: PaymentMethod;
  priority: OrderPriority;
  status: OrderStatus;
  notes?: string;
  internalNotes?: string; // ملاحظات داخلية
  
  // التواريخ
  orderDate: string;
  requestedDeliveryDate?: string;
  approvedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  
  // الاعتمادات
  approvals: OrderApproval[];
  requiresManagerApproval: boolean;
  requiresAccountantApproval: boolean;
  isFullyApproved: boolean;
  
  // التتبع
  history: OrderHistory[];
  
  // معلومات إضافية
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
  
  // الملفات المرفقة (اختياري)
  attachments?: OrderAttachment[];
}

export interface OrderAttachment {
  id: string;
  orderId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: string;
}

// Order Statistics Types
export interface OrderStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  totalValue: number;
  averageOrderValue: number;
}

export interface DashboardStats {
  today: OrderStats;
  thisWeek: OrderStats;
  thisMonth: OrderStats;
  thisYear: OrderStats;
}

// Filter and Search Types
export interface OrderFilters {
  status?: OrderStatus[];
  priority?: OrderPriority[];
  paymentMethod?: PaymentMethod[];
  clinicId?: string;
  representativeId?: string;
  area?: string;
  line?: string;
  dateFrom?: string;
  dateTo?: string;
  amountFrom?: number;
  amountTo?: number;
  search?: string; // البحث في رقم الطلب، اسم العيادة، المندوب
}

export interface OrderSortOptions {
  field: 'orderDate' | 'finalTotal' | 'status' | 'clinicName' | 'priority';
  direction: 'asc' | 'desc';
}

export interface PaginationOptions {
  page: number;
  limit: number;
  total?: number;
}

export interface OrderListResponse {
  orders: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  stats: OrderStats;
}

// Form Types
export interface NewOrderFormData {
  clinicId: string;
  items: Array<{
    productId: string;
    quantity: number;
    discount?: number;
    discountType?: DiscountType;
    notes?: string;
  }>;
  orderDiscount?: {
    type: DiscountType;
    value: number;
    reason?: string;
  };
  paymentMethod: PaymentMethod;
  priority: OrderPriority;
  notes?: string;
  requestedDeliveryDate?: string;
}

export interface OrderUpdateData {
  status?: OrderStatus;
  notes?: string;
  internalNotes?: string;
  paymentMethod?: PaymentMethod;
  priority?: OrderPriority;
  requestedDeliveryDate?: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string>;
}

export interface OrderValidationError {
  field: string;
  message: string;
  code: string;
}

export interface OrderValidationResponse {
  isValid: boolean;
  errors: OrderValidationError[];
  warnings?: OrderValidationError[];
}

// Status Labels (Arabic)
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  draft: 'مسودة',
  pending: 'في الانتظار',
  approved: 'معتمد',
  rejected: 'مرفوض',
  processing: 'قيد التجهيز',
  shipped: 'تم الشحن',
  delivered: 'تم التسليم',
  cancelled: 'ملغى',
  returned: 'مُرجع'
};

export const PRIORITY_LABELS: Record<OrderPriority, string> = {
  low: 'منخفضة',
  medium: 'متوسطة',
  high: 'عالية',
  urgent: 'عاجلة'
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'نقداً',
  bank_transfer: 'تحويل بنكي',
  deferred: 'آجل'
};

export const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = {
  percentage: 'نسبة مئوية',
  fixed: 'مبلغ ثابت',
  demo: 'ديمو مجاني'
};

// Status Colors for UI
export const STATUS_COLORS: Record<OrderStatus, string> = {
  draft: 'gray',
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
  processing: 'blue',
  shipped: 'purple',
  delivered: 'green',
  cancelled: 'red',
  returned: 'orange'
};

export const PRIORITY_COLORS: Record<OrderPriority, string> = {
  low: 'gray',
  medium: 'blue',
  high: 'orange',
  urgent: 'red'
};