-- Site Settings Table for Logo, Title, Favicon, and Loading Icon Management
-- This table stores customizable site settings that can be managed from the admin panel

-- Create site_settings table
CREATE TABLE IF NOT EXISTS site_settings (
    id BIGINT PRIMARY KEY DEFAULT 1, -- Single row table using ID = 1
    site_title VARCHAR(255) DEFAULT 'EP Group System',
    site_description TEXT DEFAULT 'نظام إدارة متطور للشركات والمؤسسات',
    logo_path VARCHAR(500) DEFAULT '/logo.svg',
    favicon_path VARCHAR(500) DEFAULT '/favicon.ico',
    loading_icon_path VARCHAR(500) DEFAULT '/logo.svg',
    
    -- Additional customization options
    primary_color VARCHAR(7) DEFAULT '#0066cc',
    secondary_color VARCHAR(7) DEFAULT '#6c757d',
    
    -- SEO Meta tags
    meta_keywords TEXT DEFAULT 'EP Group, نظام إدارة, إدارة العيادات, إدارة المستودعات',
    meta_author VARCHAR(255) DEFAULT 'EP Group',
    
    -- Contact information
    company_phone VARCHAR(50) DEFAULT '+966123456789',
    company_email VARCHAR(255) DEFAULT 'info@epgroup.com',
    company_address TEXT DEFAULT 'الرياض، المملكة العربية السعودية',
    company_website VARCHAR(255) DEFAULT 'https://www.epgroup.com',
    
    -- System settings
    system_version VARCHAR(50) DEFAULT 'v2.1.0',
    system_language VARCHAR(10) DEFAULT 'ar',
    rtl_support BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by BIGINT DEFAULT NULL,
    
    -- Constraints
    CONSTRAINT chk_single_row CHECK (id = 1)
);

-- Insert default values (only one row allowed)
INSERT IGNORE INTO site_settings (
    id, 
    site_title, 
    site_description,
    logo_path, 
    favicon_path,
    loading_icon_path
) VALUES (
    1,
    'EP Group System', 
    'نظام إدارة متطور للشركات والمؤسسات',
    '/logo.svg', 
    '/favicon.ico',
    '/logo.svg'
);

-- Create uploads directory table to track uploaded files
CREATE TABLE IF NOT EXISTS uploaded_files (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_by BIGINT DEFAULT NULL,
    upload_type ENUM('logo', 'favicon', 'loading_icon', 'other') DEFAULT 'other',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_upload_type (upload_type),
    INDEX idx_uploaded_by (uploaded_by),
    INDEX idx_created_at (created_at)
);

-- Create trigger to automatically update the updated_at timestamp
DELIMITER $$
CREATE TRIGGER update_site_settings_timestamp
    BEFORE UPDATE ON site_settings
    FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END$$
DELIMITER ;

-- Example queries to use the settings:
-- SELECT * FROM site_settings WHERE id = 1;
-- UPDATE site_settings SET site_title = 'New Title', logo_path = '/new-logo.svg' WHERE id = 1;