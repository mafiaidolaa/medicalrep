# Site Customization Feature Setup

This guide will help you set up the site customization feature that allows users to change logos, site title, favicon, and loading icons through the admin panel.

## 🚀 Features Added

- **Dynamic Site Title**: Change the site name from the admin panel
- **Logo Management**: Upload and change the main logo
- **Favicon Management**: Upload custom favicon for browser tabs
- **Loading Icon**: Customize the loading screen icon
- **Color Customization**: Set primary and secondary colors
- **Company Information**: Manage contact details and company info
- **SEO Meta Tags**: Control meta keywords, description, and author

## 📋 Setup Instructions

### 1. Database Setup

Run the SQL script to create the necessary tables:

```bash
# Execute the database schema
mysql -u your_username -p your_database_name < create_site_settings_table.sql
```

Or manually run the SQL commands in `create_site_settings_table.sql`

### 2. Database Configuration

Update the database credentials in `api/site-settings.php`:

```php
// Line 12-15 in api/site-settings.php
$servername = "localhost";        // Your DB host
$username = "your_db_username";   // Your DB username
$password = "your_db_password";   // Your DB password
$dbname = "your_database_name";   // Your DB name
```

### 3. File Permissions

Ensure the upload directory has proper permissions:

```bash
# Make sure uploads directory is writable
chmod -R 755 public/uploads
mkdir -p public/uploads/site
chmod -R 755 public/uploads/site
```

### 4. Start the Development Server

```bash
# For Next.js development
npm run dev

# Make sure your PHP server is also running for the API endpoints
# If using XAMPP, WAMP, or similar, ensure Apache/PHP is running
```

## 🎛️ How to Use

### Accessing Site Customization

1. Login to the admin panel
2. Navigate to **Settings** → **تخصيص الموقع** (Site Customization)
3. The new tab will be visible in the settings page

### Available Options

#### Basic Information
- **Site Title**: Changes the main site name
- **Site Description**: Updates meta description
- **Meta Keywords**: SEO keywords
- **Meta Author**: Author/company name

#### Logo & Icons
- **Main Logo**: Upload PNG, JPG, SVG (max 5MB)
- **Favicon**: Upload ICO, PNG for browser tab icon
- **Loading Icon**: Custom loading screen icon

#### Colors
- **Primary Color**: Main theme color
- **Secondary Color**: Accent color
- Real-time color preview

#### Company Information
- Phone number
- Email address
- Physical address
- Website URL

### File Upload Guidelines

- **Supported formats**: PNG, JPG, SVG, GIF, ICO
- **Maximum file size**: 5MB for logos, 2MB for loading icons
- **Recommended favicon size**: 32x32 pixels
- Files are stored in `public/uploads/site/`

## 🔧 Technical Implementation

### Frontend Components

- **`SiteCustomization.tsx`**: Main admin interface component
- **`SiteSettingsProvider`**: Context provider for site settings
- **Updated layout components**: Use dynamic settings

### Backend API

- **`api/site-settings.php`**: PHP API for database operations
- **Database tables**: `site_settings` and `uploaded_files`

### Database Schema

```sql
-- Main settings table (single row, ID = 1)
site_settings:
- site_title, site_description
- logo_path, favicon_path, loading_icon_path
- primary_color, secondary_color
- meta_keywords, meta_author
- company information
- system settings

-- File tracking table
uploaded_files:
- file metadata and paths
- upload type categorization
- audit trail for uploads
```

## 🔄 Dynamic Updates

The system automatically updates:
- **Page title** in browser tab
- **Favicon** in browser tab
- **Logo** in navigation and loading screen
- **Loading screen** text and icon
- **Meta tags** for SEO
- **CSS color variables** for theming

## 🎯 Default Values

If no custom settings are saved, the system uses these defaults:

- **Site Title**: "EP Group System"
- **Logo**: `/logo.svg`
- **Favicon**: `/favicon.ico`
- **Primary Color**: `#0066cc`
- **Secondary Color**: `#6c757d`

## 🛡️ Security Features

- **File type validation**: Only images allowed
- **File size limits**: Prevents oversized uploads
- **Database parameter binding**: SQL injection prevention
- **Directory traversal protection**: Secure file paths
- **CORS headers**: Proper API access control

## 🎨 Styling Integration

The system sets CSS custom properties that can be used throughout your app:

```css
/* These are automatically set by the site settings */
:root {
  --site-primary-color: #0066cc;    /* From database */
  --site-secondary-color: #6c757d;  /* From database */
}

/* Use in your CSS */
.my-component {
  background-color: var(--site-primary-color);
}
```

## 🐛 Troubleshooting

### Common Issues

1. **Upload fails**: Check file permissions on `public/uploads/site/`
2. **Database connection error**: Verify credentials in `api/site-settings.php`
3. **Settings not loading**: Ensure PHP server is running
4. **Images not displaying**: Check upload directory and file paths

### Debug Mode

Enable error reporting in PHP for debugging:

```php
// Add to top of api/site-settings.php for debugging
ini_set('display_errors', 1);
error_reporting(E_ALL);
```

## 📁 File Structure

```
├── api/
│   └── site-settings.php          # PHP API endpoint
├── src/
│   ├── components/settings/
│   │   └── site-customization.tsx # Admin interface
│   ├── contexts/
│   │   └── site-settings-context.tsx # React context
│   └── app/
│       └── api/site-settings/
│           └── route.ts            # Next.js API (alternative)
├── public/
│   └── uploads/site/              # Upload directory
└── create_site_settings_table.sql # Database schema
```

## ✅ Verification

After setup, verify the feature works by:

1. Accessing the settings page
2. Uploading a test logo
3. Changing the site title
4. Saving settings
5. Checking if changes appear site-wide
6. Verifying the favicon changes in browser tab

The feature is now ready for use! 🎉