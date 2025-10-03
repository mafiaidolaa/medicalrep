"use client";

// ================================================
// 🏥 مثال عملي: نموذج إضافة عيادة بالنظام الجديد
// ================================================

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelectLocations } from "@/components/ui/multi-select-locations";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, MapPin, Phone, User, Stethoscope } from 'lucide-react';

interface UpdatedClinicFormExampleProps {
  onSubmit: (clinicData: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const UpdatedClinicFormExample: React.FC<UpdatedClinicFormExampleProps> = ({
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  // بيانات المناطق المتاحة
  const areas = ["القاهرة", "الإسكندرية", "الجيزة", "المنيا", "أسيوط", "سوهاج"];
  const lines = ["خط 1", "خط 2", "خط 3", "خط 4"];

  // Defensive normalization to avoid runtime errors if values change type in the future
  const safeAreas = Array.isArray(areas) ? areas.filter(Boolean).map(String) : [];
  const safeLines = Array.isArray(lines) ? lines.filter(Boolean).map(String) : [];

  const [formData, setFormData] = useState({
    name: '',
    doctor_name: '',
    address: '',
    clinic_phone: '',
    doctor_phone: '',
    locations: [] as string[], // 🌍 المواقع المتعددة الجديدة
    primaryLocation: '', // 👑 الموقع الرئيسي
    line: '',
    classification: 'B',
    credit_status: 'green',
    notes: ''
  });

  const handleLocationChange = (newLocations: string[]) => {
    setFormData(prev => ({
      ...prev,
      locations: newLocations,
      // إذا لم يكن هناك موقع رئيسي، اجعل الأول رئيسي
      primaryLocation: prev.primaryLocation || newLocations[0] || ''
    }));
  };

  const handlePrimaryLocationChange = (newPrimary: string) => {
    setFormData(prev => ({
      ...prev,
      primaryLocation: newPrimary,
      // تأكد من أن الموقع الرئيسي موجود في المواقع المختارة
      locations: prev.locations.includes(newPrimary) 
        ? prev.locations 
        : [...prev.locations, newPrimary]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // تحضير البيانات للإرسال
    const clinicData = {
      ...formData,
      // للتوافق مع الـ API الجديد
      area: formData.primaryLocation, // للتوافق مع النظام القديم
      id: crypto.randomUUID()
    };

    onSubmit(clinicData);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-green-800">
            <Building2 className="w-6 h-6" />
            إضافة عيادة جديدة - نظام المواقع المتعددة
          </CardTitle>
          <div className="text-sm text-green-600">
            🌟 الآن يمكن للعيادة الواحدة خدمة مناطق متعددة!
          </div>
        </CardHeader>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="w-5 h-5" />
              المعلومات الأساسية
            </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">اسم العيادة *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="عيادة د. أحمد للأسنان"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="doctor_name" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                اسم الطبيب *
              </Label>
              <Input
                id="doctor_name"
                value={formData.doctor_name}
                onChange={(e) => setFormData(prev => ({ ...prev, doctor_name: e.target.value }))}
                placeholder="د. أحمد محمد علي"
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">العنوان</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="شارع الجمهورية، وسط البلد"
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Phone className="w-5 h-5" />
              معلومات الاتصال
            </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clinic_phone">هاتف العيادة</Label>
              <Input
                id="clinic_phone"
                value={formData.clinic_phone}
                onChange={(e) => setFormData(prev => ({ ...prev, clinic_phone: e.target.value }))}
                placeholder="02-12345678"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="doctor_phone">هاتف الطبيب</Label>
              <Input
                id="doctor_phone"
                value={formData.doctor_phone}
                onChange={(e) => setFormData(prev => ({ ...prev, doctor_phone: e.target.value }))}
                placeholder="01234567890"
              />
            </div>
          </CardContent>
        </Card>

        {/* 🌍 NEW: Multi-Location Section */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-blue-800">
              <MapPin className="w-5 h-5" />
              المواقع والتغطية الجغرافية
            </CardTitle>
            <div className="text-sm text-blue-600">
              ✨ اختر جميع المناطق التي تخدمها هذه العيادة
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 🎯 Multi-Select Locations Component */}
            <MultiSelectLocations
              locations={safeAreas}
              selectedLocations={formData.locations}
              primaryLocation={formData.primaryLocation}
              onSelectionChange={handleLocationChange}
              onPrimaryChange={handlePrimaryLocationChange}
              label="المناطق المخدومة *"
              placeholder="اختر المناطق التي تغطيها هذه العيادة (يمكن اختيار أكثر من منطقة)"
              required
              showPrimary
              className="w-full"
            />

            {/* Line Selection */}
            <div className="space-y-2">
              <Label htmlFor="line" className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4" />
                الخط *
              </Label>
              <Select
                value={formData.line}
                onValueChange={(value) => setFormData(prev => ({ ...prev, line: value }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الخط" />
                </SelectTrigger>
                <SelectContent>
                  {safeLines.map(line => (
                    <SelectItem key={line} value={line}>{line}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Info Box for Multi-Location */}
            {formData.locations.length > 1 && (
              <div className="bg-blue-100 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="text-blue-600 mt-0.5">🌟</div>
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">عيادة متعددة المواقع</p>
                    <p>
                      تم تحديد <strong>{formData.locations.length} مواقع</strong> لهذه العيادة.
                      الموقع الرئيسي: <strong>{formData.primaryLocation}</strong>
                    </p>
                    <p className="mt-2 text-xs">
                      💡 سيتم عرض هذه العيادة في تقارير جميع المناطق المحددة
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Classification & Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">التصنيف والحالة</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="classification">التصنيف</Label>
              <Select
                value={formData.classification}
                onValueChange={(value) => setFormData(prev => ({ ...prev, classification: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">A - ممتاز</SelectItem>
                  <SelectItem value="B">B - جيد</SelectItem>
                  <SelectItem value="C">C - متوسط</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="credit_status">الحالة الائتمانية</Label>
              <Select
                value={formData.credit_status}
                onValueChange={(value) => setFormData(prev => ({ ...prev, credit_status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="green">🟢 أخضر</SelectItem>
                  <SelectItem value="yellow">🟡 أصفر</SelectItem>
                  <SelectItem value="red">🔴 أحمر</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            disabled={isLoading || formData.locations.length === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                جاري الإضافة...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                إضافة العيادة
              </div>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};