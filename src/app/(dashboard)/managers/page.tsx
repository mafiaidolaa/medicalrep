"use client";

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useDataProvider } from '@/lib/data-provider';
import { Download, TrendingUp, Users as UsersIcon, BarChart3 } from 'lucide-react';

function computeRange(period: string, fromDate?: string, toDate?: string) {
  const now = new Date();
  const endOf = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23,59,59,999));
  if (period==='this_month') return { start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString(), end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth()+1, 0, 23,59,59,999)).toISOString() };
  if (period==='last_month') return { start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth()-1, 1)).toISOString(), end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23,59,59,999)).toISOString() };
  if (period==='last_3_months') return { start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth()-2,1)).toISOString(), end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth()+1,0,23,59,59,999)).toISOString() };
  if (period==='ytd') return { start: new Date(Date.UTC(now.getUTCFullYear(),0,1)).toISOString(), end: endOf(now).toISOString() };
  if (period==='custom' && fromDate && toDate) return { start: new Date(fromDate).toISOString(), end: endOf(new Date(toDate)).toISOString() };
  return undefined;
}
function inRange(dateIso?: string, range?: {start:string;end:string}) { if (!range || !dateIso) return true; return dateIso >= range.start && dateIso <= range.end; }

function TopProductsByManager({ period, fromDate, toDate }: { period: string; fromDate?: string; toDate?: string }) {
  const { users, orders } = useDataProvider();
  const [managerId, setManagerId] = useState('');
  const range = computeRange(period, fromDate, toDate);
  const managers = useMemo(()=> users.filter(u => u.role==='manager' || u.role==='area_manager' || u.role==='line_manager'), [users]);
  const data = useMemo(()=>{
    if (!managerId) return { revenue: [], qty: [] } as { revenue: { name: string; value: number }[]; qty: { name: string; value: number }[] };
    const reps = users.filter(u => u.manager === managerId).map(u => u.id);
    const os = orders.filter(o => reps.includes(o.representativeId) && inRange(o.orderDate, range));
    const revBy = new Map<string, { name: string; value: number }>();
    const qtyBy = new Map<string, { name: string; value: number }>();
    for (const o of os) {
      for (const it of o.items || []) {
        const key = it.productId || it.productName || 'unknown';
        const name = it.productName || 'غير محدد';
        const rev = (it.price || 0) * (it.quantity || 0);
        revBy.set(key, { name, value: (revBy.get(key)?.value || 0) + rev });
        qtyBy.set(key, { name, value: (qtyBy.get(key)?.value || 0) + (it.quantity || 0) });
      }
    }
    const revenue = Array.from(revBy.values()).sort((a,b)=>b.value-a.value).slice(0,10);
    const qty = Array.from(qtyBy.values()).sort((a,b)=>b.value-a.value).slice(0,10);
    return { revenue, qty };
  }, [managerId, users, orders, range]);

  function exportCSV() {
    if (!managerId) return;
    const headers = ['Product','Revenue','Qty'];
    const names = Array.from(new Set([...data.revenue.map(p=>p.name), ...data.qty.map(p=>p.name)]));
    const lines = [headers.join(','), ...names.map(n => [JSON.stringify(n), data.revenue.find(p=>p.name===n)?.value || 0, data.qty.find(p=>p.name===n)?.value || 0].join(','))];
    const blob = new Blob(["\uFEFF"+lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=`top-products-${managerId}-${period}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Select value={managerId} onValueChange={setManagerId}>
          <SelectTrigger className="w-80"><SelectValue placeholder="اختر مديراً"/></SelectTrigger>
          <SelectContent>
            {managers.map(m => <SelectItem key={m.id} value={m.id}>{m.fullName}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={!managerId}><Download className="h-4 w-4 ml-2"/>CSV</Button>
      </div>
      {managerId ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 rounded-md border">
            <div className="text-xs text-muted-foreground mb-1">أفضل المنتجات (قيمة)</div>
            <ul className="space-y-1">
              {data.revenue.length>0 ? data.revenue.map((p,i)=>(<li key={`r-${i}`} className="flex justify-between"><span className="truncate">{i+1}. {p.name}</span><span className="font-medium">{p.value.toLocaleString()}</span></li>)) : <li className="text-muted-foreground">لا يوجد بيانات</li>}
            </ul>
          </div>
          <div className="p-3 rounded-md border">
            <div className="text-xs text-muted-foreground mb-1">أفضل المنتجات (كمية)</div>
            <ul className="space-y-1">
              {data.qty.length>0 ? data.qty.map((p,i)=>(<li key={`q-${i}`} className="flex justify-between"><span className="truncate">{i+1}. {p.name}</span><span className="font-medium">{p.value}</span></li>)) : <li className="text-muted-foreground">لا يوجد بيانات</li>}
            </ul>
          </div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">اختر مديراً لعرض أفضل المنتجات.</div>
      )}
    </div>
  );
}

function PendingOrdersSection() {
  const { users, orders, setOrders, currentUser } = useDataProvider();
  const repsIds = users.filter(u => u.manager === currentUser?.id).map(u => u.id);
  const pending = orders.filter(o => o.status === 'pending' && repsIds.includes(o.representativeId));

  const [busyId, setBusyId] = useState<string | null>(null);

  const approve = async (id: string) => {
    try {
      setBusyId(id);
      const res = await fetch(`/api/orders/${id}/manager-approve`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'فشل اعتماد الطلب');
      await setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'approved' as const } : o));
    } catch (e) {
      alert('فشل اعتماد الطلب');
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id: string) => {
    try {
      setBusyId(id);
      const res = await fetch(`/api/orders/${id}/reject`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'فشل رفض الطلب');
      await setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'cancelled' as const } : o));
    } catch (e) {
      alert('فشل رفض الطلب');
    } finally {
      setBusyId(null);
    }
  };

  if (pending.length === 0) {
    return <div className="text-sm text-muted-foreground">لا توجد طلبات معلقة حالياً</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>العيادة</TableHead>
          <TableHead>التاريخ</TableHead>
          <TableHead>الإجمالي</TableHead>
          <TableHead className="text-right">إجراءات</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {pending.map(o => (
          <TableRow key={o.id}>
            <TableCell>{o.clinicName}</TableCell>
            <TableCell>{new Date(o.orderDate).toLocaleDateString()}</TableCell>
            <TableCell>{(o.total || o.totalAmount).toFixed(2)}</TableCell>
            <TableCell className="text-right">
              <div className="flex gap-2 justify-end">
                <Button size="sm" onClick={() => approve(o.id)} disabled={busyId === o.id}>اعتماد</Button>
                <Button size="sm" variant="destructive" onClick={() => reject(o.id)} disabled={busyId === o.id}>رفض</Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function ManagersDashboardPage() {
  const { users, orders, visits, collections } = useDataProvider();
  const [period, setPeriod] = useState<'all'|'this_month'|'last_month'|'last_3_months'|'ytd'|'custom'>('this_month');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');
  const range = computeRange(period, fromDate, toDate);

  const managers = useMemo(() => {
    const mgrMap = new Map<string, { id: string; name: string }>();
    users.forEach(u => { if (u.role==='manager' || u.role==='area_manager' || u.role==='line_manager') mgrMap.set(u.id, { id: u.id, name: u.fullName }); });
    return Array.from(mgrMap.values());
  }, [users]);

  const rows = useMemo(() => {
    const byManager: { id: string; name: string; reps: string[]; visits: number; invoices: number; sales: number; collected: number; debt: number }[] = [];
    for (const m of managers) {
      const reps = users.filter(u => u.manager === m.id).map(u => u.id);
      const v = visits.filter(x => reps.includes(x.representativeId) && inRange(x.visitDate, range)).length;
      const os = orders.filter(o => reps.includes(o.representativeId) && inRange(o.orderDate, range));
      const inv = os.length;
      const sales = os.reduce((s,o)=>s+(o.totalAmount||o.total||0),0);
      const col = collections.filter(c => reps.includes(c.representativeId) && inRange(c.collectionDate, range)).reduce((s,c)=>s+(c.amount||0),0);
      const debt = Math.max(0, sales - col);
      byManager.push({ id: m.id, name: m.name, reps, visits: v, invoices: inv, sales, collected: col, debt });
    }
    return byManager
      .filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a,b)=> b.sales - a.sales);
  }, [managers, users, orders, visits, collections, range, search]);

  function exportCSV() {
    const headers = ['Manager','Reps','Visits','Invoices','Sales','Collected','Debt'];
    const lines = [headers.join(','), ...rows.map(r => [JSON.stringify(r.name), r.reps.length, r.visits, r.invoices, r.sales, r.collected, r.debt].join(','))];
    const blob = new Blob(["\uFEFF"+lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=`manager-dashboard-${period}.csv`; a.click(); URL.revokeObjectURL(url);
  }
  async function exportPDF() {
    try {
      const res = await fetch('/api/reports/run', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ scope: 'manager', period, custom_start: fromDate, custom_end: toDate, format: 'pdf', sendEmail: false, lang: 'ar' }) });
      if (!res.ok) { alert('PDF export failed'); return; }
      const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=`manager-dashboard-${period}.pdf`; a.click(); URL.revokeObjectURL(url);
    } catch { alert('PDF export failed'); }
  }

  const totals = rows.reduce((acc, r)=>({ visits: acc.visits+r.visits, invoices: acc.invoices+r.invoices, sales: acc.sales+r.sales, collected: acc.collected+r.collected, debt: acc.debt+r.debt }), { visits:0, invoices:0, sales:0, collected:0, debt:0 });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><BarChart3 className="h-6 w-6"/>لوحة تحكم المدراء</h1>
          <p className="text-muted-foreground">مؤشرات الأداء حسب المدير للفترة المحددة</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild><a href="/managers/schedules">جدولة التقارير</a></Button>
          <Select value={period} onValueChange={(v)=>setPeriod(v as any)}>
            <SelectTrigger className="w-40"><SelectValue placeholder="الفترة"/></SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">هذا الشهر</SelectItem>
              <SelectItem value="last_month">الشهر الماضي</SelectItem>
              <SelectItem value="last_3_months">آخر 3 أشهر</SelectItem>
              <SelectItem value="ytd">منذ بداية السنة</SelectItem>
              <SelectItem value="custom">مخصص</SelectItem>
              <SelectItem value="all">كل الوقت</SelectItem>
            </SelectContent>
          </Select>
          {period==='custom' && (
            <div className="flex items-center gap-2">
              <input type="date" className="border rounded px-2 py-1 text-sm" value={fromDate} onChange={(e)=>setFromDate(e.target.value)} />
              <span className="text-muted-foreground text-xs">إلى</span>
              <input type="date" className="border rounded px-2 py-1 text-sm" value={toDate} onChange={(e)=>setToDate(e.target.value)} />
            </div>
          )}
          <Input placeholder="بحث بالاسم" value={search} onChange={(e)=>setSearch(e.target.value)} className="w-56"/>
          <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 ml-2"/>CSV</Button>
          <Button variant="outline" onClick={exportPDF}><Download className="h-4 w-4 ml-2"/>PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">إجمالي المبيعات</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold text-green-600">{totals.sales.toLocaleString()}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">إجمالي التحصيل</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold text-blue-600">{totals.collected.toLocaleString()}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">المديونية الحالية</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold text-orange-600">{totals.debt.toLocaleString()}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UsersIcon className="h-4 w-4"/>مؤشرات حسب المدير</CardTitle>
          <CardDescription>مرتبة حسب المبيعات</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المدير</TableHead>
                <TableHead>عدد المندوبين</TableHead>
                <TableHead>الزيارات</TableHead>
                <TableHead>عدد الفواتير</TableHead>
                <TableHead>المبيعات</TableHead>
                <TableHead>التحصيل</TableHead>
                <TableHead>المديونية</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(r => (
                <TableRow key={r.id}>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>{r.reps.length}</TableCell>
                  <TableCell>{r.visits}</TableCell>
                  <TableCell>{r.invoices}</TableCell>
                  <TableCell>{r.sales.toLocaleString()}</TableCell>
                  <TableCell>{r.collected.toLocaleString()}</TableCell>
                  <TableCell>{r.debt.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pending Orders for Manager Approval */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart3 className="h-4 w-4"/>طلبات المبيعات بانتظار موافقة المدير</CardTitle>
          <CardDescription>الطلبات المرسلة من مندوبيك وتحتاج لاعتمادك قبل تحويلها إلى فاتورة</CardDescription>
        </CardHeader>
        <CardContent>
          <PendingOrdersSection />
        </CardContent>
      </Card>

      {/* Top products by manager */}
      <Card>
        <CardHeader>
          <CardTitle>أفضل المنتجات حسب المدير</CardTitle>
          <CardDescription>اختر مديراً لعرض أفضل المنتجات</CardDescription>
        </CardHeader>
        <CardContent>
          <TopProductsByManager period={period} fromDate={fromDate} toDate={toDate} />
        </CardContent>
      </Card>
    </div>
  );
}
