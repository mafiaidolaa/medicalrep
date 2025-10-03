"use client";

import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Download, 
  Layout, 
  FileImage, 
  X,
  Printer,
  Eye
} from 'lucide-react';
import { PrintTemplate } from '@/lib/brand-identity-system';

interface PrintTemplatePreviewProps {
  template: PrintTemplate;
  isOpen: boolean;
  onClose: () => void;
  companyInfo?: {
    name: string;
    nameEn?: string;
    address: string;
    phone: string;
    email: string;
    logo?: string;
  };
  brandColors?: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    border: string;
  };
  brandFonts?: {
    primary: string;
    secondary: string;
    sizes: Record<string, string>;
    weights: Record<string, number>;
  };
}

export default function PrintTemplatePreview({ 
  template, 
  isOpen, 
  onClose,
  companyInfo = {
    name: 'اسم الشركة',
    nameEn: 'Company Name',
    address: 'عنوان الشركة',
    phone: '+966 50 123 4567',
    email: 'info@company.com'
  },
  brandColors = {
    primary: '#0066CC',
    secondary: '#4A90E2',
    accent: '#FF6B6B',
    background: '#FFFFFF',
    text: '#1A1A1A',
    border: '#E5E7EB'
  },
  brandFonts = {
    primary: 'Cairo',
    secondary: 'Roboto',
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
  }
}: PrintTemplatePreviewProps) {
  
  const getTemplateIcon = (type: string) => {
    switch(type) {
      case 'invoice': return <FileText className="h-4 w-4" />;
      case 'receipt': return <Download className="h-4 w-4" />;
      case 'report': return <Layout className="h-4 w-4" />;
      default: return <FileImage className="h-4 w-4" />;
    }
  };

  const getTemplateTypeName = (type: string) => {
    switch(type) {
      case 'invoice': return 'فاتورة';
      case 'receipt': return 'إيصال';
      case 'report': return 'تقرير';
      case 'certificate': return 'شهادة';
      case 'statement': return 'كشف حساب';
      case 'contract': return 'عقد';
      default: return 'مستند';
    }
  };

  const getSampleData = () => {
    switch(template.type) {
      case 'invoice':
        return {
          title: 'فاتورة ضريبية',
          number: 'INV-2024-001',
          date: new Date().toLocaleDateString('ar-EG'),
          items: [
            { name: 'خدمة استشارية', quantity: 1, price: 1000, total: 1000 },
            { name: 'منتج تقني', quantity: 2, price: 500, total: 1000 },
            { name: 'دعم فني', quantity: 1, price: 300, total: 300 }
          ],
          subtotal: 2300,
          tax: 345,
          total: 2645
        };
      case 'receipt':
        return {
          title: 'إيصال استلام',
          number: 'REC-2024-001',
          date: new Date().toLocaleDateString('ar-EG'),
          amount: 1500,
          description: 'دفعة مقدمة لمشروع تطوير النظام'
        };
      case 'report':
        return {
          title: 'تقرير شهري',
          period: 'ديسمبر 2024',
          date: new Date().toLocaleDateString('ar-EG'),
          kpis: [
            { label: 'إجمالي المبيعات', value: '125,000 جنيه', change: '+12%' },
            { label: 'عدد العملاء', value: '48', change: '+5%' },
            { label: 'معدل الرضا', value: '4.8/5', change: '+0.2' }
          ]
        };
      default:
        return {
          title: 'مستند رسمي',
          date: new Date().toLocaleDateString('ar-EG'),
          content: 'هذا نموذج لمعاينة التصميم والتنسيق'
        };
    }
  };

  const sampleData = getSampleData();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getTemplateIcon(template.type)}
            معاينة قالب {getTemplateTypeName(template.type)}
          </DialogTitle>
          <DialogDescription>
            معاينة لشكل المستند عند الطباعة أو التصدير إلى PDF
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 h-[calc(90vh-120px)]">
          {/* معلومات القالب */}
          <div className="w-80 border-l pl-4 space-y-4 overflow-y-auto">
            <div className="space-y-2">
              <h4 className="font-semibold">معلومات القالب</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الاسم:</span>
                  <span>{template.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">النوع:</span>
                  <Badge variant="outline">{getTemplateTypeName(template.type)}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الحالة:</span>
                  <Badge className={template.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                    {template.enabled ? 'مفعل' : 'معطل'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">إعدادات التخطيط</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ارتفاع الرأس:</span>
                  <span>{template.headerHeight}px</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ارتفاع التذييل:</span>
                  <span>{template.footerHeight}px</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">موضع الشعار:</span>
                  <span>
                    {template.logoPosition === 'left' ? 'يسار' :
                     template.logoPosition === 'center' ? 'وسط' : 'يمين'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">لون التمييز:</span>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full border"
                      style={{ backgroundColor: template.accentColor }}
                    ></div>
                    <span className="font-mono text-xs">{template.accentColor}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">خيارات العرض</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">إظهار الشعار:</span>
                  <Badge variant={template.showLogo ? "default" : "secondary"}>
                    {template.showLogo ? 'نعم' : 'لا'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">العلامة المائية:</span>
                  <Badge variant={template.showWatermark ? "default" : "secondary"}>
                    {template.showWatermark ? 'نعم' : 'لا'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button size="sm" className="flex-1">
                <Printer className="h-3 w-3 mr-1" />
                طباعة تجريبية
              </Button>
              <Button size="sm" variant="outline" className="flex-1">
                <Download className="h-3 w-3 mr-1" />
                تصدير PDF
              </Button>
            </div>
          </div>

          {/* معاينة المستند */}
          <div className="flex-1 overflow-y-auto">
            <div 
              className="bg-white border shadow-sm mx-auto"
              style={{ 
                width: '210mm', // A4 width
                minHeight: '297mm', // A4 height
                fontFamily: brandFonts.primary,
                fontSize: brandFonts.sizes.sm,
                color: template.textColor || brandColors.text,
                backgroundColor: template.backgroundColor || brandColors.background,
                direction: 'rtl'
              }}
            >
              {/* رأس المستند */}
              <div 
                className="flex items-center border-b-2 p-4"
                style={{ 
                  height: `${template.headerHeight}px`,
                  justifyContent: template.logoPosition === 'center' ? 'center' : 
                                  template.logoPosition === 'right' ? 'flex-end' : 'flex-start',
                  borderBottomColor: template.accentColor
                }}
              >
                {template.showLogo && (
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center"
                      style={{ backgroundColor: `${template.accentColor}20` }}
                    >
                      <span style={{ color: template.accentColor, fontSize: '20px' }}>
                        شعار
                      </span>
                    </div>
                    <div>
                      <h2 
                        className="font-bold"
                        style={{ 
                          color: template.accentColor,
                          fontSize: brandFonts.sizes.lg,
                          fontWeight: brandFonts.weights.bold
                        }}
                      >
                        {companyInfo.name}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {companyInfo.address}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* محتوى المستند */}
              <div className="p-6 space-y-6">
                {/* عنوان المستند */}
                <div className="text-center">
                  <h1 
                    className="font-bold mb-2"
                    style={{
                      fontSize: brandFonts.sizes['2xl'],
                      fontWeight: brandFonts.weights.bold,
                      color: template.accentColor
                    }}
                  >
                    {sampleData.title}
                  </h1>
                  {sampleData.number && (
                    <p className="text-muted-foreground">
                      رقم المستند: {sampleData.number}
                    </p>
                  )}
                  <p className="text-muted-foreground">
                    التاريخ: {sampleData.date}
                  </p>
                </div>

                {/* محتوى خاص بنوع المستند */}
                {template.type === 'invoice' && (
                  <div className="space-y-4">
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr style={{ backgroundColor: `${template.accentColor}20` }}>
                            <th className="p-3 text-right font-semibold" style={{ color: template.accentColor }}>
                              البيان
                            </th>
                            <th className="p-3 text-center font-semibold" style={{ color: template.accentColor }}>
                              الكمية
                            </th>
                            <th className="p-3 text-center font-semibold" style={{ color: template.accentColor }}>
                              السعر
                            </th>
                            <th className="p-3 text-center font-semibold" style={{ color: template.accentColor }}>
                              المجموع
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sampleData.items?.map((item, index) => (
                            <tr key={index} className="border-t">
                              <td className="p-3">{item.name}</td>
                              <td className="p-3 text-center">{item.quantity}</td>
                              <td className="p-3 text-center">{item.price.toLocaleString()} جنيه</td>
                              <td className="p-3 text-center">{item.total.toLocaleString()} جنيه</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div 
                      className="border-2 rounded-lg p-4 mr-auto max-w-md"
                      style={{ borderColor: template.accentColor }}
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>المجموع الفرعي:</span>
                          <span>{sampleData.subtotal?.toLocaleString()} جنيه</span>
                        </div>
                        <div className="flex justify-between">
                          <span>ضريبة القيمة المضافة (15%):</span>
                          <span>{sampleData.tax?.toLocaleString()} جنيه</span>
                        </div>
                        <div 
                          className="flex justify-between font-bold text-lg border-t pt-2"
                          style={{ 
                            color: template.accentColor,
                            borderTopColor: template.accentColor 
                          }}
                        >
                          <span>المجموع الإجمالي:</span>
                          <span>{sampleData.total?.toLocaleString()} جنيه</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {template.type === 'receipt' && (
                  <div className="space-y-4">
                    <div 
                      className="border-2 rounded-lg p-6 text-center"
                      style={{ borderColor: template.accentColor }}
                    >
                      <h3 
                        className="text-2xl font-bold mb-4"
                        style={{ color: template.accentColor }}
                      >
                        {sampleData.amount?.toLocaleString()} جنيه
                      </h3>
                      <p className="text-muted-foreground">
                        {sampleData.description}
                      </p>
                    </div>
                  </div>
                )}

                {template.type === 'report' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      {sampleData.kpis?.map((kpi, index) => (
                        <div 
                          key={index}
                          className="border rounded-lg p-4 text-center"
                          style={{ 
                            backgroundColor: `${template.accentColor}10`,
                            borderColor: `${template.accentColor}30`
                          }}
                        >
                          <h4 
                            className="text-xl font-bold"
                            style={{ color: template.accentColor }}
                          >
                            {kpi.value}
                          </h4>
                          <p className="text-sm text-muted-foreground">{kpi.label}</p>
                          <p className="text-xs text-green-600">{kpi.change}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* تذييل المستند */}
              <div 
                className="border-t p-4 text-center text-xs text-muted-foreground mt-auto"
                style={{ 
                  height: `${template.footerHeight}px`,
                  borderTopColor: brandColors.border
                }}
              >
                {template.footerConfig?.showContactInfo && (
                  <div className="space-y-1">
                    <p>{companyInfo.phone} | {companyInfo.email}</p>
                    <p>{companyInfo.address}</p>
                  </div>
                )}
                {template.footerConfig?.customText && (
                  <p className="mt-2">{template.footerConfig.customText}</p>
                )}
              </div>

              {/* العلامة المائية */}
              {template.showWatermark && (
                <div 
                  className="fixed inset-0 flex items-center justify-center pointer-events-none"
                  style={{
                    transform: 'rotate(-45deg)',
                    opacity: 0.1,
                    fontSize: '72px',
                    fontWeight: brandFonts.weights.bold,
                    color: template.accentColor,
                    zIndex: -1
                  }}
                >
                  {companyInfo.name}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}