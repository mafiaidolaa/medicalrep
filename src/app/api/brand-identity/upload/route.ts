import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * API لرفع ملفات الشعارات والصور للهوية البصرية
 */

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'brand');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

// إنشاء مجلد الرفع إذا لم يكن موجوداً
async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

// التحقق من صحة الملف
function validateFile(file: File) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `نوع الملف غير مدعوم. الأنواع المدعومة: ${ALLOWED_TYPES.join(', ')}`
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    const maxSizeMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `حجم الملف كبير جداً. الحد الأقصى: ${maxSizeMB} ميجابايت`
    };
  }

  return { valid: true };
}

// إنشاء اسم ملف فريد
function generateFileName(originalName: string, logoType: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop();
  return `${logoType}-${timestamp}-${randomString}.${extension}`;
}

export async function POST(request: NextRequest) {
  try {
    // التحقق من وجود البيانات
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const logoType = formData.get('logoType') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'لم يتم تحديد أي ملف' },
        { status: 400 }
      );
    }

    if (!logoType || !['main', 'icon', 'watermark', 'favicon', 'printHeader'].includes(logoType)) {
      return NextResponse.json(
        { success: false, error: 'نوع الشعار غير صحيح' },
        { status: 400 }
      );
    }

    // التحقق من صحة الملف
    const validation = validateFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // إنشاء مجلد الرفع
    await ensureUploadDir();

    // تحويل الملف إلى buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // إنشاء اسم الملف
    const fileName = generateFileName(file.name, logoType);
    const filePath = join(UPLOAD_DIR, fileName);
    const publicPath = `/uploads/brand/${fileName}`;

    // حفظ الملف
    await writeFile(filePath, buffer);

    // حفظ معلومات الملف في قاعدة البيانات أو localStorage
    // يمكنك إضافة هذا الجزء حسب نظامك

    return NextResponse.json({
      success: true,
      data: {
        fileName,
        originalName: file.name,
        size: file.size,
        type: file.type,
        logoType,
        url: publicPath,
        uploadedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('خطأ في رفع الملف:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ في رفع الملف' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const logoType = searchParams.get('type');

    if (!logoType) {
      return NextResponse.json(
        { success: false, error: 'يجب تحديد نوع الشعار' },
        { status: 400 }
      );
    }

    // هنا يمكنك إضافة منطق لاسترجاع معلومات الشعارات المحفوظة
    // من قاعدة البيانات أو localStorage

    return NextResponse.json({
      success: true,
      data: {
        logoType,
        // إضافة البيانات المسترجعة هنا
      }
    });

  } catch (error) {
    console.error('خطأ في استرجاع بيانات الشعار:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ في استرجاع البيانات' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('file');

    if (!fileName) {
      return NextResponse.json(
        { success: false, error: 'يجب تحديد اسم الملف' },
        { status: 400 }
      );
    }

    const filePath = join(UPLOAD_DIR, fileName);
    
    // حذف الملف إذا كان موجوداً
    if (existsSync(filePath)) {
      const fs = await import('fs/promises');
      await fs.unlink(filePath);
    }

    // حذف البيانات من قاعدة البيانات إذا كانت موجودة

    return NextResponse.json({
      success: true,
      message: 'تم حذف الملف بنجاح'
    });

  } catch (error) {
    console.error('خطأ في حذف الملف:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ في حذف الملف' },
      { status: 500 }
    );
  }
}