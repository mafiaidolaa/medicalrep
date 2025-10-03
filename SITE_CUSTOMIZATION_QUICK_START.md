# 🚀 Site Customization - Quick Start Guide

This feature allows you to customize your site's logo, title, favicon, and loading icons through the admin panel **without needing a database setup**!

## ✅ What's Already Working

The site customization feature is now **ready to use** with these components:

- ✅ **Dynamic Site Title**: Change from admin panel
- ✅ **Logo Management**: Upload and change logos  
- ✅ **Favicon Management**: Custom browser tab icons
- ✅ **Loading Icon**: Custom loading screen
- ✅ **Color Customization**: Primary/secondary colors
- ✅ **Company Information**: Contact details
- ✅ **No Database Required**: Uses JSON file storage

## 🎯 How to Access

1. **Start your development server** (if not already running):
   ```bash
   npm run dev
   ```

2. **Navigate to Settings**:
   - Login to your admin panel
   - Go to **Settings** page
   - Click on **"تخصيص الموقع"** (Site Customization) tab

3. **Start customizing**:
   - Upload your logo, favicon, loading icon
   - Change site title and description
   - Pick your brand colors
   - Save settings

## 📁 How It Works

### File-Based Storage
Instead of a database, the system uses:
- `data/site-settings.json` - Stores all your settings
- `data/uploaded-files.json` - Tracks uploaded files
- `public/uploads/site/` - Where uploaded images are saved

These files are automatically created when you first save settings.

### Immediate Updates
Changes apply instantly across:
- 🌐 **Browser tab title** and favicon
- 🖼️ **Logo** in navigation and loading screen  
- 🎨 **Colors** throughout the interface
- 📄 **Meta tags** for SEO

## 🎛️ Available Customizations

### Basic Information
- **Site Title**: "EP Group System" → Your company name
- **Description**: Meta description for SEO
- **Keywords**: SEO keywords
- **Author**: Your name/company

### Visual Identity  
- **Main Logo**: Navigation and branding (PNG, JPG, SVG up to 5MB)
- **Favicon**: Browser tab icon (ICO, PNG - 32x32 recommended)
- **Loading Icon**: Shown during page loads
- **Colors**: Primary and secondary brand colors

### Company Details
- Phone number
- Email address  
- Physical address
- Website URL

## 🔄 Default Settings

If you haven't customized anything yet, the system uses:
- **Title**: "EP Group System"
- **Logo**: `/logo.svg`
- **Favicon**: `/favicon.ico`  
- **Colors**: Blue (#0066cc) and Gray (#6c757d)

## 🛠️ File Upload Guidelines

- **Supported**: PNG, JPG, SVG, GIF, ICO
- **Size limits**: 5MB for logos, 2MB for loading icons
- **Best practices**:
  - Logo: Square or wide format, transparent background
  - Favicon: 32x32 pixels, simple design
  - Loading icon: Simple, recognizable shape

## 🎨 Color Integration

The system automatically sets CSS variables you can use:
```css
:root {
  --site-primary-color: #your-color;
  --site-secondary-color: #your-color;
}
```

## ⚡ Quick Test

1. Go to Settings → Site Customization
2. Change the "Site Title" to "My Company"
3. Click "Save Settings"  
4. Check your browser tab - it should show "My Company"!

## 🐛 Troubleshooting

**Problem**: Settings page doesn't load
- **Solution**: Make sure `npm run dev` is running

**Problem**: File upload fails  
- **Solution**: Check that `public/uploads/site/` directory exists and is writable

**Problem**: Changes don't appear
- **Solution**: Try refreshing the page after saving

**Problem**: Console errors about JSON
- **Solution**: The API endpoints are now fixed to return proper JSON

## 📂 File Structure

```
your-project/
├── data/                          # Auto-created
│   ├── site-settings.json        # Your settings
│   └── uploaded-files.json       # Upload tracking
├── public/uploads/site/           # Auto-created  
│   ├── logo_123456.png           # Your uploads
│   └── favicon_789012.ico
└── src/app/api/site-settings/     # API endpoints
    └── route.ts                   # Handles all operations
```

## 🎉 You're Ready!

The feature is **fully functional** right now. Just:

1. Start your dev server: `npm run dev`
2. Go to Settings → Site Customization  
3. Upload your logo and change your site title
4. Save and see the changes instantly!

No database setup, no PHP configuration - it just works! 🚀

---

**Need help?** The system includes detailed error messages and will create all necessary directories automatically.