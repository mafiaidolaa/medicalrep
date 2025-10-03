#!/usr/bin/env node

/**
 * فحص سريع لصحة النظام - بدون dependencies
 */

const fs = require('fs');
const path = require('path');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

console.log(`${colors.bold}${colors.blue}⚡ فحص سريع لنظام EP Group${colors.reset}\n`);

// 1. فحص ملفات الإعداد الأساسية
console.log(`${colors.blue}1. فحص ملفات الإعداد...${colors.reset}`);

const requiredFiles = [
  '.env.local',
  'package.json',
  'next.config.js',
  'src/lib/supabase.ts',
  'src/app/(app)/page.tsx'
];

let configOk = true;
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`${colors.green}✅ ${file}${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ ${file} مفقود${colors.reset}`);
    configOk = false;
  }
});

// 2. فحص متغيرات البيئة
console.log(`\n${colors.blue}2. فحص متغيرات البيئة...${colors.reset}`);

if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET'
  ];
  
  let envOk = true;
  requiredEnvVars.forEach(envVar => {
    if (envContent.includes(envVar + '=')) {
      console.log(`${colors.green}✅ ${envVar}${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠️  ${envVar} غير موجود${colors.reset}`);
      envOk = false;
    }
  });
  
  if (envOk) {
    console.log(`${colors.green}✅ جميع متغيرات البيئة موجودة${colors.reset}`);
  }
} else {
  console.log(`${colors.red}❌ ملف .env.local مفقود${colors.reset}`);
}

// 3. فحص المجلدات المهمة
console.log(`\n${colors.blue}3. فحص هيكل المشروع...${colors.reset}`);

const requiredDirs = [
  'src/app',
  'src/lib', 
  'src/components',
  'src/types',
  'public'
];

requiredDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`${colors.green}✅ ${dir}/${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠️  ${dir}/ مفقود${colors.reset}`);
  }
});

// 4. فحص package.json
console.log(`\n${colors.blue}4. فحص التبعيات...${colors.reset}`);

if (fs.existsSync('package.json')) {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  const criticalDeps = [
    'next',
    '@supabase/supabase-js',
    'react',
    'react-dom',
    'next-auth'
  ];
  
  criticalDeps.forEach(dep => {
    if (pkg.dependencies && pkg.dependencies[dep]) {
      console.log(`${colors.green}✅ ${dep} (${pkg.dependencies[dep]})${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ ${dep} مفقود${colors.reset}`);
      configOk = false;
    }
  });
}

// 5. فحص node_modules
console.log(`\n${colors.blue}5. فحص التثبيت...${colors.reset}`);

if (fs.existsSync('node_modules')) {
  console.log(`${colors.green}✅ node_modules موجود${colors.reset}`);
  
  // فحص بعض الحزم المهمة
  const importantModules = ['next', '@supabase/supabase-js', 'react'];
  importantModules.forEach(mod => {
    if (fs.existsSync(path.join('node_modules', mod))) {
      console.log(`${colors.green}✅ ${mod} مثبت${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠️  ${mod} غير مثبت${colors.reset}`);
    }
  });
} else {
  console.log(`${colors.red}❌ node_modules غير موجود - قم بتشغيل npm install${colors.reset}`);
  configOk = false;
}

// النتيجة النهائية
console.log(`\n${colors.bold}=== النتيجة النهائية ===${colors.reset}`);

if (configOk) {
  console.log(`${colors.bold}${colors.green}🎉 النظام جاهز للتشغيل!${colors.reset}`);
  console.log(`\n${colors.blue}للبدء:${colors.reset}`);
  console.log(`${colors.yellow}quick-start.cmd${colors.reset}`);
} else {
  console.log(`${colors.bold}${colors.red}⚠️  يحتاج النظام إلى إعداد إضافي${colors.reset}`);
  console.log(`\n${colors.blue}خطوات الإصلاح:${colors.reset}`);
  console.log(`1. تشغيل: ${colors.yellow}npm install${colors.reset}`);
  console.log(`2. التأكد من ملف .env.local`);
  console.log(`3. تشغيل: ${colors.yellow}check-system.cmd${colors.reset}`);
}

console.log();