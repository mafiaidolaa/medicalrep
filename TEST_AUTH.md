# 🧪 دليل اختبار نظام المصادقة

## اختبار سريع (Quick Test)

### ✅ الاختبار 1: الوصول بدون تسجيل دخول
```bash
الخطوات:
1. افتح متصفح جديد (أو Incognito/Private)
2. اذهب إلى: http://localhost:3000
3. النتيجة المتوقعة: يتم توجيهك تلقائياً إلى /login

✅ إذا تم التوجيه = النظام آمن
❌ إذا فتحت Dashboard = هناك مشكلة
```

### ✅ الاختبار 2: مسح الكاش والجلسات
```bash
الخطوات:
1. سجل دخول عادي إلى النظام
2. اضغط F12 (فتح Developer Tools)
3. اذهب إلى تبويب "Application"
4. في القائمة الجانبية:
   - انقر "Clear site data"
   - أو امسح Cookies و Local Storage يدوياً
5. أعد تحميل الصفحة (F5)
6. النتيجة المتوقعة: يتم توجيهك إلى /login

✅ إذا تم التوجيه = النظام آمن
❌ إذا بقيت في Dashboard = هناك مشكلة
```

### ✅ الاختبار 3: التحقق من Middleware
```bash
الخطوات:
1. افتح متصفح Incognito
2. اذهب إلى: http://localhost:3000/users
3. أو أي صفحة أخرى مثل: /clinics, /orders, etc.
4. النتيجة المتوقعة: توجيه إلى /login

✅ جميع الصفحات محمية
❌ إذا فتحت أي صفحة بدون login = مشكلة
```

---

## اختبارات متقدمة

### 🔍 الاختبار 4: Session Validation API

افتح Console في المتصفح وقم بتشغيل:

```javascript
// الاختبار 1: بدون تسجيل دخول
fetch('/api/auth/validate')
  .then(r => r.json())
  .then(console.log)

// النتيجة المتوقعة:
// { valid: false, error: "No session found", code: "NO_SESSION" }


// الاختبار 2: بعد تسجيل الدخول
fetch('/api/auth/validate')
  .then(r => r.json())
  .then(console.log)

// النتيجة المتوقعة:
// {
//   valid: true,
//   user: { id: "...", username: "...", role: "..." },
//   expiresAt: 1234567890
// }
```

### 🔍 الاختبار 5: Session Versioning

```bash
الخطوات:
1. سجل دخول إلى النظام
2. افتح .env.local
3. غيّر: DEV_COOKIE_VERSION="3" (أي رقم جديد)
4. أعد تشغيل الخادم (Ctrl+C ثم npm run dev)
5. أعد تحميل الصفحة في المتصفح (F5)
6. النتيجة المتوقعة: توجيه إلى /login

✅ الجلسات القديمة تم إبطالها
```

### 🔍 الاختبار 6: Middleware Headers

افتح Network tab في Developer Tools:

```bash
الخطوات:
1. سجل دخول
2. افتح Network tab
3. أعد تحميل أي صفحة
4. انقر على الـ Request
5. في Headers، ابحث عن:
   - X-Frame-Options: DENY
   - X-Content-Type-Options: nosniff
   - X-User-Authenticated: true
   - X-User-Role: (دورك)

✅ Headers موجودة = الحماية مفعلة
```

---

## اختبارات أمنية

### 🛡️ الاختبار 7: منع الوصول للـ Login بعد تسجيل الدخول

```bash
الخطوات:
1. سجل دخول عادي
2. حاول الذهاب يدوياً إلى: http://localhost:3000/login
3. النتيجة المتوقعة: توجيه تلقائي إلى Dashboard (/)

✅ لا يمكن الوصول لـ /login إذا كنت مسجل دخول
```

### 🛡️ الاختبار 8: محاولات الوصول المتكررة

افتح Console وراقب الـ Logs:

```bash
الخطوات:
1. افتح متصفح Incognito
2. افتح Console (F12)
3. حاول الوصول لعدة صفحات محمية
4. راقب الـ Console للرسائل:
   🚫 Unauthorized access attempt to: /path
   ⚠️ Multiple failed authentication attempts detected

✅ النظام يتتبع المحاولات الفاشلة
```

---

## اختبارات الأداء

### ⚡ الاختبار 9: Session Caching

```bash
الخطوات:
1. سجل دخول
2. افتح Network tab
3. تصفح بين الصفحات المختلفة
4. لاحظ عدد الطلبات لـ /api/auth/session
5. النتيجة المتوقعة: طلب واحد فقط كل 5 دقائق

✅ Caching يعمل بشكل صحيح
```

