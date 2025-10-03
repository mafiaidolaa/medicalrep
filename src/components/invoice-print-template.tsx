"use client";

import React from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface InvoiceItem {
  id?: string;
  productId?: string;
  productName: string;
  item_name?: string;
  quantity: number;
  price?: number;
  unit_price?: number;
  discount_percentage?: number;
  discount_amount?: number;
  line_total?: number;
}

interface Invoice {
  id: string;
  invoice_number?: string;
  client_name?: string;
  clinicName?: string;
  amount?: number;
  total_amount?: number;
  total?: number;
  invoice_date?: string;
  orderDate?: string;
  created_at?: string;
  due_date?: string;
  status?: string;
  description?: string;
  notes?: string;
  discount_percentage?: number;
  discount_amount?: number;
  payment_method?: string;
  is_demo?: boolean;
  items?: InvoiceItem[];
  clinics?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
}

interface InvoicePrintTemplateProps {
  invoice: Invoice;
  companyInfo?: {
    name: string;
    name_ar: string;
    address: string;
    address_ar: string;
    phone: string;
    email: string;
    website?: string;
    logo?: string;
    tax_number?: string;
    commercial_register?: string;
  };
  showHeader?: boolean;
  showFooter?: boolean;
  language?: 'ar' | 'en';
}

