-- ================================================
-- 🏗️ Foundation Tables for Stock Management System
-- ================================================
-- Version: 1.0.0
-- Purpose: Create basic required tables before stock system

BEGIN;

-- ================================================
-- EXTENSIONS
-- ================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- ================================================
-- USERS TABLE (if not exists)
-- ================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash TEXT,
    role VARCHAR(50) DEFAULT 'USER',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default admin user if not exists
INSERT INTO users (id, email, name, role) 
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'admin@epgroup.com',
    'System Admin',
    'ADMIN'
) ON CONFLICT (email) DO NOTHING;

-- ================================================
-- PRODUCT CATEGORIES
-- ================================================
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    description TEXT,
    parent_id UUID REFERENCES product_categories(id),
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default category
INSERT INTO product_categories (id, name, name_en) 
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'منتجات عامة',
    'General Products'
) ON CONFLICT (id) DO NOTHING;

-- ================================================
-- MAIN PRODUCTS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    
    -- Product identification
    code VARCHAR(100) UNIQUE,
    barcode VARCHAR(100) UNIQUE,
    sku VARCHAR(100) UNIQUE,
    
    -- Classification
    category_id UUID REFERENCES product_categories(id),
    line VARCHAR(255),
    brand VARCHAR(255),
    
    -- Basic info
    description TEXT,
    short_description VARCHAR(500),
    
    -- Pricing (Egyptian Pounds)
    price DECIMAL(15,2) NOT NULL DEFAULT 0,
    cost_price DECIMAL(15,2) DEFAULT 0,
    wholesale_price DECIMAL(15,2) DEFAULT 0,
    
    -- Stock (basic tracking)
    stock INTEGER NOT NULL DEFAULT 0,
    min_stock_level INTEGER DEFAULT 10,
    max_stock_level INTEGER DEFAULT 1000,
    
    -- Physical properties
    weight DECIMAL(10,3) DEFAULT 0, -- kg
    dimensions VARCHAR(50), -- "L x W x H cm"
    
    -- Status and settings
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    is_trackable BOOLEAN DEFAULT true,
    
    -- SEO and display
    slug VARCHAR(255) UNIQUE,
    image_url TEXT,
    gallery_images JSONB DEFAULT '[]',
    
    -- Metadata
    tags JSONB DEFAULT '[]',
    attributes JSONB DEFAULT '{}',
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    
    -- Versioning
    version INTEGER DEFAULT 1,
    
    -- Constraints
    CONSTRAINT products_price_positive CHECK (price >= 0),
    CONSTRAINT products_stock_non_negative CHECK (stock >= 0),
    CONSTRAINT products_min_stock_positive CHECK (min_stock_level >= 0)
);

-- ================================================
-- CLINICS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS clinics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    
    -- Contact information
    address TEXT,
    city VARCHAR(100),
    governorate VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(255),
    
    -- Manager info
    manager_name VARCHAR(255),
    manager_phone VARCHAR(20),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    
    -- Versioning
    version INTEGER DEFAULT 1
);

-- Insert default clinic
INSERT INTO clinics (id, name, code) 
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'العيادة الرئيسية',
    'MAIN001'
) ON CONFLICT (code) DO NOTHING;

-- ================================================
-- ORDERS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(100) UNIQUE NOT NULL,
    
    -- Customer/Clinic info
    clinic_id UUID REFERENCES clinics(id),
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    customer_email VARCHAR(255),
    
    -- Order details
    order_date DATE DEFAULT CURRENT_DATE,
    delivery_date DATE,
    
    -- Status
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED')),
    payment_status VARCHAR(50) DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'PARTIAL', 'REFUNDED')),
    
    -- Financial
    subtotal DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    
    -- Shipping
    shipping_address TEXT,
    shipping_cost DECIMAL(15,2) DEFAULT 0,
    
    -- Notes
    notes TEXT,
    internal_notes TEXT,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    
    -- Versioning
    version INTEGER DEFAULT 1
);

-- ================================================
-- ORDER ITEMS
-- ================================================
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    
    -- Quantities
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    
    -- Pricing (at time of order)
    unit_price DECIMAL(15,2) NOT NULL,
    total_price DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    
    -- Product snapshot (at time of order)
    product_name VARCHAR(255) NOT NULL,
    product_code VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- VISITS TABLE (for clinic tracking)
-- ================================================
CREATE TABLE IF NOT EXISTS visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id),
    
    -- Visit details
    visit_date DATE DEFAULT CURRENT_DATE,
    visit_time TIME DEFAULT CURRENT_TIME,
    
    -- Patient info (basic)
    patient_name VARCHAR(255),
    patient_phone VARCHAR(20),
    patient_age INTEGER,
    
    -- Visit info
    visit_type VARCHAR(50) DEFAULT 'CONSULTATION',
    status VARCHAR(50) DEFAULT 'SCHEDULED',
    
    -- Notes
    notes TEXT,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    
    -- Versioning
    version INTEGER DEFAULT 1
);

-- ================================================
-- INDEXES FOR PERFORMANCE
-- ================================================

-- Products
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);

-- Orders
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_clinic ON orders(clinic_id);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Order Items
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- Clinics
CREATE INDEX IF NOT EXISTS idx_clinics_code ON clinics(code);
CREATE INDEX IF NOT EXISTS idx_clinics_active ON clinics(is_active) WHERE is_active = true;

-- ================================================
-- SAMPLE DATA
-- ================================================

-- Sample products
INSERT INTO products (name, name_en, code, price, stock, min_stock_level, category_id) VALUES
('دواء مسكن للألم', 'Pain Relief Medicine', 'MED001', 25.00, 100, 20, '00000000-0000-0000-0000-000000000001'::uuid),
('فيتامينات متعددة', 'Multi Vitamins', 'VIT001', 45.00, 75, 15, '00000000-0000-0000-0000-000000000001'::uuid),
('كريم مرطب', 'Moisturizing Cream', 'CRM001', 35.00, 50, 10, '00000000-0000-0000-0000-000000000001'::uuid)
ON CONFLICT (code) DO NOTHING;

COMMIT;

-- ================================================
-- SUCCESS MESSAGE
-- ================================================
SELECT 'Foundation tables created successfully! ✅' as result;