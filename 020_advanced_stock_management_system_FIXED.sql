-- ================================================
-- 🏗️ Advanced Stock Management System - Database Schema (FIXED)
-- ================================================
-- Version: 1.0.1 - Fixed IMMUTABLE function error
-- Created: 2025-01-10
-- Purpose: Complete warehouse management system with multi-location support

BEGIN;

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
    
    -- Location hierarchy
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    location_id UUID REFERENCES warehouse_locations(id) ON DELETE SET NULL,
    
    -- Batch/Lot tracking
    batch_number VARCHAR(100),
    lot_number VARCHAR(100),
    expiry_date DATE,
    manufacturing_date DATE,
    
    -- Serial tracking (for serialized items)
    serial_number VARCHAR(100),
    
    -- Quantities (high precision for pharmaceuticals)
    quantity_on_hand DECIMAL(15,3) NOT NULL DEFAULT 0,
    quantity_allocated DECIMAL(15,3) NOT NULL DEFAULT 0,
    quantity_available DECIMAL(15,3) GENERATED ALWAYS AS (quantity_on_hand - quantity_allocated) STORED,
    quantity_in_transit DECIMAL(15,3) NOT NULL DEFAULT 0,
    quantity_on_order DECIMAL(15,3) NOT NULL DEFAULT 0,
    
    -- Cost tracking
    unit_cost DECIMAL(15,4) NOT NULL DEFAULT 0,
    total_cost DECIMAL(15,2) GENERATED ALWAYS AS (quantity_on_hand * unit_cost) STORED,
    last_cost DECIMAL(15,4),
    average_cost DECIMAL(15,4),
    
    -- Quality status
    status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'HOLD', 'QUARANTINE', 'DAMAGED', 'EXPIRED', 'RECALLED')),
    quality_status VARCHAR(50) DEFAULT 'PASSED' CHECK (quality_status IN ('PASSED', 'FAILED', 'PENDING', 'REJECTED')),
    
    -- Additional tracking
    supplier_id UUID, -- Reference to supplier if available
    purchase_order_number VARCHAR(100),
    
    -- Environmental tracking
    storage_temperature DECIMAL(5,2),
    storage_humidity DECIMAL(5,2),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    last_movement_at TIMESTAMP WITH TIME ZONE,
    
    -- Ensure uniqueness for batch/serial combinations
    UNIQUE(product_id, warehouse_id, location_id, batch_number, serial_number)
);

-- Complete audit trail of all stock movements
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Movement identification
    movement_number VARCHAR(100) UNIQUE,
    
    -- Transaction reference
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('IN', 'OUT', 'TRANSFER', 'ADJUSTMENT', 'CYCLE_COUNT', 'ALLOCATION', 'DEALLOCATION')),
    transaction_id UUID,
    document_number VARCHAR(100),
    reference_number VARCHAR(100),
    
    -- Product and location details
    product_id UUID NOT NULL REFERENCES products(id),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    location_id UUID REFERENCES warehouse_locations(id),
    
    -- Batch/Serial info
    batch_number VARCHAR(100),
    serial_number VARCHAR(100),
    expiry_date DATE,
    
    -- Movement quantities and balances
    quantity_before DECIMAL(15,3) NOT NULL,
    quantity_moved DECIMAL(15,3) NOT NULL, -- +ve for IN, -ve for OUT
    quantity_after DECIMAL(15,3) NOT NULL,
    
    -- Cost information
    unit_cost DECIMAL(15,4),
    total_cost DECIMAL(15,2) GENERATED ALWAYS AS (ABS(quantity_moved) * COALESCE(unit_cost, 0)) STORED,
    
    -- Transfer details (if applicable)
    from_warehouse_id UUID REFERENCES warehouses(id),
    from_location_id UUID REFERENCES warehouse_locations(id),
    to_warehouse_id UUID REFERENCES warehouses(id),
    to_location_id UUID REFERENCES warehouse_locations(id),
    
    -- Reason and classification
    reason_code VARCHAR(50) NOT NULL CHECK (reason_code IN ('SALE', 'PURCHASE', 'TRANSFER', 'ADJUSTMENT', 'DAMAGE', 'EXPIRED', 'RETURN', 'ALLOCATION', 'PRODUCTION', 'CYCLE_COUNT')),
    sub_reason VARCHAR(100),
    notes TEXT,
    
    -- Quality information
    quality_status VARCHAR(50) DEFAULT 'PASSED',
    inspector_id UUID REFERENCES users(id),
    inspection_date TIMESTAMP WITH TIME ZONE,
    
    -- Audit trail
    movement_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    
    -- Approval workflow
    requires_approval BOOLEAN NOT NULL DEFAULT false,
    approval_status VARCHAR(20) DEFAULT 'APPROVED' CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    
    -- Additional metadata
    source_system VARCHAR(50) DEFAULT 'WMS',
    external_reference VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Stock transactions for complex multi-item operations
