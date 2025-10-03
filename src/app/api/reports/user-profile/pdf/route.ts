import { NextResponse } from 'next/server';
import React from 'react';

// Server-side PDF for comprehensive user profile report
// POST body: { userId: string, period: 'this_month'|'last_month'|'last_3_months'|'ytd'|'custom', custom?: { start?: string; end?: string }, lang?: 'ar'|'en', branding?: any }
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'Malformed request body' }, { status: 400 });
  }

  const { userId, period = 'this_month', custom, lang = 'ar', branding, topN } = body || {};
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'Missing userId' }, { status: 400 });
  }
  const maxItems = Math.max(3, Math.min(Number(topN || 5), 20));

  // Resolve site branding/settings to enrich the PDF header
  const origin = new URL(req.url).origin;
  let resolvedBranding: any = { ...branding };
  try {
    const siteRes = await fetch(new URL('/api/site-settings', req.url), { cache: 'no-store' });
    const siteJson = await siteRes.json().catch(() => null);
    if (siteJson?.success && siteJson.data) {
      const s = siteJson.data;
      resolvedBranding = {
        ...resolvedBranding,
        title: s.site_title || resolvedBranding?.title || 'EP Group System',
        companyAddress: s.company_address || resolvedBranding?.companyAddress,
        phone: s.company_phone || resolvedBranding?.phone,
        email: s.company_email || resolvedBranding?.email,
        website: s.company_website || resolvedBranding?.website,
        currency: s.company_currency || s.currency || resolvedBranding?.currency,
        logo: s.logo_path ? (s.logo_path.startsWith('http') ? s.logo_path : origin + s.logo_path) : resolvedBranding?.logo,
        showPageNumbers: true,
      };
    }
  } catch {}

  // Fetch data using existing supabase services
  try {
    const {
      fetchUsers,
      fetchOrders,
      fetchVisits,
      fetchCollections,
      fetchClinics,
      fetchDebts,
    } = await import('@/lib/supabase-services');

    const [users, ordersAll, visitsAll, collectionsAll, clinicsAll, debtsAll] = await Promise.all([
      fetchUsers(),
      fetchOrders(),
      fetchVisits(),
      fetchCollections(),
      fetchClinics(),
      fetchDebts().catch(() => []),
    ]);

    const user = users.find((u: any) => u.id === userId) || users[0];
    if (!user) {
      return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 });
    }

    // Range helpers
    function getRange(p: string, cust?: { start?: string; end?: string }) {
      const now = new Date();
      const startOfMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 1));
      const endOfMonth = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
      if (p === 'this_month') return { start: startOfMonth(now.getUTCFullYear(), now.getUTCMonth()).toISOString(), end: endOfMonth(now.getUTCFullYear(), now.getUTCMonth()).toISOString() };
      if (p === 'last_month') {
        const y = now.getUTCFullYear(); const m = now.getUTCMonth() - 1;
        return { start: startOfMonth(y, m).toISOString(), end: endOfMonth(y, m).toISOString() };
      }
      if (p === 'last_3_months') {
        const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1));
        const end = endOfMonth(now.getUTCFullYear(), now.getUTCMonth());
        return { start: start.toISOString(), end: end.toISOString() };
      }
      if (p === 'ytd') {
        const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
        const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
        return { start: start.toISOString(), end: end.toISOString() };
      }
      return { start: cust?.start, end: cust?.end };
    }

    const range = getRange(period, custom);
    const inRange = (iso?: string) => !range.start || !range.end || (iso && iso >= range.start && iso <= range.end);

    const uOrdersAll = ordersAll.filter((o: any) => o.representativeId === user.id);
    const uVisitsAll = visitsAll.filter((v: any) => v.representativeId === user.id);
    const uCollectionsAll = collectionsAll.filter((c: any) => c.representativeId === user.id);

    const uOrders = uOrdersAll.filter((o: any) => inRange(o.orderDate));
    const uVisits = uVisitsAll.filter((v: any) => inRange(v.visitDate));
    const uCollections = uCollectionsAll.filter((c: any) => inRange(c.collectionDate));

    const visitsCount = uVisits.length;
    const ordersCount = uOrders.length;
    const totalSales = uOrders.reduce((s: number, o: any) => s + (o.totalAmount || o.total || 0), 0);
    const totalCollected = uCollections.reduce((s: number, c: any) => s + (c.amount || 0), 0);
    const currentDebt = Math.max(0, totalSales - totalCollected);

    const clinicNameById = new Map<string, string>();
    (clinicsAll || []).forEach((c: any) => clinicNameById.set(c.id, c.name));

    const salesByClinic = new Map<string, number>();
    for (const o of uOrders) {
      const key = o.clinicId || 'unknown';
      salesByClinic.set(key, (salesByClinic.get(key) || 0) + (o.totalAmount || o.total || 0));
    }
    const topClinicsBySales = Array.from(salesByClinic.entries())
      .map(([id, value]) => ({ name: clinicNameById.get(id) || (lang==='ar'?'غير محدد':'Unknown'), value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, maxItems);
    const bestClinicBySales = topClinicsBySales[0];

    const revenueByProduct = new Map<string, { name: string; value: number }>();
    const qtyByProduct = new Map<string, { name: string; value: number }>();
    for (const o of uOrders) {
      for (const it of (o.items || [])) {
        const key = it.productId || it.productName || 'unknown';
        const name = it.productName || (lang==='ar'?'غير محدد':'Unknown');
        const rev = (it.price || 0) * (it.quantity || 0);
        revenueByProduct.set(key, { name, value: (revenueByProduct.get(key)?.value || 0) + rev });
        qtyByProduct.set(key, { name, value: (qtyByProduct.get(key)?.value || 0) + (it.quantity || 0) });
      }
    }
    const topProductsByRevenue = Array.from(revenueByProduct.values()).sort((a,b)=>b.value-a.value).slice(0, maxItems);
    const topProductsByQty = Array.from(qtyByProduct.values()).sort((a,b)=>b.value-a.value).slice(0, maxItems);
    const bestProductByQty = topProductsByQty[0];

    const lastVisit = uVisits.map((v: any) => v.visitDate).sort().at(-1);
    const lastInvoice = uOrders.map((o: any) => o.orderDate).sort().at(-1);

    // Prepare PDF renderer
    let renderer: any;
    try {
      renderer = await (new Function('m', 'return import(m)'))('@react-pdf/renderer');
    } catch (e) {
      return NextResponse.json({
        ok: false,
        error: "PDF renderer '@react-pdf/renderer' is not installed.",
        howTo: "npm install @react-pdf/renderer --save"
      }, { status: 501 });
    }

    const { pdf, Document, Page, Text, View, StyleSheet, Font, Image } = renderer;

    if (lang === 'ar') {
      try {
        const fontUrl = process.env.NOTO_NASKH_ARABIC_URL;
        if (fontUrl) Font.register({ family: 'NotoNaskhArabic', src: fontUrl });
      } catch {}
    }

    const styles = StyleSheet.create({
      page: { padding: 24, direction: lang==='ar' ? 'rtl' : 'ltr', fontFamily: lang==='ar' ? 'NotoNaskhArabic' : 'Helvetica' },
      header: { marginBottom: 10 },
      title: { fontSize: 16, fontWeight: 700 },
      muted: { fontSize: 10, color: '#666' },
      row: { flexDirection: 'row', gap: 8, marginBottom: 6 },
      kpi: { flex: 1, border: '1px solid #eee', padding: 8, borderRadius: 4 },
      section: { marginTop: 10, marginBottom: 6, fontSize: 12, fontWeight: 700 },
      tableHeader: { flexDirection: 'row', borderBottom: '2px solid #333', paddingVertical: 4 },
      cellHeader: { flex: 1, fontSize: 10, fontWeight: 700 },
      rowLine: { flexDirection: 'row', borderBottom: '1px solid #eee', paddingVertical: 3 },
      cell: { flex: 1, fontSize: 10 },
      small: { fontSize: 10 },
      footer: { position: 'absolute', bottom: 16, left: 24, right: 24, fontSize: 10, color: '#777', textAlign: lang==='ar' ? 'left' : 'right' },
    });

    const fmtNum = (n?: number) => (n==null? '0' : Math.round(n).toLocaleString(lang==='ar'?'ar':'en'));
    const fmtDate = (iso?: string) => {
      if (!iso) return '—';
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString(lang==='ar'?'ar-EG':'en-US');
    };
    const currencyUnit: string = resolvedBranding?.currency || '';
    const fmtAmt = (n?: number) => currencyUnit ? `${fmtNum(n)} ${currencyUnit}` : fmtNum(n);

    const roleName = (r?: string) => {
      if (!r) return '—';
      if (lang === 'ar') {
        switch (r) {
          case 'admin': return 'مدير';
          case 'gm': return 'مدير عام';
          case 'manager': return 'مدير منطقة';
          case 'medical_rep': return 'مندوب طبي';
          case 'accountant': return 'محاسب';
          case 'user': return 'مستخدم';
          case 'demo': return 'عرض توضيحي';
          default: return r;
        }
      }
      return r;
    };

    function getPeriodLabel(p: string, rng: { start?: string; end?: string }, l: 'ar'|'en') {
      const d = (iso?: string) => {
        if (!iso) return '—';
        const dt = new Date(iso); if (isNaN(dt.getTime())) return '—';
        return dt.toLocaleDateString(l==='ar'?'ar-EG':'en-US');
      };
      if (l === 'ar') {
        switch (p) {
          case 'this_month': return 'الشهر الحالي';
          case 'last_month': return 'الشهر الماضي';
          case 'last_3_months': return 'آخر 3 أشهر';
          case 'ytd': return 'منذ بداية السنة';
          case 'custom': return `مخصص: ${d(rng.start)} - ${d(rng.end)}`;
          default: return p;
        }
      } else {
        switch (p) {
          case 'this_month': return 'This month';
          case 'last_month': return 'Last month';
          case 'last_3_months': return 'Last 3 months';
          case 'ytd': return 'Year to date';
          case 'custom': return `Custom: ${d(rng.start)} - ${d(rng.end)}`;
          default: return p;
        }
      }
    }

    // Previous period comparison helpers
    function getPrevRange(p: string, curr: { start?: string; end?: string }) {
      const now = new Date();
      const startOfMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 1));
      const endOfMonth = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
      if (p === 'this_month') {
        const y = now.getUTCFullYear();
        const m = now.getUTCMonth() - 1;
        return { start: startOfMonth(y, m).toISOString(), end: endOfMonth(y, m).toISOString() };
      }
      if (p === 'last_month') {
        const y = now.getUTCFullYear();
        const m = now.getUTCMonth() - 2;
        return { start: startOfMonth(y, m).toISOString(), end: endOfMonth(y, m).toISOString() };
      }
      if (p === 'last_3_months') {
        // previous three months window immediately before current
        const currStart = curr.start ? new Date(curr.start) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1));
        const prevStart = new Date(Date.UTC(currStart.getUTCFullYear(), currStart.getUTCMonth() - 3, 1));
        const prevEnd = new Date(Date.UTC(currStart.getUTCFullYear(), currStart.getUTCMonth(), 0, 23, 59, 59, 999));
        return { start: prevStart.toISOString(), end: prevEnd.toISOString() };
      }
      if (p === 'ytd') {
        const start = new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1));
        const end = new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
        return { start: start.toISOString(), end: end.toISOString() };
      }
      return undefined;
    }
    function pctChange(curr: number, prev: number) {
      if (prev <= 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    }

    const prevRange = getPrevRange(period, range);
    const prevVisitsCount = prevRange ? uVisitsAll.filter((v: any) => {
      const iso = v.visitDate; return (!prevRange.start || !prevRange.end) || (iso && iso >= prevRange.start && iso <= prevRange.end);
    }).length : 0;
    const prevSales = prevRange ? uOrdersAll
      .filter((o: any) => { const iso = o.orderDate; return (!prevRange.start || !prevRange.end) || (iso && iso >= prevRange.start && iso <= prevRange.end); })
      .reduce((s: number, o: any) => s + (o.totalAmount || o.total || 0), 0) : 0;

    const visitsDelta = pctChange(visitsCount, prevVisitsCount);
    const salesDelta = pctChange(totalSales, prevSales);

    const doc = React.createElement(
      Document,
      null,
      React.createElement(
        Page,
        { size: 'A4', style: styles.page },
        React.createElement(View, { style: styles.header },
          React.createElement(View, { style: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' } },
            React.createElement(View, { style: { flexDirection: 'row', alignItems: 'center', gap: 8 } },
              resolvedBranding?.logo ? React.createElement(Image, { src: resolvedBranding.logo, style: { width: 28, height: 28 } }) : null,
              React.createElement(Text, { style: styles.title }, (resolvedBranding?.title || 'EP Group System') + ' — ' + (lang==='ar' ? 'تقرير الملف التفصيلي' : 'User Profile Report'))
            ),
            React.createElement(Text, { style: styles.muted }, new Date().toLocaleString(lang==='ar'?'ar':'en'))
          ),
          React.createElement(Text, { style: styles.muted }, `${user.fullName} (@${user.username})`),
          React.createElement(Text, { style: styles.muted }, (lang==='ar' ? 'الفترة: ' : 'Period: ') + getPeriodLabel(period, range, lang))
        ),

        // User details
        React.createElement(Text, { style: styles.section }, lang==='ar' ? 'بيانات المستخدم' : 'User Details'),
        React.createElement(View, { style: styles.row },
          React.createElement(View, { style: styles.kpi }, React.createElement(Text, { style: styles.small }, (lang==='ar'?'الدور: ':'Role: ') + roleName(user.role))),
          React.createElement(View, { style: styles.kpi }, React.createElement(Text, { style: styles.small }, (lang==='ar'?'البريد: ':'Email: ') + (user.email || '—'))),
          React.createElement(View, { style: styles.kpi }, React.createElement(Text, { style: styles.small }, (lang==='ar'?'الهاتف: ':'Phone: ') + (user.primaryPhone || '—')))
        ),
        React.createElement(View, { style: styles.row },
          React.createElement(View, { style: styles.kpi }, React.createElement(Text, { style: styles.small }, (lang==='ar'?'واتساب: ':'WhatsApp: ') + (user.whatsappPhone || '—'))),
          React.createElement(View, { style: styles.kpi }, React.createElement(Text, { style: styles.small }, (lang==='ar'?'بديل: ':'Alt: ') + (user.altPhone || '—'))),
          React.createElement(View, { style: styles.kpi }, React.createElement(Text, { style: styles.small }, (lang==='ar'?'آخر زيارة: ':'Last Visit: ') + fmtDate(lastVisit)))
        ),
        React.createElement(View, { style: styles.row },
          React.createElement(View, { style: styles.kpi }, React.createElement(Text, { style: styles.small }, (lang==='ar'?'المنطقة: ':'Area: ') + (user.area || '—'))),
          React.createElement(View, { style: styles.kpi }, React.createElement(Text, { style: styles.small }, (lang==='ar'?'الخط: ':'Line: ') + (user.line || '—'))),
          React.createElement(View, { style: styles.kpi }, React.createElement(Text, { style: styles.small }, `${lang==='ar'?'الأهداف: ':'Targets: '}${lang==='ar'?'زيارات: ':'Visits: '}${user.visitsTarget ?? '—'}  ${lang==='ar'?'• مبيعات: ':'• Sales: '}${user.salesTarget ?? '—'}`))
        ),

        // KPIs
        React.createElement(Text, { style: styles.section }, lang==='ar' ? 'المؤشرات' : 'KPIs'),
        React.createElement(View, { style: styles.row },
          React.createElement(View, { style: styles.kpi }, React.createElement(Text, null, (lang==='ar'?'الزيارات: ':'Visits: ') + fmtNum(visitsCount))),
          React.createElement(View, { style: styles.kpi }, React.createElement(Text, null, (lang==='ar'?'الفواتير: ':'Orders: ') + fmtNum(ordersCount))),
          React.createElement(View, { style: styles.kpi }, React.createElement(Text, null, (lang==='ar'?'إجمالي المبيعات: ':'Total Sales: ') + fmtAmt(totalSales))),
          React.createElement(View, { style: styles.kpi }, React.createElement(Text, null, (lang==='ar'?'إجمالي التحصيل: ':'Total Collected: ') + fmtAmt(totalCollected))),
          React.createElement(View, { style: styles.kpi }, React.createElement(Text, null, (lang==='ar'?'إجمالي المديونية: ':'Current Debt: ') + fmtAmt(currentDebt)))
        ),

        // Best clinic and product
        React.createElement(View, { style: styles.row },
          React.createElement(View, { style: styles.kpi }, React.createElement(Text, null, (lang==='ar'?'أفضل عيادة: ':'Best Clinic: ') + (bestClinicBySales?.name || '—'))),
          React.createElement(View, { style: styles.kpi }, React.createElement(Text, null, (lang==='ar'?'أفضل منتج (كمية): ':'Best Product (Qty): ') + (bestProductByQty?.name || '—')))
        ),

        // Targets vs Actuals
        React.createElement(Text, { style: styles.section }, lang==='ar' ? 'الأهداف مقابل الفعلي' : 'Targets vs Actuals'),
        React.createElement(View, { style: styles.row },
          React.createElement(View, { style: styles.kpi }, React.createElement(Text, null, (lang==='ar'?'الزيارات: ':'Visits: ') + `${fmtNum(visitsCount)} / ${fmtNum(user.visitsTarget)}`)),
          React.createElement(View, { style: styles.kpi }, React.createElement(Text, null, (lang==='ar'?'المبيعات: ':'Sales: ') + `${fmtNum(totalSales)} / ${fmtNum(user.salesTarget)}`))
        ),

        // Comparison vs previous period
        React.createElement(Text, { style: styles.section }, lang==='ar' ? 'المقارنة مع الفترة السابقة' : 'Comparison vs Previous'),
        React.createElement(View, { style: styles.row },
          React.createElement(View, { style: styles.kpi }, React.createElement(Text, null, (lang==='ar'?'الزيارات: ':'Visits: ') + `${fmtNum(visitsCount)} | ${lang==='ar'?'السابق':'Prev'} ${fmtNum(prevVisitsCount)} | Δ ${(visitsDelta>=0?'+':'') + visitsDelta}%`)),
          React.createElement(View, { style: styles.kpi }, React.createElement(Text, null, (lang==='ar'?'المبيعات: ':'Sales: ') + `${fmtNum(totalSales)} | ${lang==='ar'?'السابق':'Prev'} ${fmtNum(prevSales)} | Δ ${(salesDelta>=0?'+':'') + salesDelta}%`))
        ),

        // Highlights
        React.createElement(Text, { style: styles.section }, lang==='ar' ? 'مقتطفات' : 'Highlights'),
        React.createElement(View, { style: styles.row },
          React.createElement(View, { style: styles.kpi }, React.createElement(Text, null, (lang==='ar'?'أفضل عيادة: ':'Best Clinic: ') + (bestClinicBySales?.name || '—'))),
          React.createElement(View, { style: styles.kpi }, React.createElement(Text, null, (lang==='ar'?'أفضل منتج (كمية): ':'Best Product (Qty): ') + (bestProductByQty?.name || '—')))
        ),
        React.createElement(View, { style: styles.row },
          React.createElement(View, { style: styles.kpi }, React.createElement(Text, null, (lang==='ar'?'آخر زيارة: ':'Last Visit: ') + fmtDate(lastVisit))),
          React.createElement(View, { style: styles.kpi }, React.createElement(Text, null, (lang==='ar'?'آخر فاتورة: ':'Last Invoice: ') + fmtDate(lastInvoice)))
        ),

        // Top clinics by sales
        React.createElement(Text, { style: styles.section }, lang==='ar' ? 'أفضل العيادات/العملاء (مبيعات)' : 'Top Clinics (Sales)'),
        React.createElement(View, { style: styles.tableHeader },
          React.createElement(Text, { style: styles.cellHeader }, lang==='ar' ? 'العيادة' : 'Clinic'),
          React.createElement(Text, { style: styles.cellHeader }, (lang==='ar' ? 'المبلغ' : 'Amount') + (currencyUnit ? ` (${currencyUnit})` : ''))
        ),
        ...topClinicsBySales.map((r: any, i: number) => React.createElement(View, { key: 'c'+i, style: styles.rowLine },
          React.createElement(Text, { style: styles.cell }, r.name),
          React.createElement(Text, { style: styles.cell }, fmtAmt(r.value))
        )),

        // Top products by revenue
        React.createElement(Text, { style: styles.section }, lang==='ar' ? 'أفضل المنتجات (قيمة)' : 'Top Products (Revenue)'),
        React.createElement(View, { style: styles.tableHeader },
          React.createElement(Text, { style: styles.cellHeader }, lang==='ar' ? 'المنتج' : 'Product'),
          React.createElement(Text, { style: styles.cellHeader }, (lang==='ar' ? 'الإيراد' : 'Revenue') + (currencyUnit ? ` (${currencyUnit})` : ''))
        ),
        ...topProductsByRevenue.map((p: any, i: number) => React.createElement(View, { key: 'pr'+i, style: styles.rowLine },
          React.createElement(Text, { style: styles.cell }, p.name),
          React.createElement(Text, { style: styles.cell }, fmtAmt(p.value))
        )),

        // Top products by qty
        React.createElement(Text, { style: styles.section }, lang==='ar' ? 'أفضل المنتجات (كمية)' : 'Top Products (Qty)'),
        React.createElement(View, { style: styles.tableHeader },
          React.createElement(Text, { style: styles.cellHeader }, lang==='ar' ? 'المنتج' : 'Product'),
          React.createElement(Text, { style: styles.cellHeader }, lang==='ar' ? 'الكمية' : 'Qty')
        ),
        ...topProductsByQty.map((p: any, i: number) => React.createElement(View, { key: 'pq'+i, style: styles.rowLine },
          React.createElement(Text, { style: styles.cell }, p.name),
          React.createElement(Text, { style: styles.cell }, fmtNum(p.value))
        )),

        // Footer with branding and page numbers
        React.createElement(
          Text,
          { style: styles.footer, render: resolvedBranding?.showPageNumbers ? ({ pageNumber, totalPages }: any) => (
            `${resolvedBranding?.companyAddress || ''}` +
            `${resolvedBranding?.phone ? ' | ' + resolvedBranding.phone : ''}` +
            `${resolvedBranding?.email ? ' | ' + resolvedBranding.email : ''}` +
            `${resolvedBranding?.website ? ' | ' + resolvedBranding.website : ''}` +
            `${totalPages ? (lang==='ar' ? ` | الصفحة ${pageNumber} من ${totalPages}` : ` | Page ${pageNumber} of ${totalPages}`) : ''}`
          ) : undefined },
          resolvedBranding?.showPageNumbers ? (
            `${resolvedBranding?.companyAddress || ''}` +
            `${resolvedBranding?.phone ? ' | ' + resolvedBranding.phone : ''}` +
            `${resolvedBranding?.email ? ' | ' + resolvedBranding.email : ''}` +
            `${resolvedBranding?.website ? ' | ' + resolvedBranding.website : ''}`
          ) : (
            `${resolvedBranding?.companyAddress || ''}` +
            `${resolvedBranding?.phone ? ' | ' + resolvedBranding.phone : ''}` +
            `${resolvedBranding?.email ? ' | ' + resolvedBranding.email : ''}` +
            `${resolvedBranding?.website ? ' | ' + resolvedBranding.website : ''}`
          )
        )
      )
    );

    const file = await pdf(doc).toBuffer();
    const fileName = `${user.username}-user-profile-${Date.now()}.pdf`;
    return new Response(file, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e: any) {
    console.error('User profile PDF failed', e);
    return NextResponse.json({ ok: false, error: 'Failed to generate PDF' }, { status: 500 });
  }
}
