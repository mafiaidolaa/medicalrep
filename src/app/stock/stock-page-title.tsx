
"use client";
import i18n from "@/lib/i18n";

export function StockPageTitle() {
    const t = i18n.t;
    return <h1 className="text-3xl font-bold tracking-tight">{t('stock.title')}</h1>;
}
