"use client";

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Eye, User as UserIcon, TrendingUp, CalendarClock, Download, FileText, Printer } from 'lucide-react';
import type { User } from '@/lib/types';
import { useDataProvider } from '@/lib/data-provider';

function formatDate(d?: string) {
  if (!d) return '—';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function toCurrency(n?: number) {
  if (n == null) return '0';
  try {
    return new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 0 }).format(n);
  } catch {
    return String(Math.round(n));
  }
}

function roleName(role: string) {
  switch (role) {
    case 'admin': return 'مدير';
    case 'manager': return 'مدير منطقة';
    case 'medical_rep': return 'مندوب طبي';
    case 'accountant': return 'محاسب';
    case 'user': return 'مستخدم';
    case 'test_user': return 'مستخدم تجريبي';
    case 'demo': return 'عرض توضيحي';
    default: return role;
  }
}

type Period = 'all' | 'this_month' | 'last_month' | 'last_3_months' | 'ytd' | 'custom';

export function MiniProfileCard({ user, period = 'all', customRange }: { user: User; period?: Period; customRange?: { start: string; end: string } }) {
  const { orders, visits, collections, clinics } = useDataProvider();
  const debts: any[] = []; // Placeholder until debts is added to DataProvider
  const [open, setOpen] = useState(false);

  function monthRange(offsetMonths: number) {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offsetMonths, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offsetMonths + 1, 0, 23, 59, 59, 999));
    return { start: start.toISOString(), end: end.toISOString() };
  }
  function yearToDateRange() {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23,59,59,999));
    return { start: start.toISOString(), end: end.toISOString() };
  }
  function last3MonthsRange() {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23,59,59,999));
    return { start: start.toISOString(), end: end.toISOString() };
  }

  function inRange(dateIso?: string, range?: { start: string; end: string }) {
    if (!range || !dateIso) return true;
    return dateIso >= range.start && dateIso <= range.end;
  }

  const metrics = useMemo(() => {
    // Select period ranges
    let currentRange: { start: string; end: string } | undefined;
    let previousRange: { start: string; end: string } | undefined;
    if (period === 'this_month') {
      currentRange = monthRange(0);
      previousRange = monthRange(-1);
    } else if (period === 'last_month') {
      currentRange = monthRange(-1);
      previousRange = monthRange(-2);
    } else if (period === 'last_3_months') {
      currentRange = last3MonthsRange();
      // previous three months for comparison
      const prevStart = new Date(currentRange.start);
      prevStart.setUTCMonth(prevStart.getUTCMonth() - 3);
      const prevEnd = new Date(currentRange.start);
      prevEnd.setUTCDate(0); // day before current start
      previousRange = { start: prevStart.toISOString(), end: prevEnd.toISOString() };
    } else if (period === 'ytd') {
      currentRange = yearToDateRange();
      const prevYear = new Date(currentRange.start);
      prevYear.setUTCFullYear(prevYear.getUTCFullYear() - 1);
      const prevYearEnd = new Date(currentRange.end);
      prevYearEnd.setUTCFullYear(prevYearEnd.getUTCFullYear() - 1);
      previousRange = { start: prevYear.toISOString(), end: prevYearEnd.toISOString() };
    } else if (period === 'custom' && customRange) {
      currentRange = customRange;
      previousRange = undefined;
    }

    const uOrdersAll = orders.filter(o => o.representativeId === user.id);
    const uVisitsAll = visits.filter(v => v.representativeId === user.id);
    const uCollectionsAll = collections.filter(c => c.representativeId === user.id);

    const uOrders = currentRange ? uOrdersAll.filter(o => inRange(o.orderDate, currentRange)) : uOrdersAll;
    const uVisits = currentRange ? uVisitsAll.filter(v => inRange(v.visitDate, currentRange)) : uVisitsAll;
    const uCollections = currentRange ? uCollectionsAll.filter(c => inRange(c.collectionDate, currentRange)) : uCollectionsAll;

    // Aggregate by clinic for top lists
    const clinicNameById = new Map<string, string>();
    (clinics || []).forEach(c => clinicNameById.set(c.id, c.name));

    const salesByClinic = new Map<string, number>();
    const visitsByClinic = new Map<string, number>();
    const collectionsByClinic = new Map<string, number>();

    for (const o of uOrders) {
      const key = o.clinicId || 'unknown';
      salesByClinic.set(key, (salesByClinic.get(key) || 0) + (o.totalAmount || o.total || 0));
    }
    for (const v of uVisits) {
      const key = v.clinicId || 'unknown';
      visitsByClinic.set(key, (visitsByClinic.get(key) || 0) + 1);
    }
    for (const c of uCollections) {
      const key = c.clinicId || 'unknown';
      collectionsByClinic.set(key, (collectionsByClinic.get(key) || 0) + (c.amount || 0));
    }

    const toRank = (m: Map<string, number>, type: 'sales'|'visits'|'collections') => Array.from(m.entries())
      .map(([id, val]) => ({
        clinicId: id,
        name: clinicNameById.get(id) || 'غير محدد',
        value: val,
        type,
      }))
      .sort((a,b) => b.value - a.value)
      .slice(0, 5);

    const topSales = toRank(salesByClinic, 'sales');
    const topVisits = toRank(visitsByClinic, 'visits');
    const topCollections = toRank(collectionsByClinic, 'collections');

    // Top products by revenue and quantity from order items
    const revenueByProduct = new Map<string, { name: string; value: number }>();
    const qtyByProduct = new Map<string, { name: string; value: number }>();
    for (const o of uOrders) {
      for (const it of o.items || []) {
        const key = it.productId || it.productName || 'unknown';
        const name = it.productName || 'غير محدد';
        const rev = (it.price || 0) * (it.quantity || 0);
        const r = revenueByProduct.get(key);
        revenueByProduct.set(key, { name, value: (r?.value || 0) + rev });
        const q = qtyByProduct.get(key);
        qtyByProduct.set(key, { name, value: (q?.value || 0) + (it.quantity || 0) });
      }
    }
    const topProductsRevenue = Array.from(revenueByProduct.values()).sort((a,b)=>b.value-a.value).slice(0,5);
    const topProductsQty = Array.from(qtyByProduct.values()).sort((a,b)=>b.value-a.value).slice(0,5);

    const visitsCount = uVisits.length;
    const lastVisit = uVisits.map(v => v.visitDate).sort().at(-1);

    const invoicesCount = uOrders.length;
    const totalInvoice = uOrders.reduce((sum, o) => sum + (o.totalAmount || o.total || 0), 0);
    const lastInvoice = uOrders.map(o => o.orderDate).sort().at(-1);

    const totalCollected = uCollections.reduce((sum, c) => sum + (c.amount || 0), 0);
    const currentDebt = Math.max(0, totalInvoice - totalCollected);

    // Trends vs previous period
    let prevVisits = 0, prevSales = 0;
    if (previousRange) {
      prevVisits = uVisitsAll.filter(v => inRange(v.visitDate, previousRange)).length;
      prevSales = uOrdersAll
        .filter(o => inRange(o.orderDate, previousRange))
        .reduce((s, o) => s + (o.totalAmount || o.total || 0), 0);
    }

    // Last debt for this user (created_by)
    const userDebts = (debts || []).filter((d: any) => (d.created_by || (d as any).createdBy) === user.id);
    const lastDebt = userDebts.sort((a: any, b: any) => (a.created_at||'').localeCompare(b.created_at||''))[userDebts.length-1];

    function pctChange(curr: number, prev: number) {
      if (prev <= 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    }

    const visitsDelta = pctChange(visitsCount, prevVisits);
    const salesDelta = pctChange(totalInvoice, prevSales);

    return {
      visitsCount,
      lastVisit,
      invoicesCount,
      totalInvoice,
      lastInvoice,
      totalCollected,
      currentDebt,
      prevVisits,
      prevSales,
      visitsDelta,
      salesDelta,
      lastDebt,
      topSales,
      topVisits,
      topCollections,
      topProductsRevenue,
      topProductsQty,
    };
  }, [orders, visits, collections, debts, clinics, user.id, period, customRange]);

  const visitCompare = user.visitsTarget ? `${metrics.visitsCount} / ${user.visitsTarget}` : String(metrics.visitsCount);
  const salesCompare = user.salesTarget ? `${toCurrency(metrics.totalInvoice)} / ${toCurrency(user.salesTarget)}` : toCurrency(metrics.totalInvoice);

  // Export functions
  function buildExportPayload() {
    return {
      user: `${user.fullName} (@${user.username})`,
      period: period === 'custom' && customRange ? `custom (${new Date(customRange.start).toLocaleDateString()} - ${new Date(customRange.end).toLocaleDateString()})` : period,
      visits: metrics.visitsCount,
      sales: metrics.totalInvoice,
      invoicesCount: metrics.invoicesCount,
      collected: metrics.totalCollected,
      currentDebt: metrics.currentDebt,
      topSales: metrics.topSales,
      topVisits: metrics.topVisits,
      topCollections: metrics.topCollections,
      topProductsRevenue: metrics.topProductsRevenue,
      topProductsQty: metrics.topProductsQty,
    }
  }

  function exportCSV() {
    try {
      const csv = (window as any).makeMiniProfileCsv(buildExportPayload())
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mini-profile-${user.username}-${period}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('CSV export failed', e)
    }
  }

  function exportPDF() {
    const payload = buildExportPayload()
    const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1200')
    if (!w) return
    const style = `
      <style>
        body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; padding: 24px; color: #111; }
        h1 { font-size: 20px; margin: 0 0 4px; }
        h2 { font-size: 16px; margin: 16px 0 8px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border: 1px solid #e5e7eb; padding: 6px 8px; font-size: 12px; text-align: start; }
        th { background: #f8fafc; }
        .muted { color: #6b7280; }
      </style>
    `
    const html = `
      <html lang="ar" dir="rtl">
        <head><meta charset="utf-8">${style}<title>Mini Profile</title></head>
        <body>
          <h1>ملف مختصر - ${user.fullName}</h1>
          <div class="muted">@${user.username} • الفترة: ${period}</div>
          <h2>المؤشرات</h2>
          <table>
            <tbody>
              <tr><th>الزيارات</th><td>${payload.visits}</td></tr>
              <tr><th>المبيعات (فواتير)</th><td>${toCurrency(payload.sales)}</td></tr>
              <tr><th>عدد الفواتير</th><td>${payload.invoicesCount}</td></tr>
              <tr><th>التحصيل</th><td>${toCurrency(payload.collected)}</td></tr>
              <tr><th>المديونية الحالية</th><td>${toCurrency(payload.currentDebt)}</td></tr>
            </tbody>
          </table>
          <h2>أفضل العيادات/العملاء (مبيعات)</h2>
          <table><thead><tr><th>العيادة</th><th>المبلغ</th></tr></thead><tbody>
            ${payload.topSales.map((r:any) => `<tr><td>${r.name}</td><td>${toCurrency(r.value)}</td></tr>`).join('')}
          </tbody></table>
          <h2>أفضل العيادات/العملاء (زيارات)</h2>
          <table><thead><tr><th>العيادة</th><th>العدد</th></tr></thead><tbody>
            ${payload.topVisits.map((r:any) => `<tr><td>${r.name}</td><td>${r.value}</td></tr>`).join('')}
          </tbody></table>
          <h2>أفضل العيادات/العملاء (تحصيل)</h2>
          <table><thead><tr><th>العيادة</th><th>المبلغ</th></tr></thead><tbody>
            ${payload.topCollections.map((r:any) => `<tr><td>${r.name}</td><td>${toCurrency(r.value)}</td></tr>`).join('')}
          </tbody></table>
          <h2>أفضل المنتجات (قيمة)</h2>
          <table><thead><tr><th>المنتج</th><th>المبلغ</th></tr></thead><tbody>
            ${payload.topProductsRevenue.map((r:any) => `<tr><td>${r.name}</td><td>${toCurrency(r.value)}</td></tr>`).join('')}
          </tbody></table>
          <h2>أفضل المنتجات (كمية)</h2>
          <table><thead><tr><th>المنتج</th><th>الكمية</th></tr></thead><tbody>
            ${payload.topProductsQty.map((r:any) => `<tr><td>${r.name}</td><td>${r.value}</td></tr>`).join('')}
          </tbody></table>
          <script>window.print();</script>
        </body>
      </html>
    `
    w.document.open()
    w.document.write(html)
    w.document.close()
  }

  return (
    <>
      <Card className="hover:border-primary/60 transition-all">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {user.profilePicture ? (
                <img src={user.profilePicture} alt={user.fullName} className="w-9 h-9 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserIcon className="h-4 w-4 text-primary" />
                </div>
              )}
              <div>
                <CardTitle className="text-base">{user.fullName}</CardTitle>
                <CardDescription className="text-xs">@{user.username}</CardDescription>
              </div>
            </div>
            <Badge variant="secondary">{roleName(user.role)}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-2 rounded-md border bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">الزيارات</span>
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="font-semibold mt-1 flex items-center gap-2">
                <span>{visitCompare}</span>
                {period !== 'all' && (
                  <span className={metrics.visitsDelta >= 0 ? 'text-green-600 text-xs' : 'text-red-600 text-xs'}>
                    {metrics.visitsDelta >= 0 ? '+' : ''}{metrics.visitsDelta}%
                  </span>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                <CalendarClock className="h-3 w-3" /> آخر زيارة: {formatDate(metrics.lastVisit)}
              </div>
            </div>
            <div className="p-2 rounded-md border bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">المبيعات (فواتير)</span>
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="font-semibold mt-1 flex items-center gap-2">
                <span>{salesCompare}</span>
                {period !== 'all' && (
                  <span className={metrics.salesDelta >= 0 ? 'text-green-600 text-xs' : 'text-red-600 text-xs'}>
                    {metrics.salesDelta >= 0 ? '+' : ''}{metrics.salesDelta}%
                  </span>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                <CalendarClock className="h-3 w-3" /> آخر فاتورة: {formatDate(metrics.lastInvoice)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2 rounded-md border">
              <div className="text-muted-foreground">عدد الفواتير</div>
              <div className="font-medium mt-1">{metrics.invoicesCount}</div>
            </div>
            <div className="p-2 rounded-md border">
              <div className="text-muted-foreground">التحصيل</div>
              <div className="font-medium mt-1">{toCurrency(metrics.totalCollected)}</div>
            </div>
            <div className="p-2 rounded-md border">
              <div className="text-muted-foreground">المديونية</div>
              <div className="font-medium mt-1">{toCurrency(metrics.currentDebt)}</div>
              <div className="text-[11px] text-muted-foreground mt-1">آخر دين: {metrics.lastDebt ? `${toCurrency(metrics.lastDebt.amount)} - ${formatDate(metrics.lastDebt.created_at)}` : '—'}</div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => window.open(`/reports/user-profile?userId=${user.id}`, '_blank') }>
              <FileText className="h-4 w-4 mr-2" /> تقرير شامل
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.open(`/reports/user-profile?userId=${user.id}&auto=print`, '_blank') }>
              <Printer className="h-4 w-4 mr-2" /> طباعة ملف
            </Button>
            <Button size="sm" variant="outline" onClick={async () => {
              try {
                const payload: any = { userId: user.id, period: 'this_month', lang: 'ar', topN: 5 };
                const res = await fetch('/api/reports/user-profile/pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                if (!res.ok) {
                  const p = await res.json().catch(()=>({}));
                  alert('تعذر إنشاء PDF عبر الخادم' + (p?.error ? `: ${p.error}` : ''));
                  return;
                }
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `${user.username || 'user'}-profile-${Date.now()}.pdf`; a.click();
                URL.revokeObjectURL(url);
              } catch (e) {
                alert('حدث خطأ أثناء إنشاء PDF عبر الخادم');
              }
            }}>
              <Download className="h-4 w-4 mr-2" /> تنزيل PDF
            </Button>
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
              <Eye className="h-4 w-4 mr-2" /> مزيد من المعلومات
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        {/* Export helpers */}
        {(() => {
          function toCsvRow(values: (string | number | undefined | null)[]) {
            return values.map(v => {
              const s = v == null ? '' : String(v)
              if (s.includes(',') || s.includes('\"') || s.includes('\n')) {
                return '"' + s.replace(/\"/g, '""') + '"'
              }
              return s
            }).join(',')
          }

          // Attach to component scope
          ;(window as any).makeMiniProfileCsv = (payload: any) => {
            const lines: string[] = []
            lines.push('Field,Value')
            lines.push(toCsvRow(['User', payload.user]))
            lines.push(toCsvRow(['Period', payload.period]))
            lines.push(toCsvRow(['Visits', payload.visits]))
            lines.push(toCsvRow(['Sales', payload.sales]))
            lines.push(toCsvRow(['Invoices Count', payload.invoicesCount]))
            lines.push(toCsvRow(['Collected', payload.collected]))
            lines.push(toCsvRow(['Current Debt', payload.currentDebt]))
            lines.push('')
            lines.push('Top Clinics - Sales,Amount')
            payload.topSales.forEach((r: any) => lines.push(toCsvRow([r.name, r.value])))
            lines.push('')
            lines.push('Top Clinics - Visits,Count')
            payload.topVisits.forEach((r: any) => lines.push(toCsvRow([r.name, r.value])))
            lines.push('')
            lines.push('Top Clinics - Collections,Amount')
            payload.topCollections.forEach((r: any) => lines.push(toCsvRow([r.name, r.value])))
            lines.push('')
            lines.push('Top Products - Revenue,Amount')
            payload.topProductsRevenue.forEach((r: any) => lines.push(toCsvRow([r.name, r.value])))
            lines.push('')
            lines.push('Top Products - Quantity,Qty')
            payload.topProductsQty.forEach((r: any) => lines.push(toCsvRow([r.name, r.value])))
            return lines.join('\n')
          }
          return null
        })()}
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ملف مختصر - {user.fullName}</DialogTitle>
            <DialogDescription>مقارنة الأرقام بالأهداف الأصلية إن وجدت</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-md border">
                <div className="text-muted-foreground">إجمالي الزيارات</div>
                <div className="font-semibold mt-1">{visitCompare}</div>
                <div className="text-[12px] text-muted-foreground">آخر زيارة: {formatDate(metrics.lastVisit)}</div>
              </div>
              <div className="p-3 rounded-md border">
                <div className="text-muted-foreground">إجمالي الفواتير</div>
                <div className="font-semibold mt-1">{salesCompare}</div>
                <div className="text-[12px] text-muted-foreground">آخر فاتورة: {formatDate(metrics.lastInvoice)}</div>
              </div>
            </div>
            <Separator />
            {/* Top Clinics/Customers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-md border">
                <div className="text-xs text-muted-foreground mb-1">أفضل العيادات/العملاء (مبيعات)</div>
                <ul className="space-y-1">
                  {metrics.topSales.length > 0 ? metrics.topSales.map((r, i) => (
                    <li key={`s-${i}`} className="flex justify-between"><span className="truncate">{i+1}. {r.name}</span><span className="font-medium">{toCurrency(r.value)}</span></li>
                  )) : <li className="text-muted-foreground">لا يوجد بيانات</li>}
                </ul>
              </div>
              <div className="p-3 rounded-md border">
                <div className="text-xs text-muted-foreground mb-1">أفضل العيادات/العملاء (زيارات)</div>
                <ul className="space-y-1">
                  {metrics.topVisits.length > 0 ? metrics.topVisits.map((r, i) => (
                    <li key={`v-${i}`} className="flex justify-between"><span className="truncate">{i+1}. {r.name}</span><span className="font-medium">{r.value}</span></li>
                  )) : <li className="text-muted-foreground">لا يوجد بيانات</li>}
                </ul>
              </div>
              <div className="p-3 rounded-md border">
                <div className="text-xs text-muted-foreground mb-1">أفضل العيادات/العملاء (تحصيل)</div>
                <ul className="space-y-1">
                  {metrics.topCollections.length > 0 ? metrics.topCollections.map((r, i) => (
                    <li key={`c-${i}`} className="flex justify-between"><span className="truncate">{i+1}. {r.name}</span><span className="font-medium">{toCurrency(r.value)}</span></li>
                  )) : <li className="text-muted-foreground">لا يوجد بيانات</li>}
                </ul>
              </div>
            </div>

            <Separator />
            {/* Top Products */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-md border">
                <div className="text-xs text-muted-foreground mb-1">أفضل المنتجات (قيمة)</div>
                <ul className="space-y-1">
                  {metrics.topProductsRevenue.length > 0 ? metrics.topProductsRevenue.map((p, i) => (
                    <li key={`pr-${i}`} className="flex justify-between"><span className="truncate">{i+1}. {p.name}</span><span className="font-medium">{toCurrency(p.value)}</span></li>
                  )) : <li className="text-muted-foreground">لا يوجد بيانات</li>}
                </ul>
              </div>
              <div className="p-3 rounded-md border">
                <div className="text-xs text-muted-foreground mb-1">أفضل المنتجات (كمية)</div>
                <ul className="space-y-1">
                  {metrics.topProductsQty.length > 0 ? metrics.topProductsQty.map((p, i) => (
                    <li key={`pq-${i}`} className="flex justify-between"><span className="truncate">{i+1}. {p.name}</span><span className="font-medium">{p.value}</span></li>
                  )) : <li className="text-muted-foreground">لا يوجد بيانات</li>}
                </ul>
              </div>
            </div>

            <Separator />
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-md border">
                <div className="text-muted-foreground">عدد الفواتير</div>
                <div className="font-semibold mt-1">{metrics.invoicesCount}</div>
              </div>
              <div className="p-3 rounded-md border">
                <div className="text-muted-foreground">آخر تحصيل</div>
                <div className="font-semibold mt-1">{toCurrency(metrics.totalCollected)}</div>
                <div className="text-[12px] text-muted-foreground">قد يختلف حسب المدفوعات المرتبطة</div>
              </div>
              <div className="p-3 rounded-md border">
                <div className="text-muted-foreground">آخر مديونية/حالي</div>
                <div className="font-semibold mt-1">{toCurrency(metrics.currentDebt)}</div>
                <div className="text-[12px] text-muted-foreground">آخر دين: {metrics.lastDebt ? `${toCurrency(metrics.lastDebt.amount)} - ${formatDate(metrics.lastDebt.created_at)}` : '—'}</div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <div className="flex-1" />
            <Button variant="outline" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" /> تصدير CSV
            </Button>
            <Button variant="outline" onClick={exportPDF}>
              <FileText className="h-4 w-4 mr-2" /> تصدير PDF
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}