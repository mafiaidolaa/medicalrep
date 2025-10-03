"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelectLocations } from "@/components/ui/multi-select-locations";
import { User, Plus, Mail, Phone, UserCheck, MapPin, Briefcase } from 'lucide-react';
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

interface MultiLocationUserFormProps {
  areas: string[];
  lines: string[];
  onSubmit: (userData: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const MultiLocationUserForm: React.FC<MultiLocationUserFormProps> = ({
  areas,
  lines,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  // Defensive normalization for areas and lines
  const safeAreas = Array.isArray(areas)
    ? (areas.filter(Boolean).map(String) as string[])
    : (areas && typeof areas === 'object')
      ? (Object.values(areas as any).filter(Boolean).map(String) as string[])
      : ([] as string[]);
  const safeLines = Array.isArray(lines)
    ? (lines.filter(Boolean).map(String) as string[])
    : (lines && typeof lines === 'object')
      ? (Object.values(lines as any).filter(Boolean).map(String) as string[])
      : ([] as string[]);
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    email: '',
    password: '',
    role: 'medical_rep',
    primary_phone: '',
    whatsapp_phone: '',
    alt_phone: '',
    locations: [] as string[],
    primaryLocation: '',
    line: '',
    sales_target: '',
    visits_target: '',
    notes: '',
    is_active: true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'الاسم الكامل مطلوب';
    }

    if (!formData.username.trim()) {
      newErrors.username = 'اسم المستخدم مطلوب';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'البريد الإلكتروني مطلوب';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'البريد الإلكتروني غير صحيح';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'كلمة المرور مطلوبة';
    } else if (formData.password.length < 6) {
      newErrors.password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
    }

    if (formData.role !== 'admin' && formData.locations.length === 0) {
      newErrors.locations = 'يجب تحديد موقع واحد على الأقل';
    }

    if (!formData.line && formData.role === 'medical_rep') {
      newErrors.line = 'الخط مطلوب للمندوبين';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const userData = {
      ...formData,
      sales_target: formData.sales_target ? parseInt(formData.sales_target) : null,
      visits_target: formData.visits_target ? parseInt(formData.visits_target) : null,
      id: crypto.randomUUID()
    };

    onSubmit(userData);
  };

  const handleLocationChange = (locations: string[]) => {
    setFormData(prev => ({
      ...prev,
      locations,
      primaryLocation: prev.primaryLocation || locations[0] || ''
    }));
  };

  const handlePrimaryLocationChange = (primaryLocation: string) => {
    setFormData(prev => ({
      ...prev,
      primaryLocation
    }));
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-blue-800">
            <UserCheck className="w-6 h-6" />
            إضافة مستخدم جديد
          </CardTitle>
        </CardHeader>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="w-5 h-5" />
              المعلومات الأساسية
            </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">الاسم الكامل *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="الاسم الأول والأخير"
                className={errors.full_name ? "border-red-500" : ""}
              />
              {errors.full_name && (
                <p className="text-sm text-red-600">{errors.full_name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">اسم المستخدم *</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="اسم المستخدم للدخول"
                className={errors.username ? "border-red-500" : ""}
              />
              {errors.username && (
                <p className="text-sm text-red-600">{errors.username}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                البريد الإلكتروني *
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="example@company.com"
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="كلمة المرور (6 أحرف على الأقل)"
                className={errors.password ? "border-red-500" : ""}
              />
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                الدور الوظيفي
              </Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="medical_rep">مندوب طبي</SelectItem>
                  <SelectItem value="manager">مدير</SelectItem>
                  <SelectItem value="admin">مسؤول نظام</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 space-x-reverse">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label htmlFor="is_active">حساب نشط</Label>
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
          <CardContent className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primary_phone">الهاتف الأساسي</Label>
              <Input
                id="primary_phone"
                value={formData.primary_phone}
                onChange={(e) => setFormData(prev => ({ ...prev, primary_phone: e.target.value }))}
                placeholder="01234567890"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp_phone">واتساب</Label>
              <Input
                id="whatsapp_phone"
                value={formData.whatsapp_phone}
                onChange={(e) => setFormData(prev => ({ ...prev, whatsapp_phone: e.target.value }))}
                placeholder="01234567890"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="alt_phone">هاتف بديل</Label>
              <Input
                id="alt_phone"
                value={formData.alt_phone}
                onChange={(e) => setFormData(prev => ({ ...prev, alt_phone: e.target.value }))}
                placeholder="01234567890"
              />
            </div>
          </CardContent>
        </Card>

        {/* Location Information */}
        {formData.role !== 'admin' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="w-5 h-5" />
                مناطق العمل
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <MultiSelectLocations
                locations={safeAreas}
                selectedLocations={formData.locations}
                primaryLocation={formData.primaryLocation}
                onSelectionChange={handleLocationChange}
                onPrimaryChange={handlePrimaryLocationChange}
                label="المناطق المطلوبة *"
                placeholder="اختر المناطق التي يعمل بها هذا المستخدم"
                required
                showPrimary
                className={errors.locations ? "border-red-500" : ""}
              />
              {errors.locations && (
                <p className="text-sm text-red-600">{errors.locations}</p>
              )}

              {formData.role === 'medical_rep' && (
                <div className="space-y-2">
                  <Label htmlFor="line">الخط *</Label>
                  <Select
                    value={formData.line}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, line: value }))}
                  >
                    <SelectTrigger className={errors.line ? "border-red-500" : ""}>
                      <SelectValue placeholder="اختر الخط" />
                    </SelectTrigger>
                    <SelectContent>
                      {safeLines.map(line => (
                        <SelectItem key={line} value={line}>{line}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.line && (
                    <p className="text-sm text-red-600">{errors.line}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Targets (for medical reps) */}
        {formData.role === 'medical_rep' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                🎯 الأهداف الشهرية
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sales_target">هدف المبيعات (بالجنيه)</Label>
                <Input
                  id="sales_target"
                  type="number"
                  value={formData.sales_target}
                  onChange={(e) => setFormData(prev => ({ ...prev, sales_target: e.target.value }))}
                  placeholder="50000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="visits_target">هدف الزيارات</Label>
                <Input
                  id="visits_target"
                  type="number"
                  value={formData.visits_target}
                  onChange={(e) => setFormData(prev => ({ ...prev, visits_target: e.target.value }))}
                  placeholder="100"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Additional Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">📝 ملاحظات إضافية</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="أي ملاحظات أو معلومات إضافية..."
              rows={3}
            />
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
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                جاري الإضافة...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                إضافة المستخدم
              </div>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};