CREATE TABLE stock_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    transaction_number VARCHAR(100) UNIQUE NOT NULL,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('RECEIPT', 'ISSUE', 'TRANSFER', 'ADJUSTMENT', 'CYCLE_COUNT', 'ALLOCATION', 'PRODUCTION')),
    
    -- Status workflow
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED')),
    
    -- References
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    reference_type VARCHAR(50),
    reference_id UUID,
    external_reference VARCHAR(100),
    
    -- Totals
    total_items INTEGER NOT NULL DEFAULT 0,
    total_quantity DECIMAL(15,3) NOT NULL DEFAULT 0,
    total_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
    
    -- Dates
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_date DATE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Priority and urgency
    priority VARCHAR(10) DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    
    -- Notes and attachments
    description TEXT,
    notes TEXT,
    attachments JSONB DEFAULT '[]',
    
    -- Workflow tracking
    created_by UUID NOT NULL REFERENCES users(id),
    submitted_by UUID REFERENCES users(id),
    submitted_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    executed_by UUID REFERENCES users(id),
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- Stock transaction line items
CREATE TABLE stock_transaction_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES stock_transactions(id) ON DELETE CASCADE,
    
    line_number INTEGER NOT NULL,
    product_id UUID NOT NULL REFERENCES products(id),
    
    -- Location details
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    location_id UUID REFERENCES warehouse_locations(id),
    
    -- Batch/serial information
    batch_number VARCHAR(100),
    serial_number VARCHAR(100),
    expiry_date DATE,
    
    -- Quantities
    requested_quantity DECIMAL(15,3) NOT NULL,
    processed_quantity DECIMAL(15,3) NOT NULL DEFAULT 0,
    remaining_quantity DECIMAL(15,3) GENERATED ALWAYS AS (requested_quantity - processed_quantity) STORED,
    
    -- Cost information
    unit_cost DECIMAL(15,4),
    total_cost DECIMAL(15,2) GENERATED ALWAYS AS (processed_quantity * COALESCE(unit_cost, 0)) STORED,
    
    -- Status
    line_status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (line_status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'SHORT')),
    
    -- Transfer details (if applicable)
    from_location_id UUID REFERENCES warehouse_locations(id),
    to_location_id UUID REFERENCES warehouse_locations(id),
    
    -- Quality control
    requires_inspection BOOLEAN DEFAULT false,
    inspection_status VARCHAR(50) DEFAULT 'PASSED',
    inspector_notes TEXT,
    
    -- Notes
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(transaction_id, line_number)
);

-- ================================================
-- 4. ANALYTICS AND INTELLIGENCE
-- ================================================

-- Stock analytics for business intelligence
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
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Note: Removed problematic daily index - can be added later with a simpler approach if needed
-- CREATE UNIQUE INDEX idx_reorder_recommendations_daily 
-- ON reorder_recommendations(product_id, warehouse_id, (recommended_at::DATE));

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
-- 5. INDEXES FOR PERFORMANCE (FIXED)
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

