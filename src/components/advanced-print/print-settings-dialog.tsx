"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Settings, 
  Eye, 
  Download, 
  Printer, 
  Palette, 
  Layout, 
  FileText, 
  Image, 
  Type,
  Monitor,
  Save,
  RefreshCw,
  Upload,
  X,
  Check,
  AlertCircle,
  Zap,
  Sparkles,
  Crown,
  Star
} from "lucide-react";

import { 
  PRINT_TEMPLATES, 
  PrintTemplate, 
  PrintSettings, 
  DEFAULT_PRINT_SETTINGS,
  getTemplateById,
  generateCustomStyles
} from "@/lib/print-templates/print-templates";

interface PrintSettingsDialogProps {
  onApplySettings: (settings: PrintSettings) => void;
  onPreview: (settings: PrintSettings) => void;
  onDownloadPDF: (settings: PrintSettings) => void;
  currentSettings?: PrintSettings;
  children?: React.ReactNode;
}

export function PrintSettingsDialog({ 
  onApplySettings, 
  onPreview, 
  onDownloadPDF, 
  currentSettings = DEFAULT_PRINT_SETTINGS,
  children 
}: PrintSettingsDialogProps) {
  const [settings, setSettings] = useState<PrintSettings>(currentSettings);
  const [selectedTemplate, setSelectedTemplate] = useState<PrintTemplate | undefined>(
    getTemplateById(currentSettings.template)
  );
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [activeTab, setActiveTab] = useState('templates');
  const [customColors, setCustomColors] = useState({
    primary: selectedTemplate?.settings.colors.primary || '#2563EB',
    secondary: selectedTemplate?.settings.colors.secondary || '#1E40AF',
    accent: selectedTemplate?.settings.colors.accent || '#3B82F6'
  });

  useEffect(() => {
    const template = getTemplateById(settings.template);
    setSelectedTemplate(template);
    if (template) {
      setCustomColors({
        primary: template.settings.colors.primary,
        secondary: template.settings.colors.secondary,
        accent: template.settings.colors.accent
      });
    }
  }, [settings.template]);

  const handleTemplateSelect = (templateId: string) => {
    const template = getTemplateById(templateId);
    if (template) {
      setSettings(prev => ({ ...prev, template: templateId }));
      setSelectedTemplate(template);
      setCustomColors({
        primary: template.settings.colors.primary,
        secondary: template.settings.colors.secondary,
        accent: template.settings.colors.accent
      });
    }
  };

  const handleSettingsChange = (key: keyof PrintSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleCompanyInfoChange = (key: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      companyInfo: {
        ...prev.companyInfo!,
        [key]: value
      }
    }));
  };

  const handleColorChange = (colorType: 'primary' | 'secondary' | 'accent', color: string) => {
    setCustomColors(prev => ({ ...prev, [colorType]: color }));
    
    // تحديث الأنماط المخصصة
    const customStylesWithColors = `
      :root {
        --primary-color: ${colorType === 'primary' ? color : customColors.primary};
        --secondary-color: ${colorType === 'secondary' ? color : customColors.secondary};
        --accent-color: ${colorType === 'accent' ? color : customColors.accent};
      }
      ${settings.customStyles || ''}
    `;
    
    setSettings(prev => ({
      ...prev,
      customStyles: customStylesWithColors
    }));
  };

  const generatePreview = () => {
    if (!selectedTemplate) return;

    const sampleData = {
      title: 'تقرير نموذجي - نظام EP Group',
      subtitle: 'تقرير تجريبي لمعاينة التنسيق',
      content: [
        { 
          section: 'معلومات أساسية',
          data: [
            { label: 'التاريخ', value: new Date().toLocaleDateString('ar-EG') },
            { label: 'الوقت', value: new Date().toLocaleTimeString('ar-EG') },
            { label: 'المستخدم', value: 'مدير النظام' },
            { label: 'القسم', value: 'الإدارة العامة' }
          ]
        },
        {
          section: 'بيانات نموذجية',
          data: [
            { label: 'العدد الإجمالي', value: '1,234' },
            { label: 'النشط', value: '956' },
            { label: 'المعطل', value: '278' },
            { label: 'النسبة المئوية', value: '77.5%' }
          ]
        }
      ],
      table: {
        headers: ['الرقم', 'الاسم', 'التاريخ', 'الحالة', 'المبلغ'],
        rows: [
          ['1', 'عبد الله أحمد', '2024-01-15', 'نشط', '1,500.00 ج.م'],
          ['2', 'فاطمة محمد', '2024-01-16', 'معطل', '2,750.00 ج.م'],
          ['3', 'محمد علي', '2024-01-17', 'نشط', '3,200.00 ج.م'],
          ['4', 'عائشة حسن', '2024-01-18', 'نشط', '1,890.00 ج.م']
        ]
      }
    };

    const styles = generateCustomStyles(selectedTemplate, settings);
    const templateClass = selectedTemplate.id === 'official' ? 'ep' : 
                          selectedTemplate.id === 'elegant' ? 'elegant' : 'modern';

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>معاينة الطباعة - ${selectedTemplate.nameAr}</title>
        <style>${styles}</style>
      </head>
      <body>
        <div class="print-container">
          <div class="print-content">
            <!-- Header -->
            <div class="${templateClass}-header">
              ${selectedTemplate.id === 'official' ? '<div class="ep-logo">EP</div>' : ''}
              <h1>${sampleData.title}</h1>
              <div class="subtitle">${sampleData.subtitle}</div>
              ${selectedTemplate.id === 'elegant' ? '<div class="elegant-ornament"></div>' : ''}
            </div>

            <!-- Body -->
            <div class="${templateClass}-body">
              ${sampleData.content.map(section => `
                <div class="${templateClass}-section">
                  <h2 class="${templateClass}-section-title">${section.section}</h2>
                  <div class="${templateClass === 'ep' ? 'ep-info-grid' : templateClass === 'modern' ? 'modern-grid' : ''}">
                    ${section.data.map(item => `
                      <div class="${templateClass === 'ep' ? 'ep-info-item' : ''}">
                        ${templateClass === 'ep' ? '<div class="ep-info-icon">📊</div>' : ''}
                        <div class="${templateClass === 'ep' ? 'ep-info-content' : ''}">
                          <div class="${templateClass === 'ep' ? 'label' : ''}">${item.label}</div>
                          <div class="${templateClass === 'ep' ? 'value' : ''}">${item.value}</div>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              `).join('')}

              <!-- Sample Table -->
              <div class="${templateClass}-section">
                <h2 class="${templateClass}-section-title">جدول البيانات</h2>
                <table class="${templateClass}-table">
                  <thead>
                    <tr>
                      ${sampleData.table.headers.map(header => `<th>${header}</th>`).join('')}
                    </tr>
                  </thead>
                  <tbody>
                    ${sampleData.table.rows.map((row, index) => `
                      <tr>
                        ${row.map((cell, cellIndex) => `
                          <td class="${cellIndex === 0 ? 'number-cell' : cellIndex === 3 ? 'status-cell' : cellIndex === 4 ? 'amount-cell' : ''}">${cell}</td>
                        `).join('')}
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>

              <!-- Sample Cards -->
              <div class="${templateClass}-section">
                <h2 class="${templateClass}-section-title">بطاقات المعلومات</h2>
                <div class="${templateClass}-card">
                  <div class="${templateClass === 'ep' ? 'ep-card-header' : ''}">
                    <h3 class="${templateClass === 'ep' ? 'ep-card-title' : ''}">معلومات إضافية</h3>
                    <span class="${templateClass}-badge ${templateClass === 'ep' ? 'ep-badge-success' : templateClass === 'elegant' ? 'elegant-badge' : 'modern-badge'}">مهم</span>
                  </div>
                  <div class="${templateClass === 'ep' ? 'ep-card-content' : ''}">
                    <p>هذا نص تجريبي لمعاينة شكل البطاقات والمحتوى داخل النموذج المحدد. يمكنك رؤية كيف ستبدو المطبوعات النهائية بهذا التنسيق.</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer -->
            ${selectedTemplate.settings.headerFooter ? `
              <div class="${templateClass}-footer">
                ${selectedTemplate.id === 'elegant' ? '<div class="elegant-footer-ornament"></div>' : ''}
                <div class="${templateClass === 'ep' ? 'ep-footer-content' : templateClass === 'elegant' ? 'elegant-footer-content' : ''}">
                  <div class="${templateClass === 'ep' ? 'ep-footer-brand' : ''}">${settings.companyInfo?.name || 'EP Group System'}</div>
                  ${settings.includeTimestamp ? `<div class="${templateClass === 'ep' ? 'ep-footer-info' : ''}">تم إنشاء التقرير: ${new Date().toLocaleString('ar-EG')}</div>` : ''}
                  ${settings.companyInfo?.phone || settings.companyInfo?.email ? `
                    <div class="${templateClass === 'ep' ? 'ep-footer-contact' : ''}">
                      ${settings.companyInfo.phone ? `<span>📞 ${settings.companyInfo.phone}</span>` : ''}
                      ${settings.companyInfo.email ? `<span>📧 ${settings.companyInfo.email}</span>` : ''}
                      ${settings.companyInfo.website ? `<span>🌐 ${settings.companyInfo.website}</span>` : ''}
                    </div>
                  ` : ''}
                </div>
              </div>
            ` : ''}
          </div>
          ${settings.includePageNumbers ? '<div class="page-number"></div>' : ''}
        </div>
      </body>
      </html>
    `;

    setPreviewContent(html);
    setIsPreviewMode(true);
  };

  const resetToDefaults = () => {
    setSettings(DEFAULT_PRINT_SETTINGS);
    setSelectedTemplate(getTemplateById(DEFAULT_PRINT_SETTINGS.template));
  };

  const getTemplateIcon = (template: PrintTemplate) => {
    switch (template.id) {
      case 'official':
        return <Crown className="w-6 h-6 text-blue-500" />;
      case 'elegant':
        return <Sparkles className="w-6 h-6 text-purple-500" />;
      case 'modern-minimal':
        return <Zap className="w-6 h-6 text-gray-700" />;
      default:
        return <FileText className="w-6 h-6" />;
    }
  };

  const getTemplateTag = (template: PrintTemplate) => {
    switch (template.id) {
      case 'official':
        return <Badge variant="default" className="bg-blue-500">الافتراضي</Badge>;
      case 'elegant':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-700">كلاسيكي</Badge>;
      case 'modern-minimal':
        return <Badge variant="outline">حديث</Badge>;
      default:
        return null;
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            إعدادات الطباعة
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Settings className="w-5 h-5 text-primary" />
            إعدادات الطباعة المتقدمة
          </DialogTitle>
          <DialogDescription>
            خصص إعدادات الطباعة والتنسيق لتحصل على مطبوعات احترافية ومتقنة
          </DialogDescription>
        </DialogHeader>

        <div className="flex h-[calc(90vh-120px)] gap-4">
          {/* Settings Panel */}
          <div className="flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="templates" className="flex items-center gap-2">
                  <Layout className="w-4 h-4" />
                  القوالب
                </TabsTrigger>
                <TabsTrigger value="design" className="flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  التصميم
                </TabsTrigger>
                <TabsTrigger value="content" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  المحتوى
                </TabsTrigger>
                <TabsTrigger value="advanced" className="flex items-center gap-2">
                  <Type className="w-4 h-4" />
                  متقدم
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[calc(100%-60px)]">
                {/* Templates Tab */}
                <TabsContent value="templates" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Layout className="w-5 h-5" />
                        اختر القالب
                      </CardTitle>
                      <CardDescription>
                        اختر من مجموعة القوالب الاحترافية المصممة خصيصاً لنظام EP Group
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                      {PRINT_TEMPLATES.map((template) => (
                        <Card
                          key={template.id}
                          className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
                            selectedTemplate?.id === template.id
                              ? 'ring-2 ring-primary bg-primary/5'
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => handleTemplateSelect(template.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                              <div className="flex-shrink-0">
                                {getTemplateIcon(template)}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold">{template.nameAr}</h3>
                                  {getTemplateTag(template)}
                                  {selectedTemplate?.id === template.id && (
                                    <Check className="w-4 h-4 text-green-500" />
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {template.descriptionAr}
                                </p>
                                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                  <span>الحجم: {template.settings.pageSize}</span>
                                  <span>الاتجاه: {template.settings.orientation === 'portrait' ? 'عمودي' : 'أفقي'}</span>
                                  <span>الألوان: {Object.keys(template.settings.colors).length}</span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Design Tab */}
                <TabsContent value="design" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Palette className="w-5 h-5" />
                        تخصيص الألوان
                      </CardTitle>
                      <CardDescription>
                        خصص ألوان القالب لتتناسب مع هوية شركتك
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="primary-color">اللون الأساسي</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              type="color"
                              id="primary-color"
                              value={customColors.primary}
                              onChange={(e) => handleColorChange('primary', e.target.value)}
                              className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                            />
                            <Input
                              value={customColors.primary}
                              onChange={(e) => handleColorChange('primary', e.target.value)}
                              className="flex-1"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="secondary-color">اللون الثانوي</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              type="color"
                              id="secondary-color"
                              value={customColors.secondary}
                              onChange={(e) => handleColorChange('secondary', e.target.value)}
                              className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                            />
                            <Input
                              value={customColors.secondary}
                              onChange={(e) => handleColorChange('secondary', e.target.value)}
                              className="flex-1"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="accent-color">لون التمييز</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              type="color"
                              id="accent-color"
                              value={customColors.accent}
                              onChange={(e) => handleColorChange('accent', e.target.value)}
                              className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                            />
                            <Input
                              value={customColors.accent}
                              onChange={(e) => handleColorChange('accent', e.target.value)}
                              className="flex-1"
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>إعدادات التصميم</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>العلامة المائية</Label>
                          <p className="text-sm text-muted-foreground">إظهار اسم الشركة كعلامة مائية</p>
                        </div>
                        <Switch
                          checked={settings.includeWatermark}
                          onCheckedChange={(checked) => handleSettingsChange('includeWatermark', checked)}
                        />
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>أرقام الصفحات</Label>
                          <p className="text-sm text-muted-foreground">إضافة ترقيم للصفحات</p>
                        </div>
                        <Switch
                          checked={settings.includePageNumbers}
                          onCheckedChange={(checked) => handleSettingsChange('includePageNumbers', checked)}
                        />
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>طابع التاريخ والوقت</Label>
                          <p className="text-sm text-muted-foreground">إضافة تاريخ ووقت الطباعة</p>
                        </div>
                        <Switch
                          checked={settings.includeTimestamp}
                          onCheckedChange={(checked) => handleSettingsChange('includeTimestamp', checked)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Content Tab */}
                <TabsContent value="content" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        معلومات الشركة
                      </CardTitle>
                      <CardDescription>
                        أدخل معلومات شركتك لتظهر في المطبوعات
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="company-name">اسم الشركة</Label>
                        <Input
                          id="company-name"
                          value={settings.companyInfo?.name || ''}
                          onChange={(e) => handleCompanyInfoChange('name', e.target.value)}
                          placeholder="مجموعة EP"
                        />
                      </div>
                      <div>
                        <Label htmlFor="company-address">العنوان</Label>
                        <Textarea
                          id="company-address"
                          value={settings.companyInfo?.address || ''}
                          onChange={(e) => handleCompanyInfoChange('address', e.target.value)}
                          placeholder="العنوان الكامل للشركة"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="company-phone">رقم الهاتف</Label>
                          <Input
                            id="company-phone"
                            value={settings.companyInfo?.phone || ''}
                            onChange={(e) => handleCompanyInfoChange('phone', e.target.value)}
                            placeholder="+20 123 456 7890"
                          />
                        </div>
                        <div>
                          <Label htmlFor="company-email">البريد الإلكتروني</Label>
                          <Input
                            id="company-email"
                            value={settings.companyInfo?.email || ''}
                            onChange={(e) => handleCompanyInfoChange('email', e.target.value)}
                            placeholder="info@epgroup.com"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="company-website">الموقع الإلكتروني</Label>
                        <Input
                          id="company-website"
                          value={settings.companyInfo?.website || ''}
                          onChange={(e) => handleCompanyInfoChange('website', e.target.value)}
                          placeholder="www.epgroup.com"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>رأس وتذييل مخصص</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="custom-header">رأس الصفحة المخصص</Label>
                        <Textarea
                          id="custom-header"
                          value={settings.customHeader || ''}
                          onChange={(e) => handleSettingsChange('customHeader', e.target.value)}
                          placeholder="نص مخصص لرأس الصفحة"
                        />
                      </div>
                      <div>
                        <Label htmlFor="custom-footer">تذييل الصفحة المخصص</Label>
                        <Textarea
                          id="custom-footer"
                          value={settings.customFooter || ''}
                          onChange={(e) => handleSettingsChange('customFooter', e.target.value)}
                          placeholder="نص مخصص لتذييل الصفحة"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Advanced Tab */}
                <TabsContent value="advanced" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Type className="w-5 h-5" />
                        أنماط CSS مخصصة
                      </CardTitle>
                      <CardDescription>
                        أضف أنماط CSS مخصصة لتحكم أكبر في التصميم
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={settings.customStyles || ''}
                        onChange={(e) => handleSettingsChange('customStyles', e.target.value)}
                        placeholder="/* أضف أنماط CSS مخصصة هنا */&#10;.custom-style {&#10;  font-weight: bold;&#10;  color: #2563EB;&#10;}"
                        className="font-mono text-sm min-h-[200px]"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        💡 يمكنك استخدام متغيرات CSS مثل var(--primary-color) للوصول للألوان المخصصة
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>إعدادات متقدمة</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="logo-url">رابط الشعار</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            id="logo-url"
                            value={settings.logoUrl || ''}
                            onChange={(e) => handleSettingsChange('logoUrl', e.target.value)}
                            placeholder="https://example.com/logo.png"
                            className="flex-1"
                          />
                          <Button variant="outline" size="sm">
                            <Upload className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>

          {/* Preview Panel */}
          <div className="w-96 border-l bg-gray-50">
            <div className="p-4 border-b bg-white">
              <h3 className="font-semibold flex items-center gap-2">
                <Eye className="w-4 h-4" />
                معاينة مباشرة
              </h3>
              <p className="text-sm text-muted-foreground">
                {selectedTemplate ? selectedTemplate.nameAr : 'لم يتم اختيار قالب'}
              </p>
            </div>
            <div className="p-4 space-y-3">
              <Button onClick={generatePreview} className="w-full" variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                تحديث المعاينة
              </Button>
              
              {isPreviewMode && previewContent && (
                <div className="space-y-2">
                  <iframe
                    srcDoc={previewContent}
                    className="w-full h-64 border rounded border-gray-200"
                    title="معاينة الطباعة"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onPreview(settings)}
                      className="text-xs"
                    >
                      <Monitor className="w-3 h-3 mr-1" />
                      معاينة كاملة
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDownloadPDF(settings)}
                      className="text-xs"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      تحميل PDF
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {selectedTemplate && (
              <div className="p-4 border-t">
                <h4 className="font-medium mb-2">تفاصيل القالب</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الحجم:</span>
                    <span>{selectedTemplate.settings.pageSize}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الاتجاه:</span>
                    <span>{selectedTemplate.settings.orientation === 'portrait' ? 'عمودي' : 'أفقي'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الاتجاه:</span>
                    <span>{selectedTemplate.settings.rtl ? 'من اليمين لليسار' : 'من اليسار لليمين'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الرأس/التذييل:</span>
                    <span>{selectedTemplate.settings.headerFooter ? '✓ مفعل' : '✗ معطل'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={resetToDefaults}>
              <RefreshCw className="w-4 h-4 mr-2" />
              إعادة تعيين
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onPreview(settings)}>
              <Eye className="w-4 h-4 mr-2" />
              معاينة
            </Button>
            <Button onClick={() => onApplySettings(settings)}>
              <Save className="w-4 h-4 mr-2" />
              حفظ وتطبيق
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}