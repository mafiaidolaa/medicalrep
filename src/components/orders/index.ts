// Enhanced Orders Management System - Main Export Index
// نظام إدارة الطلبات المحسن - فهرس التصدير الرئيسي

// Main Components
export { default as OrdersPage } from '../../app/(dashboard)/orders/page-enhanced';
export { NewOrderForm } from './new-order-form-enhanced';
export { PreviousOrders } from './previous-orders-enhanced';

// UI Components  
export {
  StatusBadge,
  PriorityBadge,
  PaymentMethodBadge,
  DiscountBadge,
  OrderProgress,
  OrderStatsCard,
  ClinicInfo,
  OrderSummary,
  ApprovalStatus,
  OrderRating
} from './order-ui-components';

// System Components
export { OrderApprovalSystem } from './order-approval-system';
export { OrdersSystemTest } from './orders-system-test';

// Hooks
export { useOrdersProductsIntegration } from '../../hooks/use-orders-products-integration';

// Types (re-export from types file)
export type {
  Order,
  OrderItem,
  OrderStatus,
  OrderPriority,
  PaymentMethod,
  DiscountType,
  OrderApproval,
  OrderHistory,
  OrderFilters,
  OrderSortOptions,
  OrderStats,
  DashboardStats,
  Product,
  Clinic,
  User,
  UserRole,
  NewOrderFormData,
  OrderUpdateData,
  ApiResponse,
  OrderValidationError,
  OrderValidationResponse
} from '../../types/orders';

export {
  ORDER_STATUS_LABELS,
  PRIORITY_LABELS,
  PAYMENT_METHOD_LABELS,
  DISCOUNT_TYPE_LABELS,
  STATUS_COLORS,
  PRIORITY_COLORS
} from '../../types/orders';

// Component Props Types
export interface OrdersSystemProps {
  currentUser?: {
    id: string;
    fullName: string;
    role: UserRole;
    area?: string;
    line?: string;
    permissions: string[];
  };
  onOrderCreate?: (orderData: NewOrderFormData) => Promise<void>;
  onOrderUpdate?: (orderId: string, updateData: OrderUpdateData) => Promise<void>;
  onOrderView?: (order: Order) => void;
  onOrderEdit?: (order: Order) => void;
  onOrderApproval?: (orderId: string, action: 'approve' | 'reject', notes?: string) => Promise<void>;
  onOrderStatusChange?: (orderId: string, newStatus: OrderStatus, notes?: string) => Promise<void>;
  onOrderExport?: (filters: OrderFilters) => void;
}

// Constants
export const ORDERS_CONFIG = {
  DEMO_MAX_PRODUCTS: 3,
  DEMO_MAX_QUANTITY_PER_PRODUCT: 1,
  MANAGER_APPROVAL_THRESHOLD: 1000, // EGP
  ACCOUNTANT_APPROVAL_THRESHOLD: 5000, // EGP
  RESERVATION_EXPIRY_MINUTES: 30,
  DEFAULT_CURRENCY: 'EGP',
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100
} as const;

