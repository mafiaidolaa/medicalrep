import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { logActivity } from '@/lib/activity-logger';

// تحديث فئة نفقة
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerSupabaseClient();
    const { id: categoryId } = await params;
    
    // التحقق من صحة البيانات
    const body = await request.json();
    const { name, name_ar, name_en, description, icon, color, is_active } = body;

    if (!name || !name_ar || !name_en) {
      return NextResponse.json(
        { error: 'الاسم مطلوب بجميع اللغات' },
        { status: 400 }
      );
    }

    // التحقق من أن المستخدم أدمن
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'غير مصرح' },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile as any).role !== 'admin') {
      return NextResponse.json(
        { error: 'غير مصرح - يتطلب صلاحيات أدمن' },
        { status: 403 }
      );
    }

    // تحديث الفئة
    const { data: updatedCategory, error } = await (supabase as any)
      .from('expense_categories')
      .update({
        name,
        name_ar,
        name_en,
        description: description || null,
        icon: icon || 'Receipt',
        color: color || '#3b82f6',
        is_active: is_active !== undefined ? is_active : true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', categoryId)
      .select()
      .single();

    if (error) {
      console.error('Error updating expense category:', error);
      return NextResponse.json(
        { error: 'فشل في تحديث فئة النفقة' },
        { status: 500 }
      );
    }

    // تسجيل النشاط
    await logActivity({
      action: 'update_expense_category',
      entity_type: 'expense_category',
      entity_id: categoryId,
      title: `تحديث فئة نفقة: ${name_ar}`,
      details: `تم تحديث فئة نفقة: ${name_ar} (${name_en})`,
      type: 'expense_created'
    });

    return NextResponse.json(updatedCategory);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ غير متوقع' },
      { status: 500 }
    );
  }
}

// حذف فئة نفقة
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerSupabaseClient();
    const { id: categoryId } = await params;
    
    // التحقق من أن المستخدم أدمن
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'غير مصرح' },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile as any).role !== 'admin') {
      return NextResponse.json(
        { error: 'غير مصرح - يتطلب صلاحيات أدمن' },
        { status: 403 }
      );
    }

    // التحقق من وجود طلبات نفقات تستخدم هذه الفئة
    const { data: expenseRequests } = await supabase
      .from('expense_requests')
      .select('id')
      .eq('category_id', categoryId)
      .limit(1);

    if (expenseRequests && expenseRequests.length > 0) {
      // إخفاء الفئة بدلاً من حذفها إذا كان هناك طلبات مرتبطة بها
      const { data: deactivatedCategory, error } = await (supabase as any)
        .from('expense_categories')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', categoryId)
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { error: 'فشل في إلغاء تفعيل الفئة' },
          { status: 500 }
        );
      }

      await logActivity({
        action: 'deactivate_expense_category',
        entity_type: 'expense_category',
        entity_id: categoryId,
        title: `إلغاء تفعيل فئة نفقة`,
        details: `تم إلغاء تفعيل فئة نفقة بدلاً من حذفها لوجود طلبات مرتبطة بها`,
        type: 'expense_created'
      });

      return NextResponse.json({
        success: true,
        message: 'تم إلغاء تفعيل الفئة بدلاً من حذفها لوجود طلبات مرتبطة بها',
        category: deactivatedCategory
      });
    }

    // الحصول على تفاصيل الفئة قبل الحذف
    const { data: category } = await supabase
      .from('expense_categories')
      .select('name_ar')
      .eq('id', categoryId)
      .single();

    // حذف الفئة
    const { error } = await supabase
      .from('expense_categories')
      .delete()
      .eq('id', categoryId);

    if (error) {
      console.error('Error deleting expense category:', error);
      return NextResponse.json(
        { error: 'فشل في حذف فئة النفقة' },
        { status: 500 }
      );
    }

    // تسجيل النشاط
    await logActivity({
      action: 'delete_expense_category',
      entity_type: 'expense_category',
      entity_id: categoryId,
      title: `حذف فئة نفقة: ${(category as any)?.name_ar || 'غير معروف'}`,
      details: `تم حذف فئة نفقة: ${(category as any)?.name_ar || 'غير معروف'}`,
      type: 'expense_created'
    });

    return NextResponse.json({
      success: true,
      message: 'تم حذف الفئة بنجاح'
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ غير متوقع' },
      { status: 500 }
    );
  }
}

// الحصول على فئة نفقة محددة
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerSupabaseClient();
    const { id: categoryId } = await params;
    
    const { data: category, error } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('id', categoryId)
      .single();

    if (error) {
      console.error('Error fetching expense category:', error);
      return NextResponse.json(
        { error: 'فشل في جلب فئة النفقة' },
        { status: 500 }
      );
    }

    if (!category) {
      return NextResponse.json(
        { error: 'فئة النفقة غير موجودة' },
        { status: 404 }
      );
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ غير متوقع' },
      { status: 500 }
    );
  }
}