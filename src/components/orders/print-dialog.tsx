'use client';

import { useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Printer, Download, Eye, Settings } from 'lucide-react';
import OrderPrintTemplate from './print-template';

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Order {
  id: string;
  order_number: string;
  clinic_name: string;
  customer_name: string;
  status: 'pending' | 'approved' | 'rejected' | 'delivered' | 'cancelled';
  total_amount: number;
  discount: number;
  final_amount: number;
  payment_method: 'cash' | 'card' | 'bank_transfer' | 'credit';
  notes?: string;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

interface PrintDialogProps {
  order: Order;
  children?: React.ReactNode;
}

export default function PrintDialog({ order, children }: PrintDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [companyInfo, setCompanyInfo] = useState({
    name: 'مجموعة EP الطبية',
    address: 'الرياض، المملكة العربية السعودية',
    phone: '+966 11 123 4567',
    email: 'info@ep-group.com',
    website: 'www.ep-group.com'
  });

  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `طلب-${order.order_number}`,
    pageStyle: `
      @page {
        size: A4;
        margin: 20mm;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          color-adjust: exact;
        }
        .print-hidden {
          display: none !important;
        }
      }
    `,
    onBeforeGetContent: () => {
      return Promise.resolve();
    },
    onAfterPrint: () => {
      console.log('تم طباعة الطلب بنجاح');
    }
  });

  const handlePreview = () => {
    if (printRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html dir="rtl" lang="ar">
          <head>
            <title>معاينة الطلب - ${order.order_number}</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              ${document.head.innerHTML}
              body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 0;
                padding: 20px;
                background: #f5f5f5;
              }
              .preview-container {
                background: white;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                border-radius: 8px;
                overflow: hidden;
              }
            </style>
          </head>
          <body>
            <div class="preview-container">
              ${printRef.current.innerHTML}
            </div>
          </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
  };

  const handleDownloadPDF = async () => {
    // هنا يمكن إضافة منطق تحويل إلى PDF باستخدام مكتبة مثل jsPDF
    console.log('تحميل PDF للطلب:', order.order_number);
    // مؤقتاً سنستخدم الطباعة كـ PDF
    handlePrint();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            طباعة
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            طباعة الطلب رقم: {order.order_number}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* إعدادات الطباعة */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Settings className="h-4 w-4" />
                إعدادات الشركة
              </h3>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="company-name">اسم الشركة</Label>
                  <Input
                    id="company-name"
                    value={companyInfo.name}
                    onChange={(e) => setCompanyInfo(prev => ({
                      ...prev,
                      name: e.target.value
                    }))}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="company-address">العنوان</Label>
                  <Input
                    id="company-address"
                    value={companyInfo.address}
                    onChange={(e) => setCompanyInfo(prev => ({
                      ...prev,
                      address: e.target.value
                    }))}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="company-phone">الهاتف</Label>
                  <Input
                    id="company-phone"
                    value={companyInfo.phone}
                    onChange={(e) => setCompanyInfo(prev => ({
                      ...prev,
                      phone: e.target.value
                    }))}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="company-email">البريد الإلكتروني</Label>
                  <Input
                    id="company-email"
                    value={companyInfo.email}
                    onChange={(e) => setCompanyInfo(prev => ({
                      ...prev,
                      email: e.target.value
                    }))}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="company-website">الموقع الإلكتروني</Label>
                  <Input
                    id="company-website"
                    value={companyInfo.website}
                    onChange={(e) => setCompanyInfo(prev => ({
                      ...prev,
                      website: e.target.value
                    }))}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* أزرار الإجراءات */}
            <div className="space-y-2">
              <Button
                onClick={handlePrint}
                className="w-full flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                طباعة
              </Button>

              <Button
                onClick={handlePreview}
                variant="outline"
                className="w-full flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                معاينة
              </Button>

              <Button
                onClick={handleDownloadPDF}
                variant="outline"
                className="w-full flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                تحميل PDF
              </Button>
            </div>
          </div>

          {/* معاينة الطباعة */}
          <div className="lg:col-span-2">
            <div className="border rounded-lg bg-white shadow-sm max-h-[70vh] overflow-y-auto">
              <OrderPrintTemplate
                ref={printRef}
                order={order}
                companyInfo={companyInfo}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}