-- ================================================
-- 🏗️ Advanced Stock Management System - SAFE Migration
-- ================================================
-- Version: 1.0.1 - Safe Mode
-- This version safely drops existing tables before recreating them

BEGIN;

-- ================================================
-- SAFETY: Drop existing tables if they exist
-- ================================================

-- Drop in reverse dependency order to avoid foreign key issues
DROP TABLE IF EXISTS stock_audit_logs CASCADE;
DROP TABLE IF EXISTS stock_allocation_rules CASCADE;
DROP TABLE IF EXISTS stock_transfer_orders CASCADE;
DROP TABLE IF EXISTS stock_alerts CASCADE;
DROP TABLE IF EXISTS reorder_recommendations CASCADE;
DROP TABLE IF EXISTS stock_analytics CASCADE;
DROP TABLE IF EXISTS stock_transaction_items CASCADE;
DROP TABLE IF EXISTS stock_transactions CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS stock_serials CASCADE;
DROP TABLE IF EXISTS stock_batches CASCADE;
DROP TABLE IF EXISTS stock_adjustments CASCADE;
DROP TABLE IF EXISTS stock_balances CASCADE;
DROP TABLE IF EXISTS warehouse_locations CASCADE;
DROP TABLE IF EXISTS warehouse_zones CASCADE;
DROP TABLE IF EXISTS warehouses CASCADE;
DROP TABLE IF EXISTS product_stock_config CASCADE;

-- Drop functions if they exist
DROP FUNCTION IF EXISTS update_stock_balance() CASCADE;
DROP FUNCTION IF EXISTS log_stock_movement() CASCADE;
DROP FUNCTION IF EXISTS create_stock_alert() CASCADE;
DROP FUNCTION IF EXISTS calculate_stock_analytics() CASCADE;

-- ================================================
-- EXTENSIONS
-- ================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- ================================================
-- 1. PRODUCT INTEGRATION TABLES
-- ================================================

-- Product stock configuration (links to products from settings)
CREATE TABLE product_stock_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    
    -- Stock control settings
    is_stock_tracked BOOLEAN NOT NULL DEFAULT true,
    use_batches BOOLEAN NOT NULL DEFAULT false,
    use_serials BOOLEAN NOT NULL DEFAULT false,
    use_expiry_dates BOOLEAN NOT NULL DEFAULT true,
    
    -- Reorder settings
    reorder_level DECIMAL(15,3) NOT NULL DEFAULT 0,
    reorder_quantity DECIMAL(15,3) NOT NULL DEFAULT 0,
    max_stock_level DECIMAL(15,3) NOT NULL DEFAULT 999999,
    safety_stock DECIMAL(15,3) NOT NULL DEFAULT 0,
    
    -- Costing method
    costing_method VARCHAR(20) NOT NULL DEFAULT 'FIFO' CHECK (costing_method IN ('FIFO', 'LIFO', 'AVERAGE', 'STANDARD')),
    
    -- Supplier information
    default_supplier_id UUID, -- Can reference suppliers table if exists
    lead_time_days INTEGER DEFAULT 7,
    
    -- Physical properties
    weight_per_unit DECIMAL(12,3),
    volume_per_unit DECIMAL(12,3),
    unit_of_measure VARCHAR(50) DEFAULT 'EACH',
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    
    UNIQUE(product_id)
);

-- ================================================
-- 2. WAREHOUSE STRUCTURE
-- ================================================

-- Main warehouses table
CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'MAIN' CHECK (type IN ('MAIN', 'BRANCH', 'VIRTUAL', 'TRANSIT', 'QUARANTINE')),
    
    -- Location details
    address TEXT,
    city VARCHAR(100),
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) NOT NULL DEFAULT 'Egypt',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    timezone VARCHAR(50) DEFAULT 'Africa/Cairo',
    
    -- Contact information
    phone VARCHAR(50),
    email VARCHAR(255),
    manager_name VARCHAR(255),
    
    -- Operational settings
    is_active BOOLEAN NOT NULL DEFAULT true,
    allow_negative_stock BOOLEAN NOT NULL DEFAULT false,
    auto_allocate BOOLEAN NOT NULL DEFAULT true,
    require_location_tracking BOOLEAN NOT NULL DEFAULT true,
    
    -- Capacity
    max_capacity_weight DECIMAL(15,3),
    max_capacity_volume DECIMAL(15,3),
    
    -- Hierarchy
    parent_warehouse_id UUID REFERENCES warehouses(id),
    
    -- Operating hours (JSON format)
    operating_hours JSONB DEFAULT '{"monday": {"open": "08:00", "close": "17:00"}}',
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Warehouse zones for organization
CREATE TABLE warehouse_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    zone_type VARCHAR(50) NOT NULL DEFAULT 'STORAGE' CHECK (zone_type IN ('RECEIVING', 'STORAGE', 'PICKING', 'SHIPPING', 'QUARANTINE', 'RETURNS', 'STAGING')),
    
    -- Physical properties
    temperature_controlled BOOLEAN DEFAULT false,
    temperature_min DECIMAL(5,2),
    temperature_max DECIMAL(5,2),
    humidity_controlled BOOLEAN DEFAULT false,
    humidity_min DECIMAL(5,2),
    humidity_max DECIMAL(5,2),
    
    -- Organization
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Capacity
    max_capacity_weight DECIMAL(15,3),
    max_capacity_volume DECIMAL(15,3),
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(warehouse_id, code)
);

