"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Palette,
  Upload,
  Eye,
  Save,
  RefreshCw,
  Image as ImageIcon,
  FileText,
  Type,
  Layout,
  Printer,
  Download,
  Settings,
  CheckCircle,
  AlertTriangle,
  Zap,
  Layers,
  Brush,
  Sparkles,
  Monitor,
  Smartphone,
  FileImage,
  Wand2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  sizes: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
  };
}

interface LogoSettings {
  main: string;
  icon: string;
  watermark: string;
  favicon: string;
  printHeader: string;
}

interface PrintTemplate {
  id: string;
  name: string;
  type: 'invoice' | 'receipt' | 'report' | 'certificate';
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
}

export function BrandIdentityCenter() {
  const [activeTab, setActiveTab] = useState<'colors' | 'fonts' | 'logos' | 'templates' | 'preview'>('colors');
  const [isApplying, setIsApplying] = useState(false);
  const { toast } = useToast();

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

  const [brandFonts, setBrandFonts] = useState<BrandFonts>({
    primary: 'Cairo',
    secondary: 'Roboto',
    mono: 'Fira Code',
    sizes: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '30px'
    }
  });

  const [logoSettings, setLogoSettings] = useState<LogoSettings>({
    main: '/images/logo-main.png',
    icon: '/images/logo-icon.png',
    watermark: '/images/logo-watermark.png',
    favicon: '/images/favicon.ico',
    printHeader: '/images/logo-print.png'
  });

  const [printTemplates, setPrintTemplates] = useState<PrintTemplate[]>([
    {
      id: '1',
      name: 'فاتورة المبيعات',
      type: 'invoice',
      enabled: true,
      headerHeight: 100,
      footerHeight: 60,
      margins: { top: 20, bottom: 20, left: 15, right: 15 },
      showLogo: true,
      showWatermark: false,
      logoPosition: 'right',
      backgroundColor: '#FFFFFF',
      textColor: '#1A1A1A',
      accentColor: '#0066CC'
    },
    {
      id: '2',
      name: 'إيصال الاستلام',
      type: 'receipt',
      enabled: true,
      headerHeight: 80,
      footerHeight: 40,
      margins: { top: 15, bottom: 15, left: 10, right: 10 },
      showLogo: true,
      showWatermark: true,
      logoPosition: 'center',
      backgroundColor: '#F9FAFB',
      textColor: '#111827',
      accentColor: '#4A90E2'
    },
    {
      id: '3',
      name: 'تقرير الأداء',
      type: 'report',
      enabled: true,
      headerHeight: 120,
      footerHeight: 80,
      margins: { top: 25, bottom: 25, left: 20, right: 20 },
      showLogo: true,
      showWatermark: true,
      logoPosition: 'left',
      backgroundColor: '#FFFFFF',
      textColor: '#374151',
      accentColor: '#059669'
    },
    {
      id: '4',
      name: 'شهادة التقدير',
      type: 'certificate',
      enabled: false,
      headerHeight: 150,
      footerHeight: 100,
      margins: { top: 40, bottom: 40, left: 30, right: 30 },
      showLogo: true,
      showWatermark: true,
      logoPosition: 'center',
      backgroundColor: '#FFF7ED',
      textColor: '#92400E',
      accentColor: '#D97706'
    }
  ]);

  // تطبيق التغييرات على النظام
  const applyChanges = async () => {
    setIsApplying(true);
    
    try {
      // محاكاة تطبيق التغييرات على النظام
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // تحديث CSS Variables في الجذر
      const root = document.documentElement;
      Object.entries(brandColors).forEach(([key, value]) => {
        root.style.setProperty(`--brand-${key}`, value);
      });

      // تحديث خصائص الخط
      root.style.setProperty('--brand-font-primary', brandFonts.primary);
      root.style.setProperty('--brand-font-secondary', brandFonts.secondary);

      toast({
        title: '✅ تم تطبيق التغييرات',
        description: 'تم تحديث الهوية البصرية على جميع أجزاء النظام',
      });
    } catch (error) {
      toast({
        title: '❌ خطأ في التطبيق',
        description: 'حدث خطأ أثناء تطبيق التغييرات',
        variant: 'destructive'
      });
    } finally {
      setIsApplying(false);
    }
  };

  // استعادة الإعدادات الافتراضية
  const resetToDefaults = () => {
    setBrandColors({
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

    toast({
      title: '🔄 تمت الإستعادة',
      description: 'تم استعادة الألوان الافتراضية',
    });
  };

  // تحديث قالب طباعة
  const updateTemplate = (id: string, updates: Partial<PrintTemplate>) => {
    setPrintTemplates(prev => 
      prev.map(template => 
        template.id === id ? { ...template, ...updates } : template
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* العنوان الرئيسي */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg">
            <Palette className="h-7 w-7 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              🎨 مركز الهوية البصرية والعلامة التجارية
            </h2>
            <p className="text-purple-600 font-medium">إدارة شاملة للهوية البصرية مع تكامل الطباعة والحفظ</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={resetToDefaults}
            variant="outline"
            className="border-purple-300 text-purple-700 hover:bg-purple-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            استعادة افتراضي
          </Button>
          <Button 
            onClick={applyChanges}
            disabled={isApplying}
            className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
          >
            {isApplying ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            {isApplying ? 'جاري التطبيق...' : 'تطبيق التغييرات'}
          </Button>
        </div>
      </div>

      {/* الإحصائيات السريعة */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-700">{Object.keys(brandColors).length}</div>
            <div className="text-sm text-blue-600 flex items-center justify-center gap-1">
              <Palette className="h-3 w-3" />
              ألوان الهوية
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-700">{Object.keys(logoSettings).length}</div>
            <div className="text-sm text-green-600 flex items-center justify-center gap-1">
              <ImageIcon className="h-3 w-3" />
              شعارات
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-700">{Object.keys(brandFonts.sizes).length}</div>
            <div className="text-sm text-purple-600 flex items-center justify-center gap-1">
              <Type className="h-3 w-3" />
              أحجام خطوط
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-amber-100 border-orange-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-700">{printTemplates.filter(t => t.enabled).length}</div>
            <div className="text-sm text-orange-600 flex items-center justify-center gap-1">
              <Printer className="h-3 w-3" />
              قوالب نشطة
            </div>
          </CardContent>
        </Card>
      </div>

      {/* التبويبات الرئيسية */}
      <Tabs value={activeTab} onValueChange={setActiveTab as any} className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="colors" className="flex items-center gap-2 data-[state=active]:bg-purple-500 data-[state=active]:text-white">
            <Palette className="h-4 w-4" />
            الألوان
          </TabsTrigger>
          <TabsTrigger value="fonts" className="flex items-center gap-2 data-[state=active]:bg-purple-500 data-[state=active]:text-white">
            <Type className="h-4 w-4" />
            الخطوط
          </TabsTrigger>
          <TabsTrigger value="logos" className="flex items-center gap-2 data-[state=active]:bg-purple-500 data-[state=active]:text-white">
            <ImageIcon className="h-4 w-4" />
            الشعارات
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2 data-[state=active]:bg-purple-500 data-[state=active]:text-white">
            <Printer className="h-4 w-4" />
            قوالب الطباعة
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2 data-[state=active]:bg-purple-500 data-[state=active]:text-white">
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
                إعدادات الألوان الأساسية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {Object.entries(brandColors).map(([key, value]) => (
                  <div key={key} className="space-y-2">
                    <Label className="text-sm font-medium capitalize">
                      {key === 'primary' ? 'أساسي' :
                       key === 'secondary' ? 'ثانوي' :
                       key === 'accent' ? 'تمييز' :
                       key === 'background' ? 'خلفية' :
                       key === 'text' ? 'نص' :
                       key === 'muted' ? 'مخفف' :
                       key === 'border' ? 'حدود' :
                       key === 'success' ? 'نجاح' :
                       key === 'warning' ? 'تحذير' : 'خطأ'}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={value}
                        onChange={(e) => setBrandColors({...brandColors, [key]: e.target.value})}
                        className="w-12 h-10 p-1 border rounded-lg cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={value}
                        onChange={(e) => setBrandColors({...brandColors, [key]: e.target.value})}
                        className="flex-1 text-xs font-mono"
                        placeholder="#000000"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* لوحة الألوان السريعة */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                لوحات الألوان الجاهزة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { name: 'أزرق احترافي', colors: ['#0066CC', '#4A90E2', '#FF6B6B', '#FFFFFF', '#1A1A1A'] },
                  { name: 'أخضر طبيعي', colors: ['#10B981', '#34D399', '#FCD34D', '#F9FAFB', '#111827'] },
                  { name: 'بنفسجي إبداعي', colors: ['#8B5CF6', '#A78BFA', '#F59E0B', '#FFFFFF', '#374151'] },
                  { name: 'أحمر قوي', colors: ['#EF4444', '#F87171', '#60A5FA', '#FFFFFF', '#1F2937'] },
                  { name: 'برتقالي دافئ', colors: ['#F97316', '#FB923C', '#34D399', '#FEF7FF', '#0F172A'] },
                  { name: 'رمادي أنيق', colors: ['#6B7280', '#9CA3AF', '#3B82F6', '#FFFFFF', '#111827'] }
                ].map(palette => (
                  <Card key={palette.name} className="cursor-pointer hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-3">{palette.name}</h4>
                      <div className="flex gap-2 mb-3">
                        {palette.colors.map((color, index) => (
                          <div
                            key={index}
                            className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full"
                        onClick={() => setBrandColors({
                          ...brandColors,
                          primary: palette.colors[0],
                          secondary: palette.colors[1],
                          accent: palette.colors[2],
                          background: palette.colors[3],
                          text: palette.colors[4]
                        })}
                      >
                        تطبيق
                      </Button>
                    </CardContent>
                  </Card>
                ))}
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
                إعدادات الخطوط
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>الخط الأساسي</Label>
                  <Select value={brandFonts.primary} onValueChange={(value) => setBrandFonts({...brandFonts, primary: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cairo">Cairo (كايرو)</SelectItem>
                      <SelectItem value="Amiri">Amiri (أميري)</SelectItem>
                      <SelectItem value="Noto Sans Arabic">Noto Sans Arabic</SelectItem>
                      <SelectItem value="Tajawal">Tajawal (تجوال)</SelectItem>
                      <SelectItem value="Almarai">Almarai (المراعي)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>الخط الثانوي</Label>
                  <Select value={brandFonts.secondary} onValueChange={(value) => setBrandFonts({...brandFonts, secondary: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Roboto">Roboto</SelectItem>
                      <SelectItem value="Inter">Inter</SelectItem>
                      <SelectItem value="Open Sans">Open Sans</SelectItem>
                      <SelectItem value="Lato">Lato</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>الخط أحادي المسافة</Label>
                  <Select value={brandFonts.mono} onValueChange={(value) => setBrandFonts({...brandFonts, mono: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Fira Code">Fira Code</SelectItem>
                      <SelectItem value="JetBrains Mono">JetBrains Mono</SelectItem>
                      <SelectItem value="Source Code Pro">Source Code Pro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-4">أحجام الخطوط</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(brandFonts.sizes).map(([key, value]) => (
                    <div key={key} className="space-y-2">
                      <Label className="text-sm">{key.toUpperCase()}</Label>
                      <Input
                        type="text"
                        value={value}
                        onChange={(e) => setBrandFonts({
                          ...brandFonts, 
                          sizes: {...brandFonts.sizes, [key]: e.target.value}
                        })}
                        placeholder="16px"
                        className="text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* تبويبة الشعارات */}
        <TabsContent value="logos" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                إدارة الشعارات
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(logoSettings).map(([key, value]) => (
                <div key={key} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">
                      {key === 'main' ? 'الشعار الرئيسي' :
                       key === 'icon' ? 'أيقونة الشعار' :
                       key === 'watermark' ? 'العلامة المائية' :
                       key === 'favicon' ? 'أيقونة المتصفح' : 'شعار الطباعة'}
                    </h4>
                    <Badge variant="outline">
                      {key === 'main' ? 'PNG/SVG' :
                       key === 'icon' ? '64x64' :
                       key === 'watermark' ? 'شفاف' :
                       key === 'favicon' ? 'ICO' : 'عالي الجودة'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {value && (
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center border">
                        <ImageIcon className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 space-y-2">
                      <Input
                        value={value}
                        onChange={(e) => setLogoSettings({...logoSettings, [key]: e.target.value})}
                        placeholder={`مسار ${key === 'main' ? 'الشعار الرئيسي' : key}`}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex items-center gap-1">
                          <Upload className="h-3 w-3" />
                          رفع ملف
                        </Button>
                        <Button size="sm" variant="outline" className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          معاينة
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
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
                      <Button size="sm" variant="outline" className="mr-auto">
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
      <Alert className="border-purple-500 bg-purple-50">
        <CheckCircle className="h-4 w-4 text-purple-600" />
        <AlertDescription className="text-purple-800">
          <strong>🎨 مركز الهوية البصرية جاهز:</strong> تم تكوين {Object.keys(brandColors).length} لون، {Object.keys(logoSettings).length} شعار، و {printTemplates.filter(t => t.enabled).length} قالب طباعة نشط. 
          جميع التغييرات ستطبق فورياً على النظام بالكامل.
        </AlertDescription>
      </Alert>
    </div>
  );
}