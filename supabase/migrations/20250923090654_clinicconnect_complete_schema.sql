-- ======================================
-- ClinicConnect - Complete Database Schema
-- ======================================
-- This migration creates the complete ClinicConnect database from scratch
-- Run this on a fresh Supabase project

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- ======================================
-- CORE TABLES
-- ======================================

-- Users table (must be first due to foreign key dependencies)
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT CHECK (role IN ('admin', 'medical_rep', 'manager', 'accountant', 'supervisor')) NOT NULL,
    hire_date TIMESTAMPTZ NOT NULL,
    password TEXT NOT NULL,
    area TEXT,
    line TEXT,
    primary_phone TEXT NOT NULL,
    whatsapp_phone TEXT,
    alt_phone TEXT,
    profile_picture TEXT,
    sales_target NUMERIC DEFAULT 0,
    visits_target INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User preferences
CREATE TABLE public.user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    language TEXT DEFAULT 'en',
    theme TEXT DEFAULT 'light',
    timezone TEXT DEFAULT 'UTC',
    notifications_email BOOLEAN DEFAULT true,
    notifications_push BOOLEAN DEFAULT true,
    dashboard_layout JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clinics table
CREATE TABLE public.clinics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    doctor_name TEXT NOT NULL,
    address TEXT NOT NULL,
    lat NUMERIC NOT NULL,
    lng NUMERIC NOT NULL,
    registered_at TIMESTAMPTZ NOT NULL,
    registered_by UUID REFERENCES public.users(id),
    clinic_phone TEXT,
    doctor_phone TEXT,
    email TEXT,
    website TEXT,
    area TEXT NOT NULL,
    line TEXT NOT NULL,
    classification TEXT CHECK (classification IN ('A', 'B', 'C', 'VIP')) NOT NULL,
    credit_status TEXT CHECK (credit_status IN ('green', 'yellow', 'red', 'blocked')) NOT NULL,
    credit_limit NUMERIC DEFAULT 0,
    outstanding_balance NUMERIC DEFAULT 0,
    payment_terms INTEGER DEFAULT 30,
    specialty TEXT,
    working_hours JSONB,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clinic contacts
CREATE TABLE public.clinic_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position TEXT,
    phone TEXT,
    email TEXT,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product categories
CREATE TABLE public.product_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products table
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    category_id UUID REFERENCES public.product_categories(id),
    description TEXT,
    price NUMERIC NOT NULL,
    cost_price NUMERIC,
    image_url TEXT,
    stock INTEGER NOT NULL DEFAULT 0,
    min_stock_level INTEGER DEFAULT 0,
    max_stock_level INTEGER DEFAULT 1000,
    average_daily_usage NUMERIC NOT NULL DEFAULT 0,
    line TEXT NOT NULL,
    unit TEXT DEFAULT 'piece',
    weight NUMERIC,
    dimensions JSONB,
    expiry_tracking BOOLEAN DEFAULT false,
    batch_tracking BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product batches
CREATE TABLE public.product_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    batch_number TEXT NOT NULL,
    manufacturing_date DATE,
    expiry_date DATE,
    quantity INTEGER NOT NULL DEFAULT 0,
    cost_price NUMERIC,
    supplier TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stock movements
CREATE TABLE public.stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES public.product_batches(id),
    movement_type TEXT CHECK (movement_type IN ('in', 'out', 'adjustment', 'transfer')) NOT NULL,
    quantity INTEGER NOT NULL,
    reference_type TEXT,
    reference_id UUID,
    notes TEXT,
    user_id UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT UNIQUE NOT NULL,
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
    representative_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    order_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivery_date TIMESTAMPTZ,
    expected_delivery_date TIMESTAMPTZ,
    status TEXT CHECK (status IN ('draft', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned')) NOT NULL DEFAULT 'draft',
    priority TEXT CHECK (priority IN ('low', 'normal', 'high', 'urgent')) DEFAULT 'normal',
    subtotal NUMERIC NOT NULL DEFAULT 0,
    tax_amount NUMERIC DEFAULT 0,
    discount_amount NUMERIC DEFAULT 0,
    shipping_cost NUMERIC DEFAULT 0,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    payment_terms INTEGER DEFAULT 30,
    payment_status TEXT CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'overdue')) DEFAULT 'unpaid',
    shipping_address TEXT,
    billing_address TEXT,
    notes TEXT,
    internal_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order items
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
    batch_id UUID REFERENCES public.product_batches(id),
    quantity INTEGER NOT NULL,
    unit_price NUMERIC NOT NULL,
    discount_percent NUMERIC DEFAULT 0,
    discount_amount NUMERIC DEFAULT 0,
    line_total NUMERIC NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order status history
