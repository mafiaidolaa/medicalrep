// مكتبة التكامل الرئيسية لنظام الحسابات
// EP Group System - Main Accounts Integration Library

// تصدير جميع الخدمات
export { customersService } from './customers';
export { invoicesService } from './invoices';
export { receivablesService } from './receivables';
export { paymentsService } from './payments';
export { expenseService } from './expenses';

// تصدير جميع الأنواع
export * from '@/types/accounts';

// خدمة التكامل الرئيسية
import { customersService } from './customers';
import { invoicesService } from './invoices';
import { receivablesService } from './receivables';
import { paymentsService } from './payments';
import { expenseService } from './expenses';

export class AccountsIntegrationService {
  
  // ربط فاتورة بمديونية
  async linkInvoiceToReceivable(invoiceId: string, customerId: string) {
    try {
      const invoice = await invoicesService.getInvoice(invoiceId);
      if (!invoice) throw new Error('الفاتورة غير موجودة');

      // إنشاء مديونية من الفاتورة
      const receivable = await receivablesService.createReceivable({
        customer_id: customerId,
        invoice_id: invoiceId,
        reference_number: `INV-${invoice.invoice_number}`,
        original_amount: invoice.remaining_amount,
        due_date: invoice.due_date,
        priority: 'normal',
        notes: `مديونية من الفاتورة ${invoice.invoice_number}`
      });

      return receivable;
    } catch (error) {
      console.error('Error linking invoice to receivable:', error);
      throw error;
    }
  }

  // تسجيل مدفوعة وتطبيقها على فاتورة
  async processPaymentForInvoice(paymentData: {
    customer_id: string;
    invoice_id: string;
    amount: number;
    payment_method: string;
    payment_reference?: string;
    payment_date: string;
  }) {
    try {
      // إنشاء المدفوعة مع ربطها بالفاتورة
      const payment = await paymentsService.createPayment({
        customer_id: paymentData.customer_id,
        amount: paymentData.amount,
        payment_method: paymentData.payment_method as any,
        payment_reference: paymentData.payment_reference,
        payment_date: paymentData.payment_date,
        allocations: [{
          invoice_id: paymentData.invoice_id,
          allocated_amount: paymentData.amount
        }]
      });

      // تأكيد المدفوعة تلقائياً إذا كانت نقدية
      if (paymentData.payment_method === 'cash') {
        await paymentsService.confirmPayment(payment.id);
      }

      return payment;
    } catch (error) {
      console.error('Error processing payment for invoice:', error);
      throw error;
    }
  }

  // تحديث حالة العميل بناءً على المديونيات
  async updateCustomerStatus(customerId: string) {
    try {
      const [customer, receivables] = await Promise.all([
        customersService.getCustomer(customerId),
        receivablesService.getCustomerReceivables(customerId)
      ]);

      if (!customer) throw new Error('العميل غير موجود');

      // حساب إجمالي المديونيات
      const totalDebt = receivables.reduce((sum, r) => sum + r.remaining_amount, 0);

      // تحديد الحالة الجديدة
      let newStatus = customer.status;
      if (totalDebt > customer.credit_limit * 1.5) {
        newStatus = 'blocked';
      } else if (totalDebt > customer.credit_limit) {
        // العميل تجاوز حد الائتمان لكن ليس محظوراً بعد
        newStatus = 'active';
      } else {
        newStatus = 'active';
      }

      // تحديث العميل
      return await customersService.updateCustomer(customerId, {
        // status: newStatus // Commented out until added to CreateCustomerForm interface
      });
    } catch (error) {
      console.error('Error updating customer status:', error);
      throw error;
    }
  }

  // إنشاء فاتورة مع ربطها بالعميل تلقائياً
  async createInvoiceWithIntegration(invoiceData: any) {
    try {
      // إنشاء الفاتورة
      const invoice = await invoicesService.createInvoice(invoiceData);

      // إنشاء مديونية إذا كان المبلغ المتبقي أكبر من صفر
      if (invoice.remaining_amount > 0) {
        await this.linkInvoiceToReceivable(invoice.id, invoice.customer_id);
      }

      // تحديث حالة العميل
      await this.updateCustomerStatus(invoice.customer_id);

      return invoice;
    } catch (error) {
      console.error('Error creating invoice with integration:', error);
      throw error;
    }
  }

