/**
 * اختبار بسيط لـ API route حذف المستخدمين
 * 
 * كيفية الاستخدام:
 * 1. شغل الخادم: npm run dev
 * 2. استبدل USER_ID بمعرف المستخدم الذي تريد حذفه
 * 3. نفذ الملف: node test-delete-api.js
 */

const USER_ID = 'test-user-id'; // استبدل بمعرف المستخدم الفعلي
const BASE_URL = 'http://localhost:3000';

async function testDeleteUser(userId) {
  try {
    console.log(`🧪 اختبار حذف المستخدم: ${userId}`);
    
    const response = await fetch(`${BASE_URL}/api/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        // ملاحظة: في بيئة حقيقية، ستحتاج إلى إرسال session token
      },
    });

    const data = await response.text();
    
    console.log(`📊 حالة الاستجابة: ${response.status}`);
    console.log(`📝 الاستجابة:`, data);

    if (response.ok) {
      console.log('✅ نجح الحذف!');
    } else {
      console.log('❌ فشل الحذف');
      
      // شرح أكواد الأخطاء الشائعة
      if (response.status === 401) {
        console.log('ℹ️  السبب: غير مصرح - يجب تسجيل الدخول');
      } else if (response.status === 403) {
        console.log('ℹ️  السبب: ممنوع - ليس لديك صلاحية');
      } else if (response.status === 404) {
        console.log('ℹ️  السبب: المستخدم غير موجود');
      } else if (response.status === 500) {
        console.log('ℹ️  السبب: خطأ في الخادم');
      }
    }

    return response.ok;
  } catch (error) {
    console.error('❌ خطأ في الاتصال:', error.message);
    return false;
  }
}

// اختبار من المتصفح
console.log(`
=====================================
  اختبار API حذف المستخدمين
=====================================

للاختبار من متصفح الويب، افتح Console واستخدم:

fetch('/api/users/${USER_ID}', { 
  method: 'DELETE' 
})
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);

=====================================
`);

// إذا كنت تريد اختبار من Node.js مباشرة
if (typeof window === 'undefined' && process.argv[2]) {
  // نفذ الاختبار
  testDeleteUser(process.argv[2] || USER_ID);
}