-- Detailed warehouse locations
CREATE TABLE warehouse_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    zone_id UUID REFERENCES warehouse_zones(id) ON DELETE SET NULL,
    
    -- Location identification
    code VARCHAR(50) NOT NULL, -- A-01-001-A (Aisle-Bay-Level-Position)
    name VARCHAR(255),
    barcode VARCHAR(100) UNIQUE,
    qr_code TEXT,
    
    -- Hierarchy (for multi-level locations)
    parent_location_id UUID REFERENCES warehouse_locations(id),
    level_type VARCHAR(20) DEFAULT 'BIN' CHECK (level_type IN ('AISLE', 'BAY', 'SHELF', 'BIN', 'POSITION')),
    
    -- Physical properties
    location_type VARCHAR(50) NOT NULL DEFAULT 'STORAGE',
    capacity_weight DECIMAL(12,3),
    capacity_volume DECIMAL(12,3),
    
    -- Dimensions
    length_cm DECIMAL(8,2),
    width_cm DECIMAL(8,2),
    height_cm DECIMAL(8,2),
    
    -- Environmental controls
    temperature_controlled BOOLEAN DEFAULT false,
    requires_special_handling BOOLEAN DEFAULT false,
    handling_instructions TEXT,
    
    -- Picking optimization
    pick_sequence INTEGER DEFAULT 0,
    pick_face VARCHAR(10) DEFAULT 'FRONT' CHECK (pick_face IN ('FRONT', 'BACK', 'LEFT', 'RIGHT')),
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_blocked BOOLEAN NOT NULL DEFAULT false,
    block_reason TEXT,
    blocked_at TIMESTAMP WITH TIME ZONE,
    blocked_by UUID REFERENCES users(id),
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    
    UNIQUE(warehouse_id, code)
);

-- ================================================
-- 3. ADVANCED STOCK TRACKING
-- ================================================

-- Main stock balances table with real-time quantities
CREATE TABLE stock_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Product reference (from settings)
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    location_id UUID REFERENCES warehouse_locations(id) ON DELETE SET NULL,
    
    -- Batch and serial tracking
    batch_number VARCHAR(100),
    serial_number VARCHAR(100),
    lot_number VARCHAR(100),
    
    -- Dates
    manufacture_date DATE,
    expiry_date DATE,
    received_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Quantities
    quantity_on_hand DECIMAL(15,3) NOT NULL DEFAULT 0,
    quantity_allocated DECIMAL(15,3) NOT NULL DEFAULT 0,
    quantity_available DECIMAL(15,3) GENERATED ALWAYS AS (quantity_on_hand - quantity_allocated) STORED,
    quantity_on_order DECIMAL(15,3) NOT NULL DEFAULT 0,
    quantity_reserved DECIMAL(15,3) NOT NULL DEFAULT 0,
    
    -- Costing
    unit_cost DECIMAL(15,4) NOT NULL DEFAULT 0,
    total_cost DECIMAL(15,2) GENERATED ALWAYS AS (quantity_on_hand * unit_cost) STORED,
    
    -- Status and quality
    status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'QUARANTINE', 'DAMAGED', 'EXPIRED', 'RECALLED', 'ON_HOLD')),
    quality_status VARCHAR(50) DEFAULT 'GOOD' CHECK (quality_status IN ('GOOD', 'DAMAGED', 'EXPIRED', 'RECALLED', 'QUESTIONABLE')),
    
    -- Physical location details
    bin_location VARCHAR(100),
    zone_location VARCHAR(50),
    
    -- Temperature and environmental tracking
    storage_temperature DECIMAL(5,2),
    storage_humidity DECIMAL(5,2),
    storage_conditions TEXT,
    
    -- Last movement tracking
    last_movement_type VARCHAR(50),
    last_movement_date TIMESTAMP WITH TIME ZONE,
    last_movement_by UUID REFERENCES users(id),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    
    -- Ensure uniqueness for batch/serial combinations
    UNIQUE(product_id, warehouse_id, location_id, batch_number, serial_number)
);

