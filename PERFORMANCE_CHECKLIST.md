# 🔍 قائمة فحص الأداء - Performance Checklist

## ما يجب أن تبحث عنه في Terminal عند تشغيل `npm run dev`

---

## ✅ **علامات جيدة (كل شيء على ما يرام)**

### 1. وقت التشغيل الأولي:
```bash
✓ Ready in 3s - 5s     ✅ ممتاز
✓ Ready in 5s - 8s     ✅ جيد
✓ Ready in 8s - 12s    ⚠️ مقبول (يمكن تحسينه)
✓ Ready in 12s+        ❌ بطيء جداً
```

### 2. Compilation السريع:
```bash
✓ Compiled /dashboard in XXXms
✓ Compiled /api/products in XXXms

✅ أقل من 300ms = ممتاز
✅ 300ms - 800ms = جيد
⚠️ 800ms - 2000ms = مقبول
❌ أكثر من 2000ms = بطيء
```

### 3. لا توجد تحذيرات:
```bash
✅ لا توجد رسائل Warning
✅ لا توجد رسائل Deprecated
✅ لا توجد Memory Warnings
```

---

## ⚠️ **علامات تحذيرية (تحتاج فحص)**

### 1. Fast Refresh Warnings:
```bash
⚠️ Fast Refresh had to perform a full reload
```
**المعنى:** تغيير في الكود أجبر التطبيق على إعادة تحميل كاملة
**الحل:** عادي إذا حدث مرة أو اثنتين، لكن إذا تكرر كثيراً = مشكلة

### 2. تحذيرات الذاكرة:
```bash
⚠️ Reached the max call stack size
⚠️ JavaScript heap out of memory
```
**المعنى:** استهلاك ذاكرة عالي
**الحل:** راجع المكونات الثقيلة والحلقات اللانهائية

### 3. Static Optimization Warnings:
```bash
⚠️ Static generation failed, falling back to runtime
```
**المعنى:** بعض الصفحات لا يمكن تحويلها لـ Static
**الحل:** عادي للصفحات الديناميكية

---

## ❌ **علامات خطيرة (مشاكل يجب حلها)**

### 1. أخطاء Compilation:
```bash
❌ Failed to compile
❌ Module not found
❌ Syntax error
```
**المعنى:** خطأ في الكود
**الحل:** اقرأ رسالة الخطأ وصحح الملف المذكور

### 2. أخطاء API المتكررة:
```bash
❌ API resolved without sending a response
❌ TypeError: Cannot read property 'X' of undefined
```
**المعنى:** مشكلة في API routes
**الحل:** فحص ملفات API في `/api`

### 3. Database Connection Errors:
```bash
❌ Error: connect ETIMEDOUT
❌ Connection refused
```
**المعنى:** مشكلة في الاتصال بـ Supabase
**الحل:** تحقق من `.env.local`

---

## 🔍 **ما يجب أن تراه أثناء الاستخدام**

### عند فتح صفحة:
```bash
✅ GET /dashboard 200 in XXXms
✅ GET /api/products 200 in XXXms

ممتاز: أقل من 200ms
جيد: 200ms - 500ms
مقبول: 500ms - 1000ms
بطيء: أكثر من 1000ms
```

### عند عمل API call:
```bash
✅ POST /api/products 200 in XXXms
✅ PUT /api/site-settings 200 in XXXms

ممتاز: أقل من 300ms
جيد: 300ms - 800ms
مقبول: 800ms - 2000ms
بطيء: أكثر من 2000ms
```

---

## 📊 **أنماط غير طبيعية يجب الانتباه لها**

### 1. طلبات مكررة:
```bash
❌ GET /api/site-settings 200 in 400ms
❌ GET /api/site-settings 200 in 395ms
❌ GET /api/site-settings 200 in 431ms
```
**المشكلة:** نفس الطلب يتكرر 3 مرات!
**الحل:** مشكلة في الكاش أو React re-renders

