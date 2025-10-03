/**
 * Validation Schemas باستخدام Zod
 * شاملة ومتوافقة مع البنية الحالية
 */

import { z } from 'zod';

// ==================== User Schemas ====================

export const userSchema = z.object({
  id: z.string().uuid('معرف غير صالح'),
  full_name: z.string()
    .min(2, 'الاسم يجب أن يكون حرفين على الأقل')
    .max(100, 'الاسم طويل جداً (100 حرف كحد أقصى)')
    .trim(),
  username: z.string()
    .min(3, 'اسم المستخدم قصير جداً')
    .max(20, 'اسم المستخدم طويل جداً')
    .regex(/^[a-zA-Z0-9_]+$/, 'اسم المستخدم يجب أن يحتوي فقط على حروف وأرقام و_')
    .trim()
    .toLowerCase(),
  email: z.string()
    .email('بريد إلكتروني غير صالح')
    .max(100, 'البريد الإلكتروني طويل جداً')
    .trim()
    .toLowerCase(),
  password: z.string()
    .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
    .regex(/^(?=.*[A-Za-z])(?=.*\d)/, 'كلمة المرور يجب أن تحتوي على أحرف وأرقام'),
  role: z.enum(['admin', 'manager', 'medical_rep', 'accountant'], {
    errorMap: () => ({ message: 'دور غير صالح' })
  }),
  hire_date: z.string().datetime().optional(),
  area: z.string().max(100).trim().optional().nullable(),
  line: z.string().max(100).trim().optional().nullable(),
  primary_phone: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'رقم هاتف غير صالح')
    .optional()
    .nullable(),
  whatsapp_phone: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'رقم واتساب غير صالح')
    .optional()
    .nullable(),
  alt_phone: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'رقم بديل غير صالح')
    .optional()
    .nullable(),
  profile_picture: z.string().url('رابط الصورة غير صالح').optional().nullable(),
  sales_target: z.number()
    .nonnegative('الهدف لا يمكن أن يكون سالباً')
    .max(1000000000, 'الهدف كبير جداً')
    .optional()
    .nullable(),
  visits_target: z.number()
    .int('عدد الزيارات يجب أن يكون عدداً صحيحاً')
    .nonnegative('عدد الزيارات لا يمكن أن يكون سالباً')
    .max(1000, 'عدد الزيارات كبير جداً')
    .optional()
    .nullable(),
});

// للتحديثات (كل الحقول اختيارية ما عدا id)
export const userUpdateSchema = userSchema.partial().required({ id: true });

// ==================== Clinic Schemas ====================

export const clinicSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string()
    .min(2, 'اسم العيادة يجب أن يكون حرفين على الأقل')
    .max(200, 'اسم العيادة طويل جداً')
    .trim(),
  doctor_name: z.string()
    .min(2, 'اسم الطبيب يجب أن يكون حرفين على الأقل')
    .max(100, 'اسم الطبيب طويل جداً')
    .trim(),
  address: z.string()
    .min(5, 'العنوان يجب أن يكون 5 أحرف على الأقل')
    .max(500, 'العنوان طويل جداً')
    .trim(),
  lat: z.number()
    .min(-90, 'خط العرض يجب أن يكون بين -90 و 90')
    .max(90, 'خط العرض يجب أن يكون بين -90 و 90'),
  lng: z.number()
    .min(-180, 'خط الطول يجب أن يكون بين -180 و 180')
    .max(180, 'خط الطول يجب أن يكون بين -180 و 180'),
  area: z.string().min(1, 'المنطقة مطلوبة').max(100).trim(),
  line: z.string().min(1, 'الخط مطلوب').max(100).trim(),
  classification: z.enum(['A', 'B', 'C'], {
    errorMap: () => ({ message: 'التصنيف يجب أن يكون A أو B أو C' })
  }).default('B'),
  credit_status: z.enum(['green', 'yellow', 'red'], {
    errorMap: () => ({ message: 'حالة الائتمان يجب أن تكون green أو yellow أو red' })
  }).default('green'),
  clinic_phone: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'رقم هاتف العيادة غير صالح')
    .optional()
    .nullable(),
  doctor_phone: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'رقم هاتف الطبيب غير صالح')
    .optional()
    .nullable(),
  registered_at: z.string().datetime().optional(),
});

export const clinicUpdateSchema = clinicSchema.partial().required({ id: true });

// ==================== Product Schemas ====================

export const productSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string()
    .min(2, 'اسم المنتج يجب أن يكون حرفين على الأقل')
    .max(200, 'اسم المنتج طويل جداً')
    .trim(),
  sku: z.string()
    .max(50, 'SKU طويل جداً')
    .trim()
    .optional(),
  price: z.number()
    .positive('السعر يجب أن يكون موجباً')
    .max(1000000, 'السعر كبير جداً (مليون كحد أقصى)')
    .multipleOf(0.01, 'السعر يجب أن يكون رقماً صحيحاً أو بعلامة عشرية صحيحة'),
  cost_price: z.number()
    .positive('سعر التكلفة يجب أن يكون موجباً')
    .max(1000000, 'سعر التكلفة كبير جداً')
    .optional()
    .nullable(),
  stock: z.number()
    .int('المخزون يجب أن يكون عدداً صحيحاً')
    .nonnegative('المخزون لا يمكن أن يكون سالباً')
    .max(1000000, 'المخزون كبير جداً'),
  line: z.string().max(100).trim().optional().nullable(),
  unit: z.string().max(50).trim().optional().nullable(),
  min_stock_level: z.number()
    .int()
    .nonnegative('الحد الأدنى للمخزون لا يمكن أن يكون سالباً')
    .optional()
    .nullable(),
  max_stock_level: z.number()
    .int()
    .nonnegative('الحد الأقصى للمخزون لا يمكن أن يكون سالباً')
    .optional()
    .nullable(),
  average_daily_usage: z.number()
    .nonnegative('متوسط الاستخدام اليومي لا يمكن أن يكون سالباً')
    .optional()
    .nullable(),
  image_url: z.string().url('رابط الصورة غير صالح').optional().nullable(),
});

