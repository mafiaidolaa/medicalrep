// @ts-nocheck

// مكتبة إدارة الفواتير
// EP Group System - Invoices Management Library

import { supabase } from '@/lib/supabase';
import { Invoice, InvoiceItem, CreateInvoiceForm, InvoiceFilters } from '@/types/accounts';

export class InvoicesService {
  private table = 'invoices';
  private itemsTable = 'invoice_items';

  // إحضار جميع الفواتير مع الفلترة
  async getInvoices(filters?: InvoiceFilters, page = 1, limit = 50) {
    try {
      let query = supabase
        .from(this.table)
        .select(`
          *,
          customer:customers(id, customer_code, name, phone, email),
          items:invoice_items(*)
        `)
        .order('created_at', { ascending: false });

      // تطبيق الفلاتر
      if (filters?.search) {
        query = query.or(
          `invoice_number.ilike.%${filters.search}%,` +
          `customer.name.ilike.%${filters.search}%,` +
          `customer.customer_code.ilike.%${filters.search}%`
        );
      }
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters?.invoice_type) {
        query = query.eq('invoice_type', filters.invoice_type);
      }
      
      if (filters?.customer_id) {
        query = query.eq('customer_id', filters.customer_id);
      }
      
      if (filters?.date_from) {
        query = query.gte('invoice_date', filters.date_from);
      }
      
      if (filters?.date_to) {
        query = query.lte('invoice_date', filters.date_to);
      }
      
      if (filters?.amount_from) {
        query = query.gte('total_amount', filters.amount_from);
      }
      
      if (filters?.amount_to) {
        query = query.lte('total_amount', filters.amount_to);
      }

      // تطبيق التصفح (Pagination)
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        data: data as Invoice[],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        currentPage: page,
        hasNext: to < (count || 0) - 1,
        hasPrevious: page > 1
      };
    } catch (error) {
      console.error('Error fetching invoices:', error);
      throw error;
    }
  }

  // إحضار فاتورة واحدة
  async getInvoice(id: string): Promise<Invoice | null> {
    try {
      const { data, error } = await supabase
        .from(this.table)
        .select(`
          *,
          customer:customers(*),
          items:invoice_items(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching invoice:', error);
      throw error;
    }
  }

  // البحث عن فاتورة بالرقم
  async getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | null> {
    try {
      const { data, error } = await supabase
        .from(this.table)
        .select(`
          *,
          customer:customers(*),
          items:invoice_items(*)
        `)
        .eq('invoice_number', invoiceNumber)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching invoice by number:', error);
      throw error;
    }
  }

  // إنشاء فاتورة جديدة
  async createInvoice(invoiceData: CreateInvoiceForm): Promise<Invoice> {
    try {
      // توليد رقم فاتورة جديد
      const invoiceNumber = await this.generateInvoiceNumber(invoiceData.invoice_type);
      
      // إنشاء الفاتورة الأساسية
      const { data: invoice, error: invoiceError } = await supabase
        .from(this.table)
        .insert([{
          invoice_number: invoiceNumber,
          customer_id: invoiceData.customer_id,
          invoice_date: invoiceData.invoice_date,
          due_date: invoiceData.due_date,
          invoice_type: invoiceData.invoice_type,
          discount_amount: invoiceData.discount_amount || 0,
          notes: invoiceData.notes,
          terms_conditions: invoiceData.terms_conditions,
          payment_terms: invoiceData.payment_terms,
          status: 'draft'
        }])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // إضافة بنود الفاتورة
      if (invoiceData.items && invoiceData.items.length > 0) {
        const items = invoiceData.items.map(item => ({
          invoice_id: invoice.id,
          item_code: item.item_code,
          item_name: item.item_name,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percentage: item.discount_percentage || 0,
          discount_amount: (item.unit_price * item.quantity * (item.discount_percentage || 0)) / 100,
          tax_percentage: item.tax_percentage || 0,
          tax_amount: (item.unit_price * item.quantity * (item.tax_percentage || 0)) / 100,
          line_total: (item.unit_price * item.quantity) - 
                     ((item.unit_price * item.quantity * (item.discount_percentage || 0)) / 100) +
                     ((item.unit_price * item.quantity * (item.tax_percentage || 0)) / 100)
        }));

        const { error: itemsError } = await supabase
          .from(this.itemsTable)
          .insert(items);

        if (itemsError) throw itemsError;
      }

      // إحضار الفاتورة المكتملة
      return await this.getInvoice(invoice.id) as Invoice;
    } catch (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }
  }

  // تحديث بيانات الفاتورة
  async updateInvoice(id: string, updates: Partial<CreateInvoiceForm>): Promise<Invoice> {
    try {
      const { data, error } = await supabase
        .from(this.table)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating invoice:', error);
      throw error;
    }
  }

  // حذف الفاتورة
  async deleteInvoice(id: string): Promise<void> {
    // Prefer API endpoint (admin-only) to enforce auth on server
    try {
      const res = await fetch(`/api/accounting/invoices/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `HTTP ${res.status}`);
      }
      return;
    } catch (e) {
      console.warn('deleteInvoice via API failed, falling back to direct supabase delete (may fail under RLS):', (e as any)?.message || e);
    }
    // Fallback: direct delete (will work only if client has permission)
    try {
      const { error: itemsError } = await supabase
        .from(this.itemsTable)
        .delete()
        .eq('invoice_id', id);
      if (itemsError) throw itemsError;
      const { error: invoiceError } = await supabase
        .from(this.table)
        .delete()
        .eq('id', id);
      if (invoiceError) throw invoiceError;
    } catch (error) {
      console.error('Error deleting invoice (fallback):', error);
      throw error;
    }
  }

  // تغيير حالة الفاتورة
  async updateInvoiceStatus(id: string, status: string): Promise<Invoice> {
    try {
      const { data, error } = await supabase
        .from(this.table)
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating invoice status:', error);
      throw error;
    }
  }

  // تحديث المبلغ المدفوع
  async updatePaidAmount(id: string, paidAmount: number): Promise<Invoice> {
    try {
      const invoice = await this.getInvoice(id);
      if (!invoice) throw new Error('الفاتورة غير موجودة');

      const remainingAmount = invoice.total_amount - paidAmount;
      let newStatus = invoice.status;

      // تحديد الحالة الجديدة
      if (paidAmount === 0) {
        newStatus = 'sent';
      } else if (paidAmount >= invoice.total_amount) {
        newStatus = 'paid';
      } else {
        newStatus = 'partially_paid';
      }

      const { data, error } = await supabase
        .from(this.table)
        .update({ 
          paid_amount: paidAmount, 
          remaining_amount: remainingAmount,
          status: newStatus 
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating paid amount:', error);
      throw error;
    }
  }

  // إحضار الفواتير المستحقة
  async getOverdueInvoices(): Promise<Invoice[]> {
    try {
      const { data, error } = await supabase
        .from('overdue_invoices')
        .select('*')
        .order('overdue_days', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching overdue invoices:', error);
      throw error;
    }
  }

  // إحضار فواتير العميل
  async getCustomerInvoices(customerId: string, limit = 20): Promise<Invoice[]> {
    try {
      const { data, error } = await supabase
        .from(this.table)
        .select(`
          *,
          customer:customers(id, customer_code, name, phone),
          items:invoice_items(*)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching customer invoices:', error);
      throw error;
    }
  }

  // إحضار إحصائيات الفواتير
  async getInvoicesStats() {
    try {
      const [totalResult, paidResult, overdueResult, draftResult] = await Promise.all([
        supabase.from(this.table).select('id', { count: 'exact', head: true }),
        supabase.from(this.table).select('id', { count: 'exact', head: true }).eq('status', 'paid'),
        supabase.from(this.table).select('id', { count: 'exact', head: true }).eq('status', 'overdue'),
        supabase.from(this.table).select('id', { count: 'exact', head: true }).eq('status', 'draft')
      ]);

      // حساب إجمالي المبالغ
      const totalAmountResult = await supabase
        .from(this.table)
        .select('total_amount, paid_amount, remaining_amount');

      const totals = totalAmountResult.data?.reduce(
        (acc, invoice) => ({
          total_amount: acc.total_amount + invoice.total_amount,
          paid_amount: acc.paid_amount + invoice.paid_amount,
          remaining_amount: acc.remaining_amount + invoice.remaining_amount
        }),
        { total_amount: 0, paid_amount: 0, remaining_amount: 0 }
      ) || { total_amount: 0, paid_amount: 0, remaining_amount: 0 };

      return {
        total_invoices: totalResult.count || 0,
        paid_invoices: paidResult.count || 0,
        overdue_invoices: overdueResult.count || 0,
        draft_invoices: draftResult.count || 0,
        total_amount: totals.total_amount,
        paid_amount: totals.paid_amount,
        remaining_amount: totals.remaining_amount
      };
    } catch (error) {
      console.error('Error fetching invoices stats:', error);
      throw error;
    }
  }

  // توليد رقم فاتورة جديد
  async generateInvoiceNumber(type: string = 'sales'): Promise<string> {
    try {
      const prefix = type === 'sales' ? 'INV' : 
                    type === 'purchase' ? 'PUR' : 
                    type === 'return_sales' ? 'RET-S' : 'RET-P';

      // البحث عن آخر رقم فاتورة من نفس النوع
      const { data, error } = await supabase
        .from(this.table)
        .select('invoice_number')
        .like('invoice_number', `${prefix}%`)
        .order('invoice_number', { ascending: false })
        .limit(1);

      if (error) throw error;

      let nextNumber = 1;
      if (data && data.length > 0) {
        const lastNumber = data[0].invoice_number;
        const numberPart = lastNumber.replace(prefix, '').replace('-', '');
        nextNumber = parseInt(numberPart) + 1;
      }

      return `${prefix}-${nextNumber.toString().padStart(6, '0')}`;
    } catch (error) {
      console.error('Error generating invoice number:', error);
      throw error;
    }
  }

  // البحث في الفواتير
  async searchInvoices(searchTerm: string, limit = 10): Promise<Invoice[]> {
    try {
      const { data, error } = await supabase
        .from(this.table)
        .select(`
          *,
          customer:customers(id, customer_code, name, phone)
        `)
        .or(
          `invoice_number.ilike.%${searchTerm}%,` +
          `customer.name.ilike.%${searchTerm}%,` +
          `customer.customer_code.ilike.%${searchTerm}%`
        )
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching invoices:', error);
      throw error;
    }
  }

  // معاينة طباعة الفاتورة
  async generateInvoicePrint(id: string): Promise<string> {
    try {
      const invoice = await this.getInvoice(id);
      if (!invoice) throw new Error('الفاتورة غير موجودة');

      // هنا يمكن إضافة منطق توليد HTML للطباعة
      const printTemplate = `
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
          <meta charset="utf-8">
          <title>فاتورة ${invoice.invoice_number}</title>
          <style>
            body { font-family: 'Cairo', Arial, sans-serif; }
            .invoice { max-width: 800px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .invoice-details { margin-bottom: 20px; }
            .items-table { width: 100%; border-collapse: collapse; }
            .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: right; }
            @media print { 
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="invoice">
            <div class="header">
              <h1>فاتورة ${invoice.invoice_type === 'sales' ? 'مبيعات' : 'مشتريات'}</h1>
              <h2>${invoice.invoice_number}</h2>
            </div>
            <!-- المزيد من تفاصيل الطباعة -->
          </div>
        </body>
        </html>
      `;

      return printTemplate;
    } catch (error) {
      console.error('Error generating invoice print:', error);
      throw error;
    }
  }

  // تحديث الفواتير المتأخرة
  async updateOverdueInvoices(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from(this.table)
        .update({ status: 'overdue' })
        .lt('due_date', new Date().toISOString().split('T')[0])
        .gt('remaining_amount', 0)
        .neq('status', 'paid')
        .neq('status', 'cancelled')
        .select('id');

      if (error) throw error;
      return data?.length || 0;
    } catch (error) {
      console.error('Error updating overdue invoices:', error);
      throw error;
    }
  }

  // إضافة بند جديد للفاتورة
  async addInvoiceItem(invoiceId: string, item: Partial<InvoiceItem>): Promise<InvoiceItem> {
    try {
      const { data, error } = await supabase
        .from(this.itemsTable)
        .insert([{ ...item, invoice_id: invoiceId }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding invoice item:', error);
      throw error;
    }
  }

  // تحديث بند الفاتورة
  async updateInvoiceItem(itemId: string, updates: Partial<InvoiceItem>): Promise<InvoiceItem> {
    try {
      const { data, error } = await supabase
        .from(this.itemsTable)
        .update(updates)
        .eq('id', itemId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating invoice item:', error);
      throw error;
    }
  }

  // حذف بند من الفاتورة
  async deleteInvoiceItem(itemId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(this.itemsTable)
        .delete()
        .eq('id', itemId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting invoice item:', error);
      throw error;
    }
  }
}

// تصدير instance واحد للاستخدام في التطبيق
export const invoicesService = new InvoicesService();