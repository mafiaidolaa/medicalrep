import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';

// GET /api/trash - fetch trash items by section or counts
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = String((session?.user as any)?.role || '').toLowerCase();
    if (!session || !['admin','gm'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const mode = url.searchParams.get('mode');
    const section = url.searchParams.get('section');

    const supabase = createServerSupabaseClient();

    // If requesting counts
    if (mode === 'counts') {
      const counts: Record<string, number> = {};
      
      const sections = {
        clinics: 'clinics',
        orders: 'orders', 
        visits: 'visits',
        invoices: 'invoices',
        expenses: 'expenses',
        products: 'products',
        payments: 'payments',
        collections: 'collections'
      };

      for (const [key, table] of Object.entries(sections)) {
        try {
          const { count } = await (supabase as any)
            .from(table)
            .select('*', { count: 'exact', head: true })
            .not('deleted_at', 'is', null);
          counts[key] = count || 0;
        } catch {
          counts[key] = 0;
        }
      }

      return NextResponse.json({ counts });
    }

    // If requesting items for a specific section
    if (section) {
      const sectionMap: Record<string, string> = {
        clinics: 'clinics',
        orders: 'orders',
        visits: 'visits', 
        invoices: 'invoices',
        expenses: 'expenses',
        products: 'products',
        payments: 'payments',
        collections: 'collections'
      };

      const table = sectionMap[section];
      if (!table) {
        return NextResponse.json({ error: 'Invalid section' }, { status: 400 });
      }

      // Fetch deleted items with user info who deleted them
      const { data: items, error } = await (supabase as any)
        .from(table)
        .select(`
          *,
          deleted_by_user:users!${table}_deleted_by_fkey(id, full_name, email, role)
        `)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (error) {
        console.error(`Error fetching ${section}:`, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Transform to match the expected format
      const trashItems = (items || []).map((item: any) => ({
        id: `trash-${item.id}`,
        user_id: item.deleted_by,
        action: 'move_to_trash',
        entity_type: section.slice(0, -1), // Remove 's' from plural
        entity_id: item.id,
        title: getItemTitle(item, section),
        details: getItemDetails(item, section),
        timestamp: item.deleted_at,
        changes: {
          snapshot: item
        },
        deleted_by_user: item.deleted_by_user
      }));

      return NextResponse.json(trashItems);
    }

    return NextResponse.json({ error: 'Missing section parameter' }, { status: 400 });

  } catch (error: any) {
    console.error('Trash API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error?.message || 'خطأ داخلي في الخادم' 
      }, 
      { status: 500 }
    );
  }
}

// Helper function to get item title based on section
function getItemTitle(item: any, section: string): string {
  switch (section) {
    case 'clinics':
      return item.name || `عيادة ${item.id}`;
    case 'orders':
      return `طلب ${item.order_date || item.id}`;
    case 'visits':
      return `زيارة ${item.visit_date || item.id}`;
    case 'invoices':
      return item.invoice_number || `فاتورة ${item.invoice_date || item.id}`;
    case 'expenses':
      return item.description || item.category || `نفقة ${item.id}`;
    case 'products':
      return item.name || `منتج ${item.id}`;
    case 'payments':
      return item.reference_number || `دفعة ${item.payment_date || item.id}`;
    case 'collections':
      return `تحصيل ${item.collection_date || item.id}`;
    default:
      return `عنصر ${item.id}`;
  }
}

// Helper function to get item details based on section
function getItemDetails(item: any, section: string): string {
  switch (section) {
    case 'clinics':
      return `الطبيب: ${item.doctor_name || 'غير محدد'} - العنوان: ${item.address || 'غير محدد'}`;
    case 'orders':
      return `المبلغ الإجمالي: ${item.total_amount || 0} - الحالة: ${item.status || 'غير محددة'}`;
    case 'visits':
      return `الغرض: ${item.purpose || 'غير محدد'}`;
    case 'invoices':
      return `المبلغ الإجمالي: ${item.total_amount || item.amount || 0} - النوع: ${item.type || 'غير محدد'} - الحالة: ${item.status || 'غير محددة'}`;
    case 'expenses':
      return `المبلغ: ${item.amount || 0} - الفئة: ${item.category || 'غير محددة'}`;
    case 'products':
      return `السعر: ${item.price || 0} - المخزون: ${item.stock || 0}`;
    case 'payments':
      return `المبلغ: ${item.amount || 0} - الطريقة: ${item.payment_method || 'غير محددة'} - الحالة: ${item.status || 'غير محددة'}`;
    case 'collections':
      return `المبلغ: ${item.amount || 0} - الطريقة: ${item.payment_method || 'غير محددة'}`;
    default:
      return 'لا توجد تفاصيل إضافية';
  }
}
