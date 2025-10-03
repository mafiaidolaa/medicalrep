import { Pool, PoolConfig } from 'pg';

// إعدادات الاتصال بقاعدة البيانات
const dbConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'orders_management',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // الحد الأقصى للاتصالات في المجموعة
  idleTimeoutMillis: 30000, // وقت انتظار الاتصال الخامل
  connectionTimeoutMillis: 2000, // وقت انتظار الاتصال
};

// إنشاء مجموعة الاتصالات
const pool = new Pool(dbConfig);

// معالج الأخطاء
pool.on('error', (err) => {
  console.error('خطأ غير متوقع في قاعدة البيانات:', err);
});

// دالة الاستعلام الأساسية
export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    
    // تسجيل الاستعلامات البطيئة (أكثر من ثانية واحدة)
    if (duration > 1000) {
      console.warn(`استعلام بطيء (${duration}ms):`, text);
    }
    
    return res;
  } catch (error) {
    console.error('خطأ في الاستعلام:', error);
    console.error('النص:', text);
    console.error('المعاملات:', params);
    throw error;
  }
};

// دالة للحصول على اتصال من المجموعة
export const getClient = () => {
  return pool.connect();
};

// دالة للمعاملات (Transactions)
export const transaction = async (callback: (client: any) => Promise<any>) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// دوال مساعدة للاستعلامات الشائعة

// دالة للحصول على سجل واحد
export const queryOne = async (text: string, params?: any[]) => {
  const result = await query(text, params);
  return result.rows[0] || null;
};

// دالة للحصول على عدة سجلات
export const queryMany = async (text: string, params?: any[]) => {
  const result = await query(text, params);
  return result.rows;
};

// دالة للإدراج مع إرجاع ID
export const insert = async (table: string, data: Record<string, any>) => {
  const columns = Object.keys(data);
  const values = Object.values(data);
  const placeholders = values.map((_, index) => `$${index + 1}`);

  const text = `
    INSERT INTO ${table} (${columns.join(', ')})
    VALUES (${placeholders.join(', ')})
    RETURNING id
  `;

  const result = await query(text, values);
  return result.rows[0]?.id;
};

// دالة للتحديث
export const update = async (
  table: string,
  data: Record<string, any>,
  where: string,
  whereParams: any[] = []
) => {
  const columns = Object.keys(data);
  const values = Object.values(data);
  
  const setClause = columns
    .map((col, index) => `${col} = $${index + 1}`)
    .join(', ');
  
  const text = `
    UPDATE ${table}
    SET ${setClause}
    WHERE ${where}
    RETURNING *
  `;

  const allParams = [...values, ...whereParams];
  const result = await query(text, allParams);
  return result.rows[0];
};

// دالة للحذف
export const deleteRecord = async (
  table: string,
  where: string,
  whereParams: any[] = []
) => {
  const text = `DELETE FROM ${table} WHERE ${where}`;
  const result = await query(text, whereParams);
  return result.rowCount;
};

// دوال خاصة بنظام الطلبات

// دالة للحصول على المستخدم بالبريد الإلكتروني
export const getUserByEmail = async (email: string) => {
  const text = 'SELECT * FROM users WHERE email = $1 AND is_active = true';
  return await queryOne(text, [email]);
};

// دالة للحصول على المنتجات المتاحة
export const getAvailableProducts = async (filters?: {
  category?: string;
  area?: string;
  line?: string;
  searchTerm?: string;
}) => {
  let text = `
    SELECT p.*, pc.name as category_name,
           COALESCE(r.reserved_quantity, 0) as reserved_quantity,
           (p.in_stock - COALESCE(r.reserved_quantity, 0)) as available_quantity
    FROM products p
    JOIN product_categories pc ON p.category_id = pc.id
    LEFT JOIN (
        SELECT product_id, SUM(quantity) as reserved_quantity
        FROM product_reservations 
        WHERE status = 'active' AND expires_at > NOW()
        GROUP BY product_id
    ) r ON p.id = r.product_id
    WHERE p.is_active = true AND p.in_stock > 0
  `;
  
  const params: any[] = [];
  let paramIndex = 1;

  if (filters?.category) {
    text += ` AND pc.name = $${paramIndex}`;
    params.push(filters.category);
    paramIndex++;
  }

  if (filters?.searchTerm) {
    text += ` AND (p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`;
    params.push(`%${filters.searchTerm}%`);
    paramIndex++;
  }

  text += ' ORDER BY p.name';

  return await queryMany(text, params);
};

// دالة للحصول على العيادات حسب المنطقة والخط
export const getClinicsByAreaLine = async (area?: string, line?: string) => {
  let text = 'SELECT * FROM clinics WHERE is_active = true';
  const params: any[] = [];
  let paramIndex = 1;

  if (area) {
    text += ` AND area = $${paramIndex}`;
    params.push(area);
    paramIndex++;
  }

  if (line) {
    text += ` AND line = $${paramIndex}`;
    params.push(line);
    paramIndex++;
  }

  text += ' ORDER BY name';

  return await queryMany(text, params);
};

// دالة لإنشاء طلب جديد
export const createOrder = async (orderData: {
  clinic_id: string;
  clinic_name: string;
  clinic_area: string;
  clinic_line: string;
  representative_id: string;
  representative_name: string;
  representative_role: string;
  payment_method: string;
  priority: string;
  notes?: string;
  created_by: string;
}) => {
  return await transaction(async (client) => {
    // توليد رقم الطلب
    const orderNumberResult = await client.query('SELECT generate_order_number() as order_number');
    const orderNumber = orderNumberResult.rows[0].order_number;

    // إدراج الطلب
    const orderResult = await client.query(`
      INSERT INTO orders (
        order_number, clinic_id, clinic_name, clinic_area, clinic_line,
        representative_id, representative_name, representative_role,
        payment_method, priority, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id
    `, [
      orderNumber,
      orderData.clinic_id,
      orderData.clinic_name,
      orderData.clinic_area,
      orderData.clinic_line,
      orderData.representative_id,
      orderData.representative_name,
      orderData.representative_role,
      orderData.payment_method,
      orderData.priority,
      orderData.notes,
      orderData.created_by
    ]);

    return orderResult.rows[0].id;
  });
};

