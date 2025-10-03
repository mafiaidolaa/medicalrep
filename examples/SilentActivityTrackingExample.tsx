"use client";

import React, { useState } from 'react';
import { useActivityTracking, usePageActivityTracking } from '@/hooks/use-activity-tracking';
import { useLocationWithNotification } from '@/hooks/use-silent-geolocation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
  MapPin, 
  Briefcase, 
  FileText, 
  CreditCard, 
  DollarSign, 
  Calendar,
  Building2
} from 'lucide-react';

// مثال على صفحة تستخدم تتبع الأنشطة الصامت
export default function SilentActivityTrackingExample() {
  const { toast } = useToast();
  // استخدام Hook الأنشطة الصامتة
  const {
    trackVisit,
    trackOrder,
    trackDebtPayment,
    trackExpenseRequest,
    trackPlan,
    trackClinicRegistration,
    clearLocationCache,
    isLocationSupported
  } = useActivityTracking();

  // تتبع الصفحة (اختياري)
  const { logPageInteraction } = usePageActivityTracking('example-page');

  // للعيادات - نستخدم Hook مع إعلام للمستخدم
  const { 
    data: locationData, 
    isLoading: locationLoading, 
    error: locationError, 
    getCurrentLocation 
  } = useLocationWithNotification();

  const [formData, setFormData] = useState({
    clinicName: '',
    visitDetails: '',
    orderAmount: '',
    debtAmount: '',
    expenseDescription: '',
    expenseAmount: '',
    planTitle: '',
    planDescription: ''
  });

  // دالة لتسجيل زيارة (صامتة تماماً)
  const handleTrackVisit = async () => {
    if (!formData.clinicName) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال اسم العيادة",
        variant: "destructive"
      });
      return;
    }

    try {
      const visitId = `visit-${Date.now()}`;
      
      // تسجيل صامت - لن يرى المستخدم أي رسائل حول الموقع
      await trackVisit(visitId, formData.clinicName, formData.visitDetails);
      
      toast({
        title: "تم بنجاح",
        description: "تم تسجيل الزيارة"
      });

      // تنظيف النموذج
      setFormData(prev => ({ ...prev, clinicName: '', visitDetails: '' }));
      
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في تسجيل الزيارة",
        variant: "destructive"
      });
    }
  };

  // دالة لتسجيل طلبية (صامتة)
  const handleTrackOrder = async () => {
    if (!formData.clinicName || !formData.orderAmount) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال اسم العيادة والمبلغ",
        variant: "destructive"
      });
      return;
    }

    try {
      const orderId = `order-${Date.now()}`;
      const amount = parseFloat(formData.orderAmount);
      
      // تسجيل صامت
      await trackOrder(orderId, formData.clinicName, amount);
      
      toast({
        title: "تم بنجاح",
        description: "تم تسجيل الطلبية"
      });

      setFormData(prev => ({ ...prev, orderAmount: '' }));
      
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في تسجيل الطلبية",
        variant: "destructive"
      });
    }
  };

  // دالة لتسجيل دفع دين (صامتة)
  const handleTrackDebtPayment = async () => {
    if (!formData.clinicName || !formData.debtAmount) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال اسم العيادة والمبلغ",
        variant: "destructive"
      });
      return;
    }

    try {
      const paymentId = `payment-${Date.now()}`;
      const amount = parseFloat(formData.debtAmount);
      
      // تسجيل صامت
      await trackDebtPayment(paymentId, formData.clinicName, amount);
      
      toast({
        title: "تم بنجاح",
        description: "تم تسجيل دفع الدين"
      });

      setFormData(prev => ({ ...prev, debtAmount: '' }));
      
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في تسجيل دفع الدين",
        variant: "destructive"
      });
    }
  };

  // دالة لطلب مصاريف (صامتة)
  const handleTrackExpenseRequest = async () => {
    if (!formData.expenseDescription || !formData.expenseAmount) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال وصف المصروف والمبلغ",
        variant: "destructive"
      });
      return;
    }

    try {
      const expenseId = `expense-${Date.now()}`;
      const amount = parseFloat(formData.expenseAmount);
      
      // تسجيل صامت
      await trackExpenseRequest(expenseId, formData.expenseDescription, amount);
      
      toast({
        title: "تم بنجاح",
        description: "تم تسجيل طلب المصاريف"
      });

      setFormData(prev => ({ ...prev, expenseDescription: '', expenseAmount: '' }));
      
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في تسجيل طلب المصاريف",
        variant: "destructive"
      });
    }
  };

  // دالة لعمل خطة (صامتة)
  const handleTrackPlan = async () => {
    if (!formData.planTitle) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال عنوان الخطة",
        variant: "destructive"
      });
      return;
    }

    try {
      const planId = `plan-${Date.now()}`;
      
      // تسجيل صامت
      await trackPlan(planId, formData.planTitle, formData.planDescription);
      
      toast({
        title: "تم بنجاح",
        description: "تم تسجيل الخطة"
      });

      setFormData(prev => ({ ...prev, planTitle: '', planDescription: '' }));
      
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في تسجيل الخطة",
        variant: "destructive"
      });
    }
  };

  // دالة لتسجيل عيادة (مع إعلام المستخدم عن الموقع)
  const handleTrackClinicRegistration = async () => {
    if (!formData.clinicName) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال اسم العيادة",
        variant: "destructive"
      });
      return;
    }

    try {
      const clinicId = `clinic-${Date.now()}`;
      
      // هنا سيتم إظهار رسائل الموقع للمستخدم (showLocationPrompt = true)
      const location = await trackClinicRegistration(clinicId, formData.clinicName, true);
      
      toast({
        title: "تم بنجاح",
        description: location 
          ? "تم تسجيل العيادة مع الموقع الجغرافي" 
          : "تم تسجيل العيادة"
      });

      setFormData(prev => ({ ...prev, clinicName: '' }));
      
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في تسجيل العيادة",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold">مثال على تتبع الأنشطة الصامت</h1>
        <p className="text-muted-foreground mt-2">
          الأنشطة ستُسجل مع الموقع الجغرافي بصمت (بدون رسائل للمستخدم)
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <MapPin className="h-4 w-4" />
          <span className="text-sm">
            دعم الموقع: {isLocationSupported ? '✅ مدعوم' : '❌ غير مدعوم'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* تسجيل زيارة صامت */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              تسجيل زيارة (صامت)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="اسم العيادة"
              value={formData.clinicName}
              onChange={(e) => setFormData(prev => ({ ...prev, clinicName: e.target.value }))}
            />
            <Input
              placeholder="تفاصيل الزيارة (اختياري)"
              value={formData.visitDetails}
              onChange={(e) => setFormData(prev => ({ ...prev, visitDetails: e.target.value }))}
            />
            <Button onClick={handleTrackVisit} className="w-full">
              تسجيل الزيارة
            </Button>
            <p className="text-xs text-muted-foreground">
              ℹ️ سيتم تسجيل الموقع بصمت تام
            </p>
          </CardContent>
        </Card>

        {/* تسجيل طلبية صامت */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              تسجيل طلبية (صامت)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="اسم العيادة"
              value={formData.clinicName}
              onChange={(e) => setFormData(prev => ({ ...prev, clinicName: e.target.value }))}
            />
            <Input
              type="number"
              placeholder="مبلغ الطلبية"
              value={formData.orderAmount}
              onChange={(e) => setFormData(prev => ({ ...prev, orderAmount: e.target.value }))}
            />
            <Button onClick={handleTrackOrder} className="w-full">
              تسجيل الطلبية
            </Button>
            <p className="text-xs text-muted-foreground">
              ℹ️ سيتم تسجيل الموقع بصمت تام
            </p>
          </CardContent>
        </Card>

        {/* دفع دين صامت */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              دفع دين (صامت)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="اسم العيادة"
              value={formData.clinicName}
              onChange={(e) => setFormData(prev => ({ ...prev, clinicName: e.target.value }))}
            />
            <Input
              type="number"
              placeholder="مبلغ الدين"
              value={formData.debtAmount}
              onChange={(e) => setFormData(prev => ({ ...prev, debtAmount: e.target.value }))}
            />
            <Button onClick={handleTrackDebtPayment} className="w-full">
              تسجيل دفع الدين
            </Button>
            <p className="text-xs text-muted-foreground">
              ℹ️ سيتم تسجيل الموقع بصمت تام
            </p>
          </CardContent>
        </Card>

        {/* طلب مصاريف صامت */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              طلب مصاريف (صامت)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="وصف المصروف"
              value={formData.expenseDescription}
              onChange={(e) => setFormData(prev => ({ ...prev, expenseDescription: e.target.value }))}
            />
            <Input
              type="number"
              placeholder="المبلغ"
              value={formData.expenseAmount}
              onChange={(e) => setFormData(prev => ({ ...prev, expenseAmount: e.target.value }))}
            />
            <Button onClick={handleTrackExpenseRequest} className="w-full">
              طلب المصاريف
            </Button>
            <p className="text-xs text-muted-foreground">
              ℹ️ سيتم تسجيل الموقع بصمت تام
            </p>
          </CardContent>
        </Card>

        {/* عمل خطة صامت */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              عمل خطة (صامت)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="عنوان الخطة"
              value={formData.planTitle}
              onChange={(e) => setFormData(prev => ({ ...prev, planTitle: e.target.value }))}
            />
            <Input
              placeholder="وصف الخطة (اختياري)"
              value={formData.planDescription}
              onChange={(e) => setFormData(prev => ({ ...prev, planDescription: e.target.value }))}
            />
            <Button onClick={handleTrackPlan} className="w-full">
              إنشاء الخطة
            </Button>
            <p className="text-xs text-muted-foreground">
              ℹ️ سيتم تسجيل الموقع بصمت تام
            </p>
          </CardContent>
        </Card>

        {/* تسجيل عيادة (مع إعلام) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              تسجيل عيادة (مع إعلام)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="اسم العيادة الجديدة"
              value={formData.clinicName}
              onChange={(e) => setFormData(prev => ({ ...prev, clinicName: e.target.value }))}
            />
            <Button onClick={handleTrackClinicRegistration} className="w-full">
              تسجيل العيادة
            </Button>
            <p className="text-xs text-muted-foreground">
              ⚠️ سيطلب إذن الموقع من المستخدم
            </p>
            {locationError && (
              <p className="text-xs text-red-600">
                خطأ في الموقع: {locationError}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* أدوات إضافية */}
      <div className="flex justify-center gap-4 pt-6">
        <Button variant="outline" onClick={clearLocationCache}>
          مسح كاش الموقع
        </Button>
        <Button variant="outline" onClick={getCurrentLocation} disabled={locationLoading}>
          {locationLoading ? 'جارِ الحصول على الموقع...' : 'اختبار الموقع'}
        </Button>
      </div>

      {/* معلومات الموقع الحالي (للعيادات فقط) */}
      {locationData && (
        <Card>
          <CardHeader>
            <CardTitle>الموقع الحالي</CardTitle>
          </CardHeader>
          <CardContent>
            <p>خط العرض: {locationData.latitude}</p>
            <p>خط الطول: {locationData.longitude}</p>
            <p>الدقة: {locationData.accuracy} متر</p>
            {locationData.locationName && <p>الموقع: {locationData.locationName}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}