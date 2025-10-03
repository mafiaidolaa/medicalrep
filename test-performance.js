console.log('🚀 اختبار أداء المشروع...\n');

// معلومات الذاكرة
const v8 = require('v8');
const os = require('os');

const memStats = v8.getHeapStatistics();
const systemMem = os.totalmem() / 1024 / 1024 / 1024;
const freeMem = os.freemem() / 1024 / 1024 / 1024;

console.log('💾 معلومات الذاكرة:');
console.log(`- حد الذاكرة Node.js: ${Math.round(memStats.heap_size_limit / 1024 / 1024)} MB`);
console.log(`- ذاكرة النظام: ${systemMem.toFixed(2)} GB`);
console.log(`- الذاكرة المتاحة: ${freeMem.toFixed(2)} GB`);

// معلومات النظام
console.log('\n🖥️ معلومات النظام:');
console.log(`- نظام التشغيل: ${os.platform()} ${os.arch()}`);
console.log(`- عدد المعالجات: ${os.cpus().length}`);

// اختبار سرعة التحميل
console.log('\n⏱️ اختبار سرعة تحميل Next.js...');
const startTime = Date.now();

try {
    // محاولة تحميل Next.js
    require('next');
    const loadTime = Date.now() - startTime;
    console.log(`✅ تم تحميل Next.js في: ${loadTime} ms`);
    
    if (loadTime < 1000) {
        console.log('🟢 سرعة ممتازة!');
    } else if (loadTime < 2000) {
        console.log('🟡 سرعة مقبولة');
    } else {
        console.log('🔴 سرعة بطيئة - يحتاج تحسين');
    }
    
} catch (error) {
    console.log('❌ خطأ في تحميل Next.js:', error.message);
}

console.log('\n📊 التوصيات:');
console.log('- استخدم: npm run dev:fast');
console.log('- أو: npm run dev:optimized للذاكرة المحدودة');
console.log('- راجع: PERFORMANCE_GUIDE.md للمزيد');