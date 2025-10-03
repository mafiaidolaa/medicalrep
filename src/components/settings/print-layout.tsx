"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Save, Eye, Shield } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { useDataProvider } from '@/lib/data-provider';

interface SiteSettings {
  id: number;
  logo_path?: string;
  site_title?: string;
  site_description?: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  company_website?: string;
  company_currency?: string;
  // persisted print layout object
  print_layouts?: any;
}

type Template = {
  id: string;
  name: string;
  description: string;
  css: string;
  header: string; // may include {{logo}} {{title}} {{headerText}}
  footer: string; // may include {{footerText}} {{pageNumbers}}
};

const baseTemplates: Template[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional with bordered sections',
    css: `
      .pl-container{max-width:900px;margin:0 auto;font-family:ui-sans-serif,system-ui,Segoe UI,Roboto}
      .pl-header,.pl-footer{border:1px solid #ddd;padding:12px;border-radius:6px;margin:8px 0}
      .pl-body{border:1px solid #eee;border-radius:6px;padding:16px}
      .pl-title{font-weight:700;font-size:20px}
      .muted{color:#666}
    `,
    header: `<div class="pl-header"><div class="pl-title">{{title}}</div><div class="muted">{{headerText}}</div></div>`,
    footer: `<div class="pl-footer"><div class="muted">{{footerText}}</div><div class="muted">{{pageNumbers}}</div></div>`,
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Clean header band and subtle footer',
    css: `
      .pl-container{max-width:920px;margin:0 auto;font-family:Inter,ui-sans-serif,system-ui}
      .pl-header{background:linear-gradient(90deg,#4f46e5,#06b6d4);color:#fff;padding:16px;border-radius:10px;margin:8px 0}
      .pl-body{padding:16px}
      .pl-title{font-weight:700;font-size:20px}
      .pl-footer{color:#666;border-top:1px dashed #ddd;padding-top:8px;margin-top:12px;display:flex;justify-content:space-between}
      .logo{height:34px}
    `,
    header: `<div class="pl-header"><div style="display:flex;align-items:center;gap:10px">{{logo}}<div><div class="pl-title">{{title}}</div><div style="opacity:.9">{{headerText}}</div></div></div></div>`,
    footer: `<div class="pl-footer"><div>{{footerText}}</div><div>{{pageNumbers}}</div></div>`,
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Edge-to-edge simple typography',
    css: `
      .pl-container{max-width:820px;margin:0 auto;font-family:ui-sans-serif,system-ui}
      .pl-title{font-size:22px;font-weight:800}
      .pl-header{margin:4px 0}
      .pl-footer{color:#555;margin-top:12px;display:flex;justify-content:space-between;font-size:12px}
    `,
    header: `<div class="pl-header"><div class="pl-title">{{title}}</div><div>{{headerText}}</div></div>`,
    footer: `<div class="pl-footer"><div>{{footerText}}</div><div>{{pageNumbers}}</div></div>`,
  },
  {
    id: 'boxed',
    name: 'Boxed',
    description: 'Card-like layout with accent bar',
    css: `
      .pl-container{max-width:880px;margin:0 auto;font-family:ui-sans-serif,system-ui}
      .pl-header{border:1px solid #ddd;border-left:6px solid #10b981;border-radius:6px;padding:12px;margin:8px 0;background:#fafafa}
      .pl-body{border:1px solid #eee;border-radius:6px;padding:16px;background:#fff}
      .pl-title{font-weight:700}
      .pl-footer{color:#666;border-top:1px solid #eee;padding-top:8px;margin-top:12px;display:flex;justify-content:space-between}
    `,
    header: `<div class="pl-header"><div class="pl-title">{{title}}</div><div class="muted">{{headerText}}</div></div>`,
    footer: `<div class="pl-footer"><div>{{footerText}}</div><div>{{pageNumbers}}</div></div>`,
  },
];

const defaultLayoutConfig = {
  selectedTemplate: 'modern',
  perDocument: {
    invoice: 'modern',
    report: 'classic',
    activity: 'minimal',
    clinics: 'boxed',
  },
  options: {
    showLogo: true,
    headerText: '',
    footerText: '',
  },
  custom: {
    id: 'custom', name: 'My Layout', css: '', header: '', footer: ''
  }
};

