// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { fetchUsers, fetchOrders, fetchVisits, fetchCollections } from '@/lib/supabase-services';

function getRange(period: string, custom_start?: string, custom_end?: string) {
  const now = new Date();
  const clampEnd = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23,59,59,999));
  if (period === 'this_month') {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth()+1, 0, 23,59,59,999));
    return { start: start.toISOString(), end: end.toISOString() };
  }
  if (period === 'last_month') {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth()-1, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23,59,59,999));
    return { start: start.toISOString(), end: end.toISOString() };
  }
  if (period === 'last_3_months') {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth()-2, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth()+1, 0, 23,59,59,999));
    return { start: start.toISOString(), end: end.toISOString() };
  }
  if (period === 'ytd') {
    const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const end = clampEnd(now);
    return { start: start.toISOString(), end: end.toISOString() };
  }
  if (period === 'custom' && custom_start && custom_end) {
    return { start: new Date(custom_start).toISOString(), end: clampEnd(new Date(custom_end)).toISOString() };
  }
  return undefined; // all time
}

function inRange(dateIso?: string, range?: { start: string; end: string }) {
  if (!range || !dateIso) return true;
  return dateIso >= range.start && dateIso <= range.end;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { scope = 'rep', period = 'this_month', custom_start, custom_end, recipients = [], sendEmail = false, format = 'pdf', lang = 'ar' } = body || {};

    const range = getRange(period, custom_start, custom_end);

    // Pull data from Supabase
    const [users, orders, visits, collections] = await Promise.all([
      fetchUsers(),
      fetchOrders(),
      fetchVisits(),
      fetchCollections(),
    ]);

    type Row = { key: string; name: string; visits: number; invoicesCount: number; sales: number; collected: number; currentDebt: number };

    const groups = new Map<string, { name: string; userIds: string[] }>();
    if (scope === 'manager') {
      const byManager = new Map<string, string[]>();
      for (const u of users) {
        const key = (u.manager as any) || 'Unassigned';
        if (!byManager.has(key)) byManager.set(key, []);
        byManager.get(key)!.push(u.id);
      }
      for (const [mgr, ids] of byManager) {
        groups.set(mgr, { name: mgr, userIds: ids });
      }
    } else {
      for (const u of users) {
        groups.set(u.id, { name: `${u.fullName} (@${u.username})`, userIds: [u.id] });
      }
    }

    const rows: Row[] = [];
    for (const [key, g] of groups) {
      const gVisits = visits.filter(v => g.userIds.includes(v.representativeId) && inRange(v.visitDate, range));
      const gOrders = orders.filter(o => g.userIds.includes(o.representativeId) && inRange(o.orderDate, range));
      const gCollections = collections.filter(c => g.userIds.includes(c.representativeId) && inRange(c.collectionDate, range));

      const visitsCount = gVisits.length;
      const invoicesCount = gOrders.length;
      const sales = gOrders.reduce((s,o)=> s + (o.totalAmount || (o as any).total || 0), 0);
      const collected = gCollections.reduce((s,c)=> s + (c.amount || 0), 0);
      const currentDebt = Math.max(0, sales - collected);
      rows.push({ key, name: g.name, visits: visitsCount, invoicesCount, sales, collected, currentDebt });
    }

    // Sort by sales desc
    rows.sort((a,b)=> b.sales - a.sales);

    // If email requested, try to send
    if (sendEmail && Array.isArray(recipients) && recipients.length > 0) {
      try {
        const nodemailer = await import('nodemailer');
        const host = process.env.SMTP_HOST!;
        const port = parseInt(process.env.SMTP_PORT || '587', 10);
        const user = process.env.SMTP_USER!;
        const pass = process.env.SMTP_PASS!;
        const from = process.env.SMTP_FROM || user;
        if (!host || !user || !pass) {
          return NextResponse.json({ ok: false, error: 'Missing SMTP env (SMTP_HOST, SMTP_USER, SMTP_PASS).' }, { status: 500 });
        }

        let attachment: { filename: string; content: Buffer; contentType: string };
        if (format === 'csv' || lang === 'csv') {
          const headers = ['Name','Visits','Invoices','Sales','Collected','Debt'];
          const lines = [headers.join(','), ...rows.map(r => [r.name, r.visits, r.invoicesCount, r.sales, r.collected, r.currentDebt].join(','))];
          const csv = lines.join('\n');
          attachment = { filename: `report-${scope}-${period}.csv`, content: Buffer.from('\ufeff' + csv, 'utf8'), contentType: 'text/csv' };
        } else {
          // Try PDF
      try {
            const React = await import('react');
            const renderer = await import('@react-pdf/renderer');
            const { pdf, Document, Page, Text, View, StyleSheet } = renderer as any;
            const styles = StyleSheet.create({ page: { padding: 24, fontSize: 11, direction: lang==='ar'?'rtl':'ltr' }, row: { flexDirection: 'row' }, cell: { flexGrow: 1, padding: 4, borderBottom: '1px solid #eee' }, head: { fontWeight: 700 } });
            const headers = ['الاسم','الزيارات','عدد الفواتير','المبيعات','التحصيل','المديونية'];
            const doc = React.createElement(
              Document,
              null,
              React.createElement(
                Page,
                { size: 'A4', style: styles.page },
                React.createElement(
                  View,
                  { style: [styles.row, { marginBottom: 8 }] },
                  React.createElement(Text, { style: { fontSize: 14, fontWeight: 700 } }, `${scope==='manager'?'تقرير المدراء':'تقرير المندوبين'} — ${period}`)
                ),
                React.createElement(
                  View,
                  { style: styles.row },
                  ...headers.map((h: string, i: number) => React.createElement(Text, { key: i, style: [styles.cell, styles.head] }, h))
                ),
                ...rows.map((r,i)=> React.createElement(
                  View,
                  { key: i, style: styles.row },
                  React.createElement(Text, { style: styles.cell }, r.name),
                  React.createElement(Text, { style: styles.cell }, String(r.visits)),
                  React.createElement(Text, { style: styles.cell }, String(r.invoicesCount)),
                  React.createElement(Text, { style: styles.cell }, r.sales.toLocaleString()),
                  React.createElement(Text, { style: styles.cell }, r.collected.toLocaleString()),
                  React.createElement(Text, { style: styles.cell }, r.currentDebt.toLocaleString()),
                ))
              )
            );
            const buffer = await (pdf as any)(doc).toBuffer();
            attachment = { filename: `report-${scope}-${period}.pdf`, content: buffer, contentType: 'application/pdf' };
          } catch {
            // Fallback to CSV if PDF renderer is missing
            const headers = ['Name','Visits','Invoices','Sales','Collected','Debt'];
            const lines = [headers.join(','), ...rows.map(r => [r.name, r.visits, r.invoicesCount, r.sales, r.collected, r.currentDebt].join(','))];
            const csv = lines.join('\n');
            attachment = { filename: `report-${scope}-${period}.csv`, content: Buffer.from('\ufeff' + csv, 'utf8'), contentType: 'text/csv' };
          }
        }

        const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
        await transporter.sendMail({ from, to: recipients.join(','), subject: `EP Reports — ${scope} — ${period}`, text: 'Attached report.', attachments: [attachment] });
        return NextResponse.json({ ok: true, mailed: recipients.length });
      } catch (e: any) {
        return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
      }
    }

    // If not emailing, return file directly
    if (format === 'csv') {
      const headers = ['Name','Visits','Invoices','Sales','Collected','Debt'];
      const lines = [headers.join(','), ...rows.map(r => [r.name, r.visits, r.invoicesCount, r.sales, r.collected, r.currentDebt].join(','))];
      const csv = lines.join('\n');
      return new Response('\ufeff' + csv, { status: 200, headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="report-${scope}-${period}.csv"` } });
    }

    try {
      const React = await import('react');
      const renderer = await import('@react-pdf/renderer');
      const { pdf, Document, Page, Text, View, StyleSheet } = renderer as any;
      const styles = StyleSheet.create({ page: { padding: 24, fontSize: 11, direction: lang==='ar'?'rtl':'ltr' }, row: { flexDirection: 'row' }, cell: { flexGrow: 1, padding: 4, borderBottom: '1px solid #eee' }, head: { fontWeight: 700 } });
      const headers = ['الاسم','الزيارات','عدد الفواتير','المبيعات','التحصيل','المديونية'];
      const doc = React.createElement(
        Document,
        null,
        React.createElement(
          Page,
          { size: 'A4', style: styles.page },
          React.createElement(
            View,
            { style: [styles.row, { marginBottom: 8 }] },
            React.createElement(Text, { style: { fontSize: 14, fontWeight: 700 } }, `${scope==='manager'?'تقرير المدراء':'تقرير المندوبين'} — ${period}`)
          ),
          React.createElement(
            View,
            { style: styles.row },
            ...headers.map((h: string, i: number) => React.createElement(Text, { key: i, style: [styles.cell, styles.head] }, h))
          ),
          ...rows.map((r,i)=> React.createElement(
            View,
            { key: i, style: styles.row },
            React.createElement(Text, { style: styles.cell }, r.name),
            React.createElement(Text, { style: styles.cell }, String(r.visits)),
            React.createElement(Text, { style: styles.cell }, String(r.invoicesCount)),
            React.createElement(Text, { style: styles.cell }, r.sales.toLocaleString()),
            React.createElement(Text, { style: styles.cell }, r.collected.toLocaleString()),
            React.createElement(Text, { style: styles.cell }, r.currentDebt.toLocaleString()),
          ))
        )
      );
      const buffer = await (pdf as any)(doc).toBuffer();
      return new Response(buffer, { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="report-${scope}-${period}.pdf"` } });
    } catch {
      // Fallback to CSV
      const headers = ['Name','Visits','Invoices','Sales','Collected','Debt'];
      const lines = [headers.join(','), ...rows.map(r => [r.name, r.visits, r.invoicesCount, r.sales, r.collected, r.currentDebt].join(','))];
      const csv = lines.join('\n');
      return new Response('\ufeff' + csv, { status: 200, headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="report-${scope}-${period}.csv"` } });
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}