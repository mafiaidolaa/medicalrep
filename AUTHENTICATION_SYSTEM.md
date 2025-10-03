# 🔐 نظام المصادقة والأمان المحسّن

## نظرة عامة

تم تحديث نظام المصادقة ليكون **احترافي، آمن، سريع، وخفيف**. يتضمن النظام حماية متعددة الطبقات على مستوى الخادم والعميل.

---

## ✨ المميزات الرئيسية

### 1. **حماية متعددة الطبقات**
- ✅ حماية على مستوى **Middleware** (Server-Side)
- ✅ حماية على مستوى **API Routes**
- ✅ حماية على مستوى **Client-Side Components**
- ✅ تحقق دوري من صحة الجلسة

### 2. **أمان محسّن**
- 🔒 JWT tokens آمنة مع التحقق من الصحة
- 🔒 Session versioning لإبطال الجلسات القديمة
- 🔒 HttpOnly cookies مع SameSite protection
- 🔒 Security Headers (X-Frame-Options, CSP, etc.)
- 🔒 التحقق من انتهاء الجلسة تلقائياً

### 3. **أداء محسّن**
- ⚡ Session caching للتقليل من طلبات API
- ⚡ Validation كل 5 دقائق بدلاً من كل طلب
- ⚡ Lazy validation - لا يعيق تحميل الصفحة
- ⚡ Background activity logging

---

## 📋 مكونات النظام

### 1. Middleware (`src/middleware.ts`)

**المسؤوليات:**
- التحقق من صحة الجلسة لكل طلب
- إعادة توجيه المستخدمين غير المصرح لهم
- إضافة Security Headers
- تسجيل النشاطات (Activity Logging)

**التحسينات:**
```typescript
// ✅ التحقق الإلزامي من الجلسة
// ❌ لا يمكن تخطي Middleware بعد الآن (SKIP_MIDDLEWARE محذوف)
// ✅ التحقق من صحة البيانات (id, role, username)
// ✅ التحقق من انتهاء الجلسة (exp check)
// ✅ Session versioning support
```

**المسارات المحمية:**
```typescript
// جميع المسارات محمية ما عدا:
- /login
- /offline
- /_next/static
- /api/auth/*
- الملفات الثابتة (.css, .js, .png, etc.)
```

---

### 2. Auth Configuration (`src/lib/auth.ts`)

**التحسينات:**

#### Session Configuration
```typescript
// الإنتاج: 7 أيام
// التطوير: 30 يوم

Session Update:
// الإنتاج: 1 ساعة
// التطوير: 24 ساعة
```

#### Secure Cookies
```typescript
{
  httpOnly: true,
  sameSite: 'lax',
  secure: (في الإنتاج),
  path: '/'
}
```

#### JWT Validation
```typescript
// التحقق من:
1. وجود البيانات الأساسية (id, role, username)
2. إصدار الجلسة (sessionVersion)
3. صحة Token في كل request
```

---

### 3. Auth Provider (`src/components/auth-provider.tsx`)

**التحسينات:**

#### Client-Side Validation
```typescript
// ✅ Session caching with timestamp
// ✅ Periodic validation (every 5 minutes)
// ✅ Invalid data detection
// ✅ Multiple failed attempts tracking
// ✅ Proper logout handling
```

#### Security Features
```typescript
1. تحقق من صحة بيانات المستخدم قبل القبول
2. تتبع محاولات الوصول الفاشلة
3. منع التوجيه التلقائي بعد تسجيل الخروج
4. تنظيف localStorage بشكل صحيح
```

---

### 4. Session Validation API (`src/app/api/auth/validate/route.ts`)

**Endpoints:**

#### GET `/api/auth/validate`
```typescript
// التحقق من صحة الجلسة الحالية
Response (Success):
{
  valid: true,
  user: { id, username, role, fullName },
  expiresAt: timestamp
}

Response (Failure):
{
  valid: false,
  error: "...",
  code: "NO_SESSION" | "INVALID_SESSION_DATA" | "SESSION_EXPIRED" | "VERSION_MISMATCH"
}
```

#### POST `/api/auth/validate`
```typescript
// تحديث آخر نشاط للمستخدم
Response:
{
  success: true,
  lastActivity: "2025-01-30T..."
}
```

---

## 🔧 الإعدادات

### Environment Variables (`.env.local`)

```bash
# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"
AUTH_TRUST_HOST="true"

# Session Versioning
DEV_COOKIE_VERSION="2"  # قم بزيادة هذا الرقم لإبطال جميع الجلسات

# Security Settings
SKIP_AUTH_CHECKS=false  # لا تعطل في الإنتاج!
# SKIP_MIDDLEWARE محذوف - الحماية دائماً مفعلة
```

