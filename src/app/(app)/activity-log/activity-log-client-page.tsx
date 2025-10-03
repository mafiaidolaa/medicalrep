
"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, Building, FileText, Key, Locate, Monitor, MousePointer, Smartphone, Tablet, Watch, X, User, Clock, CheckCircle, XCircle, Globe, Map, Filter, Search, Download, Printer, Calendar, Shield, AlertTriangle, Eye, ExternalLink, MapPin, Navigation, Target, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ActivityLog } from '@/lib/types';
import i18n from '@/lib/i18n'; // Using mock i18n
import { CyberSecurityCenter } from '@/components/settings/cybersecurity-center';
import { EnhancedGoogleMaps } from '@/components/ui/enhanced-google-maps';
import { locationService } from '@/lib/location-service';
import { useTestLocationSystem } from '@/hooks/use-test-location-system';
import { LocationSystemDiagnostics } from '@/components/location-system-diagnostics';
import { useEffect as useReactEffect } from 'react';

const typeToIcon: { [key: string]: React.ElementType } = {
    login: Key,
    logout: Key,
    failed_login: Shield,
    visit: Briefcase,
    order: FileText,
    collection: FileText,
    register_clinic: Building,
    user_create: User,
    user_update: User,
    user_delete: User,
    invoice_created: FileText,
    debt_created: FileText,
    expense_created: FileText,
    payment_created: FileText,
    payment_confirmed: CheckCircle,
    payment_cancelled: XCircle,
    payment_bounced: XCircle,
    clinic_created: Building,
    clinic_updated: Building,
    clinic_deleted: Building,
    page_access: Eye,
    data_export: Download,
};

const deviceToIcon: { [key: string]: React.ElementType } = {
    Desktop: Monitor,
    Mobile: Smartphone,
    Tablet: Tablet
};

const typeToColor: { [key: string]: string } = {
    login: 'bg-green-500',
    logout: 'bg-blue-500',
    failed_login: 'bg-red-500',
    visit: 'bg-purple-500',
    order: 'bg-orange-500',
    collection: 'bg-yellow-500',
    register_clinic: 'bg-cyan-500',
    user_create: 'bg-teal-500',
    user_update: 'bg-indigo-500',
    user_delete: 'bg-red-600',
    invoice_created: 'bg-emerald-500',
    debt_created: 'bg-rose-500',
    expense_created: 'bg-amber-500',
    payment_created: 'bg-lime-500',
    payment_confirmed: 'bg-green-600',
    payment_cancelled: 'bg-red-500',
    payment_bounced: 'bg-red-600',
    clinic_created: 'bg-cyan-600',
    clinic_updated: 'bg-blue-600',
    clinic_deleted: 'bg-red-700',
    page_access: 'bg-slate-500',
    data_export: 'bg-violet-500',
};

const getRiskBadgeColor = (riskScore?: number) => {
    if (!riskScore) return 'bg-gray-500';
    if (riskScore >= 70) return 'bg-red-500';
    if (riskScore >= 40) return 'bg-yellow-500';
    return 'bg-green-500';
};

const DetailRow = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: React.ReactNode }) => (
    <div className="flex items-start gap-4">
        <Icon className="h-5 w-5 text-muted-foreground mt-1" />
        <div>
            <p className="text-sm font-semibold text-muted-foreground">{label}</p>
            <p className="text-base text-foreground">{value}</p>
        </div>
    </div>
);

interface ActivityLogClientPageProps {
    initialActivityLog: ActivityLog[];
}

