import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { Document, Page, Text, View, StyleSheet, PDFViewer } from '@react-pdf/renderer';

// Styles for PDF
const styles = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    padding: 30,
    fontFamily: 'Times-Roman',
  },
  header: {
    marginBottom: 20,
    textAlign: 'center',
    borderBottom: '2 solid #000000',
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333333',
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#cccccc',
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row',
  },
  tableHeader: {
    backgroundColor: '#f0f0f0',
  },
  tableCol: {
    width: '20%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#cccccc',
  },
  tableCellHeader: {
    margin: 5,
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tableCell: {
    margin: 5,
    fontSize: 10,
    textAlign: 'center',
  },
  summary: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f8f9fa',
    border: '1 solid #dee2e6',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 12,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});

// Generate PDF Document
const ExpensePDFDocument = ({ data, summary, dateRange }: any) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>تقرير النفقات</Text>
        <Text style={styles.subtitle}>نظام إدارة النفقات - EP Group</Text>
        {dateRange && (
          <Text style={[styles.subtitle, { marginTop: 5 }]}>
            الفترة: {dateRange.start} إلى {dateRange.end}
          </Text>
        )}
      </View>

      {/* Summary Section */}
      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>ملخص النفقات</Text>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>إجمالي الطلبات:</Text>
          <Text style={styles.summaryValue}>{summary.totalRequests}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>الطلبات المعلقة:</Text>
          <Text style={styles.summaryValue}>{summary.pendingRequests}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>المبلغ الإجمالي:</Text>
          <Text style={styles.summaryValue}>{summary.totalAmount.toLocaleString()} ج.م</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>المبلغ المعتمد:</Text>
          <Text style={styles.summaryValue}>{summary.approvedAmount.toLocaleString()} ج.م</Text>
        </View>
      </View>

      {/* Data Table */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>تفاصيل النفقات</Text>
        
        <View style={styles.table}>
          {/* Table Header */}
          <View style={[styles.tableRow, styles.tableHeader]}>
            <View style={styles.tableCol}>
              <Text style={styles.tableCellHeader}>التاريخ</Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={styles.tableCellHeader}>الموظف</Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={styles.tableCellHeader}>النوع</Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={styles.tableCellHeader}>المبلغ</Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={styles.tableCellHeader}>الحالة</Text>
            </View>
          </View>

          {/* Table Rows */}
          {data.map((expense: any, index: number) => (
            <View key={index} style={styles.tableRow}>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>
                  {new Date(expense.expense_date).toLocaleDateString('ar-EG')}
                </Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{expense.users?.full_name || '-'}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>
                  {expense.expense_categories?.name_ar || '-'}
                </Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{expense.amount.toLocaleString()} ج.م</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>
                  {getStatusLabel(expense.status)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Footer */}
      <View style={{ position: 'absolute', bottom: 30, left: 0, right: 0, textAlign: 'center' }}>
        <Text style={{ fontSize: 10, color: '#666666' }}>
          تم إنشاء هذا التقرير في {new Date().toLocaleDateString('ar-EG')} - نظام إدارة النفقات EP Group
        </Text>
      </View>
    </Page>
  </Document>
);

// Helper function to get status label in Arabic
function getStatusLabel(status: string): string {
  const statusLabels = {
    'pending': 'في الانتظار',
    'manager_approved': 'موافقة المدير',
    'manager_rejected': 'رفض المدير',
    'accounting_approved': 'موافقة المحاسبة',
    'accounting_rejected': 'رفض المحاسبة',
    'paid': 'تم الدفع'
  };
  return statusLabels[status as keyof typeof statusLabels] || status;
}

// API Route to generate and download PDF
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    
    // التحقق من المستخدم
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'غير مصرح' },
        { status: 401 }
      );
    }

    // الحصول على المعاملات من الطلب
    const body = await request.json();
    const { 
      startDate, 
      endDate, 
      status, 
      categoryId, 
      userId,
      reportType = 'expenses' 
    } = body;

    // الحصول على بيانات المستخدم للتحقق من الصلاحيات
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'ملف المستخدم غير موجود' },
        { status: 404 }
      );
    }

    // بناء استعلام البيانات
    let query = supabase
      .from('expense_requests')
      .select(`
        *,
        expense_categories (
          id,
          name_ar,
          name_en,
          icon,
          color
        ),
        users!expense_requests_user_id_fkey (
          id,
          full_name,
          username,
          role
        )
      `);

    // تطبيق الفلاتر حسب الصلاحيات
    switch (profile.role) {
      case 'admin':
      case 'accounting':
        // يمكن رؤية كل الطلبات
        break;
      case 'manager':
        // المدير يرى طلبات فريقه فقط
        query = query.or(`user_id.eq.${user.id},manager_approved_by.eq.${user.id}`);
        break;
      default:
        // المستخدم العادي يرى طلباته فقط
        query = query.eq('user_id', user.id);
    }

    // تطبيق الفلاتر
    if (startDate) {
      query = query.gte('expense_date', startDate);
    }
    if (endDate) {
      query = query.lte('expense_date', endDate);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }
    if (userId && (profile.role === 'admin' || profile.role === 'accounting')) {
      query = query.eq('user_id', userId);
    }

    // تنفيذ الاستعلام
    const { data: expenses, error } = await query
      .order('expense_date', { ascending: false });

    if (error) {
      console.error('Error fetching expenses for PDF:', error);
      return NextResponse.json(
        { error: 'فشل في جلب بيانات النفقات' },
        { status: 500 }
      );
    }

    // حساب الملخص
    const summary = {
      totalRequests: expenses?.length || 0,
      pendingRequests: expenses?.filter((e: any) => e.status === 'pending').length || 0,
      totalAmount: expenses?.reduce((sum: number, e: any) => sum + e.amount, 0) || 0,
      approvedAmount: expenses?.filter((e: any) => ['accounting_approved', 'paid'].includes(e.status))
        .reduce((sum: number, e: any) => sum + e.amount, 0) || 0,
    };

    // إعداد نطاق التاريخ للعرض
    const dateRange = startDate && endDate ? {
      start: new Date(startDate).toLocaleDateString('ar-EG'),
      end: new Date(endDate).toLocaleDateString('ar-EG')
    } : null;

    // إرجاع بيانات PDF (في التطبيق الحقيقي، ستحتاج لمكتبة PDF)
    // هنا سنرجع البيانات في تنسيق يمكن استخدامه من الفرونت إند لإنشاء PDF
    return NextResponse.json({
      success: true,
      data: {
        expenses: expenses || [],
        summary,
        dateRange,
        generatedAt: new Date().toISOString(),
        generatedBy: {
          name: profile.full_name || user.email,
          role: profile.role
        }
      }
    });

  } catch (error) {
    console.error('Unexpected error in PDF export:', error);
    return NextResponse.json(
      { error: 'حدث خطأ غير متوقع' },
      { status: 500 }
    );
  }
}