### 2. Compilation المستمر:
```bash
⚠️ Compiling /dashboard...
⚠️ Compiling /dashboard...
⚠️ Compiling /dashboard...
```
**المشكلة:** الصفحة تعيد Compile باستمرار
**الحل:** مشكلة في Fast Refresh أو حلقة لانهائية

### 3. رسائل Console متكررة:
```bash
🔍 Fetching site settings...
📡 Fetch response status: 200
✅ Settings loaded successfully
🔍 Fetching site settings...
📡 Fetch response status: 200
✅ Settings loaded successfully
```
**المشكلة:** الكود يطلب البيانات مرتين
**الحل:** راجع useEffect dependencies

### 4. Activity Log Spam:
```bash
✅ Activity logged with location: login
✅ Activity logged with location: login
✅ Activity logged with location: login
✅ Activity logged with location: login
```
**المشكلة:** Activity tracking يعمل أكثر من مرة
**الحل:** مشكلة في الـ Provider

---

## 🛠️ **أدوات التشخيص**

### 1. فحص حجم الـ Bundle:
```bash
npm run build
```
انظر إلى:
```
Route (app)                              Size     First Load JS
┌ ○ /                                    XXX kB        XXX kB
├ ○ /dashboard                           XXX kB        XXX kB

✅ أقل من 200 kB = ممتاز
⚠️ 200-400 kB = مقبول
❌ أكثر من 400 kB = ثقيل جداً
```

### 2. تحليل الأداء في Chrome:
1. افتح DevTools (F12)
2. اذهب إلى **Performance** tab
3. اضغط Record
4. حمل الصفحة
5. اضغط Stop
6. افحص النتائج:
   - ✅ **Scripting** أقل من 500ms = جيد
   - ✅ **Rendering** أقل من 300ms = جيد
   - ⚠️ **Loading** أكثر من 2s = بطيء

### 3. فحص Network:
1. افتح DevTools → **Network**
2. أعد تحميل الصفحة
3. انظر إلى:
```
✅ عدد الطلبات: 10-20 طلب = ممتاز
⚠️ عدد الطلبات: 20-40 طلب = مقبول
❌ عدد الطلبات: أكثر من 40 = كثير جداً

✅ حجم Transfer: أقل من 2 MB = ممتاز
⚠️ حجم Transfer: 2-5 MB = مقبول
❌ حجم Transfer: أكثر من 5 MB = ثقيل
```

---

## 📋 **Checklist سريع للأداء**

### عند التشغيل:
- [ ] `npm run dev` يبدأ في أقل من 8 ثواني
- [ ] لا توجد أخطاء حمراء في Terminal
- [ ] لا توجد تحذيرات صفراء متكررة
- [ ] Compilation أقل من 500ms لكل صفحة

### عند فتح الصفحة الرئيسية:
- [ ] الصفحة تحمل في أقل من 2 ثانية
- [ ] Console لا يحتوي على أخطاء
- [ ] عدد طلبات API أقل من 15 طلب
- [ ] لا توجد طلبات مكررة

### عند التنقل:
- [ ] الانتقال بين الصفحات فوري (أقل من 300ms)
- [ ] لا توجد Compilation جديدة عند كل navigation
- [ ] Fast Refresh يعمل بدون full reload

### عند عمل Action:
- [ ] الأزرار تستجيب فوراً
- [ ] API calls أقل من 1 ثانية
- [ ] لا توجد رسائل "Saving..." تستمر طويلاً

---

## 🔧 **الإصلاحات السريعة**

### إذا كان التحميل بطيء:
```bash
# 1. امسح الكاش
Remove-Item -Recurse -Force .next
Remove-Item -Recurse -Force node_modules/.cache

# 2. أعد التشغيل
npm run dev
```

