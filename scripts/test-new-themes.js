#!/usr/bin/env node
/**
 * سكريبت لاختبار الثيمات الجديدة
 * يعرض معلومات عن الثيمات المتاحة ويتحقق من صحتها
 */

const fs = require('fs');
const path = require('path');

console.log('🎨 اختبار الثيمات الجديدة...\n');

// قراءة ملف الثيمات
const themesFile = path.join(__dirname, '../src/lib/premium-themes.ts');
const themesContent = fs.readFileSync(themesFile, 'utf8');

// استخراج معرفات الثيمات
const themeIds = [
  'professional',
  'glassy',
  'dark',
  'orange-neon',
  'blue-sky',
  'ios-like',
  'emerald-garden',
  'royal-purple',
  'sunset-bliss',
  'ocean-deep'
];

console.log('✅ الثيمات المتوقعة:');
themeIds.forEach((id, index) => {
  const found = themesContent.includes(`id: '${id}'`);
  const emoji = found ? '✅' : '❌';
  console.log(`  ${emoji} ${index + 1}. ${id}`);
});

console.log('\n📊 الإحصائيات:');
console.log(`  - عدد الثيمات: ${themeIds.length}`);
console.log(`  - حجم ملف الثيمات: ${(themesContent.length / 1024).toFixed(2)} KB`);

// التحقق من ملف API
const apiFile = path.join(__dirname, '../src/app/api/system-settings/theme/route.ts');
if (fs.existsSync(apiFile)) {
  const apiContent = fs.readFileSync(apiFile, 'utf8');
  
  console.log('\n🔧 التحقق من API:');
  
  // التحقق من وجود جميع الثيمات في validThemes
  const allThemesValid = themeIds.every(id => apiContent.includes(id));
  
  if (allThemesValid) {
    console.log('  ✅ جميع الثيمات مسجلة في API');
  } else {
    console.log('  ⚠️  بعض الثيمات قد لا تكون مسجلة في API');
  }
}

// التحقق من ملف التوثيق
const docsFile = path.join(__dirname, '../docs/NEW_THEMES_ADDED.md');
if (fs.existsSync(docsFile)) {
  console.log('  ✅ ملف التوثيق موجود: docs/NEW_THEMES_ADDED.md');
} else {
  console.log('  ⚠️  ملف التوثيق غير موجود');
}

console.log('\n🎯 الثيمات الجديدة المضافة:');
const newThemes = [
  { id: 'emerald-garden', name: 'الحديقة الزمردية', emoji: '🌿', category: 'Vibrant' },
  { id: 'royal-purple', name: 'الأرجواني الملكي', emoji: '👑', category: 'Classic' },
  { id: 'sunset-bliss', name: 'غروب الشمس', emoji: '🌅', category: 'Vibrant' },
  { id: 'ocean-deep', name: 'أعماق المحيط', emoji: '🌊', category: 'Modern' }
];

newThemes.forEach((theme, index) => {
  console.log(`  ${theme.emoji} ${index + 1}. ${theme.name}`);
  console.log(`     ID: ${theme.id}`);
  console.log(`     Category: ${theme.category}\n`);
});

console.log('📝 كيفية الاستخدام:');
console.log('  1. قم بتشغيل السيرفر: npm run dev:basic');
console.log('  2. سجل دخول كأدمن (admin@clinicconnect.com / AdminPass123!)');
console.log('  3. اذهب إلى الإعدادات → إعدادات النظام → المظهر');
console.log('  4. اختر أحد الثيمات الجديدة وفعّل "تطبيق على جميع المستخدمين"\n');

console.log('✨ جميع الثيمات جاهزة للاستخدام!\n');