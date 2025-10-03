"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, MapPin, Phone, Building, User, Save, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDataProvider } from '@/lib/data-provider';
import { generateUUID } from '@/lib/supabase-services';
import type { Clinic } from '@/lib/types';
import i18n from '@/lib/i18n';
import { useSimpleActivityLogger } from '@/hooks/use-simple-activity-logger';
import { getVisibleAreasForUser, getVisibleLinesForUser } from '@/lib/visibility';
import InteractiveLocationSelector from '@/components/clinics/InteractiveLocationSelector';

// Form validation schema - مبسط
const clinicSchema = z.object({
  name: z.string().min(2, 'اسم العيادة يجب أن يكون على الأقل حرفين'),
  doctorName: z.string().min(2, 'اسم الطبيب يجب أن يكون على الأقل حرفين'),
  address: z.string().min(5, 'العنوان يجب أن يكون على الأقل 5 أحرف'),
  area: z.string().min(1, 'المنطقة مطلوبة'),
  line: z.string().min(1, 'الخط مطلوب'),
  classification: z.enum(['A', 'B', 'C']),
  creditStatus: z.enum(['green', 'yellow', 'red']),
  clinicPhone: z.string().optional(),
  doctorPhone: z.string().optional(),
  creditLimit: z.number().optional(),
  paymentTermsDays: z.number().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

type ClinicFormData = z.infer<typeof clinicSchema>;

export default function SimpleRegisterClinicPage() {
  const t = i18n.t;
  const router = useRouter();
  const { toast } = useToast();
  const { clinics, setClinics, areas, lines, currentUser, users, addClinicDirect, invalidateCache } = useDataProvider();
  const { logClinicRegistration } = useSimpleActivityLogger();
  const [isLoading, setIsLoading] = useState(false);
  // Get current user info for area restrictions
  const currentUserData = users.find(u => u.email === currentUser?.email);
  
  // Available areas and lines based on centralized visibility rules
  const availableAreasRaw = getVisibleAreasForUser(currentUserData || currentUser, Array.isArray(areas) ? areas : (areas ? (Object.values(areas as any) as any[]) : []), clinics);
  const availableAreas = Array.isArray(availableAreasRaw) ? availableAreasRaw : (availableAreasRaw ? (Object.values(availableAreasRaw as any) as any[]) : []);
  const availableLinesRaw = getVisibleLinesForUser(currentUserData || currentUser, Array.isArray(lines) ? lines : (lines ? (Object.values(lines as any) as any[]) : []), clinics);
  const availableLines = Array.isArray(availableLinesRaw) ? availableLinesRaw : (availableLinesRaw ? (Object.values(availableLinesRaw as any) as any[]) : []);

  const form = useForm<ClinicFormData>({
    resolver: zodResolver(clinicSchema),
    defaultValues: {
      name: '',
      doctorName: '',
      address: '',
      area: currentUserData?.role !== 'admin' ? (currentUserData?.area || '') : '',
      line: currentUserData?.role !== 'admin' ? (currentUserData?.line || '') : '',
      classification: 'A',
      creditStatus: 'green',
      clinicPhone: '',
      doctorPhone: '',
      creditLimit: undefined,
      paymentTermsDays: undefined,
      lat: 30.0444, // القاهرة كافتراضي
      lng: 31.2357,
    },
  });

  const onSubmit = async (data: ClinicFormData) => {
    setIsLoading(true);
    try {
      const newClinic: Clinic = {
        id: generateUUID(),
        name: data.name,
        doctorName: data.doctorName,
        address: data.address,
        area: data.area,
        line: data.line,
        classification: data.classification,
        creditStatus: data.creditStatus,
        registeredAt: new Date().toISOString(),
        lat: data.lat || 30.0444,
        lng: data.lng || 31.2357,
        clinicPhone: data.clinicPhone,
        doctorPhone: data.doctorPhone,
        creditLimit: data.creditLimit,
        paymentTermsDays: data.paymentTermsDays,
      };

      // Persist to DB via API (service role) to bypass RLS and avoid disappearing after refresh
      const created = await addClinicDirect({
        name: newClinic.name,
        doctorName: newClinic.doctorName,
        address: newClinic.address,
        lat: newClinic.lat,
        lng: newClinic.lng,
        registeredAt: newClinic.registeredAt,
        clinicPhone: newClinic.clinicPhone,
        doctorPhone: newClinic.doctorPhone,
        area: newClinic.area,
        line: newClinic.line,
        classification: newClinic.classification,
        creditStatus: newClinic.creditStatus,
      });
      // Ensure clinics cache is invalidated so fresh data is fetched
      try { invalidateCache('clinics'); } catch {}

      // تسجيل النشاط مع طلب الموقع
      try {
        await logClinicRegistration({
          id: newClinic.id,
          name: newClinic.name,
          doctorName: newClinic.doctorName,
          address: newClinic.address,
          area: newClinic.area,
          line: newClinic.line
        });
      } catch (e) {
        // غير مهم في حالة الفشل
        console.warn('Failed to log clinic registration:', e);
      }

      toast({
        title: 'نجح التسجيل!',
        description: 'تم تسجيل العيادة بنجاح',
      });

      router.push('/clinics');
    } catch (error) {
      console.error('Error registering clinic:', error);
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'فشل في تسجيل العيادة. يرجى المحاولة مرة أخرى',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          العودة
        </Button>
        
        <div>
          <h1 className="text-3xl font-bold tracking-tight">تسجيل عيادة جديدة</h1>
          <p className="text-muted-foreground">صفحة مبسطة لتسجيل العيادات بسرعة</p>
        </div>

        {currentUserData && currentUserData.role !== 'admin' && currentUserData.area && (
          <Card className="bg-blue-50 border-blue-200 mt-4">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-blue-800">
                <MapPin className="h-4 w-4" />
                <span className="text-sm font-medium">
                  يمكنك تسجيل عيادات في منطقة "{currentUserData.area}" فقط
                  {currentUserData.line && ` - خط "${currentUserData.line}"`}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* بيانات العيادة الأساسية */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              بيانات العيادة الأساسية
            </CardTitle>
            <CardDescription>معلومات العيادة والطبيب</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">اسم العيادة *</Label>
                <Input 
                  id="name" 
                  {...form.register('name')} 
                  placeholder="اكتب اسم العيادة" 
                  className={form.formState.errors.name ? 'border-red-500' : ''} 
                />
                {form.formState.errors.name && (
                  <p className="text-red-500 text-sm">{form.formState.errors.name.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="doctorName">اسم الطبيب *</Label>
                <Input 
                  id="doctorName" 
                  {...form.register('doctorName')} 
                  placeholder="اكتب اسم الطبيب" 
                  className={form.formState.errors.doctorName ? 'border-red-500' : ''} 
                />
                {form.formState.errors.doctorName && (
                  <p className="text-red-500 text-sm">{form.formState.errors.doctorName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">العنوان *</Label>
              <Textarea 
                id="address" 
                {...form.register('address')} 
                placeholder="اكتب عنوان العيادة بالتفصيل" 
                rows={3}
                className={form.formState.errors.address ? 'border-red-500' : ''} 
              />
              {form.formState.errors.address && (
                <p className="text-red-500 text-sm">{form.formState.errors.address.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clinicPhone">هاتف العيادة</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="clinicPhone" 
                    {...form.register('clinicPhone')} 
                    placeholder="رقم هاتف العيادة" 
                    className="pl-10" 
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="doctorPhone">هاتف الطبيب</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="doctorPhone" 
                    {...form.register('doctorPhone')} 
                    placeholder="رقم هاتف الطبيب" 
                    className="pl-10" 
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* المنطقة والخط */}
        <Card>
          <CardHeader>
            <CardTitle>المنطقة والخط</CardTitle>
            <CardDescription>تحديد المنطقة الجغرافية والخط التجاري</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="area">المنطقة *</Label>
                <Select 
                  value={form.watch('area')} 
                  onValueChange={(value) => form.setValue('area', value)}
                  disabled={currentUserData?.role !== 'admin' && !!currentUserData?.area}
                >
                  <SelectTrigger className={form.formState.errors.area ? 'border-red-500' : ''}>
                    <SelectValue placeholder="اختر المنطقة" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAreas.map((area) => (
                      <SelectItem key={area} value={area}>{area}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.area && (
                  <p className="text-red-500 text-sm">{form.formState.errors.area.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="line">الخط *</Label>
                <Select 
                  value={form.watch('line')} 
                  onValueChange={(value) => form.setValue('line', value)}
                  disabled={currentUserData?.role !== 'admin' && !!currentUserData?.line}
                >
                  <SelectTrigger className={form.formState.errors.line ? 'border-red-500' : ''}>
                    <SelectValue placeholder="اختر الخط" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLines.map((line) => (
                      <SelectItem key={line} value={line}>{line}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.line && (
                  <p className="text-red-500 text-sm">{form.formState.errors.line.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* التصنيف والائتمان */}
        <Card>
          <CardHeader>
            <CardTitle>التصنيف والائتمان</CardTitle>
            <CardDescription>تحديد فئة العيادة وسياسة الائتمان</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="classification">التصنيف *</Label>
                <Select 
                  value={form.watch('classification')} 
                  onValueChange={(value: 'A' | 'B' | 'C') => form.setValue('classification', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر التصنيف" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A - ممتاز</SelectItem>
                    <SelectItem value="B">B - جيد</SelectItem>
                    <SelectItem value="C">C - مقبول</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="creditStatus">حالة الائتمان *</Label>
                <Select 
                  value={form.watch('creditStatus')} 
                  onValueChange={(value: 'green' | 'yellow' | 'red') => form.setValue('creditStatus', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر حالة الائتمان" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="green">🟢 أخضر - ممتاز</SelectItem>
                    <SelectItem value="yellow">🟡 أصفر - تحذير</SelectItem>
                    <SelectItem value="red">🔴 أحمر - خطر</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="creditLimit">حد الائتمان (ج.م.)</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  {...form.register('creditLimit', { valueAsNumber: true })} 
                  placeholder="مثال: 50000" 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="paymentTermsDays">شروط السداد (أيام)</Label>
                <Input 
                  type="number" 
                  {...form.register('paymentTermsDays', { valueAsNumber: true })} 
                  placeholder="مثال: 30" 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* الموقع الجغرافي التفاعلي */}
        <InteractiveLocationSelector
          value={{
            lat: form.watch('lat') || 30.0444,
            lng: form.watch('lng') || 31.2357,
            address: form.watch('address'),
            source: 'manual' as const
          }}
          onChange={(location) => {
            form.setValue('lat', location.lat);
            form.setValue('lng', location.lng);
            // تحديث العنوان تلقائياً إذا كان فارغاً أو إذا كان المصدر من البحث/الخريطة
            if (location.address && (
              !form.watch('address') || 
              location.source === 'search' || 
              location.source === 'map_click' ||
              location.source === 'gps'
            )) {
              form.setValue('address', location.address);
            }
          }}
          height="500px"
          showCurrentLocation={true}
          enableMapClick={true}
          className="border-primary/20"
        />

        {/* أزرار الحفظ */}
        <div className="flex items-center justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            إلغاء
          </Button>
          
          <Button
            type="submit"
            disabled={isLoading}
            className="min-w-[120px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                حفظ العيادة
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}