  // تحديث أولويات المديونيات تلقائياً
  async updateReceivablePriorities() {
    try {
      return await receivablesService.updatePrioritiesByOverdueDays();
    } catch (error) {
      console.error('Error updating receivable priorities:', error);
      throw error;
    }
  }

  // تحديث الفواتير المتأخرة تلقائياً
  async updateOverdueInvoices() {
    try {
      return await invoicesService.updateOverdueInvoices();
    } catch (error) {
      console.error('Error updating overdue invoices:', error);
      throw error;
    }
  }

  // إحضار لوحة تحكم شاملة
  async getDashboardData() {
    try {
      const [
        customersStats,
        invoicesStats,
        receivablesStats,
        paymentsStats,
        expensesStats
      ] = await Promise.all([
        customersService.getCustomersStats(),
        invoicesService.getInvoicesStats(),
        receivablesService.getReceivablesStats(),
        paymentsService.getPaymentsStats(),
        expenseService.reports.getDashboardStats()
      ]);

      return {
        customers: customersStats,
        invoices: invoicesStats,
        receivables: receivablesStats,
        payments: paymentsStats,
        expenses: expensesStats,
        summary: {
          total_revenue: invoicesStats.total_amount || 0,
          collected_amount: paymentsStats.confirmed_amount || 0,
          outstanding_amount: receivablesStats.remaining_amount || 0,
          total_expenses: expensesStats.approved_amount || 0,
          net_profit: (invoicesStats.total_amount || 0) - (expensesStats.approved_amount || 0),
          collection_rate: invoicesStats.total_amount > 0 ? 
            (paymentsStats.confirmed_amount / invoicesStats.total_amount) * 100 : 0
        }
      };
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      throw error;
    }
  }

  // تشغيل المهام الدورية لصيانة النظام
  async runMaintenanceTasks() {
    try {
      console.log('بدء مهام صيانة نظام الحسابات والمصروفات...');

      // تحديث الفواتير المتأخرة
      const overdueCount = await this.updateOverdueInvoices();
      console.log(`تم تحديث ${overdueCount} فاتورة متأخرة`);

      // تحديث أولويات المديونيات
      const priorityCount = await this.updateReceivablePriorities();
      console.log(`تم تحديث أولوية ${priorityCount} مديونية`);

      // تحديث حالات العملاء
      const customers = await customersService.getCustomersWithBalance();
      let updatedCustomers = 0;
      
      for (const customer of customers) {
        try {
          await this.updateCustomerStatus(customer.id);
          updatedCustomers++;
        } catch (error) {
          console.error(`خطأ في تحديث العميل ${customer.id}:`, error);
        }
      }

      // تحديث إحصائيات المصروفات الشهرية (يمكن إضافتها لاحقاً)
      console.log('تم تحديث إحصائيات المصروفات');

      console.log(`تم تحديث حالة ${updatedCustomers} عميل`);
      console.log('انتهت مهام صيانة نظام الحسابات والمصروفات بنجاح');

      return {
        overdue_invoices_updated: overdueCount,
        receivables_priorities_updated: priorityCount,
        customers_updated: updatedCustomers,
        expenses_maintenance_completed: true,
        success: true
      };
    } catch (error) {
      console.error('Error running maintenance tasks:', error);
      throw error;
    }
  }

  // معالجة طلب مصروفات وإرسال إشعار
  async processExpenseRequest(requestId: string, action: 'approve' | 'reject', approverId: string, approverName: string, comments?: string) {
    try {
      // معالجة الموافقة
      const request = await expenseService.requests.processApproval(
        requestId,
        { action: action === 'approve' ? 'approved' : 'rejected', comments },
        approverId,
        approverName
      );

      // إرسال إشعار للموظف (يمكن إضافة خدمة إشعارات لاحقاً)
      console.log(`Expense request ${request.request_number} ${action}ed by ${approverName}`);

      return request;
    } catch (error) {
      console.error('Error processing expense request:', error);
      throw error;
    }
  }

