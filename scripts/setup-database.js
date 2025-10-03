#!/usr/bin/env node

/**
 * 🗄️ EP Group System - Database Setup Script
 * سكريبت إعداد قاعدة البيانات لنظام إدارة النفقات
 */

const fs = require('fs');
const path = require('path');

// استخدام sqlite3 مع better-sqlite3 كبديل محسّن
let Database;
try {
  // محاولة استخدام better-sqlite3 أولاً
  Database = require('better-sqlite3');
  console.log('✅ استخدام better-sqlite3');
} catch (error) {
  try {
    // العودة لـ sqlite3 العادي
    const sqlite3 = require('sqlite3').verbose();
    console.log('✅ استخدام sqlite3');
    
    // إنشاء wrapper لتحويل sqlite3 للسلوك المتزامن
    const createSyncWrapper = (dbPath) => {
      const db = new sqlite3.Database(dbPath);
      return {
        exec: (sql) => {
          return new Promise((resolve, reject) => {
            db.exec(sql, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        },
        prepare: (sql) => {
          const stmt = db.prepare(sql);
          return {
            all: () => {
              return new Promise((resolve, reject) => {
                stmt.all((err, rows) => {
                  if (err) reject(err);
                  else resolve(rows);
                });
              });
            }
          };
        },
        close: () => {
          return new Promise((resolve) => {
            db.close(resolve);
          });
        }
      };
    };
    Database = createSyncWrapper;
  } catch (error2) {
    console.error('❌ لا يمكن العثور على SQLite. يرجى تثبيت better-sqlite3 أو sqlite3:');
    console.error('npm install better-sqlite3');
    console.error('أو');
    console.error('npm install sqlite3');
    process.exit(1);
  }
}

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
  title: (msg) => console.log(`${colors.magenta}${colors.bright}🏢 ${msg}${colors.reset}`)
};

async function setupDatabase() {
  const dbPath = path.join(process.cwd(), 'data', 'expense_system.db');
  const schemaPath = path.join(process.cwd(), 'src', 'lib', 'services', 'expense-database-sqlite.sql');
  
  log.title('EP Group System - إعداد قاعدة البيانات');
  console.log('================================================');
  
  try {
    // إنشاء مجلد البيانات إذا لم يكن موجود
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      log.success(`تم إنشاء مجلد البيانات: ${dataDir}`);
    }

    // قراءة سكريبت SQL
    if (!fs.existsSync(schemaPath)) {
      log.error(`لا يمكن العثور على ملف السكريبت: ${schemaPath}`);
      return;
    }

    const schema = fs.readFileSync(schemaPath, 'utf8');
    log.info('تم قراءة سكريبت قاعدة البيانات...');

    // حذف قاعدة البيانات الموجودة إن وُجدت
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      log.warning('تم حذف قاعدة البيانات الموجودة');
    }

    // إنشاء قاعدة البيانات الجديدة
    log.info('إنشاء قاعدة بيانات جديدة...');
    
    // استخدام better-sqlite3 إن كان متاحاً
    const db = typeof Database === 'function' ? 
      new Database(dbPath) : 
      Database(dbPath);

    // تنفيذ السكريبت
    log.info('تنفيذ سكريبت إنشاء الجداول...');
    
    if (typeof db.exec === 'function') {
      // better-sqlite3
      db.exec(schema);
    } else {
      // sqlite3 مع wrapper
      await db.exec(schema);
    }

    log.success('تم إنشاء جميع الجداول بنجاح!');

    // التحقق من البيانات
    log.info('التحقق من البيانات المُدرجة...');
    
    const checkQuery = `
      SELECT 'expense_categories' as table_name, COUNT(*) as count FROM expense_categories
      UNION ALL
      SELECT 'system_settings', COUNT(*) FROM system_settings
      UNION ALL
      SELECT 'expense_requests', COUNT(*) FROM expense_requests  
      UNION ALL
      SELECT 'expense_budgets', COUNT(*) FROM expense_budgets
      ORDER BY table_name;
    `;

    let results;
    if (typeof db.prepare === 'function') {
      // better-sqlite3
      const stmt = db.prepare(checkQuery);
      results = stmt.all();
    } else {
      // sqlite3 مع wrapper
      const stmt = db.prepare(checkQuery);
      results = await stmt.all();
    }

    console.log('\n📊 ملخص البيانات المُدرجة:');
    console.log('================================');
    results.forEach(row => {
      console.log(`${colors.cyan}${row.table_name}:${colors.reset} ${row.count} صف`);
    });

    // إغلاق الاتصال
    if (typeof db.close === 'function') {
      if (db.close.constructor.name === 'AsyncFunction') {
        await db.close();
      } else {
        db.close();
      }
    }

    console.log('\n🎉 تم إعداد قاعدة البيانات بنجاح!');
    console.log(`📍 موقع قاعدة البيانات: ${dbPath}`);
    console.log('\n💡 نصائح للاستخدام:');
    console.log('- يمكنك الآن استخدام النظام مع قاعدة البيانات المحلية');
    console.log('- لعرض البيانات: استخدم أي عارض SQLite');
    console.log('- للنسخ الاحتياطي: انسخ ملف expense_system.db');
    
  } catch (error) {
    log.error(`فشل في إعداد قاعدة البيانات: ${error.message}`);
    console.error('تفاصيل الخطأ:', error);
    process.exit(1);
  }
}

// تشغيل السكريپت
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('\n✨ تم الانتهاء من إعداد النظام!');
      process.exit(0);
    })
    .catch(error => {
      log.error('خطأ في تنفيذ السكريپت:');
      console.error(error);
      process.exit(1);
    });
}

module.exports = { setupDatabase };