"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Database,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  RefreshCw,
  Shield,
  Activity
} from "lucide-react";

interface UpdateResult {
  sql: string;
  status: 'success' | 'warning' | 'error' | 'skipped';
  error?: string;
  reason?: string;
}

interface UpdateResponse {
  success: boolean;
  message: string;
  results: UpdateResult[];
  summary: {
    total: number;
    successful: number;
    warnings: number;
    errors: number;
    skipped: number;
  };
}

export default function DatabaseUpdatePage() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateResult, setUpdateResult] = useState<UpdateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDatabaseUpdate = async () => {
    setIsUpdating(true);
    setError(null);
    setUpdateResult(null);

    try {
      const response = await fetch('/api/admin/update-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل في تحديث قاعدة البيانات');
      }

      setUpdateResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطأ غير معروف');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'skipped':
        return <Clock className="h-4 w-4 text-gray-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">نجح</Badge>;
      case 'warning':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-700">تحذير</Badge>;
      case 'error':
        return <Badge variant="destructive">خطأ</Badge>;
      case 'skipped':
        return <Badge variant="secondary">تم تخطيه</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Database className="h-8 w-8 text-primary" />
          <Shield className="h-6 w-6 text-secondary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">تحديث قاعدة البيانات</h1>
          <p className="text-muted-foreground">
            تطبيق تحديثات نظام سجل الأنشطة المهمة مع تتبع الموقع الجغرافي
          </p>
        </div>
      </div>

      {/* Warning Card */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>تنبيه:</strong> هذه العملية ستقوم بتحديث هيكل قاعدة البيانات. تأكد من أن لديك صلاحيات إدارية قبل المتابعة.
        </AlertDescription>
      </Alert>

      {/* Update Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            التحديثات المطلوبة
          </CardTitle>
          <CardDescription>
            سيتم تطبيق التحديثات التالية على قاعدة البيانات:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold">📍 أعمدة الموقع الجغرافي:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• location_accuracy - دقة الموقع</li>
                <li>• location_provider - مصدر الموقع</li>
                <li>• full_address - العنوان الكامل</li>
                <li>• postal_code - الرمز البريدي</li>
                <li>• region - المنطقة</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">💻 أعمدة المعلومات التقنية:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• browser_version - إصدار المتصفح</li>
                <li>• os_version - إصدار نظام التشغيل</li>
                <li>• screen_resolution - دقة الشاشة</li>
                <li>• timezone - المنطقة الزمنية</li>
              </ul>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <h4 className="font-semibold">🔍 الفهارس المحسنة:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• فهرس للأنشطة المهمة فقط</li>
              <li>• فهرس للأنشطة مع معلومات موقع</li>
              <li>• فهرس للبحث بالتاريخ والنوع</li>
              <li>• فهرس للبحث بالمستخدم والنوع</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Update Button */}
      <Card>
        <CardContent className="p-6 text-center">
          <Button 
            onClick={handleDatabaseUpdate}
            disabled={isUpdating}
            size="lg"
            className="w-full md:w-auto"
          >
            {isUpdating ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                جارِ تحديث قاعدة البيانات...
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                تطبيق التحديثات
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>خطأ:</strong> {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Results Display */}
      {updateResult && (
        <div className="space-y-4">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-green-700">✅ تمت التحديثات بنجاح!</CardTitle>
              <CardDescription>{updateResult.message}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {updateResult.summary.total}
                  </div>
                  <div className="text-xs text-muted-foreground">إجمالي</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {updateResult.summary.successful}
                  </div>
                  <div className="text-xs text-muted-foreground">ناجح</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {updateResult.summary.warnings}
                  </div>
                  <div className="text-xs text-muted-foreground">تحذير</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {updateResult.summary.errors}
                  </div>
                  <div className="text-xs text-muted-foreground">خطأ</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">
                    {updateResult.summary.skipped}
                  </div>
                  <div className="text-xs text-muted-foreground">تم تخطيه</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Results */}
          {updateResult.results.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>تفاصيل التحديثات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {updateResult.results.map((result, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                      <div className="mt-0.5">
                        {getStatusIcon(result.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusBadge(result.status)}
                          <code className="text-xs bg-gray-100 px-1 rounded truncate">
                            {result.sql.split(' ').slice(0, 8).join(' ')}...
                          </code>
                        </div>
                        {result.error && (
                          <p className="text-xs text-red-600 mt-1">{result.error}</p>
                        )}
                        {result.reason && (
                          <p className="text-xs text-gray-600 mt-1">{result.reason}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}