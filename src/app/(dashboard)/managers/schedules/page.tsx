"use client";

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface Schedule {
  id: string;
  name: string;
  scope: 'rep'|'manager';
  period: 'this_month'|'last_month'|'last_3_months'|'ytd'|'custom';
  custom_start?: string | null;
  custom_end?: string | null;
  recipients: string[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export default function ManagerSchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [smtpOk, setSmtpOk] = useState<boolean | null>(null);

  // form state
  const [name, setName] = useState('');
  const [scope, setScope] = useState<'rep'|'manager'>('manager');
  const [period, setPeriod] = useState<'this_month'|'last_month'|'last_3_months'|'ytd'|'custom'>('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [recipients, setRecipients] = useState('');
  const [enabled, setEnabled] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/reports/schedules', { cache: 'no-store' });
      const json = await res.json();
      if (json?.ok) setSchedules(json.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); (async ()=>{ try { const r = await fetch('/api/reports/smtp', { cache: 'no-store' }); const j = await r.json(); setSmtpOk(!!j?.ok); } catch { setSmtpOk(null); } })(); }, []);

  async function createSchedule() {
    setLoading(true);
    try {
      const body = {
        name,
        scope,
        period,
        custom_start: period==='custom' && customStart ? new Date(customStart).toISOString() : undefined,
        custom_end: period==='custom' && customEnd ? new Date(new Date(customEnd).setHours(23,59,59,999)).toISOString() : undefined,
        recipients: recipients.split(',').map(s => s.trim()).filter(Boolean),
        enabled
      };
      const res = await fetch('/api/reports/schedules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json?.ok) {
        setName(''); setRecipients(''); setEnabled(true);
        setCustomStart(''); setCustomEnd(''); setPeriod('this_month');
        await load();
      } else {
        alert(json?.error || 'Failed to create schedule');
      }
    } finally {
      setLoading(false);
    }
  }

  async function runNow(s: Schedule, format: 'pdf'|'csv') {
    const payload: any = {
      scope: s.scope,
      period: s.period,
      format,
      sendEmail: false,
      custom_start: s.custom_start,
      custom_end: s.custom_end,
      lang: 'ar'
    };
    const res = await fetch('/api/reports/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) { alert('Run failed'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `report-${s.scope}-${s.period}.${format==='pdf'?'pdf':'csv'}`; a.click();
    URL.revokeObjectURL(url);
  }

  async function emailNow(s: Schedule, format: 'pdf'|'csv') {
    const payload: any = {
      scope: s.scope,
      period: s.period,
      format,
      sendEmail: true,
      recipients: s.recipients,
      custom_start: s.custom_start,
      custom_end: s.custom_end,
      lang: 'ar'
    };
    const res = await fetch('/api/reports/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const json = await res.json().catch(()=>({}));
    if (!res.ok || !json?.ok) {
      alert(json?.error || 'Email send failed. Ensure SMTP_* env variables are set.');
      return;
    }
    alert('تم إرسال التقرير إلى: ' + s.recipients.join(', '));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">جدولة التقارير</h1>
          <p className="text-muted-foreground">إنشاء جداول زمنية لتقارير المندوبين والمدراء</p>
          {smtpOk === true && <p className="text-xs text-green-600">SMTP جاهز للإرسال</p>}
          {smtpOk === false && <p className="text-xs text-red-600">تحذير: إعدادات SMTP غير مكتملة، لن يتم إرسال البريد الإلكتروني</p>}
        </div>
        <Button variant="outline" asChild><a href="/managers">عودة للوحة المدراء</a></Button>
      </div>

      <Card>
        <CardHeader><CardTitle>إنشاء جدول جديد</CardTitle><CardDescription>اختر النطاق والفترة والمستلمين</CardDescription></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <Input placeholder="الاسم" value={name} onChange={e=>setName(e.target.value)} />
            <Select value={scope} onValueChange={v=>setScope(v as any)}>
              <SelectTrigger><SelectValue placeholder="النطاق" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="rep">مندوب</SelectItem>
                <SelectItem value="manager">مدير</SelectItem>
              </SelectContent>
            </Select>
            <Select value={period} onValueChange={v=>setPeriod(v as any)}>
              <SelectTrigger><SelectValue placeholder="الفترة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="this_month">هذا الشهر</SelectItem>
                <SelectItem value="last_month">الشهر الماضي</SelectItem>
                <SelectItem value="last_3_months">آخر 3 أشهر</SelectItem>
                <SelectItem value="ytd">منذ بداية السنة</SelectItem>
                <SelectItem value="custom">مخصص</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="emails مفصولة بفواصل" value={recipients} onChange={e=>setRecipients(e.target.value)} />
          </div>
          {period==='custom' && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Input type="date" value={customStart} onChange={e=>setCustomStart(e.target.value)} />
              <Input type="date" value={customEnd} onChange={e=>setCustomEnd(e.target.value)} />
            </div>
          )}
          <div className="flex items-center justify-end gap-2 mt-4">
            <label className="text-sm flex items-center gap-2">
              <input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)} /> مفعل
            </label>
            <Button onClick={createSchedule} disabled={loading || !name || !recipients}>إنشاء</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>الجداول المحفوظة</CardTitle><CardDescription>تشغيل مباشر أو إدارة</CardDescription></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead>النطاق</TableHead>
                <TableHead>الفترة</TableHead>
                <TableHead>المستلمين</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>إجراءات</TableHead>
                <TableHead>تعديل</TableHead>
                <TableHead>حذف</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(schedules||[]).map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.scope==='manager'?'مدراء':'مندوبين'}</TableCell>
                  <TableCell>{s.period}</TableCell>
                  <TableCell className="max-w-[360px] truncate" title={s.recipients.join(', ')}>{s.recipients.join(', ')}</TableCell>
                  <TableCell>
                    <label className="text-sm flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={s.enabled}
                        onChange={async (e)=>{
                          await fetch(`/api/reports/schedules/${s.id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ enabled: e.target.checked }) });
                          await load();
                        }}
                      /> {s.enabled ? 'مفعل' : 'معطل'}
                    </label>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="outline" size="sm" onClick={()=>runNow(s,'csv')}>تحميل CSV</Button>
                      <Button variant="outline" size="sm" onClick={()=>runNow(s,'pdf')}>تحميل PDF</Button>
                      <Button variant="outline" size="sm" disabled={smtpOk===false} onClick={()=>emailNow(s,'csv')}>إرسال CSV</Button>
                      <Button variant="outline" size="sm" disabled={smtpOk===false} onClick={()=>emailNow(s,'pdf')}>إرسال PDF</Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={async ()=>{
                      const newName = window.prompt('اسم الجدول', s.name) || s.name;
                      const newRecipients = window.prompt('المستلمون (emails مفصولة بفواصل)', s.recipients.join(', ')) || s.recipients.join(', ');
                      await fetch(`/api/reports/schedules/${s.id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name: newName, recipients: newRecipients.split(',').map(v=>v.trim()).filter(Boolean) }) });
                      await load();
                    }}>تعديل</Button>
                  </TableCell>
                  <TableCell>
                    <Button variant="destructive" size="sm" onClick={async ()=>{
                      if (!confirm('هل أنت متأكد من حذف هذا الجدول؟')) return;
                      await fetch(`/api/reports/schedules/${s.id}`, { method:'DELETE' });
                      await load();
                    }}>حذف</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
