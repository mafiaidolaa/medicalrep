"use client";

import React, { useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Printer, Download, Eye, X, FileText, 
  Share, Settings, RefreshCw
} from 'lucide-react';
import { Order, Clinic, Product, User } from '@/lib/types';
import { PrintOrderTemplate } from './print-order-template';
import { useToast } from '@/hooks/use-toast';

interface PrintOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order;
  clinic?: Clinic;
  representative?: User;
  products?: Product[];
  companyInfo?: {
    name: string;
    address: string;
    phone: string;
    email: string;
    website?: string;
    logo?: string;
  };
}

export function PrintOrderDialog({
  open,
  onOpenChange,
  order,
  clinic,
  representative,
  products = [],
  companyInfo
}: PrintOrderDialogProps) {
  const { toast } = useToast();
  const componentRef = useRef<HTMLDivElement>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `طلب-${order.orderNumber}`,
    onBeforeGetContent: () => {
      setIsPrinting(true);
      return Promise.resolve();
    },
    onAfterPrint: () => {
      setIsPrinting(false);
      toast({
        title: "تم إرسال الطلب للطباعة",
        description: "تم إرسال الفاتورة إلى الطابعة بنجاح",
      });
    },
    onPrintError: (error) => {
      setIsPrinting(false);
      console.error('Print error:', error);
      toast({
        title: "خطأ في الطباعة",
        description: "حدث خطأ أثناء محاولة الطباعة، يرجى المحاولة مرة أخرى",
        variant: "destructive"
      });
    },
    removeAfterPrint: false,
    pageStyle: `
      @page {
        size: A4;
        margin: 1cm;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          color-adjust: exact;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .print-template {
          margin: 0;
          padding: 0;
          box-shadow: none;
          border: none;
        }
      }
    `,
  });

  const handleDownloadPDF = async () => {
    try {
      // This would implement PDF generation using jsPDF or similar
      toast({
        title: "تحميل PDF",
        description: "ميزة تحميل PDF ستكون متاحة قريباً",
      });
    } catch (error) {
      console.error('PDF download error:', error);
      toast({
        title: "خطأ في التحميل",
        description: "حدث خطأ أثناء تحميل ملف PDF",
        variant: "destructive"
      });
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `طلب ${order.orderNumber}`,
          text: `طلب من ${clinic?.name || 'عيادة'} بقيمة ${order.total?.toFixed(2)} ج.م`,
          url: window.location.href
        });
      } else {
        // Fallback to copying link
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "تم نسخ الرابط",
          description: "تم نسخ رابط الطلب إلى الحافظة",
        });
      }
    } catch (error) {
      console.error('Share error:', error);
      toast({
        title: "خطأ في المشاركة",
        description: "حدث خطأ أثناء محاولة مشاركة الطلب",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col" dir="rtl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Printer className="h-5 w-5" />
                طباعة الطلب #{order.orderNumber}
              </DialogTitle>
              <DialogDescription>
                معاينة وطباعة تفاصيل الطلب
              </DialogDescription>
            </div>
            
            {/* Status Badge */}
            <Badge 
              variant={order.status === 'approved' ? 'default' : 'secondary'}
              className="text-sm"
            >
              {order.status === 'approved' && 'معتمد'}
              {order.status === 'pending' && 'قيد المراجعة'}
              {order.status === 'rejected' && 'مرفوض'}
              {order.status === 'delivered' && 'تم التسليم'}
              {order.status === 'cancelled' && 'ملغى'}
            </Badge>
          </div>
        </DialogHeader>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 py-4 border-b">
          <Button
            onClick={handlePrint}
            disabled={isPrinting}
            className="flex items-center gap-2"
          >
            {isPrinting ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Printer className="h-4 w-4" />
            )}
            {isPrinting ? 'جاري الطباعة...' : 'طباعة'}
          </Button>

          <Button
            variant="outline"
            onClick={handleDownloadPDF}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            تحميل PDF
          </Button>

          <Button
            variant="outline"
            onClick={handleShare}
            className="flex items-center gap-2"
          >
            <Share className="h-4 w-4" />
            مشاركة
          </Button>

          <div className="flex-1" />

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant={isPreviewMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsPreviewMode(true)}
              className="flex items-center gap-1"
            >
              <Eye className="h-4 w-4" />
              معاينة
            </Button>
            <Button
              variant={!isPreviewMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsPreviewMode(false)}
              className="flex items-center gap-1"
            >
              <Settings className="h-4 w-4" />
              إعدادات
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {isPreviewMode ? (
            /* Print Preview */
            <div className="bg-gray-100 p-4 h-full">
              <div className="bg-white shadow-lg mx-auto" style={{ width: '21cm', minHeight: '29.7cm' }}>
                <div ref={componentRef}>
                  <PrintOrderTemplate
                    order={order}
                    clinic={clinic}
                    representative={representative}
                    products={products}
                    companyInfo={companyInfo}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Settings Panel */
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">إعدادات الطباعة</h3>
                
                <div className="grid grid-cols-2 gap-6">
                  {/* Order Info Settings */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">معلومات الطلب</h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-gray-600">رقم الطلب:</span>
                        <span className="font-mono">{order.orderNumber}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-gray-600">تاريخ الطلب:</span>
                        <span>{new Date(order.orderDate).toLocaleDateString('ar-EG')}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-gray-600">العيادة:</span>
                        <span>{clinic?.name || order.clinicId}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-gray-600">المندوب:</span>
                        <span>{representative?.fullName || order.representativeName}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-gray-600">المجموع:</span>
                        <span className="font-bold">{order.total?.toFixed(2)} ج.م</span>
                      </div>
                    </div>
                  </div>

                  {/* Print Options */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">خيارات الطباعة</h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span>تضمين شعار الشركة</span>
                        <input type="checkbox" defaultChecked className="rounded" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span>إظهار تفاصيل العيادة</span>
                        <input type="checkbox" defaultChecked className="rounded" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span>إظهار ملاحظات الطلب</span>
                        <input type="checkbox" defaultChecked className="rounded" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span>إظهار تفاصيل الخصومات</span>
                        <input type="checkbox" defaultChecked className="rounded" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span>إظهار معلومات الاعتماد</span>
                        <input type="checkbox" defaultChecked className="rounded" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Company Info */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">معلومات الشركة</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      اسم الشركة
                    </label>
                    <input
                      type="text"
                      defaultValue={companyInfo?.name || 'مجموعة إتيوپاتيك'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      العنوان
                    </label>
                    <input
                      type="text"
                      defaultValue={companyInfo?.address || 'القاهرة، مصر'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      الهاتف
                    </label>
                    <input
                      type="text"
                      defaultValue={companyInfo?.phone || '+20 123 456 7890'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      البريد الإلكتروني
                    </label>
                    <input
                      type="email"
                      defaultValue={companyInfo?.email || 'info@etiopathic.com'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t pt-4 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            المعاينة قد تختلف عن النتيجة النهائية للطباعة
          </div>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            إغلاق
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}