import { supabase } from './supabase';
import type { Database } from './database.types';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth';

// Type definitions
type InvoiceInsert = Database['public']['Tables']['invoices']['Insert'];
type InvoiceUpdate = Database['public']['Tables']['invoices']['Update'];
type InvoiceRow = Database['public']['Tables']['invoices']['Row'];

type DebtInsert = Database['public']['Tables']['debts']['Insert'];
type DebtUpdate = Database['public']['Tables']['debts']['Update'];
type DebtRow = Database['public']['Tables']['debts']['Row'];

type ExpenseInsert = Database['public']['Tables']['expenses']['Insert'];
type ExpenseUpdate = Database['public']['Tables']['expenses']['Update'];
type ExpenseRow = Database['public']['Tables']['expenses']['Row'];

type CollectionInsert = Database['public']['Tables']['collections']['Insert'];
type CollectionUpdate = Database['public']['Tables']['collections']['Update'];
type CollectionRow = Database['public']['Tables']['collections']['Row'];

// Helper function to get current user ID
async function getCurrentUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('User not authenticated');
  }
  return session.user.id;
}

// Helper function to generate invoice number
function generateInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `INV-${year}${month}-${random}`;
}

// INVOICE SERVICES
export const invoiceServices = {
  // Create new invoice
  async create(data: Omit<InvoiceInsert, 'created_by' | 'invoice_number'>): Promise<InvoiceRow> {
    const userId = await getCurrentUserId();
    const invoiceNumber = generateInvoiceNumber();
    
    const insertData: InvoiceInsert = {
      ...data,
      invoice_number: invoiceNumber,
      created_by: userId,
      status: data.status || 'pending'
    };

    const { data: invoice, error } = await (supabase as any)
      .from('invoices')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating invoice:', error);
      throw new Error(`فشل في إنشاء الفاتورة: ${error.message}`);
    }

    // Log invoice creation
    try {
      const { activityLogger } = await import('./activity-logger');
      await activityLogger.logInvoiceCreate(
        (invoice as any).id,
        (invoice as any).invoice_number,
        (invoice as any).client_name,
        (invoice as any).amount
      );
    } catch (logError) {
      console.warn('Failed to log invoice creation:', logError);
    }

    return invoice;
  },

  // Get all invoices (with optional pagination)
  async getAll(opts: { limit?: number; offset?: number } = {}): Promise<InvoiceRow[]> {
    const { limit = 200, offset = 0 } = opts;
    const { data: invoices, error } = await (supabase as any)
      .from('invoices')
      .select(`
        *,
        clinics:clinic_id (
          name,
          doctor_name
        ),
        users:created_by (
          full_name
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching invoices:', error);
      throw new Error(`فشل في جلب الفواتير: ${error.message}`);
    }

    return invoices || [];
  },

  // Get invoice by ID
  async getById(id: string): Promise<InvoiceRow | null> {
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        *,
        clinics:clinic_id (
          name,
          doctor_name
        ),
        users:created_by (
          full_name
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching invoice:', error);
      return null;
    }

    return invoice;
  },

  // Update invoice
  async update(id: string, data: InvoiceUpdate): Promise<InvoiceRow> {
    const updateData: InvoiceUpdate = {
      ...data,
      updated_at: new Date().toISOString()
    };

    const { data: invoice, error } = await (supabase as any)
      .from('invoices')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating invoice:', error);
      throw new Error(`فشل في تحديث الفاتورة: ${error.message}`);
    }

    return invoice;
  },

  // Delete invoice
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting invoice:', error);
      throw new Error(`فشل في حذف الفاتورة: ${error.message}`);
    }
  }
};

// DEBT SERVICES
export const debtServices = {
  // Create new debt
  async create(data: Omit<DebtInsert, 'created_by'>): Promise<DebtRow> {
    const userId = await getCurrentUserId();
    
    const insertData: DebtInsert = {
      ...data,
      created_by: userId,
      status: data.status || 'current'
    };

    const { data: debt, error } = await (supabase as any)
      .from('debts')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating debt:', error);
      throw new Error(`فشل في إنشاء المديونية: ${error.message}`);
    }

    // Log debt registration
    try {
      const { activityLogger } = await import('./activity-logger');
      await activityLogger.logCustom(
        'create_debt',
        'debt',
        (debt as any).id,
        `تسجيل دين جديد: ${(debt as any).client_name}`,
        `تم تسجيل دين جديد بقيمة ${(debt as any).amount} ريال على العميل ${(debt as any).client_name}`,
        'create'
      );
    } catch (logError) {
      console.warn('Failed to log debt creation:', logError);
    }

    return debt;
  },

  // Get all debts (with optional pagination)
  async getAll(opts: { limit?: number; offset?: number } = {}): Promise<DebtRow[]> {
    const { limit = 200, offset = 0 } = opts;
    const { data: debts, error } = await (supabase as any)
      .from('debts')
      .select(`
        *,
        clinics:clinic_id (
          name,
          doctor_name
        ),
        users:created_by (
          full_name
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching debts:', error);
      throw new Error(`فشل في جلب المديونيات: ${error.message}`);
    }

    return debts || [];
  },

  // Update debt
  async update(id: string, data: DebtUpdate): Promise<DebtRow> {
    const updateData: DebtUpdate = {
      ...data,
      updated_at: new Date().toISOString()
    };

    const { data: debt, error } = await (supabase as any)
      .from('debts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating debt:', error);
      throw new Error(`فشل في تحديث المديونية: ${error.message}`);
    }

    return debt;
  },

  // Delete debt
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('debts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting debt:', error);
      throw new Error(`فشل في حذف المديونية: ${error.message}`);
    }
  }
};

