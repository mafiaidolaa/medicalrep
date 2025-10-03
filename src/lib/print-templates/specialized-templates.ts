/**
 * قوالب طباعة متخصصة - EP Group System
 * قوالب احترافية مخصصة لأنواع مختلفة من المطبوعات
 */

import { PrintTemplate } from './print-templates';

// قالب التقارير التحليلية
export const ANALYTICAL_REPORT_TEMPLATE: PrintTemplate = {
  id: 'analytical-report',
  name: 'Analytical Report',
  nameAr: 'تقرير تحليلي',
  description: 'Professional template for detailed analytical reports',
  descriptionAr: 'قالب احترافي للتقارير التحليلية المفصلة',
  category: 'report',
  preview: '',
  settings: {
    pageSize: 'A4',
    orientation: 'portrait',
    margins: { top: 25, right: 20, bottom: 25, left: 20 },
    headerFooter: true,
    watermark: false,
    rtl: true,
    colors: {
      primary: '#0F172A',
      secondary: '#1E293B',
      accent: '#3B82F6',
      text: '#0F172A',
      background: '#FFFFFF'
    }
  },
  styles: {
    header: `
      .analytical-header {
        background: linear-gradient(135deg, #0F172A, #1E293B);
        color: white;
        padding: 30px 25px;
        position: relative;
        overflow: hidden;
      }
      .analytical-header::before {
        content: '';
        position: absolute;
        top: -50%;
        left: -20%;
        width: 150%;
        height: 200%;
        background: radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%);
      }
      .analytical-header-content {
        position: relative;
        z-index: 2;
      }
      .analytical-header h1 {
        font-size: 28px;
        font-weight: 700;
        margin: 0 0 12px 0;
        text-shadow: 0 2px 4px rgba(0,0,0,0.3);
      }
      .analytical-header .subtitle {
        font-size: 16px;
        opacity: 0.9;
        font-weight: 300;
        margin-bottom: 20px;
      }
      .analytical-report-meta {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
        font-size: 14px;
      }
      .analytical-meta-item {
        display: flex;
        align-items: center;
        gap: 8px;
        opacity: 0.95;
      }
      .analytical-meta-icon {
        width: 16px;
        height: 16px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 3px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
      }
    `,
    body: `
      .analytical-body {
        padding: 40px 25px;
        font-family: 'Inter', 'Segoe UI', sans-serif;
        line-height: 1.7;
        color: #0F172A;
        background: #FFFFFF;
      }
      .analytical-section {
        margin-bottom: 40px;
        background: #F8FAFC;
        border: 1px solid #E2E8F0;
        border-radius: 12px;
        padding: 25px;
        position: relative;
      }
      .analytical-section::before {
        content: '';
        position: absolute;
        top: 0;
        right: 0;
        width: 4px;
        height: 100%;
        background: linear-gradient(to bottom, #3B82F6, #1D4ED8);
        border-radius: 0 12px 12px 0;
      }
      .analytical-section-title {
        color: #0F172A;
        font-size: 20px;
        font-weight: 600;
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 2px solid #E2E8F0;
        position: relative;
      }
      .analytical-section-title::after {
        content: '';
        position: absolute;
        bottom: -2px;
        right: 0;
        width: 60px;
        height: 2px;
        background: #3B82F6;
      }
      .analytical-kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 20px;
        margin: 25px 0;
      }
      .analytical-kpi-card {
        background: white;
        padding: 20px;
        border-radius: 10px;
        border: 1px solid #E2E8F0;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        text-align: center;
        position: relative;
        overflow: hidden;
      }
      .analytical-kpi-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, #3B82F6, #1D4ED8);
      }
      .analytical-kpi-value {
        font-size: 32px;
        font-weight: 700;
        color: #3B82F6;
        margin: 10px 0 5px 0;
      }
      .analytical-kpi-label {
        font-size: 14px;
        color: #64748B;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .analytical-kpi-trend {
        font-size: 12px;
        margin-top: 8px;
        padding: 4px 8px;
        border-radius: 20px;
        font-weight: 500;
      }
      .analytical-kpi-trend.up {
        background: #DCFCE7;
        color: #166534;
      }
      .analytical-kpi-trend.down {
        background: #FEE2E2;
        color: #991B1B;
      }
      .analytical-insight-box {
        background: #EBF4FF;
        border: 1px solid #BFDBFE;
        border-radius: 8px;
        padding: 20px;
        margin: 20px 0;
        position: relative;
      }
      .analytical-insight-box::before {
        content: '💡';
        position: absolute;
        top: -10px;
        right: 15px;
        background: #3B82F6;
        color: white;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
      }
      .analytical-insight-title {
        color: #1E40AF;
        font-weight: 600;
        margin-bottom: 10px;
        font-size: 16px;
      }
      .analytical-insight-content {
        color: #1E40AF;
        font-size: 14px;
        line-height: 1.6;
      }
    `,
    footer: `
      .analytical-footer {
        background: #F8FAFC;
        border-top: 2px solid #E2E8F0;
        padding: 25px;
        color: #64748B;
        font-size: 12px;
      }
      .analytical-footer-content {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        gap: 20px;
        align-items: center;
      }
      .analytical-footer-left {
        text-align: right;
      }
      .analytical-footer-center {
        text-align: center;
        font-weight: 600;
        color: #0F172A;
      }
      .analytical-footer-right {
        text-align: left;
      }
    `,
    table: `
      .analytical-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        margin: 25px 0;
        background: white;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        border: 1px solid #E2E8F0;
      }
      .analytical-table th {
        background: linear-gradient(135deg, #0F172A, #1E293B);
        color: white;
        padding: 16px 12px;
        text-align: right;
        font-weight: 600;
        font-size: 14px;
        position: relative;
      }
      .analytical-table th:first-child {
        border-top-right-radius: 12px;
      }
      .analytical-table th:last-child {
        border-top-left-radius: 12px;
      }
      .analytical-table td {
        padding: 14px 12px;
        border-bottom: 1px solid #F1F5F9;
        font-size: 13px;
        color: #334155;
      }
      .analytical-table tr:nth-child(even) {
        background: #FAFAFA;
      }
      .analytical-table tr:hover {
        background: #F0F9FF;
      }
      .analytical-table .number-cell {
        text-align: center;
        font-weight: 600;
        color: #3B82F6;
      }
      .analytical-table .status-cell {
        text-align: center;
      }
      .analytical-table .amount-cell {
        text-align: left;
        font-weight: 600;
        color: #059669;
        direction: ltr;
      }
      .analytical-table .trend-cell {
        text-align: center;
      }
    `,
    card: `
      .analytical-card {
        background: white;
        border: 1px solid #E2E8F0;
        border-radius: 12px;
        padding: 25px;
        margin: 20px 0;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        position: relative;
      }
      .analytical-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 1px solid #F1F5F9;
      }
      .analytical-card-title {
        font-size: 18px;
        font-weight: 600;
        color: #0F172A;
        margin: 0;
      }
      .analytical-card-content {
        color: #475569;
        line-height: 1.7;
      }
    `,
    badge: `
      .analytical-badge {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .analytical-badge-primary {
        background: #EBF4FF;
        color: #1E40AF;
        border: 1px solid #BFDBFE;
      }
      .analytical-badge-success {
        background: #DCFCE7;
        color: #166534;
        border: 1px solid #BBF7D0;
      }
      .analytical-badge-warning {
        background: #FEF3C7;
        color: #92400E;
        border: 1px solid #FDE68A;
      }
      .analytical-badge-danger {
        background: #FEE2E2;
        color: #991B1B;
        border: 1px solid #FECACA;
      }
    `
  }
};

