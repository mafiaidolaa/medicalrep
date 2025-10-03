-- ==================================================================
-- 🏭 EP Group System - Stock Management Setup Script
-- نموذج تهيئة قاعدة البيانات مع البيانات التجريبية
-- ==================================================================

-- تطبيق مخطط قاعدة البيانات الأساسي
.read stock-management-schema.sql

-- ==================================================================
-- إدراج بيانات تجريبية أكثر تفصيلاً
-- ==================================================================

-- إدراج مستويات المخزون للمنتجات في جميع المخازن
INSERT INTO stock_levels (warehouse_id, product_id, available_quantity, shelf_location, bin_location, updated_by) 
SELECT 
    w.id,
    p.id,
    CASE 
        WHEN p.code = 'PRD001' THEN 15 + (ABS(RANDOM()) % 10)
        WHEN p.code = 'PRD002' THEN 25 + (ABS(RANDOM()) % 15)  
        WHEN p.code = 'PRD003' THEN 50 + (ABS(RANDOM()) % 30)
        WHEN p.code = 'PRD004' THEN 8 + (ABS(RANDOM()) % 5)
        WHEN p.code = 'PRD005' THEN 3 + (ABS(RANDOM()) % 3)
        ELSE 20 + (ABS(RANDOM()) % 20)
    END,
    'A-' || (ABS(RANDOM()) % 10 + 1),
    'B-' || (ABS(RANDOM()) % 20 + 1),
    'admin'
FROM warehouses w
CROSS JOIN products p
WHERE w.is_active = 1 AND p.is_active = 1;

-- ==================================================================
-- إنشاء طلبات تجريبية
-- ==================================================================

-- طلب جديد معلق
INSERT INTO stock_requests (
    request_number, request_type_id, request_type, title, description, priority,
    warehouse_id, requested_by, requested_by_name, department, total_value,
    currency, notes, created_by
) VALUES (
    'SR240101',
    (SELECT id FROM request_types WHERE name = 'order' LIMIT 1),
    'order',
    'طلب معدات طبية للقسم الجراحي',
    'طلب مستلزمات طبية عاجلة لقسم الجراحة',
    'high',
    (SELECT id FROM warehouses WHERE code = 'WH001' LIMIT 1),
    'surgeon001',
    'د. أحمد محمود',
    'قسم الجراحة',
    45600.00,
    'EGP',
    'مطلوب بأسرع وقت ممكن للعمليات الحرجة',
    'surgeon001'
);

-- عناصر الطلب الأول
INSERT INTO stock_request_items (request_id, product_id, requested_quantity, unit_price, currency, notes)
SELECT 
    (SELECT id FROM stock_requests WHERE request_number = 'SR240101'),
    p.id,
    CASE 
        WHEN p.code = 'PRD001' THEN 2
        WHEN p.code = 'PRD002' THEN 3
        WHEN p.code = 'PRD003' THEN 5
    END,
    p.selling_price,
    'EGP',
    'للاستخدام الفوري'
FROM products p 
WHERE p.code IN ('PRD001', 'PRD002', 'PRD003');

-- طلب عينة معتمد
INSERT INTO stock_requests (
    request_number, request_type_id, request_type, title, description, priority,
    warehouse_id, requested_by, requested_by_name, department, status, total_value,
    currency, notes, created_by
) VALUES (
    'SR240102',
    (SELECT id FROM request_types WHERE name = 'demo' LIMIT 1),
    'demo',
    'طلب عينات للعرض على العملاء',
    'عينات لعرض المنتجات الجديدة على العملاء المحتملين',
    'medium',
    (SELECT id FROM warehouses WHERE code = 'WH002' LIMIT 1),
    'sales001',
    'أحمد علي',
    'قسم المبيعات',
    'manager_approved',
    12000.00,
    'EGP',
    'للعرض في معرض القاهرة الطبي',
    'sales001'
);

-- عناصر الطلب الثاني
INSERT INTO stock_request_items (request_id, product_id, requested_quantity, approved_quantity, unit_price, currency)
SELECT 
    (SELECT id FROM stock_requests WHERE request_number = 'SR240102'),
    p.id,
    CASE 
        WHEN p.code = 'PRD003' THEN 10
        WHEN p.code = 'PRD004' THEN 1
    END,
    CASE 
        WHEN p.code = 'PRD003' THEN 8
        WHEN p.code = 'PRD004' THEN 1
    END,
    p.selling_price,
    'EGP'
FROM products p 
WHERE p.code IN ('PRD003', 'PRD004');

-- ==================================================================
-- إدراج موافقات تجريبية
-- ==================================================================

INSERT INTO stock_request_approvals (
    request_id, approver_id, approver_name, approver_email, approver_role,
    approval_level, action, action_date, comments
) VALUES (
    (SELECT id FROM stock_requests WHERE request_number = 'SR240102'),
    'manager001',
    'محمد إبراهيم',
    'manager001@epgroup.com',
    'manager',
    1,
    'approved',
    CURRENT_TIMESTAMP,
    'موافق على طلب العينات للمعرض'
);

-- ==================================================================
-- إدراج حركات مخزون تجريبية
-- ==================================================================