// EXPENSE SERVICES
export const expenseServices = {
  // Create new expense
  async create(data: Omit<ExpenseInsert, 'created_by'>): Promise<ExpenseRow> {
    const userId = await getCurrentUserId();
    
    const insertData: ExpenseInsert = {
      ...data,
      created_by: userId,
      status: data.status || 'pending'
    };

    const { data: expense, error } = await (supabase as any)
      .from('expenses')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating expense:', error);
      throw new Error(`فشل في إنشاء النفقة: ${error.message}`);
    }

    // Log expense creation
    try {
      const { activityLogger } = await import('./activity-logger');
      await activityLogger.logExpenseCreate(
        (expense as any).id,
        (expense as any).description,
        (expense as any).amount
      );
    } catch (logError) {
      console.warn('Failed to log expense creation:', logError);
    }

    return expense;
  },

  // Get all expenses (with optional pagination)
  async getAll(opts: { limit?: number; offset?: number } = {}): Promise<ExpenseRow[]> {
    const { limit = 200, offset = 0 } = opts;
    let base = (supabase as any)
      .from('expenses')
      .select(`
        *,
        created_user:created_by (
          full_name
        ),
        approved_user:approved_by (
          full_name
        )
      `)
      .order('created_at', { ascending: false });
    // Try soft-delete filter
    try { base = base.is('deleted_at', null); } catch (_) {}
    const { data: expenses, error } = await base.range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching expenses:', error);
      throw new Error(`فشل في جلب النفقات: ${error.message}`);
    }

    return expenses || [];
  },

  // Update expense
  async update(id: string, data: ExpenseUpdate): Promise<ExpenseRow> {
    const updateData: ExpenseUpdate = {
      ...data,
      updated_at: new Date().toISOString()
    };

    // If approving/rejecting, set approved_by to current user
    if (data.status && (data.status === 'approved' || data.status === 'rejected')) {
      const userId = await getCurrentUserId();
      updateData.approved_by = userId;
    }

    const { data: expense, error } = await (supabase as any)
      .from('expenses')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating expense:', error);
      throw new Error(`فشل في تحديث النفقة: ${error.message}`);
    }

    return expense;
  },

  // Delete expense (soft-delete)
  async delete(id: string): Promise<void> {
    // Try soft delete first
    let { error } = await (supabase as any)
      .from('expenses')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      if (String(error?.code) === '42703') {
        // fallback hard delete
        const res = await (supabase as any)
          .from('expenses')
          .delete()
          .eq('id', id);
        if (res.error) throw new Error(`فشل في حذف النفقة: ${res.error.message}`);
      } else {
        throw new Error(`فشل في حذف النفقة: ${error.message}`);
      }
    }
  }
};