// Utility Functions
export const orderUtils = {
  /**
   * Calculate order totals including discounts
   */
  calculateOrderTotals: (items: OrderItem[], orderDiscount?: { type: DiscountType; value: number }) => {
    const subtotal = items.reduce((sum, item) => sum + item.itemTotal, 0);
    const itemsDiscountAmount = items.reduce((sum, item) => sum + item.discountAmount, 0);
    
    let orderDiscountAmount = 0;
    if (orderDiscount) {
      if (orderDiscount.type === 'demo') {
        orderDiscountAmount = subtotal - itemsDiscountAmount; // Make everything free
      } else if (orderDiscount.type === 'percentage') {
        orderDiscountAmount = (subtotal - itemsDiscountAmount) * (orderDiscount.value / 100);
      } else if (orderDiscount.type === 'fixed') {
        orderDiscountAmount = orderDiscount.value;
      }
    }
    
    const totalDiscountAmount = itemsDiscountAmount + orderDiscountAmount;
    const finalTotal = Math.max(0, subtotal - totalDiscountAmount);
    
    return {
      subtotal,
      itemsDiscountAmount,
      orderDiscountAmount,
      totalDiscountAmount,
      finalTotal
    };
  },

  /**
   * Check if order requires manager approval
   */
  requiresManagerApproval: (order: Partial<Order>): boolean => {
    return (order.finalTotal || 0) > ORDERS_CONFIG.MANAGER_APPROVAL_THRESHOLD ||
           order.priority === 'high' ||
           order.priority === 'urgent';
  },

  /**
   * Check if order requires accountant approval
   */
  requiresAccountantApproval: (order: Partial<Order>): boolean => {
    return order.paymentMethod === 'deferred' ||
           (order.finalTotal || 0) > ORDERS_CONFIG.ACCOUNTANT_APPROVAL_THRESHOLD;
  },

  /**
   * Generate order number
   */
  generateOrderNumber: (date = new Date()): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6);
    return `ORD-${year}${month}${day}-${timestamp}`;
  },

  /**
   * Validate demo order constraints
   */
  validateDemoOrder: (items: OrderItem[]): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (items.length > ORDERS_CONFIG.DEMO_MAX_PRODUCTS) {
      errors.push(`الديمو محدود بـ ${ORDERS_CONFIG.DEMO_MAX_PRODUCTS} منتجات كحد أقصى`);
    }
    
    items.forEach(item => {
      if (item.quantity > ORDERS_CONFIG.DEMO_MAX_QUANTITY_PER_PRODUCT) {
        errors.push(`لا يمكن طلب أكثر من ${ORDERS_CONFIG.DEMO_MAX_QUANTITY_PER_PRODUCT} قطعة من ${item.productName} في الديمو`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Format currency value
   */
  formatCurrency: (amount: number, currency = ORDERS_CONFIG.DEFAULT_CURRENCY): string => {
    return `${amount.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ${currency === 'EGP' ? 'ج.م' : currency}`;
  },

  /**
   * Get status progression
   */
  getStatusProgression: (currentStatus: OrderStatus): OrderStatus[] => {
    const progressions: Record<OrderStatus, OrderStatus[]> = {
      draft: ['pending'],
      pending: ['approved', 'rejected'],
      approved: ['processing', 'cancelled'],
      rejected: [],
      processing: ['shipped', 'cancelled'],
      shipped: ['delivered', 'returned'],
      delivered: ['returned'],
      cancelled: [],
      returned: []
    };
    
    return progressions[currentStatus] || [];
  },

  /**
   * Check if user can perform action on order
   */
  canUserPerformAction: (
    user: { role: UserRole; id: string },
    order: Order,
    action: 'edit' | 'approve' | 'cancel' | 'view'
  ): boolean => {
    // Admin can do everything
    if (user.role === 'admin') return true;
    
    switch (action) {
      case 'view':
        return true; // Everyone can view
        
      case 'edit':
        return order.status === 'draft' && order.representativeId === user.id;
        
      case 'approve':
        if (user.role === 'manager') {
          return orderUtils.requiresManagerApproval(order) && 
                 order.approvals.some(a => a.approverType === 'manager' && a.status === 'pending');
        }
        if (user.role === 'accountant') {
          return orderUtils.requiresAccountantApproval(order) && 
                 order.approvals.some(a => a.approverType === 'accountant' && a.status === 'pending');
        }
        return false;
        
      case 'cancel':
        return (order.status === 'pending' && order.representativeId === user.id) ||
               (['manager', 'admin'].includes(user.role) && ['pending', 'approved'].includes(order.status));
        
      default:
        return false;
    }
  }
};

// Export default configuration
export default {
  components: {
    OrdersPage,
    NewOrderForm,
    PreviousOrders,
    OrderApprovalSystem,
    OrdersSystemTest
  },
  hooks: {
    useOrdersProductsIntegration
  },
  utils: orderUtils,
  config: ORDERS_CONFIG
};