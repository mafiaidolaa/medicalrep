#!/usr/bin/env node

/**
 * فحص حالة النظام - Supabase Cloud
 * يتحقق من اتصال قاعدة البيانات والجداول المطلوبة
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

async function checkSystem() {
  console.log(`${colors.bold}${colors.blue}🔍 فحص حالة نظام EP Group${colors.reset}\n`);

  // التحقق من متغيرات البيئة
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log(`${colors.red}❌ متغيرات البيئة مفقودة!${colors.reset}`);
    console.log('تأكد من وجود SUPABASE_URL و SUPABASE_ANON_KEY في .env.local');
    return;
  }

  console.log(`${colors.green}✅ متغيرات البيئة موجودة${colors.reset}`);
  console.log(`📍 Supabase URL: ${supabaseUrl}`);
  console.log();

  // إنشاء عميل Supabase
  const supabase = createClient(supabaseUrl, serviceKey || supabaseKey);

  try {
    // 1. فحص الاتصال العام
    console.log(`${colors.blue}1. فحص الاتصال بقاعدة البيانات...${colors.reset}`);
    const { data: connectionTest, error: connError } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (connError && connError.code !== 'PGRST116') {
      console.log(`${colors.red}❌ فشل الاتصال: ${connError.message}${colors.reset}`);
      return;
    }
    console.log(`${colors.green}✅ الاتصال بقاعدة البيانات نجح${colors.reset}`);

    // 2. فحص الجداول الأساسية
    console.log(`\n${colors.blue}2. فحص الجداول الأساسية...${colors.reset}`);
    
    const tablesToCheck = [
      'users',
      'expense_categories', 
      'expense_requests',
      'clinics',
      'products',
      'orders',
      'visits',
      'collections',
      'activity_log'
    ];

    for (const table of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`${colors.yellow}⚠️  ${table}: ${error.message}${colors.reset}`);
        } else {
          console.log(`${colors.green}✅ ${table}: موجود${colors.reset}`);
        }
      } catch (err) {
        console.log(`${colors.red}❌ ${table}: خطأ${colors.reset}`);
      }
    }

    // 3. فحص فئات النفقات
    console.log(`\n${colors.blue}3. فحص فئات النفقات...${colors.reset}`);
    try {
      const { data: categories, error } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('is_active', true);

      if (error) {
        console.log(`${colors.yellow}⚠️  ${error.message}${colors.reset}`);
      } else {
        console.log(`${colors.green}✅ فئات النفقات: ${categories?.length || 0} فئة نشطة${colors.reset}`);
        if (categories && categories.length > 0) {
          categories.slice(0, 3).forEach(cat => {
            console.log(`   • ${cat.name_ar || cat.name} (${cat.color})`);
          });
        }
      }
    } catch (err) {
      console.log(`${colors.yellow}⚠️  جدول expense_categories قد يكون غير موجود${colors.reset}`);
    }

    // 4. فحص المستخدمين
    console.log(`\n${colors.blue}4. فحص المستخدمين...${colors.reset}`);
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('id, full_name, email, role')
        .limit(5);

      if (error) {
        console.log(`${colors.yellow}⚠️  ${error.message}${colors.reset}`);
      } else {
        console.log(`${colors.green}✅ المستخدمين: ${users?.length || 0} مستخدم${colors.reset}`);
        if (users && users.length > 0) {
          users.forEach(user => {
            console.log(`   • ${user.full_name} (${user.role})`);
          });
        }
      }
    } catch (err) {
      console.log(`${colors.yellow}⚠️  جدول users قد يكون غير موجود${colors.reset}`);
    }

    // 5. التحقق من API الداخلي
    console.log(`\n${colors.blue}5. فحص APIs المحلية...${colors.reset}`);
    
    try {
      // هذا سيعمل فقط إذا كان الخادم يعمل
      const response = await fetch('http://localhost:3000/api/users', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.ok) {
        console.log(`${colors.green}✅ API المحلي يعمل${colors.reset}`);
      } else {
        console.log(`${colors.yellow}⚠️  API المحلي غير متاح (الخادم لا يعمل)${colors.reset}`);
      }
    } catch (err) {
      console.log(`${colors.yellow}⚠️  الخادم المحلي غير متاح (طبيعي إذا لم يتم تشغيله)${colors.reset}`);
    }

    console.log(`\n${colors.bold}${colors.green}🎉 فحص النظام مكتمل!${colors.reset}`);
    console.log(`\n${colors.blue}للبدء في التطوير:${colors.reset}`);
    console.log(`${colors.yellow}quick-start.cmd${colors.reset}`);

  } catch (error) {
    console.log(`${colors.red}❌ خطأ عام: ${error.message}${colors.reset}`);
    console.log('\nتأكد من:');
    console.log('1. صحة معلومات Supabase في .env.local');
    console.log('2. أن مشروع Supabase يعمل');
    console.log('3. أن الجداول المطلوبة موجودة');
  }
}

checkSystem().catch(console.error);