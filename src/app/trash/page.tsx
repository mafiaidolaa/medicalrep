"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface TrashItem {
  id: string;
  user_id: string;
  action: string; // move_to_trash
  entity_type: string; // clinic | order | visit | invoice | expense
  entity_id: string;
  title?: string;
  details?: string;
  timestamp: string;
  changes?: { snapshot?: any } | null;
}

const sections = [
  { key: "clinics", label: "العيادات" },
  { key: "orders", label: "الطلبات" },
  { key: "visits", label: "الزيارات" },
  { key: "invoices", label: "الفواتير" },
  { key: "expenses", label: "النفقات" },
  { key: "products", label: "المنتجات" },
  { key: "payments", label: "المدفوعات" },
  { key: "collections", label: "التحصيلات" },
] as const;

type SectionKey = typeof sections[number]["key"];

export default function TrashPage() {
  const { data: session } = useSession();
  const canManageTrash = ['admin','gm'].includes(String((session?.user as any)?.role || '').toLowerCase());

  const [active, setActive] = useState<SectionKey>("clinics");
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;

    async function loadCounts() {
      try {
        const res = await fetch(`/api/trash?mode=counts`, { credentials: "include" });
        const data = await res.json();
        if (res.ok && data?.counts) setCounts(data.counts);
      } catch {}
    }

    async function loadItems() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/trash?section=${active}`, { credentials: "include" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCounts();
    loadItems();

    return () => { cancelled = true; };
  }, [active]);

  const title = useMemo(() => sections.find(s => s.key === active)?.label || "سلة المهملات", [active]);

  if (!canManageTrash) {
    return (
      <div className="container mx-auto p-6" dir="rtl">
        <Card>
          <CardHeader>
            <CardTitle>سلة المهملات</CardTitle>
            <CardDescription>هذه الصفحة متاحة للمديرين العامين فقط (Admin/GM)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-destructive">غير مصرح لك بالوصول إلى هذه الصفحة.</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle>سلة المهملات</CardTitle>
          <CardDescription>عرض العناصر المحذوفة (حذف منطقي) حسب القسم</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={active} onValueChange={(v) => setActive(v as SectionKey)}>
            <TabsList>
              {sections.map((s) => (
                <TabsTrigger key={s.key} value={s.key}>
                  <span className="flex items-center gap-2">
                    {s.label}
                    <span className="inline-flex items-center justify-center text-xs rounded-full bg-gray-200 px-2 py-0.5">
                      {counts[s.key] ?? 0}
                    </span>
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={active} className="mt-4">
              {loading ? (
                <div>جاري التحميل...</div>
              ) : error ? (
                <div className="text-destructive">خطأ: {error}</div>
              ) : items.length === 0 ? (
                <div className="text-muted-foreground">لا توجد عناصر في سلة المهملات لهذا القسم</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>العنصر</TableHead>
                        <TableHead>المستخدم</TableHead>
                        <TableHead>القسم</TableHead>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>التفاصيل</TableHead>
                        <TableHead>الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((it) => (
                        <TableRow key={it.id}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <div>{it.title || it.entity_id}</div>
                              {it.changes?.snapshot?.name && (
                                <div className="text-xs text-muted-foreground">{it.changes.snapshot.name}</div>
                              )}
                              {it.changes?.snapshot?.doctor_name && (
                                <div className="text-xs text-muted-foreground">{it.changes.snapshot.doctor_name}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {it.deleted_by_user ? (
                              <div className="text-xs">
                                <div className="font-medium">{it.deleted_by_user.full_name}</div>
                                <div className="text-muted-foreground">{it.deleted_by_user.email}</div>
                                <div className="capitalize">{it.deleted_by_user.role}</div>
                              </div>
                            ) : (
                              <div className="text-xs">{it.user_id}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{it.entity_type}</Badge>
                          </TableCell>
                          <TableCell>{new Date(it.timestamp).toLocaleString("ar-EG")}</TableCell>
                          <TableCell className="max-w-[360px]">
                            <div className="truncate text-sm" title={it.details || "—"}>
                              {it.details || "—"}
                            </div>
                          </TableCell>
                          <TableCell className="space-x-2 space-x-reverse">
                            <Button size="sm" variant="outline" onClick={async () => {
                              try {
                                const res = await fetch('/api/trash/restore', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  credentials: 'include',
                                  body: JSON.stringify({ section: active, id: it.entity_id })
                                });
                                const data = await res.json().catch(() => ({}));
                                if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
                                // refresh list and counts
                                const r = await fetch(`/api/trash?section=${active}`, { credentials: 'include' });
                                const items = await r.json();
                                setItems(Array.isArray(items) ? items : []);
                                const rc = await fetch(`/api/trash?mode=counts`, { credentials: 'include' });
                                const dataCounts = await rc.json();
                                if (dataCounts?.counts) setCounts(dataCounts.counts);
                              } catch (e: any) {
                                alert('فشل الاستعادة: ' + (e?.message || e));
                              }
                            }}>استعادة</Button>
                            <Button size="sm" variant="destructive" onClick={async () => {
                              if (!confirm('هل أنت متأكد من الحذف النهائي؟ لا يمكن التراجع.')) return;
                              try {
                                const res = await fetch('/api/trash/delete', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  credentials: 'include',
                                  body: JSON.stringify({ section: active, id: it.entity_id })
                                });
                                const data = await res.json().catch(() => ({}));
                                if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
                                // refresh list and counts
                                const r = await fetch(`/api/trash?section=${active}`, { credentials: 'include' });
                                const items = await r.json();
                                setItems(Array.isArray(items) ? items : []);
                                const rc = await fetch(`/api/trash?mode=counts`, { credentials: 'include' });
                                const dataCounts = await rc.json();
                                if (dataCounts?.counts) setCounts(dataCounts.counts);
                              } catch (e: any) {
                                alert('فشل الحذف النهائي: ' + (e?.message || e));
                              }
                            }}>حذف نهائي</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
