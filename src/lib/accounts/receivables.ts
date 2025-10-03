// @ts-nocheck

// مكتبة إدارة المديونيات
// EP Group System - Receivables Management Library

import { supabase } from '@/lib/supabase';
import { Receivable, ReceivableFilters, CollectionHistory } from '@/types/accounts';

export class ReceivablesService {
  private table = 'receivables';
  private historyTable = 'collection_history';

  // إحضار جميع المديونيات مع الفلترة
  async getReceivables(filters?: ReceivableFilters, page = 1, limit = 50) {
    try {
      let query = supabase
        .from(this.table)
        .select(`
          *,
          customer:customers(id, customer_code, name, phone, email, address),
          invoice:invoices(id, invoice_number, invoice_date)
        `)
        .order('created_at', { ascending: false });

      // تطبيق الفلاتر
      if (filters?.search) {
        query = query.or(
          `reference_number.ilike.%${filters.search}%,` +
          `customer.name.ilike.%${filters.search}%,` +
          `customer.customer_code.ilike.%${filters.search}%,` +
          `customer.phone.ilike.%${filters.search}%`
        );
      }
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters?.priority) {
        query = query.eq('priority', filters.priority);
      }
      
      if (filters?.customer_id) {
        query = query.eq('customer_id', filters.customer_id);
      }
      
      if (filters?.overdue_only) {
        query = query.gt('overdue_days', 0);
      }
      
      if (filters?.date_from) {
        query = query.gte('due_date', filters.date_from);
      }
      
      if (filters?.date_to) {
        query = query.lte('due_date', filters.date_to);
      }
      
      if (filters?.amount_from) {
        query = query.gte('remaining_amount', filters.amount_from);
      }
      
      if (filters?.amount_to) {
        query = query.lte('remaining_amount', filters.amount_to);
      }

      // تطبيق التصفح (Pagination)
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        data: data as Receivable[],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        currentPage: page,
        hasNext: to < (count || 0) - 1,
        hasPrevious: page > 1
      };
    } catch (error) {
      console.error('Error fetching receivables:', error);
      throw error;
    }
  }

  // إحضار مديونية واحدة
  async getReceivable(id: string): Promise<Receivable | null> {
    try {
      const { data, error } = await supabase
        .from(this.table)
        .select(`
          *,
          customer:customers(*),
          invoice:invoices(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching receivable:', error);
      throw error;
    }
  }

  // إنشاء مديونية جديدة
  async createReceivable(receivableData: {
    customer_id: string;
    invoice_id?: string;
    reference_number?: string;
    original_amount: number;
    due_date: string;
    priority?: string;
    notes?: string;
  }): Promise<Receivable> {
    try {
      const { data, error } = await supabase
        .from(this.table)
        .insert([{
          ...receivableData,
          remaining_amount: receivableData.original_amount,
          status: 'pending'
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating receivable:', error);
      throw error;
    }
  }

  // تحديث بيانات المديونية
  async updateReceivable(id: string, updates: Partial<{
    priority: string;
    notes: string;
    status: string;
    remaining_amount: number;
  }>): Promise<Receivable> {
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
      console.error('Error updating receivable:', error);
      throw error;
    }
  }

  // شطب المديونية
  async writeOffReceivable(id: string): Promise<Receivable> {
    try {
      const { data, error } = await supabase
        .from(this.table)
        .update({ 
          status: 'written_off',
          remaining_amount: 0 
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error writing off receivable:', error);
      throw error;
    }
  }

  // تسجيل دفعة جزئية
  async recordPartialPayment(id: string, paymentAmount: number): Promise<Receivable> {
    try {
      const receivable = await this.getReceivable(id);
      if (!receivable) throw new Error('المديونية غير موجودة');

      const newRemainingAmount = Math.max(0, receivable.remaining_amount - paymentAmount);
      const newStatus = newRemainingAmount === 0 ? 'paid' : 'partially_paid';

      const { data, error } = await supabase
        .from(this.table)
        .update({ 
          remaining_amount: newRemainingAmount,
          status: newStatus 
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error recording partial payment:', error);
      throw error;
    }
  }

  // إحضار المديونيات المتأخرة
  async getOverdueReceivables(limit = 50): Promise<Receivable[]> {
    try {
      const { data, error } = await supabase
        .from(this.table)
        .select(`
          *,
          customer:customers(id, customer_code, name, phone, email)
        `)
        .gt('overdue_days', 0)
        .gt('remaining_amount', 0)
        .neq('status', 'written_off')
        .order('overdue_days', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching overdue receivables:', error);
      throw error;
    }
  }

  // إحضار المديونيات عالية الأولوية
  async getHighPriorityReceivables(limit = 50): Promise<Receivable[]> {
    try {
      const { data, error } = await supabase
        .from(this.table)
        .select(`
          *,
          customer:customers(id, customer_code, name, phone, email)
        `)
        .in('priority', ['high', 'urgent'])
        .gt('remaining_amount', 0)
        .neq('status', 'written_off')
        .order('priority', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching high priority receivables:', error);
      throw error;
    }
  }

  // إحضار مديونيات العميل
  async getCustomerReceivables(customerId: string, includeHistory = false): Promise<Receivable[]> {
    try {
      let selectQuery = `
        *,
        customer:customers(id, customer_code, name, phone, email),
        invoice:invoices(id, invoice_number, invoice_date)
      `;

      if (includeHistory) {
        selectQuery += ',collection_history(*)';
      }

      const { data, error } = await supabase
        .from(this.table)
        .select(selectQuery)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching customer receivables:', error);
      throw error;
    }
  }

  // إحضار إحصائيات المديونيات
  async getReceivablesStats() {
    try {
      const [totalResult, overdueResult, highPriorityResult, paidResult] = await Promise.all([
        supabase.from(this.table).select('id', { count: 'exact', head: true }),
        supabase.from(this.table).select('id', { count: 'exact', head: true })
          .gt('overdue_days', 0).gt('remaining_amount', 0),
        supabase.from(this.table).select('id', { count: 'exact', head: true })
          .in('priority', ['high', 'urgent']).gt('remaining_amount', 0),
        supabase.from(this.table).select('id', { count: 'exact', head: true })
          .eq('status', 'paid')
      ]);

      // حساب إجمالي المبالغ
      const totalAmountResult = await supabase
        .from(this.table)
        .select('original_amount, remaining_amount, overdue_days')
        .gt('remaining_amount', 0)
        .neq('status', 'written_off');

      const totals = totalAmountResult.data?.reduce(
        (acc, receivable) => ({
          total_amount: acc.total_amount + receivable.original_amount,
          remaining_amount: acc.remaining_amount + receivable.remaining_amount,
          overdue_amount: acc.overdue_amount + 
            (receivable.overdue_days > 0 ? receivable.remaining_amount : 0),
          total_overdue_days: acc.total_overdue_days + Math.max(0, receivable.overdue_days),
          count: acc.count + 1
        }),
        { 
          total_amount: 0, 
          remaining_amount: 0, 
          overdue_amount: 0, 
          total_overdue_days: 0,
          count: 0 
        }
      ) || { 
        total_amount: 0, 
        remaining_amount: 0, 
        overdue_amount: 0, 
        total_overdue_days: 0,
        count: 0 
      };

      return {
        total_receivables: totalResult.count || 0,
        overdue_receivables: overdueResult.count || 0,
        high_priority_receivables: highPriorityResult.count || 0,
        paid_receivables: paidResult.count || 0,
        total_amount: totals.total_amount,
        remaining_amount: totals.remaining_amount,
        overdue_amount: totals.overdue_amount,
        average_overdue_days: totals.count > 0 ? Math.round(totals.total_overdue_days / totals.count) : 0
      };
    } catch (error) {
      console.error('Error fetching receivables stats:', error);
      throw error;
    }
  }

  // البحث في المديونيات
  async searchReceivables(searchTerm: string, limit = 10): Promise<Receivable[]> {
    try {
      const { data, error } = await supabase
        .from(this.table)
        .select(`
          *,
          customer:customers(id, customer_code, name, phone, email)
        `)
        .or(
          `reference_number.ilike.%${searchTerm}%,` +
          `customer.name.ilike.%${searchTerm}%,` +
          `customer.customer_code.ilike.%${searchTerm}%`
        )
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching receivables:', error);
      throw error;
    }
  }

  // تحديث الأولوية بناءً على أيام التأخر
  async updatePrioritiesByOverdueDays(): Promise<number> {
    try {
      let updatedCount = 0;

      // تحديث الأولوية للمديونيات المتأخرة أكثر من 90 يوم إلى عاجل
      const { data: urgent, error: urgentError } = await supabase
        .from(this.table)
        .update({ priority: 'urgent' })
        .gt('overdue_days', 90)
        .gt('remaining_amount', 0)
        .neq('status', 'written_off')
        .neq('priority', 'urgent')
        .select('id');

      if (urgentError) throw urgentError;
      updatedCount += urgent?.length || 0;

      // تحديث الأولوية للمديونيات المتأخرة 60-90 يوم إلى عالي
      const { data: high, error: highError } = await supabase
        .from(this.table)
        .update({ priority: 'high' })
        .gte('overdue_days', 60)
        .lte('overdue_days', 90)
        .gt('remaining_amount', 0)
        .neq('status', 'written_off')
        .neq('priority', 'high')
        .neq('priority', 'urgent')
        .select('id');

      if (highError) throw highError;
      updatedCount += high?.length || 0;

      return updatedCount;
    } catch (error) {
      console.error('Error updating priorities:', error);
      throw error;
    }
  }

  // === وظائف سجل التحصيل ===

  // إضافة نشاط تحصيل
  async addCollectionActivity(activityData: {
    customer_id: string;
    action_type: string;
    action_date: string;
    action_time?: string;
    contact_person?: string;
    result?: string;
    promised_date?: string;
    promised_amount?: number;
    notes?: string;
    next_action?: string;
    next_action_date?: string;
  }): Promise<CollectionHistory> {
    try {
      const { data, error } = await supabase
        .from(this.historyTable)
        .insert([activityData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding collection activity:', error);
      throw error;
    }
  }

  // إحضار سجل التحصيل للعميل
  async getCustomerCollectionHistory(customerId: string, limit = 50): Promise<CollectionHistory[]> {
    try {
      const { data, error } = await supabase
        .from(this.historyTable)
        .select(`
          *,
          customer:customers(id, customer_code, name, phone, email)
        `)
        .eq('customer_id', customerId)
        .order('action_date', { ascending: false })
        .order('action_time', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching customer collection history:', error);
      throw error;
    }
  }

  // إحضار الأنشطة المجدولة لليوم
  async getTodayScheduledActivities(): Promise<CollectionHistory[]> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from(this.historyTable)
        .select(`
          *,
          customer:customers(id, customer_code, name, phone, email)
        `)
        .eq('next_action_date', today)
        .not('next_action', 'is', null)
        .order('customer.name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching today scheduled activities:', error);
      throw error;
    }
  }

  // إحضار آخر نشاط تحصيل للعميل
  async getLastCollectionActivity(customerId: string): Promise<CollectionHistory | null> {
    try {
      const { data, error } = await supabase
        .from(this.historyTable)
        .select('*')
        .eq('customer_id', customerId)
        .order('action_date', { ascending: false })
        .order('action_time', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      return data || null;
    } catch (error) {
      console.error('Error fetching last collection activity:', error);
      throw error;
    }
  }

  // إحصائيات التحصيل
  async getCollectionStats() {
    try {
      const [todayActivities, weekActivities, monthActivities] = await Promise.all([
        supabase.from(this.historyTable)
          .select('id', { count: 'exact', head: true })
          .eq('action_date', new Date().toISOString().split('T')[0]),
        
        supabase.from(this.historyTable)
          .select('id', { count: 'exact', head: true })
          .gte('action_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
        
        supabase.from(this.historyTable)
          .select('id', { count: 'exact', head: true })
          .gte('action_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      ]);

      // إحصائيات النتائج
      const resultsResult = await supabase
        .from(this.historyTable)
        .select('result')
        .not('result', 'is', null)
        .gte('action_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      const resultsCounts = resultsResult.data?.reduce((acc: any, item) => {
        acc[item.result] = (acc[item.result] || 0) + 1;
        return acc;
      }, {}) || {};

      return {
        today_activities: todayActivities.count || 0,
        week_activities: weekActivities.count || 0,
        month_activities: monthActivities.count || 0,
        results_breakdown: resultsCounts
      };
    } catch (error) {
      console.error('Error fetching collection stats:', error);
      throw error;
    }
  }

  // حذف المديونية
  async deleteReceivable(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(this.table)
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting receivable:', error);
      throw error;
    }
  }
}

// تصدير instance واحد للاستخدام في التطبيق
export const receivablesService = new ReceivablesService();