// قالب الفواتير الاحترافي
export const PROFESSIONAL_INVOICE_TEMPLATE: PrintTemplate = {
  id: 'professional-invoice',
  name: 'Professional Invoice',
  nameAr: 'فاتورة احترافية',
  description: 'Modern professional invoice template',
  descriptionAr: 'قالب فاتورة احترافي حديث',
  category: 'invoice',
  preview: '',
  settings: {
    pageSize: 'A4',
    orientation: 'portrait',
    margins: { top: 15, right: 15, bottom: 20, left: 15 },
    headerFooter: true,
    watermark: true,
    rtl: true,
    colors: {
      primary: '#7C3AED',
      secondary: '#6D28D9',
      accent: '#8B5CF6',
      text: '#1F2937',
      background: '#FFFFFF'
    }
  },
  styles: {
    header: `
      .invoice-header {
        background: white;
        padding: 30px;
        border-bottom: 3px solid #7C3AED;
        position: relative;
        overflow: hidden;
      }
      .invoice-header::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: -3px;
        background: linear-gradient(135deg, 
          transparent 0%, 
          rgba(124, 58, 237, 0.05) 25%, 
          rgba(124, 58, 237, 0.1) 50%, 
          rgba(124, 58, 237, 0.05) 75%, 
          transparent 100%);
      }
      .invoice-header-content {
        position: relative;
        z-index: 2;
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 30px;
        align-items: start;
      }
      .invoice-brand {
        display: flex;
        align-items: center;
        gap: 15px;
      }
      .invoice-logo {
        width: 80px;
        height: 80px;
        background: linear-gradient(135deg, #7C3AED, #6D28D9);
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 32px;
        font-weight: bold;
        box-shadow: 0 8px 24px rgba(124, 58, 237, 0.3);
      }
      .invoice-brand-info h1 {
        font-size: 32px;
        font-weight: 700;
        color: #7C3AED;
        margin: 0 0 8px 0;
      }
      .invoice-brand-info .tagline {
        font-size: 14px;
        color: #6B7280;
        font-style: italic;
      }
      .invoice-details {
        text-align: left;
        direction: ltr;
      }
      .invoice-number {
        font-size: 24px;
        font-weight: 700;
        color: #1F2937;
        margin: 0 0 8px 0;
      }
      .invoice-date {
        font-size: 14px;
        color: #6B7280;
        margin-bottom: 4px;
      }
      .invoice-status {
        display: inline-block;
        padding: 6px 16px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .invoice-status.paid {
        background: #DCFCE7;
        color: #166534;
      }
      .invoice-status.pending {
        background: #FEF3C7;
        color: #92400E;
      }
      .invoice-status.overdue {
        background: #FEE2E2;
        color: #991B1B;
      }
    `,
    body: `
      .invoice-body {
        padding: 0 30px 30px;
        font-family: 'Inter', 'Segoe UI', sans-serif;
        color: #1F2937;
        background: white;
      }
      .invoice-parties {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 40px;
        margin: 30px 0;
        padding: 25px;
        background: #F9FAFB;
        border-radius: 12px;
        border: 1px solid #E5E7EB;
      }
      .invoice-party {
        padding: 20px;
        background: white;
        border-radius: 8px;
        border: 1px solid #E5E7EB;
      }
      .invoice-party-title {
        font-size: 14px;
        font-weight: 600;
        color: #7C3AED;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 15px;
        padding-bottom: 8px;
        border-bottom: 2px solid #E5E7EB;
      }
      .invoice-party-info {
        font-size: 14px;
        line-height: 1.6;
        color: #374151;
      }
      .invoice-party-info .name {
        font-size: 16px;
        font-weight: 600;
        color: #1F2937;
        margin-bottom: 8px;
      }
      .invoice-items {
        margin: 30px 0;
      }
      .invoice-items-title {
        font-size: 20px;
        font-weight: 600;
        color: #1F2937;
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 2px solid #7C3AED;
      }
      .invoice-summary {
        margin: 30px 0;
        padding: 25px;
        background: #F9FAFB;
        border-radius: 12px;
        border: 1px solid #E5E7EB;
      }
      .invoice-summary-grid {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 15px;
        max-width: 400px;
        margin-right: auto;
      }
      .invoice-summary-label {
        font-size: 14px;
        color: #6B7280;
        text-align: right;
      }
      .invoice-summary-value {
        font-size: 14px;
        font-weight: 500;
        color: #1F2937;
        text-align: left;
        direction: ltr;
      }
      .invoice-total {
        padding-top: 15px;
        margin-top: 15px;
        border-top: 2px solid #7C3AED;
      }
      .invoice-total .invoice-summary-label {
        font-size: 18px;
        font-weight: 600;
        color: #7C3AED;
      }
      .invoice-total .invoice-summary-value {
        font-size: 24px;
        font-weight: 700;
        color: #7C3AED;
      }
      .invoice-notes {
        margin: 30px 0;
        padding: 20px;
        background: #EEF2FF;
        border: 1px solid #C7D2FE;
        border-radius: 8px;
      }
      .invoice-notes-title {
        font-size: 14px;
        font-weight: 600;
        color: #4338CA;
        margin-bottom: 10px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .invoice-notes-content {
        font-size: 13px;
        color: #4338CA;
        line-height: 1.6;
      }
    `,
    footer: `
      .invoice-footer {
        background: linear-gradient(135deg, #7C3AED, #6D28D9);
        color: white;
        padding: 25px 30px;
        margin-top: 30px;
      }
      .invoice-footer-content {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 30px;
        align-items: center;
      }
      .invoice-footer-info {
        font-size: 12px;
        line-height: 1.5;
        opacity: 0.9;
      }
      .invoice-footer-contact {
        display: flex;
        gap: 20px;
        font-size: 12px;
        flex-wrap: wrap;
      }
      .invoice-footer-contact span {
        display: flex;
        align-items: center;
        gap: 5px;
        opacity: 0.9;
      }
      .invoice-payment-methods {
        margin: 20px 0;
        padding: 20px;
        background: white;
        border-radius: 8px;
        border: 1px solid #E5E7EB;
      }
      .invoice-payment-title {
        font-size: 16px;
        font-weight: 600;
        color: #1F2937;
        margin-bottom: 15px;
      }
      .invoice-payment-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
      }
      .invoice-payment-method {
        padding: 15px;
        background: #F9FAFB;
        border-radius: 6px;
        border: 1px solid #E5E7EB;
        font-size: 13px;
        color: #374151;
      }
      .invoice-payment-method .method-name {
        font-weight: 600;
        color: #7C3AED;
        margin-bottom: 5px;
      }
    `,
    table: `
      .invoice-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        background: white;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(124, 58, 237, 0.08);
        border: 1px solid #E5E7EB;
      }
      .invoice-table th {
        background: linear-gradient(135deg, #7C3AED, #6D28D9);
        color: white;
        padding: 16px 15px;
        text-align: right;
        font-weight: 600;
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .invoice-table td {
        padding: 16px 15px;
        border-bottom: 1px solid #F3F4F6;
        font-size: 14px;
        color: #374151;
        vertical-align: top;
      }
      .invoice-table tr:nth-child(even) {
        background: #FAFAFA;
      }
      .invoice-table tr:hover {
        background: #F3F4F6;
      }
      .invoice-table tr:last-child td {
        border-bottom: none;
      }
      .invoice-table .item-description {
        font-weight: 500;
        color: #1F2937;
        margin-bottom: 4px;
      }
      .invoice-table .item-details {
        font-size: 12px;
        color: #6B7280;
      }
      .invoice-table .quantity-cell,
      .invoice-table .price-cell,
      .invoice-table .total-cell {
        text-align: center;
        font-weight: 600;
      }
      .invoice-table .price-cell,
      .invoice-table .total-cell {
        direction: ltr;
        color: #7C3AED;
      }
    `,
    card: `
      .invoice-card {
        background: white;
        border: 1px solid #E5E7EB;
        border-radius: 12px;
        padding: 20px;
        margin: 15px 0;
        box-shadow: 0 2px 8px rgba(124, 58, 237, 0.04);
      }
      .invoice-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
        padding-bottom: 12px;
        border-bottom: 1px solid #F3F4F6;
      }
      .invoice-card-title {
        font-size: 16px;
        font-weight: 600;
        color: #1F2937;
        margin: 0;
      }
      .invoice-card-content {
        color: #374151;
        line-height: 1.6;
        font-size: 14px;
      }
    `,
    badge: `
      .invoice-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .invoice-badge-primary {
        background: linear-gradient(135deg, #EDE9FE, #DDD6FE);
        color: #7C3AED;
        border: 1px solid #C4B5FD;
      }
      .invoice-badge-paid {
        background: linear-gradient(135deg, #DCFCE7, #BBF7D0);
        color: #166534;
        border: 1px solid #86EFAC;
      }
      .invoice-badge-pending {
        background: linear-gradient(135deg, #FEF3C7, #FDE68A);
        color: #92400E;
        border: 1px solid #FBBF24;
      }
      .invoice-badge-overdue {
        background: linear-gradient(135deg, #FEE2E2, #FECACA);
        color: #991B1B;
        border: 1px solid #F87171;
      }
    `
  }
};

