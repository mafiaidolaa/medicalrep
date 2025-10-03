import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * API لرفع صور المستخدمين (Avatars)
 * 
 * Features:
 * - ✅ رفع إلى Supabase Storage
 * - ✅ اسم ملف unique (userId + timestamp)
 * - ✅ Public URL
 * - ✅ تحقق من حجم الملف
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'No userId provided' },
        { status: 400 }
      );
    }

    // تحقق من حجم الملف (Max 500KB)
    const maxSize = 500 * 1024; // 500KB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Max size: ${maxSize / 1024}KB` },
        { status: 400 }
      );
    }

    // تحقق من نوع الملف
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // اسم الملف unique
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop() || 'webp';
    const fileName = `${userId}_${timestamp}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    // حوّل File إلى ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // ارفع إلى Supabase Storage
    const { data, error } = await supabase.storage
      .from('user-avatars') // اسم الـ bucket
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true, // استبدل الصورة القديمة إذا كانت موجودة
      });

    if (error) {
      console.error('Supabase storage error:', error);
      return NextResponse.json(
        { error: 'Failed to upload file', details: error.message },
        { status: 500 }
      );
    }

    // احصل على Public URL
    const { data: urlData } = supabase.storage
      .from('user-avatars')
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: filePath,
      message: 'Avatar uploaded successfully',
    });

  } catch (error) {
    console.error('Upload avatar error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * حذف صورة المستخدم
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');

    if (!filePath) {
      return NextResponse.json(
        { error: 'No file path provided' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    const { error } = await supabase.storage
      .from('user-avatars')
      .remove([filePath]);

    if (error) {
      console.error('Supabase storage delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete file', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Avatar deleted successfully',
    });

  } catch (error) {
    console.error('Delete avatar error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