---

## 🚀 كيفية الاستخدام

### 1. تسجيل الدخول
```typescript
// في صفحة Login
const result = await signIn('credentials', {
  redirect: false,
  username,
  password,
});

if (result?.ok && !result?.error) {
  // التحقق من الجلسة
  const session = await getSession();
  if (session?.user) {
    // تسجيل النشاط
    await logActivity(...);
    router.push('/');
  }
}
```

### 2. التحقق من الجلسة
```typescript
// في أي مكون
import { useSession } from 'next-auth/react';

const { data: session, status } = useSession();

if (status === 'authenticated') {
  // المستخدم مصادق عليه
}
```

### 3. الوصول لبيانات المستخدم
```typescript
import { useAuth } from '@/components/auth-provider';

const { currentUser } = useAuth();
console.log(currentUser?.role, currentUser?.fullName);
```

---

## 🛡️ Security Best Practices

### 1. إدارة الجلسات

```typescript
// ✅ DO: استخدم Session Versioning
DEV_COOKIE_VERSION="2"  // عند الحاجة لإبطال جميع الجلسات

// ❌ DON'T: لا تعطل Middleware
// SKIP_MIDDLEWARE=true  // محذوف نهائياً

// ✅ DO: استخدم HTTPS في الإنتاج
NEXTAUTH_URL="https://yourdomain.com"
```

### 2. تسجيل الخروج الآمن

```typescript
import { signOut } from 'next-auth/react';

// ✅ تسجيل خروج صحيح
const handleLogout = async () => {
  // تسجيل النشاط
  await logLogout();
  
  // تعليم وقت الخروج
  localStorage.setItem('logout_timestamp', Date.now().toString());
  
  // تسجيل الخروج
  await signOut({ redirect: false });
  router.push('/login');
};
```

### 3. حماية API Routes

```typescript
import { getToken } from 'next-auth/jwt';

export async function GET(request: NextRequest) {
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  });

  if (!token || !token.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // المنطق الخاص بك...
}
```

---

## 🔍 استكشاف الأخطاء

### المشكلة: النظام يفتح بدون تسجيل دخول

**الحل:**
```bash
# تحقق من:
1. SKIP_MIDDLEWARE غير موجود في .env.local
2. DEV_COOKIE_VERSION تم تحديثه (لإبطال الجلسات القديمة)
3. أعد تشغيل الخادم بعد تغيير .env
```

### المشكلة: يطلب تسجيل دخول متكرر

**الحل:**
```bash
# تحقق من:
1. NEXTAUTH_SECRET موجود وثابت
2. Cookies مفعلة في المتصفح
3. Session maxAge مناسب
4. لا توجد أخطاء في console
```

### المشكلة: Session expired مباشرة

**الحل:**
```typescript
// تحقق من إعدادات الجلسة في auth.ts
session: {
  maxAge: 7 * 24 * 60 * 60, // زد المدة إذا لزم
  updateAge: 60 * 60,
}
```

---

## 📊 مراقبة الأداء

### Logs المفيدة

```typescript
// في Middleware
🚫 Unauthorized access attempt to: /path
✅ Authenticated user redirected from login to dashboard

// في Auth Provider
⚠️ Invalid user data in session
⚠️ Session validation failed - logging out
⚠️ Multiple failed authentication attempts detected

// في Auth Config
⚠️ Invalid token: Missing required fields
⚠️ Session version mismatch - invalidating
```

---

## ⚡ الأداء والتحسينات

### Session Caching
- يتم حفظ الجلسة في memory لتقليل الطلبات
- التحقق كل 5 دقائق بدلاً من كل request
- لا يؤثر على تحميل الصفحة

### Background Operations
- Activity logging في background
- لا يعيق navigation
- Timeout بعد 1 ثانية للطلبات

### Security Headers
```typescript
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(self), camera=(), microphone=()
```

---

## 🎯 الخلاصة

النظام الجديد يوفر:
- ✅ **أمان كامل** - لا يمكن تجاوز المصادقة
- ✅ **أداء عالي** - caching و background operations
- ✅ **سهولة الصيانة** - كود منظم وموثق
- ✅ **مرونة** - سهل التخصيص والتوسع
- ✅ **متوافق مع المعايير** - يتبع best practices

---

## 📚 مراجع إضافية

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

---

**تم بناء هذا النظام بواسطة:** EP Group System Team
**التاريخ:** 2025-01-30
**الإصدار:** 2.0.0