/**
 * 🏭 EP Group System - Stock Management Utils
 * أدوات ووظائف مساعدة لنظام المخازن
 */

import type { StockRequest, StockLevel, Product } from './stock-management-service';

// ==================================================================
// تنسيق البيانات (Data Formatting)
// ==================================================================

export const formatCurrency = (amount: number, currency: string = 'EGP'): string => {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

export const formatQuantity = (quantity: number, unit: string): string => {
  const formattedQuantity = new Intl.NumberFormat('ar-EG').format(quantity);
  return `${formattedQuantity} ${unit}`;
};

export const formatStockStatus = (stockLevel: StockLevel, product: Product): {
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'critical';
  statusText: string;
  statusColor: string;
  percentage: number;
} => {
  const { available_quantity } = stockLevel;
  const { min_stock_level, reorder_level, max_stock_level } = product;

  let status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'critical';
  let statusText: string;
  let statusColor: string;
  let percentage: number;

  if (available_quantity === 0) {
    status = 'out_of_stock';
    statusText = 'نفد المخزون';
    statusColor = '#EF4444';
    percentage = 0;
  } else if (available_quantity <= min_stock_level / 2) {
    status = 'critical';
    statusText = 'حرج جداً';
    statusColor = '#DC2626';
    percentage = (available_quantity / min_stock_level) * 100;
  } else if (available_quantity <= min_stock_level) {
    status = 'low_stock';
    statusText = 'مخزون منخفض';
    statusColor = '#F59E0B';
    percentage = (available_quantity / reorder_level) * 100;
  } else {
    status = 'in_stock';
    statusText = 'متوفر';
    statusColor = '#10B981';
    percentage = max_stock_level > 0 
      ? (available_quantity / max_stock_level) * 100
      : 100;
  }

  return { status, statusText, statusColor, percentage };
};

// ==================================================================
// حالات الطلبات (Request Status)
// ==================================================================

export const getRequestStatusInfo = (status: string): {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
} => {
  const statusMap: Record<string, any> = {
    pending: {
      label: 'في الانتظار',
      color: '#F59E0B',
      bgColor: '#FEF3C7',
      icon: '⏳'
    },
    manager_approved: {
      label: 'موافقة الإدارة',
      color: '#3B82F6',
      bgColor: '#DBEAFE',
      icon: '👨‍💼'
    },
    accounting_approved: {
      label: 'موافقة المحاسبة',
      color: '#8B5CF6',
      bgColor: '#EDE9FE',
      icon: '💰'
    },
    ready_for_issue: {
      label: 'جاهز للصرف',
      color: '#06B6D4',
      bgColor: '#CFFAFE',
      icon: '📦'
    },
    issued: {
      label: 'تم الصرف',
      color: '#10B981',
      bgColor: '#D1FAE5',
      icon: '✅'
    },
    completed: {
      label: 'مكتمل',
      color: '#059669',
      bgColor: '#A7F3D0',
      icon: '🎉'
    },
    rejected: {
      label: 'مرفوض',
      color: '#EF4444',
      bgColor: '#FEE2E2',
      icon: '❌'
    },
    cancelled: {
      label: 'ملغي',
      color: '#6B7280',
      bgColor: '#F3F4F6',
      icon: '🚫'
    }
  };

  return statusMap[status] || statusMap.pending;
};

export const getRequestPriorityInfo = (priority: string): {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
} => {
  const priorityMap: Record<string, any> = {
    low: {
      label: 'منخفض',
      color: '#6B7280',
      bgColor: '#F3F4F6',
      icon: '⬇️'
    },
    medium: {
      label: 'متوسط',
      color: '#F59E0B',
      bgColor: '#FEF3C7',
      icon: '➡️'
    },
    high: {
      label: 'عالي',
      color: '#EF4444',
      bgColor: '#FEE2E2',
      icon: '⬆️'
    },
    urgent: {
      label: 'عاجل',
      color: '#DC2626',
      bgColor: '#FEE2E2',
      icon: '🚨'
    }
  };

  return priorityMap[priority] || priorityMap.medium;
};

// ==================================================================
// حسابات التقارير (Report Calculations)
// ==================================================================

export const calculateStockValue = (stockLevels: StockLevel[], products: Product[]): {
  totalValue: number;
  totalItems: number;
  categories: Record<string, { value: number; items: number }>;
} => {
  const productMap = new Map(products.map(p => [p.id, p]));
  
  let totalValue = 0;
  let totalItems = 0;
  const categories: Record<string, { value: number; items: number }> = {};

  stockLevels.forEach(stock => {
    const product = productMap.get(stock.product_id);
    if (!product) return;

    const itemValue = stock.available_quantity * product.cost_price;
    totalValue += itemValue;
    totalItems += stock.available_quantity;

    const category = product.category || 'غير مصنف';
    if (!categories[category]) {
      categories[category] = { value: 0, items: 0 };
    }
    categories[category].value += itemValue;
    categories[category].items += stock.available_quantity;
  });

  return { totalValue, totalItems, categories };
};

export const getStockTrends = (stockLevels: StockLevel[]): {
  lowStockCount: number;
  outOfStockCount: number;
  criticalCount: number;
  healthyCount: number;
} => {
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let criticalCount = 0;
  let healthyCount = 0;

  stockLevels.forEach(stock => {
    if (!stock.product) return;
    
    const { available_quantity } = stock;
    const { min_stock_level } = stock.product;

    if (available_quantity === 0) {
      outOfStockCount++;
    } else if (available_quantity <= min_stock_level / 2) {
      criticalCount++;
    } else if (available_quantity <= min_stock_level) {
      lowStockCount++;
    } else {
      healthyCount++;
    }
  });

  return { lowStockCount, outOfStockCount, criticalCount, healthyCount };
};

// ==================================================================
// تحليل الطلبات (Request Analysis)
// ==================================================================

export const analyzeRequestData = (requests: StockRequest[]): {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  averageValue: number;
  totalValue: number;
  requestsByType: Record<string, number>;
  requestsByPriority: Record<string, number>;
} => {
  const analysis = {
    totalRequests: requests.length,
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
    averageValue: 0,
    totalValue: 0,
    requestsByType: {} as Record<string, number>,
    requestsByPriority: {} as Record<string, number>
  };

  requests.forEach(request => {
    // حسب الحالة
    switch (request.status) {
      case 'pending':
        analysis.pendingRequests++;
        break;
      case 'completed':
      case 'issued':
        analysis.approvedRequests++;
        break;
      case 'rejected':
      case 'cancelled':
        analysis.rejectedRequests++;
        break;
    }

    // القيمة المالية
    analysis.totalValue += request.total_value;

    // حسب النوع
    const type = request.request_type;
    analysis.requestsByType[type] = (analysis.requestsByType[type] || 0) + 1;

    // حسب الأولوية
    const priority = request.priority;
    analysis.requestsByPriority[priority] = (analysis.requestsByPriority[priority] || 0) + 1;
  });

  analysis.averageValue = analysis.totalRequests > 0 
    ? analysis.totalValue / analysis.totalRequests 
    : 0;

  return analysis;
};

// ==================================================================
// تواريخ ووقت (Date & Time Utils)
// ==================================================================

export const formatDateTime = (dateTime: string): string => {
  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(dateTime));
};