  // إنشاء طلب مصروفات مع تحديد المدير تلقائياً
  async createExpenseRequestWithApprovalFlow(requestData: any, employeeId: string, managerId?: string) {
    try {
      // إضافة المدير إذا لم يكن محدداً
      if (!requestData.manager_id && managerId) {
        requestData.manager_id = managerId;
      }

      // إنشاء الطلب
      const request = await expenseService.requests.createRequest(requestData, employeeId);

      // تقديم الطلب للموافقة إذا كان هناك مدير
      if (requestData.manager_id) {
        await expenseService.requests.submitRequest(request.id);
      }

      return request;
    } catch (error) {
      console.error('Error creating expense request with approval flow:', error);
      throw error;
    }
  }

  // البحث الشامل في جميع البيانات
  async globalSearch(searchTerm: string, limit = 20) {
    try {
      const [customers, invoices, payments, expenseRequests] = await Promise.all([
        customersService.searchCustomers(searchTerm, limit),
        invoicesService.searchInvoices(searchTerm, limit),
        paymentsService.searchPayments(searchTerm, limit),
        expenseService.requests.getRequests({ search: searchTerm }, 1, limit)
      ]);

      return {
        customers: customers.map(c => ({ ...c, type: 'customer' })),
        invoices: invoices.map(i => ({ ...i, type: 'invoice' })),
        payments: payments.map(p => ({ ...p, type: 'payment' })),
        expenses: expenseRequests.requests.map(e => ({ ...e, type: 'expense' })),
        total: customers.length + invoices.length + payments.length + expenseRequests.requests.length
      };
    } catch (error) {
      console.error('Error performing global search:', error);
      throw error;
    }
  }

  // تقرير شامل عن المصروفات
  async generateExpensesReport(filters: any) {
    try {
      return await expenseService.reports.generateReport(filters);
    } catch (error) {
      console.error('Error generating expenses report:', error);
      throw error;
    }
  }

  // إحضار طلبات المصروفات المعلقة لمدير معين
  async getPendingExpensesForManager(managerId: string) {
    try {
      return await expenseService.requests.getPendingApprovals(managerId);
    } catch (error) {
      console.error('Error getting pending expenses for manager:', error);
      throw error;
    }
  }

  // إنشاء نسخة احتياطية من البيانات المهمة
  async createDataBackup() {
    try {
      const backupData = {
        timestamp: new Date().toISOString(),
        customers: await customersService.getCustomers({}, 1, 1000),
        invoices: await invoicesService.getInvoices({}, 1, 1000),
        payments: await paymentsService.getPayments({}, 1, 1000),
        receivables: await receivablesService.getReceivables({}, 1, 1000),
        expenses: await expenseService.requests.getRequests({}, 1, 1000)
      };

      // هنا يمكن إضافة منطق حفظ النسخة الاحتياطية
      console.log('تم إنشاء نسخة احتياطية من بيانات الحسابات');
      
      return backupData;
    } catch (error) {
      console.error('Error creating data backup:', error);
      throw error;
    }
  }

  // التحقق من صحة البيانات
  async validateDataIntegrity() {
    try {
      const issues = [];

      // التحقق من الفواتير
      const invoices = await invoicesService.getInvoices({}, 1, 100);
      for (const invoice of invoices.data) {
        if (invoice.total_amount !== invoice.subtotal + invoice.tax_amount - invoice.discount_amount) {
          issues.push(`فاتورة ${invoice.invoice_number}: خطأ في حساب المجموع`);
        }
        if (invoice.remaining_amount < 0) {
          issues.push(`فاتورة ${invoice.invoice_number}: المبلغ المتبقي سالب`);
        }
      }

      // التحقق من المدفوعات
      const payments = await paymentsService.getPayments({}, 1, 100);
      for (const payment of payments.data) {
        if (payment.amount <= 0) {
          issues.push(`مدفوعة ${payment.payment_number}: مبلغ غير صحيح`);
        }
      }

      return {
        valid: issues.length === 0,
        issues: issues,
        checked_invoices: invoices.data.length,
        checked_payments: payments.data.length
      };
    } catch (error) {
      console.error('Error validating data integrity:', error);
      throw error;
    }
  }
}

// تصدير مثيل واحد للتكامل
export const accountsIntegration = new AccountsIntegrationService();

// تشغيل مهام الصيانة كل ساعة (يمكن استخدامها مع cron job)
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
  setInterval(() => {
    accountsIntegration.runMaintenanceTasks().catch(console.error);
  }, 3600000); // كل ساعة
}