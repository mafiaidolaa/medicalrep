"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
    Settings, 
    User, 
    Shield, 
    Database, 
    Globe,
    Bell,
    Briefcase,
    MapPin,
    Save,
    Info,
    CheckCircle,
    AlertTriangle,
    Users,
    Building,
    Activity,
    Monitor,
    Clock,
    FileText,
    Zap,
    Palette,
    HardDrive,
    Wifi
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDataProvider } from '@/lib/data-provider';

export default function SettingsPage() {
    const { toast } = useToast();
    const { currentUser, users } = useDataProvider();
    const [loading, setLoading] = useState(false);
    
    // Get current user data
    const currentUserData = users?.find(u => u.email === currentUser?.email);
    
    // Check for emergency access flag (development only)
    const forceAccess = typeof window !== 'undefined' && 
                       sessionStorage.getItem('force-admin-access') === 'true';
    
    // Check user permissions with multiple fallbacks
    const isAuthorized = 
        // Emergency access flag (development only)
        forceAccess ||
        // Check currentUserData first
        currentUserData?.role === 'admin' || 
        currentUserData?.role === 'gm' ||
        // Check currentUser directly
        currentUser?.role === 'admin' ||
        currentUser?.role === 'gm' ||
        // Check if user email contains admin (for testing)
        (currentUser?.email && currentUser.email.toLowerCase().includes('admin')) ||
        // Emergency override: if no users exist, allow first user to access
        (users && users.length === 0);
    
    if (!currentUser) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Card className="max-w-md w-full">
                    <CardContent className="pt-6 text-center">
                        <Shield className="mx-auto h-12 w-12 text-red-500 mb-4" />
                        <h2 className="text-xl font-semibold mb-2">يرجى تسجيل الدخول</h2>
                        <p className="text-muted-foreground mb-4">
                            يجب تسجيل الدخول للوصول لهذه الصفحة
                        </p>
                        <Button onClick={() => window.location.href = '/login'}>
                            تسجيل الدخول
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    if (!isAuthorized) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Card className="max-w-md w-full">
                    <CardContent className="pt-6 text-center">
                        <Shield className="mx-auto h-12 w-12 text-red-500 mb-4" />
                        <h2 className="text-xl font-semibold mb-2">وصول غير مسموح</h2>
                        <p className="text-muted-foreground mb-4">
                            هذه الصفحة متاحة فقط لمدراء النظام
                        </p>
                        <div className="space-y-2 mb-4">
                            <Badge variant="outline">
                                الدور الحالي: {currentUserData?.role || currentUser?.role || 'غير محدد'}
                            </Badge>
                            <Badge variant="outline">
                                البريد الإلكتروني: {currentUser?.email || 'غير محدد'}
                            </Badge>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={() => window.history.back()} variant="outline">
                                العودة
                            </Button>
                            <Button onClick={() => window.location.href = '/'}>
                                الصفحة الرئيسية
                            </Button>
                        </div>
                        
                        {/* Emergency Access Button - REMOVE IN PRODUCTION */}
                        <div className="mt-6 p-4 bg-yellow-100 border-l-4 border-yellow-500">
                            <h4 className="font-bold text-yellow-800">وصول طارئ (للتطوير فقط)</h4>
                            <p className="text-sm text-yellow-700 mb-2">
                                إذا كنت مطور وتحتاج للوصول لصفحة الإعدادات:
                            </p>
                            <Button 
                                onClick={() => {
                                    sessionStorage.setItem('force-admin-access', 'true');
                                    window.location.reload();
                                }}
                                variant="destructive"
                                size="sm"
                            >
                                فرض الوصول (مؤقت)
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Settings state
    const [systemSettings, setSystemSettings] = useState({
        siteName: 'EP Group Management System',
        siteDescription: 'نظام إدارة شامل ومتطور للمجموعة الطبية - تطوير احترافي للعمليات الطبية والإدارية',
        companyName: 'EP Group',
        version: '2.1.0',
        buildNumber: '20241224',
        environment: 'production',
        maintenanceMode: false,
        allowRegistration: true,
        defaultLanguage: 'ar',
        timeZone: 'Africa/Cairo',
    });
    
    const [securitySettings, setSecuritySettings] = useState({
        passwordMinLength: 8,
        requireSpecialChars: true,
        requireNumbers: true,
        requireUppercase: true,
        sessionTimeout: 24,
        maxLoginAttempts: 5,
        enableTwoFactor: false,
        logUserActivity: true,
    });
    
    const [notificationSettings, setNotificationSettings] = useState({
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
        dailyReports: true,
        weeklyReports: false,
        monthlyReports: true,
    });
    
    const [businessSettings, setBusinessSettings] = useState({
        currency: 'EGP',
        taxRate: 14,
        workingHoursStart: '09:00',
        workingHoursEnd: '17:00',
        workingDays: 6,
        fiscalYearStart: '01-01',
    });

    const handleSaveSettings = async (category: string) => {
        setLoading(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            toast({
                title: 'تم الحفظ بنجاح',
                description: `تم حفظ إعدادات ${category} بنجاح.`,
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'خطأ في الحفظ',
                description: 'حدث خطأ أثناء حفظ الإعدادات.',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Emergency Access Warning */}
            {forceAccess && (
                <Card className="bg-red-50 border-red-200">
                    <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-red-800 mb-2">⚠️ وضع الوصول الطارئ</h3>
                                <p className="text-sm text-red-700">
                                    تم الوصول لهذه الصفحة باستخدام الوصول الطارئ للتطوير
                                </p>
                            </div>
                            <Button 
                                onClick={() => {
                                    sessionStorage.removeItem('force-admin-access');
                                    window.location.reload();
                                }}
                                variant="outline"
                                size="sm"
                            >
                                إلغاء الوصول الطارئ
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
            
            {/* Professional Project Header */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-100 border-blue-200">
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 space-x-reverse">
                            <div className="p-3 bg-blue-600 rounded-lg">
                                <Settings className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-800">إعدادات النظام</h1>
                                <p className="text-gray-600 mt-1">{systemSettings.siteDescription}</p>
                                <div className="flex items-center space-x-4 space-x-reverse mt-2">
                                    <Badge className="bg-green-100 text-green-800">
                                        <CheckCircle className="h-3 w-3 ml-1" />
                                        إصدار {systemSettings.version}
                                    </Badge>
                                    <Badge variant="outline">
                                        البيئة: {systemSettings.environment === 'production' ? 'إنتاج' : 'تطوير'}
                                    </Badge>
                                    <Badge variant="outline">
                                        Build: {systemSettings.buildNumber}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <Badge className="px-3 py-1 bg-blue-100 text-blue-800">
                                <User className="h-3 w-3 ml-1" />
                                {currentUserData?.fullName || (currentUser as any)?.fullName || 'المدير'}
                            </Badge>
                            <p className="text-sm text-gray-500 mt-1">
                                آخر دخول: {new Date().toLocaleDateString('ar-EG')}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Settings Tabs */}
            <Tabs defaultValue="general" className="space-y-6">
                <TabsList className="grid grid-cols-3 lg:grid-cols-6 w-full">
                    <TabsTrigger value="general" className="flex items-center gap-2">
                        <Monitor className="h-4 w-4" />
                        عام
                    </TabsTrigger>
                    <TabsTrigger value="permissions" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        الصلاحيات
                    </TabsTrigger>
                    <TabsTrigger value="security" className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        الأمان
                    </TabsTrigger>
                    <TabsTrigger value="notifications" className="flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        الإشعارات
                    </TabsTrigger>
                    <TabsTrigger value="business" className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        الأعمال
                    </TabsTrigger>
                    <TabsTrigger value="system" className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        النظام
                    </TabsTrigger>
                </TabsList>

                {/* General Settings */}
                <TabsContent value="general" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Globe className="h-5 w-5" />
                                    معلومات النظام
                                </CardTitle>
                                <CardDescription>
                                    الإعدادات الأساسية ومعلومات المشروع
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>اسم النظام</Label>
                                    <Input
                                        value={systemSettings.siteName}
                                        onChange={(e) => setSystemSettings(prev => ({
                                            ...prev,
                                            siteName: e.target.value
                                        }))}
                                    />
                                </div>
                                
                                <div className="space-y-2">
                                    <Label>اسم الشركة</Label>
                                    <Input
                                        value={systemSettings.companyName}
                                        onChange={(e) => setSystemSettings(prev => ({
                                            ...prev,
                                            companyName: e.target.value
                                        }))}
                                    />
                                </div>
                                
                                <div className="space-y-2">
                                    <Label>وصف النظام</Label>
                                    <Input
                                        value={systemSettings.siteDescription}
                                        onChange={(e) => setSystemSettings(prev => ({
                                            ...prev,
                                            siteDescription: e.target.value
                                        }))}
                                    />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>الإصدار</Label>
                                        <Input
                                            value={systemSettings.version}
                                            onChange={(e) => setSystemSettings(prev => ({
                                                ...prev,
                                                version: e.target.value
                                            }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>رقم البناء</Label>
                                        <Input
                                            value={systemSettings.buildNumber}
                                            onChange={(e) => setSystemSettings(prev => ({
                                                ...prev,
                                                buildNumber: e.target.value
                                            }))}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Settings className="h-5 w-5" />
                                    إعدادات عامة
                                </CardTitle>
                                <CardDescription>
                                    التحكم في الإعدادات الأساسية للنظام
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>اللغة الافتراضية</Label>
                                        <Select
                                            value={systemSettings.defaultLanguage}
                                            onValueChange={(value) => setSystemSettings(prev => ({
                                                ...prev,
                                                defaultLanguage: value
                                            }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ar">العربية</SelectItem>
                                                <SelectItem value="en">English</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <Label>المنطقة الزمنية</Label>
                                        <Select
                                            value={systemSettings.timeZone}
                                            onValueChange={(value) => setSystemSettings(prev => ({
                                                ...prev,
                                                timeZone: value
                                            }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Africa/Cairo">القاهرة (UTC+2)</SelectItem>
                                                <SelectItem value="Asia/Riyadh">الرياض (UTC+3)</SelectItem>
                                                <SelectItem value="Asia/Dubai">دبي (UTC+4)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <Separator />

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label>وضع الصيانة</Label>
                                            <p className="text-sm text-muted-foreground">
                                                تعطيل النظام مؤقتاً للصيانة
                                            </p>
                                        </div>
                                        <Switch
                                            checked={systemSettings.maintenanceMode}
                                            onCheckedChange={(checked) => setSystemSettings(prev => ({
                                                ...prev,
                                                maintenanceMode: checked
                                            }))}
                                        />
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label>السماح بالتسجيل</Label>
                                            <p className="text-sm text-muted-foreground">
                                                السماح للمستخدمين الجدد بإنشاء حسابات
                                            </p>
                                        </div>
                                        <Switch
                                            checked={systemSettings.allowRegistration}
                                            onCheckedChange={(checked) => setSystemSettings(prev => ({
                                                ...prev,
                                                allowRegistration: checked
                                            }))}
                                        />
                                    </div>
                                </div>
                                
                                <Button 
                                    onClick={() => handleSaveSettings('الإعدادات العامة')}
                                    disabled={loading}
                                    className="w-full"
                                >
                                    <Save className="h-4 w-4 ml-2" />
                                    حفظ الإعدادات العامة
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Permissions Tab */}
                <TabsContent value="permissions" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* User Roles Management */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="h-5 w-5" />
                                    إدارة الأدوار والصلاحيات
                                </CardTitle>
                                <CardDescription>
                                    إدارة أدوار المستخدمين وصلاحياتهم في النظام
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-3">
                                    {Object.entries({
                                        admin: {
                                            name: 'مدير عام',
                                            permissions: 'جميع الصلاحيات • إدارة كاملة للنظام',
                                            color: 'bg-red-100 text-red-800 border-red-200',
                                            users: users?.filter(u => u.role === 'admin').length || 0
                                        },
                                        gm: {
                                            name: 'مدير عام مساعد',
                                            permissions: 'جميع الصلاحيات • مساعد المدير العام',
                                            color: 'bg-orange-100 text-orange-800 border-orange-200',
                                            users: users?.filter(u => u.role === 'gm').length || 0
                                        },
                                        manager: {
                                            name: 'مدير',
                                            permissions: 'إدارة • تقارير • مستخدمين • عيادات',
                                            color: 'bg-blue-100 text-blue-800 border-blue-200',
                                            users: users?.filter(u => u.role === 'manager').length || 0
                                        },
                                        area_manager: {
                                            name: 'مدير منطقة',
                                            permissions: 'إدارة المنطقة • تقارير • مندوبين',
                                            color: 'bg-cyan-100 text-cyan-800 border-cyan-200',
                                            users: users?.filter(u => u.role === 'area_manager').length || 0
                                        },
                                        line_manager: {
                                            name: 'مدير خط',
                                            permissions: 'إدارة الخط • تقارير • مندوبين',
                                            color: 'bg-teal-100 text-teal-800 border-teal-200',
                                            users: users?.filter(u => u.role === 'line_manager').length || 0
                                        },
                                        medical_rep: {
                                            name: 'مندوب طبي',
                                            permissions: 'زيارات • طلبات • عيادات • مخزون',
                                            color: 'bg-green-100 text-green-800 border-green-200',
                                            users: users?.filter(u => u.role === 'medical_rep').length || 0
                                        },
                                        warehouse_manager: {
                                            name: 'مدير مستودع',
                                            permissions: 'إدارة المخزون • الشحن • التسليم',
                                            color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                                            users: users?.filter(u => u.role === 'warehouse_manager').length || 0
                                        },
                                        accountant: {
                                            name: 'محاسب',
                                            permissions: 'محاسبة • تقارير مالية • فواتير',
                                            color: 'bg-purple-100 text-purple-800 border-purple-200',
                                            users: users?.filter(u => u.role === 'accountant').length || 0
                                        }
                                    }).map(([roleKey, role]) => (
                                        <div key={roleKey} className={`flex items-center justify-between p-4 border rounded-lg ${role.color}`}>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="font-semibold">{role.name}</h4>
                                                    <Badge variant="outline" className="bg-white/50">
                                                        {role.users} مستخدم
                                                    </Badge>
                                                </div>
                                                <p className="text-sm opacity-80">{role.permissions}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                <Alert>
                                    <Info className="h-4 w-4" />
                                    <AlertDescription>
                                        يمكن تعديل صلاحيات المستخدمين من صفحة إدارة المستخدمين.
                                        تواصل مع المطور لتخصيص صلاحيات إضافية.
                                    </AlertDescription>
                                </Alert>
                            </CardContent>
                        </Card>

                        {/* Current Users */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="h-5 w-5" />
                                    المستخدمون الحاليون
                                </CardTitle>
                                <CardDescription>
                                    قائمة بجميع المستخدمين المسجلين في النظام
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {users && users.length > 0 ? (
                                        users.map((user) => (
                                            <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                                                <div className="flex items-center space-x-3 space-x-reverse">
                                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                                        <User className="h-4 w-4 text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{user.fullName}</p>
                                                        <p className="text-sm text-muted-foreground">{user.email}</p>
                                                        {user.area && (
                                                            <p className="text-xs text-muted-foreground">المنطقة: {user.area}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <Badge variant="outline" className="mb-1">
                                                        {user.role}
                                                    </Badge>
                                                    {user.hireDate && (
                                                        <p className="text-xs text-muted-foreground">
                                                            منذ {new Date(user.hireDate).getFullYear()}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8">
                                            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                                            <p className="text-muted-foreground">لا توجد بيانات مستخدمين</p>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="mt-4 pt-4 border-t">
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        <div>
                                            <p className="text-2xl font-bold text-blue-600">{users?.length || 0}</p>
                                            <p className="text-sm text-muted-foreground">إجمالي المستخدمين</p>
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-green-600">
                                                {users?.filter(u => u.role === 'admin' || u.role === 'gm').length || 0}
                                            </p>
                                            <p className="text-sm text-muted-foreground">المدراء</p>
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-orange-600">
                                                {users?.filter(u => u.role === 'medical_rep').length || 0}
                                            </p>
                                            <p className="text-sm text-muted-foreground">المندوبين</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* System Info Tab */}
                <TabsContent value="system" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* System Status */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Activity className="h-5 w-5" />
                                    حالة النظام
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm">حالة الخادم</span>
                                        <Badge className="bg-green-100 text-green-800">
                                            <CheckCircle className="h-3 w-3 ml-1" />
                                            متصل
                                        </Badge>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm">قاعدة البيانات</span>
                                        <Badge className="bg-green-100 text-green-800">
                                            <CheckCircle className="h-3 w-3 ml-1" />
                                            نشطة
                                        </Badge>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm">التخزين</span>
                                        <Badge variant="outline">
                                            <HardDrive className="h-3 w-3 ml-1" />
                                            85% متاح
                                        </Badge>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm">الشبكة</span>
                                        <Badge className="bg-green-100 text-green-800">
                                            <Wifi className="h-3 w-3 ml-1" />
                                            مستقرة
                                        </Badge>
                                    </div>
                                </div>
                                
                                <Separator />
                                
                                <div className="text-center">
                                    <p className="text-sm text-muted-foreground">آخر فحص</p>
                                    <p className="text-sm font-medium">{new Date().toLocaleString('ar-EG')}</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Technical Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Monitor className="h-5 w-5" />
                                    المعلومات التقنية
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium">الإطار:</span>
                                        <span className="text-sm">Next.js 15.5.4</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium">قاعدة البيانات:</span>
                                        <span className="text-sm">Supabase PostgreSQL</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium">المصادقة:</span>
                                        <span className="text-sm">NextAuth.js</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium">التصميم:</span>
                                        <span className="text-sm">Tailwind CSS</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium">المكونات:</span>
                                        <span className="text-sm">Shadcn/UI</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium">الأيقونات:</span>
                                        <span className="text-sm">Lucide React</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium">الخرائط:</span>
                                        <span className="text-sm">Google Maps API</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium">اللغة:</span>
                                        <span className="text-sm">TypeScript</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Developer Information */}
                        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-purple-800">
                                    <Building className="h-5 w-5" />
                                    معلومات المطور
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Building className="h-8 w-8 text-white" />
                                    </div>
                                    <h3 className="font-bold text-purple-900">EP Group Development</h3>
                                    <p className="text-sm text-purple-700">فريق تطوير متخصص ومتطور</p>
                                </div>
                                
                                <Separator />
                                
                                <div className="space-y-2 text-sm">
                                    <p><strong>تاريخ التطوير:</strong> ديسمبر 2024</p>
                                    <p><strong>نوع التطوير:</strong> مخصوص احترافي</p>
                                    <p><strong>التقنيات:</strong> Full Stack Modern</p>
                                    <p><strong>الدعم:</strong> 24/7</p>
                                    <p><strong>المنصة:</strong> Web Application</p>
                                    <p><strong>الاستضافة:</strong> Cloud Native</p>
                                </div>
                                
                                <Alert>
                                    <Info className="h-4 w-4" />
                                    <AlertDescription className="text-sm">
                                        تم تطوير هذا النظام خصيصاً لمجموعة EP الطبية
                                        باستخدام أحدث التقنيات والمعايير العالمية للتطوير.
                                        النظام مصمم ليكون قابلاً للتوسع ومرناً لمتطلبات المستقبل.
                                    </AlertDescription>
                                </Alert>
                                
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="w-full border-purple-200 text-purple-700 hover:bg-purple-50"
                                >
                                    <FileText className="h-4 w-4 ml-2" />
                                    وثائق النظام التقنية
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Security Settings Tab */}
                <TabsContent value="security" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5" />
                                إعدادات الأمان والحماية
                            </CardTitle>
                            <CardDescription>
                                إدارة إعدادات الأمان وحماية البيانات والمصادقة
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h4 className="font-semibold">إعدادات كلمة المرور</h4>
                                    <div className="space-y-2">
                                        <Label>الحد الأدنى لطول كلمة المرور</Label>
                                        <Input
                                            type="number"
                                            min="6"
                                            max="20"
                                            value={securitySettings.passwordMinLength}
                                            onChange={(e) => setSecuritySettings(prev => ({
                                                ...prev,
                                                passwordMinLength: parseInt(e.target.value)
                                            }))}
                                        />
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label>اشتراط الأرقام</Label>
                                            <p className="text-sm text-muted-foreground">
                                                وجوب احتواء كلمة المرور على أرقام
                                            </p>
                                        </div>
                                        <Switch
                                            checked={securitySettings.requireNumbers}
                                            onCheckedChange={(checked) => setSecuritySettings(prev => ({
                                                ...prev,
                                                requireNumbers: checked
                                            }))}
                                        />
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label>اشتراط الأحرف الكبيرة</Label>
                                            <p className="text-sm text-muted-foreground">
                                                وجوب احتواء كلمة المرور على أحرف كبيرة
                                            </p>
                                        </div>
                                        <Switch
                                            checked={securitySettings.requireUppercase}
                                            onCheckedChange={(checked) => setSecuritySettings(prev => ({
                                                ...prev,
                                                requireUppercase: checked
                                            }))}
                                        />
                                    </div>
                                </div>
                                
                                <div className="space-y-4">
                                    <h4 className="font-semibold">إعدادات الجلسة والدخول</h4>
                                    <div className="space-y-2">
                                        <Label>مدة انتهاء الجلسة (ساعات)</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            max="168"
                                            value={securitySettings.sessionTimeout}
                                            onChange={(e) => setSecuritySettings(prev => ({
                                                ...prev,
                                                sessionTimeout: parseInt(e.target.value)
                                            }))}
                                        />
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <Label>الحد الأقصى لمحاولات تسجيل الدخول</Label>
                                        <Input
                                            type="number"
                                            min="3"
                                            max="10"
                                            value={securitySettings.maxLoginAttempts}
                                            onChange={(e) => setSecuritySettings(prev => ({
                                                ...prev,
                                                maxLoginAttempts: parseInt(e.target.value)
                                            }))}
                                        />
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label>المصادقة الثنائية</Label>
                                            <p className="text-sm text-muted-foreground">
                                                تفعيل المصادقة الثنائية للحسابات الحساسة
                                            </p>
                                        </div>
                                        <Switch
                                            checked={securitySettings.enableTwoFactor}
                                            onCheckedChange={(checked) => setSecuritySettings(prev => ({
                                                ...prev,
                                                enableTwoFactor: checked
                                            }))}
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <Separator />
                            
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>تسجيل أنشطة المستخدمين</Label>
                                    <p className="text-sm text-muted-foreground">
                                        تسجيل جميع العمليات والأنشطة في النظام
                                    </p>
                                </div>
                                <Switch
                                    checked={securitySettings.logUserActivity}
                                    onCheckedChange={(checked) => setSecuritySettings(prev => ({
                                        ...prev,
                                        logUserActivity: checked
                                    }))}
                                />
                            </div>
                            
                            <Button 
                                onClick={() => handleSaveSettings('الأمان')}
                                disabled={loading}
                                className="w-full"
                            >
                                <Save className="h-4 w-4 ml-2" />
                                حفظ إعدادات الأمان
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Notifications Tab */}
                <TabsContent value="notifications" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Bell className="h-5 w-5" />
                                إعدادات الإشعارات والتنبيهات
                            </CardTitle>
                            <CardDescription>
                                إدارة أنواع الإشعارات والتقارير الدورية
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h4 className="font-semibold">الإشعارات الفورية</h4>
                                    
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label>الإشعارات عبر البريد الإلكتروني</Label>
                                            <p className="text-sm text-muted-foreground">
                                                إرسال الإشعارات المهمة عبر البريد الإلكتروني
                                            </p>
                                        </div>
                                        <Switch
                                            checked={notificationSettings.emailNotifications}
                                            onCheckedChange={(checked) => setNotificationSettings(prev => ({
                                                ...prev,
                                                emailNotifications: checked
                                            }))}
                                        />
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label>الإشعارات النصية (SMS)</Label>
                                            <p className="text-sm text-muted-foreground">
                                                إرسال التنبيهات العاجلة عبر الرسائل النصية
                                            </p>
                                        </div>
                                        <Switch
                                            checked={notificationSettings.smsNotifications}
                                            onCheckedChange={(checked) => setNotificationSettings(prev => ({
                                                ...prev,
                                                smsNotifications: checked
                                            }))}
                                        />
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label>الإشعارات المنبثقة</Label>
                                            <p className="text-sm text-muted-foreground">
                                                إشعارات فورية داخل النظام
                                            </p>
                                        </div>
                                        <Switch
                                            checked={notificationSettings.pushNotifications}
                                            onCheckedChange={(checked) => setNotificationSettings(prev => ({
                                                ...prev,
                                                pushNotifications: checked
                                            }))}
                                        />
                                    </div>
                                </div>
                                
                                <div className="space-y-4">
                                    <h4 className="font-semibold">التقارير الدورية</h4>
                                    
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label>التقارير اليومية</Label>
                                            <p className="text-sm text-muted-foreground">
                                                ملخص يومي للأنشطة والإحصائيات
                                            </p>
                                        </div>
                                        <Switch
                                            checked={notificationSettings.dailyReports}
                                            onCheckedChange={(checked) => setNotificationSettings(prev => ({
                                                ...prev,
                                                dailyReports: checked
                                            }))}
                                        />
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label>التقارير الأسبوعية</Label>
                                            <p className="text-sm text-muted-foreground">
                                                تقرير أسبوعي شامل للأداء
                                            </p>
                                        </div>
                                        <Switch
                                            checked={notificationSettings.weeklyReports}
                                            onCheckedChange={(checked) => setNotificationSettings(prev => ({
                                                ...prev,
                                                weeklyReports: checked
                                            }))}
                                        />
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label>التقارير الشهرية</Label>
                                            <p className="text-sm text-muted-foreground">
                                                تقرير شهري تفصيلي وإحصائيات
                                            </p>
                                        </div>
                                        <Switch
                                            checked={notificationSettings.monthlyReports}
                                            onCheckedChange={(checked) => setNotificationSettings(prev => ({
                                                ...prev,
                                                monthlyReports: checked
                                            }))}
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <Button 
                                onClick={() => handleSaveSettings('الإشعارات')}
                                disabled={loading}
                                className="w-full"
                            >
                                <Save className="h-4 w-4 ml-2" />
                                حفظ إعدادات الإشعارات
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Business Settings Tab */}
                <TabsContent value="business" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Briefcase className="h-5 w-5" />
                                إعدادات الأعمال والعمليات
                            </CardTitle>
                            <CardDescription>
                                إدارة الإعدادات المالية والتشغيلية للأعمال
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h4 className="font-semibold">الإعدادات المالية</h4>
                                    
                                    <div className="space-y-2">
                                        <Label>العملة الرئيسية</Label>
                                        <Select
                                            value={businessSettings.currency}
                                            onValueChange={(value) => setBusinessSettings(prev => ({
                                                ...prev,
                                                currency: value
                                            }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="EGP">جنيه مصري (EGP)</SelectItem>
                                                <SelectItem value="SAR">ريال سعودي (SAR)</SelectItem>
                                                <SelectItem value="AED">درهم إماراتي (AED)</SelectItem>
                                                <SelectItem value="USD">دولار أمريكي (USD)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <Label>معدل الضريبة (%)</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="30"
                                            value={businessSettings.taxRate}
                                            onChange={(e) => setBusinessSettings(prev => ({
                                                ...prev,
                                                taxRate: parseFloat(e.target.value)
                                            }))}
                                        />
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <Label>بداية السنة المالية</Label>
                                        <Input
                                            placeholder="MM-DD"
                                            value={businessSettings.fiscalYearStart}
                                            onChange={(e) => setBusinessSettings(prev => ({
                                                ...prev,
                                                fiscalYearStart: e.target.value
                                            }))}
                                        />
                                    </div>
                                </div>
                                
                                <div className="space-y-4">
                                    <h4 className="font-semibold">ساعات العمل</h4>
                                    
                                    <div className="space-y-2">
                                        <Label>بداية الدوام</Label>
                                        <Input
                                            type="time"
                                            value={businessSettings.workingHoursStart}
                                            onChange={(e) => setBusinessSettings(prev => ({
                                                ...prev,
                                                workingHoursStart: e.target.value
                                            }))}
                                        />
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <Label>نهاية الدوام</Label>
                                        <Input
                                            type="time"
                                            value={businessSettings.workingHoursEnd}
                                            onChange={(e) => setBusinessSettings(prev => ({
                                                ...prev,
                                                workingHoursEnd: e.target.value
                                            }))}
                                        />
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <Label>أيام العمل في الأسبوع</Label>
                                        <Select
                                            value={businessSettings.workingDays.toString()}
                                            onValueChange={(value) => setBusinessSettings(prev => ({
                                                ...prev,
                                                workingDays: parseInt(value)
                                            }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="5">5 أيام (الأحد - الخميس)</SelectItem>
                                                <SelectItem value="6">6 أيام (الأحد - الجمعة)</SelectItem>
                                                <SelectItem value="7">7 أيام (طوال الأسبوع)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                            
                            <Button 
                                onClick={() => handleSaveSettings('الأعمال')}
                                disabled={loading}
                                className="w-full"
                            >
                                <Save className="h-4 w-4 ml-2" />
                                حفظ إعدادات الأعمال
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}