-- Complete audit trail of all stock movements
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- References
    product_id UUID NOT NULL REFERENCES products(id),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    location_id UUID REFERENCES warehouse_locations(id),
    
    -- Movement details
    movement_type VARCHAR(50) NOT NULL CHECK (movement_type IN ('IN', 'OUT', 'TRANSFER', 'ADJUSTMENT', 'RETURN', 'DAMAGE', 'EXPIRY', 'ALLOCATION', 'DEALLOCATION')),
    quantity DECIMAL(15,3) NOT NULL,
    unit_cost DECIMAL(15,4),
    total_cost DECIMAL(15,2),
    
    -- Batch/Serial tracking
    batch_number VARCHAR(100),
    serial_number VARCHAR(100),
    expiry_date DATE,
    
    -- Transaction details
    transaction_type VARCHAR(50), -- PO, SO, ADJ, TRF etc.
    transaction_id VARCHAR(100),
    reference_number VARCHAR(100),
    
    -- Movement context
    reason_code VARCHAR(50),
    reason_description TEXT,
    
    -- Source and destination for transfers
    from_warehouse_id UUID REFERENCES warehouses(id),
    from_location_id UUID REFERENCES warehouse_locations(id),
    to_warehouse_id UUID REFERENCES warehouses(id),
    to_location_id UUID REFERENCES warehouse_locations(id),
    
    -- Timing
    movement_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    scheduled_date TIMESTAMP WITH TIME ZONE,
    
    -- User tracking
    created_by UUID NOT NULL REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED', 'REVERSED')),
    
    -- Additional metadata
    notes TEXT,
    external_reference VARCHAR(255),
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Stock transactions for complex multi-item operations
CREATE TABLE stock_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_number VARCHAR(100) UNIQUE NOT NULL,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('RECEIPT', 'ISSUE', 'TRANSFER', 'ADJUSTMENT', 'RETURN', 'PRODUCTION', 'CONSUMPTION')),
    
    -- References
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    reference_type VARCHAR(50), -- PO, SO, WO, etc.
    reference_id UUID,
    reference_number VARCHAR(100),
    
    -- Status and workflow
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'REVERSED')),
    
    -- Totals
    total_quantity DECIMAL(15,3) NOT NULL DEFAULT 0,
    total_value DECIMAL(15,2) NOT NULL DEFAULT 0,
    line_count INTEGER NOT NULL DEFAULT 0,
    
    -- Dates
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    scheduled_date TIMESTAMP WITH TIME ZONE,
    completed_date TIMESTAMP WITH TIME ZONE,
    
    -- User tracking
    created_by UUID NOT NULL REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    processed_by UUID REFERENCES users(id),
    
    -- Notes
    notes TEXT,
    system_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- Stock transaction line items
CREATE TABLE stock_transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES stock_transactions(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    
    -- Product details
    product_id UUID NOT NULL REFERENCES products(id),
    location_id UUID REFERENCES warehouse_locations(id),
    
    -- Quantities
    quantity DECIMAL(15,3) NOT NULL,
    unit_cost DECIMAL(15,4),
    total_cost DECIMAL(15,2),
    
    -- Batch/Serial
    batch_number VARCHAR(100),
    serial_number VARCHAR(100),
    expiry_date DATE,
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSED', 'CANCELLED')),
    
    -- Notes
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(transaction_id, line_number)
);

-- ================================================
-- 4. ANALYTICS AND INTELLIGENCE
-- ================================================

