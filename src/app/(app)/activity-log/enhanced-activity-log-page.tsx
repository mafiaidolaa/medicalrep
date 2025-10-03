"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Briefcase, 
  Building, 
  FileText, 
  Key, 
  Monitor, 
  MousePointer, 
  Smartphone, 
  Tablet, 
  User, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Globe, 
  Filter, 
  Search, 
  Shield, 
  AlertTriangle, 
  Eye, 
  ExternalLink, 
  MapPin,
  Calendar,
  TrendingUp,
  TrendingDown,
  Activity
} from "lucide-react";

import type { ActivityLog } from '@/lib/types';
import { useAdvancedPrint, PrintableData } from '@/hooks/use-advanced-print';
import { PrintToolbar } from '@/components/advanced-print/print-toolbar';
import { PrintSettingsDialog } from '@/components/advanced-print/print-settings-dialog';
import { DEFAULT_PRINT_SETTINGS } from '@/lib/print-templates/print-templates';
import { toast } from "@/components/ui/use-toast";
import { LocationDisplay } from '@/components/activity-log/location-display';

interface EnhancedActivityLogPageProps {
  initialActivityLog: ActivityLog[];
}

export function EnhancedActivityLogPage({ initialActivityLog }: EnhancedActivityLogPageProps) {
  const [activityLog] = useState<ActivityLog[]>(initialActivityLog);
  const [selectedActivity, setSelectedActivity] = useState<ActivityLog | null>(null);
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>(initialActivityLog);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [successFilter, setSuccessFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [riskFilter, setRiskFilter] = useState<string>('all');

  // استخدام هوك الطباعة المتقدمة
  const {
    settings,
    isLoading: isPrintLoading,
    lastPrintedData,
    print,
    preview,
    exportToPDF,
    saveSettings,
    reprintLast,
    clearLastPrinted
  } = useAdvancedPrint({
    defaultSettings: {
      ...DEFAULT_PRINT_SETTINGS,
      template: 'analytical-report',
      companyInfo: {
        name: 'EP Group System',
        address: '',
        phone: '',
        email: '',
        website: 'www.epgroup.com'
      }
    },
    onPrintStart: () => toast({ title: "جارِ التحضير للطباعة...", description: "يتم إعداد المطبوعة" }),
    onPrintSuccess: () => toast({ title: "تمت الطباعة بنجاح", description: "تم إرسال المطبوعة للطابعة" }),
    onPrintError: (error) => toast({ 
      title: "خطأ في الطباعة", 
      description: error.message, 
      variant: "destructive" 
    })
  });

  // تطبيق الفلاتر
  useEffect(() => {
    let filtered = activityLog;

    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.ip?.includes(searchTerm) ||
        log.attemptedUsername?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(log => log.type === typeFilter);
    }

    if (successFilter !== 'all') {
      if (successFilter === 'success') {
        filtered = filtered.filter(log => log.isSuccess !== false);
      } else if (successFilter === 'failed') {
        filtered = filtered.filter(log => log.isSuccess === false);
      }
    }

    if (dateRange.from || dateRange.to) {
      filtered = filtered.filter(log => {
        const logDate = new Date(log.timestamp);
        const fromDate = dateRange.from ? new Date(dateRange.from) : new Date('1970-01-01');
        const toDate = dateRange.to ? new Date(dateRange.to + 'T23:59:59') : new Date();
        return logDate >= fromDate && logDate <= toDate;
      });
    }

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

    setFilteredLogs(filtered);
  }, [activityLog, searchTerm, typeFilter, successFilter, dateRange, riskFilter]);

  // إعداد بيانات الطباعة
  const printableData: PrintableData = useMemo(() => {
    const successfulActivities = filteredLogs.filter(l => l.isSuccess !== false).length;
    const failedActivities = filteredLogs.filter(l => l.isSuccess === false).length;
    const highRiskActivities = filteredLogs.filter(l => (l.riskScore || 0) >= 70).length;
    const failedLoginAttempts = filteredLogs.filter(l => l.type === 'failed_login').length;
    
    const deviceStats = filteredLogs.reduce((acc, log) => {
      acc[log.device] = (acc[log.device] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const typeStats = filteredLogs.reduce((acc, log) => {
      acc[log.type] = (acc[log.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      title: 'تقرير سجل الأنشطة المهمة مع تتبع المواقع',
      subtitle: `تقرير شامل عن ${filteredLogs.length} نشاط مهم في النظام`,
      content: [
            {
              type: 'section',
              title: 'الملخص التنفيذي - الأنشطة المهمة',
              content: [
                {
                  type: 'info-grid',
                  items: [
                    {
                      icon: '📊',
                      label: 'إجمالي الأنشطة المهمة',
                      value: filteredLogs.length.toLocaleString('ar-EG')
                    },
                    {
                      icon: '✅',
                      label: 'الأنشطة الناجحة',
                      value: successfulActivities.toLocaleString('ar-EG')
                    },
                    {
                      icon: '🔑',
                      label: 'تسجيل الدخول والخروج',
                      value: filteredLogs.filter(l => l.type === 'login' || l.type === 'logout').length.toLocaleString('ar-EG')
                    },
                    {
                      icon: '🏥',
                      label: 'الزيارات والعيادات',
                      value: filteredLogs.filter(l => l.type === 'visit' || l.type === 'register_clinic').length.toLocaleString('ar-EG')
                    },
                    {
                      icon: '📋',
                      label: 'الطلبيات والمصاريف',
                      value: filteredLogs.filter(l => l.type === 'order' || l.type === 'expense_created').length.toLocaleString('ar-EG')
                    },
                    {
                      icon: '📋',
                      label: 'الخطط والمدفوعات',
                      value: filteredLogs.filter(l => l.type === 'payment_created' || l.type === 'payment_confirmed').length.toLocaleString('ar-EG')
                    }
                  ]
                },
                {
                  type: 'card',
                  title: 'الأنشطة بمعلومات موقع',
                  content: `تم تسجيل ${filteredLogs.filter(l => l.lat && l.lng).length} نشاط بمعلومات موقع جغرافي من أصل ${filteredLogs.length} نشاط`
                }
              ]
            },
        
        {
          type: 'section',
          title: 'إحصائيات الأجهزة',
          content: [
            {
              type: 'table',
              title: 'توزيع الأنشطة حسب نوع الجهاز',
              headers: ['نوع الجهاز', 'عدد الأنشطة', 'النسبة المئوية'],
              rows: Object.entries(deviceStats)
                .sort(([,a], [,b]) => b - a)
                .map(([device, count]) => [
                  device,
                  count.toLocaleString('ar-EG'),
                  `${((count / filteredLogs.length) * 100).toFixed(1)}%`
                ])
            }
          ]
        },

        {
          type: 'section',
          title: 'إحصائيات أنواع الأنشطة',
          content: [
            {
              type: 'table',
              title: 'توزيع الأنشطة حسب النوع',
              headers: ['نوع النشاط', 'العدد', 'النسبة', 'الحالة'],
              rows: Object.entries(typeStats)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 15) // أهم 15 نوع
                .map(([type, count]) => {
                  const typeActivities = filteredLogs.filter(l => l.type === type);
                  const successRate = (typeActivities.filter(l => l.isSuccess !== false).length / count) * 100;
                  const status = successRate >= 90 ? 'ممتاز' : successRate >= 70 ? 'جيد' : 'يحتاج تحسين';
                  
                  return [
                    getTypeDisplayName(type),
                    count.toLocaleString('ar-EG'),
                    `${((count / filteredLogs.length) * 100).toFixed(1)}%`,
                    status
                  ];
                })
            }
          ]
        },

        {
          type: 'section',
          title: 'تحليل المخاطر الأمنية',
          content: [
            {
              type: 'card',
              title: 'تقييم المخاطر العام',
              badge: highRiskActivities > 10 ? 'تحذير' : highRiskActivities > 0 ? 'متابعة' : 'آمن',
              content: `
                تم تحديد ${highRiskActivities} نشاط عالي المخاطر من أصل ${filteredLogs.length} نشاط.
                ${highRiskActivities > 10 ? 
                  'يُنصح بمراجعة الأنشطة عالية المخاطر واتخاذ الإجراءات الأمنية المناسبة.' : 
                  highRiskActivities > 0 ? 
                  'مستوى المخاطر ضمن المعدل الطبيعي مع ضرورة المتابعة.' :
                  'لا توجد مخاطر أمنية عالية في الفترة المحددة.'}
              `
            }
          ]
        },

        {
          type: 'section',
          title: 'الأنشطة الحديثة',
          content: [
            {
              type: 'table',
              title: 'آخر 20 نشاط في النظام',
              headers: ['التاريخ والوقت', 'النشاط', 'المستخدم', 'الجهاز', 'الحالة', 'المخاطر'],
              rows: filteredLogs
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 20)
                .map(log => [
                  new Date(log.timestamp).toLocaleString('ar-EG'),
                  log.title,
                  log.user.name,
                  log.device,
                  log.isSuccess === false ? 'فاشل' : 'ناجح',
                  log.riskScore ? `${log.riskScore}/100` : '-'
                ])
            }
          ]
        }
      ],
      metadata: {
        createdBy: 'نظام EP Group',
        createdAt: new Date(),
        department: 'الأمن والمراقبة',
        category: 'تقرير أمني',
        tags: ['سجل الأنشطة', 'الأمان', 'المراقبة', 'التقارير']
      }
    };
  }, [filteredLogs]);

  // دالة للحصول على اسم النوع باللغة العربية (للأنشطة المرغوبة فقط)
  function getTypeDisplayName(type: string): string {
    const typeNames: Record<string, string> = {
      login: 'تسجيل دخول',
      logout: 'تسجيل خروج',
      visit: 'عمل زيارة',
      clinic_register: 'إضافة عيادة',
      order: 'عمل طلبية',
      debt_payment: 'دفع دين على عيادة',
      expense_request: 'طلب مصاريف',
      plan: 'عمل خطة'
    };
    return typeNames[type] || type;
  }

  // معالجات الأحداث
  const handlePrint = () => {
    print(printableData);
  };

  const handlePreview = () => {
    preview(printableData);
  };

  const handleExportPDF = () => {
    exportToPDF(printableData);
  };

  const handleSettingsChange = (newSettings: any) => {
    saveSettings(newSettings);
    toast({ 
      title: "تم حفظ الإعدادات", 
      description: "تم تطبيق إعدادات الطباعة الجديدة" 
    });
  };

  // خريطة الأيقونات للأنشطة المرغوبة
  const typeToIcon: { [key: string]: React.ElementType } = {
    login: Key,
    logout: Key,
    visit: Briefcase,
    clinic_register: Building,
    order: FileText,
    debt_payment: CheckCircle,
    expense_request: FileText,
    plan: TrendingUp
  };

  const deviceToIcon: { [key: string]: React.ElementType } = {
    Desktop: Monitor,
    Mobile: Smartphone,
    Tablet: Tablet
  };

  const typeToColor: { [key: string]: string } = {
    login: 'bg-gradient-to-r from-green-500 to-emerald-600',
    logout: 'bg-gradient-to-r from-blue-500 to-blue-600',
    visit: 'bg-gradient-to-r from-purple-500 to-violet-600',
    clinic_register: 'bg-gradient-to-r from-cyan-500 to-blue-600',
    order: 'bg-gradient-to-r from-orange-500 to-amber-600',
    debt_payment: 'bg-gradient-to-r from-green-600 to-teal-600',
    expense_request: 'bg-gradient-to-r from-amber-500 to-yellow-600',
    plan: 'bg-gradient-to-r from-indigo-500 to-purple-600'
  };

  const getRiskBadgeColor = (riskScore?: number) => {
    if (!riskScore) return 'bg-gray-500';
    if (riskScore >= 70) return 'bg-red-500';
    if (riskScore >= 40) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-6">
      {/* Header with Print Toolbar */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Activity className="text-primary h-8 w-8"/>
              <span>سجل الأنشطة المهمة</span>
              <MapPin className="text-secondary h-6 w-6"/>
            </h1>
            <p className="text-muted-foreground mt-2">
              متابعة دقيقة للأنشطة المهمة مع تتبع الموقع الجغرافي ونظام طباعة متقدم
            </p>
          </div>
          <div className="flex gap-2">
            <PrintSettingsDialog
              onApplySettings={handleSettingsChange}
              onPreview={handlePreview}
              onDownloadPDF={handleExportPDF}
              currentSettings={settings}
            />
          </div>
        </div>

        {/* شريط الطباعة المتقدم */}
        <PrintToolbar
          data={printableData}
          settings={settings}
          isLoading={isPrintLoading}
          onPrint={handlePrint}
          onPreview={handlePreview}
          onExportPDF={handleExportPDF}
          onSettingsChange={handleSettingsChange}
          onReprintLast={reprintLast}
          canReprintLast={!!lastPrintedData}
          variant="extended"
          className="mb-6"
        />
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الأنشطة</p>
                <p className="text-2xl font-bold">{filteredLogs.length}</p>
                <div className="flex items-center gap-1 mt-1">
                  {filteredLogs.length > activityLog.length * 0.8 ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span className="text-xs text-muted-foreground">
                    من أصل {activityLog.length}
                  </span>
                </div>
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
                <p className="text-2xl font-bold text-green-600">
                  {filteredLogs.filter(l => l.isSuccess !== false).length}
                </p>
                <p className="text-xs text-muted-foreground">
                  {((filteredLogs.filter(l => l.isSuccess !== false).length / filteredLogs.length) * 100).toFixed(1)}% من المجموع
                </p>
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
                <p className="text-2xl font-bold text-red-600">
                  {filteredLogs.filter(l => l.isSuccess === false).length}
                </p>
                <p className="text-xs text-muted-foreground">
                  {((filteredLogs.filter(l => l.isSuccess === false).length / filteredLogs.length) * 100).toFixed(1)}% من المجموع
                </p>
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
                <p className="text-2xl font-bold text-yellow-600">
                  {filteredLogs.filter(l => (l.riskScore || 0) >= 70).length}
                </p>
                <p className="text-xs text-muted-foreground">
                  تتطلب مراجعة فورية
                </p>
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
                <SelectItem value="visit">عمل زيارة</SelectItem>
                <SelectItem value="clinic_register">إضافة عيادة</SelectItem>
                <SelectItem value="order">عمل طلبية</SelectItem>
                <SelectItem value="debt_payment">دفع دين</SelectItem>
                <SelectItem value="expense_request">طلب مصاريف</SelectItem>
                <SelectItem value="plan">عمل خطة</SelectItem>
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
          </div>
          
          {/* Reset Filters */}
          {(searchTerm || typeFilter !== 'all' || successFilter !== 'all' || riskFilter !== 'all' || dateRange.from || dateRange.to) && (
            <div className="mt-4 flex justify-end">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setSearchTerm('');
                  setTypeFilter('all');
                  setSuccessFilter('all');
                  setRiskFilter('all');
                  setDateRange({ from: '', to: '' });
                }}
              >
                مسح الفلاتر
              </Button>
            </div>
          )}
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
                         
                         {/* Location Info with Enhanced Display */}
                         <div className="flex items-center gap-2 text-muted-foreground">
                             <LocationDisplay 
                               latitude={activity.lat}
                               longitude={activity.lng}
                               locationName={activity.locationName}
                               city={activity.city}
                               country={activity.country}
                               variant="inline"
                               showAccuracy={false}
                               className="flex-1"
                             />
                         </div>
                         
                         {/* IP Info */}
                         {activity.ip && (
                           <div className="flex items-center gap-2 text-muted-foreground">
                               <Globe className="h-4 w-4" />
                               <span className="text-sm">{activity.ip}</span>
                           </div>
                         )}
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
             
             <div className="bg-muted/30 px-5 py-3 border-t">
                 <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                     <div className="flex-1">
                         <p className="text-xs text-muted-foreground mb-2">{activity.details}</p>
                         {(activity.lat && activity.lng) && (
                           <LocationDisplay 
                             latitude={activity.lat}
                             longitude={activity.lng}
                             locationName={activity.locationName}
                             city={activity.city}
                             country={activity.country}
                             variant="badge"
                             showAccuracy={false}
                           />
                         )}
                     </div>
                     <Button variant="ghost" size="sm" onClick={() => setSelectedActivity(activity)} className="flex items-center gap-2 flex-shrink-0">
                          <Eye className="h-4 w-4" />
                          عرض التفاصيل
                      </Button>
                 </div>
             </div>
          </Card>
          );
        })}

      </div>

      {/* Activity Details Dialog */}
      <Dialog open={!!selectedActivity} onOpenChange={(isOpen) => !isOpen && setSelectedActivity(null)}>
        <DialogContent className="max-w-2xl">
           {selectedActivity && (
              <>
                  <DialogHeader>
                      <DialogTitle className="text-2xl">{selectedActivity.title}</DialogTitle>
                      <DialogDescription>
                          تفاصيل مفصلة للنشاط المحدد
                      </DialogDescription>
                  </DialogHeader>
                  <div className="grid md:grid-cols-2 gap-6 py-4">
                      <Card>
                          <CardHeader><CardTitle className="text-base">معلومات الحدث</CardTitle></CardHeader>
                          <CardContent className="space-y-4">
                              <div className="flex items-start gap-4">
                                  <Clock className="h-5 w-5 text-muted-foreground mt-1" />
                                  <div>
                                      <p className="text-sm font-semibold text-muted-foreground">التوقيت</p>
                                      <p className="text-base text-foreground">{new Date(selectedActivity.timestamp).toLocaleString('ar-EG')}</p>
                                  </div>
                              </div>
                              <div className="flex items-start gap-4">
                                  <Building className="h-5 w-5 text-muted-foreground mt-1" />
                                  <div>
                                      <p className="text-sm font-semibold text-muted-foreground">العيادة</p>
                                      <p className="text-base text-foreground">{selectedActivity.clinic?.name || 'غير محدد'}</p>
                                  </div>
                              </div>
                              {(selectedActivity.lat && selectedActivity.lng) && (
                                  <div className="col-span-full">
                                      <LocationDisplay 
                                        latitude={selectedActivity.lat}
                                        longitude={selectedActivity.lng}
                                        locationName={selectedActivity.locationName}
                                        city={selectedActivity.city}
                                        country={selectedActivity.country}
                                        variant="card"
                                        showAccuracy={true}
                                      />
                                  </div>
                              )}
                          </CardContent>
                      </Card>
                      <div className="space-y-6">
                          <Card>
                              <CardHeader><CardTitle className="text-base">المستخدم</CardTitle></CardHeader>
                              <CardContent className="space-y-4">
                                  <div className="flex items-start gap-4">
                                      <User className="h-5 w-5 text-muted-foreground mt-1" />
                                      <div>
                                          <p className="text-sm font-semibold text-muted-foreground">الاسم</p>
                                          <p className="text-base text-foreground">{selectedActivity.user.name}</p>
                                      </div>
                                  </div>
                                  <div className="flex items-start gap-4">
                                      <Briefcase className="h-5 w-5 text-muted-foreground mt-1" />
                                      <div>
                                          <p className="text-sm font-semibold text-muted-foreground">الدور</p>
                                          <p className="text-base text-foreground">{selectedActivity.user.role}</p>
                                      </div>
                                  </div>
                              </CardContent>
                          </Card>
                           <Card>
                              <CardHeader><CardTitle className="text-base">المعلومات التقنية</CardTitle></CardHeader>
                              <CardContent className="space-y-4">
                                  <div className="flex items-start gap-4">
                                      <MousePointer className="h-5 w-5 text-muted-foreground mt-1" />
                                      <div>
                                          <p className="text-sm font-semibold text-muted-foreground">عنوان IP</p>
                                          <p className="text-base text-foreground">{selectedActivity.ip || 'غير معروف'}</p>
                                      </div>
                                  </div>
                                  <div className="flex items-start gap-4">
                                      <Monitor className="h-5 w-5 text-muted-foreground mt-1" />
                                      <div>
                                          <p className="text-sm font-semibold text-muted-foreground">الجهاز</p>
                                          <p className="text-base text-foreground">{selectedActivity.device || 'غير معروف'}</p>
                                      </div>
                                  </div>
                                  <div className="flex items-start gap-4">
                                      <Globe className="h-5 w-5 text-muted-foreground mt-1" />
                                      <div>
                                          <p className="text-sm font-semibold text-muted-foreground">المتصفح</p>
                                          <p className="text-base text-foreground">{selectedActivity.browser || 'غير معروف'}</p>
                                      </div>
                                  </div>
                              </CardContent>
                          </Card>
                      </div>
                  </div>
              </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}