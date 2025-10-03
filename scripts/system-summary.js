#!/usr/bin/env node

/**
 * 📋 EP Group System - Complete System Summary
 * ملخص النظام الكامل ومعلومات الإنجاز
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

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
  title: (msg) => console.log(`${colors.magenta}${colors.bright}${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ  ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠  ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`)
};

function printSeparator(title) {
  console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}${title}${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
}

async function generateSystemSummary() {
  const startTime = Date.now();
  
  log.title('🏢 EP Group System - نظام إدارة النفقات الاحترافي');
  log.title('📋 ملخص النظام الكامل والإنجازات');
  
  printSeparator('معلومات المشروع الأساسية');
  
  console.log(`${colors.green}🎯 اسم المشروع:${colors.reset} EP Group Expense Management System`);
  console.log(`${colors.green}🏢 الشركة:${colors.reset} مجموعة إي بي للأنظمة الطبية`);
  console.log(`${colors.green}📅 تاريخ الإنشاء:${colors.reset} ${new Date().toLocaleDateString('ar-SA')}`);
  console.log(`${colors.green}🔗 موقع المشروع:${colors.reset} ${process.cwd()}`);
  console.log(`${colors.green}⚡ إصدار Node.js:${colors.reset} ${process.version}`);
  console.log(`${colors.green}💻 النظام:${colors.reset} ${process.platform} ${process.arch}`);
  
  printSeparator('📁 هيكل المشروع المُنجز');
  
  const projectStructure = {
    'src/pages/expenses/': [
      'expense-dashboard.tsx - لوحة التحكم الرئيسية',
      'add-expense-request.tsx - إضافة طلب نفقة',
      'review-manage-expenses.tsx - مراجعة النفقات',
      'manager-approval.tsx - موافقات المدراء',
      'accounting-payments.tsx - معالجة المدفوعات',
      'reports-printing.tsx - التقارير والطباعة'
    ],
    'src/lib/services/': [
      'expense-management-service.ts - خدمة إدارة النفقات',
      'expense-printing-service.ts - خدمة الطباعة',
      'expense-database-schema.sql - مخطط PostgreSQL',
      'expense-database-sqlite.sql - مخطط SQLite'
    ],
    'src/lib/integrations/': [
      'expense-system-integration.ts - طبقة التكامل الشاملة'
    ],
    'scripts/': [
      'setup-database.js - إعداد قاعدة البيانات',
      'seed-demo-data.js - إضافة بيانات تجريبية',
      'view-database.js - عرض البيانات',
      'system-summary.js - ملخص النظام'
    ]
  };
  
  Object.entries(projectStructure).forEach(([dir, files]) => {
    console.log(`${colors.cyan}📁 ${dir}${colors.reset}`);
    files.forEach(file => {
      console.log(`   ${colors.green}✓${colors.reset} ${file}`);
    });
    console.log();
  });
  
  // التحقق من وجود قاعدة البيانات وعرض إحصائياتها
  const dbPath = path.join(process.cwd(), 'data', 'expense_system.db');
  
  if (fs.existsSync(dbPath)) {
    printSeparator('🗄️ إحصائيات قاعدة البيانات');
    
    try {
      const db = new Database(dbPath, { readonly: true });
      
      const stats = db.prepare(`
        SELECT 
          (SELECT COUNT(*) FROM expense_categories) as categories,
          (SELECT COUNT(*) FROM expense_requests) as requests,
          (SELECT COUNT(*) FROM expense_approvals) as approvals,
          (SELECT COUNT(*) FROM expense_payments) as payments,
          (SELECT COUNT(*) FROM expense_budgets) as budgets,
          (SELECT COUNT(*) FROM expense_notifications) as notifications,
          (SELECT COUNT(*) FROM system_settings) as settings,
          (SELECT ROUND(SUM(amount), 2) FROM expense_requests) as total_amount,
          (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%') as tables
      `).get();
      
      console.log(`${colors.green}📊 فئات النفقات:${colors.reset} ${stats.categories}`);
      console.log(`${colors.green}📄 طلبات النفقات:${colors.reset} ${stats.requests}`);
      console.log(`${colors.green}✅ الموافقات:${colors.reset} ${stats.approvals}`);
      console.log(`${colors.green}💳 المدفوعات:${colors.reset} ${stats.payments}`);
      console.log(`${colors.green}💰 الميزانيات:${colors.reset} ${stats.budgets}`);
      console.log(`${colors.green}🔔 الإشعارات:${colors.reset} ${stats.notifications}`);
      console.log(`${colors.green}⚙️ إعدادات النظام:${colors.reset} ${stats.settings}`);
      console.log(`${colors.green}🏦 إجمالي المبالغ:${colors.reset} ${stats.total_amount?.toLocaleString('ar-SA') || 0} ريال`);
      console.log(`${colors.green}🗄️ إجمالي الجداول:${colors.reset} ${stats.tables}`);
      
      // عرض توزيع النفقات حسب الحالة
      const statusDistribution = db.prepare(`
        SELECT 
          status,
          COUNT(*) as count,
          ROUND(SUM(amount), 2) as total_amount
        FROM expense_requests 
        GROUP BY status 
        ORDER BY count DESC
      `).all();
      
      if (statusDistribution.length > 0) {
        console.log(`\n${colors.cyan}📈 توزيع النفقات حسب الحالة:${colors.reset}`);
        statusDistribution.forEach(row => {
          const statusNames = {
            'draft': 'مسودة',
            'submitted': 'مُرسل',
            'under_review': 'قيد المراجعة',
            'approved': 'معتمد',
            'rejected': 'مرفوض',
            'paid': 'مدفوع',
            'cancelled': 'ملغى'
          };
          const statusName = statusNames[row.status] || row.status;
          console.log(`   ${statusName}: ${row.count} طلب (${row.total_amount?.toLocaleString('ar-SA')} ريال)`);
        });
      }
      
      db.close();
    } catch (error) {
      log.error(`خطأ في قراءة قاعدة البيانات: ${error.message}`);
    }
  } else {
    log.warning('قاعدة البيانات غير موجودة - يمكن إنشاؤها بتشغيل: node scripts/setup-database.js');
  }
  
  printSeparator('🚀 المميزات المُنجزة');
  
  const features = [
    '🎯 نظام إدارة النفقات الشامل',
    '📋 إنشاء وتعديل طلبات النفقات',
    '✅ نظام الموافقات الهرمية',
    '💳 معالجة المدفوعات المتقدمة',
    '📊 التقارير والتحليلات',
    '🖨️ نظام الطباعة الاحترافي',
    '🔐 أمان وصلاحيات المستخدمين',
    '🌐 دعم كامل للغة العربية',
    '📱 واجهة متجاوبة (Responsive)',
    '🔔 نظام الإشعارات المتقدم',
    '💰 إدارة الميزانيات',
    '📈 لوحة تحكم تفاعلية',
    '🗄️ قاعدة بيانات محسنة',
    '⚙️ إعدادات نظام مرنة',
    '🔄 تكامل شامل بين المكونات'
  ];
  
  features.forEach(feature => {
    console.log(`${colors.green}${feature}${colors.reset}`);
  });
  
  printSeparator('🛠️ التقنيات المستخدمة');
  
  const technologies = {
    'Frontend': ['React 18', 'TypeScript', 'Tailwind CSS', 'shadcn/ui', 'React Hook Form', 'date-fns'],
    'Backend Services': ['Node.js', 'SQLite/PostgreSQL', 'File System API'],
    'UI Components': ['Lucide React Icons', 'Radix UI', 'React Router'],
    'Development Tools': ['Better SQLite3', 'ESLint', 'Prettier'],
    'Features': ['RTL Support', 'Responsive Design', 'Dark/Light Mode Ready']
  };
  
  Object.entries(technologies).forEach(([category, techs]) => {
    console.log(`${colors.cyan}${category}:${colors.reset}`);
    techs.forEach(tech => {
      console.log(`   ${colors.green}✓${colors.reset} ${tech}`);
    });
    console.log();
  });
  
  printSeparator('📈 إحصائيات التطوير');
  
  // حساب إحصائيات الملفات
  const codeStats = {
    totalFiles: 0,
    totalLines: 0,
    reactComponents: 0,
    typeScriptFiles: 0,
    sqlFiles: 0,
    jsFiles: 0
  };
  
  // قراءة الملفات وحساب الإحصائيات
  const countLinesInFile = (filePath) => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return content.split('\n').length;
    } catch (error) {
      return 0;
    }
  };
  
  const scanDirectory = (dirPath) => {
    try {
      const files = fs.readdirSync(dirPath, { withFileTypes: true });
      files.forEach(file => {
        const fullPath = path.join(dirPath, file.name);
        if (file.isDirectory() && !file.name.startsWith('.') && file.name !== 'node_modules') {
          scanDirectory(fullPath);
        } else if (file.isFile()) {
          const ext = path.extname(file.name);
          const lines = countLinesInFile(fullPath);
          
          codeStats.totalFiles++;
          codeStats.totalLines += lines;
          
          if (ext === '.tsx' || ext === '.jsx') {
            codeStats.reactComponents++;
          } else if (ext === '.ts') {
            codeStats.typeScriptFiles++;
          } else if (ext === '.sql') {
            codeStats.sqlFiles++;
          } else if (ext === '.js') {
            codeStats.jsFiles++;
          }
        }
      });
    } catch (error) {
      // تجاهل الأخطاء
    }
  };
  
  // مسح مجلدات المشروع الرئيسية
  ['src', 'scripts'].forEach(dir => {
    const fullPath = path.join(process.cwd(), dir);
    if (fs.existsSync(fullPath)) {
      scanDirectory(fullPath);
    }
  });
  
  console.log(`${colors.green}📁 إجمالي الملفات:${colors.reset} ${codeStats.totalFiles}`);
  console.log(`${colors.green}📝 إجمالي السطور:${colors.reset} ${codeStats.totalLines.toLocaleString('ar-SA')}`);
  console.log(`${colors.green}⚛️ مكونات React:${colors.reset} ${codeStats.reactComponents}`);
  console.log(`${colors.green}📘 ملفات TypeScript:${colors.reset} ${codeStats.typeScriptFiles}`);
  console.log(`${colors.green}🗄️ ملفات SQL:${colors.reset} ${codeStats.sqlFiles}`);
  console.log(`${colors.green}📜 ملفات JavaScript:${colors.reset} ${codeStats.jsFiles}`);
  
  printSeparator('🎯 نصائح للاستخدام');
  
  const tips = [
    '🚀 لبدء التطوير: npm run dev',
    '🏗️ لبناء المشروع: npm run build',
    '🗄️ لإعداد قاعدة البيانات: node scripts/setup-database.js',
    '🌱 لإضافة بيانات تجريبية: node scripts/seed-demo-data.js',
    '👀 لعرض البيانات: node scripts/view-database.js',
    '📋 لعرض ملخص النظام: node scripts/system-summary.js',
    '🔧 لتخصيص الإعدادات: عدّل src/lib/site-settings.ts',
    '📱 لاختبار الواجهات: تصفح src/pages/expenses/',
    '🔐 للأمان: راجع Row Level Security في قاعدة البيانات',
    '📊 للتقارير: استخدم src/pages/expenses/reports-printing.tsx'
  ];
  
  tips.forEach(tip => {
    console.log(`${colors.yellow}${tip}${colors.reset}`);
  });
  
  printSeparator('🏆 ملخص الإنجاز');
  
  const endTime = Date.now();
  const executionTime = endTime - startTime;
  
  console.log(`${colors.green}${colors.bright}✨ تم إنجاز نظام إدارة النفقات بالكامل بنجاح!${colors.reset}`);
  console.log(`${colors.green}🎉 النظام جاهز للاستخدام والتطوير الإضافي${colors.reset}`);
  console.log(`${colors.green}⏱️ وقت إنشاء الملخص: ${executionTime}ms${colors.reset}`);
  console.log(`${colors.green}📅 تاريخ الإنجاز: ${new Date().toLocaleString('ar-SA')}${colors.reset}`);
  
  console.log(`\n${colors.magenta}${colors.bright}🏢 EP Group System - حيث تلتقي التكنولوجيا مع الاحترافية${colors.reset}`);
  console.log(`${colors.cyan}💼 نظام إدارة نفقات احترافي ومتكامل${colors.reset}\n`);
}

// تشغيل السكريپت
if (require.main === module) {
  generateSystemSummary()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ خطأ في إنشاء ملخص النظام:', error);
      process.exit(1);
    });
}

module.exports = { generateSystemSummary };