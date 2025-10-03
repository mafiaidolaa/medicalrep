"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Printer } from 'lucide-react';
import { Loader2 } from 'lucide-react';

interface SiteSettings {
  id: number;
  // common site data (for branding)
  logo_path?: string;
  site_title?: string;
  site_description?: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  company_website?: string;
  // print
  print_show_branding?: boolean;
  print_paper_size?: 'A4' | 'Letter';
  print_margin_mm?: number;
  print_review_style?: 'compact' | 'detailed';
  print_margin_top_mm?: number;
  print_margin_right_mm?: number;
  print_margin_bottom_mm?: number;
  print_margin_left_mm?: number;
  print_custom_header_text?: string;
  print_show_page_numbers?: boolean;
  print_watermark_text?: string;
  print_watermark_opacity?: number;
}

export function PrintSettings() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/site-settings');
      const json = await res.json();
      if (json.success) setSettings(json.data);
      else setSettings({ id: 1 });
    } catch {
      setSettings({ id: 1 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  const update = (key: keyof SiteSettings, value: any) => setSettings(prev => prev ? { ...prev, [key]: value } : prev);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await fetch('/api/site-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
    } finally {
      setSaving(false);
    }
  };

  const preview = () => {
    if (!settings) return;
    const margins = {
      top: (settings.print_margin_top_mm ?? settings.print_margin_mm ?? 12),
      right: (settings.print_margin_right_mm ?? settings.print_margin_mm ?? 12),
      bottom: (settings.print_margin_bottom_mm ?? settings.print_margin_mm ?? 12),
      left: (settings.print_margin_left_mm ?? settings.print_margin_mm ?? 12),
    };
    const pageSize = settings.print_paper_size || 'A4';
    const wmText = settings.print_watermark_text || '';
    const wmOpacity = settings.print_watermark_opacity ?? 0.06;
    const branding = settings.print_show_branding ?? true;

    const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<title>معاينة الطباعة</title>
<style>
  :root { --text:#111; --muted:#666; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, 'Noto Sans', 'Helvetica Neue', Arial, 'Apple Color Emoji','Segoe UI Emoji'; }
  body { color: var(--text); }
  .container { max-width: 800px; margin: 0 auto; }
  .header { border-bottom: 1px solid #ddd; padding-bottom: 8px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; }
  .brand { display: flex; align-items: center; gap: 10px; }
  .brand img { height: 40px; }
  .muted { color: var(--muted); font-size: 12px; }
  .title { font-weight: 700; font-size: 18px; }
  .section { margin: 12px 0; }
  .footer { border-top: 1px solid #ddd; padding-top: 8px; margin-top: 12px; font-size: 12px; display:flex; justify-content:space-between; }
  .btnbar { margin: 10px 0; }
  .btn { padding: 6px 10px; border:1px solid #ccc; background:#f8f8f8; cursor:pointer; }

  @media print {
    .btnbar { display:none; }
    @page { size: ${pageSize}; margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page-numbers:after { content: 'Page ' counter(page) ' of ' counter(pages); }
    .watermark { position: fixed; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; z-index:-1; }
    .watermark span { transform: rotate(-30deg); font-size:96px; font-weight:700; color:#000; opacity:${wmOpacity}; }
  }
</style>
</head>
<body>
<div class="container">
  <div class="btnbar"><button class="btn" onclick="window.print()">طباعة</button></div>
  ${branding ? `
  <div class="header">
    <div class="brand">
      ${settings.logo_path ? `<img src="${settings.logo_path}" alt="logo"/>` : ''}
      <div>
        <div class="title">${settings.site_title || 'EP Group System'}</div>
        <div class="muted">${settings.site_description || ''}</div>
      </div>
    </div>
    <div class="muted">${new Date().toLocaleString()}</div>
  </div>
  ${settings.print_custom_header_text ? `<div class="muted" style="text-align:center;margin:-6px 0 10px 0;">${settings.print_custom_header_text}</div>` : ''}
  ` : ''}

  ${wmText ? `<div class="watermark"><span>${wmText}</span></div>` : ''}

  <div class="section">
    <div class="title">معاينة الطباعة</div>
    <div class="muted">هذه معاينة توضح الهوامش والحجم والعناصر الإضافية مثل العنوان المخصص والعلامة المائية وأرقام الصفحات.</div>
  </div>

  <div class="section">
    <strong>حجم الورق:</strong> ${pageSize} — <strong>الهوامش:</strong> ${margins.top}/${margins.right}/${margins.bottom}/${margins.left} مم
  </div>

  ${branding ? `
  <div class="footer">
    <div>${settings.company_address || ''}</div>
    <div>${(settings.company_phone || '') + (settings.company_email ? ' | ' + settings.company_email : '') + (settings.company_website ? ' | ' + settings.company_website : '')}</div>
  </div>
  ` : ''}

  ${settings.print_show_page_numbers ? `<div class="footer"><div>${settings.company_website || settings.company_email || ''}</div><div class="page-numbers"></div></div>` : ''}
</div>
</body>
</html>`;

    const w = window.open('', '_blank');
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center gap-2 p-4"><Loader2 className="h-5 w-5 animate-spin"/> تحميل إعدادات الطباعة...</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded"><Printer className="h-5 w-5 text-primary"/></div>
          <div>
            <h3 className="text-xl font-bold">إعدادات الطباعة</h3>
            <p className="text-muted-foreground">تحكّم كامل في مظهر ملفات الطباعة و PDF</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={preview}><Printer className="h-4 w-4 ltr:mr-2 rtl:ml-2"/> معاينة</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? (<><Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2"/> جاري الحفظ...</>) : (<><Save className="h-4 w-4 ltr:mr-2 rtl:ml-2"/> حفظ</>)}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">الخيارات العامة</CardTitle>
          <CardDescription>حجم الورق، الهوامش، ظهور الشعار</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>حجم الورق</Label>
              <select className="w-full border rounded px-2 py-2 bg-background" value={settings.print_paper_size || 'A4'} onChange={e => update('print_paper_size', e.target.value as 'A4' | 'Letter')}>
                <option value="A4">A4</option>
                <option value="Letter">Letter</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>الهامش الموحد (مم)</Label>
              <Input type="number" min={5} max={30} value={settings.print_margin_mm ?? 12} onChange={e => update('print_margin_mm', Number(e.target.value || 12))}/>
            </div>
            <div className="space-y-1">
              <Label>نمط المراجعة</Label>
              <select className="w-full border rounded px-2 py-2 bg-background" value={settings.print_review_style || 'detailed'} onChange={e => update('print_review_style', e.target.value as 'compact' | 'detailed')}>
                <option value="detailed">تفصيلي</option>
                <option value="compact">مضغوط</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1"><Label>علوي (مم)</Label><Input type="number" min={5} max={30} value={settings.print_margin_top_mm ?? ''} onChange={e => update('print_margin_top_mm', Number(e.target.value || 0))}/></div>
            <div className="space-y-1"><Label>أيمن (مم)</Label><Input type="number" min={5} max={30} value={settings.print_margin_right_mm ?? ''} onChange={e => update('print_margin_right_mm', Number(e.target.value || 0))}/></div>
            <div className="space-y-1"><Label>سفلي (مم)</Label><Input type="number" min={5} max={30} value={settings.print_margin_bottom_mm ?? ''} onChange={e => update('print_margin_bottom_mm', Number(e.target.value || 0))}/></div>
            <div className="space-y-1"><Label>أيسر (مم)</Label><Input type="number" min={5} max={30} value={settings.print_margin_left_mm ?? ''} onChange={e => update('print_margin_left_mm', Number(e.target.value || 0))}/></div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>إظهار الشعار والمعلومات</Label>
              <p className="text-xs text-muted-foreground">الهيدر والفوتر في نسخة الطباعة</p>
            </div>
            <input type="checkbox" checked={settings.print_show_branding ?? true} onChange={e => update('print_show_branding', e.target.checked)}/>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">الفوتر والعلامة المائية</CardTitle>
          <CardDescription>أرقام الصفحات، نص مخصص، علامة مائية</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>إظهار أرقام الصفحات</Label>
                <p className="text-xs text-muted-foreground">Page X of Y</p>
              </div>
              <input type="checkbox" checked={settings.print_show_page_numbers ?? true} onChange={e => update('print_show_page_numbers', e.target.checked)}/>
            </div>
            <div className="space-y-1">
              <Label>نص العنوان المخصص</Label>
              <Input type="text" placeholder="تقرير تسجيل عيادة — سري" value={settings.print_custom_header_text ?? ''} onChange={e => update('print_custom_header_text', e.target.value)}/>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>نص العلامة المائية</Label>
              <Input type="text" placeholder="WATERMARK" value={settings.print_watermark_text ?? ''} onChange={e => update('print_watermark_text', e.target.value)}/>
            </div>
            <div className="space-y-1">
              <Label>شفافية العلامة المائية</Label>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <input type="range" min={0.02} max={0.3} step={0.01} value={settings.print_watermark_opacity ?? 0.06} onChange={e => update('print_watermark_opacity', Number(e.target.value))}/>
                <span>{(((settings.print_watermark_opacity ?? 0.06) * 100) | 0)}%</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <Button onClick={save} disabled={saving}><Save className="h-4 w-4 ltr:mr-2 rtl:ml-2"/> حفظ إعدادات الطباعة</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}