export function ActivityLogClientPage({ initialActivityLog }: ActivityLogClientPageProps) {
    const t = i18n.t;
    const [activeTab, setActiveTab] = useState<'activity' | 'security'>('activity');
    const [activityLog] = useState<ActivityLog[]>(initialActivityLog);
    const { createSampleActivities, testLocationPermission } = useTestLocationSystem();
    const [selectedActivity, setSelectedActivity] = useState<ActivityLog | null>(null);
    const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>(initialActivityLog);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [successFilter, setSuccessFilter] = useState<string>('all');
    const [dateRange, setDateRange] = useState({ from: '', to: '' });
    const [riskFilter, setRiskFilter] = useState<string>('all');
    const [showMapView, setShowMapView] = useState(false);
    const [locationFilter, setLocationFilter] = useState<string>('all');
    const [selectedLocationActivity, setSelectedLocationActivity] = useState<ActivityLog | null>(null);

    // Filter logs based on search and filter criteria
    useEffect(() => {
        let filtered = activityLog;

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(log => 
                log.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.ip?.includes(searchTerm) ||
                log.attemptedUsername?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Type filter
        if (typeFilter !== 'all') {
            filtered = filtered.filter(log => log.type === typeFilter);
        }

        // Success filter
        if (successFilter !== 'all') {
            if (successFilter === 'success') {
                filtered = filtered.filter(log => log.isSuccess !== false);
            } else if (successFilter === 'failed') {
                filtered = filtered.filter(log => log.isSuccess === false);
            }
        }

        // Date range filter
        if (dateRange.from || dateRange.to) {
            filtered = filtered.filter(log => {
                const logDate = new Date(log.timestamp);
                const fromDate = dateRange.from ? new Date(dateRange.from) : new Date('1970-01-01');
                const toDate = dateRange.to ? new Date(dateRange.to + 'T23:59:59') : new Date();
                return logDate >= fromDate && logDate <= toDate;
            });
        }

        // Risk filter
        if (riskFilter !== 'all') {
            filtered = filtered.filter(log => {
                const risk = log.riskScore || 0;
                switch (riskFilter) {
                    case 'high': return risk >= 70;
                    case 'medium': return risk >= 40 && risk < 70;
                    case 'low': return risk < 40;
                    default: return true;
                }
            });
        }

        // Location filter
        if (locationFilter !== 'all') {
            filtered = filtered.filter(log => {
                switch (locationFilter) {
                    case 'with_location': return log.lat && log.lng;
                    case 'without_location': return !log.lat || !log.lng;
                    case 'with_address': return log.locationName || log.city;
                    default: return true;
                }
            });
        }

        setFilteredLogs(filtered);
    }, [activityLog, searchTerm, typeFilter, successFilter, dateRange, riskFilter, locationFilter]);

    // Print function
    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            const printContent = generatePrintHTML(filteredLogs);
            printWindow.document.write(printContent);
            printWindow.document.close();
            printWindow.print();
        }
    };

    // Save as PDF function (using browser's print to PDF)
    const handleSavePDF = () => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            const printContent = generatePrintHTML(filteredLogs, true);
            printWindow.document.write(printContent);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.print();
            }, 500);
        }
    };

    // Generate HTML for printing
    const generatePrintHTML = (logs: ActivityLog[], isPDF: boolean = false) => {
        const title = isPDF ? 'تقرير سجل الأنشطة - EP Group System' : 'سجل الأنشطة - EP Group System';
        return `
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head>
                <meta charset="UTF-8">
                <title>${title}</title>
                <style>
                    body { font-family: 'Arial', sans-serif; margin: 20px; color: #333; direction: rtl; }
                    .header { text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
                    .header h1 { color: #2563eb; margin-bottom: 10px; font-size: 28px; }
                    .header p { color: #666; font-size: 14px; }
                    .summary { background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 30px; }
                    .activity-item { border: 1px solid #e5e7eb; margin-bottom: 15px; padding: 15px; border-radius: 8px; break-inside: avoid; }
                    .activity-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
                    .activity-title { font-weight: bold; color: #1f2937; font-size: 16px; }
                    .activity-meta { font-size: 12px; color: #6b7280; }
                    .success { border-left: 4px solid #10b981; }
                    .failed { border-left: 4px solid #ef4444; }
                    .high-risk { border-left: 4px solid #dc2626; background: #fef2f2; }
                    .location-info { margin-top: 8px; font-size: 12px; color: #6b7280; }
                    .device-info { margin-top: 8px; font-size: 12px; color: #6b7280; }
                    .risk-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; color: white; font-size: 10px; }
                    .risk-high { background: #dc2626; }
                    .risk-medium { background: #f59e0b; }
                    .risk-low { background: #10b981; }
                    .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 20px; }
                    @media print {
                        body { margin: 0; }
                        .activity-item { page-break-inside: avoid; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${title}</h1>
                    <p>تم إنشاء التقرير في: ${new Date().toLocaleString('ar-EG')}</p>
                    <p>عدد الأنشطة: ${logs.length}</p>
                </div>
                
                <div class="summary">
                    <h3>ملخص التقرير</h3>
                    <p><strong>إجمالي الأنشطة:</strong> ${logs.length}</p>
                    <p><strong>الأنشطة الناجحة:</strong> ${logs.filter(l => l.isSuccess !== false).length}</p>
                    <p><strong>الأنشطة الفاشلة:</strong> ${logs.filter(l => l.isSuccess === false).length}</p>
                    <p><strong>محاولات تسجيل الدخول الفاشلة:</strong> ${logs.filter(l => l.type === 'failed_login').length}</p>
                </div>

                ${logs.map(log => `
                    <div class="activity-item ${log.isSuccess === false ? 'failed' : 'success'} ${(log.riskScore || 0) >= 70 ? 'high-risk' : ''}">
                        <div class="activity-header">
                            <span class="activity-title">${log.title}</span>
                            <span class="activity-meta">${new Date(log.timestamp).toLocaleString('ar-EG')}</span>
                        </div>
                        <p><strong>المستخدم:</strong> ${log.user.name} (${log.user.role})</p>
                        ${log.details ? `<p><strong>التفاصيل:</strong> ${log.details}</p>` : ''}
                        ${log.failureReason ? `<p style="color: #dc2626;"><strong>سبب الفشل:</strong> ${log.failureReason}</p>` : ''}
                        ${log.attemptedUsername ? `<p style="color: #dc2626;"><strong>اسم المستخدم المحاول:</strong> ${log.attemptedUsername}</p>` : ''}
                        <div class="location-info">
                            ${log.ip ? `<span><strong>IP:</strong> ${log.ip}</span>` : ''}
                            ${log.locationName ? ` | <span><strong>الموقع:</strong> ${log.locationName}</span>` : ''}
                            ${log.lat && log.lng ? ` | <span><strong>الإحداثيات:</strong> ${log.lat.toFixed(4)}, ${log.lng.toFixed(4)}</span>` : ''}
                        </div>
                        <div class="device-info">
                            <span><strong>الجهاز:</strong> ${log.device}</span>
                            ${log.browser ? ` | <span><strong>المتصفح:</strong> ${log.browser} ${log.browserVersion || ''}</span>` : ''}
                            ${log.os ? ` | <span><strong>نظام التشغيل:</strong> ${log.os}</span>` : ''}
                            ${log.riskScore ? ` | <span class="risk-badge ${log.riskScore >= 70 ? 'risk-high' : log.riskScore >= 40 ? 'risk-medium' : 'risk-low'}">مخاطر: ${log.riskScore}/100</span>` : ''}
                        </div>
                    </div>
                `).join('')}

                <div class="footer">
                    <p>تم إنشاء هذا التقرير بواسطة نظام EP Group</p>
                    <p>© ${new Date().getFullYear()} EP Group. جميع الحقوق محفوظة.</p>
                </div>
            </body>
            </html>
        `;
    };
    
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Shield className="text-primary h-8 w-8"/>
                        <span>سجل الأنشطة والأمان</span>
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        مراقبة شاملة لجميع الأنشطة والعمليات في النظام مع إدارة الأمان السيبراني
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handlePrint} variant="outline" className="flex items-center gap-2">
                        <Printer className="h-4 w-4" />
                        طباعة
                    </Button>
                    <Button onClick={handleSavePDF} className="flex items-center gap-2">
                        <Download className="h-4 w-4" />
                        حفظ PDF
                    </Button>
                </div>
            </div>

            {/* التبويبات الرئيسية */}
            <Tabs value={activeTab} onValueChange={setActiveTab as any} className="space-y-4">
                <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 rounded-xl">
                    <TabsTrigger value="activity" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
                        <FileText className="h-4 w-4" />
                        سجل الأنشطة
                    </TabsTrigger>
                    <TabsTrigger value="security" className="flex items-center gap-2 data-[state=active]:bg-red-600 data-[state=active]:text-white">
                        <Shield className="h-4 w-4" />
                        الأمان السيبراني
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="activity" className="space-y-6">

            {/* Test Panel and Diagnostics - Only show if no activities exist */}
            {filteredLogs.length === 0 && (
                <div className="space-y-6">
                    <Card className="bg-blue-50 border-blue-200">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-blue-700">
                                <Target className="h-5 w-5" />
                                لوحة الاختبار - نظام تتبع المواقع
                            </CardTitle>
                            <CardDescription>
                                لا يوجد أنشطة في السجل. استخدم الأزرار أدناه لاختبار النظام
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col md:flex-row gap-3">
                                <Button 
                                    onClick={testLocationPermission}
                                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                                >
                                    <MapPin className="h-4 w-4" />
                                    اختبر إذن الموقع
                                </Button>
                                <Button 
                                    onClick={createSampleActivities}
                                    variant="outline"
                                    className="flex items-center gap-2 border-blue-300 text-blue-700 hover:bg-blue-100"
                                >
                                    <FileText className="h-4 w-4" />
                                    أضف بيانات تجريبية
                                </Button>
                                <Button 
                                    onClick={() => window.location.reload()}
                                    variant="outline"
                                    className="flex items-center gap-2 border-green-300 text-green-700 hover:bg-green-100"
                                >
                                    <Navigation className="h-4 w-4" />
                                    إعادة تحميل
                                </Button>
                            </div>
                            <div className="mt-4 p-3 bg-blue-100 rounded-lg text-sm text-blue-800">
                                <p><strong>ملاحظة:</strong> عند اختبار إذن الموقع، سيظهر لك طلب من المتصفح للسماح بالوصول للموقع. انقر على "السماح" لاختبار النظام.</p>
                            </div>
                        </CardContent>
                    </Card>
                    
                    {/* System Diagnostics */}
                    <LocationSystemDiagnostics />
                </div>
            )}

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-full">
                                <FileText className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">إجمالي الأنشطة</p>
                                <p className="text-2xl font-bold">{filteredLogs.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-full">
                                <CheckCircle className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">ناجحة</p>
                                <p className="text-2xl font-bold text-green-600">{filteredLogs.filter(l => l.isSuccess !== false).length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 rounded-full">
                                <XCircle className="h-6 w-6 text-red-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">فاشلة</p>
                                <p className="text-2xl font-bold text-red-600">{filteredLogs.filter(l => l.isSuccess === false).length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-yellow-100 rounded-full">
                                <AlertTriangle className="h-6 w-6 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">مخاطر عالية</p>
                                <p className="text-2xl font-bold text-yellow-600">{filteredLogs.filter(l => (l.riskScore || 0) >= 70).length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-full">
                                <MapPin className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">مع مواقع GPS</p>
                                <p className="text-2xl font-bold text-blue-600">{filteredLogs.filter(l => l.lat && l.lng).length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        فلاتر وبحث
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                        <div className="relative">
                            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                            <Input
                                placeholder="بحث..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pr-10"
                            />
                        </div>
                        
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="نوع النشاط" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">جميع الأنواع</SelectItem>
                                <SelectItem value="login">تسجيل دخول</SelectItem>
                                <SelectItem value="logout">تسجيل خروج</SelectItem>
                                <SelectItem value="failed_login">فشل تسجيل دخول</SelectItem>
                                <SelectItem value="visit">زيارة</SelectItem>
                                <SelectItem value="order">طلب</SelectItem>
                                <SelectItem value="collection">تحصيل</SelectItem>
                                <SelectItem value="register_clinic">تسجيل عيادة</SelectItem>
                                <SelectItem value="invoice_created">إنشاء فاتورة</SelectItem>
                                <SelectItem value="debt_created">إنشاء دين</SelectItem>
                                <SelectItem value="expense_created">إنشاء نفقة</SelectItem>
                                <SelectItem value="payment_created">إنشاء دفعة</SelectItem>
                                <SelectItem value="payment_confirmed">تأكيد دفعة</SelectItem>
                                <SelectItem value="payment_cancelled">إلغاء دفعة</SelectItem>
                                <SelectItem value="clinic_created">إنشاء عيادة</SelectItem>
                                <SelectItem value="clinic_updated">تحديث عيادة</SelectItem>
                                <SelectItem value="clinic_deleted">حذف عيادة</SelectItem>
                                <SelectItem value="user_create">إنشاء مستخدم</SelectItem>
                                <SelectItem value="user_update">تحديث مستخدم</SelectItem>
                                <SelectItem value="page_access">دخول صفحة</SelectItem>
                                <SelectItem value="data_export">تصدير بيانات</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={successFilter} onValueChange={setSuccessFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="حالة النشاط" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">جميع الحالات</SelectItem>
                                <SelectItem value="success">ناجحة</SelectItem>
                                <SelectItem value="failed">فاشلة</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={riskFilter} onValueChange={setRiskFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="مستوى المخاطر" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">جميع المستويات</SelectItem>
                                <SelectItem value="high">عالي (70+)</SelectItem>
                                <SelectItem value="medium">متوسط (40-69)</SelectItem>
                                <SelectItem value="low">منخفض (0-39)</SelectItem>
                            </SelectContent>
                        </Select>

                        <Input
                            type="date"
                            placeholder="من تاريخ"
                            value={dateRange.from}
                            onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                        />

                        <Input
                            type="date"
                            placeholder="إلى تاريخ"
                            value={dateRange.to}
                            onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                        />
                        
                        <Select value={locationFilter} onValueChange={setLocationFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="فلتر المواقع" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">جميع الأنشطة</SelectItem>
                                <SelectItem value="with_location">مع مواقع GPS</SelectItem>
                                <SelectItem value="without_location">بدون مواقع GPS</SelectItem>
                                <SelectItem value="with_address">مع عناوين</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    
                    {/* View Toggle and Reset Filters */}
                    <div className="mt-4 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <Button 
                                variant={showMapView ? "outline" : "default"}
                                size="sm"
                                onClick={() => setShowMapView(false)}
                                className="flex items-center gap-2"
                            >
                                <FileText className="h-4 w-4" />
                                عرض القائمة
                            </Button>
                            <Button 
                                variant={showMapView ? "default" : "outline"}
                                size="sm"
                                onClick={() => setShowMapView(true)}
                                className="flex items-center gap-2"
                            >
                                <Map className="h-4 w-4" />
                                عرض الخريطة
                            </Button>
                        </div>
                        
                    {(searchTerm || typeFilter !== 'all' || successFilter !== 'all' || riskFilter !== 'all' || locationFilter !== 'all' || dateRange.from || dateRange.to) && (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                                setSearchTerm('');
                                setTypeFilter('all');
                                setSuccessFilter('all');
                                setRiskFilter('all');
                                setLocationFilter('all');
                                setDateRange({ from: '', to: '' });
                            }}
                        >
                            <X className="h-4 w-4 mr-1" />
                            مسح الفلاتر
                        </Button>                    )}
                    </div>
                </CardContent>
            </Card>

            {/* Activities List */}
            <div className="space-y-4">
                {/* Empty state */}
                {filteredLogs.length === 0 && (
                    <Card>
                        <CardContent className="p-12 text-center">
                            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">لا توجد أنشطة مطابقة</h3>
                            <p className="text-muted-foreground">لم يتم العثور على أنشطة تطابق معايير البحث المحددة</p>
                        </CardContent>
                    </Card>
                )}

                {/* Activities */}
                {filteredLogs.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((activity) => {
                    const Icon = typeToIcon[activity.type] || FileText;
                    const DeviceIcon = deviceToIcon[activity.device] || Monitor;
                    const colorClass = typeToColor[activity.type] || 'bg-gray-500';
                    const riskColor = getRiskBadgeColor(activity.riskScore);
                    
                    return (
                    <Card key={activity.id} className={`overflow-hidden transition-all hover:shadow-md ${
                        activity.isSuccess === false ? 'border-red-200 bg-red-50/30' : 
                        (activity.riskScore || 0) >= 70 ? 'border-yellow-200 bg-yellow-50/30' : ''
                    }`}>
                       <div className="p-5 flex flex-col md:flex-row gap-4">
                           <div className={`flex-shrink-0 flex items-center justify-center ${colorClass} text-white rounded-full h-12 w-12 shadow-sm`}>
                               <Icon className="h-6 w-6"/>
                           </div>
                           <div className="flex-grow">
                               <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                                   <div>
                                       <h3 className="font-semibold text-lg flex items-center gap-2">
                                           {activity.title}
                                           {activity.isSuccess === false && (
                                               <Badge variant="destructive" className="text-xs">
                                                   <XCircle className="h-3 w-3 mr-1" />
                                                   فاشل
                                               </Badge>
                                           )}
                                           {(activity.riskScore || 0) >= 70 && (
                                               <Badge variant="outline" className={`text-xs text-white ${riskColor}`}>
                                                   <AlertTriangle className="h-3 w-3 mr-1" />
                                                   مخاطر عالية
                                               </Badge>
                                           )}
                                       </h3>
                                       {activity.failureReason && (
                                           <p className="text-sm text-red-600 mt-1 font-medium">
                                               سبب الفشل: {activity.failureReason}
                                           </p>
                                       )}
                                   </div>
                                   <div className="text-xs text-muted-foreground">
                                       {new Date(activity.timestamp).toLocaleString('ar-EG')}
                                   </div>
                               </div>
                               
                               <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                                   {/* User Info */}
                                   <div className="flex items-center gap-2">
                                        <img src={`https://i.pravatar.cc/150?u=${activity.user.id}`} className="h-6 w-6 rounded-full" alt={activity.user.name} />
                                        <div>
                                            <p className="font-medium">{activity.user.name}</p>
                                            <Badge variant="outline" className="text-xs">{activity.user.role}</Badge>
                                        </div>
                                   </div>
                                   
                                   {/* Device Info */}
                                   <div className="flex items-center gap-2 text-muted-foreground">
                                       <DeviceIcon className="h-4 w-4" />
                                       <div>
                                           <p>{activity.device}</p>
                                           <p className="text-xs">{activity.browser} {activity.browserVersion}</p>
                                       </div>
                                   </div>
                                   
                                   {/* Location/IP Info */}
                                   <div className="flex items-center gap-2 text-muted-foreground">
                                       {activity.lat && activity.lng ? (
                                           <MapPin className="h-4 w-4 text-blue-600" />
                                       ) : (
                                           <Globe className="h-4 w-4" />
                                       )}
                                       <div>
                                           <p>{activity.ip || 'غير معروف'}</p>
                                           {activity.locationName ? (
                                               <p className="text-xs text-blue-600 font-medium">{activity.locationName}</p>
                                           ) : activity.city ? (
                                               <p className="text-xs">{activity.city}, {activity.country}</p>
                                           ) : activity.lat && activity.lng ? (
                                               <p className="text-xs text-blue-600 font-medium">موقع GPS محدد</p>
                                           ) : (
                                               <p className="text-xs text-muted-foreground">لا يوجد موقع</p>
                                           )}
                                       </div>
                                   </div>
                               </div>
                               
                               {/* Additional Info for Failed Logins */}
                               {activity.type === 'failed_login' && activity.attemptedUsername && (
                                   <Alert className="mt-3 border-red-200 bg-red-50">
                                       <AlertTriangle className="h-4 w-4" />
                                       <AlertDescription>
                                           <strong>محاولة تسجيل دخول فاشلة:</strong><br/>
                                           اسم المستخدم: <code className="bg-gray-100 px-1 rounded">{activity.attemptedUsername}</code><br/>
                                           {activity.riskScore && (
                                               <>درجة المخاطر: <span className={`font-bold ${
                                                   activity.riskScore >= 70 ? 'text-red-600' : 
                                                   activity.riskScore >= 40 ? 'text-yellow-600' : 'text-green-600'
                                               }`}>{activity.riskScore}/100</span></>
                                           )}
                                       </AlertDescription>
                                   </Alert>
                               )}
                           </div>
                       </div>
                       
                       <div className="bg-muted/30 px-5 py-3 border-t flex items-center justify-between">
                           <div className="flex items-center gap-4 text-xs text-muted-foreground">
                               <p className="flex-1">{activity.details}</p>
                               {activity.lat && activity.lng && (
                                   <div className="flex items-center gap-2">
                                       <a 
                                           href={`https://www.google.com/maps?q=${activity.lat},${activity.lng}`} 
                                           target="_blank" 
                                           rel="noopener noreferrer"
                                           className="flex items-center gap-1 text-primary hover:underline"
                                       >
                                           <MapPin className="h-3 w-3"/>
                                           <span>Google Maps</span>
                                           <ExternalLink className="h-3 w-3"/>
                                       </a>
                                       <Button 
                                           variant="ghost" 
                                           size="sm"
                                           onClick={() => setSelectedLocationActivity(activity)}
                                           className="flex items-center gap-1 text-xs px-2 py-1 h-auto"
                                       >
                                           <Navigation className="h-3 w-3" />
                                           عرض محلي
                                       </Button>
                                   </div>
                               )}
                           </div>
                           <Button variant="ghost" size="sm" onClick={() => setSelectedActivity(activity)} className="flex items-center gap-2">
                                <Eye className="h-4 w-4" />
                                عرض التفاصيل
                            </Button>
                       </div>
                    </Card>
                    );
                })}

            </div>
            
            {/* Map View */}
            {showMapView && (
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Map className="h-5 w-5" />
                            خريطة أنشطة النظام
                        </CardTitle>
                        <CardDescription>
                            عرض جميع الأنشطة التي تحتوي على مواقع GPS على خريطة تفاعلية
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-96 md:h-[600px] rounded-lg overflow-hidden border">
                            <EnhancedGoogleMaps
                                markers={filteredLogs
                                    .filter(log => log.lat && log.lng)
                                    .map(log => ({
                                        id: log.id,
                                        position: { lat: log.lat!, lng: log.lng! },
                                        title: log.title,
                                        type: log.type === 'failed_login' ? 'failed_activity' :
                                              log.type === 'login' ? 'user' : 
                                              log.type === 'register_clinic' ? 'clinic' :
                                              log.type.includes('payment') ? 'payment' :
                                              log.type === 'visit' ? 'visit' :
                                              log.type === 'order' ? 'order' : 'activity',
                                        data: {
                                            title: log.title,
                                            subtitle: `${log.user.name} - ${new Date(log.timestamp).toLocaleString('ar-EG')}`,
                                            details: [
                                                log.details || '',
                                                log.locationName || '',
                                                `IP: ${log.ip || 'غير معروف'}`,
                                                `الجهاز: ${log.device || 'غير معروف'}`
                                            ].filter(Boolean),
                                            icon: log.isSuccess === false ? '❌' : '✅'
                                        }
                                    }))}
                                clustered={true}
                                showCurrentLocation={true}
                                className="w-full h-full"
                            />
                        </div>
                        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                            <p>يتم عرض {filteredLogs.filter(log => log.lat && log.lng).length} نشاط مع مواقع GPS من أصل {filteredLogs.length} نشاط</p>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                    <span>ناجحة</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                    <span>فاشلة</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                    <span>عيادات</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                                    <span>زيارات</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
                </TabsContent>

                <TabsContent value="security" className="space-y-6">
                    <CyberSecurityCenter />
                </TabsContent>
            </Tabs>

            <Dialog open={!!selectedActivity} onOpenChange={(isOpen) => !isOpen && setSelectedActivity(null)}>
                <DialogContent className="max-w-2xl">
                     {selectedActivity && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="text-2xl">{selectedActivity.title}</DialogTitle>
                                <DialogDescription>
                                    {t('activity_log.dialog.description')}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid md:grid-cols-2 gap-6 py-4">
                                <Card>
                                    <CardHeader><CardTitle className="text-base">{t('activity_log.dialog.event_info')}</CardTitle></CardHeader>
                                    <CardContent className="space-y-4">
                                        <DetailRow icon={Clock} label={t('activity_log.dialog.timestamp')} value={new Date(selectedActivity.timestamp).toLocaleString('ar-EG')} />
                                        <DetailRow icon={Building} label={t('common.clinic')} value={selectedActivity.clinic?.name || 'N/A'} />
                                        {selectedActivity.lat && selectedActivity.lng && (
                                            <DetailRow icon={Map} label={t('activity_log.dialog.location')} value={
                                                 <a href={`https://www.google.com/maps?q=${selectedActivity.lat},${selectedActivity.lng}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                                    {selectedActivity.lat.toFixed(4)}, {selectedActivity.lng.toFixed(4)}
                                                 </a>
                                            } />
                                        )}
                                    </CardContent>
                                </Card>
                                <div className="space-y-6">
                                    <Card>
                                        <CardHeader><CardTitle className="text-base">{t('common.user')}</CardTitle></CardHeader>
                                        <CardContent className="space-y-4">
                                            <DetailRow icon={User} label={t('common.name')} value={selectedActivity.user.name} />
                                            <DetailRow icon={Briefcase} label={t('common.role')} value={t(`roles.${selectedActivity.user.role}`)} />
                                        </CardContent>
                                    </Card>
                                     <Card>
                                        <CardHeader><CardTitle className="text-base">{t('activity_log.dialog.technical_info')}</CardTitle></CardHeader>
                                        <CardContent className="space-y-4">
                                            <DetailRow icon={MousePointer} label="IP Address" value={selectedActivity.ip || 'N/A'} />
                                            <DetailRow icon={deviceToIcon[selectedActivity.device] || Monitor} label={t('activity_log.dialog.device')} value={selectedActivity.device || 'N/A'} />
                                            <DetailRow icon={Globe} label={t('activity_log.dialog.browser')} value={selectedActivity.browser || 'N/A'} />
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
            
            {/* Location Detail Dialog */}
            <Dialog open={!!selectedLocationActivity} onOpenChange={(isOpen) => !isOpen && setSelectedLocationActivity(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                    {selectedLocationActivity && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="text-xl flex items-center gap-2">
                                    <MapPin className="h-6 w-6 text-blue-600" />
                                    موقع النشاط: {selectedLocationActivity.title}
                                </DialogTitle>
                                <DialogDescription>
                                    تفاصيل وموقع النشاط على الخريطة
                                </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-6">
                                {/* Activity Summary */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4" />
                                        <span className="font-medium">{selectedLocationActivity.user.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4" />
                                        <span>{new Date(selectedLocationActivity.timestamp).toLocaleString('ar-EG')}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Globe className="h-4 w-4" />
                                        <span>{selectedLocationActivity.ip || 'غير معروف'}</span>
                                    </div>
                                </div>
                                
                                {/* Location Details */}
                                {(selectedLocationActivity.lat && selectedLocationActivity.lng) && (
                                    <div className="bg-blue-50 p-4 rounded-lg">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <p className="font-medium text-blue-900 mb-2">تفاصيل الموقع:</p>
                                                <div className="space-y-1">
                                                    <p><strong>خط العرض:</strong> {selectedLocationActivity.lat.toFixed(6)}</p>
                                                    <p><strong>خط الطول:</strong> {selectedLocationActivity.lng.toFixed(6)}</p>
                                                    {selectedLocationActivity.locationName && (
                                                        <p><strong>العنوان:</strong> {selectedLocationActivity.locationName}</p>
                                                    )}
                                                    {selectedLocationActivity.city && (
                                                        <p><strong>المدينة:</strong> {selectedLocationActivity.city}, {selectedLocationActivity.country}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <a 
                                                    href={`https://www.google.com/maps?q=${selectedLocationActivity.lat},${selectedLocationActivity.lng}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 bg-white px-3 py-2 rounded border hover:bg-gray-50 transition-colors"
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                    فتح في Google Maps
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                {/* Map */}
                                {(selectedLocationActivity.lat && selectedLocationActivity.lng) && (
                                    <div className="h-96 rounded-lg overflow-hidden border">
                                        <EnhancedGoogleMaps
                                            markers={[{
                                                id: selectedLocationActivity.id,
                                                position: { 
                                                    lat: selectedLocationActivity.lat,
                                                    lng: selectedLocationActivity.lng
                                                },
                                                title: selectedLocationActivity.title,
                                                type: selectedLocationActivity.type === 'failed_login' ? 'failed_activity' :
                                                      selectedLocationActivity.type === 'login' ? 'user' : 
                                                      selectedLocationActivity.type === 'register_clinic' ? 'clinic' :
                                                      selectedLocationActivity.type.includes('payment') ? 'payment' :
                                                      selectedLocationActivity.type === 'visit' ? 'visit' :
                                                      selectedLocationActivity.type === 'order' ? 'order' : 'activity',
                                                data: {
                                                    title: selectedLocationActivity.title,
                                                    subtitle: `${selectedLocationActivity.user.name} - ${new Date(selectedLocationActivity.timestamp).toLocaleString('ar-EG')}`,
                                                    details: [
                                                        selectedLocationActivity.details || '',
                                                        selectedLocationActivity.locationName || '',
                                                        `IP: ${selectedLocationActivity.ip || 'غير معروف'}`,
                                                        `الجهاز: ${selectedLocationActivity.device || 'غير معروف'}`
                                                    ].filter(Boolean),
                                                    icon: selectedLocationActivity.isSuccess === false ? '❌' : '✅'
                                                }
                                            }]}
                                            center={{
                                                lat: selectedLocationActivity.lat,
                                                lng: selectedLocationActivity.lng
                                            }}
                                            zoom={15}
                                            clustered={false}
                                            showCurrentLocation={true}
                                            className="w-full h-full"
                                        />
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