-- Simple text search indexes (FIXED - removed complex functions)
CREATE INDEX idx_warehouses_name_search ON warehouses(name);
CREATE INDEX idx_warehouses_code_search ON warehouses(code);
CREATE INDEX idx_warehouse_locations_name_search ON warehouse_locations(name);
CREATE INDEX idx_warehouse_locations_code_search ON warehouse_locations(code);

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
    movement_type VARCHAR(50);
    qty_moved DECIMAL(15,3);
BEGIN
    -- Determine movement type and quantity
    IF TG_OP = 'INSERT' THEN
        movement_type = 'IN';
        qty_moved = NEW.quantity_on_hand;
    ELSIF TG_OP = 'UPDATE' THEN
        qty_moved = NEW.quantity_on_hand - OLD.quantity_on_hand;
        IF qty_moved > 0 THEN
            movement_type = 'IN';
        ELSIF qty_moved < 0 THEN
            movement_type = 'OUT';
        ELSE
            -- No quantity change, skip logging
            RETURN NEW;
        END IF;
    ELSE
        -- DELETE
        movement_type = 'OUT';
        qty_moved = -OLD.quantity_on_hand;
    END IF;
    
    -- Insert movement record
    INSERT INTO stock_movements (
        transaction_type,
        product_id,
        warehouse_id,
        location_id,
        batch_number,
        serial_number,
        expiry_date,
        quantity_before,
        quantity_moved,
        quantity_after,
        unit_cost,
        reason_code,
        created_by,
        movement_date
    ) VALUES (
        movement_type,
        COALESCE(NEW.product_id, OLD.product_id),
        COALESCE(NEW.warehouse_id, OLD.warehouse_id),
        COALESCE(NEW.location_id, OLD.location_id),
        COALESCE(NEW.batch_number, OLD.batch_number),
        COALESCE(NEW.serial_number, OLD.serial_number),
        COALESCE(NEW.expiry_date, OLD.expiry_date),
        COALESCE(OLD.quantity_on_hand, 0),
        qty_moved,
        COALESCE(NEW.quantity_on_hand, 0),
        COALESCE(NEW.unit_cost, OLD.unit_cost),
        'ADJUSTMENT', -- Default reason, can be overridden
        COALESCE(NEW.created_by, OLD.created_by, (SELECT id FROM users LIMIT 1)),
        NOW()
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_stock_movement
    AFTER INSERT OR UPDATE OR DELETE ON stock_balances
    FOR EACH ROW
    EXECUTE FUNCTION log_stock_movement();

-- Function to generate automatic alerts
CREATE OR REPLACE FUNCTION check_stock_alerts()
RETURNS TRIGGER AS $$
DECLARE
    config_rec RECORD;
    alert_exists BOOLEAN;
BEGIN
    -- Get product configuration
    SELECT * INTO config_rec
    FROM product_stock_config psc
    WHERE psc.product_id = NEW.product_id;
    
    -- Check for low stock alert
    IF config_rec.reorder_level > 0 AND NEW.quantity_available <= config_rec.reorder_level THEN
        -- Check if alert already exists
        SELECT EXISTS(
            SELECT 1 FROM stock_alerts
            WHERE product_id = NEW.product_id
            AND warehouse_id = NEW.warehouse_id
            AND alert_type = 'LOW_STOCK'
            AND status = 'ACTIVE'
        ) INTO alert_exists;
        
        -- Create alert if it doesn't exist
        IF NOT alert_exists THEN
            INSERT INTO stock_alerts (
                alert_type,
                severity,
                product_id,
                warehouse_id,
                location_id,
                current_quantity,
                threshold_quantity,
                title,
                message
            ) VALUES (
                'LOW_STOCK',
                CASE 
                    WHEN NEW.quantity_available <= 0 THEN 'CRITICAL'
                    WHEN NEW.quantity_available <= config_rec.reorder_level * 0.5 THEN 'HIGH'
                    ELSE 'MEDIUM'
                END,
                NEW.product_id,
                NEW.warehouse_id,
                NEW.location_id,
                NEW.quantity_available,
                config_rec.reorder_level,
                'مخزون منخفض',
                format('المخزون المتاح للمنتج %s أصبح %s وحدة، وهو أقل من الحد الأدنى %s',
                    (SELECT name FROM products WHERE id = NEW.product_id),
                    NEW.quantity_available,
                    config_rec.reorder_level
                )
            );
        END IF;
    END IF;
    
    -- Check for expiry alerts (if expiry date tracking is enabled)
    IF config_rec.use_expiry_dates AND NEW.expiry_date IS NOT NULL 
    AND NEW.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN
        
        SELECT EXISTS(
            SELECT 1 FROM stock_alerts
            WHERE product_id = NEW.product_id
            AND warehouse_id = NEW.warehouse_id
            AND batch_number = NEW.batch_number
            AND alert_type = 'EXPIRY_WARNING'
            AND status = 'ACTIVE'
        ) INTO alert_exists;
        
        IF NOT alert_exists THEN
            INSERT INTO stock_alerts (
                alert_type,
                severity,
                product_id,
                warehouse_id,
                location_id,
                current_quantity,
                batch_number,
                expiry_date,
                title,
                message
            ) VALUES (
                'EXPIRY_WARNING',
                CASE 
                    WHEN NEW.expiry_date <= CURRENT_DATE THEN 'CRITICAL'
                    WHEN NEW.expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'HIGH'
                    ELSE 'MEDIUM'
                END,
                NEW.product_id,
                NEW.warehouse_id,
                NEW.location_id,
                NEW.quantity_on_hand,
                NEW.batch_number,
                NEW.expiry_date,
                'تحذير انتهاء صلاحية',
                format('المنتج %s (الدفعة: %s) سينتهي في %s',
                    (SELECT name FROM products WHERE id = NEW.product_id),
                    COALESCE(NEW.batch_number, 'غير محدد'),
                    NEW.expiry_date
                )
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_stock_alerts
    AFTER INSERT OR UPDATE ON stock_balances
    FOR EACH ROW
    EXECUTE FUNCTION check_stock_alerts();

-- ================================================
-- 7. VIEWS FOR REPORTING (Will be created later)
-- ================================================

-- Views will be created after confirming table structure
-- To avoid column reference issues during initial setup

-- ================================================
-- 8. SAMPLE DATA FOR TESTING
-- ================================================

-- Insert default main warehouse
INSERT INTO warehouses (id, code, name, type, address, city, country, is_active) 
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'MAIN001',
    'المستودع الرئيسي',
    'MAIN',
    'شارع المصانع، المنطقة الصناعية',
    'القاهرة',
    'Egypt',
    true
) ON CONFLICT (code) DO NOTHING;

-- Insert sample zones
INSERT INTO warehouse_zones (warehouse_id, code, name, zone_type) VALUES
('00000000-0000-0000-0000-000000000001'::uuid, 'RCV', 'منطقة الاستلام', 'RECEIVING'),
('00000000-0000-0000-0000-000000000001'::uuid, 'STG', 'منطقة التخزين', 'STORAGE'),
('00000000-0000-0000-0000-000000000001'::uuid, 'PCK', 'منطقة التجهيز', 'PICKING'),
('00000000-0000-0000-0000-000000000001'::uuid, 'SHP', 'منطقة الشحن', 'SHIPPING')
ON CONFLICT (warehouse_id, code) DO NOTHING;

-- Insert sample locations
INSERT INTO warehouse_locations (warehouse_id, zone_id, code, name, location_type) 
SELECT 
    '00000000-0000-0000-0000-000000000001'::uuid,
    wz.id,
    'A-01-001',
    'الموقع الافتراضي',
    'STORAGE'
FROM warehouse_zones wz 
WHERE wz.code = 'STG' AND wz.warehouse_id = '00000000-0000-0000-0000-000000000001'::uuid
ON CONFLICT (warehouse_id, code) DO NOTHING;

COMMIT;

-- ================================================
-- SUCCESS MESSAGE
-- ================================================
SELECT 'Advanced Stock Management System created successfully! ✅🏗️' as result;