export const formatDate = (date: string): string => {
  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(date));
};

export const isOverdue = (requiredDate?: string): boolean => {
  if (!requiredDate) return false;
  return new Date(requiredDate) < new Date();
};

export const getDaysSince = (dateTime: string): number => {
  const now = new Date();
  const past = new Date(dateTime);
  const diffTime = Math.abs(now.getTime() - past.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// ==================================================================
// تصفية البيانات (Data Filtering)
// ==================================================================

export const filterStockBySearch = (
  stockLevels: StockLevel[],
  searchTerm: string
): StockLevel[] => {
  if (!searchTerm.trim()) return stockLevels;

  const term = searchTerm.toLowerCase();
  return stockLevels.filter(stock => {
    const product = stock.product;
    if (!product) return false;

    return (
      product.name.toLowerCase().includes(term) ||
      product.name_ar.toLowerCase().includes(term) ||
      product.code.toLowerCase().includes(term) ||
      product.barcode?.toLowerCase().includes(term) ||
      product.category?.toLowerCase().includes(term)
    );
  });
};

export const sortStockLevels = (
  stockLevels: StockLevel[],
  sortBy: 'name' | 'quantity' | 'value' | 'status',
  sortOrder: 'asc' | 'desc' = 'asc'
): StockLevel[] => {
  return [...stockLevels].sort((a, b) => {
    let valueA: any;
    let valueB: any;

    switch (sortBy) {
      case 'name':
        valueA = a.product?.name || '';
        valueB = b.product?.name || '';
        break;
      case 'quantity':
        valueA = a.available_quantity;
        valueB = b.available_quantity;
        break;
      case 'value':
        valueA = a.available_quantity * (a.product?.cost_price || 0);
        valueB = b.available_quantity * (b.product?.cost_price || 0);
        break;
      case 'status':
        valueA = a.available_quantity <= (a.product?.min_stock_level || 0) ? 0 : 1;
        valueB = b.available_quantity <= (b.product?.min_stock_level || 0) ? 0 : 1;
        break;
      default:
        return 0;
    }

    if (typeof valueA === 'string') {
      valueA = valueA.toLowerCase();
      valueB = valueB.toLowerCase();
    }

    const comparison = valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
    return sortOrder === 'asc' ? comparison : -comparison;
  });
};

// ==================================================================
// تصدير أعداد الأرقام (Number Generation)
// ==================================================================

export const generateBarcodeNumber = (): string => {
  const prefix = '123456789'; // يمكن تخصيصه حسب معايير الشركة
  const suffix = Math.random().toString().slice(2, 6);
  return prefix + suffix;
};

export const generateProductCode = (category?: string): string => {
  const categoryPrefix = category 
    ? category.slice(0, 3).toUpperCase()
    : 'PRD';
  
  const timestamp = Date.now().toString().slice(-4);
  const random = Math.random().toString(36).slice(2, 4).toUpperCase();
  
  return `${categoryPrefix}${timestamp}${random}`;
};