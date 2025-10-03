"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Settings, 
  MapPin,
  Database,
  Globe,
  Server,
  Wifi
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useToast } from '@/hooks/use-toast';

interface DiagnosticResult {
  name: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: string;
}

export function LocationSystemDiagnostics() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostics = async () => {
    setIsRunning(true);
    const results: DiagnosticResult[] = [];

    try {
      // 1. Check if user is authenticated
      if (session?.user) {
        results.push({
          name: 'المصادقة',
          status: 'success',
          message: `مسجل دخول كـ ${session.user.email}`,
          details: `Role: ${session.user.role}`
        });
      } else {
        results.push({
          name: 'المصادقة',
          status: 'error',
          message: 'لم يتم تسجيل الدخول',
          details: 'يجب تسجيل الدخول لتسجيل الأنشطة'
        });
      }

      // 2. Check browser geolocation support
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        results.push({
          name: 'دعم الموقع في المتصفح',
          status: 'success',
          message: 'المتصفح يدعم خدمة تحديد الموقع',
        });
      } else {
        results.push({
          name: 'دعم الموقع في المتصفح',
          status: 'error',
          message: 'المتصفح لا يدعم خدمة تحديد الموقع',
        });
      }

      // 3. Check location permission
      try {
        if ('permissions' in navigator) {
          const permission = await navigator.permissions.query({ name: 'geolocation' });
          switch (permission.state) {
            case 'granted':
              results.push({
                name: 'إذن الموقع',
                status: 'success',
                message: 'تم منح إذن الوصول للموقع',
              });
              break;
            case 'denied':
              results.push({
                name: 'إذن الموقع',
                status: 'error',
                message: 'تم رفض إذن الوصول للموقع',
                details: 'يمكنك إعادة تفعيله من إعدادات المتصفح'
              });
              break;
            case 'prompt':
              results.push({
                name: 'إذن الموقع',
                status: 'warning',
                message: 'لم يُطلب إذن الموقع بعد',
                details: 'سيتم طلب الإذن عند الحاجة'
              });
              break;
          }
        } else {
          results.push({
            name: 'إذن الموقع',
            status: 'warning',
            message: 'لا يمكن فحص حالة إذن الموقع',
          });
        }
      } catch (error) {
        results.push({
          name: 'إذن الموقع',
          status: 'error',
          message: 'خطأ في فحص إذن الموقع',
          details: error instanceof Error ? error.message : 'خطأ غير معروف'
        });
      }

      // 4. Check location settings in localStorage
      try {
        const settings = localStorage.getItem('maps_settings');
        if (settings) {
          const parsed = JSON.parse(settings);
          if (parsed.locationTracking?.enabled) {
            results.push({
              name: 'إعدادات تتبع الموقع',
              status: 'success',
              message: 'تم تفعيل تتبع الموقع في الإعدادات',
              details: `تسجيل الدخول: ${parsed.locationTracking.requestOnLogin ? 'مفعل' : 'معطل'}`
            });
          } else {
            results.push({
              name: 'إعدادات تتبع الموقع',
              status: 'warning',
              message: 'تتبع الموقع معطل في الإعدادات',
              details: 'انتقل للإعدادات لتفعيل تتبع الموقع'
            });
          }
        } else {
          results.push({
            name: 'إعدادات تتبع الموقع',
            status: 'warning',
            message: 'لم يتم العثور على إعدادات الموقع',
            details: 'سيتم استخدام الإعدادات الافتراضية'
          });
        }
      } catch (error) {
        results.push({
          name: 'إعدادات تتبع الموقع',
          status: 'error',
          message: 'خطأ في قراءة إعدادات الموقع',
        });
      }

      // 5. Test API connection
      try {
        const response = await fetch('/api/activity-log?limit=1');
        if (response.ok) {
          const data = await response.json();
          results.push({
            name: 'اتصال API',
            status: 'success',
            message: 'API يعمل بشكل صحيح',
            details: `العثور على ${data.data?.length || 0} أنشطة`
          });
        } else {
          results.push({
            name: 'اتصال API',
            status: 'error',
            message: `خطأ في API: ${response.status}`,
          });
        }
      } catch (error) {
        results.push({
          name: 'اتصال API',
          status: 'error',
          message: 'فشل الاتصال بـ API',
          details: error instanceof Error ? error.message : 'خطأ غير معروف'
        });
      }

      // 6. Test location service
      try {
        const testPosition = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 10000,
            enableHighAccuracy: false
          });
        });
        
        results.push({
          name: 'خدمة الموقع',
          status: 'success',
          message: 'تم الحصول على الموقع بنجاح',
          details: `دقة: ${testPosition.coords.accuracy.toFixed(0)} متر`
        });
      } catch (error: any) {
        let errorMessage = 'خطأ غير معروف';
        if (error.code === 1) errorMessage = 'تم رفض إذن الموقع';
        else if (error.code === 2) errorMessage = 'الموقع غير متاح';
        else if (error.code === 3) errorMessage = 'انتهت مهلة طلب الموقع';
        
        results.push({
          name: 'خدمة الموقع',
          status: 'error',
          message: errorMessage,
          details: error.message
        });
      }

      setDiagnostics(results);
    } catch (error) {
      console.error('Diagnostics error:', error);
      toast({
        title: "خطأ في التشخيص",
        description: "حدث خطأ أثناء تشخيص النظام",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, [session]);

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
    }
  };

  const getStatusBadge = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">نجح</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800">تحذير</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800">خطأ</Badge>;
    }
  };

  const successCount = diagnostics.filter(d => d.status === 'success').length;
  const warningCount = diagnostics.filter(d => d.status === 'warning').length;
  const errorCount = diagnostics.filter(d => d.status === 'error').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            تشخيص نظام تتبع المواقع
          </CardTitle>
          <Button
            onClick={runDiagnostics}
            disabled={isRunning}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'جاري الفحص...' : 'إعادة فحص'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="mb-6 flex gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium">{successCount} نجح</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm font-medium">{warningCount} تحذير</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm font-medium">{errorCount} خطأ</span>
          </div>
        </div>

        {/* Overall Status Alert */}
        {errorCount > 0 && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>هناك مشاكل تحتاج لحل:</strong> يوجد {errorCount} أخطاء تمنع النظام من العمل بشكل صحيح.
            </AlertDescription>
          </Alert>
        )}

        {warningCount > 0 && errorCount === 0 && (
          <Alert className="mb-4 border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>النظام يعمل مع تحذيرات:</strong> يوجد {warningCount} تحذيرات قد تؤثر على الأداء.
            </AlertDescription>
          </Alert>
        )}

        {errorCount === 0 && warningCount === 0 && diagnostics.length > 0 && (
          <Alert className="mb-4 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>النظام يعمل بشكل مثالي!</strong> جميع الفحوصات نجحت.
            </AlertDescription>
          </Alert>
        )}

        {/* Diagnostic Results */}
        <div className="space-y-3">
          {diagnostics.map((diagnostic, index) => (
            <div key={index} className="flex items-start justify-between p-3 border rounded-lg">
              <div className="flex items-start gap-3">
                {getStatusIcon(diagnostic.status)}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm">{diagnostic.name}</h4>
                    {getStatusBadge(diagnostic.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">{diagnostic.message}</p>
                  {diagnostic.details && (
                    <p className="text-xs text-muted-foreground mt-1">{diagnostic.details}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {diagnostics.length === 0 && !isRunning && (
          <div className="text-center py-8 text-muted-foreground">
            <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>لم يتم تشغيل التشخيص بعد</p>
          </div>
        )}

        {isRunning && (
          <div className="text-center py-8 text-muted-foreground">
            <RefreshCw className="h-12 w-12 mx-auto mb-4 animate-spin opacity-50" />
            <p>جاري فحص النظام...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}