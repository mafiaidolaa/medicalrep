-- إضافة الحقول المفقودة إلى جدول العيادات
-- 1. إضافة حقل classification إذا لم يكن موجوداً
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'clinics' AND column_name = 'classification') THEN
        ALTER TABLE clinics ADD COLUMN classification VARCHAR(10) DEFAULT 'B';
    END IF;
END $$;

-- 2. إضافة حقل credit_status إذا لم يكن موجوداً
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'clinics' AND column_name = 'credit_status') THEN
        ALTER TABLE clinics ADD COLUMN credit_status VARCHAR(20) DEFAULT 'green';
    END IF;
END $$;

-- 3. إضافة حقل clinic_phone إذا لم يكن موجوداً
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'clinics' AND column_name = 'clinic_phone') THEN
        ALTER TABLE clinics ADD COLUMN clinic_phone VARCHAR(20);
    END IF;
END $$;

-- 4. إضافة حقل doctor_phone إذا لم يكن موجوداً
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'clinics' AND column_name = 'doctor_phone') THEN
        ALTER TABLE clinics ADD COLUMN doctor_phone VARCHAR(20);
    END IF;
END $$;

-- 5. إضافة حقل doctor_name إذا لم يكن موجوداً
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'clinics' AND column_name = 'doctor_name') THEN
        ALTER TABLE clinics ADD COLUMN doctor_name VARCHAR(255);
    END IF;
END $$;

-- 6. إضافة حقل registered_at إذا لم يكن موجوداً
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'clinics' AND column_name = 'registered_at') THEN
        ALTER TABLE clinics ADD COLUMN registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;