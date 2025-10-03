/**
 * 🏭 EP Group System - Stock Validation Utils
 * أدوات التحقق من صحة البيانات لنظام المخازن
 */

import type { 
  Warehouse, 
  Product, 
  StockRequest, 
  StockRequestItem,
  StockLevel
} from './stock-management-service';

// ==================================================================
// نتائج التحقق (Validation Results)
// ==================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// ==================================================================
// التحقق من المخازن (Warehouse Validation)
// ==================================================================

export const validateWarehouse = (warehouse: Partial<Warehouse>): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  // اسم المخزن مطلوب
  if (!warehouse.name?.trim()) {
    result.errors.push('اسم المخزن مطلوب');
    result.isValid = false;
  } else if (warehouse.name.length < 3) {
    result.errors.push('اسم المخزن يجب أن يكون 3 أحرف على الأقل');
    result.isValid = false;
  }

  // الاسم العربي مطلوب
  if (!warehouse.name_ar?.trim()) {
    result.errors.push('الاسم العربي للمخزن مطلوب');
    result.isValid = false;
  }

  // كود المخزن مطلوب وله تنسيق معين
  if (!warehouse.code?.trim()) {
    result.errors.push('كود المخزن مطلوب');
    result.isValid = false;
  } else if (!/^[A-Z]{2}\d{3}$/.test(warehouse.code)) {
    result.warnings.push('يُفضل أن يكون كود المخزن بتنسيق: حرفين كبيرين + 3 أرقام (مثال: WH001)');
  }

  // التحقق من حد السعة
  if (warehouse.capacity_limit !== undefined) {
    if (warehouse.capacity_limit < 0) {
      result.errors.push('حد سعة المخزن لا يمكن أن يكون سالباً');
      result.isValid = false;
    } else if (warehouse.capacity_limit > 0 && warehouse.capacity_limit < 100) {
      result.warnings.push('حد سعة المخزن منخفض جداً (أقل من 100)');
    }
  }

  // التحقق من الموقع
  if (warehouse.location && warehouse.location.length > 200) {
    result.errors.push('موقع المخزن طويل جداً (أقصى حد 200 حرف)');
    result.isValid = false;
  }

  return result;
};

// ==================================================================
// التحقق من المنتجات (Product Validation)
// ==================================================================

export const validateProduct = (product: Partial<Product>): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  // اسم المنتج مطلوب
  if (!product.name?.trim()) {
    result.errors.push('اسم المنتج مطلوب');
    result.isValid = false;
  }

  // الاسم العربي مطلوب
  if (!product.name_ar?.trim()) {
    result.errors.push('الاسم العربي للمنتج مطلوب');
    result.isValid = false;
  }

  // كود المنتج مطلوب
  if (!product.code?.trim()) {
    result.errors.push('كود المنتج مطلوب');
    result.isValid = false;
  } else if (product.code.length < 3) {
    result.errors.push('كود المنتج يجب أن يكون 3 أحرف على الأقل');
    result.isValid = false;
  }

  // التحقق من الباركود
  if (product.barcode && !/^\d+$/.test(product.barcode)) {
    result.errors.push('الباركود يجب أن يحتوي على أرقام فقط');
    result.isValid = false;
  }

  // التحقق من الأسعار
  if (product.cost_price !== undefined) {
    if (product.cost_price < 0) {
      result.errors.push('سعر التكلفة لا يمكن أن يكون سالباً');
      result.isValid = false;
    }
  }

  if (product.selling_price !== undefined) {
    if (product.selling_price < 0) {
      result.errors.push('سعر البيع لا يمكن أن يكون سالباً');
      result.isValid = false;
    }
    
    if (product.cost_price && product.selling_price < product.cost_price) {
      result.warnings.push('سعر البيع أقل من سعر التكلفة - قد يؤدي إلى خسارة');
    }
  }

  // التحقق من مستويات المخزون
  if (product.min_stock_level !== undefined && product.min_stock_level < 0) {
    result.errors.push('الحد الأدنى للمخزون لا يمكن أن يكون سالباً');
    result.isValid = false;
  }

  if (product.max_stock_level !== undefined && product.max_stock_level < 0) {
    result.errors.push('الحد الأقصى للمخزون لا يمكن أن يكون سالباً');
    result.isValid = false;
  }

  if (product.reorder_level !== undefined && product.reorder_level < 0) {
    result.errors.push('نقطة إعادة الطلب لا يمكن أن تكون سالبة');
    result.isValid = false;
  }

  // التحقق من التسلسل المنطقي لمستويات المخزون
  if (product.min_stock_level !== undefined && 
      product.max_stock_level !== undefined && 
      product.min_stock_level > product.max_stock_level) {
    result.errors.push('الحد الأدنى للمخزون لا يمكن أن يكون أكبر من الحد الأقصى');
    result.isValid = false;
  }

  if (product.min_stock_level !== undefined && 
      product.reorder_level !== undefined && 
      product.reorder_level < product.min_stock_level) {
    result.warnings.push('نقطة إعادة الطلب أقل من الحد الأدنى للمخزون');
  }

  // التحقق من الوحدة
  if (!product.unit?.trim()) {
    result.warnings.push('وحدة القياس غير محددة - سيتم استخدام "قطعة" كافتراضي');
  }

  return result;
};

