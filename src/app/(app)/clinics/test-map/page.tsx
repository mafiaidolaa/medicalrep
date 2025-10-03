"use client";

import React, { useState } from 'react';
import InteractiveLocationSelector from '@/components/clinics/InteractiveLocationSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TestTube } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface LocationData {
  lat: number;
  lng: number;
  address?: string;
  accuracy?: number;
  source?: 'gps' | 'manual' | 'search' | 'map_click';
}

export default function TestMapPage() {
  const router = useRouter();
  const [selectedLocation, setSelectedLocation] = useState<LocationData>({
    lat: 30.0444,
    lng: 31.2357,
    address: 'القاهرة، مصر',
    source: 'manual'
  });

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          العودة
        </Button>
        
        <div className="flex items-center gap-3 mb-4">
          <TestTube className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">اختبار الخريطة التفاعلية</h1>
            <p className="text-muted-foreground">اختبار مكون تحديد الموقع مع الخريطة والبحث</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* مكون الخريطة التفاعلية */}
        <div className="lg:col-span-2">
          <InteractiveLocationSelector
            value={selectedLocation}
            onChange={setSelectedLocation}
            height="600px"
            showCurrentLocation={true}
            enableMapClick={true}
            className="h-full"
          />
        </div>

        {/* معلومات الموقع المحدد */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>معلومات الموقع المحدد</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">خط العرض</label>
                <p className="font-mono text-lg">{selectedLocation.lat.toFixed(6)}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">خط الطول</label>
                <p className="font-mono text-lg">{selectedLocation.lng.toFixed(6)}</p>
              </div>
              
              {selectedLocation.address && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">العنوان</label>
                  <p className="text-sm break-words">{selectedLocation.address}</p>
                </div>
              )}
              
              {selectedLocation.source && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">مصدر التحديد</label>
                  <p className="text-sm capitalize">
                    {selectedLocation.source === 'gps' && '📍 GPS'}
                    {selectedLocation.source === 'search' && '🔍 البحث'}
                    {selectedLocation.source === 'manual' && '✏️ يدوي'}
                    {selectedLocation.source === 'map_click' && '🗺️ نقرة خريطة'}
                  </p>
                </div>
              )}
              
              {selectedLocation.accuracy && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">دقة الموقع</label>
                  <p className="text-sm">±{Math.round(selectedLocation.accuracy)} متر</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* خيارات الاختبار */}
          <Card>
            <CardHeader>
              <CardTitle>خيارات الاختبار</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSelectedLocation({
                    lat: 24.7136,
                    lng: 46.6753,
                    address: 'الرياض، المملكة العربية السعودية',
                    source: 'manual'
                  });
                }}
              >
                اختبار الرياض
              </Button>
              
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSelectedLocation({
                    lat: 25.2048,
                    lng: 55.2708,
                    address: 'دبي، الإمارات العربية المتحدة',
                    source: 'manual'
                  });
                }}
              >
                اختبار دبي
              </Button>
              
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSelectedLocation({
                    lat: 30.0444,
                    lng: 31.2357,
                    address: 'القاهرة، مصر',
                    source: 'manual'
                  });
                }}
              >
                اختبار القاهرة
              </Button>

              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  console.log('Selected Location:', selectedLocation);
                  alert('تم حفظ بيانات الموقع في وحدة التحكم (Console)');
                }}
              >
                عرض البيانات في Console
              </Button>
            </CardContent>
          </Card>

          {/* نصائح الاختبار */}
          <Card>
            <CardHeader>
              <CardTitle>نصائح الاختبار</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-xs space-y-1 text-muted-foreground">
                <li>• جرب البحث بكتابة أسماء مدن أو معالم</li>
                <li>• انقر على الخريطة لتحديد موقع دقيق</li>
                <li>• اسحب العلامة الحمراء لتعديل الموقع</li>
                <li>• استخدم "تحديد موقعي الحالي" لتجربة GPS</li>
                <li>• جرب أنواع الخرائط المختلفة (عادي، قمر صناعي)</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}