-- حركات إدخال مخزون
INSERT INTO stock_movements (
    movement_number, movement_type, warehouse_id, product_id, quantity,
    unit_price, balance_before, balance_after, reference_type,
    reference_number, description, processed_by, processed_by_name
) VALUES 
(
    'MV24010101',
    'in',
    (SELECT id FROM warehouses WHERE code = 'WH001' LIMIT 1),
    (SELECT id FROM products WHERE code = 'PRD001' LIMIT 1),
    20,
    15000.00,
    0,
    20,
    'purchase',
    'PO-2024-001',
    'استلام دفعة جديدة من الموردين',
    'warehouse001',
    'مدير المخزن'
),
(
    'MV24010102',
    'in',
    (SELECT id FROM warehouses WHERE code = 'WH001' LIMIT 1),
    (SELECT id FROM products WHERE code = 'PRD002' LIMIT 1),
    30,
    2500.00,
    0,
    30,
    'purchase',
    'PO-2024-002',
    'استلام طقم أدوات جراحية',
    'warehouse001',
    'مدير المخزن'
),
(
    'MV24010201',
    'out',
    (SELECT id FROM warehouses WHERE code = 'WH001' LIMIT 1),
    (SELECT id FROM products WHERE code = 'PRD001' LIMIT 1),
    5,
    15000.00,
    20,
    15,
    'stock_request',
    'SR240101',
    'صرف للقسم الجراحي',
    'warehouse001',
    'مدير المخزن'
);

-- ==================================================================
-- إدراج صلاحيات المستخدمين للمخازن
-- ==================================================================

INSERT INTO user_warehouse_permissions (
    user_id, user_name, warehouse_id, can_view, can_create_requests,
    can_approve_requests, can_issue_items, can_receive_items,
    can_manage_stock, can_view_reports, is_warehouse_manager, assigned_by
) VALUES
-- مدير المخزن الرئيسي
(
    'warehouse001', 'مدير المخزن الرئيسي',
    (SELECT id FROM warehouses WHERE code = 'WH001' LIMIT 1),
    1, 1, 1, 1, 1, 1, 1, 1, 'admin'
),
-- مدير فرع القاهرة
(
    'warehouse002', 'مدير فرع القاهرة',
    (SELECT id FROM warehouses WHERE code = 'WH002' LIMIT 1),
    1, 1, 1, 1, 1, 1, 1, 1, 'admin'
),
-- موظف الجراحة
(
    'surgeon001', 'د. أحمد محمود',
    (SELECT id FROM warehouses WHERE code = 'WH001' LIMIT 1),
    1, 1, 0, 0, 1, 0, 1, 0, 'warehouse001'
),
-- موظف المبيعات
(
    'sales001', 'أحمد علي',
    (SELECT id FROM warehouses WHERE code = 'WH002' LIMIT 1),
    1, 1, 0, 0, 0, 0, 1, 0, 'warehouse002'
);

-- ==================================================================
-- إدراج إشعارات تجريبية
-- ==================================================================

INSERT INTO stock_notifications (
    recipient_id, recipient_email, notification_type, title, message,
    priority, warehouse_id, request_id, product_id, is_read
) VALUES
-- إشعار طلب جديد
(
    'warehouse001',
    'warehouse001@epgroup.com',
    'request_created',
    'طلب جديد من المخزن',
    'تم إنشاء طلب جديد: طلب معدات طبية للقسم الجراحي - رقم الطلب: SR240101',
    'high',
    (SELECT id FROM warehouses WHERE code = 'WH001' LIMIT 1),
    (SELECT id FROM stock_requests WHERE request_number = 'SR240101'),
    NULL,
    0
),
-- إشعار مخزون منخفض
(
    'warehouse001',
    'warehouse001@epgroup.com',
    'low_stock',
    'تحذير: مخزون منخفض',
    'المنتج "جهاز رسم القلب" في مخزن "المخزن الرئيسي" وصل للحد الأدنى. المتوفر: 3 قطعة',
    'high',
    (SELECT id FROM warehouses WHERE code = 'WH001' LIMIT 1),
    NULL,
    (SELECT id FROM products WHERE code = 'PRD005' LIMIT 1),
    0
),
-- إشعار موافقة طلب
(
    'sales001',
    'sales001@epgroup.com',
    'request_approved',
    'تمت موافقة الطلب',
    'تمت موافقة الطلب SR240102 من قبل محمد إبراهيم',
    'medium',
    (SELECT id FROM warehouses WHERE code = 'WH002' LIMIT 1),
    (SELECT id FROM stock_requests WHERE request_number = 'SR240102'),
    NULL,
    0
);

-- ==================================================================
-- تحديث أرقام التسلسل في الطلبات والحركات
-- ==================================================================

-- تحديث إجمالي القيم في الطلبات
UPDATE stock_requests 
SET total_value = (
    SELECT COALESCE(SUM(requested_quantity * unit_price), 0)
    FROM stock_request_items 
    WHERE request_id = stock_requests.id
)
WHERE total_value = 0;

-- ==================================================================
-- إضافة بيانات للاختبار المتقدم
-- ==================================================================

