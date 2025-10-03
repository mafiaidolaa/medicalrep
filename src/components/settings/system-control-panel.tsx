"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  Server, 
  Cpu, 
  HardDrive, 
  MemoryStick,
  Network,
  Database,
  RefreshCw,
  Power,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Users,
  Zap,
  Monitor,
  Wifi,
  Globe
} from 'lucide-react';

export function SystemControlPanel() {
  const [isLoading, setIsLoading] = useState(false);

  // بيانات وهمية لحالة النظام
  const systemStats = {
    cpu: { usage: 45, cores: 8, temperature: 65 },
    memory: { used: 6.2, total: 16, percentage: 39 },
    disk: { used: 120, total: 500, percentage: 24 },
    network: { upload: 12.5, download: 45.8 },
    uptime: "15 أيام، 8 ساعات",
    activeUsers: 24,
    services: {
      database: { status: 'running', uptime: '99.9%' },
      api: { status: 'running', uptime: '99.8%' },
      cache: { status: 'running', uptime: '99.9%' },
      backup: { status: 'stopped', uptime: '0%' }
    }
  };

  const performanceMetrics = [
    { title: 'استجابة API', value: '125ms', trend: 'up', color: 'text-green-600' },
    { title: 'معدل النجاح', value: '99.8%', trend: 'stable', color: 'text-blue-600' },
    { title: 'عدد الطلبات/دقيقة', value: '1,247', trend: 'up', color: 'text-purple-600' },
    { title: 'الأخطاء/ساعة', value: '2', trend: 'down', color: 'text-red-600' },
  ];

  const handleRefresh = async () => {
    setIsLoading(true);
    // محاكاة تحديث البيانات
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsLoading(false);
  };

  const restartService = (serviceName: string) => {
    console.log(`Restarting service: ${serviceName}`);
    // هنا يمكن إضافة منطق إعادة تشغيل الخدمة
  };

  return (
    <div className="space-y-6">
      {/* العنوان والإحصائيات العامة */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Server className="h-6 w-6 text-blue-600" />
            لوحة تحكم النظام
          </h2>
          <p className="text-muted-foreground">مراقبة أداء النظام وإدارة الخدمات</p>
        </div>
        <Button onClick={handleRefresh} disabled={isLoading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          تحديث البيانات
        </Button>
      </div>

      {/* حالة النظام العامة */}
      <Alert className="border-green-500 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <strong>النظام يعمل بشكل طبيعي:</strong> جميع الخدمات الأساسية تعمل، 
          وقت التشغيل {systemStats.uptime}، {systemStats.activeUsers} مستخدم نشط.
        </AlertDescription>
      </Alert>

      {/* مقاييس الأداء السريعة */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {performanceMetrics.map((metric, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{metric.title}</p>
                  <p className={`text-xl font-bold ${metric.color}`}>{metric.value}</p>
                </div>
                <TrendingUp className={`h-5 w-5 ${
                  metric.trend === 'up' ? 'text-green-500' :
                  metric.trend === 'down' ? 'text-red-500' : 'text-gray-500'
                }`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* موارد النظام */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-orange-600" />
              وحدة المعالجة المركزية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>الاستخدام</span>
              <Badge variant="outline">{systemStats.cpu.usage}%</Badge>
            </div>
            <Progress value={systemStats.cpu.usage} className="h-2" />
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span>الأنوية:</span>
                <span>{systemStats.cpu.cores}</span>
              </div>
              <div className="flex justify-between">
                <span>الحرارة:</span>
                <span>{systemStats.cpu.temperature}°C</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MemoryStick className="h-5 w-5 text-blue-600" />
              ذاكرة النظام
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>الاستخدام</span>
              <Badge variant="outline">{systemStats.memory.percentage}%</Badge>
            </div>
            <Progress value={systemStats.memory.percentage} className="h-2" />
            
            <div className="flex justify-between text-sm">
              <span>المستخدم: {systemStats.memory.used} GB</span>
              <span>الإجمالي: {systemStats.memory.total} GB</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-green-600" />
              مساحة التخزين
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>الاستخدام</span>
              <Badge variant="outline">{systemStats.disk.percentage}%</Badge>
            </div>
            <Progress value={systemStats.disk.percentage} className="h-2" />
            
            <div className="flex justify-between text-sm">
              <span>المستخدم: {systemStats.disk.used} GB</span>
              <span>الإجمالي: {systemStats.disk.total} GB</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5 text-purple-600" />
              حركة الشبكة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-lg font-semibold text-green-600">
                  ↑ {systemStats.network.upload} MB/s
                </div>
                <div className="text-xs text-muted-foreground">الرفع</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-blue-600">
                  ↓ {systemStats.network.download} MB/s
                </div>
                <div className="text-xs text-muted-foreground">التحميل</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* حالة الخدمات */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-600" />
            حالة الخدمات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(systemStats.services).map(([serviceName, service]) => (
              <div key={serviceName} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    service.status === 'running' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                  }`}>
                    {service.status === 'running' ? 
                      <CheckCircle className="h-4 w-4" /> : 
                      <AlertCircle className="h-4 w-4" />
                    }
                  </div>
                  <div>
                    <h4 className="font-medium">
                      {serviceName === 'database' ? 'قاعدة البيانات' :
                       serviceName === 'api' ? 'خدمة API' :
                       serviceName === 'cache' ? 'نظام التخزين المؤقت' : 'النسخ الاحتياطي'}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      وقت التشغيل: {service.uptime}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge className={service.status === 'running' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {service.status === 'running' ? 'يعمل' : 'متوقف'}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => restartService(serviceName)}>
                    <Power className="h-3 w-3 mr-1" />
                    إعادة تشغيل
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* إجراءات سريعة */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-600" />
            إجراءات سريعة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-16 flex-col">
              <Database className="h-5 w-5 mb-1" />
              نسخة احتياطية
            </Button>
            <Button variant="outline" className="h-16 flex-col">
              <Monitor className="h-5 w-5 mb-1" />
              مراقبة الأداء
            </Button>
            <Button variant="outline" className="h-16 flex-col">
              <Wifi className="h-5 w-5 mb-1" />
              فحص الشبكة
            </Button>
            <Button variant="outline" className="h-16 flex-col">
              <Globe className="h-5 w-5 mb-1" />
              حالة المواقع
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}