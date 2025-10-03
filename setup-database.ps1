# PowerShell Script لإعداد قاعدة بيانات نظام إدارة الطلبات
# يتطلب تشغيله كمدير

param(
    [string]$PostgreSQLUser = "postgres",
    [string]$DatabaseName = "orders_management",
    [string]$AppUser = "orders_app",
    [string]$AppPassword = "secure_password_123",
    [switch]$Reset
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "       إعداد قاعدة بيانات النظام       " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# تحقق من وجود PostgreSQL
Write-Host "🔍 البحث عن PostgreSQL..." -ForegroundColor Yellow

$psqlCommand = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlCommand) {
    # البحث في المجلدات الشائعة
    $possiblePaths = @(
        "C:\Program Files\PostgreSQL\*\bin",
        "C:\Program Files (x86)\PostgreSQL\*\bin"
    )
    
    $psqlPath = $null
    foreach ($path in $possiblePaths) {
        $foundPath = Get-ChildItem $path -ErrorAction SilentlyContinue | Where-Object {$_.Name -eq "psql.exe"} | Select-Object -First 1
        if ($foundPath) {
            $psqlPath = $foundPath.FullName
            break
        }
    }
    
    if (-not $psqlPath) {
        Write-Host "❌ خطأ: PostgreSQL غير مثبت أو غير متاح" -ForegroundColor Red
        Write-Host ""
        Write-Host "الحلول الممكنة:" -ForegroundColor Yellow
        Write-Host "1. تثبيت PostgreSQL من: https://www.postgresql.org/download/windows/"
        Write-Host "2. استخدام pgAdmin (واجهة رسومية)"
        Write-Host "3. استخدام Supabase (سحابي)"
        Write-Host ""
        Read-Host "اضغط Enter للإغلاق"
        exit 1
    }
    
    Write-Host "✅ تم العثور على PostgreSQL في: $psqlPath" -ForegroundColor Green
    $global:PSQLCommand = $psqlPath
} else {
    Write-Host "✅ تم العثور على PostgreSQL في PATH" -ForegroundColor Green
    $global:PSQLCommand = "psql"
}

# وظيفة لتنفيذ أمر PostgreSQL
function Invoke-PostgreSQLCommand {
    param(
        [string]$Command,
        [string]$Database = "",
        [string]$File = "",
        [switch]$IgnoreError
    )
    
    $args = @("-U", $PostgreSQLUser)
    if ($Database) { $args += @("-d", $Database) }
    if ($File) { $args += @("-f", $File) }
    if ($Command) { $args += @("-c", $Command) }
    
    $result = & $global:PSQLCommand $args 2>&1
    
    if ($LASTEXITCODE -ne 0 -and -not $IgnoreError) {
        Write-Host "❌ خطأ في تنفيذ الأمر: $result" -ForegroundColor Red
        return $false
    }
    
    return $true
}

# اختبار الاتصال
Write-Host "🔌 اختبار الاتصال بـ PostgreSQL..." -ForegroundColor Yellow
if (-not (Invoke-PostgreSQLCommand -Command "SELECT version();" -IgnoreError)) {
    Write-Host "❌ فشل الاتصال بـ PostgreSQL" -ForegroundColor Red
    Write-Host "تأكد من:" -ForegroundColor Yellow
    Write-Host "- تشغيل خدمة PostgreSQL"
    Write-Host "- صحة اسم المستخدم وكلمة المرور"
    Read-Host "اضغط Enter للإغلاق"
    exit 1
}

Write-Host "✅ تم الاتصال بنجاح!" -ForegroundColor Green
Write-Host ""

# إنشاء قاعدة البيانات
Write-Host "🗃️ إعداد قاعدة البيانات..." -ForegroundColor Yellow
$createDBResult = Invoke-PostgreSQLCommand -Command "CREATE DATABASE $DatabaseName WITH ENCODING 'UTF8';" -IgnoreError

if ($createDBResult) {
    Write-Host "✅ تم إنشاء قاعدة البيانات بنجاح" -ForegroundColor Green
} else {
    Write-Host "ℹ️ قاعدة البيانات موجودة مسبقاً" -ForegroundColor Cyan
}

# إنشاء مستخدم التطبيق
Write-Host "👤 إعداد مستخدم التطبيق..." -ForegroundColor Yellow
Invoke-PostgreSQLCommand -Command "CREATE USER $AppUser WITH PASSWORD '$AppPassword';" -IgnoreError
Invoke-PostgreSQLCommand -Command "GRANT ALL PRIVILEGES ON DATABASE $DatabaseName TO $AppUser;" -IgnoreError
Write-Host "✅ تم إعداد مستخدم التطبيق" -ForegroundColor Green
Write-Host ""

# خيار إعادة التعيين
if ($Reset) {
    Write-Host "🔄 إعادة تعيين قاعدة البيانات..." -ForegroundColor Yellow
    if (Test-Path "database\reset-database.sql") {
        if (Invoke-PostgreSQLCommand -Database $DatabaseName -File "database\reset-database.sql") {
            Write-Host "✅ تم إعادة تعيين قاعدة البيانات" -ForegroundColor Green
        } else {
            Write-Host "❌ فشل في إعادة التعيين" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ ملف reset-database.sql غير موجود" -ForegroundColor Red
    }
    Write-Host ""
} elseif (-not $Reset) {
    $resetChoice = Read-Host "هل تريد إعادة تعيين قاعدة البيانات؟ (سيحذف البيانات الموجودة) [y/N]"
    if ($resetChoice -eq "y" -or $resetChoice -eq "Y") {
        Write-Host "🔄 إعادة تعيين قاعدة البيانات..." -ForegroundColor Yellow
        if (Test-Path "database\reset-database.sql") {
            if (Invoke-PostgreSQLCommand -Database $DatabaseName -File "database\reset-database.sql") {
                Write-Host "✅ تم إعادة تعيين قاعدة البيانات" -ForegroundColor Green
            }
        }
        Write-Host ""
    }
}

# إنشاء الجداول والبيانات
Write-Host "📊 إنشاء الجداول والبيانات..." -ForegroundColor Yellow

if (-not (Test-Path "database\orders-system-postgresql.sql")) {
    Write-Host "❌ ملف orders-system-postgresql.sql غير موجود" -ForegroundColor Red
    Read-Host "اضغط Enter للإغلاق"
    exit 1
}

if (Invoke-PostgreSQLCommand -Database $DatabaseName -File "database\orders-system-postgresql.sql") {
    Write-Host ""
    Write-Host "🎉 ✅ تم إعداد قاعدة البيانات بنجاح!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 بيانات تسجيل الدخول:" -ForegroundColor Cyan
    Write-Host "المديرون: manager@example.com / password123" -ForegroundColor White
    Write-Host "المندوبون: rep@example.com / password123" -ForegroundColor White  
    Write-Host "المحاسبون: accountant@example.com / password123" -ForegroundColor White
    Write-Host ""
    Write-Host "🚀 يمكنك الآن تشغيل النظام:" -ForegroundColor Cyan
    Write-Host "npm run dev" -ForegroundColor White
    Write-Host ""
    Write-Host "🌐 ثم انتقل إلى: http://localhost:3000/orders" -ForegroundColor Cyan
} else {
    Write-Host "❌ فشل في إعداد قاعدة البيانات" -ForegroundColor Red
    Write-Host "يرجى مراجعة الأخطاء أعلاه أو استخدام pgAdmin" -ForegroundColor Yellow
}

Write-Host ""
Read-Host "اضغط Enter للإغلاق"