// قالب شهادات التقدير
export const CERTIFICATE_TEMPLATE: PrintTemplate = {
  id: 'certificate',
  name: 'Certificate',
  nameAr: 'شهادة تقدير',
  description: 'Elegant certificate template',
  descriptionAr: 'قالب أنيق لشهادات التقدير',
  category: 'document',
  preview: '',
  settings: {
    pageSize: 'A4',
    orientation: 'landscape',
    margins: { top: 20, right: 20, bottom: 20, left: 20 },
    headerFooter: false,
    watermark: false,
    rtl: true,
    colors: {
      primary: '#B91C1C',
      secondary: '#991B1B',
      accent: '#DC2626',
      text: '#1F2937',
      background: '#FEFEFE'
    }
  },
  styles: {
    header: `
      .certificate-header {
        text-align: center;
        padding: 40px 50px 30px;
        background: white;
        position: relative;
      }
      .certificate-border {
        position: absolute;
        top: 15px;
        left: 15px;
        right: 15px;
        bottom: 15px;
        border: 4px solid #B91C1C;
        border-radius: 8px;
        z-index: 1;
      }
      .certificate-inner-border {
        position: absolute;
        top: 25px;
        left: 25px;
        right: 25px;
        bottom: 25px;
        border: 2px solid #DC2626;
        border-radius: 4px;
        z-index: 2;
      }
      .certificate-decorative-corners {
        position: relative;
        z-index: 3;
      }
      .certificate-header h1 {
        font-size: 42px;
        font-weight: 700;
        color: #B91C1C;
        margin: 20px 0 10px 0;
        text-shadow: 2px 2px 4px rgba(185, 28, 28, 0.1);
        font-family: 'Georgia', serif;
      }
      .certificate-subtitle {
        font-size: 18px;
        color: #374151;
        font-style: italic;
        margin-bottom: 30px;
      }
      .certificate-ornament {
        width: 120px;
        height: 120px;
        background: radial-gradient(circle, #FEE2E2 0%, #FECACA 50%, #FCA5A5 100%);
        border: 3px solid #B91C1C;
        border-radius: 50%;
        margin: 0 auto 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 48px;
        color: #B91C1C;
        box-shadow: 0 8px 24px rgba(185, 28, 28, 0.2);
      }
    `,
    body: `
      .certificate-body {
        padding: 0 50px 40px;
        text-align: center;
        position: relative;
        z-index: 3;
      }
      .certificate-presented-to {
        font-size: 24px;
        color: #374151;
        margin-bottom: 30px;
        font-style: italic;
      }
      .certificate-recipient-name {
        font-size: 48px;
        font-weight: 700;
        color: #1F2937;
        margin: 20px 0 30px 0;
        font-family: 'Georgia', serif;
        border-bottom: 3px solid #B91C1C;
        display: inline-block;
        padding-bottom: 10px;
        min-width: 400px;
      }
      .certificate-achievement {
        font-size: 20px;
        color: #374151;
        line-height: 1.8;
        margin: 30px 0;
        max-width: 600px;
        margin-left: auto;
        margin-right: auto;
      }
      .certificate-date {
        font-size: 16px;
        color: #6B7280;
        margin: 30px 0 40px 0;
      }
      .certificate-signatures {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 80px;
        margin-top: 60px;
        max-width: 600px;
        margin-left: auto;
        margin-right: auto;
      }
      .certificate-signature {
        text-align: center;
      }
      .certificate-signature-line {
        border-bottom: 2px solid #374151;
        margin-bottom: 10px;
        height: 60px;
        display: flex;
        align-items: end;
        justify-content: center;
        padding-bottom: 5px;
      }
      .certificate-signature-name {
        font-size: 16px;
        font-weight: 600;
        color: #1F2937;
        margin-bottom: 5px;
      }
      .certificate-signature-title {
        font-size: 14px;
        color: #6B7280;
        font-style: italic;
      }
      .certificate-seal {
        position: absolute;
        bottom: 40px;
        left: 40px;
        width: 100px;
        height: 100px;
        background: radial-gradient(circle, #B91C1C, #991B1B);
        border-radius: 50%;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        text-align: center;
        font-weight: bold;
        box-shadow: 0 4px 12px rgba(185, 28, 28, 0.4);
        z-index: 4;
      }
    `,
    footer: `
      .certificate-footer {
        text-align: center;
        padding: 20px 50px;
        color: #6B7280;
        font-size: 12px;
        position: relative;
        z-index: 3;
      }
      .certificate-footer-info {
        margin-bottom: 10px;
      }
      .certificate-id {
        font-family: 'Courier New', monospace;
        font-size: 10px;
        color: #9CA3AF;
      }
    `,
    table: ``,
    card: ``,
    badge: ``
  }
};

