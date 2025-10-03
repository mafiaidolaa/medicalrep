// Utilities for applying Print Layout templates and exporting PDFs

export type PrintDocType = 'invoice' | 'report' | 'activity' | 'clinics' | 'orders' | 'receivables' | 'visits';

interface SiteSettingsLite {
  site_title?: string;
  logo_path?: string;
  site_description?: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  company_website?: string;
  print_layouts?: any;
}

interface TemplateDef {
  id: string;
  name?: string;
  css: string;
  header: string;
  footer: string;
}

const fallbackTemplates: Record<string, TemplateDef> = {
  modern: {
    id: 'modern',
    css: `.pl-container{max-width:920px;margin:0 auto;font-family:ui-sans-serif,system-ui}.pl-header{background:linear-gradient(90deg,#4f46e5,#06b6d4);color:#fff;padding:16px;border-radius:10px;margin:8px 0}.pl-body{padding:16px}.pl-title{font-weight:700;font-size:20px}.pl-footer{color:#666;border-top:1px dashed #ddd;padding-top:8px;margin-top:12px;display:flex;justify-content:space-between}.logo{height:34px}`,
    header: `<div class="pl-header"><div style="display:flex;align-items:center;gap:10px">{{logo}}<div><div class="pl-title">{{title}}</div><div style="opacity:.9">{{headerText}}</div></div></div></div>`,
    footer: `<div class="pl-footer"><div>{{footerText}}</div><div>{{pageNumbers}}</div></div>`
  }
};

function resolveTemplate(cfg: any, docType: PrintDocType): TemplateDef {
  const sel = (cfg?.perDocument?.[docType] || cfg?.selectedTemplate || 'modern') as string;
  if (sel === 'custom' && cfg?.custom?.header && cfg?.custom?.footer) {
    return { id: 'custom', css: cfg.custom.css || '', header: cfg.custom.header, footer: cfg.custom.footer };
  }
  const tpl = (cfg?.selectedTemplate === 'modern' || sel === 'modern') ? fallbackTemplates.modern : null;
  // If you later store other predefined templates in settings, resolve them here.
  return tpl || fallbackTemplates.modern;
}

async function fetchSiteSettings(): Promise<SiteSettingsLite> {
  try {
    const res = await fetch('/api/site-settings', { cache: 'no-store' });
    const json = await res.json();
    if (json?.success) return json.data as SiteSettingsLite;
  } catch {}
  return {};
}

export async function openPrintWindowForElement(el: HTMLElement, docType: PrintDocType) {
  if (!el) return;
  const settings = await fetchSiteSettings();
  const cfg = settings.print_layouts || {};
  const tpl = resolveTemplate(cfg, docType);
  const showLogo = !!(cfg?.options?.showLogo ?? true);
  const headerText = cfg?.options?.headerText || '';
  const footerText = cfg?.options?.footerText || '';

  const logo = (showLogo && settings.logo_path) ? `<img src="${settings.logo_path}" class="logo" alt="logo"/>` : '';
  const headerHTML = tpl.header
    .replace('{{logo}}', logo)
    .replace('{{title}}', settings.site_title || 'EP Group System')
    .replace('{{headerText}}', headerText);
  const footerHTML = tpl.footer
    .replace('{{footerText}}', footerText)
    .replace('{{pageNumbers}}', 'Page X of Y');

  const page = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/><title>Print</title><style>${tpl.css}</style></head><body><div class="pl-container">${headerHTML}<div class="pl-body">${el.innerHTML}</div>${footerHTML}</div><script>window.onload=()=>window.print();</script></body></html>`;
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.open();
  w.document.write(page);
  w.document.close();
}

export async function exportPDF(entity: 'orders'|'receivables'|'visits'|'invoice', clinic: { id: string; name: string }, rows: any[], lang: 'ar'|'en' = 'ar') {
  const settings = await fetchSiteSettings();
  try {
    const res = await fetch('/api/export/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity, clinic, rows, lang, branding: {
        title: settings.site_title,
        companyAddress: settings.company_address,
        phone: settings.company_phone,
        email: settings.company_email,
        website: settings.company_website,
      }})
    });
    if (!res.ok) {
      const problem = await res.json().catch(()=>({}));
      alert('PDF service not available: ' + (problem?.error || res.status));
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${clinic.name}-${entity}-${Date.now()}.pdf`; a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    alert('Failed to export PDF');
  }
}