-- Advanced stock analytics for AI insights
CREATE TABLE stock_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    
    -- Time period
    analysis_date DATE NOT NULL,
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY')),
    
    -- Stock quantities
    opening_stock DECIMAL(15,3) NOT NULL DEFAULT 0,
    closing_stock DECIMAL(15,3) NOT NULL DEFAULT 0,
    average_stock DECIMAL(15,3) NOT NULL DEFAULT 0,
    
    -- Movement quantities
    total_receipts DECIMAL(15,3) NOT NULL DEFAULT 0,
    total_issues DECIMAL(15,3) NOT NULL DEFAULT 0,
    total_adjustments DECIMAL(15,3) NOT NULL DEFAULT 0,
    total_transfers_in DECIMAL(15,3) NOT NULL DEFAULT 0,
    total_transfers_out DECIMAL(15,3) NOT NULL DEFAULT 0,
    
    -- Velocity metrics
    velocity_class VARCHAR(10) CHECK (velocity_class IN ('A', 'B', 'C', 'DEAD')),
    turnover_ratio DECIMAL(10,4),
    days_of_stock INTEGER,
    stock_turns_annual DECIMAL(10,2),
    
    -- Cost metrics
    total_value DECIMAL(15,2),
    average_unit_cost DECIMAL(15,4),
    cost_of_goods_sold DECIMAL(15,2),
    
    -- AI predictions
    forecasted_demand DECIMAL(15,3),
    recommended_reorder_level DECIMAL(15,3),
    stockout_risk_score DECIMAL(3,2) CHECK (stockout_risk_score BETWEEN 0 AND 1),
    overstock_risk_score DECIMAL(3,2) CHECK (overstock_risk_score BETWEEN 0 AND 1),
    
    -- Seasonality
    seasonal_factor DECIMAL(5,2) DEFAULT 1.00,
    trend_factor DECIMAL(5,2) DEFAULT 1.00,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(product_id, warehouse_id, analysis_date, period_type)
);

-- Intelligent reorder recommendations
CREATE TABLE reorder_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    
    -- Current state
    current_stock DECIMAL(15,3) NOT NULL,
    allocated_stock DECIMAL(15,3) NOT NULL DEFAULT 0,
    available_stock DECIMAL(15,3) GENERATED ALWAYS AS (current_stock - allocated_stock) STORED,
    
    -- Reorder calculations
    reorder_level DECIMAL(15,3) NOT NULL,
    recommended_quantity DECIMAL(15,3) NOT NULL,
    max_quantity DECIMAL(15,3),
    
    -- AI-powered calculations
    lead_time_days INTEGER NOT NULL DEFAULT 7,
    safety_stock DECIMAL(15,3) NOT NULL DEFAULT 0,
    economic_order_qty DECIMAL(15,3),
    
    -- Demand forecasting
    avg_daily_demand DECIMAL(15,3),
    forecasted_demand_30d DECIMAL(15,3),
    demand_variance DECIMAL(15,3),
    
    -- Risk assessment
    priority_score DECIMAL(5,2) NOT NULL, -- 0.00 to 99.99
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    stockout_probability DECIMAL(3,2) CHECK (stockout_probability BETWEEN 0 AND 1),
    
    -- Financial impact
    estimated_cost DECIMAL(15,2),
    potential_lost_sales DECIMAL(15,2),
    carrying_cost DECIMAL(15,2),
    
    -- Supplier information
    preferred_supplier_id UUID,
    supplier_lead_time INTEGER,
    supplier_min_order_qty DECIMAL(15,3),
    
    -- Status tracking
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'ORDERED', 'RECEIVED', 'CANCELLED', 'REJECTED')),
    
    -- Workflow
    recommended_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES users(id),
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES users(id),
    
    -- Notes
    system_notes TEXT,
    user_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Simple unique constraint without date function
    UNIQUE(product_id, warehouse_id)
);

-- Stock alerts and notifications
CREATE TABLE stock_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('LOW_STOCK', 'OUT_OF_STOCK', 'OVERSTOCK', 'EXPIRY_WARNING', 'NEGATIVE_STOCK', 'REORDER_POINT', 'QUALITY_ISSUE')),
    severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    
    product_id UUID NOT NULL REFERENCES products(id),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    location_id UUID REFERENCES warehouse_locations(id),
    
    current_quantity DECIMAL(15,3),
    threshold_quantity DECIMAL(15,3),
    batch_number VARCHAR(100),
    expiry_date DATE,
    
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED')),
    
    -- Resolution tracking
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- ================================================
-- 5. INDEXES FOR PERFORMANCE
-- ================================================

