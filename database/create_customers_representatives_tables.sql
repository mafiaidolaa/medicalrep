-- جدول العملاء (Customers)
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    tax_number VARCHAR(50),
    credit_limit DECIMAL(15,2) DEFAULT 0,
    balance DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
    customer_type VARCHAR(20) DEFAULT 'regular' CHECK (customer_type IN ('regular', 'vip', 'wholesale')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- جدول المندوبين (Sales Representatives)
CREATE TABLE IF NOT EXISTS sales_representatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rep_code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    department VARCHAR(100),
    region VARCHAR(100),
    commission_rate DECIMAL(5,2) DEFAULT 0,
    target_amount DECIMAL(15,2) DEFAULT 0,
    current_sales DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- فهرسة للبحث السريع
CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(customer_code);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_balance ON customers(balance);

CREATE INDEX IF NOT EXISTS idx_sales_reps_code ON sales_representatives(rep_code);
CREATE INDEX IF NOT EXISTS idx_sales_reps_name ON sales_representatives(name);
CREATE INDEX IF NOT EXISTS idx_sales_reps_department ON sales_representatives(department);
CREATE INDEX IF NOT EXISTS idx_sales_reps_region ON sales_representatives(region);
CREATE INDEX IF NOT EXISTS idx_sales_reps_status ON sales_representatives(status);

-- تحديث تلقائي لـ updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_representatives_updated_at BEFORE UPDATE ON sales_representatives
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- إدراج بيانات تجريبية للعملاء
INSERT INTO customers (customer_code, name, phone, email, address, credit_limit, customer_type) VALUES
('C001', 'عيادة الدكتور أحمد محمد', '01012345678', 'ahmed.clinic@example.com', 'شارع الجمهورية، المنيل، القاهرة', 50000.00, 'vip'),
('C002', 'مركز الدكتورة فاطمة الطبي', '01123456789', 'fatma.center@example.com', 'شارع الهرم، الجيزة', 30000.00, 'regular'),
('C003', 'عيادة الأطفال المتخصصة', '01234567890', 'kids.clinic@example.com', 'شارع النيل، الزمالك، القاهرة', 40000.00, 'vip'),
('C004', 'مركز الأسنان الحديث', '01098765432', 'dental.modern@example.com', 'شارع الثورة، الإسكندرية', 25000.00, 'regular'),
('C005', 'عيادة الطب التجميلي', '01567890123', 'cosmetic.clinic@example.com', 'شارع الكورنيش، الإسكندرية', 60000.00, 'vip'),
('C006', 'مركز النساء والولادة', '01145678901', 'women.center@example.com', 'شارع السودان، المهندسين، الجيزة', 35000.00, 'regular'),
('C007', 'عيادة الباطنة العامة', '01676543210', 'internal.clinic@example.com', 'شارع رمسيس، وسط البلد، القاهرة', 20000.00, 'regular'),
('C008', 'مركز العيون المتقدم', '01387654321', 'eye.advanced@example.com', 'شارع الحجاز، مصر الجديدة، القاهرة', 45000.00, 'vip'),
('C009', 'عيادة الجلدية والتناسلية', '01298765432', 'derma.clinic@example.com', 'شارع عباس العقاد، مدينة نصر، القاهرة', 30000.00, 'regular'),
('C010', 'مركز المناعة والحساسية', '01456789012', 'immunity.center@example.com', 'شارع التحرير، الدقي، الجيزة', 25000.00, 'regular')
ON CONFLICT (customer_code) DO NOTHING;

-- إدراج بيانات تجريبية للمندوبين
INSERT INTO sales_representatives (rep_code, name, phone, email, department, region, commission_rate, target_amount) VALUES
('R001', 'محمد أحمد السعيد', '01512345678', 'mohamed.ahmed@company.com', 'المبيعات الطبية', 'القاهرة الكبرى', 5.00, 100000.00),
('R002', 'سارة محمود علي', '01623456789', 'sara.mahmoud@company.com', 'المبيعات الطبية', 'الإسكندرية', 5.50, 80000.00),
('R003', 'أحمد حسن محمد', '01734567890', 'ahmed.hassan@company.com', 'مبيعات الأدوية', 'القاهرة الكبرى', 4.50, 120000.00),
('R004', 'نور الدين إبراهيم', '01845678901', 'noureddine.ibrahim@company.com', 'مبيعات الأجهزة', 'الصعيد', 6.00, 90000.00),
('R005', 'ريم عبد الرحمن', '01956789012', 'reem.abdelrahman@company.com', 'المبيعات الطبية', 'الدلتا', 5.25, 85000.00),
('R006', 'كريم محمد فتحي', '01067890123', 'karim.mohamed@company.com', 'مبيعات التجميل', 'القاهرة الكبرى', 7.00, 70000.00),
('R007', 'هدى أحمد صلاح', '01178901234', 'hoda.ahmed@company.com', 'مبيعات الأطفال', 'الإسكندرية', 5.75, 75000.00),
('R008', 'عمر سامي حسن', '01289012345', 'omar.samy@company.com', 'مبيعات الأسنان', 'القناة', 6.50, 60000.00),
('R009', 'مها إبراهيم علي', '01390123456', 'maha.ibrahim@company.com', 'المبيعات الطبية', 'الدلتا', 5.00, 95000.00),
('R010', 'يوسف محمد أمين', '01401234567', 'youssef.mohamed@company.com', 'مبيعات الأجهزة', 'الصعيد', 6.25, 65000.00)
ON CONFLICT (rep_code) DO NOTHING;

-- منح الصلاحيات للجداول الجديدة
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_representatives ENABLE ROW LEVEL SECURITY;

-- سياسة الأمان للعملاء
CREATE POLICY "العملاء: مرئيون للجميع" ON customers
    FOR SELECT USING (true);

CREATE POLICY "العملاء: إنشاء للمخولين" ON customers
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "العملاء: تحديث للمخولين" ON customers
    FOR UPDATE USING (auth.role() = 'authenticated');

-- سياسة الأمان للمندوبين
CREATE POLICY "المندوبون: مرئيون للجميع" ON sales_representatives
    FOR SELECT USING (true);

CREATE POLICY "المندوبون: إنشاء للمخولين" ON sales_representatives
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "المندوبون: تحديث للمخولين" ON sales_representatives
    FOR UPDATE USING (auth.role() = 'authenticated');

COMMENT ON TABLE customers IS 'جدول العملاء - يحتوي على بيانات العملاء والعيادات';
COMMENT ON TABLE sales_representatives IS 'جدول المندوبين - يحتوي على بيانات مندوبي المبيعات';

COMMENT ON COLUMN customers.customer_code IS 'كود العميل الفريد';
COMMENT ON COLUMN customers.credit_limit IS 'حد الائتمان المسموح';
COMMENT ON COLUMN customers.balance IS 'الرصيد الحالي للعميل';
COMMENT ON COLUMN customers.customer_type IS 'نوع العميل: عادي، مميز، جملة';

COMMENT ON COLUMN sales_representatives.rep_code IS 'كود المندوب الفريد';
COMMENT ON COLUMN sales_representatives.commission_rate IS 'معدل العمولة بالنسبة المئوية';
COMMENT ON COLUMN sales_representatives.target_amount IS 'الهدف المطلوب تحقيقه';
COMMENT ON COLUMN sales_representatives.current_sales IS 'المبيعات الحالية المحققة';