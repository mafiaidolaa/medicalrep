

export interface Contact {
  id: string;
  name: string;
  role: string; // e.g., Doctor, Assistant, Procurement Manager
  phone: string;
  email?: string;
  preferredTime?: string; // e.g., "Sun-Thu 10:00-13:00"
  isPrimary?: boolean;
}

export interface FileAttachment {
  id: string;
  name: string;
  url: string; // URL to the stored file
  uploadedAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  lat?: number;
  lng?: number;
  fieldName: string;
  oldValue: string;
  newValue: string;
}

export interface Clinic {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  registeredAt: string;
  doctorName: string;
  clinicPhone?: string;  // Made optional to match DB
  doctorPhone?: string;
  email?: string;
  creditStatus?: 'green' | 'yellow' | 'red';  // Match DB enum
  classification?: 'A' | 'B' | 'C';  // Match DB enum
  representativeNotes?: string;
  clinicNotes?: string;
  area?: string;
  line?: string;
  // Financial policy
  creditLimit?: number;            // Optional credit limit for AR control
  paymentTermsDays?: number;       // e.g., 30, 45, 60
  policyWarnUtilization?: number;  // e.g., 80 (%) warn threshold
  policyBlockOverLimit?: boolean;  // block orders if projected > limit
  // New features for Clinic
  contacts?: Contact[];
  bestVisitTime?: string; // e.g., "Mondays 10-12, Wednesdays 15-17"
  rating?: number; // e.g., 1 to 5
  attachments?: FileAttachment[];
  auditLog?: AuditLogEntry[];
}

export interface Visit {
  id: string;
  clinicId: string;
  clinicName: string;
  visitDate: string;
  notes?: string;  // Made optional to match DB
  isCompleted: boolean;
  // Database fields
  representativeId: string;  // Added missing field from DB
  purpose: string;  // Added missing field from DB
  // New features for Visit
  objective?: 'new_product' | 'collection' | 'problem_solving' | 'relationship_building';
  outcome?: 'successful' | 'unsuccessful' | 'follow_up_needed';
  outcomeNotes?: string;
  attachments?: FileAttachment[];
  relatedOrderId?: string;
  relatedCollectionId?: string;
  // New: Link to who was met
  metWith?: string; // e.g., "Dr. Smith", "Assistant"
  // New: Follow-up scheduling
  followUpDate?: string; // ISO string for the next visit
  nextVisitDate?: string; // Match DB field name
}

export interface Product {
  id: string;
  name: string;
  category?: string;  // Made optional to match DB
  price: number;
  imageUrl?: string;  // Made optional to match DB (image_url)
  stock: number;
  averageDailyUsage: number;
  line: string;  // Changed to string to match DB (more flexible)
  // New feature for Stock
  reorderLevel?: number; // Stock level at which to reorder
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  unitPrice: number;  // سعر الوحدة
  discount?: number;  // خصم على البند (نسبة مئوية)
  total: number;  // إجمالي البند بعد الخصم
  notes?: string;  // ملاحظات على البند
}

export interface Order {
  id: string;
  clinicId: string;
  clinicName: string;
  orderDate: string;
  items: OrderItem[];
  subtotal: number;  // المجموع الفرعي قبل الخصم
  discount?: number;  // خصم إجمالي (نسبة مئوية)
  discountAmount?: number;  // مبلغ الخصم
  total: number;  // الإجمالي النهائي
  totalAmount: number;  // Added DB field (total_amount)
  // Database fields
  representativeId: string;  // Added missing field from DB
  representativeName: string;  // اسم المندوب
  status: 'pending' | 'approved' | 'rejected' | 'delivered' | 'cancelled';  // Updated status enum
  paymentMethod: 'cash' | 'bank_transfer' | 'deferred';  // طريقة الدفع
  paymentStatus: 'unpaid' | 'partial' | 'paid';  // حالة الدفع
  notes?: string;  // ملاحظات الطلب
  dueDate?: string;  // تاريخ الاستحقاق (للآجل)
  // New fields for enhanced workflow
  orderNumber?: string;  // رقم الطلب التلقائي
  approvedBy?: string;  // User ID who approved the order
  approvedAt?: string;  // Timestamp of approval
  rejectedBy?: string;  // User ID who rejected the order
  rejectedAt?: string;  // Timestamp of rejection
  rejectionReason?: string;  // سبب الرفض
  deliveredAt?: string;  // تاريخ التسليم
  createdAt: string;  // تاريخ الإنشاء
  updatedAt?: string;  // تاريخ آخر تحديث
  priority?: 'low' | 'medium' | 'high' | 'urgent';  // أولوية الطلب
  estimatedDeliveryDate?: string;  // تاريخ التسليم المتوقع
}