// COLLECTION SERVICES (Enhanced existing collections table)
export const collectionServices = {
  // Create new collection
  async create(data: Omit<CollectionInsert, 'representative_id'> & { invoice_number?: string }): Promise<CollectionRow> {
    const userId = await getCurrentUserId();
    
    const insertData: CollectionInsert = {
      ...data,
      representative_id: userId
    };

    const { data: collection, error } = await (supabase as any)
      .from('collections')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating collection:', error);
      throw new Error(`فشل في تسجيل التحصيل: ${error.message}`);
    }

    // Log collection creation
    try {
      const { activityLogger } = await import('./activity-logger');
      await activityLogger.logPayment(
        (collection as any).id,
        (collection as any).amount,
        'collection',
        (collection as any).clinic_name || 'Unknown Client'
      );
    } catch (logError) {
      console.warn('Failed to log collection creation:', logError);
    }

    return collection;
  },

  // Get all collections (with optional pagination)
  async getAll(opts: { limit?: number; offset?: number } = {}): Promise<CollectionRow[]> {
    const { limit = 200, offset = 0 } = opts;
    let base = (supabase as any)
      .from('collections')
      .select(`
        *,
        clinics:clinic_id (
          name,
          doctor_name
        ),
        users:representative_id (
          full_name
        )
      `)
      .order('created_at', { ascending: false });
    try { base = base.is('deleted_at', null); } catch (_) {}
    const { data: collections, error } = await base.range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching collections:', error);
      throw new Error(`فشل في جلب التحصيلات: ${error.message}`);
    }

    return collections || [];
  },

  // Update collection
  async update(id: string, data: CollectionUpdate): Promise<CollectionRow> {
    const updateData: CollectionUpdate = {
      ...data,
      updated_at: new Date().toISOString()
    };

    const { data: collection, error } = await (supabase as any)
      .from('collections')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating collection:', error);
      throw new Error(`فشل في تحديث التحصيل: ${error.message}`);
    }

    return collection;
  },

  // Delete collection (soft-delete)
  async delete(id: string): Promise<void> {
    let { error } = await (supabase as any)
      .from('collections')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      if (String(error?.code) === '42703') {
        const res = await (supabase as any).from('collections').delete().eq('id', id);
        if (res.error) throw new Error(`فشل في حذف التحصيل: ${res.error.message}`);
      } else {
        throw new Error(`فشل في حذف التحصيل: ${error.message}`);
      }
    }
  }
};

// ANALYTICS SERVICES
export const analyticsServices = {
  // Get financial summary
  async getFinancialSummary() {
    try {
      // Get totals in parallel
      const [invoicesResult, expensesResult, debtsResult, collectionsResult] = await Promise.all([
        (supabase as any).from('invoices').select('amount, status'),
        (supabase as any).from('expenses').select('amount, status'),
        (supabase as any).from('debts').select('amount'),
        (supabase as any).from('collections').select('amount')
      ]);

      const invoices = invoicesResult.data || [];
      const expenses = expensesResult.data || [];
      const debts = debtsResult.data || [];
      const collections = collectionsResult.data || [];

      // Calculate totals
      const totalRevenue = invoices
        .filter((inv: any) => inv.status === 'paid')
        .reduce((sum: number, inv: any) => sum + inv.amount, 0);

      const totalExpenses = expenses
        .filter((exp: any) => exp.status === 'approved')
        .reduce((sum: number, exp: any) => sum + exp.amount, 0);

      const totalDebts = debts.reduce((sum: number, debt: any) => sum + debt.amount, 0);
      const totalCollections = collections.reduce((sum: number, col: any) => sum + col.amount, 0);

      const pendingInvoices = invoices.filter((inv: any) => inv.status === 'pending').length;
      const overdueInvoices = invoices.filter((inv: any) => inv.status === 'overdue').length;
      const pendingExpenses = expenses.filter((exp: any) => exp.status === 'pending').length;

      return {
        totalRevenue,
        totalExpenses,
        totalDebts,
        totalCollections,
        profit: totalRevenue - totalExpenses,
        pendingInvoices,
        overdueInvoices,
        pendingExpenses
      };
    } catch (error) {
      console.error('Error fetching financial summary:', error);
      throw new Error('فشل في جلب الملخص المالي');
    }
  }
};