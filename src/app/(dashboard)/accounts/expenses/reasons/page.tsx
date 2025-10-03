"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, Shield, CheckCircle, RefreshCcw } from 'lucide-react';
import { useDataProvider } from '@/lib/data-provider';
import { expenseService } from '@/lib/accounts/expenses';
import type { ExpenseCategory } from '@/types/accounts';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';

export default function ExpenseReasonsPage() {
  const { currentUser } = useDataProvider();
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    category_name: '',
    category_name_en: '',
    description: '',
    is_active: true,
    requires_receipt: false,
    approval_required: false,
    max_amount: '' as string | number,
  });
  const [editing, setEditing] = useState<ExpenseCategory | null>(null);

  const canManage = useMemo(() => {
    const role = currentUser?.role || 'user';
    return role === 'accountant' || role === 'admin' || role === 'gm';
  }, [currentUser]);

  const load = async () => {
    setIsLoading(true);
    try {
      const data = await expenseService.categories.getCategories();
      setCategories(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (!canManage) {
    return (
      <div className="container mx-auto p-6" dir="rtl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> صلاحيات غير كافية</CardTitle>
            <CardDescription>هذه الصفحة متاحة للمحاسبين والإداريين فقط.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const resetForm = () => {
    setForm({ category_name: '', category_name_en: '', description: '', is_active: true, requires_receipt: false, approval_required: false, max_amount: '' });
    setEditing(null);
  };

  const submit = async () => {
    const payload: any = {
      category_name: form.category_name.trim(),
      category_name_en: form.category_name_en.trim() || undefined,
      description: form.description.trim() || undefined,
      is_active: !!form.is_active,
      requires_receipt: !!form.requires_receipt,
      approval_required: !!form.approval_required,
      max_amount: form.max_amount ? Number(form.max_amount) : null,
    };

    if (editing) {
      await expenseService.categories.updateCategory(editing.id, payload);
    } else {
      await expenseService.categories.createCategory(payload);
    }
    resetForm();
    setIsOpen(false);
    await load();
  };

  const toggle = async (c: ExpenseCategory, field: 'is_active' | 'requires_receipt' | 'approval_required') => {
    await expenseService.categories.updateCategory(c.id, { [field]: !c[field] } as any);
    await load();
  };

  const remove = async (c: ExpenseCategory) => {
    if (!confirm(`هل تريد حذف الفئة ${c.category_name}؟`)) return;
    await expenseService.categories.deleteCategory(c.id);
    await load();
  };

  return (
    <div className="container mx-auto p-6" dir="rtl">
      <Breadcrumbs items={[{ label: 'الحسابات', href: '/accounting' }, { label: 'أسباب المصروفات' }]} />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">إدارة أسباب/فئات المصروفات</h1>
          <p className="text-muted-foreground">إنشاء وتعديل الأسباب (الفئات) التي يختارها المستخدمون مع صلاحيات محاسب/مدير فقط.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={load}><RefreshCcw className="h-4 w-4 ml-2" />تحديث</Button>
          <Dialog open={isOpen} onOpenChange={(o) => { setIsOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsOpen(true)}><Plus className="h-4 w-4 ml-2" />فئة جديدة</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editing ? 'تعديل الفئة' : 'إضافة فئة جديدة'}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الاسم (عربي)</Label>
                  <Input value={form.category_name} onChange={(e) => setForm({ ...form, category_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>الاسم (إنجليزي)</Label>
                  <Input value={form.category_name_en as string} onChange={(e) => setForm({ ...form, category_name_en: e.target.value })} />
                </div>
                <div className="col-span-1 md:col-span-2 space-y-2">
                  <Label>الوصف</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>الحد الأقصى (اختياري)</Label>
                  <Input type="number" value={form.max_amount as any} onChange={(e) => setForm({ ...form, max_amount: e.target.value })} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 col-span-1 md:col-span-2">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="text-sm font-medium">مفعلة</div>
                      <div className="text-xs text-muted-foreground">عرض الفئة للمستخدمين</div>
                    </div>
                    <Switch checked={!!form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="text-sm font-medium">تتطلب إيصال</div>
                      <div className="text-xs text-muted-foreground">يلزم إدخال رقم/صورة إيصال</div>
                    </div>
                    <Switch checked={!!form.requires_receipt} onCheckedChange={(v) => setForm({ ...form, requires_receipt: v })} />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="text-sm font-medium">تتطلب موافقة</div>
                      <div className="text-xs text-muted-foreground">تحتاج اعتماد من المدير</div>
                    </div>
                    <Switch checked={!!form.approval_required} onCheckedChange={(v) => setForm({ ...form, approval_required: v })} />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => { resetForm(); setIsOpen(false); }}>إلغاء</Button>
                <Button onClick={submit}><CheckCircle className="h-4 w-4 ml-2" />حفظ</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>الفئات الحالية</CardTitle>
          <CardDescription>قم بتعديل حالة الفئة أو خصائصها أو حذفها</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">جاري التحميل...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>الوصف</TableHead>
                  <TableHead>الحد الأقصى</TableHead>
                  <TableHead>مفعلة</TableHead>
                  <TableHead>تتطلب إيصال</TableHead>
                  <TableHead>تتطلب موافقة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.category_name}</TableCell>
                    <TableCell className="max-w-xs truncate" title={c.description || ''}>{c.description || '-'}</TableCell>
                    <TableCell>{c.max_amount ? c.max_amount.toLocaleString() : '-'}</TableCell>
                    <TableCell>
                      <Switch checked={!!c.is_active} onCheckedChange={() => toggle(c, 'is_active')} />
                    </TableCell>
                    <TableCell>
                      <Switch checked={!!c.requires_receipt} onCheckedChange={() => toggle(c, 'requires_receipt')} />
                    </TableCell>
                    <TableCell>
                      <Switch checked={!!c.approval_required} onCheckedChange={() => toggle(c, 'approval_required')} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => { setEditing(c); setForm({
                          category_name: c.category_name,
                          category_name_en: c.category_name_en || '',
                          description: c.description || '',
                          is_active: !!c.is_active,
                          requires_receipt: !!c.requires_receipt,
                          approval_required: !!c.approval_required,
                          max_amount: c.max_amount || ''
                        }); setIsOpen(true); }}>
                          <Edit className="h-4 w-4 ml-2" />تعديل
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => remove(c)}>
                          <Trash2 className="h-4 w-4 ml-2" />حذف
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
