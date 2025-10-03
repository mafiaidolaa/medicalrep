"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Palette,
  Type,
  Image as ImageIcon,
  Printer,
  Monitor,
  Smartphone,
  Upload,
  Eye,
  Download,
  FileText,
  Layout,
  FileImage,
  CheckCircle,
  Settings,
  Paintbrush,
  Layers,
  X,
  Loader2
} from 'lucide-react';

// استيراد المكونات والمساعدات الجديدة
import PrintTemplatePreview from './print-template-preview';
import { useSiteSettingsValue, useSiteSettingsActions } from '@/contexts/site-settings-context';
import {
  createFileInput,
  processFileUpload,
  uploadFileToServer,
  saveImageToLocalStorage,
  getImageFromLocalStorage,
  LOGO_UPLOAD_OPTIONS,
  FileUploadResult
} from '@/lib/file-upload-utils';

// أنواع البيانات
interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  muted: string;
  border: string;
  success: string;
  warning: string;
  error: string;
}

interface BrandFonts {
  primary: string;
  secondary: string;
  mono: string;
}

interface LogoSettings {
  main: {
    url: string;
    width: number;
    height: number;
    position: 'left' | 'center' | 'right';
  };
  icon: {
    url: string;
    width: number;
    height: number;
  };
  watermark: {
    url: string;
    opacity: number;
    position: 'left' | 'center' | 'right';
  };
  favicon: {
    url: string;
  };
  printHeader: {
    url: string;
    width: number;
    height: number;
  };
}

interface PrintTemplate {
  id: string;
  name: string;
  type: 'invoice' | 'receipt' | 'report' | 'certificate' | 'statement' | 'contract';
  category: 'financial' | 'operational' | 'customer' | 'administrative';
  enabled: boolean;
  headerHeight: number;
  footerHeight: number;
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  showLogo: boolean;
  showWatermark: boolean;
  logoPosition: 'left' | 'center' | 'right';
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  headerConfig: {
    showCompanyInfo: boolean;
    showDate: boolean;
    showPageNumbers: boolean;
    customFields: Array<{ label: string; value: string; show: boolean }>;
  };
  footerConfig: {
    showContactInfo: boolean;
    showLegalText: boolean;
    customText: string;
  };
  layout: {
    columns: number;
    spacing: number;
    tableStyle: 'modern' | 'classic' | 'minimal';
    borderStyle: 'none' | 'light' | 'medium' | 'heavy';
  };
}

