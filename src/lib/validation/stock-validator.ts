/**
 * Stock Validation Helper
 * يمنع إنشاء طلبات بدون مخزون كافٍ
 * CRITICAL: يجب استخدامه قبل إنشاء أي Order
 */

import { createServerSupabaseClient } from '@/lib/supabase';
import { StockError } from '@/lib/errors/app-errors';

interface StockCheckItem {
  productId: string;
  quantity: number;
  productName?: string;
}

interface StockCheckResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  products: Array<{
    id: string;
    name: string;
    currentStock: number;
    requested: number;
    available: boolean;
  }>;
}

/**
 * التحقق من توفر المخزون قبل إنشاء الطلب
 * 
 * @param items - المنتجات المطلوبة
 * @returns نتيجة التحقق مع التفاصيل
 */
export async function validateStockAvailability(
  items: StockCheckItem[]
): Promise<StockCheckResult> {
  const result: StockCheckResult = {
    valid: true,
    errors: [],
    warnings: [],
    products: []
  };

  if (!items || items.length === 0) {
    result.valid = false;
    result.errors.push('لا توجد منتجات للتحقق منها');
    return result;
  }

  try {
    const supabase = createServerSupabaseClient();
    
    // جلب معلومات المنتجات دفعة واحدة (أسرع من استعلامات متعددة)
    const productIds = items.map(item => item.productId);
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, stock, min_stock_level')
      .in('id', productIds);

    if (error) {
      console.error('❌ Stock validation DB error:', error);
      result.valid = false;
      result.errors.push('فشل في التحقق من المخزون: خطأ في قاعدة البيانات');
      return result;
    }

    // إنشاء map للوصول السريع O(1)
    const productsMap = new Map(
      products?.map(p => [p.id, p]) || []
    );

    // التحقق من كل منتج
    for (const item of items) {
      const product = productsMap.get(item.productId);
      
      // المنتج غير موجود في قاعدة البيانات
      if (!product) {
        result.valid = false;
        result.errors.push(
          `المنتج غير موجود: ${item.productName || item.productId}`
        );
        result.products.push({
          id: item.productId,
          name: item.productName || 'Unknown',
          currentStock: 0,
          requested: item.quantity,
          available: false
        });
        continue;
      }

      // مخزون غير كافٍ - مشكلة حرجة
      if (product.stock < item.quantity) {
        result.valid = false;
        result.errors.push(
          `مخزون غير كافٍ: ${product.name} - متوفر: ${product.stock}, مطلوب: ${item.quantity}`
        );
        result.products.push({
          id: product.id,
          name: product.name,
          currentStock: product.stock,
          requested: item.quantity,
          available: false
        });
        continue;
      }

      // مخزون كافٍ
      result.products.push({
        id: product.id,
        name: product.name,
        currentStock: product.stock,
        requested: item.quantity,
        available: true
      });

      // تحذير: المخزون سينخفض تحت الحد الأدنى
      const newStock = product.stock - item.quantity;
      if (product.min_stock_level && newStock < product.min_stock_level) {
        result.warnings.push(
          `⚠️ تحذير: ${product.name} سينخفض تحت الحد الأدنى ` +
          `(سيصبح: ${newStock}, الحد الأدنى: ${product.min_stock_level})`
        );
      }

      // تحذير إضافي: المخزون شبه منتهي
      if (newStock === 0) {
        result.warnings.push(
          `⚠️ تحذير: ${product.name} سينفد تماماً بعد هذا الطلب!`
        );
      }
    }

  } catch (error: any) {
    console.error('❌ Stock validation error:', error);
    result.valid = false;
    result.errors.push('خطأ غير متوقع أثناء التحقق من المخزون');
  }

  return result;
}

/**
 * Helper: رمي خطأ إذا كان المخزون غير كافٍ
 * للاستخدام في APIs
 */
export async function validateStockOrThrow(
  items: StockCheckItem[]
): Promise<void> {
  const result = await validateStockAvailability(items);
  
  if (!result.valid) {
    throw new StockError(
      'فشل التحقق من المخزون',
      {
        errors: result.errors,
        warnings: result.warnings,
        products: result.products
      }
    );
  }

  // طباعة التحذيرات فقط (لا ترمي خطأ)
  if (result.warnings.length > 0) {
    console.warn('⚠️ Stock warnings:', result.warnings);
  }
}