export interface User {
    id: string;
    fullName: string;
    username: string;
    email: string;
    role: 'admin' | 'medical_rep' | 'manager' | 'accountant' | 'user' | 'test_user' | 'demo' | string;  // Support all role types
    password?: string;
    manager?: string;  // Deprecated: use managerId instead
    managerId?: string;  // Direct manager/supervisor UUID
    managerName?: string;  // Manager's full name (for display)
    hireDate?: string;
    primaryPhone?: string;
    whatsappPhone?: string;
    altPhone?: string;
    line?: string;
    area?: string;
    profilePicture?: string;
    isActive?: boolean;  // User active status
    // New: Performance KPIs
    salesTarget?: number;
    visitsTarget?: number;
}

export interface Collection {
  id: string;
  orderId: string;
  clinicName: string;
  repName: string;
  collectionDate: string;
  amount: number;
  // Database fields
  clinicId: string;  // Added missing field from DB
  representativeId: string;  // Added missing field from DB
  paymentMethod: 'cash' | 'check' | 'bank_transfer';  // Added DB field
  notes?: string;  // Added DB field
}

// Minimal Debt type for user metrics
export interface Debt {
  id: string;
  client_name?: string;
  amount: number;
  due_date?: string;
  status?: string;
  created_at?: string;
  created_by?: string; // user id who created/owns the debt
  clinic_id?: string;
}

export interface PlanTask {
    id: string;
    userId: string;
    userName: string;
    clinicId?: string;  // Made optional to match DB
    clinicName: string;
    area: string;
    line: string;
    taskType: 'visit' | 'collection' | 'order' | 'follow_up' | 'problem';
    date: string; // ISO string
    time?: string; // e.g., "14:30"
    notes?: string;
    isCompleted: boolean;
    // Database fields
    title: string;  // Added DB field
    description?: string;  // Added DB field
    assignedTo: string;  // Added DB field (assigned_to)
    dueDate: string;  // Added DB field (due_date)
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';  // Added DB field
    priority: 'low' | 'medium' | 'high';  // Added DB field
}

export interface ActivityLog {
  id: string;
  type: 'login' | 'logout' | 'visit' | 'order' | 'collection' | 'register_clinic' | 'failed_login' | 'user_create' | 'user_update' | 'user_delete' | 'invoice_created' | 'debt_created' | 'expense_created' | 'payment_created' | 'payment_confirmed' | 'payment_cancelled' | 'payment_bounced' | 'clinic_created' | 'clinic_updated' | 'clinic_deleted' | 'page_access' | 'data_export';
  title: string;
  timestamp: string; // ISO string
  user: {
    id: string;
    name: string;
    role: string;
  };
  clinic?: {
    id: string;
    name: string;
  };
  details?: string;
  // Enhanced Location Data
  ip?: string;
  realIp?: string;  // Real IP (not proxy)
  userAgent?: string;  // Full user agent string
  device: string;  // Desktop, Mobile, Tablet
  browser: string;  // Chrome, Safari, Firefox, etc.
  browserVersion?: string;
  os?: string;  // Operating System
  lat?: number;
  lng?: number;
  locationName?: string;  // Human readable location name
  country?: string;
  city?: string;
  // Security & Authentication Data (for failed logins)
  attemptedUsername?: string;
  attemptedPassword?: string;  // HASHED or masked for security
  isSuccess: boolean;  // Success or failure status
  failureReason?: string;
  sessionId?: string;
  // Database fields
  userId: string;  // Added DB field (user_id)
  action: string;  // Added DB field
  entityType: string;  // Added DB field (entity_type)
  entityId: string;  // Added DB field (entity_id)
  changes?: any;  // Added DB field
  // Additional metadata
  duration?: number;  // Action duration in milliseconds
  referrer?: string;  // Previous page/action
  riskScore?: number;  // Security risk score (0-100)
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
  // Database fields
  userId: string;  // DB field (user_id)
  type: 'info' | 'warning' | 'error' | 'success';
  // Extended fields for professional notifications center
  section?: 'managers' | 'accounting' | 'system' | 'approvals' | 'reminders' | string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  senderId?: string;
  senderRole?: string; // admin | manager | accounting | ...
  actionUrl?: string;
  data?: any;
  // Tracking
  readAt?: string;      // ISO
  clicked?: boolean;
  clickedAt?: string;   // ISO
  deliveredAt?: string; // ISO
}

