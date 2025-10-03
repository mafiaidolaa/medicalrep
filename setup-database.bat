@echo off
echo ========================================
echo       اعداد قاعدة بيانات النظام
echo ========================================
echo.

REM تحقق من وجود PostgreSQL
where psql >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo خطأ: PostgreSQL غير مثبت أو غير متاح في PATH
    echo يرجى تثبيت PostgreSQL أو إضافته للمسار
    echo أو استخدم pgAdmin لتنفيذ الملفات SQL يدوياً
    pause
    exit /b 1
)

REM اختبار الاتصال بـ PostgreSQL
echo جاري اختبار الاتصال بـ PostgreSQL...
psql -U postgres -c "SELECT version();" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo خطأ: لا يمكن الاتصال بـ PostgreSQL
    echo تأكد من أن الخدمة تعمل وأن اسم المستخدم صحيح
    echo قد تحتاج لإدخال كلمة المرور
    pause
    exit /b 1
)

echo تم الاتصال بنجاح!
echo.

REM إنشاء قاعدة البيانات إذا لم تكن موجودة
echo جاري إنشاء قاعدة البيانات...
psql -U postgres -c "CREATE DATABASE orders_management WITH ENCODING 'UTF8';" 2>nul
if %ERRORLEVEL% EQU 0 (
    echo تم إنشاء قاعدة البيانات بنجاح
) else (
    echo قاعدة البيانات موجودة مسبقاً - سيتم المتابعة
)
echo.

REM إنشاء مستخدم للتطبيق إذا لم يكن موجود
echo جاري إنشاء مستخدم التطبيق...
psql -U postgres -c "CREATE USER orders_app WITH PASSWORD 'secure_password_123';" 2>nul
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE orders_management TO orders_app;" 2>nul
echo تم إعداد مستخدم التطبيق
echo.

REM خيار إعادة تعيين قاعدة البيانات
echo هل تريد إعادة تعيين قاعدة البيانات؟ (سيحذف الجداول الموجودة)
set /p reset_choice="اكتب Y لنعم أو N لا: "
if /i "%reset_choice%"=="Y" (
    echo جاري إعادة تعيين قاعدة البيانات...
    psql -U postgres -d orders_management -f database\reset-database.sql
    if %ERRORLEVEL% EQU 0 (
        echo تم إعادة تعيين قاعدة البيانات بنجاح
    ) else (
        echo حدث خطأ أثناء إعادة التعيين
    )
    echo.
)

REM تنفيذ ملف إنشاء الجداول
echo جاري إنشاء الجداول والبيانات...
psql -U postgres -d orders_management -f database\orders-system-postgresql.sql
if %ERRORLEVEL% EQU 0 (
    echo ✅ تم إعداد قاعدة البيانات بنجاح!
    echo.
    echo 📋 بيانات تسجيل الدخول:
    echo المديرون: manager@example.com / password123
    echo المندوبون: rep@example.com / password123
    echo المحاسبون: accountant@example.com / password123
    echo.
    echo 🚀 يمكنك الآن تشغيل النظام:
    echo npm run dev
    echo.
    echo 🌐 ثم انتقل إلى: http://localhost:3000/orders
) else (
    echo ❌ حدث خطأ أثناء إعداد قاعدة البيانات
    echo يرجى مراجعة الأخطاء أعلاه
)

echo.
echo اضغط أي مفتاح للإغلاق...
pause >nul