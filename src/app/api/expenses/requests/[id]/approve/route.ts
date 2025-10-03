import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { logActivity } from '@/lib/activity-logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerSupabaseClient();
    const { id: requestId } = await params;
    
    // الحصول على المستخدم الحالي
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'غير مصرح' },
        { status: 401 }
      );
    }

    // الحصول على بيانات المستخدم وصلاحياته
    const { data: profile } = await supabase
      .from('users')
      .select('role, manager_id, full_name')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'ملف المستخدم غير موجود' },
        { status: 404 }
      );
    }

    // التحقق من الصلاحيات
    if (!['manager', 'admin', 'accounting'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'غير مصرح - لا تملك صلاحيات الموافقة' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, notes, approval_level } = body; // approve, reject, request_info

    if (!action || !['approve', 'reject', 'request_info'].includes(action)) {
      return NextResponse.json(
        { error: 'إجراء غير صحيح' },
        { status: 400 }
      );
    }

    // الحصول على طلب النفقة
    const { data: expenseRequest, error: fetchError } = await supabase
      .from('expense_requests')
      .select(`
        *,
        expense_categories (
          id,
          name_ar
        ),
        users!expense_requests_user_id_fkey (
          id,
          full_name,
          username
        )
      `)
      .eq('id', requestId)
      .single();

    if (fetchError || !expenseRequest) {
      return NextResponse.json(
        { error: 'طلب النفقة غير موجود' },
        { status: 404 }
      );
    }

    // تحديد نوع الموافقة بناءً على الدور
    let newStatus = expenseRequest.status;
    let updateFields: any = {};

    if (profile.role === 'manager' || (profile.role === 'admin' && approval_level === 'manager')) {
      // موافقة مدير
      if (expenseRequest.status !== 'pending') {
        return NextResponse.json(
          { error: 'لا يمكن الموافقة على هذا الطلب في هذه المرحلة' },
          { status: 400 }
        );
      }

      if (action === 'approve') {
        newStatus = 'manager_approved';
        updateFields = {
          status: newStatus,
          manager_approved_at: new Date().toISOString(),
          manager_approved_by: user.id,
          manager_notes: notes || null,
        };
      } else if (action === 'reject') {
        newStatus = 'rejected';
        updateFields = {
          status: newStatus,
          rejected_at: new Date().toISOString(),
          rejected_by: user.id,
          rejection_reason: notes || null,
        };
      }
    } else if (profile.role === 'accounting' || (profile.role === 'admin' && approval_level === 'accounting')) {
      // موافقة محاسبة
      if (expenseRequest.status !== 'manager_approved') {
        return NextResponse.json(
          { error: 'يجب موافقة المدير أولاً' },
          { status: 400 }
        );
      }

      if (action === 'approve') {
        newStatus = 'approved';
        updateFields = {
          status: newStatus,
          approved_at: new Date().toISOString(),
          approved_by: user.id,
          accounting_notes: notes || null,
        };
      } else if (action === 'reject') {
        newStatus = 'rejected';
        updateFields = {
          status: newStatus,
          rejected_at: new Date().toISOString(),
          rejected_by: user.id,
          rejection_reason: notes || null,
        };
      }
    }

    // تحديث الطلب
    const { data: updatedRequest, error: updateError } = await supabase
      .from('expense_requests')
      .update({
        ...updateFields,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating expense request:', updateError);
      return NextResponse.json(
        { error: 'فشل في تحديث الطلب' },
        { status: 500 }
      );
    }

    // تسجيل النشاط
    await logActivity({
      action: `expense_request_${action}`,
      entity_type: 'expense_request',
      entity_id: requestId,
      title: `${action === 'approve' ? 'موافقة على' : 'رفض'} طلب نفقة`,
      details: `${action === 'approve' ? 'تم الموافقة على' : 'تم رفض'} طلب النفقة بقيمة ${expenseRequest.amount} ${notes ? '- ' + notes : ''}`,
      type: 'approval'
    });

    return NextResponse.json(
      {
        success: true,
        message: action === 'approve' ? 'تم الموافقة على الطلب' : 'تم رفض الطلب',
        request: updatedRequest
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ غير متوقع' },
      { status: 500 }
    );
  }
}