// New type for Expense Tracking
export interface Expense {
  id: string;
  userId: string;
  userName: string;
  date: string;
  category: 'transportation' | 'allowance' | 'client_expense' | 'other';
  amount: number;
  description: string;
  attachment?: FileAttachment;
  // Database fields
  expenseDate: string;  // Added DB field (expense_date)
  receiptUrl?: string;  // Added DB field (receipt_url)
  status: 'pending' | 'approved' | 'rejected';  // Added DB field
}

// New type for Stock Management
export interface StockAdjustment {
  id: string;
  productId: string;
  productName: string;
  date: string;
  type: 'inventory_count' | 'damage' | 'return' | 'initial_stock';
  quantityChange: number; // can be positive or negative
  reason?: string;
  userId: string;
}

// System Settings Management
export interface SystemSetting {
  id: string;
  category: 'maps' | 'activity_logging' | 'security' | 'general' | 'users' | 'business' | 'integrations' | 'performance';
  settingKey: string;
  settingValue: any; // JSON object with flexible structure
  description?: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

// Specific setting types for better type safety
export interface GoogleMapsSettings {
  google_maps_enabled: { enabled: boolean };
  google_maps_api_key: { api_key: string };
  maps_default_zoom: { zoom: number };
  maps_default_center: { lat: number; lng: number };
  maps_theme: { theme: 'roadmap' | 'satellite' | 'hybrid' | 'terrain' };
  location_tracking: { enabled: boolean; high_accuracy: boolean };
  location_services: { geocoding: boolean; reverse_geocoding: boolean; distance_calculation: boolean };
}

export interface ActivityLoggingSettings {
  system_enabled: { enabled: boolean };
  login_tracking: { enabled: boolean; track_failed_attempts: boolean };
  location_logging: { enabled: boolean; require_permission: boolean };
  device_tracking: { enabled: boolean; detailed_info: boolean };
  business_activities: { visits: boolean; orders: boolean; collections: boolean; clinics: boolean };
  security_monitoring: { risk_scoring: boolean; suspicious_activity_detection: boolean; auto_alerts: boolean };
  data_retention: { days: number; auto_cleanup: boolean };
}

export interface SecuritySettings {
  password_policy: { min_length: number; require_uppercase: boolean; require_numbers: boolean; require_symbols: boolean };
  session_management: { timeout_minutes: number; max_concurrent_sessions: number };
  ip_restrictions: { enabled: boolean; allowed_ips: string[]; blocked_ips: string[] };
  two_factor_auth: { enabled: boolean; required_for_admins: boolean };
  login_attempts: { max_attempts: number; lockout_duration_minutes: number };
}

export interface GeneralSettings {
  system_name: { name: string; version: string };
  company_info: { name: string; address: string; phone: string; email: string };
  language_settings: { default_language: string; supported_languages: string[]; rtl_support: boolean };
  theme_settings: { default_theme: string; allow_user_themes: boolean; custom_colors: any };
  notification_settings: { email_notifications: boolean; sms_notifications: boolean; push_notifications: boolean };
  backup_settings: { auto_backup: boolean; backup_frequency: string; retention_days: number };
}

    