-- Primary lookup indexes
CREATE INDEX idx_stock_balances_product_warehouse ON stock_balances(product_id, warehouse_id);
CREATE INDEX idx_stock_balances_location ON stock_balances(location_id) WHERE location_id IS NOT NULL;
CREATE INDEX idx_stock_balances_batch ON stock_balances(batch_number) WHERE batch_number IS NOT NULL;
CREATE INDEX idx_stock_balances_expiry ON stock_balances(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX idx_stock_balances_status ON stock_balances(status);

-- Movement tracking indexes
CREATE INDEX idx_stock_movements_product_date ON stock_movements(product_id, movement_date DESC);
CREATE INDEX idx_stock_movements_warehouse_date ON stock_movements(warehouse_id, movement_date DESC);
CREATE INDEX idx_stock_movements_transaction ON stock_movements(transaction_type, transaction_id);
CREATE INDEX idx_stock_movements_reason ON stock_movements(reason_code);

-- Analytics indexes
CREATE INDEX idx_stock_analytics_product_date ON stock_analytics(product_id, analysis_date DESC);
CREATE INDEX idx_stock_analytics_warehouse_date ON stock_analytics(warehouse_id, analysis_date DESC);
CREATE INDEX idx_stock_analytics_velocity ON stock_analytics(velocity_class, turnover_ratio);

-- Alert indexes
CREATE INDEX idx_stock_alerts_active ON stock_alerts(status, severity, created_at DESC) WHERE status = 'ACTIVE';
CREATE INDEX idx_stock_alerts_product ON stock_alerts(product_id, warehouse_id);

-- Full-text search indexes
CREATE INDEX idx_warehouses_search ON warehouses USING gin(to_tsvector('english', name || ' ' || COALESCE(address, '')));
CREATE INDEX idx_warehouse_locations_search ON warehouse_locations USING gin(to_tsvector('english', name || ' ' || code));

-- ================================================
-- 6. TRIGGERS AND FUNCTIONS
-- ================================================

-- Function to update stock balances
CREATE OR REPLACE FUNCTION update_stock_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the updated_at timestamp
    NEW.updated_at = NOW();
    
    -- Ensure quantity_available is correctly calculated
    NEW.quantity_available = NEW.quantity_on_hand - NEW.quantity_allocated;
    
    -- Validate quantities
    IF NEW.quantity_on_hand < 0 AND NOT EXISTS(
        SELECT 1 FROM warehouses w 
        WHERE w.id = NEW.warehouse_id AND w.allow_negative_stock = true
    ) THEN
        RAISE EXCEPTION 'Negative stock not allowed for warehouse %', NEW.warehouse_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stock_balance
    BEFORE UPDATE ON stock_balances
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_balance();

-- Function to automatically create stock movement records
CREATE OR REPLACE FUNCTION log_stock_movement()
RETURNS TRIGGER AS $$
DECLARE
    movement_qty DECIMAL(15,3);
    movement_type VARCHAR(50);
BEGIN
    -- Only log if quantity_on_hand changed
    IF TG_OP = 'UPDATE' AND OLD.quantity_on_hand = NEW.quantity_on_hand THEN
        RETURN NEW;
    END IF;
    
    -- Calculate movement quantity and type
    IF TG_OP = 'INSERT' THEN
        movement_qty := NEW.quantity_on_hand;
        movement_type := 'IN';
    ELSIF TG_OP = 'UPDATE' THEN
        movement_qty := NEW.quantity_on_hand - OLD.quantity_on_hand;
        movement_type := CASE 
            WHEN movement_qty > 0 THEN 'IN'
            WHEN movement_qty < 0 THEN 'OUT'
            ELSE 'ADJUSTMENT'
        END;
    ELSIF TG_OP = 'DELETE' THEN
        movement_qty := -OLD.quantity_on_hand;
        movement_type := 'OUT';
        NEW := OLD; -- For DELETE triggers
    END IF;
    
    -- Insert movement record
    INSERT INTO stock_movements (
        product_id,
        warehouse_id,
        location_id,
        movement_type,
        quantity,
        unit_cost,
        total_cost,
        batch_number,
        serial_number,
        expiry_date,
        reason_code,
        created_by
    ) VALUES (
        NEW.product_id,
        NEW.warehouse_id,
        NEW.location_id,
        movement_type,
        ABS(movement_qty),
        NEW.unit_cost,
        ABS(movement_qty) * NEW.unit_cost,
        NEW.batch_number,
        NEW.serial_number,
        NEW.expiry_date,
        'AUTO_LOG',
        NEW.updated_by
    );
    
    RETURN CASE TG_OP WHEN 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_stock_movement
    AFTER INSERT OR UPDATE OR DELETE ON stock_balances
    FOR EACH ROW
    EXECUTE FUNCTION log_stock_movement();

-- Function to create stock alerts
CREATE OR REPLACE FUNCTION create_stock_alert()
RETURNS TRIGGER AS $$
DECLARE
    config_rec RECORD;
    alert_title VARCHAR(255);
    alert_message TEXT;
    alert_severity VARCHAR(20);
BEGIN
    -- Get product stock configuration
    SELECT * INTO config_rec
    FROM product_stock_config psc
    WHERE psc.product_id = NEW.product_id;
    
    -- Skip if no configuration found
    IF NOT FOUND THEN
        RETURN NEW;
    END IF;
    
    -- Check for low stock alert
    IF NEW.quantity_available <= config_rec.reorder_level AND NEW.quantity_available > 0 THEN
        alert_title := 'Low Stock Alert';
        alert_message := format('Stock level (%s) is below reorder point (%s)', 
                               NEW.quantity_available, config_rec.reorder_level);
        alert_severity := CASE 
            WHEN NEW.quantity_available <= config_rec.safety_stock THEN 'HIGH'
            ELSE 'MEDIUM'
        END;
        
        INSERT INTO stock_alerts (
            alert_type, severity, product_id, warehouse_id, location_id,
            current_quantity, threshold_quantity, title, message
        ) VALUES (
            'LOW_STOCK', alert_severity, NEW.product_id, NEW.warehouse_id, NEW.location_id,
            NEW.quantity_available, config_rec.reorder_level, alert_title, alert_message
        ) ON CONFLICT DO NOTHING;
    END IF;
    
    -- Check for out of stock alert
    IF NEW.quantity_available <= 0 THEN
        INSERT INTO stock_alerts (
            alert_type, severity, product_id, warehouse_id, location_id,
            current_quantity, threshold_quantity, title, message
        ) VALUES (
            'OUT_OF_STOCK', 'CRITICAL', NEW.product_id, NEW.warehouse_id, NEW.location_id,
            NEW.quantity_available, 0, 'Out of Stock', 'Product is completely out of stock'
        ) ON CONFLICT DO NOTHING;
    END IF;
    
    -- Check for expiry alerts (if expiry date is tracked)
    IF NEW.expiry_date IS NOT NULL THEN
        -- Alert for items expiring within 30 days
        IF NEW.expiry_date <= CURRENT_DATE + INTERVAL '30 days' AND NEW.expiry_date > CURRENT_DATE THEN
            INSERT INTO stock_alerts (
                alert_type, severity, product_id, warehouse_id, location_id,
                current_quantity, expiry_date, title, message
            ) VALUES (
                'EXPIRY_WARNING', 'MEDIUM', NEW.product_id, NEW.warehouse_id, NEW.location_id,
                NEW.quantity_available, NEW.expiry_date, 
                'Expiry Warning', 
                format('Product expires on %s', NEW.expiry_date)
            ) ON CONFLICT DO NOTHING;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_stock_alert
    AFTER INSERT OR UPDATE ON stock_balances
    FOR EACH ROW
    EXECUTE FUNCTION create_stock_alert();

-- ================================================
-- 7. SAMPLE DATA (OPTIONAL - REMOVE IN PRODUCTION)
-- ================================================

-- Insert sample warehouse
INSERT INTO warehouses (code, name, address, city, manager_name) 
VALUES ('WH-MAIN', 'Main Warehouse', 'Cairo Industrial Zone', 'Cairo', 'Ahmed Mohamed')
ON CONFLICT (code) DO NOTHING;

-- Insert sample zones
INSERT INTO warehouse_zones (warehouse_id, code, name, zone_type) 
SELECT w.id, 'A', 'Zone A - General Storage', 'STORAGE'
FROM warehouses w WHERE w.code = 'WH-MAIN'
ON CONFLICT (warehouse_id, code) DO NOTHING;

-- Insert sample locations
INSERT INTO warehouse_locations (warehouse_id, zone_id, code, name) 
SELECT w.id, z.id, 'A-01-001', 'Aisle A - Bay 01 - Level 001'
FROM warehouses w 
JOIN warehouse_zones z ON z.warehouse_id = w.id
WHERE w.code = 'WH-MAIN' AND z.code = 'A'
ON CONFLICT (warehouse_id, code) DO NOTHING;

COMMIT;

-- ================================================
-- SUCCESS MESSAGE
-- ================================================
DO $$ 
BEGIN 
    RAISE NOTICE 'Stock Management System installed successfully!';
    RAISE NOTICE 'Tables created: %, %, %, %, %', 
        'product_stock_config', 'warehouses', 'warehouse_zones', 
        'warehouse_locations', 'stock_balances';
END $$;