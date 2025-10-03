-- إضافة منتجات تجريبية لاختبار النظام
-- قم بتشغيل هذا الملف في محرر SQL في Supabase

-- إنشاء جدول المنتجات إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    cost_price DECIMAL(10, 2),
    stock INTEGER DEFAULT 0,
    min_stock_level INTEGER,
    max_stock_level INTEGER,
    average_daily_usage INTEGER DEFAULT 0,
    line VARCHAR(100),
    unit VARCHAR(50),
    image_url TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- تمكين RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات الأمان
DROP POLICY IF EXISTS "products_read_policy" ON public.products;
DROP POLICY IF EXISTS "products_write_policy" ON public.products;

CREATE POLICY "products_read_policy" ON public.products FOR SELECT TO authenticated
USING (deleted_at IS NULL);

CREATE POLICY "products_write_policy" ON public.products FOR ALL TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager', 'warehouse'))
);

-- إضافة منتجات تجريبية
INSERT INTO public.products (name, sku, price, cost_price, stock, min_stock_level, max_stock_level, average_daily_usage, line, unit, description)
VALUES 
-- منتجات خط الأسنان
('معجون أسنان كولجيت', 'DENT-COL001', 25.50, 18.00, 150, 20, 200, 5, 'dental', 'tube', 'معجون أسنان طبيعي للحماية اليومية'),
('فرشاة أسنان ناعمة', 'DENT-BRS001', 12.00, 8.50, 80, 10, 100, 3, 'dental', 'piece', 'فرشاة أسنان ناعمة لتنظيف لطيف'),
('غسول فم مطهر', 'DENT-MW001', 35.00, 25.00, 60, 15, 80, 2, 'dental', 'bottle', 'غسول فم مضاد للبكتيريا'),
('خيط تنظيف الأسنان', 'DENT-FLS001', 15.75, 11.00, 90, 20, 120, 4, 'dental', 'pack', 'خيط تنظيف الأسنان المقاوم للتمزق'),

-- منتجات خط العناية بالبشرة
('كريم مرطب للوجه', 'SKIN-FC001', 85.00, 60.00, 45, 10, 60, 2, 'skincare', 'jar', 'كريم مرطب يومي للبشرة الجافة'),
('سيروم فيتامين C', 'SKIN-VCS001', 120.00, 85.00, 30, 8, 50, 1, 'skincare', 'bottle', 'سيروم فيتامين سي المركز لإشراق البشرة'),
('واقي شمس SPF 50', 'SKIN-SS001', 95.50, 68.00, 35, 12, 55, 2, 'skincare', 'tube', 'واقي شمس عالي الحماية للوجه والجسم'),
('غسول وجه لطيف', 'SKIN-GWL001', 42.00, 30.00, 65, 15, 85, 3, 'skincare', 'bottle', 'غسول وجه لطيف للاستعمال اليومي'),

-- منتجات خط الأدوية
('مسكن الألم إيبوبروفين', 'MED-IBU001', 18.00, 12.50, 200, 50, 300, 8, 'medication', 'box', 'مسكن للألم والالتهاب - عبوة 20 قرص'),
('فيتامينات متعددة', 'MED-MV001', 55.00, 38.00, 75, 20, 100, 3, 'medication', 'bottle', 'فيتامينات ومعادن متعددة - عبوة 60 كبسولة'),
('شراب السعال', 'MED-CS001', 28.50, 20.00, 40, 15, 65, 2, 'medication', 'bottle', 'شراب مهدئ للسعال والحلق'),
('مرهم للجروح', 'MED-WO001', 22.75, 16.00, 55, 18, 75, 2, 'medication', 'tube', 'مرهم مطهر ومعالج للجروح الصغيرة'),

-- منتجات خط الطبيعية
('زيت الزيتون الطبيعي', 'NAT-OO001', 65.00, 45.00, 25, 8, 40, 1, 'natural', 'bottle', 'زيت زيتون بكر ممتاز للطبخ والعناية'),
('عسل طبيعي', 'NAT-HON001', 78.00, 55.00, 35, 10, 50, 2, 'natural', 'jar', 'عسل طبيعي خام من المناحل المحلية'),
('شاي أخضر عضوي', 'NAT-GT001', 32.00, 22.00, 50, 15, 70, 2, 'natural', 'box', 'شاي أخضر عضوي عالي الجودة'),
('زيت جوز الهند', 'NAT-CO001', 48.00, 33.00, 28, 10, 45, 1, 'natural', 'jar', 'زيت جوز الهند الطبيعي للطبخ والعناية'),

-- منتجات خط الأطفال
('حليب أطفال مرحلة 1', 'BABY-M1001', 145.00, 105.00, 40, 12, 60, 3, 'baby', 'can', 'حليب أطفال للرضع من 0-6 أشهر'),
('حفاضات مقاس متوسط', 'BABY-DM001', 89.00, 62.00, 70, 20, 90, 4, 'baby', 'pack', 'حفاضات للأطفال مقاس متوسط - عبوة 32 قطعة'),
('شامبو أطفال لطيف', 'BABY-SH001', 35.50, 25.00, 45, 15, 65, 2, 'baby', 'bottle', 'شامبو لطيف وآمن للأطفال'),
('كريم طفح الحفاض', 'BABY-DC001', 28.00, 19.50, 38, 12, 55, 2, 'baby', 'tube', 'كريم علاجي ووقائي لطفح الحفاضات');

-- تحديث إحصائيات الجدول
ANALYZE public.products;

-- رسالة نجاح
DO $$ 
BEGIN 
    RAISE NOTICE '✅ تم إضافة المنتجات التجريبية بنجاح!';
    RAISE NOTICE 'تم إضافة 20 منتج في 5 خطوط مختلفة:';
    RAISE NOTICE '- خط الأسنان: 4 منتجات';
    RAISE NOTICE '- خط العناية بالبشرة: 4 منتجات';
    RAISE NOTICE '- خط الأدوية: 4 منتجات';
    RAISE NOTICE '- خط المنتجات الطبيعية: 4 منتجات';
    RAISE NOTICE '- خط منتجات الأطفال: 4 منتجات';
    RAISE NOTICE '';
    RAISE NOTICE 'يمكنك الآن اختبار نظام إنشاء الفواتير مع هذه المنتجات!';
END $$;