// ==================================================================
// التحقق من الطلبات (Stock Request Validation)
// ==================================================================

export const validateStockRequest = (
  request: Partial<StockRequest>,
  items: StockRequestItem[] = []
): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  // عنوان الطلب مطلوب
  if (!request.title?.trim()) {
    result.errors.push('عنوان الطلب مطلوب');
    result.isValid = false;
  }

  // نوع الطلب مطلوب
  if (!request.request_type_id?.trim()) {
    result.errors.push('نوع الطلب مطلوب');
    result.isValid = false;
  }

  // المخزن مطلوب
  if (!request.warehouse_id?.trim()) {
    result.errors.push('المخزن مطلوب');
    result.isValid = false;
  }

  // مقدم الطلب مطلوب
  if (!request.requested_by?.trim()) {
    result.errors.push('مقدم الطلب مطلوب');
    result.isValid = false;
  }

  // التحقق من الأولوية
  const validPriorities = ['low', 'medium', 'high', 'urgent'];
  if (request.priority && !validPriorities.includes(request.priority)) {
    result.errors.push('أولوية الطلب غير صحيحة');
    result.isValid = false;
  }

  // التحقق من التاريخ المطلوب
  if (request.required_date) {
    const requiredDate = new Date(request.required_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (requiredDate < today) {
      result.warnings.push('التاريخ المطلوب في الماضي');
    }
  }

  // التحقق من عناصر الطلب
  if (items.length === 0) {
    result.errors.push('الطلب يجب أن يحتوي على عنصر واحد على الأقل');
    result.isValid = false;
  }

  items.forEach((item, index) => {
    const itemValidation = validateStockRequestItem(item);
    if (!itemValidation.isValid) {
      itemValidation.errors.forEach(error => {
        result.errors.push(`العنصر ${index + 1}: ${error}`);
      });
      result.isValid = false;
    }
    
    itemValidation.warnings.forEach(warning => {
      result.warnings.push(`العنصر ${index + 1}: ${warning}`);
    });
  });

  // التحقق من القيمة الإجمالية
  if (request.total_value !== undefined && request.total_value < 0) {
    result.errors.push('القيمة الإجمالية لا يمكن أن تكون سالبة');
    result.isValid = false;
  }

  // تحذير للطلبات ذات القيمة العالية
  if (request.total_value !== undefined && request.total_value > 100000) {
    result.warnings.push('الطلب ذو قيمة عالية - قد يتطلب موافقات إضافية');
  }

  return result;
};

// ==================================================================
// التحقق من عناصر الطلب (Request Item Validation)
// ==================================================================

export const validateStockRequestItem = (item: Partial<StockRequestItem>): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  // المنتج مطلوب
  if (!item.product_id?.trim()) {
    result.errors.push('المنتج مطلوب');
    result.isValid = false;
  }

  // الكمية المطلوبة
  if (item.requested_quantity === undefined || item.requested_quantity <= 0) {
    result.errors.push('الكمية المطلوبة يجب أن تكون أكبر من صفر');
    result.isValid = false;
  }

  if (item.requested_quantity && item.requested_quantity > 10000) {
    result.warnings.push('الكمية المطلوبة كبيرة جداً - تأكد من صحة الرقم');
  }

  // سعر الوحدة
  if (item.unit_price !== undefined && item.unit_price < 0) {
    result.errors.push('سعر الوحدة لا يمكن أن يكون سالباً');
    result.isValid = false;
  }

  // الكمية المُوافق عليها (إذا كانت محددة)
  if (item.approved_quantity !== undefined) {
    if (item.approved_quantity < 0) {
      result.errors.push('الكمية المُوافق عليها لا يمكن أن تكون سالبة');
      result.isValid = false;
    }
    
    if (item.requested_quantity && item.approved_quantity > item.requested_quantity) {
      result.warnings.push('الكمية المُوافق عليها أكبر من الكمية المطلوبة');
    }
  }

  // الكمية المُصرَّفة (إذا كانت محددة)
  if (item.issued_quantity !== undefined) {
    if (item.issued_quantity < 0) {
      result.errors.push('الكمية المُصرَّفة لا يمكن أن تكون سالبة');
      result.isValid = false;
    }
    
    if (item.approved_quantity && item.issued_quantity > item.approved_quantity) {
      result.errors.push('الكمية المُصرَّفة أكبر من الكمية المُوافق عليها');
      result.isValid = false;
    }
  }

  return result;
};

// ==================================================================
// التحقق من المخزون (Stock Level Validation)
// ==================================================================

