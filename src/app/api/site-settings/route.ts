import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';

// JSON file to store settings (simulating database)
const SETTINGS_FILE = join(process.cwd(), 'data', 'site-settings.json');
const UPLOADS_FILE = join(process.cwd(), 'data', 'uploaded-files.json');

let DATA_DIR_CHECKED = false;
async function ensureDataDir() {
  const dataDir = join(process.cwd(), 'data');
  if (process.env.NODE_ENV === 'development') {
    console.log('📁 Data directory path:', dataDir);
  }
  
  if (!existsSync(dataDir)) {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔨 Creating data directory...');
    }
    try {
      await mkdir(dataDir, { recursive: true });
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Data directory created successfully');
      }
    } catch (error) {
      console.error('❌ Failed to create data directory:', error);
      throw new Error(`Failed to create data directory: ${error}`);
    }
  } else if (process.env.NODE_ENV === 'development') {
    console.log('✅ Data directory already exists');
  }
  
  if (DATA_DIR_CHECKED) return;
  // Test write permissions only once per process
  const testFile = join(dataDir, 'test-write-permissions.txt');
  try {
    await writeFile(testFile, 'test', 'utf8');
    // Clean up test file
    const fs = require('fs').promises;
    await fs.unlink(testFile);
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Data directory is writable');
    }
    DATA_DIR_CHECKED = true;
  } catch (error) {
    console.error('❌ Data directory is not writable:', error);
    throw new Error(`Data directory is not writable: ${error}`);
  }
}

async function getDefaultSettings() {
  return {
    id: 1,
    site_title: 'EP Group System',
    site_description: 'نظام إدارة متطور للشركات والمؤسسات',
    logo_path: '/logo.svg',
    favicon_path: '/favicon.ico',
    loading_icon_path: '/logo.svg',
    primary_color: '#0066cc',
    secondary_color: '#6c757d',
    meta_keywords: 'EP Group, نظام إدارة, إدارة العيادات, إدارة المستودعات',
    meta_author: 'EP Group',
    company_phone: '+966123456789',
    company_email: 'info@epgroup.com',
    company_address: 'الرياض، المملكة العربية السعودية',
    company_website: 'https://www.epgroup.com',
    company_currency: '',
    system_version: 'v2.1.0',
    system_language: 'ar',
    rtl_support: true,
  };
}

