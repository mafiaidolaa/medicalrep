"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield,
  CheckCircle
} from 'lucide-react';

export function CyberSecurityCenter() {
  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <Shield className="h-6 w-6 text-green-600" />
        مركز الأمان السيبراني
      </h2>
      
      <Alert className="border-green-500 bg-green-50">
        <Shield className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <strong>🛡️ مركز الأمان السيبراني نشط:</strong> 
          جميع أنظمة الحماية تعمل بشكل طبيعي.
        </AlertDescription>
      </Alert>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-700">0</div>
            <div className="text-sm text-blue-600">تهديدات نشطة</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-700">100%</div>
            <div className="text-sm text-green-600">معدل الحماية</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-700">24/7</div>
            <div className="text-sm text-purple-600">مراقبة مستمرة</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-50 to-amber-100 border-orange-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-700">0</div>
            <div className="text-sm text-orange-600">حوادث مفتوحة</div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            حالة النظام
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span>جدار الحماية</span>
            <Badge className="bg-green-100 text-green-800">نشط</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>كشف التهديدات</span>
            <Badge className="bg-green-100 text-green-800">يعمل</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>النسخ الاحتياطي</span>
            <Badge className="bg-green-100 text-green-800">محدث</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}