CREATE TABLE public.order_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    from_status TEXT,
    to_status TEXT NOT NULL,
    changed_by UUID REFERENCES public.users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Visits table
CREATE TABLE public.visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_number TEXT UNIQUE NOT NULL,
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
    representative_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    visit_date TIMESTAMPTZ NOT NULL,
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    visit_type TEXT CHECK (visit_type IN ('scheduled', 'unscheduled', 'follow_up', 'emergency', 'collection')) NOT NULL,
    purpose TEXT NOT NULL,
    objectives JSONB,
    achievements JSONB,
    notes TEXT,
    outcome TEXT,
    next_visit_date TIMESTAMPTZ,
    next_visit_purpose TEXT,
    mood_rating INTEGER CHECK (mood_rating >= 1 AND mood_rating <= 5),
    success_rating INTEGER CHECK (success_rating >= 1 AND success_rating <= 5),
    gps_lat NUMERIC,
    gps_lng NUMERIC,
    photos JSONB,
    voice_notes JSONB,
    status TEXT CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled', 'no_show')) DEFAULT 'planned',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Visit products
CREATE TABLE public.visit_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id UUID REFERENCES public.visits(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    discussed BOOLEAN DEFAULT true,
    samples_given INTEGER DEFAULT 0,
    interest_level INTEGER CHECK (interest_level >= 1 AND interest_level <= 5),
    feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Visit attendees
CREATE TABLE public.visit_attendees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id UUID REFERENCES public.visits(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position TEXT,
    role TEXT CHECK (role IN ('doctor', 'nurse', 'pharmacist', 'admin', 'other')),
    contact_info TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Collections table
CREATE TABLE public.collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_number TEXT UNIQUE NOT NULL,
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
    representative_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id),
    amount NUMERIC NOT NULL,
    collection_date TIMESTAMPTZ NOT NULL,
    payment_method TEXT CHECK (payment_method IN ('cash', 'check', 'bank_transfer', 'card', 'mobile_money')) NOT NULL,
    reference_number TEXT,
    bank_name TEXT,
    check_date DATE,
    status TEXT CHECK (status IN ('pending', 'cleared', 'bounced', 'cancelled')) DEFAULT 'pending',
    notes TEXT,
    receipt_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expense categories
CREATE TABLE public.expense_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    budget_limit NUMERIC,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expenses table
CREATE TABLE public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_number TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.expense_categories(id),
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'USD',
    description TEXT NOT NULL,
    expense_date TIMESTAMPTZ NOT NULL,
    receipt_url TEXT,
    status TEXT CHECK (status IN ('draft', 'submitted', 'pending', 'approved', 'rejected', 'paid')) NOT NULL DEFAULT 'draft',
    approved_by UUID REFERENCES public.users(id),
    approval_date TIMESTAMPTZ,
    rejection_reason TEXT,
    payment_date TIMESTAMPTZ,
    payment_method TEXT,
    mileage NUMERIC,
    location TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Plan categories
CREATE TABLE public.plan_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Plan tasks table
CREATE TABLE public.plan_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    category_id UUID REFERENCES public.plan_categories(id),
    assigned_to UUID REFERENCES public.users(id) ON DELETE CASCADE,
    created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
    due_date TIMESTAMPTZ NOT NULL,
    start_date TIMESTAMPTZ,
    estimated_duration INTEGER,
    actual_duration INTEGER,
    status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold')) NOT NULL DEFAULT 'pending',
    priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) NOT NULL DEFAULT 'medium',
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE SET NULL,
    related_order_id UUID REFERENCES public.orders(id),
    recurring BOOLEAN DEFAULT false,
    recurrence_pattern JSONB,
    parent_task_id UUID REFERENCES public.plan_tasks(id),
    tags JSONB,
    attachments JSONB,
    location TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task comments
