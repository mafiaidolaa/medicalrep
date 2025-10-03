-- إصلاح جدول activity_log بإضافة الحقول المفقودة

-- 1. إضافة حقل action إذا لم يكن موجوداً
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'activity_log' AND column_name = 'action') THEN
        ALTER TABLE activity_log ADD COLUMN action VARCHAR(50);
        -- تحديث السجلات الموجودة بقيمة افتراضية
        UPDATE activity_log SET action = 'unknown' WHERE action IS NULL;
    END IF;
END $$;

-- 2. إضافة حقول أخرى قد تكون مفقودة
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'activity_log' AND column_name = 'entity_type') THEN
        ALTER TABLE activity_log ADD COLUMN entity_type VARCHAR(50);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'activity_log' AND column_name = 'entity_id') THEN
        ALTER TABLE activity_log ADD COLUMN entity_id UUID;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'activity_log' AND column_name = 'details') THEN
        ALTER TABLE activity_log ADD COLUMN details JSONB;
    END IF;
END $$;

-- إضافة فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at);