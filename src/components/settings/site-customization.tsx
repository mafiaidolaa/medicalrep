"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  Image as ImageIcon, 
  Globe, 
  Palette, 
  Save, 
  RefreshCw,
  Eye,
  FileImage,
  Settings2,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface SiteSettings {
  id: number;
  site_title: string;
  site_description: string;
  logo_path: string;
  favicon_path: string;
  loading_icon_path: string;
  primary_color: string;
  secondary_color: string;
  meta_keywords: string;
  meta_author: string;
  company_phone: string;
  company_email: string;
  company_address: string;
  company_website: string;
  system_language: string;
  rtl_support: boolean;
  // Print settings
  print_show_branding?: boolean;
  print_paper_size?: 'A4' | 'Letter';
  print_margin_mm?: number;
  print_review_style?: 'compact' | 'detailed';
  print_margin_top_mm?: number;
  print_margin_right_mm?: number;
  print_margin_bottom_mm?: number;
  print_margin_left_mm?: number;
  print_custom_header_text?: string;
  print_show_page_numbers?: boolean;
  print_watermark_text?: string;
  print_watermark_opacity?: number;
}

export function SiteCustomization() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  
  const logoFileRef = useRef<HTMLInputElement>(null);
  const faviconFileRef = useRef<HTMLInputElement>(null);
  const loadingIconFileRef = useRef<HTMLInputElement>(null);

  // Fetch current settings
  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/site-settings');
      const result = await response.json();
      
      if (result.success) {
        setSettings(result.data);
      } else {
        toast.error('فشل في جلب إعدادات الموقع');
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('حدث خطأ في جلب الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Handle file upload
  const handleFileUpload = async (file: File, uploadType: string) => {
    setUploading(uploadType);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('uploadType', uploadType);

      const response = await fetch('/api/site-settings', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        // Update the corresponding path in settings
        // Don't call setSettings here to prevent infinite loop
        // Just update the preview locally
        const fieldName = `${uploadType}_path` as keyof SiteSettings;
        setSettings(prev => prev ? {
          ...prev,
          [fieldName]: result.filePath
        } : null);
        
        toast.success('تم رفع الملف بنجاح - سيتم تطبيقه عند الحفظ');
      } else {
        toast.error(result.error || 'فشل في رفع الملف');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('حدث خطأ في رفع الملف');
    } finally {
      setUploading(null);
    }
  };

  // Handle settings update
  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const response = await fetch('/api/site-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('تم حفظ الإعدادات بنجاح');
        // Refresh the page to apply changes
        window.location.reload();
      } else {
        toast.error(result.error || 'فشل في حفظ الإعدادات');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('حدث خطأ في حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  // Handle input changes
  const handleInputChange = (field: keyof SiteSettings, value: any) => {
    setSettings(prev => prev ? { ...prev, [field]: value } : null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin ml-2" />
        <span>جاري تحميل الإعدادات...</span>
      </div>
    );
  }

  if (!settings) {
    return (
      <Alert>
        <AlertDescription>
          فشل في تحميل إعدادات الموقع
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Settings2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">تخصيص الموقع</h2>
            <p className="text-muted-foreground">إدارة شعار الموقع وعنوان الصفحة والأيقونات</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin ml-2" />
              جاري الحفظ...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 ml-2" />
              حفظ الإعدادات
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Site Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              معلومات الموقع الأساسية
            </CardTitle>
            <CardDescription>
              إعدادات عنوان الموقع والوصف
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="site-title">عنوان الموقع</Label>
              <Input
                id="site-title"
                value={settings.site_title}
                onChange={(e) => handleInputChange('site_title', e.target.value)}
                placeholder="اسم موقعك"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="site-description">وصف الموقع</Label>
              <Textarea
                id="site-description"
                value={settings.site_description}
                onChange={(e) => handleInputChange('site_description', e.target.value)}
                placeholder="وصف قصير عن موقعك"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meta-keywords">الكلمات المفتاحية</Label>
              <Input
                id="meta-keywords"
                value={settings.meta_keywords}
                onChange={(e) => handleInputChange('meta_keywords', e.target.value)}
                placeholder="كلمات مفتاحية مفصولة بفواصل"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meta-author">المؤلف</Label>
              <Input
                id="meta-author"
                value={settings.meta_author}
                onChange={(e) => handleInputChange('meta_author', e.target.value)}
                placeholder="اسم المؤلف أو الشركة"
              />
            </div>
          </CardContent>
        </Card>

        {/* Logo Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              إدارة الشعار والأيقونات
            </CardTitle>
            <CardDescription>
              رفع وإدارة شعار الموقع والأيقونات
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Logo Upload */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <FileImage className="w-4 h-4" />
                شعار الموقع
              </Label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                  {settings.logo_path ? (
                    <img 
                      src={settings.logo_path} 
                      alt="Logo" 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <Button
                    variant="outline"
                    onClick={() => logoFileRef.current?.click()}
                    disabled={uploading === 'logo'}
                  >
                    {uploading === 'logo' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin ml-2" />
                        جاري الرفع...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 ml-2" />
                        رفع شعار جديد
                      </>
                    )}
                  </Button>
                  <p className="text-sm text-muted-foreground mt-1">
                    PNG, JPG, SVG - أقصى حجم 5MB
                  </p>
                </div>
              </div>
              <input
                type="file"
                ref={logoFileRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'logo');
                }}
                accept="image/*"
                className="hidden"
              />
            </div>

            <Separator />

            {/* Favicon Upload */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                أيقونة الموقع (Favicon)
              </Label>
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-muted rounded flex items-center justify-center overflow-hidden">
                  {settings.favicon_path ? (
                    <img 
                      src={settings.favicon_path} 
                      alt="Favicon" 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Globe className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <Button
                    variant="outline"
                    onClick={() => faviconFileRef.current?.click()}
                    disabled={uploading === 'favicon'}
                  >
                    {uploading === 'favicon' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin ml-2" />
                        جاري الرفع...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 ml-2" />
                        رفع أيقونة جديدة
                      </>
                    )}
                  </Button>
                  <p className="text-sm text-muted-foreground mt-1">
                    ICO, PNG - حجم مُوصى به 32x32
                  </p>
                </div>
              </div>
              <input
                type="file"
                ref={faviconFileRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'favicon');
                }}
                accept="image/*,.ico"
                className="hidden"
              />
            </div>

            <Separator />

            {/* Loading Icon Upload */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                أيقونة التحميل
              </Label>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                  {settings.loading_icon_path ? (
                    <img 
                      src={settings.loading_icon_path} 
                      alt="Loading Icon" 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <RefreshCw className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <Button
                    variant="outline"
                    onClick={() => loadingIconFileRef.current?.click()}
                    disabled={uploading === 'loading_icon'}
                  >
                    {uploading === 'loading_icon' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin ml-2" />
                        جاري الرفع...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 ml-2" />
                        رفع أيقونة جديدة
                      </>
                    )}
                  </Button>
                  <p className="text-sm text-muted-foreground mt-1">
                    PNG, JPG, SVG - أقصى حجم 2MB
                  </p>
                </div>
              </div>
              <input
                type="file"
                ref={loadingIconFileRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'loading_icon');
                }}
                accept="image/*"
                className="hidden"
              />
            </div>
          </CardContent>
        </Card>


        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              معلومات الشركة
            </CardTitle>
            <CardDescription>
              تحديث معلومات الاتصال والشركة
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company-phone">رقم الهاتف</Label>
              <Input
                id="company-phone"
                value={settings.company_phone}
                onChange={(e) => handleInputChange('company_phone', e.target.value)}
                placeholder="+966123456789"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company-email">البريد الإلكتروني</Label>
              <Input
                id="company-email"
                type="email"
                value={settings.company_email}
                onChange={(e) => handleInputChange('company_email', e.target.value)}
                placeholder="info@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company-address">العنوان</Label>
              <Textarea
                id="company-address"
                value={settings.company_address}
                onChange={(e) => handleInputChange('company_address', e.target.value)}
                placeholder="عنوان الشركة"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company-website">الموقع الإلكتروني</Label>
              <Input
                id="company-website"
                type="url"
                value={settings.company_website}
                onChange={(e) => handleInputChange('company_website', e.target.value)}
                placeholder="https://www.example.com"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            معاينة الإعدادات
          </CardTitle>
          <CardDescription>
            معاينة كيف ستبدو الإعدادات في الموقع
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/30 p-4 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <img 
                src={settings.logo_path} 
                alt="Logo Preview" 
                className="w-8 h-8 object-contain"
              />
              <div>
                <h3 className="font-semibold">{settings.site_title}</h3>
                <p className="text-sm text-muted-foreground">{settings.site_description}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{settings.company_email}</Badge>
              <Badge variant="secondary">{settings.company_phone}</Badge>
              <Badge 
                variant="secondary" 
                style={{ backgroundColor: `${settings.primary_color}20`, color: settings.primary_color }}
              >
                اللون الرئيسي
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}