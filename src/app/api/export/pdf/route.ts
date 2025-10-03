import { NextResponse } from 'next/server';
import React from 'react';

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'Malformed request body' }, { status: 400 });
  }

  const { entity, clinic, rows, lang = 'en', branding } = body || {};
  const layout = branding?.layout || 'classic';
  if (!entity || !rows || !clinic) {
    return NextResponse.json({ ok: false, error: 'Missing required fields: entity, clinic, rows' }, { status: 400 });
  }

  // Dynamic import to avoid bundling when not needed.
  let renderer: any;
  try {
    const moduleName: string = '@react-pdf/renderer';
    // Dynamic path to avoid type resolution during build
    renderer = await (new Function('m', 'return import(m)'))(moduleName);
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: "PDF renderer '@react-pdf/renderer' is not installed.",
      howTo: "npm install @react-pdf/renderer --save"
    }, { status: 501 });
  }

  const { pdf, Document, Page, Text, View, StyleSheet, Font, Image } = renderer;

  // Try to register an Arabic-capable font if a URL is provided; otherwise fall back
  if (lang === 'ar') {
    try {
      const fontUrl = process.env.NOTO_NASKH_ARABIC_URL;
      if (fontUrl) {
        Font.register({ family: 'NotoNaskhArabic', src: fontUrl });
      }
    } catch {}
  }

  const baseFont = layout === 'compact' ? 9 : 10;
  const padding = layout === 'compact' ? 16 : 24;
  const styles = StyleSheet.create({
    page: {
      padding,
      direction: lang === 'ar' ? 'rtl' : 'ltr',
      fontFamily: lang === 'ar' ? 'NotoNaskhArabic' : 'Helvetica',
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: layout === 'compact' ? 8 : 12 },
    title: { fontSize: layout === 'compact' ? 12 : 14, fontWeight: 700 },
    brand: { fontSize: baseFont, color: '#555' },
    sectionTitle: { fontSize: layout === 'compact' ? 11 : 12, marginTop: 10, marginBottom: 6 },
    row: { flexDirection: 'row', borderBottom: '1px solid #eee', paddingVertical: layout === 'compact' ? 3 : 4 },
    cell: { fontSize: baseFont, flexGrow: 1 },
    footer: { position: 'absolute', bottom: 16, left: 24, right: 24, fontSize: baseFont, color: '#777', textAlign: lang === 'ar' ? 'left' : 'right' },
  });

  const entityLabel: Record<string, string> = {
    orders: lang === 'ar' ? 'الطلبات' : 'Orders',
    receivables: lang === 'ar' ? 'المديونيات' : 'Receivables',
    visits: lang === 'ar' ? 'الزيارات' : 'Visits',
    invoice: lang === 'ar' ? 'فاتورة' : 'Invoice',
  };

  const nowStr = new Date().toLocaleString(lang === 'ar' ? 'ar' : 'en');
  const showPageNumbers = Boolean(branding?.showPageNumbers);

  const logoWidthPt = ((branding?.logoWidthMm ?? 24) * 2.8346) as number;
  const Header = () => React.createElement(
    View,
    { style: styles.header },
    React.createElement(
      View,
      { style: { flexDirection: 'row', alignItems: 'center', gap: 8 } },
      branding?.logo ? React.createElement(Image, { src: branding.logo, style: { width: logoWidthPt, height: logoWidthPt } }) : null,
      React.createElement(Text, { style: styles.title }, `${clinic.name} — ${entityLabel[entity]}`)
    ),
    branding?.headerTemplate === 'minimal'
      ? null
      : React.createElement(Text, { style: styles.brand }, `${branding?.title || 'EP Group System'} | ${nowStr}`)
  );

  const Summary = () => {
    if (!(entity === 'receivables' && (branding?.layout === 'statement'))) return null as any;
    const buckets: Record<string, number> = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90p: 0 };
    let total = 0;
    for (const r of rows) {
      const bal = Number(r.balance || 0);
      total += bal;
      const dueVal = r.due || r.dueDate;
      const due = dueVal ? new Date(dueVal) : undefined;
      if (!due || bal <= 0) { buckets.current += bal; continue; }
      const overdue = Math.max(0, Math.floor((Date.now() - due.getTime())/(1000*60*60*24)));
      if (overdue <= 0) buckets.current += bal; else if (overdue <= 30) buckets.d1_30 += bal; else if (overdue <= 60) buckets.d31_60 += bal; else if (overdue <= 90) buckets.d61_90 += bal; else buckets.d90p += bal;
    }
    const Label = (k: string) => ({ current: lang==='ar'?'حالي':'Current', d1_30:'1-30', d31_60:'31-60', d61_90:'61-90', d90p: lang==='ar'?'> 90':'> 90' } as any)[k];
    return React.createElement(
      View,
      { style: { marginBottom: 8 } },
      React.createElement(Text, { style: styles.sectionTitle }, lang==='ar' ? 'ملخص المديونية' : 'Receivables Summary'),
      React.createElement(
        View,
        { style: [styles.row, { borderBottom: 0 }] },
        React.createElement(Text, { style: [styles.cell, { fontWeight: 700 }] }, lang==='ar' ? 'الإجمالي' : 'Total'),
        React.createElement(Text, { style: styles.cell }, String(total.toLocaleString()))
      ),
      React.createElement(
        View,
        { style: [styles.row, { borderBottom: 0 }] },
        ...(['current','d1_30','d31_60','d61_90','d90p'] as const).map((k,i)=> React.createElement(Text, { key: i, style: styles.cell }, `${Label(k)}: ${Math.round(buckets[k]).toLocaleString()}`))
      )
    );
  };

  const TableHeader = () => {
    let headers: string[] = [];
    if (entity === 'orders') headers = ['ID', 'Date', 'Status', 'Rep', 'Total'];
    if (entity === 'receivables') headers = ['Order', 'Date', 'Due', 'Original', 'Paid', 'Balance', 'Status'];
    if (entity === 'visits') headers = ['Date', 'Purpose', 'Rep', 'Status', 'Notes'];
    if (entity === 'invoice') headers = ['Item', 'Qty', 'Price', 'Total'];
    if (lang === 'ar') headers = headers.map(h => ({
      ID: 'المعرف', Date: 'التاريخ', Status: 'الحالة', Rep: 'المندوب', Total: 'الإجمالي',
      Order: 'الطلب', Due: 'الاستحقاق', Original: 'الأصلي', Paid: 'المدفوع', Balance: 'المتبقي',
      Purpose: 'الغرض', Notes: 'ملاحظات', Item: 'الصنف', Qty: 'الكمية', Price: 'السعر'
    } as any)[h] || h);
    return React.createElement(
      View,
      { style: [styles.row, { borderBottom: '2px solid #333' }] },
      ...headers.map((h: string, i: number) => React.createElement(Text, { key: i, style: [styles.cell, { fontWeight: 700 }] }, String(h)))
    );
  };

  const TableRows = () => React.createElement(
    View,
    null,
    ...rows.map((r: any, idx: number) => React.createElement(
      View,
      { style: styles.row, key: idx },
      ...Object.values(r).slice(0, 7).map((v: any, i: number) => React.createElement(Text, { key: i, style: styles.cell }, String(v ?? '')))
    ))
  );

  const doc = React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      React.createElement(Header),
      React.createElement(Text, { style: styles.sectionTitle }, entityLabel[entity]),
      React.createElement(Summary),
      React.createElement(TableHeader),
      React.createElement(TableRows),
      React.createElement(
        Text,
        { style: styles.footer, render: showPageNumbers ? ({ pageNumber, totalPages }: any) => (
          (branding?.footerTemplate === 'minimal' ? '' : (
            `${branding?.companyAddress || ''}` +
            `${branding?.phone ? ' | ' + branding.phone : ''}` +
            `${branding?.email ? ' | ' + branding.email : ''}` +
            `${branding?.website ? ' | ' + branding.website : ''}`
          )) +
          `${totalPages ? (lang==='ar' ? ` ${branding?.footerTemplate==='minimal'?'':'| '}الصفحة ${pageNumber} من ${totalPages}` : ` ${branding?.footerTemplate==='minimal'?'':'| '}Page ${pageNumber} of ${totalPages}`) : ''}`
        ) : undefined },
        showPageNumbers ? (branding?.footerTemplate === 'minimal' ? '' : (
          `${branding?.companyAddress || ''}` +
          `${branding?.phone ? ' | ' + branding.phone : ''}` +
          `${branding?.email ? ' | ' + branding.email : ''}` +
          `${branding?.website ? ' | ' + branding.website : ''}`
        )) : (
          branding?.footerTemplate === 'minimal' ? '' : (
            `${branding?.companyAddress || ''}` +
            `${branding?.phone ? ' | ' + branding.phone : ''}` +
            `${branding?.email ? ' | ' + branding.email : ''}` +
            `${branding?.website ? ' | ' + branding.website : ''}`
          )
        )
      )
    )
  );

  const file = await pdf(doc).toBuffer();
  const fileName = `${clinic.name}-${entity}-${Date.now()}.pdf`;
  return new Response(file, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    }
  });
}
