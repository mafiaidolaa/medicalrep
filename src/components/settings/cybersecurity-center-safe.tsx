"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Ban,
  Activity,
  Settings,
  Save,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function CyberSecurityCenterSafe() {
  const [activeTab, setActiveTab] = useState<'overview' | 'settings'>('overview');
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  // بيانات محاكاة آمنة
  const securityStats = {
    totalThreats: 5,
    activeThreats: 2,
    criticalThreats: 1,
    blockedCount: 3
  };

  const threatAlerts = [
    {
      id: '1',
      message: 'محاولات تسجيل دخول متكررة فاشلة',
      timestamp: new Date().toISOString(),
      severity: 'high' as const
    },
    {
      id: '2', 
      message: 'تسجيل دخول من موقع غير معتاد',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      severity: 'medium' as const
    }
  ];

  const updateSettings = async () => {
    setIsUpdating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast({
        title: '✅ تم الحفظ',
        description: 'تم تحديث إعدادات الأمان بنجاح'
      });
    } catch (error) {
      toast({
        title: '❌ خطأ',
        description: 'فشل في حفظ الإعدادات',
        variant: 'destructive'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'حرج';
      case 'high':
        return 'عالي';
      case 'medium':
        return 'متوسط';
      default:
        return 'منخفض';
    }
  };

  return (
    <div className="space-y-6">
      {/* العنوان والإحصائيات */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-700">{securityStats.totalThreats}</div>
            <div className="text-sm text-blue-600 flex items-center justify-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              إجمالي التهديدات
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-rose-100 border-red-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-700">{securityStats.activeThreats}</div>
            <div className="text-sm text-red-600 flex items-center justify-center gap-1">
              <Shield className="h-3 w-3" />
              تهديدات نشطة
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-amber-100 border-orange-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-700">{securityStats.criticalThreats}</div>
            <div className="text-sm text-orange-600 flex items-center justify-center gap-1">
              <XCircle className="h-3 w-3" />
              تهديدات حرجة
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-50 to-slate-100 border-gray-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-700">{securityStats.blockedCount}</div>
            <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
              <Ban className="h-3 w-3" />
              عناصر محظورة
            </div>
          </CardContent>
        </Card>
      </div>

      {/* التبويبات */}
      <div className="flex items-center gap-2 bg-muted/50 p-2 rounded-lg">
        {[
          { id: 'overview', label: '📊 نظرة عامة', icon: Activity },
          { id: 'settings', label: '⚙️ إعدادات الأمان', icon: Settings }
        ].map(tab => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(tab.id as any)}
            className="flex items-center gap-2"
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* محتوى التبويبات */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            حالة الأمان العامة
          </h3>

          {/* حالة الأمان */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-green-200 bg-green-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-5 w-5" />
                  الميزات المفعلة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>المصادقة الثنائية</span>
                  <Badge className="bg-green-100 text-green-800">مفعل</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>حماية من الهجمات</span>
                  <Badge className="bg-green-100 text-green-800">نشط</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>تتبع الأجهزة</span>
                  <Badge className="bg-green-100 text-green-800">يعمل</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>تحليل المواقع</span>
                  <Badge className="bg-green-100 text-green-800">مراقب</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-orange-200 bg-orange-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-700">
                  <AlertTriangle className="h-5 w-5" />
                  التهديدات الحديثة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {threatAlerts.map(threat => (
                  <div key={threat.id} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{threat.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(threat.timestamp).toLocaleString('ar-EG')}
                      </p>
                    </div>
                    <Badge className={getSeverityBadgeClass(threat.severity)}>
                      {getSeverityLabel(threat.severity)}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-600" />
              إعدادات الأمان المتقدمة
            </h3>
            <Button 
              onClick={updateSettings}
              disabled={isUpdating}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
            >
              {isUpdating ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isUpdating ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </Button>
          </div>

          <Alert className="border-blue-500 bg-blue-50">
            <Shield className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>🛡️ مركز الأمان السيبراني:</strong> جميع الأنظمة تعمل بشكل طبيعي. 
              النظام محمي ضد التهديدات الحديثة.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* تنبيه الحالة */}
      <Alert className="border-green-500 bg-green-50">
        <Shield className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <strong>🛡️ مركز الأمان السيبراني نشط:</strong> {securityStats.activeThreats} تهديد نشط، {securityStats.blockedCount} عنصر محظور. 
          جميع أنظمة الحماية تعمل بشكل طبيعي.
        </AlertDescription>
      </Alert>
    </div>
  );
}