### ⚡ الاختبار 10: Background Activity Logging

```bash
الخطوات:
1. سجل دخول
2. تصفح بين الصفحات
3. لاحظ سرعة التصفح
4. النتيجة المتوقعة: لا تأخير في التحميل

✅ Activity logging لا يعيق الأداء
```

---

## Console Logs المتوقعة

### عند الوصول بدون تسجيل دخول:
```
🚫 Unauthorized access attempt to: /dashboard
```

### عند تسجيل الدخول:
```
✅ Authenticated user redirected from login to dashboard
✅ Login activity logged successfully
```

### عند session غير صالحة:
```
⚠️ Invalid user data in session
⚠️ Session validation failed - logging out
```

### عند تحديث Session Version:
```
⚠️ Session version mismatch - invalidating
```

---

## حالات اختبار إضافية

### 📋 الاختبار 11: تسجيل الخروج

```bash
الخطوات:
1. سجل دخول
2. انقر على زر تسجيل الخروج
3. النتيجة المتوقعة:
   - توجيه إلى /login
   - localStorage يحتوي على logout_timestamp
   - لا يمكن العودة للنظام بزر Back

✅ تسجيل خروج آمن
```

### 📋 الاختبار 12: محاولة تسجيل دخول خاطئ

```bash
الخطوات:
1. أدخل username صحيح + password خاطئ
2. النتيجة المتوقعة:
   - رسالة خطأ: "Invalid credentials"
   - البقاء في صفحة Login
   - عدم إنشاء أي session

✅ رفض الدخول غير الصحيح
```

### 📋 الاختبار 13: صلاحيات المستخدمين

```bash
الخطوات:
1. سجل دخول كمستخدم عادي (Rep)
2. حاول الوصول إلى: /users أو /settings
3. النتيجة المتوقعة:
   - رسالة: "Permission Denied"
   - توجيه إلى Dashboard

✅ التحقق من الصلاحيات يعمل
```

---

## Troubleshooting

### ❌ المشكلة: النظام يفتح بدون تسجيل دخول

```bash
الحل:
1. تحقق من .env.local:
   - SKIP_MIDDLEWARE يجب ألا يكون موجود
   - DEV_COOKIE_VERSION موجود

2. أعد تشغيل الخادم:
   npm run dev

3. امسح كاش المتصفح

4. جرب مرة أخرى في Incognito
```

### ❌ المشكلة: يطلب تسجيل دخول بشكل متكرر

```bash
الحل:
1. تحقق من NEXTAUTH_SECRET في .env.local
2. تحقق من أن Cookies مفعلة في المتصفح
3. تحقق من عدم وجود أخطاء في Console
4. تأكد من أن maxAge كافي في auth.ts
```

### ❌ المشكلة: بعد التحديث، جميع المستخدمين فقدوا الجلسات

```bash
السبب: تم تغيير DEV_COOKIE_VERSION
الحل: هذا متوقع! الجميع يحتاج لتسجيل دخول جديد
```

---

## Checklist النهائي

قبل نشر النظام للإنتاج، تحقق من:

- [ ] ✅ جميع الاختبارات أعلاه نجحت
- [ ] ✅ NEXTAUTH_SECRET قوي وآمن
- [ ] ✅ NEXTAUTH_URL يشير للدومين الصحيح
- [ ] ✅ Secure cookies مفعلة (في الإنتاج)
- [ ] ✅ Session maxAge مناسب (7 أيام للإنتاج)
- [ ] ✅ Middleware لا يمكن تخطيه
- [ ] ✅ جميع API routes محمية
- [ ] ✅ Activity logging يعمل بشكل صحيح
- [ ] ✅ Security headers موجودة
- [ ] ✅ لا توجد أخطاء في Console

---

## نتيجة الاختبارات

| الاختبار | الحالة | ملاحظات |
|---------|--------|---------|
| الوصول بدون login | ⬜ | |
| مسح الكاش | ⬜ | |
| Middleware protection | ⬜ | |
| Session validation API | ⬜ | |
| Session versioning | ⬜ | |
| Security headers | ⬜ | |
| منع /login بعد الدخول | ⬜ | |
| تتبع المحاولات الفاشلة | ⬜ | |
| Session caching | ⬜ | |
| Activity logging | ⬜ | |
| تسجيل الخروج | ⬜ | |
| محاولات خاطئة | ⬜ | |
| الصلاحيات | ⬜ | |

✅ ضع علامة صح (☑️) على كل اختبار بعد النجاح

---

**ملاحظة:** إذا نجحت جميع الاختبارات، النظام جاهز للاستخدام! 🎉