CREATE TABLE public.task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES public.plan_tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    attachments JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity log table
CREATE TABLE public.activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    entity_name TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT CHECK (type IN ('info', 'warning', 'error', 'success', 'reminder', 'system')) NOT NULL,
    category TEXT CHECK (category IN ('order', 'visit', 'task', 'payment', 'stock', 'system', 'general')) DEFAULT 'general',
    priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    action_url TEXT,
    action_data JSONB,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- System settings
CREATE TABLE public.system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key TEXT UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- File uploads
CREATE TABLE public.file_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    uploaded_by UUID REFERENCES public.users(id),
    entity_type TEXT,
    entity_id UUID,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ======================================
-- INDEXES FOR PERFORMANCE
-- ======================================

-- Users indexes
CREATE INDEX idx_users_username ON public.users(username);
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_area_line ON public.users(area, line);
CREATE INDEX idx_users_is_active ON public.users(is_active);

-- Clinics indexes
CREATE INDEX idx_clinics_area ON public.clinics(area);
CREATE INDEX idx_clinics_line ON public.clinics(line);
CREATE INDEX idx_clinics_classification ON public.clinics(classification);
CREATE INDEX idx_clinics_credit_status ON public.clinics(credit_status);
CREATE INDEX idx_clinics_registered_by ON public.clinics(registered_by);
CREATE INDEX idx_clinics_is_active ON public.clinics(is_active);

-- Products indexes
CREATE INDEX idx_products_sku ON public.products(sku);
CREATE INDEX idx_products_category_id ON public.products(category_id);
CREATE INDEX idx_products_line ON public.products(line);
CREATE INDEX idx_products_stock ON public.products(stock);
CREATE INDEX idx_products_is_active ON public.products(is_active);
CREATE INDEX idx_products_name_gin ON public.products USING gin(name gin_trgm_ops);

-- Orders indexes
CREATE INDEX idx_orders_number ON public.orders(order_number);
CREATE INDEX idx_orders_clinic_id ON public.orders(clinic_id);
CREATE INDEX idx_orders_representative_id ON public.orders(representative_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_order_date ON public.orders(order_date);
CREATE INDEX idx_orders_total_amount ON public.orders(total_amount);

-- Visits indexes
CREATE INDEX idx_visits_number ON public.visits(visit_number);
CREATE INDEX idx_visits_clinic_id ON public.visits(clinic_id);
CREATE INDEX idx_visits_representative_id ON public.visits(representative_id);
CREATE INDEX idx_visits_visit_date ON public.visits(visit_date);
CREATE INDEX idx_visits_status ON public.visits(status);
CREATE INDEX idx_visits_visit_type ON public.visits(visit_type);

-- Collections indexes
CREATE INDEX idx_collections_number ON public.collections(collection_number);
CREATE INDEX idx_collections_clinic_id ON public.collections(clinic_id);
CREATE INDEX idx_collections_representative_id ON public.collections(representative_id);
CREATE INDEX idx_collections_collection_date ON public.collections(collection_date);
CREATE INDEX idx_collections_status ON public.collections(status);

-- Plan tasks indexes
CREATE INDEX idx_plan_tasks_assigned_to ON public.plan_tasks(assigned_to);
CREATE INDEX idx_plan_tasks_status ON public.plan_tasks(status);
CREATE INDEX idx_plan_tasks_due_date ON public.plan_tasks(due_date);
CREATE INDEX idx_plan_tasks_priority ON public.plan_tasks(priority);
CREATE INDEX idx_plan_tasks_category_id ON public.plan_tasks(category_id);

-- Activity log indexes
CREATE INDEX idx_activity_log_user_id ON public.activity_log(user_id);
CREATE INDEX idx_activity_log_timestamp ON public.activity_log(timestamp);
CREATE INDEX idx_activity_log_entity ON public.activity_log(entity_type, entity_id);

-- Notifications indexes
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_notifications_type ON public.notifications(type);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at);

