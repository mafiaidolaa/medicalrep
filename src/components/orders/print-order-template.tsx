"use client";

import React from 'react';
import { Order, OrderItem, Clinic, Product, User } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, MapPin, Phone, Mail, User as UserIcon,
  Package2, DollarSign, FileText, CheckCircle,
  Building2, Stethoscope, CreditCard, Banknote,
  Clock, AlertCircle, Truck, XCircle
} from 'lucide-react';

interface PrintOrderTemplateProps {
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

export function PrintOrderTemplate({ 
  order, 
  clinic, 
  representative, 
  products = [],
  companyInfo = {
    name: 'مجموعة إتيوپاتيك',
    address: 'القاهرة، مصر',
    phone: '+20 123 456 7890',
    email: 'info@etiopathic.com',
    website: 'www.etiopathic.com'
  }
}: PrintOrderTemplateProps) {
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'delivered': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      case 'delivered': return <Truck className="h-4 w-4" />;
      case 'cancelled': return <AlertCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'معتمد';
      case 'pending': return 'قيد المراجعة';
      case 'rejected': return 'مرفوض';
      case 'delivered': return 'تم التسليم';
      case 'cancelled': return 'ملغى';
      default: return status;
    }
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'cash': return 'نقدي';
      case 'bank_transfer': return 'تحويل بنكي';
      case 'deferred': return 'آجل';
      default: return method;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return 'عاجل';
      case 'medium': return 'متوسط';
      case 'low': return 'منخفض';
      default: return priority;
    }
  };

  return (
    <div className="print-template w-full max-w-4xl mx-auto bg-white p-8 text-black" dir="rtl">
      {/* Company Header */}
      <div className="flex items-start justify-between border-b-2 border-blue-600 pb-6 mb-8">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-blue-900 mb-2">
            {companyInfo.name}
          </h1>
          <div className="space-y-1 text-gray-600">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{companyInfo.address}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <span>{companyInfo.phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>{companyInfo.email}</span>
            </div>
            {companyInfo.website && (
              <div className="text-blue-600">
                {companyInfo.website}
              </div>
            )}
          </div>
        </div>
        
        {/* Order Status Badge */}
        <div className="text-left">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium ${getStatusColor(order.status)}`}>
            {getStatusIcon(order.status)}
            {getStatusText(order.status)}
          </div>
        </div>
      </div>

      {/* Order Info Header */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            معلومات الطلب
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">رقم الطلب:</span>
              <span className="font-mono font-bold text-blue-900">{order.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">تاريخ الطلب:</span>
              <span className="font-medium">{new Date(order.orderDate).toLocaleDateString('ar-EG')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">الأولوية:</span>
              <span className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(order.priority || 'medium')}`}>
                {getPriorityText(order.priority || 'medium')}
              </span>
            </div>
            {order.dueDate && (
              <div className="flex justify-between">
                <span className="text-gray-600">تاريخ الاستحقاق:</span>
                <span className="font-medium">{new Date(order.dueDate).toLocaleDateString('ar-EG')}</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            معلومات العيادة
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">اسم العيادة:</span>
              <span className="font-medium">{clinic?.name || order.clinicId}</span>
            </div>
            {clinic?.address && (
              <div className="flex justify-between">
                <span className="text-gray-600">العنوان:</span>
                <span className="font-medium">{clinic.address}</span>
              </div>
            )}
            {clinic?.phone && (
              <div className="flex justify-between">
                <span className="text-gray-600">الهاتف:</span>
                <span className="font-medium">{clinic.phone}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">المندوب:</span>
              <span className="font-medium">{representative?.fullName || order.representativeName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Package2 className="h-5 w-5 text-blue-600" />
          تفاصيل المنتجات
        </h2>
        
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المنتج
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الكمية
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  السعر
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الخصم
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المجموع
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {order.items.map((item: OrderItem, index: number) => {
                const product = products.find(p => p.id === item.productId);
                const itemTotal = (item.unitPrice || 0) * item.quantity;
                const discountAmount = ((item.discount || 0) / 100) * itemTotal;
                const finalTotal = itemTotal - discountAmount;
                
                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div>
                        <div className="font-medium text-gray-900">
                          {product?.name || item.productId}
                        </div>
                        {product?.productLine && (
                          <div className="text-sm text-gray-500">
                            {product.productLine}
                          </div>
                        )}
                        {item.notes && (
                          <div className="text-xs text-gray-400 mt-1">
                            {item.notes}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {item.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center font-medium">
                      {(item.unitPrice || 0).toFixed(2)} ج.م
                    </td>
                    <td className="px-4 py-4 text-center">
                      {item.discount ? (
                        <span className="text-red-600 font-medium">
                          {item.discount}%
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center font-bold">
                      {finalTotal.toFixed(2)} ج.م
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Summary */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          {order.notes && (
            <>
              <h3 className="text-lg font-bold text-gray-900 mb-3">ملاحظات</h3>
              <div className="bg-gray-50 border rounded-lg p-4">
                <p className="text-gray-700 leading-relaxed">{order.notes}</p>
              </div>
            </>
          )}
        </div>

        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">ملخص الطلب</h3>
          <div className="bg-gray-50 border rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">المجموع الفرعي:</span>
              <span className="font-medium">{(order.subtotal || 0).toFixed(2)} ج.م</span>
            </div>
            
            {order.discount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>خصم الطلب ({order.discountPercentage || 0}%):</span>
                <span className="font-medium">-{order.discount.toFixed(2)} ج.م</span>
              </div>
            )}
            
            <Separator />
            
            <div className="flex justify-between text-lg font-bold text-gray-900">
              <span>المجموع الإجمالي:</span>
              <span>{(order.total || 0).toFixed(2)} ج.م</span>
            </div>
            
            <div className="flex justify-between items-center pt-2">
              <span className="text-gray-600">طريقة الدفع:</span>
              <div className="flex items-center gap-2">
                {order.paymentMethod === 'cash' && <Banknote className="h-4 w-4 text-green-600" />}
                {order.paymentMethod === 'bank_transfer' && <CreditCard className="h-4 w-4 text-blue-600" />}
                {order.paymentMethod === 'deferred' && <Clock className="h-4 w-4 text-orange-600" />}
                <span className="font-medium">
                  {getPaymentMethodText(order.paymentMethod || 'cash')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Approval Info */}
      {order.approvedBy && order.approvedAt && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-bold text-gray-900 mb-3">معلومات الاعتماد</h3>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-800 mb-2">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">تم اعتماد الطلب</span>
            </div>
            <div className="text-sm text-green-700 space-y-1">
              <div>معتمد من: {order.approvedBy}</div>
              <div>تاريخ الاعتماد: {new Date(order.approvedAt).toLocaleString('ar-EG')}</div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t mt-8 pt-6 text-center text-gray-500">
        <div className="text-sm">
          تم إنشاء هذه الفاتورة تلقائياً بواسطة نظام إدارة الطلبات
        </div>
        <div className="text-xs mt-1">
          تاريخ الطباعة: {new Date().toLocaleString('ar-EG')}
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          .print-template {
            margin: 0;
            padding: 20px;
            box-shadow: none;
            border: none;
          }
          
          body {
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          
          @page {
            margin: 1cm;
            size: A4;
          }
        }
      `}</style>
    </div>
  );
}