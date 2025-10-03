import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * API endpoint للتحقق من صحة الجلسة الحالية
 * يستخدم للتحقق الدوري من أن المستخدم مازال مصادق عليه
 */
export async function GET(request: NextRequest) {
  try {
    // جلب الـ token من الطلب
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });

    // التحقق من وجود token
    if (!token) {
      return NextResponse.json(
        { 
          valid: false, 
          error: 'No session found',
          code: 'NO_SESSION' 
        },
        { status: 401 }
      );
    }

    // التحقق من وجود البيانات الأساسية المطلوبة
    if (!token.id || !token.role || !token.username) {
      console.error('⚠️ Invalid token: Missing required fields');
      return NextResponse.json(
        { 
          valid: false, 
          error: 'Invalid session data',
          code: 'INVALID_SESSION_DATA' 
        },
        { status: 401 }
      );
    }

    // التحقق من انتهاء الجلسة
    const now = Math.floor(Date.now() / 1000);
    if (token.exp && token.exp < now) {
      console.log('⚠️ Token expired');
      return NextResponse.json(
        { 
          valid: false, 
          error: 'Session expired',
          code: 'SESSION_EXPIRED' 
        },
        { status: 401 }
      );
    }

    // التحقق من إصدار الجلسة
    const currentVersion = process.env.DEV_COOKIE_VERSION || '1';
    if (token.sessionVersion && token.sessionVersion !== currentVersion) {
      console.log('⚠️ Session version mismatch');
      return NextResponse.json(
        { 
          valid: false, 
          error: 'Session version outdated',
          code: 'VERSION_MISMATCH' 
        },
        { status: 401 }
      );
    }

    // الجلسة صالحة
    return NextResponse.json(
      { 
        valid: true,
        user: {
          id: token.id,
          username: token.username,
          role: token.role,
          fullName: token.fullName,
        },
        expiresAt: token.exp,
      },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
        }
      }
    );

  } catch (error) {
    console.error('❌ Session validation error:', error);
    return NextResponse.json(
      { 
        valid: false, 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint لتحديث آخر نشاط للمستخدم
 */
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token || !token.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // يمكن إضافة منطق لتحديث آخر نشاط في قاعدة البيانات هنا

    return NextResponse.json(
      { 
        success: true,
        lastActivity: new Date().toISOString() 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('❌ Activity update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}