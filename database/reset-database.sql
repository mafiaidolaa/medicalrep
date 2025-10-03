-- ملف إعادة تعيين قاعدة البيانات
-- استخدم هذا الملف إذا كانت الجداول موجودة مسبقاً

-- حذف الجداول بالترتيب الصحيح (بسبب المراجع الخارجية)
DROP TABLE IF EXISTS stock_transactions CASCADE;
DROP TABLE IF EXISTS order_history CASCADE;
DROP TABLE IF EXISTS order_approvals CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS user_territory_assignments CASCADE;
DROP TABLE IF EXISTS clinic_credit_limits CASCADE;
DROP TABLE IF EXISTS product_stock CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS product_categories CASCADE;
DROP TABLE IF EXISTS clinics CASCADE;
DROP TABLE IF EXISTS territories CASCADE;
DROP TABLE IF EXISTS regions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS representatives CASCADE;

-- حذف جداول إضافية قد تكون موجودة
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS audit_trail CASCADE;
DROP TABLE IF EXISTS file_uploads CASCADE;

-- حذف المشاهدات (Views)
DROP VIEW IF EXISTS active_orders_view CASCADE;
DROP VIEW IF EXISTS clinic_order_summary CASCADE;
DROP VIEW IF EXISTS product_stock_summary CASCADE;
DROP VIEW IF EXISTS user_performance_summary CASCADE;

-- حذف الأنواع المخصصة (ENUMs)
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS order_status CASCADE;
DROP TYPE IF EXISTS payment_type CASCADE;
DROP TYPE IF EXISTS discount_type CASCADE;
DROP TYPE IF EXISTS approval_status CASCADE;
DROP TYPE IF EXISTS transaction_type CASCADE;

-- حذف الإجراءات المخزنة
DROP FUNCTION IF EXISTS create_order_with_items CASCADE;
DROP FUNCTION IF EXISTS approve_order CASCADE;
DROP FUNCTION IF EXISTS reserve_stock CASCADE;
DROP FUNCTION IF EXISTS release_stock_reservation CASCADE;
DROP FUNCTION IF EXISTS get_order_statistics CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_reservations CASCADE;
DROP FUNCTION IF EXISTS update_order_status CASCADE;
DROP FUNCTION IF EXISTS get_user_orders CASCADE;
DROP FUNCTION IF EXISTS get_clinic_credit_status CASCADE;
DROP FUNCTION IF EXISTS calculate_order_totals CASCADE;

-- حذف المشغلات (Triggers)
DROP FUNCTION IF EXISTS update_stock_on_order CASCADE;
DROP FUNCTION IF EXISTS log_order_changes CASCADE;
DROP FUNCTION IF EXISTS validate_order_approval CASCADE;
DROP FUNCTION IF EXISTS check_credit_limit CASCADE;
DROP FUNCTION IF EXISTS update_modified_timestamp CASCADE;

-- رسالة تأكيد
SELECT 'Database reset completed successfully! All tables, views, functions, and triggers have been dropped.' AS message;