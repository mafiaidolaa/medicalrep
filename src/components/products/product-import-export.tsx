"use client";

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Download, 
  Upload, 
  FileText, 
  AlertCircle, 
  CheckCircle,
  Loader2,
  Package,
  FileSpreadsheet
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Product, Line } from '@/hooks/use-products';

interface ProductImportExportProps {
  products: Product[];
  lines: Line[];
  onImportComplete?: (products: Product[]) => void;
  className?: string;
}

interface ImportResult {
  success: boolean;
  totalProducts: number;
  importedProducts: number;
  errors: string[];
  warnings: string[];
}

export default function ProductImportExport({
  products,
  lines,
  onImportComplete,
  className = ""
}: ProductImportExportProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // تصدير المنتجات إلى CSV
  const exportToCSV = async () => {
    try {
      setIsExporting(true);
      
      // إنشاء CSV headers
      const headers = [
        'ID',
        'الاسم',
        'الوصف',
        'الخط',
        'السعر',
        'التكلفة',
        'الكمية',
        'الحد الأدنى للمخزون',
        'الحد الأقصى للمخزون',
        'رمز المنتج',
        'الباركود',
        'الوحدة',
        'الماركة',
        'المورد',
        'تاريخ الانتهاء',
        'تاريخ التصنيع',
        'موقع التخزين',
        'ملاحظات',
        'العلامات',
        'الحالة',
        'تاريخ الإنشاء',
        'تاريخ التحديث'
      ];
      
      // تحويل المنتجات إلى CSV rows
      const csvData = products.map(product => [
        product.id,
        `"${product.name}"`,
        `"${product.description || ''}"`,
        `"${product.line}"`,
        product.price,
        product.cost || '',
        product.quantity,
        product.minStock,
        product.maxStock || '',
        `"${product.sku}"`,
        `"${product.barcode || ''}"`,
        `"${product.unit}"`,
        `"${product.brand || ''}"`,
        `"${product.supplier || ''}"`,
        product.expiryDate ? product.expiryDate.toISOString().split('T')[0] : '',
        product.manufacturingDate ? product.manufacturingDate.toISOString().split('T')[0] : '',
        `"${product.storageLocation || ''}"`,
        `"${product.notes || ''}"`,
        `"${product.tags?.join(';') || ''}"`,
        product.status,
        product.createdAt.toISOString(),
        product.updatedAt.toISOString()
      ]);
      
      // إنشاء محتوى CSV
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => row.join(','))
      ].join('\n');
      
      // إنشاء وتحميل الملف
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `products_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "تم التصدير بنجاح",
        description: `تم تصدير ${products.length} منتج إلى ملف CSV`
      });
      
    } catch (error) {
      toast({
        title: "خطأ في التصدير",
        description: "حدث خطأ أثناء تصدير المنتجات",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  // تصدير الخطوط إلى CSV
  const exportLinesToCSV = async () => {
    try {
      setIsExporting(true);
      
      const headers = ['ID', 'الاسم', 'الوصف', 'اللون', 'نشط', 'تاريخ الإنشاء', 'تاريخ التحديث'];
      const csvData = lines.map(line => [
        line.id,
        `"${line.name}"`,
        `"${line.description || ''}"`,
        line.color,
        line.isActive ? 'نعم' : 'لا',
        line.createdAt.toISOString(),
        line.updatedAt.toISOString()
      ]);
      
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => row.join(','))
      ].join('\n');
      
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `lines_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "تم التصدير بنجاح",
        description: `تم تصدير ${lines.length} خط إلى ملف CSV`
      });
      
    } catch (error) {
      toast({
        title: "خطأ في التصدير",
        description: "حدث خطأ أثناء تصدير الخطوط",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  // استيراد المنتجات من CSV
  const importFromCSV = async (file: File) => {
    try {
      setIsImporting(true);
      setImportProgress(10);
      
      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',');
      
      setImportProgress(30);
      
      const importedProducts: Product[] = [];
      const errors: string[] = [];
      const warnings: string[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        try {
          const values = lines[i].split(',');
          
          // التحقق من صحة البيانات الأساسية
          if (values.length < 22) {
            errors.push(`الصف ${i + 1}: بيانات ناقصة`);
            continue;
          }
          
          const product: Product = {
            id: values[0] || `prod-${Date.now()}-${i}`,
            name: values[1]?.replace(/"/g, '') || '',
            description: values[2]?.replace(/"/g, '') || undefined,
            line: values[3]?.replace(/"/g, '') || '',
            price: parseFloat(values[4]) || 0,
            cost: parseFloat(values[5]) || undefined,
            quantity: parseInt(values[6]) || 0,
            minStock: parseInt(values[7]) || 0,
            maxStock: parseInt(values[8]) || undefined,
            sku: values[9]?.replace(/"/g, '') || '',
            barcode: values[10]?.replace(/"/g, '') || undefined,
            unit: values[11]?.replace(/"/g, '') || '',
            brand: values[12]?.replace(/"/g, '') || undefined,
            supplier: values[13]?.replace(/"/g, '') || undefined,
            expiryDate: values[14] ? new Date(values[14]) : undefined,
            manufacturingDate: values[15] ? new Date(values[15]) : undefined,
            storageLocation: values[16]?.replace(/"/g, '') || undefined,
            notes: values[17]?.replace(/"/g, '') || undefined,
            tags: values[18]?.replace(/"/g, '').split(';').filter(tag => tag.trim()) || [],
            status: (values[19] as any) || 'active',
            createdAt: values[20] ? new Date(values[20]) : new Date(),
            updatedAt: values[21] ? new Date(values[21]) : new Date()
          };
          
          // التحقق من صحة البيانات
          if (!product.name) {
            errors.push(`الصف ${i + 1}: اسم المنتج مطلوب`);
            continue;
          }
          
          if (!product.line) {
            errors.push(`الصف ${i + 1}: الخط مطلوب`);
            continue;
          }
          
          // التحقق من وجود الخط
          const lineExists = lines.some(l => l === product.line);
          if (!lineExists) {
            warnings.push(`الصف ${i + 1}: الخط "${product.line}" غير موجود`);
          }
          
          importedProducts.push(product);
          
        } catch (error) {
          errors.push(`الصف ${i + 1}: خطأ في معالجة البيانات`);
        }
        
        setImportProgress(30 + (i / lines.length) * 60);
      }
      
      setImportProgress(100);
      
      const result: ImportResult = {
        success: importedProducts.length > 0,
        totalProducts: lines.length - 1,
        importedProducts: importedProducts.length,
        errors,
        warnings
      };
      
      setImportResult(result);
      
      if (result.success && onImportComplete) {
        onImportComplete(importedProducts);
      }
      
      if (result.success) {
        toast({
          title: "تم الاستيراد بنجاح",
          description: `تم استيراد ${result.importedProducts} منتج من أصل ${result.totalProducts}`
        });
      } else {
        toast({
          title: "فشل في الاستيراد",
          description: "لم يتم استيراد أي منتجات",
          variant: "destructive"
        });
      }
      
    } catch (error) {
      toast({
        title: "خطأ في قراءة الملف",
        description: "تعذر قراءة ملف CSV المحدد",
        variant: "destructive"
      });
      setImportResult({
        success: false,
        totalProducts: 0,
        importedProducts: 0,
        errors: ["خطأ في قراءة الملف"],
        warnings: []
      });
    } finally {
      setIsImporting(false);
      setTimeout(() => setImportProgress(0), 2000);
    }
  };

  // التعامل مع تحديد الملف للاستيراد
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setImportResult(null);
      importFromCSV(file);
    } else {
      toast({
        title: "نوع ملف غير صحيح",
        description: "يجب اختيار ملف CSV فقط",
        variant: "destructive"
      });
    }
  };

  // تنزيل قالب CSV للاستيراد
  const downloadTemplate = () => {
    const headers = [
      'ID',
      'الاسم',
      'الوصف',
      'الخط',
      'السعر',
      'التكلفة',
      'الكمية',
      'الحد الأدنى للمخزون',
      'الحد الأقصى للمخزون',
      'رمز المنتج',
      'الباركود',
      'الوحدة',
      'الماركة',
      'المورد',
      'تاريخ الانتهاء',
      'تاريخ التصنيع',
      'موقع التخزين',
      'ملاحظات',
      'العلامات',
      'الحالة',
      'تاريخ الإنشاء',
      'تاريخ التحديث'
    ];
    
    const sampleRow = [
      'prod-sample-1',
      '"منتج تجريبي"',
      '"وصف المنتج التجريبي"',
      '"خط الأدوية"',
      '25.50',
      '15.00',
      '100',
      '20',
      '200',
      '"PRD-SAMPLE-001"',
      '""',
      '"علبة"',
      '"ماركة تجريبية"',
      '"مورد تجريبي"',
      '2025-12-31',
      '2024-01-01',
      '"المستودع الرئيسي"',
      '"ملاحظات تجريبية"',
      '"علامة1;علامة2"',
      'active',
      new Date().toISOString(),
      new Date().toISOString()
    ];
    
    const csvContent = [
      headers.join(','),
      sampleRow.join(',')
    ].join('\n');
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'product_import_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "تم تنزيل القالب",
      description: "تم تنزيل قالب استيراد المنتجات"
    });
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* قسم التصدير */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            تصدير البيانات
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h3 className="font-medium flex items-center gap-2">
                <Package className="h-4 w-4" />
                تصدير المنتجات ({products.length})
              </h3>
              <p className="text-sm text-muted-foreground">
                تصدير جميع بيانات المنتجات إلى ملف CSV
              </p>
              <Button
                onClick={exportToCSV}
                disabled={isExporting || products.length === 0}
                className="w-full"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                )}
                تصدير المنتجات
              </Button>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                تصدير الخطوط ({lines.length})
              </h3>
              <p className="text-sm text-muted-foreground">
                تصدير جميع بيانات الخطوط إلى ملف CSV
              </p>
              <Button
                onClick={exportLinesToCSV}
                disabled={isExporting || lines.length === 0}
                variant="outline"
                className="w-full"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                )}
                تصدير الخطوط
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* قسم الاستيراد */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            استيراد المنتجات
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label htmlFor="csv-import">اختر ملف CSV للاستيراد</Label>
            <div className="flex gap-2">
              <Input
                id="csv-import"
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleFileSelect}
                disabled={isImporting}
              />
              <Button
                onClick={downloadTemplate}
                variant="outline"
                disabled={isImporting}
              >
                <Download className="h-4 w-4 mr-2" />
                تنزيل القالب
              </Button>
            </div>
            
            {isImporting && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">جاري الاستيراد...</span>
                </div>
                <Progress value={importProgress} className="w-full" />
              </div>
            )}
          </div>

          {/* نتائج الاستيراد */}
          {importResult && (
            <div className="space-y-3">
              <Alert className={importResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                <div className="flex items-center gap-2">
                  {importResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription className={importResult.success ? "text-green-800" : "text-red-800"}>
                    {importResult.success 
                      ? `تم استيراد ${importResult.importedProducts} منتج من أصل ${importResult.totalProducts} بنجاح`
                      : "فشل في عملية الاستيراد"
                    }
                  </AlertDescription>
                </div>
              </Alert>

              {importResult.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-red-600">الأخطاء:</h4>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {importResult.errors.map((error, index) => (
                      <Badge key={index} variant="destructive" className="text-xs">
                        {error}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {importResult.warnings.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-orange-600">تحذيرات:</h4>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {importResult.warnings.map((warning, index) => (
                      <Badge key={index} variant="outline" className="text-xs text-orange-600 border-orange-300">
                        {warning}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* معلومات إضافية */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">ملاحظات مهمة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground space-y-2">
            <p>• يجب أن يكون الملف من نوع CSV مع ترميز UTF-8</p>
            <p>• العمود الأول يجب أن يحتوي على رؤوس الأعمدة</p>
            <p>• الحقول المطلوبة: الاسم، الخط، السعر، الكمية، رمز المنتج، الوحدة</p>
            <p>• يمكن استخدام "؛" لفصل العلامات المتعددة</p>
            <p>• التواريخ يجب أن تكون بصيغة YYYY-MM-DD</p>
            <p>• قم بتنزيل القالب أولاً لضمان التنسيق الصحيح</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}