// تحقق إضافي: الحد الأقصى يجب أن يكون أكبر من الحد الأدنى
export const productSchemaWithRefinement = productSchema.refine(
  (data) => {
    if (data.min_stock_level && data.max_stock_level) {
      return data.max_stock_level >= data.min_stock_level;
    }
    return true;
  },
  {
    message: 'الحد الأقصى للمخزون يجب أن يكون أكبر من أو يساوي الحد الأدنى',
    path: ['max_stock_level']
  }
);

export const productUpdateSchema = productSchema.partial().required({ id: true });

// ==================== Order Schemas ====================

export const orderItemSchema = z.object({
  productId: z.string().uuid('معرف منتج غير صالح'),
  product_id: z.string().uuid('معرف منتج غير صالح').optional(), // alias
  quantity: z.number()
    .int('الكمية يجب أن تكون عدداً صحيحاً')
    .positive('الكمية يجب أن تكون موجبة')
    .max(10000, 'الكمية كبيرة جداً'),
  price: z.number()
    .positive('السعر يجب أن يكون موجباً')
    .max(1000000, 'السعر غير منطقي')
    .multipleOf(0.01, 'السعر يجب أن يكون رقماً صحيحاً'),
  name: z.string().optional(), // للعرض
}).transform((data) => ({
  ...data,
  productId: data.productId || data.product_id
}));

export const orderSchema = z.object({
  clinic_id: z.string().uuid('معرف عيادة غير صالح'),
  representative_id: z.string().uuid('معرف مندوب غير صالح'),
  items: z.array(orderItemSchema)
    .min(1, 'يجب إضافة منتج واحد على الأقل')
    .max(100, 'عدد المنتجات كبير جداً (100 كحد أقصى)'),
  notes: z.string()
    .max(1000, 'الملاحظات طويلة جداً (1000 حرف كحد أقصى)')
    .trim()
    .optional()
    .nullable(),
  order_date: z.string().datetime().optional(),
  delivery_date: z.string().datetime().optional().nullable(),
});

// Schema for creating new orders (compatible with our enhanced system)
export const orderCreateSchema = z.object({
  clinicId: z.string().min(1, 'العيادة مطلوبة'),
  representativeId: z.string().min(1, 'المندوب مطلوب'),
  representativeName: z.string().min(2, 'اسم المندوب مطلوب'),
  items: z.array(z.object({
    productId: z.string().min(1, 'المنتج مطلوب'),
    quantity: z.number().min(1, 'الكمية يجب أن تكون أكبر من صفر'),
    unitPrice: z.number().min(0).optional(),
    discount: z.number().min(0).max(100).optional().default(0),
    notes: z.string().optional(),
  })).min(1, 'يجب إضافة منتج واحد على الأقل'),
  subtotal: z.number().min(0).optional(),
  discount: z.number().min(0).optional().default(0),
  discountPercentage: z.number().min(0).max(100).optional().default(0),
  total: z.number().min(0).optional(),
  paymentMethod: z.enum(['cash', 'bank_transfer', 'deferred']).optional().default('cash'),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  notes: z.string().optional(),
  dueDate: z.string().optional(),
});

// ==================== Visit Schema ====================

export const visitSchema = z.object({
  id: z.string().uuid().optional(),
  clinic_id: z.string().uuid('معرف عيادة غير صالح'),
  representative_id: z.string().uuid('معرف مندوب غير صالح'),
  visit_date: z.string().datetime('تاريخ الزيارة غير صالح'),
  purpose: z.string()
    .min(3, 'الغرض من الزيارة يجب أن يكون 3 أحرف على الأقل')
    .max(500, 'الغرض من الزيارة طويل جداً')
    .trim(),
  notes: z.string()
    .max(1000, 'الملاحظات طويلة جداً')
    .trim()
    .optional()
    .nullable(),
  outcome: z.enum(['successful', 'unsuccessful', 'follow_up_needed'], {
    errorMap: () => ({ message: 'نتيجة الزيارة غير صالحة' })
  }).optional().nullable(),
  next_visit_date: z.string().datetime().optional().nullable(),
});

// ==================== Helper Functions ====================

/**
 * Helper: التحقق من البيانات وإرجاع نتيجة واضحة
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => {
        const field = err.path.join('.');
        return `${field}: ${err.message}`;
      });
      return { success: false, errors };
    }
    return { success: false, errors: ['خطأ غير متوقع في التحقق من البيانات'] };
  }
}

/**
 * Helper: التحقق من البيانات أو رمي خطأ
 */
export function validateOrThrow<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T {
  return schema.parse(data);
}