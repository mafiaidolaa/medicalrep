#!/usr/bin/env node

/**
 * 🌱 EP Group System - Demo Data Seeder
 * إضافة بيانات تجريبية للنظام
 */

const Database = require('better-sqlite3');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  title: (msg) => console.log(`${colors.magenta}${colors.bright}🌱 ${msg}${colors.reset}`)
};

function generateId() {
  return Math.random().toString(36).substr(2, 16);
}

function getRandomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function seedDemoData() {
  const dbPath = path.join(process.cwd(), 'data', 'expense_system.db');
  
  log.title('EP Group System - إضافة بيانات تجريبية');
  console.log('='.repeat(50));
  
  try {
    const db = new Database(dbPath);
    
    // الحصول على IDs فئات النفقات
    const categories = db.prepare('SELECT id, name_ar FROM expense_categories').all();
    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.name_ar] = cat.id;
    });
    
    log.info('إضافة طلبات نفقات تجريبية...');
    
    // بيانات النفقات التجريبية
    const demoExpenses = [
      {
        request_number: 'EXP-2024-001004',
        title: 'حجز تذاكر طيران إلى دبي',
        amount: 3200.00,
        category: 'السفر والانتقال',
        department: 'التسويق',
        vendor_name: 'الخطوط السعودية',
        status: 'approved',
        priority: 'high'
      },
      {
        request_number: 'EXP-2024-001005',
        title: 'وجبة عشاء مع عملاء مهمين',
        amount: 450.00,
        category: 'وجبات والترفيه',
        department: 'المبيعات',
        vendor_name: 'مطعم النافورة',
        status: 'paid',
        priority: 'medium'
      },
      {
        request_number: 'EXP-2024-001006',
        title: 'شراء أجهزة كمبيوتر محمولة',
        amount: 8500.00,
        category: 'تكنولوجيا وبرامج',
        department: 'تقنية المعلومات',
        vendor_name: 'معرض الحاسب الآلي',
        status: 'under_review',
        priority: 'urgent'
      },
      {
        request_number: 'EXP-2024-001007',
        title: 'رسوم استشارة قانونية',
        amount: 1200.00,
        category: 'الخدمات المهنية',
        department: 'الشؤون القانونية',
        vendor_name: 'مكتب الأستاذ أحمد للمحاماة',
        status: 'submitted',
        priority: 'medium'
      },
      {
        request_number: 'EXP-2024-001008',
        title: 'حملة إعلانية على وسائل التواصل',
        amount: 2800.00,
        category: 'التسويق والإعلان',
        department: 'التسويق',
        vendor_name: 'وكالة الإبداع الرقمي',
        status: 'approved',
        priority: 'high'
      },
      {
        request_number: 'EXP-2024-001009',
        title: 'فاتورة كهرباء المكتب الرئيسي',
        amount: 650.00,
        category: 'المرافق والاتصالات',
        department: 'الإدارة العامة',
        vendor_name: 'الشركة السعودية للكهرباء',
        status: 'paid',
        priority: 'low'
      },
      {
        request_number: 'EXP-2024-001010',
        title: 'دورة إدارة المشاريع PMP',
        amount: 3500.00,
        category: 'التدريب والتطوير',
        department: 'تقنية المعلومات',
        vendor_name: 'معهد إدارة المشاريع',
        status: 'submitted',
        priority: 'medium'
      }
    ];
    
    // إدراج النفقات التجريبية
    const insertExpense = db.prepare(`
      INSERT INTO expense_requests (
        request_number, title, amount, category_id, expense_date,
        submitted_by, created_by, status, department, vendor_name,
        priority, submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    let addedExpenses = 0;
    demoExpenses.forEach(expense => {
      const categoryId = categoryMap[expense.category];
      if (categoryId) {
        try {
          const expenseDate = getRandomDate(new Date('2024-01-01'), new Date('2024-02-15'));
          const userId = `user_${Math.floor(Math.random() * 1000)}`;
          
          insertExpense.run(
            expense.request_number,
            expense.title,
            expense.amount,
            categoryId,
            expenseDate.toISOString().split('T')[0],
            userId,
            userId,
            expense.status,
            expense.department,
            expense.vendor_name,
            expense.priority,
            expenseDate.toISOString()
          );
          addedExpenses++;
        } catch (error) {
          if (!error.message.includes('UNIQUE constraint failed')) {
            console.error(`خطأ في إضافة النفقة ${expense.request_number}:`, error.message);
          }
        }
      }
    });
    
    log.success(`تم إضافة ${addedExpenses} طلب نفقة تجريبي`);
    
    // إضافة موافقات تجريبية
    log.info('إضافة موافقات تجريبية...');
    
    const approvedExpenses = db.prepare(`
      SELECT id FROM expense_requests 
      WHERE status IN ('approved', 'paid') 
      AND id NOT IN (SELECT expense_id FROM expense_approvals)
    `).all();
    
    const insertApproval = db.prepare(`
      INSERT INTO expense_approvals (
        expense_id, approver_id, approver_name, approver_email,
        approval_level, action, action_date, comments
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    let addedApprovals = 0;
    approvedExpenses.forEach(expense => {
      try {
        const approvalDate = getRandomDate(new Date('2024-01-01'), new Date());
        insertApproval.run(
          expense.id,
          'manager_001',
          'أحمد المدير العام',
          'manager@epgroup.sa',
          1,
          'approved',
          approvalDate.toISOString(),
          'تمت الموافقة على الطلب بعد المراجعة'
        );
        addedApprovals++;
      } catch (error) {
        console.error(`خطأ في إضافة الموافقة:`, error.message);
      }
    });
    
    log.success(`تم إضافة ${addedApprovals} موافقة تجريبية`);
    
    // إضافة مدفوعات تجريبية
    log.info('إضافة مدفوعات تجريبية...');
    
    const paidExpenses = db.prepare(`
      SELECT id, amount FROM expense_requests 
      WHERE status = 'paid'
      AND id NOT IN (SELECT expense_id FROM expense_payments)
    `).all();
    
    const insertPayment = db.prepare(`
      INSERT INTO expense_payments (
        expense_id, payment_number, amount, payment_method,
        payment_status, processed_date, processed_by, bank_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    let addedPayments = 0;
    paidExpenses.forEach((expense, index) => {
      try {
        const paymentNumber = `PAY-2024-${String(5000 + index).padStart(5, '0')}`;
        const paymentDate = getRandomDate(new Date('2024-01-10'), new Date());
        
        insertPayment.run(
          expense.id,
          paymentNumber,
          expense.amount,
          'bank_transfer',
          'completed',
          paymentDate.toISOString(),
          'accountant_001',
          'البنك الأهلي السعودي'
        );
        addedPayments++;
      } catch (error) {
        console.error(`خطأ في إضافة المدفوعات:`, error.message);
      }
    });
    
    log.success(`تم إضافة ${addedPayments} مدفوعة تجريبية`);
    
    // إضافة إشعارات تجريبية
    log.info('إضافة إشعارات تجريبية...');
    
    const recentExpenses = db.prepare(`
      SELECT id, title, submitted_by FROM expense_requests 
      ORDER BY created_at DESC LIMIT 5
    `).all();
    
    const insertNotification = db.prepare(`
      INSERT INTO expense_notifications (
        recipient_id, notification_type, subject, message,
        expense_id, delivery_status, sent_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    let addedNotifications = 0;
    recentExpenses.forEach(expense => {
      try {
        const notificationDate = getRandomDate(new Date('2024-01-01'), new Date());
        insertNotification.run(
          expense.submitted_by,
          'email',
          'تحديث على طلب النفقة',
          `تم تحديث حالة طلب النفقة: ${expense.title}`,
          expense.id,
          'sent',
          notificationDate.toISOString()
        );
        addedNotifications++;
      } catch (error) {
        console.error(`خطأ في إضافة الإشعار:`, error.message);
      }
    });
    
    log.success(`تم إضافة ${addedNotifications} إشعار تجريبي`);
    
    // تحديث إحصائيات الميزانية
    log.info('تحديث استخدام الميزانيات...');
    
    const updateBudgetUsage = db.prepare(`
      UPDATE expense_budgets 
      SET used_amount = (
        SELECT COALESCE(SUM(er.amount), 0)
        FROM expense_requests er
        WHERE er.department = expense_budgets.department
        AND er.status = 'paid'
      )
      WHERE department IN (
        SELECT DISTINCT department 
        FROM expense_requests 
        WHERE status = 'paid'
      )
    `);
    
    const budgetsUpdated = updateBudgetUsage.run();
    log.success(`تم تحديث ${budgetsUpdated.changes} ميزانية`);
    
    // عرض الإحصائيات النهائية
    const finalStats = db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM expense_requests) as إجمالي_النفقات,
        (SELECT COUNT(*) FROM expense_approvals) as إجمالي_الموافقات,
        (SELECT COUNT(*) FROM expense_payments) as إجمالي_المدفوعات,
        (SELECT COUNT(*) FROM expense_notifications) as إجمالي_الإشعارات,
        (SELECT ROUND(SUM(amount), 2) FROM expense_requests) as إجمالي_المبالغ
    `).get();
    
    console.log(`\n${colors.cyan}📊 الإحصائيات النهائية:${colors.reset}`);
    console.log('='.repeat(30));
    Object.entries(finalStats).forEach(([key, value]) => {
      console.log(`${key}: ${colors.green}${value}${colors.reset}`);
    });
    
    db.close();
    
    console.log(`\n${colors.green}🎉 تم إضافة البيانات التجريبية بنجاح!${colors.reset}`);
    console.log(`${colors.yellow}💡 يمكنك الآن استخدام النظام مع البيانات التجريبية الغنية${colors.reset}`);
    
  } catch (error) {
    log.error(`فشل في إضافة البيانات التجريبية: ${error.message}`);
    console.error('تفاصيل الخطأ:', error);
    process.exit(1);
  }
}

// تشغيل السكريپت
if (require.main === module) {
  seedDemoData()
    .then(() => {
      console.log('\n✨ تم الانتهاء من إضافة البيانات التجريبية!');
      process.exit(0);
    })
    .catch(error => {
      log.error('خطأ في تنفيذ السكريپت:');
      console.error(error);
      process.exit(1);
    });
}

module.exports = { seedDemoData };