'use client';

import { forwardRef } from 'react';

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

interface PrintTemplateProps {
  order: Order;
  companyInfo?: {
    name: string;
    logo?: string;
    address: string;
    phone: string;
    email: string;
    website?: string;
  };
}

export const OrderPrintTemplate = forwardRef<HTMLDivElement, PrintTemplateProps>(
  ({ order, companyInfo }, ref) => {
    const defaultCompanyInfo = {
      name: 'مجموعة EP الطبية',
      address: 'الرياض، المملكة العربية السعودية',
      phone: '+966 11 123 4567',
      email: 'info@ep-group.com',
      website: 'www.ep-group.com',
      ...companyInfo
    };

    const getPaymentMethodLabel = (method: string) => {
      switch (method) {
        case 'cash':
          return 'نقداً';
        case 'card':
          return 'بطاقة';
        case 'bank_transfer':
          return 'تحويل بنكي';
        case 'credit':
          return 'آجل';
        default:
          return method;
      }
    };

    const getStatusLabel = (status: string) => {
      switch (status) {
        case 'pending':
          return 'في الانتظار';
        case 'approved':
          return 'موافق عليه';
        case 'rejected':
          return 'مرفوض';
        case 'delivered':
          return 'تم التسليم';
        case 'cancelled':
          return 'ملغي';
        default:
          return status;
      }
    };

    return (
      <div ref={ref} className="bg-white p-8 max-w-4xl mx-auto" dir="rtl">
        <style jsx global>{`
          @media print {
            body { 
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
            }
            .print-hidden {
              display: none !important;
            }
            .page-break {
              page-break-before: always;
            }
          }
        `}</style>

        {/* Header */}
        <div className="border-b-2 border-gray-800 pb-6 mb-8">
          <div className="flex justify-between items-start">
            <div>
              {defaultCompanyInfo.logo ? (
                <img
                  src={defaultCompanyInfo.logo}
                  alt="Company Logo"
                  className="h-16 mb-4"
                />
              ) : (
                <div className="h-16 w-32 bg-gray-200 flex items-center justify-center mb-4 rounded">
                  <span className="text-sm text-gray-600">شعار الشركة</span>
                </div>
              )}
              <h1 className="text-2xl font-bold text-gray-800">
                {defaultCompanyInfo.name}
              </h1>
              <div className="text-sm text-gray-600 mt-2 space-y-1">
                <p>{defaultCompanyInfo.address}</p>
                <p>هاتف: {defaultCompanyInfo.phone}</p>
                <p>البريد الإلكتروني: {defaultCompanyInfo.email}</p>
                {defaultCompanyInfo.website && (
                  <p>الموقع: {defaultCompanyInfo.website}</p>
                )}
              </div>
            </div>
            
            <div className="text-left">
              <div className="bg-gray-100 p-4 rounded-lg">
                <h2 className="text-xl font-bold text-gray-800 mb-2">
                  طلب رقم
                </h2>
                <p className="text-2xl font-bold text-blue-600">
                  {order.order_number}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  تاريخ الطلب: {new Date(order.created_at).toLocaleDateString('ar-SA')}
                </p>
                <p className="text-sm text-gray-600">
                  الوقت: {new Date(order.created_at).toLocaleTimeString('ar-SA')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Customer & Order Info */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">
              معلومات العميل
            </h3>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">الاسم:</span> {order.customer_name}</p>
              <p><span className="font-medium">العيادة:</span> {order.clinic_name}</p>
              <p><span className="font-medium">طريقة الدفع:</span> {getPaymentMethodLabel(order.payment_method)}</p>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">
              معلومات الطلب
            </h3>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">الحالة:</span> {getStatusLabel(order.status)}</p>
              <p><span className="font-medium">تاريخ آخر تحديث:</span> {new Date(order.updated_at).toLocaleDateString('ar-SA')}</p>
              {order.notes && (
                <p><span className="font-medium">ملاحظات:</span> {order.notes}</p>
              )}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">
            تفاصيل الطلب
          </h3>
          
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-3 text-right font-semibold">م</th>
                <th className="border border-gray-300 p-3 text-right font-semibold">اسم المنتج</th>
                <th className="border border-gray-300 p-3 text-center font-semibold">الكمية</th>
                <th className="border border-gray-300 p-3 text-center font-semibold">سعر الوحدة</th>
                <th className="border border-gray-300 p-3 text-center font-semibold">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="border border-gray-300 p-3 text-center">{index + 1}</td>
                  <td className="border border-gray-300 p-3">{item.product_name}</td>
                  <td className="border border-gray-300 p-3 text-center">{item.quantity}</td>
                  <td className="border border-gray-300 p-3 text-center">{item.unit_price.toFixed(2)} ر.س</td>
                  <td className="border border-gray-300 p-3 text-center font-semibold">
                    {item.total_price.toFixed(2)} ر.س
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-80">
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
              <div className="space-y-3">
                <div className="flex justify-between text-lg">
                  <span>المجموع الفرعي:</span>
                  <span>{order.total_amount.toFixed(2)} ر.س</span>
                </div>
                
                {order.discount > 0 && (
                  <div className="flex justify-between text-lg text-red-600">
                    <span>الخصم:</span>
                    <span>-{order.discount.toFixed(2)} ر.س</span>
                  </div>
                )}
                
                <hr className="border-gray-300" />
                
                <div className="flex justify-between text-xl font-bold">
                  <span>الإجمالي النهائي:</span>
                  <span className="text-blue-600">{order.final_amount.toFixed(2)} ر.س</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-300">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">الشروط والأحكام:</h4>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• جميع الأسعار شاملة ضريبة القيمة المضافة</li>
                <li>• يجب سداد المبلغ خلال 30 يوم من تاريخ الفاتورة</li>
                <li>• لا يمكن إرجاع البضائع إلا في حالة العيب</li>
                <li>• شكراً لثقتكم بخدماتنا</li>
              </ul>
            </div>
            
            <div className="text-left">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-gray-800">توقيع المسؤول</p>
                  <div className="border-b border-gray-400 w-40 h-8 mt-2"></div>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600">
                    طُبع في: {new Date().toLocaleDateString('ar-SA')} {new Date().toLocaleTimeString('ar-SA')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* QR Code placeholder */}
        <div className="mt-8 text-center">
          <div className="inline-block">
            <div className="w-20 h-20 bg-gray-200 border border-gray-400 rounded flex items-center justify-center mx-auto">
              <span className="text-xs text-gray-600">QR Code</span>
            </div>
            <p className="text-xs text-gray-600 mt-1">للتحقق من الطلب</p>
          </div>
        </div>
      </div>
    );
  }
);

OrderPrintTemplate.displayName = 'OrderPrintTemplate';

export default OrderPrintTemplate;