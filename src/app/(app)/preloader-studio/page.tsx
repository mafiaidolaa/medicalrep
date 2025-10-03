"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Settings, Palette, Loader2, Eye, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { PreloaderSettings } from '@/components/settings/preloader-settings';

export default function PreloaderStudioPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900">
      {/* Header */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200/50 dark:border-slate-700/50 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/settings">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowRight className="h-4 w-4 rotate-180" />
                  العودة للإعدادات
                </Button>
              </Link>
              
              <div className="h-6 w-px bg-border" />
              
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    استوديو Preloader
                  </h1>
                  <p className="text-muted-foreground text-sm">تخصيص متقدم لشاشة التحميل</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" />
                Pro Studio
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full blur-xl opacity-30"></div>
              <div className="relative p-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full">
                <Loader2 className="h-12 w-12 text-white animate-spin" />
              </div>
            </div>
          </div>
          
          <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            صمم شاشة تحميل مذهلة
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-2xl mx-auto">
            استوديو متكامل لتخصيص شاشة التحميل الأولية بتأثيرات بصرية احترافية وتحكم كامل في المظهر
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl p-6 border border-slate-200/50">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg w-fit mx-auto mb-4">
                <Palette className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-2">تخصيص المظهر</h3>
              <p className="text-sm text-muted-foreground">ألوان، خطوط، وتأثيرات بصرية متقدمة</p>
            </div>
            
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl p-6 border border-slate-200/50">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg w-fit mx-auto mb-4">
                <Settings className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold mb-2">إعدادات متقدمة</h3>
              <p className="text-sm text-muted-foreground">توقيتات، رسوم متحركة، وتفاعلات</p>
            </div>
            
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl p-6 border border-slate-200/50">
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg w-fit mx-auto mb-4">
                <Eye className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">معاينة مباشرة</h3>
              <p className="text-sm text-muted-foreground">شاهد التغييرات في الوقت الفعلي</p>
            </div>
          </div>
        </div>
        
        {/* Features Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                  <Loader2 className="h-5 w-5 text-indigo-600" />
                </div>
                أنواع الرسوم المتحركة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Badge variant="outline">دوران (Spin)</Badge>
                <Badge variant="outline">نبض (Pulse)</Badge>
                <Badge variant="outline">قفز (Bounce)</Badge>
                <Badge variant="outline">نقاط (Dots)</Badge>
                <Badge variant="outline">شريط تقدم (Progress)</Badge>
                <Badge variant="outline">موجة (Wave)</Badge>
                <Badge variant="outline">تلاشي (Fade)</Badge>
                <Badge variant="outline">تكبير (Scale)</Badge>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <Palette className="h-5 w-5 text-green-600" />
                </div>
                خيارات التخصيص
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>الألوان المخصصة</span>
                  <Badge variant="secondary">متاح</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>تأثيرات الخلفية</span>
                  <Badge variant="secondary">متاح</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>الشعار المخصص</span>
                  <Badge variant="secondary">متاح</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>النصوص المخصصة</span>
                  <Badge variant="secondary">متاح</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <Settings className="h-5 w-5 text-purple-600" />
                </div>
                التحكم المتقدم
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>مدة العرض</span>
                  <Badge variant="outline">1-5 ثانية</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>سرعة الحركة</span>
                  <Badge variant="outline">3 مستويات</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>تأثير الاختفاء</span>
                  <Badge variant="outline">قابل للتخصيص</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>استجابة للأجهزة</span>
                  <Badge variant="outline">تلقائي</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Settings Component */}
      <div className="container mx-auto px-6 pb-12">
        <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg border-0 shadow-2xl">
          <CardHeader className="border-b border-slate-200/50">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                لوحة التحكم المتقدمة
              </CardTitle>
              <Badge variant="default" className="gap-1">
                <Sparkles className="h-3 w-3" />
                Pro Features
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <PreloaderSettings />
          </CardContent>
        </Card>
      </div>

      {/* Quick Tips */}
      <div className="container mx-auto px-6 pb-12">
        <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              نصائح احترافية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-medium text-indigo-900 dark:text-indigo-100">أفضل الممارسات:</h4>
                <ul className="space-y-2 text-sm text-indigo-700 dark:text-indigo-300">
                  <li>• استخدم ألوان متناسقة مع هوية العلامة التجارية</li>
                  <li>• تجنب أوقات العرض الطويلة (1-3 ثواني مثالية)</li>
                  <li>• اختبر المظهر على أحجام شاشة مختلفة</li>
                  <li>• استخدم رسوم متحركة بسيطة ومهدئة</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-medium text-purple-900 dark:text-purple-100">تحسين الأداء:</h4>
                <ul className="space-y-2 text-sm text-purple-700 dark:text-purple-300">
                  <li>• تجنب الصور عالية الدقة في الشعار</li>
                  <li>• استخدم ألوان CSS بدلاً من الصور للخلفيات</li>
                  <li>• قم بتفعيل التحميل التدريجي</li>
                  <li>• اختبر الأداء على الأجهزة البطيئة</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}