// قائمة جميع القوالب المتخصصة
export const SPECIALIZED_TEMPLATES: PrintTemplate[] = [
  ANALYTICAL_REPORT_TEMPLATE,
  PROFESSIONAL_INVOICE_TEMPLATE,
  CERTIFICATE_TEMPLATE
];

// دالة للحصول على قالب متخصص بواسطة ID
export const getSpecializedTemplateById = (id: string): PrintTemplate | undefined => {
  return SPECIALIZED_TEMPLATES.find(template => template.id === id);
};

// دالة للحصول على جميع القوالب (الأساسية + المتخصصة)
export const getAllTemplates = async (): Promise<PrintTemplate[]> => {
  const { PRINT_TEMPLATES } = await import('./print-templates');
  return [...PRINT_TEMPLATES, ...SPECIALIZED_TEMPLATES];
};

// دالة لإنشاء قالب مخصص
export const createCustomTemplate = (
  id: string,
  name: string,
  nameAr: string,
  baseTemplate: PrintTemplate,
  customizations: Partial<PrintTemplate>
): PrintTemplate => {
  return {
    ...baseTemplate,
    id,
    name,
    nameAr,
    ...customizations
  };
};

// قوالب سريعة للاستخدام المباشر
export const QUICK_TEMPLATES = {
  // قالب سريع للتقارير اليومية
  DAILY_REPORT: createCustomTemplate(
    'daily-report',
    'Daily Report',
    'تقرير يومي',
    ANALYTICAL_REPORT_TEMPLATE,
    {
      description: 'Quick daily report template',
      descriptionAr: 'قالب سريع للتقارير اليومية'
    }
  ),
  
  // قالب سريع للفواتير البسيطة
  SIMPLE_INVOICE: createCustomTemplate(
    'simple-invoice',
    'Simple Invoice',
    'فاتورة بسيطة',
    PROFESSIONAL_INVOICE_TEMPLATE,
    {
      description: 'Simple invoice template',
      descriptionAr: 'قالب فاتورة بسيطة',
      settings: {
        ...PROFESSIONAL_INVOICE_TEMPLATE.settings,
        watermark: false
      }
    }
  ),
  
  // قالب سريع للشهادات
  APPRECIATION_CERTIFICATE: createCustomTemplate(
    'appreciation-certificate',
    'Appreciation Certificate',
    'شهادة شكر وتقدير',
    CERTIFICATE_TEMPLATE,
    {
      description: 'Certificate of appreciation template',
      descriptionAr: 'قالب شهادة شكر وتقدير'
    }
  )
};

// تصدير جميع القوالب السريعة
export const QUICK_TEMPLATES_LIST = Object.values(QUICK_TEMPLATES);