// API Route للحصول على إحصائيات سريعة
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    
    // التحقق من المستخدم
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'غير مصرح' },
        { status: 401 }
      );
    }

    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // الحصول على الإحصائيات السريعة
    let query = supabase
      .from('expense_requests')
      .select('id, amount, status, expense_date');

    if (startDate) {
      query = query.gte('expense_date', startDate);
    }
    if (endDate) {
      query = query.lte('expense_date', endDate);
    }

    const { data: expenses, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'فشل في جلب الإحصائيات' },
        { status: 500 }
      );
    }

    // حساب الإحصائيات
    const stats = {
      totalRequests: expenses?.length || 0,
      pendingRequests: expenses?.filter((e: any) => e.status === 'pending').length || 0,
      approvedRequests: expenses?.filter((e: any) => ['accounting_approved', 'paid'].includes(e.status)).length || 0,
      rejectedRequests: expenses?.filter((e: any) => e.status.includes('rejected')).length || 0,
      totalAmount: expenses?.reduce((sum: number, e: any) => sum + e.amount, 0) || 0,
      approvedAmount: expenses?.filter((e: any) => ['accounting_approved', 'paid'].includes(e.status))
        .reduce((sum: number, e: any) => sum + e.amount, 0) || 0,
    };

    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ غير متوقع' },
      { status: 500 }
    );
  }
}