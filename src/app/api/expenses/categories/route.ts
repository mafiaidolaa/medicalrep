import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';
import { logActivity } from '@/lib/activity-logger';
import { isDev } from '@/lib/dev-config';

// الحصول على جميع فئات النفقات
export async function GET() {
  try {
    // في بيئة التطوير، إرجاع بيانات تجريبية
    if (isDev()) {
      const mockCategories = [
        {
          id: '1',
          name: 'transportation',
          name_ar: 'مواصلات',
          name_en: 'Transportation',
          description: 'تكاليف النقل والمواصلات',
          icon: 'Car',
          color: '#3b82f6',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          name: 'meals',
          name_ar: 'وجبات',
          name_en: 'Meals',
          description: 'تكاليف الطعام والوجبات',
          icon: 'UtensilsCrossed',
          color: '#10b981',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '3',
          name: 'office',
          name_ar: 'مكتبية',
          name_en: 'Office Supplies',
          description: 'أدوات ومستلزمات مكتبية',
          icon: 'Briefcase',
          color: '#f59e0b',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      
      return NextResponse.json(mockCategories);
    }
    
    const supabase = createServerSupabaseClient();
    
    const { data: categories, error } = await supabase
      .from('expense_categories')
      .select(`
        id,
        name,
        name_ar,
        name_en,
        description,
        icon,
        color,
        is_active,
        created_at,
        updated_at
      `)
      .eq('is_active', true)
      .order('name_ar', { ascending: true });

    if (error) {
      console.error('Error fetching expense categories:', error);
      return NextResponse.json(
        { error: 'فشل في جلب فئات النفقات' },
        { status: 500 }
      );
    }

    return NextResponse.json(categories || []);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ غير متوقع' },
      { status: 500 }
    );
  }
}

// حفظ قائمة كاملة من فئات النفقات (للأدمن فقط)
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    
    // التحقق من جلسة NextAuth
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'غير مصرح - يجب تسجيل الدخول' },
        { status: 401 }
      );
    }

    // التحقق من صلاحيات المستخدم
    const user = session.user as any;
    const userRole = user.role;
    
    // السماح للأدوار الإدارية
    const allowedRoles = ['admin', 'manager', 'accountant', 'supervisor'];
    if (!userRole || !allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { error: 'غير مصرح - يتطلب صلاحيات إدارية' },
        { status: 403 }
      );
    }

    // التحقق من صحة البيانات
    const body = await request.json();
    const { items } = body;

    // إذا كان الطلب يحتوي على items (قائمة كاملة)
    if (Array.isArray(items)) {
      // التحقق من صحة جميع العناصر
      const invalidItems = items.filter(item => 
        !item.name_ar?.trim() || !item.name_en?.trim()
      );

      if (invalidItems.length > 0) {
        return NextResponse.json(
          { error: 'الاسم مطلوب بجميع اللغات لجميع الفئات' },
          { status: 400 }
        );
      }

      // الحصول على الفئات الحالية
      const { data: existingCategories, error: fetchError } = await supabase
        .from('expense_categories')
        .select('id');

      if (fetchError) {
        console.error('Error fetching existing categories:', fetchError);
        return NextResponse.json(
          { error: 'فشل في جلب الفئات الحالية' },
          { status: 500 }
        );
      }

      const existingIds = new Set(existingCategories?.map(c => c.id) || []);
      const incomingIds = new Set(items.filter(item => item.id && !item.id.includes('temp-')).map(item => item.id));
      
      // تحديد الفئات التي سيتم حذفها (الموجودة حالياً لكن غير موجودة في القائمة الجديدة)
      const idsToDelete = Array.from(existingIds).filter(id => !incomingIds.has(id));

      // حذف الفئات التي لم تعد موجودة (سيفشل إذا كانت مرتبطة بنفقات)
      if (idsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('expense_categories')
          .delete()
          .in('id', idsToDelete);

        if (deleteError) {
          console.error('Error deleting old categories:', deleteError);
          // إذا كان هناك خطأ في حذف فئة (مثل قيد المفتاح الخارجي)، نُعلم المستخدم
          if (deleteError.code === '23503') {
            return NextResponse.json(
              { error: 'لا يمكن حذف بعض الفئات لأنها مرتبطة بنفقات موجودة. قم بحذف النفقات أولاً أو قم بإلغاء تنشيط الفئة بدلاً من حذفها.' },
              { status: 400 }
            );
          }
          return NextResponse.json(
            { error: 'فشل في حذف الفئات القديمة' },
            { status: 500 }
          );
        }
      }

      // تحديث أو إدراج الفئات
      const categoriesToUpsert = items.map(item => ({
        ...(item.id && !item.id.includes('temp-') ? { id: item.id } : {}), // الاحتفاظ بالـ ID إذا كان موجوداً
        name: item.name || 'custom',
        name_ar: item.name_ar.trim(),
        name_en: item.name_en.trim(),
        description: item.description || null,
        icon: item.icon || 'Receipt',
        color: item.color || '#6b7280',
        is_active: item.is_active !== false,
        created_by: user.id,
      }));

      const { data: newCategories, error: upsertError } = await supabase
        .from('expense_categories')
        .upsert(categoriesToUpsert, { onConflict: 'id' })
        .select();

      if (upsertError) {
        console.error('Error upserting categories:', upsertError);
        return NextResponse.json(
          { error: 'فشل في حفظ الفئات' },
          { status: 500 }
        );
      }

      // تسجيل النشاط
      try {
        await logActivity({
          action: 'update_expense_categories',
          entity_type: 'expense_category',
          entity_id: user.id,
          title: 'تحديث فئات النفقات',
          details: `تم تحديث ${newCategories?.length || 0} فئة نفقات`,
          type: 'expense_created'
        });
      } catch (e) {
        console.warn('Failed to log activity:', e);
      }

      return NextResponse.json(newCategories || [], { status: 200 });
    }

    // إذا كان الطلب يحتوي على فئة واحدة فقط (للتوافق الخلفي)
    const { name, name_ar, name_en, description, icon, color } = body;

    if (!name || !name_ar || !name_en) {
      return NextResponse.json(
        { error: 'الاسم مطلوب بجميع اللغات' },
        { status: 400 }
      );
    }

    // إنشاء الفئة الجديدة
    const { data: newCategory, error } = await (supabase as any)
      .from('expense_categories')
      .insert([
        {
          name,
          name_ar,
          name_en,
          description: description || null,
          icon: icon || 'Receipt',
          color: color || '#3b82f6',
          created_by: user.id,
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating expense category:', error);
      return NextResponse.json(
        { error: 'فشل في إنشاء فئة النفقة' },
        { status: 500 }
      );
    }

    // تسجيل النشاط
    await logActivity({
      action: 'create_expense_category',
      entity_type: 'expense_category',
      entity_id: newCategory.id,
      title: `إنشاء فئة نفقة جديدة: ${name_ar}`,
      details: `تم إنشاء فئة نفقة جديدة: ${name_ar} (${name_en})`,
      type: 'expense_created'
    });

    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ غير متوقع' },
      { status: 500 }
    );
  }
}
