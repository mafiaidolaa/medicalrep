"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDataProvider } from "@/lib/optimized-data-provider";
import type { User } from "@/lib/types";
import { openPrintWindowForElement } from "@/lib/print-utils";
import { useSearchParams } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";

import { User as UserIcon, CalendarClock, Download, Printer, Star, ShoppingCart, Activity } from "lucide-react";
import { useSiteSettingsValue } from "@/contexts/site-settings-context";

// Helpers
function formatDate(d?: string) {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("ar-EG", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function toCurrency(n?: number) {
  if (n == null) return "0";
  try {
    return new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(n);
  } catch {
    return String(Math.round(n));
  }
}

function roleName(role?: string) {
  switch (role) {
    case 'admin': return 'مدير';
    case 'gm': return 'مدير عام';
    case 'manager': return 'مدير منطقة';
    case 'medical_rep': return 'مندوب طبي';
    case 'accountant': return 'محاسب';
    case 'user': return 'مستخدم';
    case 'demo': return 'عرض توضيحي';
    default: return role || '—';
  }
}

function getPeriodLabel(p: Period, custom?: { start?: string; end?: string }) {
  const d = (v?: string) => v || '—';
  switch (p) {
    case 'this_month': return 'الشهر الحالي';
    case 'last_month': return 'الشهر الماضي';
    case 'last_3_months': return 'آخر 3 أشهر';
    case 'ytd': return 'منذ بداية السنة';
    case 'custom': return `مخصص: ${d(custom?.start)} - ${d(custom?.end)}`;
    default: return String(p);
  }
}

type Period = "this_month" | "last_month" | "last_3_months" | "ytd" | "custom";

function getRange(period: Period, custom?: { start?: string; end?: string }) {
  const now = new Date();
  const startOfMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 1));
  const endOfMonth = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));

  if (period === "this_month") {
    return { start: startOfMonth(now.getUTCFullYear(), now.getUTCMonth()).toISOString(), end: endOfMonth(now.getUTCFullYear(), now.getUTCMonth()).toISOString() };
  }
  if (period === "last_month") {
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth() - 1;
    return { start: startOfMonth(y, m).toISOString(), end: endOfMonth(y, m).toISOString() };
  }
  if (period === "last_3_months") {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1));
    const end = endOfMonth(now.getUTCFullYear(), now.getUTCMonth());
    return { start: start.toISOString(), end: end.toISOString() };
  }
  if (period === "ytd") {
    const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
    return { start: start.toISOString(), end: end.toISOString() };
  }
  return { start: custom?.start, end: custom?.end };
}

function inRange(dateIso?: string, range?: { start?: string; end?: string }) {
  if (!range || !range.start || !range.end || !dateIso) return true;
  return dateIso >= range.start && dateIso <= range.end;
}