// دالة لإضافة بند للطلب
export const addOrderItem = async (itemData: {
  order_id: string;
  product_id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  unit: string;
  discount?: number;
  discount_type?: string;
  notes?: string;
  is_demo?: boolean;
}) => {
  const itemTotal = itemData.product_price * itemData.quantity;
  const discountAmount = itemData.discount_type === 'percentage' 
    ? itemTotal * ((itemData.discount || 0) / 100)
    : (itemData.discount || 0);
  const finalAmount = itemTotal - discountAmount;

  const text = `
    INSERT INTO order_items (
      order_id, product_id, product_name, product_price, quantity, unit,
      discount, discount_type, item_total, discount_amount, final_amount,
      notes, is_demo
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING id
  `;

  const result = await query(text, [
    itemData.order_id,
    itemData.product_id,
    itemData.product_name,
    itemData.product_price,
    itemData.quantity,
    itemData.unit,
    itemData.discount || 0,
    itemData.discount_type || 'percentage',
    itemTotal,
    discountAmount,
    finalAmount,
    itemData.notes,
    itemData.is_demo || false
  ]);

  return result.rows[0].id;
};

// دالة للحصول على ملخص الطلبات
export const getOrdersSummary = async (filters?: {
  status?: string;
  representative_id?: string;
  area?: string;
  line?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}) => {
  let text = `
    SELECT o.*, c.doctor_name, c.credit_limit, c.current_debt,
           u.full_name as rep_full_name,
           (SELECT COUNT(*) FROM order_approvals oa 
            WHERE oa.order_id = o.id AND oa.status = 'pending') as pending_approvals
    FROM orders o
    JOIN clinics c ON o.clinic_id = c.id
    JOIN users u ON o.representative_id = u.id
    WHERE 1=1
  `;

  const params: any[] = [];
  let paramIndex = 1;

  if (filters?.status) {
    text += ` AND o.status = $${paramIndex}`;
    params.push(filters.status);
    paramIndex++;
  }

  if (filters?.representative_id) {
    text += ` AND o.representative_id = $${paramIndex}`;
    params.push(filters.representative_id);
    paramIndex++;
  }

  if (filters?.area) {
    text += ` AND o.clinic_area = $${paramIndex}`;
    params.push(filters.area);
    paramIndex++;
  }

  if (filters?.line) {
    text += ` AND o.clinic_line = $${paramIndex}`;
    params.push(filters.line);
    paramIndex++;
  }

  if (filters?.date_from) {
    text += ` AND DATE(o.order_date) >= $${paramIndex}`;
    params.push(filters.date_from);
    paramIndex++;
  }

  if (filters?.date_to) {
    text += ` AND DATE(o.order_date) <= $${paramIndex}`;
    params.push(filters.date_to);
    paramIndex++;
  }

  text += ' ORDER BY o.order_date DESC';

  if (filters?.limit) {
    text += ` LIMIT $${paramIndex}`;
    params.push(filters.limit);
    paramIndex++;
  }

  if (filters?.offset) {
    text += ` OFFSET $${paramIndex}`;
    params.push(filters.offset);
  }

  return await queryMany(text, params);
};

// دالة لحجز المخزون
export const reserveStock = async (
  productId: string,
  orderId: string,
  quantity: number,
  expiryMinutes: number = 30
) => {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);

  const text = `
    INSERT INTO product_reservations (product_id, order_id, quantity, expires_at)
    VALUES ($1, $2, $3, $4)
    RETURNING id
  `;

  const result = await query(text, [productId, orderId, quantity, expiresAt]);
  return result.rows[0].id;
};

// دالة لتنظيف الحجوزات المنتهية الصلاحية
export const cleanupExpiredReservations = async () => {
  const result = await query('SELECT cleanup_expired_reservations()');
  return result.rows[0].cleanup_expired_reservations;
};

// دالة للحصول على إحصائيات الطلبات
export const getOrdersStats = async (filters?: {
  representative_id?: string;
  area?: string;
  line?: string;
  date_from?: string;
  date_to?: string;
}) => {
  let text = `
    SELECT 
      COUNT(*) as total_orders,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
      COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_orders,
      COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
      COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
      COALESCE(SUM(final_total), 0) as total_value,
      COALESCE(AVG(final_total), 0) as average_value
    FROM orders
    WHERE 1=1
  `;

  const params: any[] = [];
  let paramIndex = 1;

  if (filters?.representative_id) {
    text += ` AND representative_id = $${paramIndex}`;
    params.push(filters.representative_id);
    paramIndex++;
  }

  if (filters?.area) {
    text += ` AND clinic_area = $${paramIndex}`;
    params.push(filters.area);
    paramIndex++;
  }

  if (filters?.line) {
    text += ` AND clinic_line = $${paramIndex}`;
    params.push(filters.line);
    paramIndex++;
  }

  if (filters?.date_from) {
    text += ` AND DATE(order_date) >= $${paramIndex}`;
    params.push(filters.date_from);
    paramIndex++;
  }

  if (filters?.date_to) {
    text += ` AND DATE(order_date) <= $${paramIndex}`;
    params.push(filters.date_to);
  }

  return await queryOne(text, params);
};

// إغلاق الاتصالات عند إنهاء التطبيق
process.on('beforeExit', () => {
  pool.end();
});

export default pool;