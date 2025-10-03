#!/usr/bin/env node

/**
 * 👀 EP Group System - Database Viewer
 * عارض بيانات قاعدة البيانات
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

function displayTable(title, data) {
  console.log(`\n${colors.magenta}${colors.bright}📊 ${title}${colors.reset}`);
  console.log('='.repeat(60));
  
  if (data.length === 0) {
    console.log(`${colors.yellow}لا توجد بيانات${colors.reset}`);
    return;
  }
  
  data.forEach((row, index) => {
    console.log(`${colors.cyan}${index + 1}.${colors.reset}`);
    Object.entries(row).forEach(([key, value]) => {
      const displayValue = value === null ? 'غير محدد' : value;
      console.log(`   ${colors.blue}${key}:${colors.reset} ${displayValue}`);
    });
    console.log();
  });
}

async function viewDatabase() {
  const dbPath = path.join(process.cwd(), 'data', 'expense_system.db');
  
  console.log(`${colors.magenta}${colors.bright}🏢 EP Group System - عرض قاعدة البيانات${colors.reset}`);
  console.log('==================================================');
  console.log(`📍 مسار قاعدة البيانات: ${dbPath}\n`);
  
  try {
    const db = new Database(dbPath, { readonly: true });
    
    // عرض فئات النفقات
    const categories = db.prepare(`
      SELECT name_ar as الاسم_العربي, name as الاسم_الإنجليزي, 
             icon as الأيقونة, color as اللون, sort_order as الترتيب
      FROM expense_categories 
      ORDER BY sort_order
    `).all();
    
    displayTable('فئات النفقات', categories);
    
    // عرض إعدادات النظام
    const settings = db.prepare(`
      SELECT category as الفئة, setting_key as المفتاح, 
             setting_value as القيمة, description as الوصف
      FROM system_settings 
      WHERE is_public = 1
      ORDER BY category, setting_key
    `).all();
    
    displayTable('إعدادات النظام العامة', settings);
    
    // عرض طلبات النفقات
    const expenses = db.prepare(`
      SELECT 
        er.request_number as رقم_الطلب,
        er.title as العنوان,
        er.amount as المبلغ,
        er.status as الحالة,
        er.department as القسم,
        er.vendor_name as اسم_المورد,
        ec.name_ar as فئة_النفقة,
        DATE(er.expense_date) as تاريخ_النفقة
      FROM expense_requests er
      LEFT JOIN expense_categories ec ON er.category_id = ec.id
      ORDER BY er.created_at DESC
    `).all();
    
    displayTable('طلبات النفقات', expenses);
    
    // عرض الميزانيات
    const budgets = db.prepare(`
      SELECT 
        name as اسم_الميزانية,
        department as القسم,
        fiscal_year as السنة_المالية,
        allocated_amount as المخصص,
        used_amount as المستخدم,
        remaining_amount as المتبقي
      FROM expense_budgets
      ORDER BY department
    `).all();
    
    displayTable('الميزانيات', budgets);
    
    // إحصائيات سريعة
    const stats = db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM expense_categories) as عدد_الفئات,
        (SELECT COUNT(*) FROM expense_requests) as عدد_النفقات,
        (SELECT COUNT(*) FROM expense_budgets) as عدد_الميزانيات,
        (SELECT COUNT(*) FROM system_settings) as عدد_الإعدادات,
        (SELECT SUM(amount) FROM expense_requests) as إجمالي_المبالغ
    `).get();
    
    console.log(`\n${colors.green}${colors.bright}📈 إحصائيات سريعة${colors.reset}`);
    console.log('='.repeat(30));
    Object.entries(stats).forEach(([key, value]) => {
      console.log(`${colors.cyan}${key}:${colors.reset} ${value || 0}`);
    });
    
    // عرض هيكل الجداول
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all();
    
    console.log(`\n${colors.blue}${colors.bright}🗄️ الجداول المُنشأة (${tables.length})${colors.reset}`);
    console.log('='.repeat(30));
    tables.forEach((table, index) => {
      console.log(`${index + 1}. ${table.name}`);
    });
    
    db.close();
    
    console.log(`\n${colors.green}✅ تم عرض البيانات بنجاح!${colors.reset}`);
    
  } catch (error) {
    console.error(`${colors.red}❌ خطأ في قراءة قاعدة البيانات:${colors.reset}`);
    console.error(error.message);
    process.exit(1);
  }
}

// تشغيل السكريپت
if (require.main === module) {
  viewDatabase();
}

module.exports = { viewDatabase };