// Lightweight horizontal bar chart component (no external deps)
function HBar({ data, valueFormatter }: { data: { name: string; value: number }[]; valueFormatter?: (n: number) => string }) {
  if (!data || data.length === 0) {
    return <div className="text-sm text-muted-foreground">لا يوجد بيانات</div>;
  }
  const max = Math.max(...data.map(d => d.value || 0), 0);
  return (
    <ul className="space-y-2">
      {data.map((d, i) => {
        const pct = max > 0 ? Math.max(2, Math.round((d.value / max) * 100)) : 0; // min width for visibility
        return (
          <li key={`hb-${i}`} className="flex items-center gap-3">
            <span className="w-40 truncate text-xs" title={d.name}>{i+1}. {d.name}</span>
            <div className="flex-1">
              <div className="h-3 w-full bg-muted rounded">
                <div className="h-3 bg-primary rounded" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <span className="text-xs tabular-nums min-w-16 text-right">
              {valueFormatter ? valueFormatter(d.value) : new Intl.NumberFormat('ar-EG').format(d.value)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default function UserProfileReportPage() {
  const { users, orders, visits, collections, clinics } = useDataProvider();
  const site = useSiteSettingsValue();
  const currencyUnit = site?.company_currency || '';
  const fmtAmt = (n?: number) => currencyUnit ? `${toCurrency(n)} ${currencyUnit}` : toCurrency(n);
  const sp = useSearchParams();
  const [userId, setUserId] = useState<string>(users[0]?.id || "");
  useEffect(() => {
    if (sp) {
      const q = sp.get('userId');
      if (q) setUserId(q);
    }
  }, [sp]);
  const [period, setPeriod] = useState<Period>("this_month");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [topN, setTopN] = useState<number>(7);
  const auto = sp?.get('auto');

  const reportRef = useRef<HTMLDivElement>(null);

  const user: User | undefined = users.find(u => u.id === userId) || users[0];
  const range = useMemo(() => getRange(period, { start: customStart, end: customEnd }), [period, customStart, customEnd]);

  const metrics = useMemo(() => {
    if (!user) return null;

    const uOrdersAll = orders.filter(o => o.representativeId === user.id);
    const uVisitsAll = visits.filter(v => v.representativeId === user.id);
    const uCollectionsAll = collections.filter(c => c.representativeId === user.id);

    const uOrders = uOrdersAll.filter(o => inRange(o.orderDate, range));
    const uVisits = uVisitsAll.filter(v => inRange(v.visitDate, range));
    const uCollections = uCollectionsAll.filter(c => inRange(c.collectionDate, range));

    const visitsCount = uVisits.length;
    const ordersCount = uOrders.length;

    const totalSales = uOrders.reduce((sum, o) => sum + (o.totalAmount || o.total || 0), 0);
    const totalCollected = uCollections.reduce((sum, c) => sum + (c.amount || 0), 0);
    const currentDebt = Math.max(0, totalSales - totalCollected);

    const clinicNameById = new Map<string, string>();
    (clinics || []).forEach(c => clinicNameById.set(c.id, c.name));

    const salesByClinic = new Map<string, number>();
    const visitsByClinic = new Map<string, number>();

    for (const o of uOrders) {
      const key = o.clinicId || "unknown";
      salesByClinic.set(key, (salesByClinic.get(key) || 0) + (o.totalAmount || o.total || 0));
    }
    for (const v of uVisits) {
      const key = v.clinicId || "unknown";
      visitsByClinic.set(key, (visitsByClinic.get(key) || 0) + 1);
    }

    const bestClinicBySales = Array.from(salesByClinic.entries())
      .map(([id, value]) => ({ id, name: clinicNameById.get(id) || "غير محدد", value }))
      .sort((a, b) => b.value - a.value)[0];

    // Products ranking from order items
    const revenueByProduct = new Map<string, { name: string; value: number }>();
    const qtyByProduct = new Map<string, { name: string; value: number }>();

    for (const o of uOrders) {
      for (const it of o.items || []) {
        const key = it.productId || it.productName || "unknown";
        const name = it.productName || "غير محدد";
        const rev = (it.price || 0) * (it.quantity || 0);
        const r = revenueByProduct.get(key);
        revenueByProduct.set(key, { name, value: (r?.value || 0) + rev });
        const q = qtyByProduct.get(key);
        qtyByProduct.set(key, { name, value: (q?.value || 0) + (it.quantity || 0) });
      }
    }

    const bestProductByQty = Array.from(qtyByProduct.values()).sort((a, b) => b.value - a.value)[0];

    // Tables
    const topClinicsBySales = Array.from(salesByClinic.entries())
      .map(([id, value]) => ({ name: clinicNameById.get(id) || "غير محدد", value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, topN);

    const topProductsByRevenue = Array.from(revenueByProduct.values()).sort((a, b) => b.value - a.value).slice(0, topN);
    const topProductsByQty = Array.from(qtyByProduct.values()).sort((a, b) => b.value - a.value).slice(0, topN);

    const lastVisit = uVisits.map(v => v.visitDate).sort().at(-1);
    const lastInvoice = uOrders.map(o => o.orderDate).sort().at(-1);

    return {
      visitsCount,
      ordersCount,
      totalSales,
      totalCollected,
      currentDebt,
      bestClinicBySales,
      bestProductByQty,
      topClinicsBySales,
      topProductsByRevenue,
      topProductsByQty,
      lastVisit,
      lastInvoice,
    };
  }, [user, orders, visits, collections, clinics, range, topN]);

  function handlePrint() {
    if (reportRef.current) {
      openPrintWindowForElement(reportRef.current, "report");
    }
  }

  function handleExportPDF() {
    // Use browser print to PDF via the print window template
    handlePrint();
  }

  // Auto-print support via query param ?auto=print
  const didAutoRef = useRef(false);
  useEffect(() => {
    if (!didAutoRef.current && auto === 'print' && user && metrics) {
      didAutoRef.current = true;
      setTimeout(() => handlePrint(), 250);
    }
  }, [auto, user, metrics]);

  if (!user || !metrics) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">تقرير الملف التفصيلي</h1>
        <Card><CardContent className="py-6">لا توجد بيانات مستخدم.</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">تقرير الملف التفصيلي</h1>
            <p className="text-muted-foreground">نظرة شاملة وحديثة لأداء المستخدم مع بيانات الحسابات</p>
            <p className="text-xs text-muted-foreground mt-1">الفترة: {getPeriodLabel(period, { start: customStart, end: customEnd })}</p>
          </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="ml-2 h-4 w-4" /> تصدير PDF (متصفح)
          </Button>
          <Button variant="outline" onClick={async () => {
            try {
              const payload: any = { userId: user?.id, period, custom: { start: customStart || undefined, end: customEnd || undefined }, lang: 'ar', topN };
              const res = await fetch('/api/reports/user-profile/pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
              if (!res.ok) {
                const p = await res.json().catch(()=>({}));
                alert('تعذر إنشاء PDF عبر الخادم' + (p?.error ? `: ${p.error}` : ''));
                return;
              }
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `${user?.username || 'user'}-profile-${Date.now()}.pdf`; a.click();
              URL.revokeObjectURL(url);
            } catch (e) {
              alert('حدث خطأ أثناء إنشاء PDF عبر الخادم');
            }
          }}>
            <Download className="ml-2 h-4 w-4" /> تنزيل PDF (الخادم)
          </Button>
          <Button variant="outline" onClick={() => {
            try {
              const lines: string[] = [];
              const esc = (v: any) => JSON.stringify(v ?? '');
              // Header info
              lines.push(['name','username','role','email','primaryPhone','area','line'].join(','));
              lines.push([
                esc(user.fullName), esc(user.username), esc(user.role), esc(user.email), esc(user.primaryPhone), esc(user.area), esc(user.line)
              ].join(','));
              lines.push('');
              // KPIs
              lines.push(['visitsCount','ordersCount','totalSales','totalCollected','currentDebt','lastVisit','lastInvoice'].join(','));
              lines.push([
                metrics.visitsCount, metrics.ordersCount, metrics.totalSales, metrics.totalCollected, metrics.currentDebt, metrics.lastVisit || '', metrics.lastInvoice || ''
              ].join(','));
              lines.push('');
              // Top Clinics by Sales
              lines.push(['Top Clinics By Sales'].join(','));
              lines.push(['#','Clinic','Amount'].join(','));
              metrics.topClinicsBySales.forEach((r, idx) => {
                lines.push([idx+1, esc(r.name), r.value].join(','));
              });
              lines.push('');
              // Top Products by Revenue
              lines.push(['Top Products By Revenue'].join(','));
              lines.push(['#','Product','Revenue'].join(','));
              metrics.topProductsByRevenue.forEach((p, idx) => {
                lines.push([idx+1, esc(p.name), p.value].join(','));
              });
              lines.push('');
              // Top Products by Qty
              lines.push(['Top Products By Qty'].join(','));
              lines.push(['#','Product','Qty'].join(','));
              metrics.topProductsByQty.forEach((p, idx) => {
                lines.push([idx+1, esc(p.name), p.value].join(','));
              });
              const blob = new Blob(["\uFEFF" + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `${user?.username || 'user'}-profile-${Date.now()}.csv`; a.click();
              URL.revokeObjectURL(url);
            } catch {
              alert('تعذر تصدير CSV');
            }
          }}>
            تصدير CSV
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="ml-2 h-4 w-4" /> طباعة
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>اختيار المستخدم والفترة</CardTitle>
          <CardDescription>يمكنك تخصيص التقرير حسب المستخدم والفترة الزمنية</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label>المستخدم</Label>
              <Select value={user.id} onValueChange={setUserId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="اختر المستخدم" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.fullName} (@{u.username})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>الفترة</Label>
              <Select value={period} onValueChange={(v: Period) => setPeriod(v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this_month">الشهر الحالي</SelectItem>
                  <SelectItem value="last_month">الشهر الماضي</SelectItem>
                  <SelectItem value="last_3_months">آخر 3 أشهر</SelectItem>
                  <SelectItem value="ytd">منذ بداية السنة</SelectItem>
                  <SelectItem value="custom">مخصص</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>من تاريخ</Label>
              <Input type="date" disabled={period !== "custom"} value={customStart} onChange={e => setCustomStart(e.target.value)} />
            </div>
            <div>
              <Label>إلى تاريخ</Label>
              <Input type="date" disabled={period !== "custom"} value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
            </div>
            <div>
              <Label>أعلى عدد عناصر</Label>
              <Select value={String(topN)} onValueChange={(v: string) => setTopN(Number(v))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="7">7</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Printable content */}
      <div ref={reportRef} className="space-y-4">
        {/* Header */}
        <Card>
          <CardContent className="py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {user.profilePicture ? (
                  <img src={user.profilePicture} alt={user.fullName} className="w-12 h-12 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserIcon className="h-6 w-6 text-primary" />
                  </div>
                )}
                <div>
                  <div className="text-lg font-semibold">{user.fullName}</div>
                  <div className="text-sm text-muted-foreground">@{user.username}</div>
                </div>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <div>آخر زيارة: {formatDate(metrics.lastVisit)}</div>
                <div>آخر فاتورة: {formatDate(metrics.lastInvoice)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User details */}
        <Card>
          <CardHeader>
            <CardTitle>بيانات المستخدم</CardTitle>
            <CardDescription>معلومات أساسية من ملف الحساب</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="space-y-1">
                <div className="text-muted-foreground">الدور</div>
                <div className="font-medium">{roleName(user.role)}</div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">البريد الإلكتروني</div>
                <div className="font-medium">{user.email || '—'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">الهاتف الأساسي</div>
                <div className="font-medium">{user.primaryPhone || '—'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">هاتف واتساب</div>
                <div className="font-medium">{user.whatsappPhone || '—'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">هاتف بديل</div>
                <div className="font-medium">{user.altPhone || '—'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">المنطقة</div>
                <div className="font-medium">{user.area || '—'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">الخط</div>
                <div className="font-medium">{user.line || '—'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">هدف الزيارات</div>
                <div className="font-medium">{user.visitsTarget != null ? toCurrency(user.visitsTarget) : '—'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">هدف المبيعات</div>
                <div className="font-medium">{user.salesTarget != null ? toCurrency(user.salesTarget) : '—'}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-xs">عدد الزيارات</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold">{metrics.visitsCount}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-xs">عدد الأوردرات/الفواتير</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold">{metrics.ordersCount}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-xs">إجمالي المبيعات{currencyUnit ? ` (${currencyUnit})` : ''}</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold">{fmtAmt(metrics.totalSales)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-xs">إجمالي التحصيل{currencyUnit ? ` (${currencyUnit})` : ''}</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold">{fmtAmt(metrics.totalCollected)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-xs">إجمالي المديونية{currencyUnit ? ` (${currencyUnit})` : ''}</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold">{fmtAmt(metrics.currentDebt)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-xs">أفضل عيادة</CardTitle></CardHeader>
            <CardContent>
              <div className="text-base font-semibold flex items-center gap-2"><Star className="h-4 w-4 text-yellow-500" />{metrics.bestClinicBySales?.name || "—"}</div>
              {metrics.bestClinicBySales && (
                <div className="text-xs text-muted-foreground mt-1">{toCurrency(metrics.bestClinicBySales.value)}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Featured product */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" /> أفضل منتج مبيعًا</CardTitle>
            <CardDescription>أعلى منتج من حيث الكمية المباعة خلال الفترة المحددة</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">{metrics.bestProductByQty?.name || "—"}</div>
              <div className="text-sm text-muted-foreground">عدد الوحدات: {metrics.bestProductByQty ? toCurrency(metrics.bestProductByQty.value) : "—"}</div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> أفضل العيادات (مبيعات)</CardTitle>
              <CardDescription>أعلى العيادات/العملاء من حيث إجمالي المبيعات</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <HBar data={metrics.topClinicsBySales} valueFormatter={(n) => fmtAmt(n)} />
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>العيادة/العميل</TableHead>
                    <TableHead className="text-right">المبلغ{currencyUnit ? ` (${currencyUnit})` : ''}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.topClinicsBySales.length > 0 ? (
                    metrics.topClinicsBySales.map((r, idx) => (
                      <TableRow key={`clinic-${idx}`}>
                        <TableCell className="font-medium">{idx + 1}. {r.name}</TableCell>
                        <TableCell className="text-right">{fmtAmt(r.value)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">لا يوجد بيانات</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>أفضل المنتجات (قيمة)</CardTitle>
              <CardDescription>المنتجات الأكثر تحقيقًا للإيرادات</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <HBar data={metrics.topProductsByRevenue} valueFormatter={(n) => fmtAmt(n)} />
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المنتج</TableHead>
                  <TableHead className="text-right">الإيراد{currencyUnit ? ` (${currencyUnit})` : ''}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.topProductsByRevenue.length > 0 ? (
                    metrics.topProductsByRevenue.map((p, idx) => (
                      <TableRow key={`prod-r-${idx}`}>
                        <TableCell className="font-medium">{idx + 1}. {p.name}</TableCell>
                        <TableCell className="text-right">{fmtAmt(p.value)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">لا يوجد بيانات</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>أفضل المنتجات (كمية)</CardTitle>
            <CardDescription>المنتجات الأكثر مبيعًا من حيث الكمية</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <HBar data={metrics.topProductsByQty} valueFormatter={(n) => new Intl.NumberFormat('ar-EG').format(n)} />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المنتج</TableHead>
                  <TableHead className="text-right">الكمية</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.topProductsByQty.length > 0 ? (
                  metrics.topProductsByQty.map((p, idx) => (
                    <TableRow key={`prod-q-${idx}`}>
                      <TableCell className="font-medium">{idx + 1}. {p.name}</TableCell>
                      <TableCell className="text-right">{toCurrency(p.value)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">لا يوجد بيانات</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Footer note for print */}
        <div className="text-xs text-muted-foreground text-center py-4 print:pt-2">
          تم إنشاء هذا التقرير بواسطة النظام — مناسب للطباعة أو الحفظ كملف PDF.
        </div>
      </div>
    </div>
  );
}
