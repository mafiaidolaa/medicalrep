"use client";

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useSiteSettings } from '@/contexts/site-settings-context';
import { AdvancedPreloader, PreloaderAnimationType } from '@/components/advanced-preloader';
import { Eye, Save, RotateCcw, Palette, Settings, Image, Type, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const animationTypes: { value: PreloaderAnimationType; label: string; description: string }[] = [
  { value: 'spin', label: 'دوران', description: 'أيقونة دوارة كلاسيكية' },
  { value: 'pulse', label: 'نبض', description: 'تأثير نبض متكرر' },
  { value: 'bounce', label: 'قفز', description: 'كرات قافزة' },
  { value: 'dots', label: 'نقاط', description: 'نقاط متحركة' },
  { value: 'progress', label: 'شريط تقدم', description: 'شريط تحميل متحرك' },
  { value: 'wave', label: 'موجة', description: 'تأثير موجة صاعدة' },
  { value: 'fade', label: 'تلاشي', description: 'تأثير اختفاء وظهور' },
  { value: 'scale', label: 'تكبير', description: 'تأثير تكبير وتصغير' }
];

const animationSpeeds = [
  { value: 'slow', label: 'بطيء' },
  { value: 'normal', label: 'عادي' },
  { value: 'fast', label: 'سريع' }
];

export function PreloaderSettings() {
  const { settings, updateSettings, loading } = useSiteSettings();
  const [previewMode, setPreviewMode] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Local state for form
  const [formData, setFormData] = useState({
    preloader_enabled: settings?.preloader_enabled ?? true,
    preloader_logo_size: settings?.preloader_logo_size ?? 80,
    preloader_show_logo: settings?.preloader_show_logo ?? true,
    preloader_logo_animation: settings?.preloader_logo_animation ?? true,
    preloader_loading_message: settings?.preloader_loading_message ?? 'جاري التحميل...',
    preloader_show_app_name: settings?.preloader_show_app_name ?? true,
    preloader_custom_subtitle: settings?.preloader_custom_subtitle ?? '',
    preloader_animation_type: settings?.preloader_animation_type ?? 'spin',
    preloader_animation_speed: settings?.preloader_animation_speed ?? 'normal',
    preloader_animation_color: settings?.preloader_animation_color ?? '#0066cc',
    preloader_background_color: settings?.preloader_background_color ?? '',
    preloader_text_color: settings?.preloader_text_color ?? '',
    preloader_blur_background: settings?.preloader_blur_background ?? false,
    preloader_show_progress: settings?.preloader_show_progress ?? false,
    preloader_min_display_time: settings?.preloader_min_display_time ?? 1000,
    preloader_fade_out_duration: settings?.preloader_fade_out_duration ?? 300,
  });

  // Update form when settings change
  useEffect(() => {
    if (settings) {
      setFormData({
        preloader_enabled: settings.preloader_enabled ?? true,
        preloader_logo_size: settings.preloader_logo_size ?? 80,
        preloader_show_logo: settings.preloader_show_logo ?? true,
        preloader_logo_animation: settings.preloader_logo_animation ?? true,
        preloader_loading_message: settings.preloader_loading_message ?? 'جاري التحميل...',
        preloader_show_app_name: settings.preloader_show_app_name ?? true,
        preloader_custom_subtitle: settings.preloader_custom_subtitle ?? '',
        preloader_animation_type: settings.preloader_animation_type ?? 'spin',
        preloader_animation_speed: settings.preloader_animation_speed ?? 'normal',
        preloader_animation_color: settings.preloader_animation_color ?? '#0066cc',
        preloader_background_color: settings.preloader_background_color ?? '',
        preloader_text_color: settings.preloader_text_color ?? '',
        preloader_blur_background: settings.preloader_blur_background ?? false,
        preloader_show_progress: settings.preloader_show_progress ?? false,
        preloader_min_display_time: settings.preloader_min_display_time ?? 1000,
        preloader_fade_out_duration: settings.preloader_fade_out_duration ?? 300,
      });
    }
  }, [settings]);

  // Check for changes
  useEffect(() => {
    const hasChanges = settings && Object.entries(formData).some(([key, value]) => {
      return (settings as any)[key] !== value;
    });
    setHasChanges(!!hasChanges);
  }, [formData, settings]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      await updateSettings(formData);
      setHasChanges(false);
      toast.success('تم حفظ إعدادات Preloader بنجاح!');
    } catch (error) {
      console.error('Error saving preloader settings:', error);
      toast.error('فشل في حفظ الإعدادات');
    }
  };

  const handleReset = () => {
    if (settings) {
      setFormData({
        preloader_enabled: settings.preloader_enabled ?? true,
        preloader_logo_size: settings.preloader_logo_size ?? 80,
        preloader_show_logo: settings.preloader_show_logo ?? true,
        preloader_logo_animation: settings.preloader_logo_animation ?? true,
        preloader_loading_message: settings.preloader_loading_message ?? 'جاري التحميل...',
        preloader_show_app_name: settings.preloader_show_app_name ?? true,
        preloader_custom_subtitle: settings.preloader_custom_subtitle ?? '',
        preloader_animation_type: settings.preloader_animation_type ?? 'spin',
        preloader_animation_speed: settings.preloader_animation_speed ?? 'normal',
        preloader_animation_color: settings.preloader_animation_color ?? '#0066cc',
        preloader_background_color: settings.preloader_background_color ?? '',
        preloader_text_color: settings.preloader_text_color ?? '',
        preloader_blur_background: settings.preloader_blur_background ?? false,
        preloader_show_progress: settings.preloader_show_progress ?? false,
        preloader_min_display_time: settings.preloader_min_display_time ?? 1000,
        preloader_fade_out_duration: settings.preloader_fade_out_duration ?? 300,
      });
      setHasChanges(false);
    }
  };

  const togglePreview = () => {
    setPreviewMode(!previewMode);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">إعدادات Preloader</h2>
          <p className="text-muted-foreground">تخصيص شاشة التحميل الأولية للتطبيق</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={togglePreview}
            className="gap-2"
          >
            <Eye className="h-4 w-4" />
            {previewMode ? 'إخفاء المعاينة' : 'معاينة'}
          </Button>
          {hasChanges && (
            <>
              <Button
                variant="outline"
                onClick={handleReset}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                إعادة تعيين
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                حفظ التغييرات
              </Button>
            </>
          )}
        </div>
      </div>

      {hasChanges && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            يوجد تغييرات لم يتم حفظها. تأكد من حفظ التغييرات قبل مغادرة الصفحة.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings Panel */}
        <div className="space-y-6">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                الإعدادات العامة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>تفعيل Preloader</Label>
                  <p className="text-sm text-muted-foreground">عرض شاشة التحميل عند بدء التطبيق</p>
                </div>
                <Switch
                  checked={formData.preloader_enabled}
                  onCheckedChange={(checked) => handleInputChange('preloader_enabled', checked)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>وقت العرض الأدنى (مللي ثانية)</Label>
                <Input
                  type="number"
                  min="0"
                  max="5000"
                  step="100"
                  value={formData.preloader_min_display_time}
                  onChange={(e) => handleInputChange('preloader_min_display_time', parseInt(e.target.value))}
                />
              </div>
              
              <div className="space-y-2">
                <Label>مدة الاختفاء التدريجي (مللي ثانية)</Label>
                <Input
                  type="number"
                  min="0"
                  max="2000"
                  step="50"
                  value={formData.preloader_fade_out_duration}
                  onChange={(e) => handleInputChange('preloader_fade_out_duration', parseInt(e.target.value))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Logo Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                إعدادات الشعار
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>عرض الشعار</Label>
                  <p className="text-sm text-muted-foreground">إظهار شعار النظام</p>
                </div>
                <Switch
                  checked={formData.preloader_show_logo}
                  onCheckedChange={(checked) => handleInputChange('preloader_show_logo', checked)}
                />
              </div>
              
              {formData.preloader_show_logo && (
                <>
                  <div className="space-y-2">
                    <Label>حجم الشعار (بالبيكسل)</Label>
                    <Input
                      type="number"
                      min="32"
                      max="200"
                      value={formData.preloader_logo_size}
                      onChange={(e) => handleInputChange('preloader_logo_size', parseInt(e.target.value))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>تحريك الشعار</Label>
                      <p className="text-sm text-muted-foreground">إضافة تأثير حركي للشعار</p>
                    </div>
                    <Switch
                      checked={formData.preloader_logo_animation}
                      onCheckedChange={(checked) => handleInputChange('preloader_logo_animation', checked)}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Text Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5" />
                إعدادات النصوص
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>عرض اسم التطبيق</Label>
                  <p className="text-sm text-muted-foreground">إظهار عنوان النظام</p>
                </div>
                <Switch
                  checked={formData.preloader_show_app_name}
                  onCheckedChange={(checked) => handleInputChange('preloader_show_app_name', checked)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>رسالة التحميل</Label>
                <Input
                  value={formData.preloader_loading_message}
                  onChange={(e) => handleInputChange('preloader_loading_message', e.target.value)}
                  placeholder="جاري التحميل..."
                />
              </div>
              
              <div className="space-y-2">
                <Label>العنوان الفرعي المخصص</Label>
                <Textarea
                  value={formData.preloader_custom_subtitle}
                  onChange={(e) => handleInputChange('preloader_custom_subtitle', e.target.value)}
                  placeholder="عنوان فرعي اختياري..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Animation & Design Settings */}
        <div className="space-y-6">
          {/* Animation Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                إعدادات الحركة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>نوع الأنيميشن</Label>
                <Select
                  value={formData.preloader_animation_type}
                  onValueChange={(value) => handleInputChange('preloader_animation_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {animationTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex flex-col">
                          <span>{type.label}</span>
                          <span className="text-xs text-muted-foreground">{type.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>سرعة الأنيميشن</Label>
                <Select
                  value={formData.preloader_animation_speed}
                  onValueChange={(value) => handleInputChange('preloader_animation_speed', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {animationSpeeds.map((speed) => (
                      <SelectItem key={speed.value} value={speed.value}>
                        {speed.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>لون الأنيميشن</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={formData.preloader_animation_color}
                    onChange={(e) => handleInputChange('preloader_animation_color', e.target.value)}
                    className="w-20"
                  />
                  <Input
                    value={formData.preloader_animation_color}
                    onChange={(e) => handleInputChange('preloader_animation_color', e.target.value)}
                    placeholder="#0066cc"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>عرض شريط التقدم</Label>
                  <p className="text-sm text-muted-foreground">إظهار نسبة مئوية للتقدم</p>
                </div>
                <Switch
                  checked={formData.preloader_show_progress}
                  onCheckedChange={(checked) => handleInputChange('preloader_show_progress', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Design Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                إعدادات التصميم
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>لون الخلفية</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={formData.preloader_background_color || '#ffffff'}
                    onChange={(e) => handleInputChange('preloader_background_color', e.target.value)}
                    className="w-20"
                  />
                  <Input
                    value={formData.preloader_background_color}
                    onChange={(e) => handleInputChange('preloader_background_color', e.target.value)}
                    placeholder="افتراضي (حسب الثيم)"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>لون النص</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={formData.preloader_text_color || '#000000'}
                    onChange={(e) => handleInputChange('preloader_text_color', e.target.value)}
                    className="w-20"
                  />
                  <Input
                    value={formData.preloader_text_color}
                    onChange={(e) => handleInputChange('preloader_text_color', e.target.value)}
                    placeholder="افتراضي (حسب الثيم)"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>ضبابية الخلفية</Label>
                  <p className="text-sm text-muted-foreground">إضافة تأثير ضبابي للخلفية</p>
                </div>
                <Switch
                  checked={formData.preloader_blur_background}
                  onCheckedChange={(checked) => handleInputChange('preloader_blur_background', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Tips Card */}
          <Card>
            <CardHeader>
              <CardTitle>نصائح مفيدة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p>• استخدم الألوان المتناسقة مع هوية العلامة التجارية</p>
                <p>• تجنب أوقات التحميل الطويلة لتجربة مستخدم أفضل</p>
                <p>• يمكن ترك الألوان فارغة لاستخدام ألوان الثيم الافتراضية</p>
                <p>• استخدم المعاينة لرؤية التغييرات قبل الحفظ</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Preview Modal */}
      {previewMode && (
        <AdvancedPreloader
          isVisible={true}
          settings={{
            logo_url: settings?.loading_icon_path || settings?.logo_path || settings?.icon_path,
            logo_size: formData.preloader_logo_size,
            show_logo: formData.preloader_show_logo,
            logo_animation: formData.preloader_logo_animation,
            loading_message: formData.preloader_loading_message,
            show_app_name: formData.preloader_show_app_name,
            custom_subtitle: formData.preloader_custom_subtitle,
            animation_type: formData.preloader_animation_type as PreloaderAnimationType,
            animation_speed: formData.preloader_animation_speed as 'slow' | 'normal' | 'fast',
            animation_color: formData.preloader_animation_color,
            background_color: formData.preloader_background_color,
            text_color: formData.preloader_text_color,
            blur_background: formData.preloader_blur_background,
            show_progress: formData.preloader_show_progress,
            min_display_time: formData.preloader_min_display_time,
            fade_out_duration: formData.preloader_fade_out_duration,
          }}
          className="cursor-pointer"
          onComplete={() => setPreviewMode(false)}
        />
      )}
    </div>
  );
}