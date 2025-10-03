const fs = require('fs');
const path = require('path');

// قراءة package.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

console.log('🔍 تحليل المشروع...\n');

// تحليل المكتبات
const deps = packageJson.dependencies;
const devDeps = packageJson.devDependencies;

console.log('📦 إجمالي المكتبات:');
console.log(`- Dependencies: ${Object.keys(deps).length}`);
console.log(`- DevDependencies: ${Object.keys(devDeps).length}`);
console.log(`- المجموع: ${Object.keys(deps).length + Object.keys(devDeps).length}\n`);

// المكتبات الثقيلة المعروفة
const heavyLibraries = [
  '@capacitor/android',
  '@capacitor/ios', 
  '@react-pdf/renderer',
  '@supabase/supabase-js',
  'next',
  'react',
  'recharts',
  '@genkit-ai/googleai'
];

console.log('🐘 المكتبات الثقيلة المحتملة:');
heavyLibraries.forEach(lib => {
  if (deps[lib]) {
    console.log(`- ${lib}: ${deps[lib]}`);
  }
});

console.log('\n🔧 اقتراحات التحسين:');
console.log('1. إزالة @capacitor إذا لم تكن تطور تطبيق موبايل');
console.log('2. استخدام dynamic imports لـ @react-pdf/renderer');
console.log('3. تحسين imports من @radix-ui');
console.log('4. استخدام recharts بشكل أذكى');

// تحليل حجم node_modules
try {
  const { execSync } = require('child_process');
  const size = execSync('powershell "Get-ChildItem node_modules -Recurse | Measure-Object -Property Length -Sum | Select-Object -ExpandProperty Sum"', { encoding: 'utf8' });
  const sizeInMB = Math.round(parseInt(size.trim()) / 1024 / 1024);
  console.log(`\n💾 حجم node_modules: ${sizeInMB} MB`);
} catch (e) {
  console.log('لا يمكن حساب حجم node_modules');
}