// Simple in-memory cache for site settings - زيادة مدة الكاش لتقليل الطلبات
let settingsCache: any = null;
let settingsCacheTime = 0;
const SETTINGS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  try {
    const now = Date.now();
    
    // Return cached data if still valid
    if (settingsCache && (now - settingsCacheTime) < SETTINGS_CACHE_DURATION) {
      console.log('⚙️ Returning cached site settings');
      return NextResponse.json(settingsCache, {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60'
        }
      });
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 GET request received for site settings');
    }
    await ensureDataDir();
    
    let response;
    
    if (!existsSync(SETTINGS_FILE)) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🆕 Settings file does not exist, returning defaults');
      }
      const defaultSettings = await getDefaultSettings();
      response = { success: true, data: defaultSettings };
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log('📂 Reading settings file...');
      }
      const fileContent = await readFile(SETTINGS_FILE, 'utf8');
      // تنظيف أقوى: إزالة كل شيء بعد آخر }
      let trimmed = fileContent.trim();
      const lastBrace = trimmed.lastIndexOf('}');
      if (lastBrace !== -1) {
        trimmed = trimmed.substring(0, lastBrace + 1);
      }
      const settings = JSON.parse(trimmed);
      response = { success: true, data: settings };
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Settings loaded successfully from file');
      }
    }
    
    // Update cache
    settingsCache = response;
    settingsCacheTime = now;
    
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60'
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching site settings:', error);
    if (process.env.NODE_ENV === 'development') {
      console.log('⚠️ Falling back to defaults');
    }
    
    // Return cached data if available, or defaults
    if (settingsCache) {
      return NextResponse.json(settingsCache, {
        headers: {
          'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30'
        }
      });
    }
    
    try {
      const defaultSettings = await getDefaultSettings();
      const fallback = { 
        success: true, 
        data: defaultSettings,
        warning: 'Using default settings due to error',
        error: process.env.NODE_ENV === 'development' ? String(error) : undefined
      };
      
      return NextResponse.json(fallback, {
        headers: {
          'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30'
        }
      });
    } catch (defaultError) {
      console.error('❌ Failed to get default settings:', defaultError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to load settings',
          details: process.env.NODE_ENV === 'development' ? String(error) : undefined
        },
        { status: 500 }
      );
    }
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 PUT request received for site settings update');
    }
    
    const body = await request.json();
    if (process.env.NODE_ENV === 'development') {
      console.log('📦 Request body:', body);
    }
    
    await ensureDataDir();
    
    // Get current settings or defaults
    let currentSettings;
    if (process.env.NODE_ENV === 'development') {
      console.log('📄 Settings file path:', SETTINGS_FILE);
    }
    
    if (existsSync(SETTINGS_FILE)) {
      if (process.env.NODE_ENV === 'development') {
        console.log('📂 Settings file exists, reading...');
      }
      const fileContent = await readFile(SETTINGS_FILE, 'utf8');
      // تنظيف أقوى: إزالة كل شيء بعد آخر }
      let trimmed = fileContent.trim();
      const lastBrace = trimmed.lastIndexOf('}');
      if (lastBrace !== -1) {
        trimmed = trimmed.substring(0, lastBrace + 1);
      }
      currentSettings = JSON.parse(trimmed);
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Current settings loaded:', Object.keys(currentSettings));
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log('🆕 Settings file does not exist, using defaults');
      }
      currentSettings = await getDefaultSettings();
    }
    
    // Update settings with provided values
    const updatedSettings = {
      ...currentSettings,
      ...body,
      updated_at: new Date().toISOString(),
    };
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 Updated settings to save:', Object.keys(updatedSettings));
    }
    
    // Save to file
    try {
      await writeFile(SETTINGS_FILE, JSON.stringify(updatedSettings, null, 2), 'utf8');
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Settings file saved successfully');
      }
      
      // Invalidate cache after successful update
      settingsCache = null;
      settingsCacheTime = 0;
      if (process.env.NODE_ENV === 'development') {
        console.log('🗑️ Settings cache invalidated');
      }
      
    } catch (writeError) {
      console.error('❌ Failed to write settings file:', writeError);
      throw new Error(`Failed to save settings: ${writeError}`);
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Site settings updated successfully');
    }
    return NextResponse.json({ success: true, data: updatedSettings });
  } catch (error) {
    console.error('❌ Error updating site settings:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update site settings',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}

async function saveUploadMetadata(fileData: any) {
  await ensureDataDir();
  
  let uploads = [];
  if (existsSync(UPLOADS_FILE)) {
    const fileContent = await readFile(UPLOADS_FILE, 'utf8');
    uploads = JSON.parse(fileContent);
  }
  
  uploads.push({
    ...fileData,
    id: Date.now(),
    created_at: new Date().toISOString(),
  });
  
  await writeFile(UPLOADS_FILE, JSON.stringify(uploads, null, 2), 'utf8');
}

export async function POST(request: NextRequest) {
  // Handle file upload for logos, favicons, and loading icons
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const uploadType = formData.get('uploadType') as string;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml', 'image/x-icon'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only images are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Create unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${uploadType}_${timestamp}.${fileExtension}`;
    const filePath = `/uploads/site/${fileName}`;

    // Ensure the uploads directory exists
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'site');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Save the file to the uploads directory
    try {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const uploadPath = join(uploadsDir, fileName);
      await writeFile(uploadPath, buffer);
    } catch (fileError) {
      console.error('Error saving file:', fileError);
      return NextResponse.json(
        { success: false, error: 'Failed to save file to disk' },
        { status: 500 }
      );
    }
    
    // Save file metadata
    const fileData = {
      file_name: fileName,
      original_name: file.name,
      file_path: filePath,
      file_type: fileExtension || '',
      file_size: file.size,
      mime_type: file.type,
      upload_type: uploadType,
    };
    
    await saveUploadMetadata(fileData);

    return NextResponse.json({ 
      success: true, 
      filePath: filePath,
      fileData: fileData 
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