-- إدراج المزيد من المنتجات
INSERT INTO products (name, name_ar, code, barcode, category, unit, cost_price, selling_price, min_stock_level, reorder_level, is_active, created_by) VALUES
('Digital Thermometer', 'ترمومتر رقمي', 'PRD006', '1234567890128', 'طبي', 'قطعة', 50.00, 85.00, 25, 40, 1, 'admin'),
('Blood Pressure Monitor', 'جهاز قياس ضغط الدم', 'PRD007', '1234567890129', 'طبي', 'قطعة', 350.00, 500.00, 10, 15, 1, 'admin'),
('Medical Gloves Box', 'علبة قفازات طبية', 'PRD008', '1234567890130', 'مستلزمات', 'علبة', 25.00, 40.00, 50, 80, 1, 'admin'),
('Syringes Pack', 'عبوة سرنجات', 'PRD009', '1234567890131', 'مستلزمات', 'عبوة', 15.00, 25.00, 100, 150, 1, 'admin'),
('Wheelchair', 'كرسي متحرك', 'PRD010', '1234567890132', 'أثاث طبي', 'قطعة', 1200.00, 1800.00, 5, 8, 1, 'admin');

-- إدراج مستويات مخزون للمنتجات الجديدة
INSERT INTO stock_levels (warehouse_id, product_id, available_quantity, shelf_location, bin_location, updated_by) 
SELECT 
    w.id,
    p.id,
    CASE 
        WHEN p.code = 'PRD006' THEN 30
        WHEN p.code = 'PRD007' THEN 12
        WHEN p.code = 'PRD008' THEN 75
        WHEN p.code = 'PRD009' THEN 120
        WHEN p.code = 'PRD010' THEN 6
    END,
    'C-' || (ABS(RANDOM()) % 5 + 1),
    'D-' || (ABS(RANDOM()) % 10 + 1),
    'admin'
FROM warehouses w
CROSS JOIN products p
WHERE w.code IN ('WH001', 'WH002') 
  AND p.code IN ('PRD006', 'PRD007', 'PRD008', 'PRD009', 'PRD010');

-- ==================================================================
-- إنشاء طلب إرجاع تجريبي
-- ==================================================================

INSERT INTO stock_requests (
    request_number, request_type_id, request_type, title, description, priority,
    warehouse_id, requested_by, requested_by_name, department, status, total_value,
    currency, notes, created_by
) VALUES (
    'SR240103',
    (SELECT id FROM request_types WHERE name = 'return' LIMIT 1),
    'return',
    'إرجاع منتجات معيبة',
    'إرجاع منتجات بها عيوب تصنيع للمخزن',
    'medium',
    (SELECT id FROM warehouses WHERE code = 'WH001' LIMIT 1),
    'quality001',
    'مراقب الجودة',
    'قسم الجودة',
    'pending',
    850.00,
    'EGP',
    'منتجات معيبة يجب إرجاعها للمورد',
    'quality001'
);

-- عناصر طلب الإرجاع
INSERT INTO stock_request_items (request_id, product_id, requested_quantity, unit_price, currency, notes)
VALUES (
    (SELECT id FROM stock_requests WHERE request_number = 'SR240103'),
    (SELECT id FROM products WHERE code = 'PRD006'),
    10,
    85.00,
    'EGP',
    'ترمومترات لا تعمل بشكل صحيح'
);

-- ==================================================================
-- عرض ملخص البيانات المُدرجة
-- ==================================================================

SELECT 'Stock Management System Initialized Successfully!' as status;

SELECT 'Data Summary:' as info;
SELECT 'Warehouses' as table_name, COUNT(*) as count FROM warehouses
UNION ALL
SELECT 'Products', COUNT(*) FROM products
UNION ALL
SELECT 'Stock Levels', COUNT(*) FROM stock_levels
UNION ALL
SELECT 'Request Types', COUNT(*) FROM request_types
UNION ALL
SELECT 'Stock Requests', COUNT(*) FROM stock_requests
UNION ALL
SELECT 'Request Items', COUNT(*) FROM stock_request_items
UNION ALL
SELECT 'Approvals', COUNT(*) FROM stock_request_approvals
UNION ALL
SELECT 'Stock Movements', COUNT(*) FROM stock_movements
UNION ALL
SELECT 'User Permissions', COUNT(*) FROM user_warehouse_permissions
UNION ALL
SELECT 'Notifications', COUNT(*) FROM stock_notifications
ORDER BY table_name;

-- عرض حالة المخزون الحالية
SELECT 'Current Stock Status:' as info;
SELECT 
    w.name_ar as warehouse,
    p.name_ar as product,
    sl.available_quantity as available,
    p.min_stock_level as min_level,
    CASE 
        WHEN sl.available_quantity = 0 THEN 'نفد'
        WHEN sl.available_quantity <= p.min_stock_level THEN 'منخفض'
        ELSE 'طبيعي'
    END as status
FROM stock_levels sl
JOIN warehouses w ON sl.warehouse_id = w.id
JOIN products p ON sl.product_id = p.id
ORDER BY w.name_ar, p.name_ar;