export const validateStockLevel = (
  stockLevel: Partial<StockLevel>,
  product?: Product
): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  // المخزن مطلوب
  if (!stockLevel.warehouse_id?.trim()) {
    result.errors.push('المخزن مطلوب');
    result.isValid = false;
  }

  // المنتج مطلوب
  if (!stockLevel.product_id?.trim()) {
    result.errors.push('المنتج مطلوب');
    result.isValid = false;
  }

  // الكمية المتاحة
  if (stockLevel.available_quantity !== undefined && stockLevel.available_quantity < 0) {
    result.errors.push('الكمية المتاحة لا يمكن أن تكون سالبة');
    result.isValid = false;
  }

  // الكمية المحجوزة
  if (stockLevel.reserved_quantity !== undefined && stockLevel.reserved_quantity < 0) {
    result.errors.push('الكمية المحجوزة لا يمكن أن تكون سالبة');
    result.isValid = false;
  }

  // تحذيرات بناءً على مستوى المخزون
  if (product && stockLevel.available_quantity !== undefined) {
    if (stockLevel.available_quantity === 0) {
      result.warnings.push('المنتج نفد من المخزون');
    } else if (stockLevel.available_quantity <= product.min_stock_level) {
      result.warnings.push('المنتج وصل للحد الأدنى - يُنصح بإعادة التموين');
    } else if (stockLevel.available_quantity <= product.reorder_level) {
      result.warnings.push('المنتج وصل لنقطة إعادة الطلب');
    }
  }

  return result;
};

// ==================================================================
// التحقق من العمليات (Operation Validation)
// ==================================================================

export const validateStockMovement = (
  warehouseId: string,
  productId: string,
  quantityChange: number,
  movementType: string,
  currentStock?: number
): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  // معرف المخزن مطلوب
  if (!warehouseId?.trim()) {
    result.errors.push('معرف المخزن مطلوب');
    result.isValid = false;
  }

  // معرف المنتج مطلوب
  if (!productId?.trim()) {
    result.errors.push('معرف المنتج مطلوب');
    result.isValid = false;
  }

  // تغيير الكمية لا يمكن أن يكون صفر
  if (quantityChange === 0) {
    result.errors.push('تغيير الكمية لا يمكن أن يكون صفر');
    result.isValid = false;
  }

  // التحقق من نوع الحركة
  const validMovementTypes = ['in', 'out', 'transfer', 'adjustment', 'return'];
  if (!validMovementTypes.includes(movementType)) {
    result.errors.push('نوع حركة المخزون غير صحيح');
    result.isValid = false;
  }

  // التحقق من توفر المخزون للصرف
  if (movementType === 'out' && currentStock !== undefined) {
    const requiredQuantity = Math.abs(quantityChange);
    if (currentStock < requiredQuantity) {
      result.errors.push(`المخزون غير كافي. المتوفر: ${currentStock}، المطلوب: ${requiredQuantity}`);
      result.isValid = false;
    } else if (currentStock === requiredQuantity) {
      result.warnings.push('سيتم استنفاد المخزون بالكامل');
    } else if (currentStock - requiredQuantity < 5) {
      result.warnings.push('سيبقى مخزون قليل جداً بعد هذه العملية');
    }
  }

  return result;
};

// ==================================================================
// التحقق من الصلاحيات (Permission Validation)
// ==================================================================

export const validateUserPermission = (
  userId: string,
  warehouseId: string,
  requiredPermission: string
): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  // معرف المستخدم مطلوب
  if (!userId?.trim()) {
    result.errors.push('معرف المستخدم مطلوب');
    result.isValid = false;
  }

  // معرف المخزن مطلوب
  if (!warehouseId?.trim()) {
    result.errors.push('معرف المخزن مطلوب');
    result.isValid = false;
  }

  // الصلاحية المطلوبة
  if (!requiredPermission?.trim()) {
    result.errors.push('الصلاحية المطلوبة غير محددة');
    result.isValid = false;
  }

  return result;
};

// ==================================================================
// دوال مساعدة للتحقق (Helper Validation Functions)
// ==================================================================

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhoneNumber = (phone: string): boolean => {
  // تنسيق رقم الهاتف المصري
  const phoneRegex = /^(\+20|20|0)?1[0-9]{9}$/;
  return phoneRegex.test(phone.replace(/[\s-]/g, ''));
};

export const isValidCurrency = (currency: string): boolean => {
  const validCurrencies = ['EGP', 'USD', 'EUR'];
  return validCurrencies.includes(currency);
};

export const sanitizeString = (input: string): string => {
  return input.trim().replace(/[<>\"']/g, '');
};

export const isPositiveNumber = (value: number): boolean => {
  return typeof value === 'number' && value > 0 && !isNaN(value);
};

export const isNonNegativeNumber = (value: number): boolean => {
  return typeof value === 'number' && value >= 0 && !isNaN(value);
};