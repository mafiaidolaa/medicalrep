"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2, 
  MapPin, 
  Settings, 
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { useMapsConfig } from '@/hooks/use-maps-config';
import Link from 'next/link';

interface MapStatusCheckerProps {
  showDetailedInfo?: boolean;
  className?: string;
}

export function MapStatusChecker({ 
  showDetailedInfo = true, 
  className = "" 
}: MapStatusCheckerProps) {
  const mapsConfig = useMapsConfig();
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [apiTestResult, setApiTestResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);

  // اختبار مفتاح API
  const testApiKey = async () => {
    if (!mapsConfig.config.apiKey) {
      setApiTestResult({
        success: false,
        message: 'لا يوجد مفتاح API محدد'
      });
      return;
    }

    setIsTestingApi(true);
    setApiTestResult(null);

    try {
      // اختبار بسيط للـ Geocoding API
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=Cairo,Egypt&key=${mapsConfig.config.apiKey}`
      );
      const data = await response.json();

      if (data.status === 'OK') {
        setApiTestResult({
          success: true,
          message: 'مفتاح API يعمل بشكل صحيح',
          details: {
            requests_remaining: data.plus_code ? 'OK' : 'Limited',
            result_count: data.results?.length || 0
          }
        });
      } else if (data.status === 'REQUEST_DENIED') {
        setApiTestResult({
          success: false,
          message: 'تم رفض الطلب - تحقق من صحة مفتاح API والقيود',
          details: { error: data.error_message }
        });
      } else if (data.status === 'OVER_QUERY_LIMIT') {
        setApiTestResult({
          success: false,
          message: 'تم تجاوز حد الاستعلامات المسموح',
          details: { status: data.status }
        });
      } else {
        setApiTestResult({
          success: false,
          message: `خطأ في API: ${data.status}`,
          details: { error: data.error_message || data.status }
        });
      }
    } catch (error) {
      setApiTestResult({
        success: false,
        message: 'فشل في الاتصال بـ Google Maps API',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
    } finally {
      setIsTestingApi(false);
    }
  };

  // تحديد حالة النظام العامة
  const getSystemStatus = () => {
    if (mapsConfig.isLoading) {
      return { status: 'loading', message: 'جاري التحميل...' };
    }
    
    if (mapsConfig.error) {
      return { status: 'error', message: 'خطأ في تحميل الإعدادات' };
    }
    
    if (!mapsConfig.config.enabled) {
      return { status: 'disabled', message: 'خرائط جوجل معطلة' };
    }
    
    if (!mapsConfig.config.apiKey) {
      return { status: 'no-key', message: 'مفتاح API غير محدد' };
    }
    
    if (!mapsConfig.validateConfig(mapsConfig.config)) {
      return { status: 'invalid', message: 'إعدادات غير صحيحة' };
    }
    
    return { status: 'ready', message: 'جاهز للاستخدام' };
  };

  const systemStatus = getSystemStatus();

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          حالة خرائط جوجل
          <Badge 
            variant={systemStatus.status === 'ready' ? 'default' : 'secondary'}
            className={`
              ${systemStatus.status === 'ready' ? 'bg-green-500' : ''}
              ${systemStatus.status === 'error' ? 'bg-red-500 text-white' : ''}
              ${systemStatus.status === 'disabled' ? 'bg-gray-500 text-white' : ''}
              ${systemStatus.status === 'loading' ? 'bg-blue-500 text-white' : ''}
            `}
          >
            {systemStatus.status === 'loading' && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
            {systemStatus.status === 'ready' && <CheckCircle className="h-3 w-3 ml-1" />}
            {systemStatus.status === 'error' && <XCircle className="h-3 w-3 ml-1" />}
            {systemStatus.status === 'disabled' && <XCircle className="h-3 w-3 ml-1" />}
            {systemStatus.status === 'no-key' && <AlertTriangle className="h-3 w-3 ml-1" />}
            {systemStatus.status === 'invalid' && <AlertTriangle className="h-3 w-3 ml-1" />}
            {systemStatus.message}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* معلومات أساسية */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">الحالة</div>
            <div className="flex items-center gap-2">
              {mapsConfig.config.enabled ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm">
                {mapsConfig.config.enabled ? 'مفعل' : 'معطل'}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">مفتاح API</div>
            <div className="flex items-center gap-2">
              {mapsConfig.config.apiKey ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm">
                {mapsConfig.config.apiKey ? 'محدد' : 'غير محدد'}
              </span>
            </div>
          </div>
        </div>

        {/* تفاصيل الإعدادات */}
        {showDetailedInfo && mapsConfig.config.enabled && (
          <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
            <div className="text-sm font-medium">تفاصيل الإعدادات</div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground">نوع الخريطة:</span>
                <span className="ml-2 font-medium">{mapsConfig.config.mapType}</span>
              </div>
              <div>
                <span className="text-muted-foreground">الثيم:</span>
                <span className="ml-2 font-medium">{mapsConfig.config.theme}</span>
              </div>
              <div>
                <span className="text-muted-foreground">اللغة:</span>
                <span className="ml-2 font-medium">{mapsConfig.config.language}</span>
              </div>
              <div>
                <span className="text-muted-foreground">المنطقة:</span>
                <span className="ml-2 font-medium">{mapsConfig.config.region}</span>
              </div>
              <div>
                <span className="text-muted-foreground">التكبير الافتراضي:</span>
                <span className="ml-2 font-medium">{mapsConfig.config.defaultZoom}</span>
              </div>
              <div>
                <span className="text-muted-foreground">المركز:</span>
                <span className="ml-2 font-medium">
                  {mapsConfig.config.defaultCenter.lat.toFixed(2)}, {mapsConfig.config.defaultCenter.lng.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* اختبار API */}
        {mapsConfig.config.enabled && mapsConfig.config.apiKey && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={testApiKey}
                disabled={isTestingApi}
                className="flex items-center gap-2"
              >
                {isTestingApi ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                اختبار مفتاح API
              </Button>
              
              <Link href="/settings?category=integrations&tab=maps">
                <Button size="sm" variant="ghost">
                  <Settings className="h-4 w-4 ml-2" />
                  الإعدادات
                </Button>
              </Link>
            </div>

            {/* نتيجة اختبار API */}
            {apiTestResult && (
              <Alert variant={apiTestResult.success ? 'default' : 'destructive'}>
                <div className="flex items-start gap-2">
                  {apiTestResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                  )}
                  <AlertDescription className="flex-1">
                    <div className="space-y-1">
                      <p className="font-medium">{apiTestResult.message}</p>
                      {apiTestResult.details && showDetailedInfo && (
                        <div className="text-xs text-muted-foreground">
                          <pre className="whitespace-pre-wrap">
                            {JSON.stringify(apiTestResult.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </div>
              </Alert>
            )}
          </div>
        )}

        {/* روابط مفيدة */}
        {systemStatus.status !== 'ready' && (
          <div className="flex flex-col gap-2 pt-2 border-t">
            <div className="text-sm font-medium">روابط مفيدة:</div>
            <div className="flex flex-wrap gap-2">
              <Link href="/settings?category=integrations&tab=maps">
                <Button size="sm" variant="outline">
                  <Settings className="h-3 w-3 ml-2" />
                  إعدادات الخرائط
                </Button>
              </Link>
              <a 
                href="https://console.cloud.google.com/apis/credentials" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Button size="sm" variant="ghost">
                  <ExternalLink className="h-3 w-3 ml-2" />
                  Google Cloud Console
                </Button>
              </a>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}