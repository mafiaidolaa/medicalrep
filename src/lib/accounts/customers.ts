// @ts-nocheck

// مكتبة إدارة العملاء
// EP Group System - Customers Management Library

import { supabase } from '@/lib/supabase';
import { Customer, CreateCustomerForm, CustomerFilters } from '@/types/accounts';

export class CustomersService {
  private table = 'customers';

  // إحضار جميع العملاء مع الفلترة
  async getCustomers(filters?: CustomerFilters, page = 1, limit = 50) {
    try {
      let query = supabase
        .from(this.table)
        .select('*')
        .order('created_at', { ascending: false });

      // تطبيق الفلاتر
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,customer_code.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters?.customer_type) {
        query = query.eq('customer_type', filters.customer_type);
      }
      
      if (filters?.has_balance) {
        query = query.gt('balance', 0);
      }
      
      if (filters?.over_credit_limit) {
        query = query.filter('balance', 'gt', 'credit_limit');
      }

      // تطبيق التصفح (Pagination)
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        data: data as Customer[],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        currentPage: page,
        hasNext: to < (count || 0) - 1,
        hasPrevious: page > 1
      };
    } catch (error) {
      console.error('Error fetching customers:', error);
      throw error;
    }
  }

  // إحضار عميل واحد
  async getCustomer(id: string): Promise<Customer | null> {
    try {
      const { data, error } = await supabase
        .from(this.table)
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching customer:', error);
      throw error;
    }
  }

  // البحث عن عميل بالكود
  async getCustomerByCode(customerCode: string): Promise<Customer | null> {
    try {
      const { data, error } = await supabase
        .from(this.table)
        .select('*')
        .eq('customer_code', customerCode)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching customer by code:', error);
      throw error;
    }
  }

  // إنشاء عميل جديد
  async createCustomer(customerData: CreateCustomerForm): Promise<Customer> {
    try {
      // التحقق من عدم وجود كود العميل مسبقاً
      const existingCustomer = await this.getCustomerByCode(customerData.customer_code);
      if (existingCustomer) {
        throw new Error('كود العميل موجود مسبقاً');
      }

      const { data, error } = await supabase
        .from(this.table)
        .insert([customerData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  }

  // تحديث بيانات العميل
  async updateCustomer(id: string, updates: Partial<CreateCustomerForm>): Promise<Customer> {
    try {
      // إذا كان يتم تحديث كود العميل، التحقق من عدم وجوده
      if (updates.customer_code) {
        const existingCustomer = await this.getCustomerByCode(updates.customer_code);
        if (existingCustomer && existingCustomer.id !== id) {
          throw new Error('كود العميل موجود مسبقاً');
        }
      }

      const { data, error } = await supabase
        .from(this.table)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  }

  // حذف العميل (soft delete - تغيير الحالة إلى غير نشط)
  async deactivateCustomer(id: string): Promise<Customer> {
    try {
      const { data, error } = await supabase
        .from(this.table)
        .update({ status: 'inactive' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error deactivating customer:', error);
      throw error;
    }
  }

  // تفعيل العميل
  async activateCustomer(id: string): Promise<Customer> {
    try {
      const { data, error } = await supabase
        .from(this.table)
        .update({ status: 'active' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error activating customer:', error);
      throw error;
    }
  }

  // إحضار العملاء النشطين فقط (للقوائم المنسدلة)
  async getActiveCustomers(): Promise<Customer[]> {
    try {
      const { data, error } = await supabase
        .from(this.table)
        .select('id, customer_code, name, phone, email, balance, credit_limit')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching active customers:', error);
      throw error;
    }
  }

  // إحضار العملاء المدينين
  async getCustomersWithBalance(): Promise<Customer[]> {
    try {
      const { data, error } = await supabase
        .from(this.table)
        .select('*')
        .eq('status', 'active')
        .gt('balance', 0)
        .order('balance', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching customers with balance:', error);
      throw error;
    }
  }

  // إحضار العملاء الذين تجاوزوا حد الائتمان
  async getCustomersOverCreditLimit(): Promise<Customer[]> {
    try {
      const { data, error } = await supabase
        .from(this.table)
        .select('*')
        .eq('status', 'active')
        .filter('balance', 'gt', 'credit_limit')
        .order('balance', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching customers over credit limit:', error);
      throw error;
    }
  }

  // إحضار إحصائيات العملاء
  async getCustomersStats() {
    try {
      const [totalResult, activeResult, withBalanceResult, overLimitResult] = await Promise.all([
        supabase.from(this.table).select('id', { count: 'exact', head: true }),
        supabase.from(this.table).select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from(this.table).select('id', { count: 'exact', head: true }).gt('balance', 0),
        supabase.from(this.table).select('id', { count: 'exact', head: true }).filter('balance', 'gt', 'credit_limit')
      ]);

      const totalBalanceResult = await supabase
        .from(this.table)
        .select('balance')
        .eq('status', 'active');

      const totalBalance = totalBalanceResult.data?.reduce((sum, customer) => sum + customer.balance, 0) || 0;

      return {
        total_customers: totalResult.count || 0,
        active_customers: activeResult.count || 0,
        customers_with_balance: withBalanceResult.count || 0,
        customers_over_limit: overLimitResult.count || 0,
        total_balance: totalBalance
      };
    } catch (error) {
      console.error('Error fetching customers stats:', error);
      throw error;
    }
  }

  // توليد كود عميل جديد
  async generateCustomerCode(): Promise<string> {
    try {
      // البحث عن آخر كود عميل
      const { data, error } = await supabase
        .from(this.table)
        .select('customer_code')
        .like('customer_code', 'C%')
        .order('customer_code', { ascending: false })
        .limit(1);

      if (error) throw error;

      let nextNumber = 1;
      if (data && data.length > 0) {
        const lastCode = data[0].customer_code;
        const lastNumber = parseInt(lastCode.replace('C', ''));
        nextNumber = lastNumber + 1;
      }

      return `C${nextNumber.toString().padStart(3, '0')}`;
    } catch (error) {
      console.error('Error generating customer code:', error);
      throw error;
    }
  }

  // البحث في العملاء
  async searchCustomers(searchTerm: string, limit = 10): Promise<Customer[]> {
    try {
      const { data, error } = await supabase
        .from(this.table)
        .select('*')
        .or(`name.ilike.%${searchTerm}%,customer_code.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
        .eq('status', 'active')
        .order('name')
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching customers:', error);
      throw error;
    }
  }

  // تحديث رصيد العميل
  async updateCustomerBalance(customerId: string, newBalance: number): Promise<Customer> {
    try {
      const { data, error } = await supabase
        .from(this.table)
        .update({ balance: newBalance })
        .eq('id', customerId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating customer balance:', error);
      throw error;
    }
  }

  // إضافة مبلغ لرصيد العميل
  async addToCustomerBalance(customerId: string, amount: number): Promise<Customer> {
    try {
      const customer = await this.getCustomer(customerId);
      if (!customer) throw new Error('العميل غير موجود');

      const newBalance = customer.balance + amount;
      return await this.updateCustomerBalance(customerId, newBalance);
    } catch (error) {
      console.error('Error adding to customer balance:', error);
      throw error;
    }
  }

  // خصم مبلغ من رصيد العميل
  async deductFromCustomerBalance(customerId: string, amount: number): Promise<Customer> {
    try {
      const customer = await this.getCustomer(customerId);
      if (!customer) throw new Error('العميل غير موجود');

      const newBalance = customer.balance - amount;
      return await this.updateCustomerBalance(customerId, newBalance);
    } catch (error) {
      console.error('Error deducting from customer balance:', error);
      throw error;
    }
  }
}

// تصدير instance واحد للاستخدام في التطبيق
export const customersService = new CustomersService();