"use client";

import React, { useState } from 'react';
import { InteractiveMapsDashboard } from '@/components/maps/interactive-maps-dashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Map, Activity, BarChart3, Settings, MapPin, Globe, Navigation, Layers } from 'lucide-react';

export default function MapsPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'activity' | 'analytics'>('dashboard');

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Map className="h-8 w-8 text-blue-600" />
            </div>
            <span>نظام الخرائط والمواقع</span>
          </h1>
          <p className="text-muted-foreground mt-2">
            عرض وتحليل مواقع الأنشطة والعيادات والمستخدمين على الخرائط التفاعلية
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            إعدادات الخرائط
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-full">
                <MapPin className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">العيادات المسجلة</p>
                <p className="text-2xl font-bold">--</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الأنشطة مع مواقع</p>
                <p className="text-2xl font-bold">--</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-full">
                <Navigation className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الزيارات اليوم</p>
                <p className="text-2xl font-bold">--</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-full">
                <Globe className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">المناطق النشطة</p>
                <p className="text-2xl font-bold">--</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab as any} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="dashboard" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
            <Map className="h-4 w-4" />
            الخريطة التفاعلية
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Activity className="h-4 w-4" />
            تتبع الأنشطة
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2 data-[state=active]:bg-green-600 data-[state=active]:text-white">
            <BarChart3 className="h-4 w-4" />
            التحليلات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                لوحة الخرائط التفاعلية
              </CardTitle>
              <CardDescription>
                عرض جميع العيادات والأنشطة والمستخدمين على خريطة تفاعلية مع إمكانيات التصفية والبحث المتقدمة
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <InteractiveMapsDashboard />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                تتبع الأنشطة الجغرافية
              </CardTitle>
              <CardDescription>
                مراقبة وتحليل الأنشطة المرتبطة بالمواقع الجغرافية في الوقت الفعلي
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Activity className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">قريباً: تتبع الأنشطة المباشر</h3>
                <p className="text-muted-foreground mb-4">
                  سيتم إضافة ميزة تتبع الأنشطة المباشر مع المواقع الجغرافية والإشعارات الذكية
                </p>
                <Button variant="outline">
                  تفعيل التتبع المباشر
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                تحليلات البيانات الجغرافية
              </CardTitle>
              <CardDescription>
                إحصائيات وتحليلات مفصلة للأنشطة والمواقع والأنماط الجغرافية
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">قريباً: تحليلات متقدمة</h3>
                <p className="text-muted-foreground mb-4">
                  رسوم بيانية وخرائط حرارية وتحليل الأنماط الجغرافية للأنشطة والزيارات
                </p>
                <Button variant="outline">
                  عرض التحليلات
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
