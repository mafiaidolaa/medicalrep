/**
 * 🏭 EP Group System - Stock Management Module Index
 * فهرس وحدة إدارة المخازن
 */

// تصدير الخدمة الرئيسية والأنواع
export {
  StockManagementService,
  stockService,
  type Warehouse,
  type Product,
  type StockLevel,
  type RequestType,
  type StockRequest,
  type StockRequestItem,
  type StockRequestApproval,
  type StockMovement,
  type UserWarehousePermissions
} from './stock-management-service';

// تصدير الأدوات والمساعدات
export * from './stock-utils';
export * from './stock-validation';
export {
  StockNotificationService,
  stockNotificationService,
  type StockNotification,
  type NotificationTemplate
} from './stock-notifications';

// تصدير نظام الصلاحيات والأمان
export {
  StockSecurityService,
  stockSecurityService,
  type StockRole,
  type StockPermission,
  type PermissionCheck
} from './stock-security';

// تصدير نظام سلة المحذوفات
export {
  StockTrashService,
  stockTrashService,
  type DeletedRecord,
  type TrashSummary,
  type RestoreResult
} from './stock-trash';

// تصدير نظام التقارير والنماذج
export {
  StockReportsService,
  stockReportsService,
  type ReportTemplate,
  type ReportData,
  type ChartData,
  type IssueOrderDocument
} from './stock-reports';

// تصدير نظام الدمج مع الأقسام الأخرى
export {
  StockIntegrationService,
  stockIntegrationService,
  type OrderIntegration,
  type OrderItem,
  type AccountingIntegration,
  type ApprovalWorkflow,
  type ApprovalStep
} from './stock-integration';

// تصدير نقاط نهاية الخدمات والـ APIs
export {
  StockAPIEndpoints,
  stockAPIEndpoints,
  type APIResponse,
  type APIRequest,
  type PaginationParams,
  type StockAPIFilters
} from './stock-api-endpoints';