export function PrintLayoutSettings() {
  const { currentUser } = useDataProvider();
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'gm';

  useEffect(() => {
    (async () => {
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
    })();
  }, []);

  const cfg = useMemo(() => {
    const obj = (settings?.print_layouts || {}) as any;
    return { ...defaultLayoutConfig, ...obj, perDocument: { ...defaultLayoutConfig.perDocument, ...(obj.perDocument||{}) }, options: { ...defaultLayoutConfig.options, ...(obj.options||{}) }, custom: { ...defaultLayoutConfig.custom, ...(obj.custom||{}) } };
  }, [settings]);

  const updateCfg = (updater: (c: any) => any) => {
    setSettings(prev => prev ? { ...prev, print_layouts: updater(cfg) } : prev);
  };

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await fetch('/api/site-settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
    } finally { setSaving(false); }
  };

  const selectedTemplate = useMemo(() => {
    if (cfg.selectedTemplate === 'custom') return cfg.custom as Template;
    return baseTemplates.find(t => t.id === cfg.selectedTemplate) || baseTemplates[0];
  }, [cfg]);

  const renderPreview = (tpl: Template, opts: any) => {
    const logo = opts.showLogo && settings?.logo_path ? `<img src="${settings.logo_path}" class="logo" alt="logo"/>` : '';
    const headerHTML = tpl.header
      .replace('{{logo}}', logo)
      .replace('{{title}}', settings?.site_title || 'EP Group System')
      .replace('{{headerText}}', opts.headerText || '');
    const footerHTML = tpl.footer
      .replace('{{footerText}}', opts.footerText || '')
      .replace('{{pageNumbers}}', 'Page X of Y');

    return (
      <div className="border rounded p-3">
        <style dangerouslySetInnerHTML={{ __html: tpl.css }} />
        <div className="pl-container">
          <div dangerouslySetInnerHTML={{ __html: headerHTML }} />
          <div className="pl-body">
            <div className="font-semibold mb-2">Preview content</div>
            <p className="text-sm text-muted-foreground">This is a sample body to visualize layout for invoices/reports/etc.</p>
          </div>
          <div dangerouslySetInnerHTML={{ __html: footerHTML }} />
        </div>
      </div>
    );
  };

  const openWindowPreview = () => {
    const tpl = cfg.selectedTemplate === 'custom' ? (cfg.custom as Template) : baseTemplates.find(t => t.id === cfg.selectedTemplate)!;
    const page = `<!doctype html><html><head><meta charset="utf-8"/><title>Print Layout Preview</title><style>${tpl.css}</style></head><body><div class="pl-container">${
      tpl.header
        .replace('{{logo}}', (cfg.options.showLogo && settings?.logo_path) ? `<img src="${settings.logo_path}" class="logo"/>` : '')
        .replace('{{title}}', settings?.site_title || 'EP Group System')
        .replace('{{headerText}}', cfg.options.headerText || '')
    }<div class="pl-body"><h3>Sample Document</h3><p>This preview demonstrates the selected print layout. Use your browser Print to inspect.</p></div>${
      tpl.footer
        .replace('{{footerText}}', cfg.options.footerText || '')
        .replace('{{pageNumbers}}', 'Page X of Y')
    }</div></body></html>`;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.open();
    w.document.write(page);
    w.document.close();
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="h-4 w-4"/>وصول مقيد</CardTitle>
          <CardDescription>هذه الصفحة متاحة للمديرين فقط.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (loading || !settings) {
    return <div className="flex items-center gap-2 p-4"><Loader2 className="h-5 w-5 animate-spin"/> تحميل إعدادات الطباعة...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">Print layout</h3>
          <p className="text-muted-foreground">اختر قالب الطباعة الافتراضي أو قم بإنشاء قالبك الخاص. ينطبق على جميع الصفحات القابلة للطباعة (الفواتير، التقارير، الأنشطة، العيادات، ...).</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={openWindowPreview}><Eye className="h-4 w-4 ltr:mr-2 rtl:ml-2"/> معاينة</Button>
          <Button onClick={save} disabled={saving}><Save className="h-4 w-4 ltr:mr-2 rtl:ml-2"/> حفظ</Button>
        </div>
      </div>

      {/* Templates grid */}
      <Card>
        <CardHeader>
          <CardTitle>القوالب الجاهزة</CardTitle>
          <CardDescription>أربع قوالب احترافية جاهزة للاستخدام</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {baseTemplates.map(tpl => (
              <div key={tpl.id} className={`border rounded-lg p-3 cursor-pointer ${cfg.selectedTemplate === tpl.id ? 'ring-2 ring-primary' : ''}`} onClick={() => updateCfg(c => ({ ...c, selectedTemplate: tpl.id }))}>
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{tpl.name}</div>
                  <Badge variant={cfg.selectedTemplate === tpl.id ? 'default' : 'secondary'}>{cfg.selectedTemplate === tpl.id ? 'محدد' : 'اختيار'}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{tpl.description}</p>
                <div className="mt-3">{renderPreview(tpl, cfg.options)}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Options */}
      <Card>
        <CardHeader>
          <CardTitle>إعدادات عامة</CardTitle>
          <CardDescription>عناصر تظهر في جميع المطبوعات</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>إظهار الشعار</Label>
              <p className="text-xs text-muted-foreground">استخدام شعار النظام في الهيدر</p>
            </div>
            <input type="checkbox" checked={!!cfg.options.showLogo} onChange={e => updateCfg(c => ({ ...c, options: { ...c.options, showLogo: e.target.checked } }))} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>نص العنوان (Header)</Label>
              <Input value={cfg.options.headerText} onChange={e => updateCfg(c => ({ ...c, options: { ...c.options, headerText: e.target.value } }))} placeholder="مثال: تقرير النظام — نسخة للطباعة" />
            </div>
            <div className="space-y-1">
              <Label>نص الفوتر (Footer)</Label>
              <Input value={cfg.options.footerText} onChange={e => updateCfg(c => ({ ...c, options: { ...c.options, footerText: e.target.value } }))} placeholder="هاتف | بريد | موقع" />
            </div>
          </div>

          {/* Company currency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>عملة الشركة (Company Currency)</Label>
              <Input value={settings?.company_currency || ''} onChange={e => setSettings(prev => prev ? { ...prev, company_currency: e.target.value } : prev)} placeholder="مثال: SAR, EGP, USD" />
              <p className="text-xs text-muted-foreground">تظهر وحدة العملة في تقارير PDF والجداول المالية.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-document mapping */}
      <Card>
        <CardHeader>
          <CardTitle>تعيين القوالب حسب الصفحة</CardTitle>
          <CardDescription>اختر القالب لكل نوع من المستندات القابلة للطباعة</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(cfg.perDocument).map(([key, val]) => (
            <div key={key} className="space-y-1">
              <Label>{key}</Label>
              <select className="w-full border rounded px-2 py-2 bg-background" value={String(val)} onChange={e => updateCfg(c => ({ ...c, perDocument: { ...c.perDocument, [key]: e.target.value } }))}>
                {[...baseTemplates, { id: 'custom', name: 'Custom', description: '', css: '', header: '', footer: '' }].map(t => (
                  <option key={t.id} value={t.id}>{t.name || 'Custom'}</option>
                ))}
              </select>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Custom template editor */}
      <Card>
        <CardHeader>
          <CardTitle>القالب المخصص</CardTitle>
          <CardDescription>أنشئ قالبك الخاص (HTML للـ Header/Footer و CSS عام). استخدم متغيرات: {'{{logo}} {{title}} {{headerText}} {{footerText}} {{pageNumbers}}'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Header HTML</Label>
              <Textarea rows={6} value={cfg.custom.header} onChange={e => updateCfg(c => ({ ...c, custom: { ...c.custom, header: e.target.value } }))} placeholder="<div class='pl-header'>{{logo}}<div class='pl-title'>{{title}}</div></div>" />
            </div>
            <div className="space-y-1">
              <Label>Footer HTML</Label>
              <Textarea rows={6} value={cfg.custom.footer} onChange={e => updateCfg(c => ({ ...c, custom: { ...c.custom, footer: e.target.value } }))} placeholder="<div class='pl-footer'>{{footerText}} {{pageNumbers}}</div>" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Global CSS</Label>
            <Textarea rows={6} value={cfg.custom.css} onChange={e => updateCfg(c => ({ ...c, custom: { ...c.custom, css: e.target.value } }))} placeholder=".pl-container{max-width:900px;margin:0 auto;font-family:ui-sans-serif}" />
          </div>
          <div className="text-right">
            <Button variant="outline" onClick={openWindowPreview}><Eye className="h-4 w-4 ltr:mr-2 rtl:ml-2"/> معاينة القالب المخصص</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}