export default function BrandIdentityCenterEnhanced() {
  // ربط مع إعدادات النظام
  const siteSettings = useSiteSettingsValue();
  const { updateSettings, updateLogo, refreshSettings } = useSiteSettingsActions();
  
  // حالة الألوان
  const [brandColors, setBrandColors] = useState<BrandColors>({
    primary: '#0066CC',
    secondary: '#4A90E2',
    accent: '#FF6B6B',
    background: '#FFFFFF',
    text: '#1A1A1A',
    muted: '#6B7280',
    border: '#E5E7EB',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444'
  });

  // حالة الخطوط
  const [brandFonts, setBrandFonts] = useState<BrandFonts>({
    primary: 'Cairo',
    secondary: 'Roboto',
    mono: 'Fira Code'
  });

  // حالة الشعارات
  const [logoSettings, setLogoSettings] = useState<LogoSettings>({
    main: {
      url: '',
      width: 200,
      height: 60,
      position: 'left'
    },
    icon: {
      url: '',
      width: 32,
      height: 32
    },
    watermark: {
      url: '',
      opacity: 0.1,
      position: 'center'
    },
    favicon: {
      url: ''
    },
    printHeader: {
      url: '',
      width: 150,
      height: 45
    }
  });

  // قوالب الطباعة
  const [printTemplates, setPrintTemplates] = useState<PrintTemplate[]>([
    {
      id: '1',
      name: 'فاتورة المبيعات',
      type: 'invoice',
      category: 'financial',
      enabled: true,
      headerHeight: 100,
      footerHeight: 60,
      margins: { top: 20, bottom: 20, left: 15, right: 15 },
      showLogo: true,
      showWatermark: false,
      logoPosition: 'right',
      backgroundColor: '#FFFFFF',
      textColor: '#1A1A1A',
      accentColor: '#0066CC',
      headerConfig: {
        showCompanyInfo: true,
        showDate: true,
        showPageNumbers: true,
        customFields: []
      },
      footerConfig: {
        showContactInfo: true,
        showLegalText: true,
        customText: ''
      },
      layout: {
        columns: 1,
        spacing: 15,
        tableStyle: 'modern',
        borderStyle: 'light'
      }
    },
    {
      id: '2',
      name: 'إيصال الاستلام',
      type: 'receipt',
      category: 'financial',
      enabled: true,
      headerHeight: 80,
      footerHeight: 40,
      margins: { top: 15, bottom: 15, left: 10, right: 10 },
      showLogo: true,
      showWatermark: true,
      logoPosition: 'center',
      backgroundColor: '#F9FAFB',
      textColor: '#111827',
      accentColor: '#4A90E2',
      headerConfig: {
        showCompanyInfo: true,
        showDate: true,
        showPageNumbers: false,
        customFields: []
      },
      footerConfig: {
        showContactInfo: false,
        showLegalText: false,
        customText: ''
      },
      layout: {
        columns: 1,
        spacing: 10,
        tableStyle: 'minimal',
        borderStyle: 'none'
      }
    },
    {
      id: '3',
      name: 'تقرير الأداء',
      type: 'report',
      category: 'operational',
      enabled: true,
      headerHeight: 120,
      footerHeight: 80,
      margins: { top: 25, bottom: 25, left: 20, right: 20 },
      showLogo: true,
      showWatermark: true,
      logoPosition: 'left',
      backgroundColor: '#FFFFFF',
      textColor: '#374151',
      accentColor: '#059669',
      headerConfig: {
        showCompanyInfo: true,
        showDate: true,
        showPageNumbers: true,
        customFields: []
      },
      footerConfig: {
        showContactInfo: true,
        showLegalText: false,
        customText: ''
      },
      layout: {
        columns: 2,
        spacing: 20,
        tableStyle: 'modern',
        borderStyle: 'medium'
      }
    }
  ]);

  // حالات جديدة للوظائف المضافة
  const [uploadingLogo, setUploadingLogo] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<PrintTemplate | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [availableFonts] = useState([
    'Cairo', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Source Sans Pro',
    'Nunito', 'Raleway', 'Poppins', 'Inter', 'Fira Sans', 'Ubuntu',
    'Tajawal', 'Amiri', 'Noto Sans Arabic', 'IBM Plex Arabic'
  ]);

  // معلومات الشركة (يمكن جلبها من context أو API)
  const [companyInfo] = useState({
    name: 'اسم الشركة',
    nameEn: 'Company Name',
    address: 'عنوان الشركة',
    phone: '+966 50 123 4567',
    email: 'info@company.com'
  });

  // تحديث لون
  const updateColor = async (colorKey: string, value: string) => {
    setBrandColors(prev => ({ ...prev, [colorKey]: value }));
    
    // حفظ في قاعدة البيانات
    try {
      await updateSettings({
        brand_colors: JSON.stringify({ ...brandColors, [colorKey]: value })
      });
    } catch (error) {
      console.warn('فشل حفظ الألوان في قاعدة البيانات:', error);
    }
  };

  // تحديث خط
  const updateFont = async (fontKey: string, value: string) => {
    setBrandFonts(prev => ({ ...prev, [fontKey]: value }));
    
    // حفظ في قاعدة البيانات
    try {
      await updateSettings({
        brand_fonts: JSON.stringify({ ...brandFonts, [fontKey]: value })
      });
    } catch (error) {
      console.warn('فشل حفظ الخطوط في قاعدة البيانات:', error);
    }
  };

  // تحديث شعار
  const updateLocalLogo = (logoKey: string, updates: any) => {
    setLogoSettings(prev => ({
      ...prev,
      [logoKey]: { ...prev[logoKey as keyof typeof prev], ...updates }
    }));
  };

  // تحديث قالب طباعة
  const updateTemplate = (templateId: string, updates: any) => {
    setPrintTemplates(prev => 
      prev.map(template => 
        template.id === templateId ? { ...template, ...updates } : template
      )
    );
  };

  // وظائف رفع الملفات الجديدة
  const handleLogoUpload = async (logoType: string) => {
    try {
      setUploadingLogo(logoType);
      
      console.log('بدء رفع الشعار:', logoType);
      
      // تحديد خيارات الرفع حسب نوع الشعار
      const uploadOptions = LOGO_UPLOAD_OPTIONS[logoType as keyof typeof LOGO_UPLOAD_OPTIONS] || {
        maxSizeBytes: 2 * 1024 * 1024,
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
        maxWidth: 500,
        maxHeight: 200,
        quality: 0.9
      };
      
      console.log('خيارات الرفع:', uploadOptions);
      
      // إنشاء file input
      const file = await createFileInput(uploadOptions);
      
      if (!file) {
        console.log('لم يتم اختيار ملف');
        setUploadingLogo(null);
        return;
      }

      console.log('تم اختيار الملف:', file.name, file.size);

      // معالجة الملف
      const result = await processFileUpload(file, uploadOptions);
      
      console.log('نتيجة معالجة الملف:', result);
      
      if (!result.success) {
        toast.error(result.error || 'فشل في معالجة الملف');
        setUploadingLogo(null);
        return;
      }

      // حفظ في localStorage كنسخة احتياطية
      saveImageToLocalStorage(logoType, result.data!.base64);
      
      // استخدام API السياق لحفظ الشعار في قاعدة البيانات
      try {
        const logoUrl = result.data!.base64; // استخدام base64 مؤقتاً
        
        // تحديث حالة الشعار محلياً أولاً
        updateLocalLogo(logoType, { url: logoUrl });
        
        // حفظ في قاعدة البيانات عبر API (استخدام hook من السياق)
        await updateLogo(logoType as 'main' | 'favicon' | 'loading', logoUrl);
        
        // تطبيق على النظام
        if (logoType === 'main') {
          await updateSettings({ logo_path: logoUrl });
        }
        
        toast.success('✨ تم رفع وحفظ الشعار بنجاح', {
          description: 'تم حفظ الشعار في قاعدة البيانات وسيظهر في جميع أنحاء النظام',
          duration: 4000
        });
        
      } catch (dbError) {
        console.warn('تحذير: تم حفظ الشعار محلياً، لكن فشل الحفظ في قاعدة البيانات:', dbError);
        
        // تحديث الحالة محلياً على الأقل
        updateLocalLogo(logoType, { url: result.data!.base64 });
        
        toast.success('تم رفع الشعار محلياً ✨', {
          description: 'سيظهر الشعار في النظام. تحقق من الاتصال لحفظه في قاعدة البيانات',
          duration: 5000
        });
      }
    } catch (error) {
      console.error('خطأ في رفع الشعار:', error);
      toast.error('حدث خطأ في رفع الشعار');
    } finally {
      setUploadingLogo(null);
    }
  };

  // وظيفة معاينة قالب الطباعة
  const handleTemplatePreview = (template: PrintTemplate) => {
    setPreviewTemplate(template);
    setIsPreviewOpen(true);
  };

  // وظيفة تطبيق الشعار على النظام فوراً
  const applyLogoToSystem = (logoType: string, logoUrl: string) => {
    try {
      console.log('تطبيق الشعار على النظام:', logoType, logoUrl);
      
      // تحديد نوع الشعار وتطبيقه
      switch (logoType) {
        case 'main':
          // تطبيق الشعار الرئيسي على إعدادات النظام
          updateSettings({
            logo_path: logoUrl,
          });
          break;
          
        case 'favicon':
          // تحديث favicon في الصفحة
          const favicon = document.querySelector('link[rel="icon"]') || 
                          document.querySelector('link[rel="shortcut icon"]');
          if (favicon) {
            (favicon as HTMLLinkElement).href = logoUrl;
          } else {
            const newFavicon = document.createElement('link');
            newFavicon.rel = 'icon';
            newFavicon.href = logoUrl;
            document.head.appendChild(newFavicon);
          }
          break;
          
        case 'icon':
          // حفظ أيقونة التطبيق للاستخدام في أماكن أخرى
          localStorage.setItem('app-icon', logoUrl);
          // إضافة إلى بعض عناصر الواجهة التي تستخدم هذه الأيقونة
          const appIcons = document.querySelectorAll('[data-app-icon]');
          appIcons.forEach(icon => {
            (icon as HTMLImageElement).src = logoUrl;
          });
          break;
      }
      
      // تطبيق التغييرات على CSS custom properties
      document.documentElement.style.setProperty(`--logo-${logoType}`, `url('${logoUrl}')`);
      
      // إرسال حدث مخصص لإعلام أجزاء أخرى من النظام
      const logoChangeEvent = new CustomEvent('logoChange', {
        detail: { logoType, logoUrl }
      });
      window.dispatchEvent(logoChangeEvent);
      
    } catch (error) {
      console.error('خطأ في تطبيق الشعار:', error);
    }
  };
  
  // وظيفة حذف الشعار
  const handleLogoRemove = async (logoType: string) => {
    try {
      // تحديث الحالة محلياً أولاً
      updateLocalLogo(logoType, { url: '' });
      
      // حذف من localStorage
      localStorage.removeItem(`brand-logo-${logoType}`);
      
      // حذف من قاعدة البيانات عبر API
      await updateLogo(logoType as 'main' | 'favicon' | 'loading', '');
      
      // إزالة من النظام
      if (logoType === 'main') {
        await updateSettings({ logo_path: '' });
      }
      
      // إزالة CSS custom property
      document.documentElement.style.removeProperty(`--logo-${logoType}`);
      
      // إرسال حدث الحذف
      const logoRemoveEvent = new CustomEvent('logoRemove', {
        detail: { logoType }
      });
      window.dispatchEvent(logoRemoveEvent);
      
      toast.success('✨ تم حذف الشعار وحفظ التغيير', {
        description: 'تم حذف الشعار وتحديث قاعدة البيانات'
      });
      
    } catch (error) {
      console.error('خطأ في حذف الشعار:', error);
      toast.error('حدث خطأ في حذف الشعار');
    }
  };

  // تحميل الإعدادات عند التشغيل
  useEffect(() => {
    // تحميل البيانات من سياق النظام أولاً
    if (siteSettings) {
      console.log('تحميل الإعدادات من السياق:', siteSettings);
      
      // تحميل الشعار الرئيسي من إعدادات النظام
      if (siteSettings.logo_path) {
        setLogoSettings(prev => ({
          ...prev,
          main: {
            ...prev.main,
            url: siteSettings.logo_path
          }
        }));
      }
      
      // تحميل الألوان من إعدادات النظام
      if (siteSettings.brand_colors) {
        try {
          const colors = JSON.parse(siteSettings.brand_colors);
          setBrandColors(colors);
        } catch (e) {
          console.warn('خطأ في تحميل الألوان من السياق:', e);
        }
      }
      
      // تحميل الخطوط من إعدادات النظام
      if (siteSettings.brand_fonts) {
        try {
          const fonts = JSON.parse(siteSettings.brand_fonts);
          setBrandFonts(fonts);
        } catch (e) {
          console.warn('خطأ في تحميل الخطوط من السياق:', e);
        }
      }
    }
    
    // تحميل بيانات إضافية من localStorage كنسخة احتياطية
    const savedColors = localStorage.getItem('brand-colors');
    const savedFonts = localStorage.getItem('brand-fonts');
    const savedLogos = localStorage.getItem('brand-logos');
    const savedTemplates = localStorage.getItem('print-templates');
    
    if (savedColors) {
      try {
        setBrandColors(JSON.parse(savedColors));
      } catch (e) {
        console.error('خطأ في تحميل الألوان:', e);
      }
    }
    
    if (savedFonts) {
      try {
        setBrandFonts(JSON.parse(savedFonts));
      } catch (e) {
        console.error('خطأ في تحميل الخطوط:', e);
      }
    }
    
    if (savedLogos) {
      try {
        const logos = JSON.parse(savedLogos);
        // تحميل الصور من localStorage إذا لم تكن محملة من السياق
        Object.keys(logos).forEach(logoType => {
          if (!logos[logoType].url || logoType !== 'main') { // تجاهل main logo لأنه محمّل من السياق
            const savedImage = getImageFromLocalStorage(logoType);
            if (savedImage) {
              logos[logoType].url = savedImage;
            }
          }
          
          // تطبيق الشعار على النظام عند التحميل
          if (logos[logoType].url) {
            // تأخير بسيط لضمان تحميل الدوم بالكامل
            setTimeout(() => {
              applyLogoToSystem(logoType, logos[logoType].url);
            }, 100);
          }
        });
        
        // دمج مع الشعار المحمّل من السياق
        setLogoSettings(prev => ({
          ...logos,
          main: {
            ...logos.main,
            url: siteSettings?.logo_path || logos.main?.url || ''
          }
        }));
      } catch (e) {
        console.error('خطأ في تحميل الشعارات:', e);
      }
    }
    
    if (savedTemplates) {
      try {
        setPrintTemplates(JSON.parse(savedTemplates));
      } catch (e) {
        console.error('خطأ في تحميل قوالب الطباعة:', e);
      }
    }
  }, [siteSettings]);

  // حفظ الإعدادات عند التغيير
  useEffect(() => {
    localStorage.setItem('brand-colors', JSON.stringify(brandColors));
  }, [brandColors]);
  
  useEffect(() => {
    localStorage.setItem('brand-fonts', JSON.stringify(brandFonts));
  }, [brandFonts]);
  
  useEffect(() => {
    localStorage.setItem('brand-logos', JSON.stringify(logoSettings));
  }, [logoSettings]);
  
  useEffect(() => {
    localStorage.setItem('print-templates', JSON.stringify(printTemplates));
  }, [printTemplates]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-600 text-white">
            <Paintbrush className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold">🎨 مركز الهوية البصرية الموحدة</h2>
            <p className="text-sm text-muted-foreground">
              إدارة شاملة للألوان والخطوط والشعارات وقوالب الطباعة
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="bg-gradient-to-r from-green-100 to-blue-100 text-green-800">
          ✨ محدث ومطور
        </Badge>
      </div>

      <Tabs defaultValue="colors" className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="colors" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            الألوان
          </TabsTrigger>
          <TabsTrigger value="fonts" className="flex items-center gap-2">
            <Type className="h-4 w-4" />
            الخطوط
          </TabsTrigger>
          <TabsTrigger value="logos" className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            الشعارات
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            قوالب الطباعة
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            المعاينة
          </TabsTrigger>
        </TabsList>

        {/* تبويبة الألوان */}
        <TabsContent value="colors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                لوحة الألوان الأساسية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {Object.entries(brandColors).map(([colorKey, colorValue]) => (
                  <div key={colorKey} className="space-y-3">
                    <Label className="text-sm font-medium">
                      {colorKey === 'primary' ? 'اللون الأساسي' :
                       colorKey === 'secondary' ? 'اللون الثانوي' :
                       colorKey === 'accent' ? 'لون التمييز' :
                       colorKey === 'background' ? 'لون الخلفية' :
                       colorKey === 'text' ? 'لون النص' :
                       colorKey === 'muted' ? 'اللون الباهت' :
                       colorKey === 'border' ? 'لون الحدود' :
                       colorKey === 'success' ? 'لون النجاح' :
                       colorKey === 'warning' ? 'لون التحذير' :
                       'لون الخطأ'}
                    </Label>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-12 h-12 rounded-lg border-2 border-gray-200 cursor-pointer shadow-sm transition-all hover:scale-105"
                        style={{ backgroundColor: colorValue }}
                        onClick={() => document.getElementById(`color-${colorKey}`)?.click()}
                      />
                      <div className="flex-1">
                        <Input
                          id={`color-${colorKey}`}
                          type="color"
                          value={colorValue}
                          onChange={(e) => updateColor(colorKey, e.target.value)}
                          className="h-8 w-full cursor-pointer"
                        />
                        <Input
                          value={colorValue}
                          onChange={(e) => updateColor(colorKey, e.target.value)}
                          className="text-xs font-mono mt-1 h-7"
                          placeholder="#000000"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 rounded-lg border bg-gradient-to-r from-blue-50 to-purple-50">
                <h4 className="font-semibold mb-2">معاينة الألوان</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="p-3 rounded-lg" style={{ backgroundColor: brandColors.primary, color: 'white' }}>
                    النص الأساسي
                  </div>
                  <div className="p-3 rounded-lg" style={{ backgroundColor: brandColors.secondary, color: 'white' }}>
                    النص الثانوي
                  </div>
                  <div className="p-3 rounded-lg" style={{ backgroundColor: brandColors.accent, color: 'white' }}>
                    نص التمييز
                  </div>
                  <div className="p-3 rounded-lg border" style={{ backgroundColor: brandColors.background, color: brandColors.text }}>
                    النص العادي
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* تبويبة الخطوط */}
        <TabsContent value="fonts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5" />
                إعدادات الخطوط والطباعة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(brandFonts).map(([fontKey, fontValue]) => (
                <div key={fontKey} className="space-y-2">
                  <Label className="text-sm font-medium">
                    {fontKey === 'primary' ? 'الخط الأساسي' :
                     fontKey === 'secondary' ? 'الخط الثانوي' : 
                     'الخط أحادي المسافة'}
                  </Label>
                  <Select value={fontValue} onValueChange={(value) => updateFont(fontKey, value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الخط" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFonts.map((font) => (
                        <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                          {font}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div 
                    className="p-3 rounded-lg bg-muted text-center text-sm border"
                    style={{ fontFamily: fontValue }}
                  >
                    نموذج للخط: {fontValue} - هذا نص تجريبي باللغة العربية والإنجليزية English
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* تبويبة الشعارات */}
        <TabsContent value="logos" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                إدارة الشعارات والرموز
              </CardTitle>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <div className="flex items-start gap-2">
                  <div className="text-blue-600 mt-0.5">✨</div>
                  <div>
                    <strong>تطبيق فوري:</strong> عند رفع أي شعار، سيظهر في جميع أنحاء النظام بشكل تلقائي بدون الحاجة لإعادة تحميل الصفحة.
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(logoSettings).map(([logoKey, logo]) => (
                <Card key={logoKey} className="border-2 border-dashed border-gray-200 hover:border-blue-300 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">
                          {logoKey === 'main' ? 'الشعار الرئيسي' :
                           logoKey === 'icon' ? 'أيقونة التطبيق' :
                           logoKey === 'watermark' ? 'العلامة المائية' :
                           logoKey === 'favicon' ? 'أيقونة المتصفح' :
                           'شعار رأس الطباعة'}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {logoKey === 'main' ? 'يستخدم في واجهة التطبيق والصفحات' :
                           logoKey === 'icon' ? 'أيقونة صغيرة للتطبيق' :
                           logoKey === 'watermark' ? 'علامة مائية شفافة للمستندات' :
                           logoKey === 'favicon' ? 'أيقونة تظهر في تبويب المتصفح' :
                           'شعار خاص بالمطبوعات والتقارير'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            console.log('تم النقر على زر رفع الشعار:', logoKey);
                            handleLogoUpload(logoKey);
                          }}
                          disabled={uploadingLogo === logoKey}
                        >
                          {uploadingLogo === logoKey ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Upload className="h-3 w-3 mr-1" />
                          )}
                          {uploadingLogo === logoKey ? 'جاري الرفع...' : 'رفع'}
                        </Button>
                        
                        {logo.url ? (
                          <>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => {
                                // فتح الصورة في نافذة جديدة للمعاينة
                                window.open(logo.url, '_blank');
                              }}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              معاينة
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleLogoRemove(logoKey)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="h-3 w-3 mr-1" />
                              حذف
                            </Button>
                            <div 
                              className="w-16 h-12 rounded border bg-white flex items-center justify-center overflow-hidden cursor-pointer hover:bg-gray-50 transition-colors"
                              onClick={() => {
                                // فتح الصورة في نافذة جديدة للمعاينة
                                window.open(logo.url, '_blank');
                              }}
                              title="انقر للمعاينة"
                            >
                              <img 
                                src={logo.url} 
                                alt={`شعار ${logoKey}`}
                                className="max-w-full max-h-full object-contain"
                                onError={(e) => {
                                  // في حالة فشل تحميل الصورة، عرض أيقونة
                                  console.error('فشل في تحميل الصورة:', logo.url);
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  (e.target as HTMLElement).nextElementSibling?.classList.remove('hidden');
                                }}
                                onLoad={() => {
                                  console.log('تم تحميل الصورة بنجاح:', logoKey, logo.url);
                                }}
                              />
                              <ImageIcon className="h-4 w-4 text-gray-400 hidden" />
                            </div>
                          </>
                        ) : (
                          <div className="w-16 h-12 rounded border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-gray-400" />
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* تبويبة قوالب الطباعة */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5" />
                قوالب الطباعة والحفظ PDF
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {printTemplates.map((template) => (
                <Card key={template.id} className={`border-2 ${template.enabled ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}>
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          template.type === 'invoice' ? 'bg-blue-100 text-blue-600' :
                          template.type === 'receipt' ? 'bg-green-100 text-green-600' :
                          template.type === 'report' ? 'bg-purple-100 text-purple-600' :
                          'bg-orange-100 text-orange-600'
                        }`}>
                          {template.type === 'invoice' ? <FileText className="h-4 w-4" /> :
                           template.type === 'receipt' ? <Download className="h-4 w-4" /> :
                           template.type === 'report' ? <Layout className="h-4 w-4" /> :
                           <FileImage className="h-4 w-4" />}
                        </div>
                        <div>
                          <h4 className="font-medium">{template.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {template.type === 'invoice' ? 'فاتورة' :
                             template.type === 'receipt' ? 'إيصال' :
                             template.type === 'report' ? 'تقرير' : 'شهادة'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={template.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {template.enabled ? 'مفعل' : 'معطل'}
                        </Badge>
                        <Switch
                          checked={template.enabled}
                          onCheckedChange={(checked) => updateTemplate(template.id, { enabled: checked })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">ارتفاع الرأس (px)</Label>
                        <Input
                          type="number"
                          value={template.headerHeight}
                          onChange={(e) => updateTemplate(template.id, { headerHeight: parseInt(e.target.value) })}
                          className="text-xs"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">ارتفاع التذييل (px)</Label>
                        <Input
                          type="number"
                          value={template.footerHeight}
                          onChange={(e) => updateTemplate(template.id, { footerHeight: parseInt(e.target.value) })}
                          className="text-xs"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">موضع الشعار</Label>
                        <Select 
                          value={template.logoPosition} 
                          onValueChange={(value: any) => updateTemplate(template.id, { logoPosition: value })}
                        >
                          <SelectTrigger className="text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="left">يسار</SelectItem>
                            <SelectItem value="center">وسط</SelectItem>
                            <SelectItem value="right">يمين</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">لون التمييز</Label>
                        <Input
                          type="color"
                          value={template.accentColor}
                          onChange={(e) => updateTemplate(template.id, { accentColor: e.target.value })}
                          className="h-8 p-1"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-4 pt-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={template.showLogo}
                          onCheckedChange={(checked) => updateTemplate(template.id, { showLogo: checked })}
                        />
                        <Label className="text-sm">إظهار الشعار</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={template.showWatermark}
                          onCheckedChange={(checked) => updateTemplate(template.id, { showWatermark: checked })}
                        />
                        <Label className="text-sm">العلامة المائية</Label>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="mr-auto"
                        onClick={() => handleTemplatePreview(template)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        معاينة
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* تبويبة المعاينة */}
        <TabsContent value="preview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  معاينة الحاسوب
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div 
                  className="p-4 rounded-lg border-2 min-h-[300px]"
                  style={{ 
                    backgroundColor: brandColors.background,
                    color: brandColors.text,
                    borderColor: brandColors.border
                  }}
                >
                  <div 
                    className="text-center p-4 rounded-lg mb-4"
                    style={{ backgroundColor: brandColors.primary, color: 'white' }}
                  >
                    <h3 className="text-lg font-bold" style={{ fontFamily: brandFonts.primary }}>
                      {brandFonts.primary}
                    </h3>
                    <p className="text-sm">العنوان الرئيسي للنظام</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: brandColors.accent }}
                      ></div>
                      <span style={{ color: brandColors.text }}>عنصر في القائمة</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: brandColors.secondary }}
                      ></div>
                      <span style={{ color: brandColors.muted }}>عنصر ثانوي</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  معاينة الجوال
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full max-w-xs mx-auto">
                  <div 
                    className="p-3 rounded-lg border-2 min-h-[250px] text-sm"
                    style={{ 
                      backgroundColor: brandColors.background,
                      color: brandColors.text,
                      borderColor: brandColors.border
                    }}
                  >
                    <div 
                      className="text-center p-3 rounded-lg mb-3"
                      style={{ backgroundColor: brandColors.primary, color: 'white' }}
                    >
                      <h4 className="font-bold text-sm">النظام المحمول</h4>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: brandColors.accent }}
                        ></div>
                        <span className="text-xs">عنصر</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: brandColors.secondary }}
                        ></div>
                        <span className="text-xs">عنصر آخر</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* تنبيه الحالة */}
      <Alert className="border-green-500 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <strong>✨ مركز الهوية البصرية المتطور جاهز:</strong> 
          <br />
          • {Object.keys(brandColors).length} لون متاح ومحفوظ 
          <br />
          • {Object.values(logoSettings).filter(logo => logo.url).length} شعار مرفوع ومحفوظ في قاعدة البيانات 
          <br />
          • {printTemplates.filter(t => t.enabled).length} قالب طباعة نشط من أصل {printTemplates.length} 
          <br />
          <span className="text-xs font-medium">💾 جميع التغييرات تحفظ تلقائياً في قاعدة البيانات وتطبق فورياً على النظام بأكمله.</span>
        </AlertDescription>
      </Alert>

      {/* موديال معاينة قالب الطباعة */}
      {previewTemplate && (
        <PrintTemplatePreview
          template={previewTemplate}
          isOpen={isPreviewOpen}
          onClose={() => {
            setIsPreviewOpen(false);
            setPreviewTemplate(null);
          }}
          companyInfo={companyInfo}
          brandColors={brandColors}
          brandFonts={{
            primary: brandFonts.primary,
            secondary: brandFonts.secondary,
            sizes: {
              xs: '12px',
              sm: '14px',
              base: '16px',
              lg: '18px',
              xl: '20px',
              '2xl': '24px'
            },
            weights: {
              normal: 400,
              medium: 500,
              semibold: 600,
              bold: 700
            }
          }}
        />
      )}
    </div>
  );
}