-- Expenses indexes
CREATE INDEX idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX idx_expenses_status ON public.expenses(status);
CREATE INDEX idx_expenses_expense_date ON public.expenses(expense_date);
CREATE INDEX idx_expenses_category_id ON public.expenses(category_id);

-- ======================================
-- FUNCTIONS AND TRIGGERS
-- ======================================

-- Function to update updated_at timestamps
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER set_public_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER set_public_user_preferences_updated_at
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER set_public_clinics_updated_at
    BEFORE UPDATE ON public.clinics
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER set_public_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER set_public_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER set_public_visits_updated_at
    BEFORE UPDATE ON public.visits
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER set_public_collections_updated_at
    BEFORE UPDATE ON public.collections
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER set_public_plan_tasks_updated_at
    BEFORE UPDATE ON public.plan_tasks
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER set_public_expenses_updated_at
    BEFORE UPDATE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER set_public_system_settings_updated_at
    BEFORE UPDATE ON public.system_settings
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Function to generate sequential numbers
CREATE OR REPLACE FUNCTION public.generate_sequential_number(prefix TEXT, table_name TEXT, column_name TEXT)
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    formatted_number TEXT;
BEGIN
    EXECUTE format('SELECT COALESCE(MAX(CAST(SUBSTRING(%I FROM %s) AS INTEGER)), 0) + 1 FROM %I WHERE %I LIKE %L',
        column_name, LENGTH(prefix) + 1, table_name, column_name, prefix || '%')
    INTO next_number;
    
    formatted_number := prefix || LPAD(next_number::TEXT, 6, '0');
    RETURN formatted_number;
END;
$$ LANGUAGE plpgsql;

-- Auto-generate order numbers
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
        NEW.order_number := public.generate_sequential_number('ORD-', 'orders', 'order_number');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_order_number
    BEFORE INSERT ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.generate_order_number();

-- Auto-generate visit numbers
CREATE OR REPLACE FUNCTION public.generate_visit_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.visit_number IS NULL OR NEW.visit_number = '' THEN
        NEW.visit_number := public.generate_sequential_number('VIS-', 'visits', 'visit_number');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_visit_number
    BEFORE INSERT ON public.visits
    FOR EACH ROW EXECUTE FUNCTION public.generate_visit_number();

-- Auto-generate collection numbers
CREATE OR REPLACE FUNCTION public.generate_collection_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.collection_number IS NULL OR NEW.collection_number = '' THEN
        NEW.collection_number := public.generate_sequential_number('COL-', 'collections', 'collection_number');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_collection_number
    BEFORE INSERT ON public.collections
    FOR EACH ROW EXECUTE FUNCTION public.generate_collection_number();

-- Auto-generate expense numbers
CREATE OR REPLACE FUNCTION public.generate_expense_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.expense_number IS NULL OR NEW.expense_number = '' THEN
        NEW.expense_number := public.generate_sequential_number('EXP-', 'expenses', 'expense_number');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_expense_number
    BEFORE INSERT ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION public.generate_expense_number();

