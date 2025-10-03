import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { revalidatePath, revalidateTag } from 'next/cache'

// DELETE /api/users/[id] - حذف مستخدم
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // التحقق من الجلسة
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized - يجب تسجيل الدخول' },
        { status: 401 }
      )
    }

    // التحقق من صلاحيات المستخدم (admin أو manager فقط)
    const userRole = (session.user as any).role
    if (!['admin', 'manager'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden - ليس لديك صلاحية لحذف المستخدمين' },
        { status: 403 }
      )
    }

    // Await params in Next.js 15
    const params = await context.params
    const userId = params.id

    // إنشاء عميل Supabase مع Service Role Key
    const supabase = createServerSupabaseClient()

    // Snapshot
    const { data: snapshot, error: fetchErr } = await (supabase as any)
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    if (fetchErr) {
      console.warn('Failed to fetch user snapshot before delete:', fetchErr);
    }

    // حذف منطقي: تعطيل المستخدم بدلاً من حذفه
    const { error } = await (supabase as any)
      .from('users')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) {
      console.error('Error deleting user:', error)
      return NextResponse.json(
        { error: `فشل حذف المستخدم: ${error.message}` },
        { status: 500 }
      )
    }

    // Revalidate cache to ensure fresh data
    try {
      revalidatePath('/users')
      revalidatePath('/api/users')
      revalidateTag('users')
    } catch (revalidateError) {
      console.warn('Cache revalidation warning:', revalidateError)
      // Don't fail the request if revalidation fails
    }

    // Log recycle bin entry
    try {
      const { activityLogger } = await import('@/lib/activity-logger');
      await activityLogger.log({
        action: 'move_to_trash',
        entity_type: 'user',
        entity_id: userId,
        title: `نقل مستخدم إلى سلة المهملات: ${snapshot?.full_name || userId}`,
        details: `تم نقل المستخدم إلى سلة المهملات بواسطة ${(session.user as any)?.email || 'unknown'}`,
        type: 'delete',
        changes: snapshot ? { snapshot } : undefined,
      }, request as any);
    } catch (logErr) {
      console.warn('Failed to log user recycle bin entry:', logErr);
    }

    return NextResponse.json(
      { message: 'تم حذف المستخدم (تعطيل) بنجاح' },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('DELETE /api/users/[id] error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/users/[id] - تحديث مستخدم
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // التحقق من الجلسة
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized - يجب تسجيل الدخول' },
        { status: 401 }
      )
    }

    // Await params in Next.js 15
    const params = await context.params
    const userId = params.id
    const body = await request.json()

    // إنشاء عميل Supabase مع Service Role Key
    const supabase = createServerSupabaseClient()

    // Prepare update data with sanitization
    const sanitizeScope = (v: any) => {
      if (v === undefined || v === null) return null;
      const s = String(v).trim().toLowerCase();
      if (s.startsWith('all ')) return null;
      if (s === 'all') return null;
      return String(v).trim();
    };
    const updateData: any = { ...body, updated_at: new Date().toISOString() };
    if ('role' in updateData && updateData.role === 'admin') {
      updateData.area = null;
      updateData.line = null;
    } else {
      if ('area' in updateData) updateData.area = sanitizeScope(updateData.area);
      if ('line' in updateData) updateData.line = sanitizeScope(updateData.line);
    }

    // تحديث المستخدم
    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)

    if (error) {
      console.error('Error updating user:', error)
      return NextResponse.json(
        { error: `فشل تحديث المستخدم: ${error.message}` },
        { status: 500 }
      )
    }

    // Revalidate cache to ensure fresh data
    try {
      revalidatePath('/users')
      revalidatePath(`/users/edit/${userId}`)
      revalidatePath('/api/users')
      revalidateTag('users')
    } catch (revalidateError) {
      console.warn('Cache revalidation warning:', revalidateError)
      // Don't fail the request if revalidation fails
    }

    return NextResponse.json(
      { message: 'تم تحديث المستخدم بنجاح' },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('PUT /api/users/[id] error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/users/[id] - الحصول على معلومات مستخدم محدد
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // التحقق من الجلسة
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized - يجب تسجيل الدخول' },
        { status: 401 }
      )
    }

    // Await params in Next.js 15
    const params = await context.params
    const userId = params.id

    // إنشاء عميل Supabase
    const supabase = createServerSupabaseClient()

    // الحصول على المستخدم
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching user:', error)
      return NextResponse.json(
        { error: `فشل جلب المستخدم: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    console.error('GET /api/users/[id] error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}