### إذا كانت الطلبات مكررة:
```bash
# تحقق من أنك طبقت التحسينات:
# - site-settings-context.tsx (الكاش)
# - activity-tracking-provider.tsx (التحسينات)
```

### إذا كان الـ Bundle ثقيل:
```bash
# 1. فحص الحجم
npm run build

# 2. إذا كان ثقيل، استخدم dynamic imports:
const HeavyComponent = dynamic(() => import('./HeavyComponent'))
```

---

## 📸 **ما يجب أن تراه في Terminal الطبيعي**

### عند بدء التشغيل:
```bash
> dev
> next dev

  ▲ Next.js 14.x.x
  - Local:        http://localhost:3000
  - Environments: .env.local

 ✓ Ready in 3.5s
```

### عند فتح صفحة:
```bash
 ✓ Compiled /dashboard in 400ms
 GET /dashboard 200 in 145ms
 GET /api/products 200 in 230ms
 GET /api/site-settings 200 in 95ms (cached)
```

### عند عمل تعديل:
```bash
 event - compiled client and server successfully in 234ms
```

---

## 🚨 **متى تقلق؟**

### قلق مرتفع (افحص فوراً):
1. ❌ أكثر من 10 أخطاء حمراء في Console
2. ❌ نفس الطلب يتكرر أكثر من 5 مرات
3. ❌ وقت التحميل أكثر من 5 ثواني لكل صفحة
4. ❌ CPU Usage أكثر من 80% باستمرار
5. ❌ Memory Usage يزيد باستمرار ولا يتوقف

### قلق متوسط (افحص عند الفراغ):
1. ⚠️ 3-5 تحذيرات صفراء
2. ⚠️ Compilation أكثر من 800ms
3. ⚠️ بعض الصفحات تحمل ببطء (2-3 ثواني)
4. ⚠️ Fast Refresh يعيد التحميل أحياناً

### لا قلق (كل شيء طبيعي):
1. ✅ 1-2 تحذيرات بسيطة
2. ✅ وقت التحميل الأول 3-5 ثواني
3. ✅ بعض الصفحات تأخذ 500ms - 1s
4. ✅ Compilation بين 200-500ms

---

## 💡 **نصائح احترافية**

### 1. استخدم Production Build للاختبار الحقيقي:
```bash
npm run build
npm start
```
Production دائماً أسرع من Development!

### 2. راقب الأداء بشكل دوري:
```bash
# كل أسبوع، شغل:
npm run build

# وراجع الأحجام
```

### 3. استخدم Lighthouse:
```bash
# في Chrome DevTools:
1. F12 → Lighthouse
2. Generate Report
3. اقرأ الاقتراحات
```

---

## ✅ **خلاصة سريعة**

**إذا رأيت في Terminal:**

### ✅ جيد:
- `✓ Ready in 3-5s`
- `✓ Compiled in 200-500ms`
- `GET /api/xxx 200 in 100-300ms`
- لا أخطاء حمراء
- 1-2 تحذيرات فقط

### ⚠️ يحتاج فحص:
- `✓ Ready in 8-12s`
- `⚠️ Fast Refresh warning`
- `GET /api/xxx 200 in 1000ms+`
- 3-5 تحذيرات
- بعض الطلبات المكررة

### ❌ مشكلة:
- `✓ Ready in 15s+`
- `❌ Failed to compile`
- نفس الطلب يتكرر 5+ مرات
- 10+ أخطاء/تحذيرات
- Memory warnings

---

## 📝 **انسخ هذا والصقه لي:**

إذا أردت أن أساعدك، انسخ من Terminal:

```bash
# انسخ من هنا:
1. آخر 20 سطر عند بدء التشغيل
2. أي أخطاء حمراء
3. أي تحذيرات صفراء متكررة
4. مثال على طلب API وتوقيته
# انسخ حتى هنا
```

---

**هل تريد مساعدة في تحليل ما تراه؟ الصق المخرجات هنا!** 📊