-- Update order totals when items change
CREATE OR REPLACE FUNCTION public.update_order_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.orders 
    SET subtotal = (
        SELECT COALESCE(SUM(line_total), 0) 
        FROM public.order_items 
        WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
    )
    WHERE id = COALESCE(NEW.order_id, OLD.order_id);
    
    UPDATE public.orders 
    SET total_amount = subtotal + COALESCE(tax_amount, 0) - COALESCE(discount_amount, 0) + COALESCE(shipping_cost, 0)
    WHERE id = COALESCE(NEW.order_id, OLD.order_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_order_total_insert
    AFTER INSERT ON public.order_items
    FOR EACH ROW EXECUTE FUNCTION public.update_order_total();

CREATE TRIGGER trigger_update_order_total_update
    AFTER UPDATE ON public.order_items
    FOR EACH ROW EXECUTE FUNCTION public.update_order_total();

CREATE TRIGGER trigger_update_order_total_delete
    AFTER DELETE ON public.order_items
    FOR EACH ROW EXECUTE FUNCTION public.update_order_total();

-- ======================================
-- ROW LEVEL SECURITY (RLS)
-- ======================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies - Allow authenticated users access for now
-- You can customize these later based on your specific requirements

CREATE POLICY "Enable access for authenticated users only" ON public.users
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable access for authenticated users only" ON public.user_preferences
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable access for authenticated users only" ON public.clinics
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable access for authenticated users only" ON public.clinic_contacts
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable access for authenticated users only" ON public.product_categories
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable access for authenticated users only" ON public.products
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable access for authenticated users only" ON public.product_batches
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable access for authenticated users only" ON public.stock_movements
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable access for authenticated users only" ON public.orders
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable access for authenticated users only" ON public.order_items
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable access for authenticated users only" ON public.order_status_history
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable access for authenticated users only" ON public.visits
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable access for authenticated users only" ON public.visit_products
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable access for authenticated users only" ON public.visit_attendees
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable access for authenticated users only" ON public.collections
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable access for authenticated users only" ON public.expense_categories
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable access for authenticated users only" ON public.expenses
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable access for authenticated users only" ON public.plan_categories
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable access for authenticated users only" ON public.plan_tasks
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable access for authenticated users only" ON public.task_comments
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable access for authenticated users only" ON public.notifications
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable access for authenticated users only" ON public.activity_log
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for public settings" ON public.system_settings
    FOR SELECT USING (is_public = true OR auth.role() = 'authenticated');

CREATE POLICY "Enable access for authenticated users only" ON public.file_uploads
    FOR ALL USING (auth.role() = 'authenticated');

-- ======================================
-- SEED INITIAL DATA
-- ======================================

-- Insert default product categories
INSERT INTO public.product_categories (name, description) VALUES 
('Pharmaceuticals', 'Medical drugs and medications'),
('Medical Devices', 'Medical equipment and devices'),
('Consumables', 'Single-use medical supplies'),
('Laboratory', 'Laboratory equipment and supplies'),
('Dental', 'Dental care products and equipment');

-- Insert default plan categories
INSERT INTO public.plan_categories (name, description, color) VALUES 
('Sales Visit', 'Regular sales visits to clinics', '#3B82F6'),
('Follow-up', 'Follow-up visits and calls', '#EF4444'),
('Collection', 'Payment collection activities', '#10B981'),
('Training', 'Product training and demonstrations', '#F59E0B'),
('Administrative', 'Administrative tasks and reporting', '#6B7280');

-- Insert default expense categories
INSERT INTO public.expense_categories (name, description) VALUES 
('Travel', 'Transportation and travel expenses'),
('Accommodation', 'Hotel and lodging expenses'),
('Meals', 'Food and dining expenses'),
('Fuel', 'Vehicle fuel expenses'),
('Marketing', 'Marketing materials and promotional items'),
('Training', 'Training and education expenses'),
('Office Supplies', 'Office materials and supplies'),
('Communication', 'Phone and internet expenses'),
('Entertainment', 'Client entertainment expenses'),
('Other', 'Miscellaneous expenses');

-- Insert default system settings
INSERT INTO public.system_settings (setting_key, setting_value, description, category, is_public) VALUES 
('app_name', '"ClinicConnect"', 'Application name', 'general', true),
('app_version', '"1.0.0"', 'Application version', 'general', true),
('default_currency', '"USD"', 'Default currency for transactions', 'financial', true),
('default_timezone', '"UTC"', 'Default timezone', 'general', true),
('max_file_size', '10485760', 'Maximum file upload size in bytes (10MB)', 'uploads', false),
('session_timeout', '3600', 'Session timeout in seconds', 'security', false),
('email_notifications', 'true', 'Enable email notifications', 'notifications', false),
('low_stock_threshold', '10', 'Default low stock threshold', 'inventory', true);

-- ======================================
-- USEFUL VIEWS
-- ======================================

-- Comprehensive clinic view with latest visit and order info
CREATE VIEW public.clinics_summary AS
SELECT 
    c.*,
    COUNT(DISTINCT v.id) as total_visits,
    MAX(v.visit_date) as last_visit_date,
    COUNT(DISTINCT o.id) as total_orders,
    MAX(o.order_date) as last_order_date,
    COALESCE(SUM(o.total_amount), 0) as total_order_value
FROM public.clinics c
LEFT JOIN public.visits v ON c.id = v.clinic_id
LEFT JOIN public.orders o ON c.id = o.clinic_id
GROUP BY c.id;

-- Low stock products view
CREATE VIEW public.low_stock_products AS
SELECT 
    p.*,
    pc.name as category_name,
    CASE 
        WHEN p.stock <= 0 THEN 'out_of_stock'
        WHEN p.stock <= p.min_stock_level THEN 'low_stock'
        ELSE 'in_stock'
    END as stock_status
FROM public.products p
LEFT JOIN public.product_categories pc ON p.category_id = pc.id
WHERE p.stock <= p.min_stock_level AND p.is_active = true;

-- ======================================
-- UTILITY FUNCTIONS
-- ======================================

-- Function to calculate distance between two GPS coordinates
CREATE OR REPLACE FUNCTION public.calculate_distance(lat1 NUMERIC, lng1 NUMERIC, lat2 NUMERIC, lng2 NUMERIC)
RETURNS NUMERIC AS $$
BEGIN
    RETURN (
        6371 * acos(
            cos(radians(lat1)) * 
            cos(radians(lat2)) * 
            cos(radians(lng2) - radians(lng1)) + 
            sin(radians(lat1)) * 
            sin(radians(lat2))
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get user's pending tasks
CREATE OR REPLACE FUNCTION public.get_user_pending_tasks(user_id UUID)
RETURNS TABLE(
    task_id UUID,
    title TEXT,
    due_date TIMESTAMPTZ,
    priority TEXT,
    clinic_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pt.id,
        pt.title,
        pt.due_date,
        pt.priority,
        c.name
    FROM public.plan_tasks pt
    LEFT JOIN public.clinics c ON pt.clinic_id = c.id
    WHERE pt.assigned_to = user_id 
    AND pt.status IN ('pending', 'in_progress')
    ORDER BY pt.due_date ASC, 
             CASE pt.priority 
                WHEN 'urgent' THEN 1 
                WHEN 'high' THEN 2 
                WHEN 'medium' THEN 3 
                WHEN 'low' THEN 4 
             END;
END;
$$ LANGUAGE plpgsql;

-- ======================================
-- SUCCESS MESSAGE
-- ======================================

DO $$ 
BEGIN 
    RAISE NOTICE '🎉 ClinicConnect Database Schema Created Successfully!';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Database Features:';
    RAISE NOTICE '   • 24 tables with complete relationships';
    RAISE NOTICE '   • Automatic number generation (ORD-000001, VIS-000001, etc.)';
    RAISE NOTICE '   • Performance indexes for fast queries';
    RAISE NOTICE '   • Row Level Security enabled';
    RAISE NOTICE '   • Triggers for auto-updates and calculations';
    RAISE NOTICE '   • Sample data seeded';
    RAISE NOTICE '   • Business logic functions included';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Your ClinicConnect database is ready!';
    RAISE NOTICE '   Next: Create your first admin user and start using the app.';
END $$;