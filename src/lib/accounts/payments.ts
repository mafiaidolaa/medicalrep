// @ts-nocheck

// مكتبة إدارة المدفوعات
// EP Group System - Payments Management Library

import { supabase } from '@/lib/supabase';
import { Payment, CreatePaymentForm, PaymentFilters, PaymentAllocation } from '@/types/accounts';

export class PaymentsService {
  private table = 'payments';
  private allocationsTable = 'payment_allocations';

  // إحضار جميع المدفوعات مع الفلترة
  async getPayments(filters?: PaymentFilters, page = 1, limit = 50) {
    try {
      let query = supabase
        .from(this.table)
        .select(`
          *,
          customer:customers(id, customer_code, name, phone, email),
          invoice:invoices(id, invoice_number),
          receivable:receivables(id, reference_number),
          allocations:payment_allocations(*)
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      // Try to exclude soft-deleted records
      try {
        // @ts-ignore - may not exist in all schemas
        // NOTE: chaining .is before range to ensure it applies to count
        // This will throw if column doesn't exist
        (query as any) = (query as any).is('deleted_at', null);
      } catch (_) {
        // ignore; fallback without filter
      }

      // تطبيق الفلاتر
      if (filters?.search) {
        query = query.or(
          `payment_number.ilike.%${filters.search}%,` +
          `payment_reference.ilike.%${filters.search}%,` +
          `customer.name.ilike.%${filters.search}%,` +
          `customer.customer_code.ilike.%${filters.search}%`
        );
      }
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters?.payment_method) {
        query = query.eq('payment_method', filters.payment_method);
      }
      
      if (filters?.customer_id) {
        query = query.eq('customer_id', filters.customer_id);
      }
      
      if (filters?.date_from) {
        query = query.gte('payment_date', filters.date_from);
      }
      
      if (filters?.date_to) {
        query = query.lte('payment_date', filters.date_to);
      }
      
      if (filters?.amount_from) {
        query = query.gte('amount', filters.amount_from);
      }
      
      if (filters?.amount_to) {
        query = query.lte('amount', filters.amount_to);
      }

      // تطبيق التصفح (Pagination)
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      // Execute with soft-delete filter; if it fails due to missing column, retry without filter
      let data: any, error: any, count: any;
      let exec = await (query as any);
      data = exec.data; error = exec.error; count = exec.count;
      if (error && String(error?.code) === '42703') {
        // Retry without deleted_at filter
        let retry = await supabase
          .from(this.table)
          .select(`
            *,
            customer:customers(id, customer_code, name, phone, email),
            invoice:invoices(id, invoice_number),
            receivable:receivables(id, reference_number),
            allocations:payment_allocations(*)
          `, { count: 'exact' })
          .order('created_at', { ascending: false })
          .range((page - 1) * limit, (page - 1) * limit + limit - 1);
        data = retry.data; error = retry.error; count = retry.count;
      }

      if (error) throw error;

      return {
        data: data as Payment[],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        currentPage: page,
        hasNext: to < (count || 0) - 1,
        hasPrevious: page > 1
      };
    } catch (error) {
      console.error('Error fetching payments:', error);
      throw error;
    }
  }

  // إحضار مدفوعة واحدة
  async getPayment(id: string): Promise<Payment | null> {
    try {
      let query = supabase
        .from(this.table)
        .select(`
          *,
          customer:customers(*),
          invoice:invoices(*),
          receivable:receivables(*),
          allocations:payment_allocations(*)
        `)
        .eq('id', id);
      try {
        (query as any) = (query as any).is('deleted_at', null);
      } catch (_) {}
      let { data, error } = await (query as any).single();
      if (error && String(error?.code) === '42703') {
        // retry without filter
        const retry = await supabase
          .from(this.table)
          .select(`
            *,
            customer:customers(*),
            invoice:invoices(*),
            receivable:receivables(*),
            allocations:payment_allocations(*)
          `)
          .eq('id', id)
          .single();
        data = retry.data; error = retry.error;
      }

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching payment:', error);
      throw error;
    }
  }

  // البحث عن مدفوعة برقم المدفوعة
  async getPaymentByNumber(paymentNumber: string): Promise<Payment | null> {
    try {
      const { data, error } = await supabase
        .from(this.table)
        .select(`
          *,
          customer:customers(*),
          invoice:invoices(*),
          receivable:receivables(*),
          allocations:payment_allocations(*)
        `)
        .eq('payment_number', paymentNumber)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching payment by number:', error);
      throw error;
    }
  }

  // إنشاء مدفوعة جديدة
  async createPayment(paymentData: CreatePaymentForm): Promise<Payment> {
    try {
      // توليد رقم مدفوعة جديد
      const paymentNumber = await this.generatePaymentNumber();
      
      // إنشاء المدفوعة الأساسية
      const { data: payment, error: paymentError } = await supabase
        .from(this.table)
        .insert([{
          payment_number: paymentNumber,
          customer_id: paymentData.customer_id,
          amount: paymentData.amount,
          payment_method: paymentData.payment_method,
          payment_reference: paymentData.payment_reference,
          payment_date: paymentData.payment_date,
          bank_date: paymentData.bank_date,
          notes: paymentData.notes,
          bank_name: paymentData.bank_name,
          status: 'pending'
        }])
        .select()
        .single();

      if (paymentError) throw paymentError;

      // إضافة توزيعات المدفوعة
      if (paymentData.allocations && paymentData.allocations.length > 0) {
        const allocations = paymentData.allocations.map(allocation => ({
          payment_id: payment.id,
          invoice_id: allocation.invoice_id,
          receivable_id: allocation.receivable_id,
          allocated_amount: allocation.allocated_amount
        }));

        const { error: allocationsError } = await supabase
          .from(this.allocationsTable)
          .insert(allocations);

        if (allocationsError) throw allocationsError;

        // تحديث الفواتير والمديونيات المرتبطة
        await this.updateRelatedRecords(paymentData.allocations);
      }

      // إحضار المدفوعة المكتملة
      const completedPayment = await this.getPayment(payment.id) as Payment;

      // Log payment creation
      try {
        const { activityLogger } = await import('../activity-logger');
        await activityLogger.logPaymentCreated(
          payment.id,
          'payment',
          paymentData.amount,
          {
            payment_number: paymentNumber,
            customer_id: paymentData.customer_id,
            payment_method: paymentData.payment_method,
            status: 'pending'
          }
        );
      } catch (logError) {
        console.warn('Failed to log payment creation:', logError);
      }

      return completedPayment;
    } catch (error) {
      console.error('Error creating payment:', error);
      throw error;
    }
  }

  // تحديث بيانات المدفوعة
  async updatePayment(id: string, updates: Partial<CreatePaymentForm>): Promise<Payment> {
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
      console.error('Error updating payment:', error);
      throw error;
    }
  }

  // تأكيد المدفوعة
  async confirmPayment(id: string): Promise<Payment> {
    try {
      const { data, error } = await supabase
        .from(this.table)
        .update({ status: 'confirmed' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // تحديث الفواتير والمديونيات المرتبطة
      const payment = await this.getPayment(id);
      if (payment?.allocations) {
        await this.updateRelatedRecords(payment.allocations);
      }

      // Log payment confirmation
      try {
        const { activityLogger } = await import('../activity-logger');
        await activityLogger.logActionPerformed(
          'payment_confirmed',
          `Payment ${payment?.payment_number || id} confirmed`,
          {
            payment_id: id,
            payment_number: payment?.payment_number,
            amount: payment?.amount,
            customer_id: payment?.customer_id,
            status: 'confirmed'
          }
        );
      } catch (logError) {
        console.warn('Failed to log payment confirmation:', logError);
      }

      return data;
    } catch (error) {
      console.error('Error confirming payment:', error);
      throw error;
    }
  }

  // إرجاع المدفوعة (bounced)
  async bouncePayment(id: string): Promise<Payment> {
    try {
      const { data, error } = await supabase
        .from(this.table)
        .update({ status: 'bounced' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // إرجاع المبالغ المسددة في الفواتير والمديونيات
      const payment = await this.getPayment(id);
      if (payment?.allocations) {
        await this.reverseRelatedRecords(payment.allocations);
      }

      // Log payment cancellation
      try {
        const { activityLogger } = await import('../activity-logger');
        await activityLogger.logActionPerformed(
          'payment_cancelled',
          `Payment ${payment?.payment_number || id} cancelled`,
          {
            payment_id: id,
            payment_number: payment?.payment_number,
            amount: payment?.amount,
            customer_id: payment?.customer_id,
            status: 'cancelled'
          }
        );
      } catch (logError) {
        console.warn('Failed to log payment cancellation:', logError);
      }

      return data;
    } catch (error) {
      console.error('Error bouncing payment:', error);
      throw error;
    }
  }

  // إلغاء المدفوعة
  async cancelPayment(id: string): Promise<Payment> {
    try {
      const { data, error } = await supabase
        .from(this.table)
        .update({ status: 'cancelled' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // إرجاع المبالغ المسددة في الفواتير والمديونيات
      const payment = await this.getPayment(id);
      if (payment?.allocations) {
        await this.reverseRelatedRecords(payment.allocations);
      }

      // Log payment bouncing
      try {
        const { activityLogger } = await import('../activity-logger');
        await activityLogger.logActionPerformed(
          'payment_bounced',
          `Payment ${payment?.payment_number || id} bounced`,
          {
            payment_id: id,
            payment_number: payment?.payment_number,
            amount: payment?.amount,
            customer_id: payment?.customer_id,
            status: 'bounced'
          }
        );
      } catch (logError) {
        console.warn('Failed to log payment bouncing:', logError);
      }

      return data;
    } catch (error) {
      console.error('Error cancelling payment:', error);
      throw error;
    }
  }

  // حذف المدفوعة
  async deletePayment(id: string): Promise<void> {
    try {
      // حذف التوزيعات أولاً
      const { error: allocationsError } = await supabase
        .from(this.allocationsTable)
        .delete()
        .eq('payment_id', id);

      if (allocationsError) throw allocationsError;

      // حذف المدفوعة
      const { error: paymentError } = await supabase
        .from(this.table)
        .delete()
        .eq('id', id);

      if (paymentError) throw paymentError;
    } catch (error) {
      console.error('Error deleting payment:', error);
      throw error;
    }
  }

  // إحضار مدفوعات العميل
  async getCustomerPayments(customerId: string, limit = 20): Promise<Payment[]> {
    try {
      const { data, error } = await supabase
        .from(this.table)
        .select(`
          *,
          customer:customers(id, customer_code, name, phone),
          allocations:payment_allocations(*)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching customer payments:', error);
      throw error;
    }
  }

  // إحضار المدفوعات المعلقة
  async getPendingPayments(limit = 50): Promise<Payment[]> {
    try {
      const { data, error } = await supabase
        .from(this.table)
        .select(`
          *,
          customer:customers(id, customer_code, name, phone, email)
        `)
        .eq('status', 'pending')
        .order('payment_date', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching pending payments:', error);
      throw error;
    }
  }

  // إحضار المدفوعات المرتدة
  async getBouncedPayments(limit = 50): Promise<Payment[]> {
    try {
      const { data, error } = await supabase
        .from(this.table)
        .select(`
          *,
          customer:customers(id, customer_code, name, phone, email)
        `)
        .eq('status', 'bounced')
        .order('payment_date', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching bounced payments:', error);
      throw error;
    }
  }

  // إحضار إحصائيات المدفوعات
  async getPaymentsStats() {
    try {
      const [totalResult, pendingResult, confirmedResult, bouncedResult] = await Promise.all([
        supabase.from(this.table).select('id', { count: 'exact', head: true }),
        supabase.from(this.table).select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from(this.table).select('id', { count: 'exact', head: true }).eq('status', 'confirmed'),
        supabase.from(this.table).select('id', { count: 'exact', head: true }).eq('status', 'bounced')
      ]);

      // حساب إجمالي المبالغ
      const totalAmountResult = await supabase
        .from(this.table)
        .select('amount, status, payment_method, payment_date');

      const totals = totalAmountResult.data?.reduce(
        (acc, payment) => ({
          total_amount: acc.total_amount + payment.amount,
          confirmed_amount: acc.confirmed_amount + 
            (payment.status === 'confirmed' ? payment.amount : 0),
          pending_amount: acc.pending_amount + 
            (payment.status === 'pending' ? payment.amount : 0),
          bounced_amount: acc.bounced_amount + 
            (payment.status === 'bounced' ? payment.amount : 0)
        }),
        { 
          total_amount: 0, 
          confirmed_amount: 0, 
          pending_amount: 0, 
          bounced_amount: 0 
        }
      ) || { 
        total_amount: 0, 
        confirmed_amount: 0, 
        pending_amount: 0, 
        bounced_amount: 0 
      };

      // إحصائيات طرق الدفع
      const methodStats = totalAmountResult.data?.reduce((acc: any, payment) => {
        acc[payment.payment_method] = (acc[payment.payment_method] || 0) + payment.amount;
        return acc;
      }, {}) || {};

      return {
        total_payments: totalResult.count || 0,
        pending_payments: pendingResult.count || 0,
        confirmed_payments: confirmedResult.count || 0,
        bounced_payments: bouncedResult.count || 0,
        total_amount: totals.total_amount,
        confirmed_amount: totals.confirmed_amount,
        pending_amount: totals.pending_amount,
        bounced_amount: totals.bounced_amount,
        payment_methods: methodStats
      };
    } catch (error) {
      console.error('Error fetching payments stats:', error);
      throw error;
    }
  }

  // توليد رقم مدفوعة جديد
  async generatePaymentNumber(): Promise<string> {
    try {
      // البحث عن آخر رقم مدفوعة
      const { data, error } = await supabase
        .from(this.table)
        .select('payment_number')
        .like('payment_number', 'PAY%')
        .order('payment_number', { ascending: false })
        .limit(1);

      if (error) throw error;

      let nextNumber = 1;
      if (data && data.length > 0) {
        const lastNumber = data[0].payment_number;
        const numberPart = lastNumber.replace('PAY-', '');
        nextNumber = parseInt(numberPart) + 1;
      }

      return `PAY-${nextNumber.toString().padStart(6, '0')}`;
    } catch (error) {
      console.error('Error generating payment number:', error);
      throw error;
    }
  }

  // البحث في المدفوعات
  async searchPayments(searchTerm: string, limit = 10): Promise<Payment[]> {
    try {
      const { data, error } = await supabase
        .from(this.table)
        .select(`
          *,
          customer:customers(id, customer_code, name, phone)
        `)
        .or(
          `payment_number.ilike.%${searchTerm}%,` +
          `payment_reference.ilike.%${searchTerm}%,` +
          `customer.name.ilike.%${searchTerm}%,` +
          `customer.customer_code.ilike.%${searchTerm}%`
        )
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching payments:', error);
      throw error;
    }
  }

  // إحضار المدفوعات حسب التاريخ
  async getPaymentsByDate(date: string): Promise<Payment[]> {
    try {
      const { data, error } = await supabase
        .from(this.table)
        .select(`
          *,
          customer:customers(id, customer_code, name, phone)
        `)
        .eq('payment_date', date)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching payments by date:', error);
      throw error;
    }
  }

  // إحضار المدفوعات حسب الفترة
  async getPaymentsByPeriod(startDate: string, endDate: string): Promise<Payment[]> {
    try {
      const { data, error } = await supabase
        .from(this.table)
        .select(`
          *,
          customer:customers(id, customer_code, name, phone)
        `)
        .gte('payment_date', startDate)
        .lte('payment_date', endDate)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching payments by period:', error);
      throw error;
    }
  }

  // إحضار تقرير المدفوعات الشهرية
  async getMonthlyPaymentsReport(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('monthly_collections')
        .select('*')
        .order('month', { ascending: false })
        .limit(12);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching monthly payments report:', error);
      throw error;
    }
  }

  // تحديث الفواتير والمديونيات المرتبطة عند تأكيد المدفوعة
  private async updateRelatedRecords(allocations: CreatePaymentAllocationForm[] | PaymentAllocation[]): Promise<void> {
    try {
      for (const allocation of allocations) {
        // تحديث الفاتورة
        if (allocation.invoice_id) {
          const { data: invoice, error: invoiceError } = await supabase
            .from('invoices')
            .select('paid_amount, total_amount')
            .eq('id', allocation.invoice_id)
            .single();

          if (!invoiceError && invoice) {
            const newPaidAmount = invoice.paid_amount + allocation.allocated_amount;
            const remainingAmount = invoice.total_amount - newPaidAmount;
            const newStatus = remainingAmount <= 0 ? 'paid' : 'partially_paid';

            await supabase
              .from('invoices')
              .update({
                paid_amount: newPaidAmount,
                remaining_amount: remainingAmount,
                status: newStatus
              })
              .eq('id', allocation.invoice_id);
          }
        }

        // تحديث المديونية
        if (allocation.receivable_id) {
          const { data: receivable, error: receivableError } = await supabase
            .from('receivables')
            .select('remaining_amount, original_amount')
            .eq('id', allocation.receivable_id)
            .single();

          if (!receivableError && receivable) {
            const newRemainingAmount = Math.max(0, receivable.remaining_amount - allocation.allocated_amount);
            const newStatus = newRemainingAmount === 0 ? 'paid' : 'partially_paid';

            await supabase
              .from('receivables')
              .update({
                remaining_amount: newRemainingAmount,
                status: newStatus
              })
              .eq('id', allocation.receivable_id);
          }
        }
      }
    } catch (error) {
      console.error('Error updating related records:', error);
      throw error;
    }
  }

  // إرجاع المبالغ في الفواتير والمديونيات عند إرجاع أو إلغاء المدفوعة
  private async reverseRelatedRecords(allocations: PaymentAllocation[]): Promise<void> {
    try {
      for (const allocation of allocations) {
        // إرجاع المبلغ في الفاتورة
        if (allocation.invoice_id) {
          const { data: invoice, error: invoiceError } = await supabase
            .from('invoices')
            .select('paid_amount, total_amount')
            .eq('id', allocation.invoice_id)
            .single();

          if (!invoiceError && invoice) {
            const newPaidAmount = Math.max(0, invoice.paid_amount - allocation.allocated_amount);
            const remainingAmount = invoice.total_amount - newPaidAmount;
            const newStatus = newPaidAmount === 0 ? 'sent' : 
                           remainingAmount > 0 ? 'partially_paid' : 'paid';

            await supabase
              .from('invoices')
              .update({
                paid_amount: newPaidAmount,
                remaining_amount: remainingAmount,
                status: newStatus
              })
              .eq('id', allocation.invoice_id);
          }
        }

        // إرجاع المبلغ في المديونية
        if (allocation.receivable_id) {
          const { data: receivable, error: receivableError } = await supabase
            .from('receivables')
            .select('remaining_amount, original_amount')
            .eq('id', allocation.receivable_id)
            .single();

          if (!receivableError && receivable) {
            const newRemainingAmount = receivable.remaining_amount + allocation.allocated_amount;
            const newStatus = newRemainingAmount >= receivable.original_amount ? 'pending' : 'partially_paid';

            await supabase
              .from('receivables')
              .update({
                remaining_amount: Math.min(newRemainingAmount, receivable.original_amount),
                status: newStatus
              })
              .eq('id', allocation.receivable_id);
          }
        }
      }
    } catch (error) {
      console.error('Error reversing related records:', error);
      throw error;
    }
  }

  // إضافة توزيع جديد للمدفوعة
  async addPaymentAllocation(paymentId: string, allocation: Partial<PaymentAllocation>): Promise<PaymentAllocation> {
    try {
      const { data, error } = await supabase
        .from(this.allocationsTable)
        .insert([{ ...allocation, payment_id: paymentId }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding payment allocation:', error);
      throw error;
    }
  }

  // تحديث توزيع المدفوعة
  async updatePaymentAllocation(allocationId: string, updates: Partial<PaymentAllocation>): Promise<PaymentAllocation> {
    try {
      const { data, error } = await supabase
        .from(this.allocationsTable)
        .update(updates)
        .eq('id', allocationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating payment allocation:', error);
      throw error;
    }
  }

  // حذف توزيع المدفوعة
  async deletePaymentAllocation(allocationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(this.allocationsTable)
        .delete()
        .eq('id', allocationId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting payment allocation:', error);
      throw error;
    }
  }
}

// تصدير instance واحد للاستخدام في التطبيق
export const paymentsService = new PaymentsService();