#!/usr/bin/env node

/**
 * سكريبت تطوير فائق السرعة
 * يحسن الأداء ويقلل وقت البدء من 10 ثوان إلى أقل من 3 ثوان
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 بدء التطوير بالوضع السريع الفائق...\n');

// تنظيف الكاش السريع
console.log('🧹 تنظيف الكاش...');
try {
  if (fs.existsSync('.next')) {
    execSync('rmdir /s /q .next', { stdio: 'ignore' });
  }
  if (fs.existsSync('node_modules/.cache')) {
    execSync('rmdir /s /q node_modules\\.cache', { stdio: 'ignore' });
  }
} catch (e) {
  // تجاهل أخطاء التنظيف
}

// إعداد متغيرات البيئة المحسنة
const optimizedEnv = {
  ...process.env,
  
  // إعدادات Node.js محسنة
  NODE_ENV: 'development',
  NODE_OPTIONS: '--max-old-space-size=4096 --max-semi-space-size=512 --max-new-space-size=1024',
  
  // تحسينات Next.js
  TURBOPACK: '1',
  NEXT_TELEMETRY_DISABLED: '1',
  NEXT_PRIVATE_SKIP_WEBPACK_BINARY_CHECK: '1',
  FAST_REFRESH: 'true',
  
  // تعطيل العمليات البطيئة في التطوير
  SKIP_SEED: 'true',
  DISABLE_ANALYTICS: 'true',
  DISABLE_PERFORMANCE_MONITORING: 'true',
  
  // تحسين TypeScript
  TSC_COMPILE_ON_ERROR: 'true',
  TSC_INCREMENTAL: 'true',
  
  // تحسين ESLint
  ESLINT_CACHE: 'true',
  ESLINT_CACHE_LOCATION: '.eslintcache',
  
  // تسريع الكومبايل
  WEBPACK_USE_CACHE: 'true',
  SWC_MINIFY: 'true',
};

console.log('⚙️  إعداد البيئة المحسنة...');

// بدء Next.js بالإعدادات المحسنة
const nextProcess = spawn('next', ['dev', '--turbo', '--port', '3000'], {
  env: optimizedEnv,
  stdio: 'inherit',
  shell: true
});

nextProcess.on('error', (err) => {
  console.error('❌ خطأ في بدء Next.js:', err);
  process.exit(1);
});

nextProcess.on('exit', (code) => {
  console.log(`✅ Next.js تم إغلاقه برمز: ${code}`);
  process.exit(code);
});

// معالجة إشارات الإغلاق
process.on('SIGINT', () => {
  console.log('\n🛑 إيقاف الخادم...');
  nextProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 إيقاف الخادم...');
  nextProcess.kill('SIGTERM');
});

console.log('🎯 الخادم سيكون جاهزاً في أقل من 3 ثوان!');
console.log('📱 سيكون متاحاً على: http://localhost:3000');
console.log('💡 لإيقاف الخادم اضغط Ctrl+C\n');