export function InvoicePrintTemplate({ 
  invoice, 
  companyInfo, 
  showHeader = true, 
  showFooter = true,
  language = 'ar' 
}: InvoicePrintTemplateProps) {
  const isRTL = language === 'ar';

  const defaultCompanyInfo = {
    name: "EP Group Systems",
    name_ar: "مجموعة إي بي للأنظمة",
    address: "123 Business District, Cairo, Egypt",
    address_ar: "١٢٣ الحي التجاري، القاهرة، مصر",
    phone: "+20 123 456 7890",
    email: "info@epgroup-systems.com",
    website: "www.epgroup-systems.com",
    tax_number: "123-456-789",
    commercial_register: "CR-2024-001"
  };

  const company = companyInfo || defaultCompanyInfo;
  
  const invoiceNumber = invoice.invoice_number || `INV-${String(invoice.id).slice(-6)}`;
  const clientName = invoice.client_name || invoice.clinicName || invoice.clinics?.name || 'عميل غير محدد';
  const invoiceDate = invoice.invoice_date || invoice.orderDate || invoice.created_at || new Date().toISOString();
  const total = invoice.amount || invoice.total_amount || invoice.total || 0;
  const items = invoice.items || [];
  
  // Calculate subtotal and discounts
  const subtotal = items.reduce((sum, item) => {
    const price = item.price || item.unit_price || 0;
    return sum + (price * item.quantity);
  }, 0);
  
  const itemDiscounts = items.reduce((sum, item) => {
    const lineDiscount = (item.discount_amount || 0) + 
      ((item.discount_percentage || 0) / 100 * (item.price || item.unit_price || 0) * item.quantity);
    return sum + lineDiscount;
  }, 0);
  
  const invoiceDiscount = (invoice.discount_amount || 0) + 
    ((invoice.discount_percentage || 0) / 100 * subtotal);
  
  const totalDiscounts = itemDiscounts + invoiceDiscount;
  const finalTotal = subtotal - totalDiscounts;
  
  const isDemo = invoice.is_demo || (typeof total === 'number' && total === 0) || 
    (typeof invoice.description === 'string' && invoice.description.includes('[DEMO]'));

  // Print styles
  const printStyles = `
    @media print {
      @page {
        size: A4;
        margin: 15mm;
      }
      
      * {
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      .no-print {
        display: none !important;
      }
      
      .print-break-before {
        break-before: page;
      }
      
      .print-break-after {
        break-after: page;
      }
      
      body {
        font-family: 'Arial', 'Helvetica', sans-serif;
        line-height: 1.4;
        color: #000;
      }
      
      .invoice-header {
        border-bottom: 3px solid #2563eb;
        padding-bottom: 20px;
        margin-bottom: 30px;
      }
      
      .invoice-title {
        font-size: 24px;
        font-weight: bold;
        color: #2563eb;
      }
      
      .invoice-number {
        font-size: 18px;
        font-weight: bold;
        color: #1f2937;
      }
      
      .company-info {
        text-align: ${isRTL ? 'right' : 'left'};
      }
      
      .client-info {
        background-color: #f8fafc;
        padding: 15px;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
      }
      
      .invoice-details {
        background-color: #eff6ff;
        padding: 15px;
        border-radius: 8px;
        border: 1px solid #bfdbfe;
      }
      
      .items-table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
      }
      
      .items-table th,
      .items-table td {
        border: 1px solid #d1d5db;
        padding: 12px 8px;
        text-align: ${isRTL ? 'right' : 'left'};
      }
      
      .items-table th {
        background-color: #2563eb;
        color: white;
        font-weight: bold;
      }
      
      .items-table tbody tr:nth-child(even) {
        background-color: #f8fafc;
      }
      
      .totals-section {
        background-color: #f1f5f9;
        padding: 20px;
        border-radius: 8px;
        border: 1px solid #cbd5e1;
        margin-top: 20px;
      }
      
      .total-row {
        border-top: 2px solid #2563eb;
        font-weight: bold;
        font-size: 16px;
      }
      
      .demo-watermark {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-45deg);
        font-size: 80px;
        font-weight: bold;
        color: rgba(239, 68, 68, 0.1);
        z-index: -1;
        pointer-events: none;
      }
      
      .status-stamp {
        position: absolute;
        top: 20px;
        ${isRTL ? 'left: 20px' : 'right: 20px'};
        background: ${invoice.status === 'paid' ? '#10b981' : 
                     invoice.status === 'overdue' ? '#ef4444' : 
                     '#f59e0b'};
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-weight: bold;
        font-size: 14px;
        transform: rotate(-10deg);
      }
    }
    
    @media screen {
      .invoice-print-template {
        background: white;
        max-width: 210mm;
        margin: 0 auto;
        padding: 20px;
        box-shadow: 0 0 20px rgba(0,0,0,0.1);
        font-family: 'Arial', 'Helvetica', sans-serif;
        direction: ${isRTL ? 'rtl' : 'ltr'};
        position: relative;
      }
    }
  `;

  return (
    <>
      <style>{printStyles}</style>
      
      <div className="invoice-print-template" style={{ position: 'relative', background: 'white', fontFamily: 'Arial, sans-serif' }}>
        {isDemo && (
          <div className="demo-watermark">
            نموذج تجريبي
          </div>
        )}

        {/* Status Stamp */}
        {invoice.status && (
          <div className="status-stamp">
            {invoice.status === 'paid' ? 'مدفوعة' :
             invoice.status === 'overdue' ? 'متأخرة' :
             invoice.status === 'pending' ? 'معلقة' :
             'معتمدة'}
          </div>
        )}

        {/* Header */}
        {showHeader && (
          <div className="invoice-header" style={{ borderBottom: '3px solid #2563eb', paddingBottom: '20px', marginBottom: '30px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: isRTL ? '1fr 2fr' : '2fr 1fr', gap: '20px', alignItems: 'center' }}>
              <div className="company-info" style={{ textAlign: isRTL ? 'right' : 'left' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#2563eb', margin: '0 0 10px 0' }}>
                  {isRTL ? company.name_ar : company.name}
                </h1>
                <div style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.6' }}>
                  <div>{isRTL ? company.address_ar : company.address}</div>
                  <div>{company.phone}</div>
                  <div>{company.email}</div>
                  {company.website && <div>{company.website}</div>}
                  {company.tax_number && (
                    <div>
                      الرقم الضريبي: {company.tax_number}
                    </div>
                  )}
                  {company.commercial_register && (
                    <div>
                      السجل التجاري: {company.commercial_register}
                    </div>
                  )}
                </div>
              </div>
              
              <div style={{ textAlign: isRTL ? 'left' : 'right' }}>
                <div className="invoice-title" style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb', marginBottom: '10px' }}>
                  فاتورة
                </div>
                <div className="invoice-number" style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937' }}>
                  رقم الفاتورة: {invoiceNumber}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Invoice Details Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
          {/* Client Information */}
          <div className="client-info" style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#2563eb', marginBottom: '10px', margin: '0 0 10px 0' }}>
              معلومات العميل
            </h3>
            <div style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{clientName}</div>
              {invoice.clinics?.address && (
                <div>{invoice.clinics.address}</div>
              )}
              {invoice.clinics?.phone && (
                <div>الهاتف: {invoice.clinics.phone}</div>
              )}
              {invoice.clinics?.email && (
                <div>البريد الإلكتروني: {invoice.clinics.email}</div>
              )}
            </div>
          </div>

          {/* Invoice Details */}
          <div className="invoice-details" style={{ background: '#eff6ff', padding: '15px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#2563eb', marginBottom: '10px', margin: '0 0 10px 0' }}>
              تفاصيل الفاتورة
            </h3>
            <div style={{ fontSize: '14px', color: '#374151', lineHeight: '1.8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>تاريخ الإصدار:</span>
                <span style={{ fontWeight: 'bold' }}>
                  {format(new Date(invoiceDate), 'dd MMMM yyyy', { locale: ar })}
                </span>
              </div>
              {invoice.due_date && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span>تاريخ الاستحقاق:</span>
                  <span style={{ fontWeight: 'bold' }}>
                    {format(new Date(invoice.due_date), 'dd MMMM yyyy', { locale: ar })}
                  </span>
                </div>
              )}
              {invoice.payment_method && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span>طريقة الدفع:</span>
                  <span style={{ fontWeight: 'bold' }}>
                    {invoice.payment_method === 'cash' ? 'نقداً' :
                     invoice.payment_method === 'credit' ? 'آجل' :
                     invoice.payment_method === 'bank_transfer' ? 'تحويل بنكي' :
                     invoice.payment_method}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>الحالة:</span>
                <span style={{ 
                  fontWeight: 'bold',
                  color: invoice.status === 'paid' ? '#10b981' :
                         invoice.status === 'overdue' ? '#ef4444' :
                         '#f59e0b'
                }}>
                  {invoice.status === 'paid' ? 'مدفوعة' :
                   invoice.status === 'overdue' ? 'متأخرة' :
                   invoice.status === 'pending' ? 'معلقة' :
                   'معتمدة'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        {items.length > 0 && (
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937', marginBottom: '15px' }}>
              بنود الفاتورة
            </h3>
            <table className="items-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ background: '#2563eb', color: 'white', padding: '12px 8px', textAlign: isRTL ? 'right' : 'left', border: '1px solid #d1d5db' }}>
                    #
                  </th>
                  <th style={{ background: '#2563eb', color: 'white', padding: '12px 8px', textAlign: isRTL ? 'right' : 'left', border: '1px solid #d1d5db' }}>
                    الوصف
                  </th>
                  <th style={{ background: '#2563eb', color: 'white', padding: '12px 8px', textAlign: 'center', border: '1px solid #d1d5db' }}>
                    الكمية
                  </th>
                  <th style={{ background: '#2563eb', color: 'white', padding: '12px 8px', textAlign: 'center', border: '1px solid #d1d5db' }}>
                    السعر
                  </th>
                  {(itemDiscounts > 0 || invoice.discount_percentage || invoice.discount_amount) && (
                    <th style={{ background: '#2563eb', color: 'white', padding: '12px 8px', textAlign: 'center', border: '1px solid #d1d5db' }}>
                      الخصم
                    </th>
                  )}
                  <th style={{ background: '#2563eb', color: 'white', padding: '12px 8px', textAlign: isRTL ? 'left' : 'right', border: '1px solid #d1d5db' }}>
                    المجموع
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const price = item.price || item.unit_price || 0;
                  const lineDiscount = (item.discount_amount || 0) + 
                    ((item.discount_percentage || 0) / 100 * price * item.quantity);
                  const lineTotal = (price * item.quantity) - lineDiscount;
                  
                  return (
                    <tr key={item.id || item.productId || index} style={{ 
                      background: index % 2 === 0 ? 'white' : '#f8fafc'
                    }}>
                      <td style={{ padding: '12px 8px', textAlign: 'center', border: '1px solid #d1d5db' }}>
                        {index + 1}
                      </td>
                      <td style={{ padding: '12px 8px', border: '1px solid #d1d5db' }}>
                        {item.productName || item.item_name}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'center', border: '1px solid #d1d5db' }}>
                        {item.quantity}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'center', border: '1px solid #d1d5db' }}>
                        {price.toFixed(2)} ج.م
                      </td>
                      {(itemDiscounts > 0 || invoice.discount_percentage || invoice.discount_amount) && (
                        <td style={{ padding: '12px 8px', textAlign: 'center', border: '1px solid #d1d5db' }}>
                          {lineDiscount > 0 ? `${lineDiscount.toFixed(2)} ج.م` : '-'}
                        </td>
                      )}
                      <td style={{ padding: '12px 8px', textAlign: isRTL ? 'left' : 'right', fontWeight: 'bold', border: '1px solid #d1d5db' }}>
                        {lineTotal.toFixed(2)} ج.م
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals Section */}
        <div className="totals-section" style={{ 
          background: '#f1f5f9', 
          padding: '20px', 
          borderRadius: '8px', 
          border: '1px solid #cbd5e1', 
          marginTop: '20px',
          textAlign: isRTL ? 'right' : 'left'
        }}>
          <div style={{ maxWidth: '300px', marginLeft: isRTL ? '0' : 'auto', marginRight: isRTL ? 'auto' : '0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px' }}>
              <span>المجموع الفرعي:</span>
              <span>{subtotal.toFixed(2)} ج.م</span>
            </div>
            
            {totalDiscounts > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px', color: '#dc2626' }}>
                <span>إجمالي الخصم:</span>
                <span>({totalDiscounts.toFixed(2)}) ج.م</span>
              </div>
            )}
            
            <hr style={{ border: 'none', borderTop: '2px solid #2563eb', margin: '15px 0' }} />
            
            <div className="total-row" style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              fontSize: '18px', 
              fontWeight: 'bold', 
              color: '#1f2937' 
            }}>
              <span>إجمالي المستحق:</span>
              <span>{(isDemo ? 0 : finalTotal).toFixed(2)} ج.م</span>
            </div>
            
            {isDemo && (
              <div style={{ 
                marginTop: '10px', 
                padding: '10px', 
                background: '#fef3c7', 
                border: '1px solid #f59e0b', 
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#92400e',
                textAlign: 'center'
              }}>
                فاتورة تجريبية - مجانية
              </div>
            )}
          </div>
        </div>

        {/* Notes Section */}
        {(invoice.notes || invoice.description) && (
          <div style={{ marginTop: '30px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1f2937', marginBottom: '10px' }}>
              ملاحظات
            </h3>
            <div style={{ 
              background: '#f9fafb', 
              padding: '15px', 
              borderRadius: '6px', 
              border: '1px solid #e5e7eb',
              fontSize: '14px',
              color: '#374151',
              lineHeight: '1.6'
            }}>
              {invoice.notes || invoice.description}
            </div>
          </div>
        )}

        {/* Footer */}
        {showFooter && (
          <div style={{ 
            marginTop: '40px', 
            paddingTop: '20px', 
            borderTop: '1px solid #e5e7eb',
            fontSize: '12px', 
            color: '#6b7280',
            textAlign: 'center'
          }}>
            <div style={{ marginBottom: '10px' }}>
              شكراً لكم لاختياركم {isRTL ? company.name_ar : company.name}
            </div>
            <div>
              هذه فاتورة إلكترونية تم إنشاؤها بواسطة نظام إدارة العيادات • تاريخ الطباعة: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ar })}
            </div>
            {company.website && (
              <div style={{ marginTop: '5px' }}>
                {company.website} • {company.email}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}