"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Save, Trash2, Car, Gift, Receipt, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateUUID } from '@/lib/utils/uuid';

interface CategoryItem {
  id: string;
  name: string;
  name_ar: string;
  name_en: string;
  description?: string;
  icon: string;
  color: string;
  is_active: boolean;
}

export function ExpensesSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/expenses/categories');
        const data = await res.json();
        if (mounted) {
          setCategories(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error('Failed to load categories', e);
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const addCategory = () => {
    setCategories(prev => ([
      ...prev,
      {
        id: generateUUID(),
        name: 'custom',
        name_ar: 'جديد',
        name_en: 'New',
        description: '',
        icon: 'Receipt',
        color: '#6b7280',
        is_active: true,
      }
    ]));
  };

  const removeCategory = (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  const save = async () => {
    setSaving(true);
    try {
      // تصفية الفئات الفارغة أو غير الصحيحة
      const validCategories = categories.filter(cat => 
        cat.name_ar?.trim() && cat.name_en?.trim()
      );

      // التحقق من وجود فئات صحيحة
      if (validCategories.length === 0) {
        toast({ 
          variant: 'destructive', 
          title: 'خطأ', 
          description: 'يجب إضافة فئة واحدة على الأقل مع أسماء صحيحة' 
        });
        setSaving(false);
        return;
      }

      // تحديث القائمة لإزالة الفئات الفارغة
      if (validCategories.length !== categories.length) {
        setCategories(validCategories);
      }

      const res = await fetch('/api/expenses/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: validCategories }),
      });
      const data = await res.json();
      if (res.ok) {
        // تحديث الفئات بالبيانات المحفوظة من الخادم
        setCategories(Array.isArray(data) ? data : []);
        toast({ 
          title: 'تم الحفظ', 
          description: `تم حفظ ${validCategories.length} فئة بنجاح` 
        });
      } else {
        throw new Error(data?.error || 'فشل حفظ الإعدادات');
      }
    } catch (e: any) {
      toast({ 
        variant: 'destructive', 
        title: 'خطأ', 
        description: e?.message || 'فشل حفظ الإعدادات' 
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>فئات النفقات</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={addCategory}>
              <Plus className="w-4 h-4 mr-1" />
              إضافة فئة
            </Button>
            <Button size="sm" onClick={save} disabled={saving}>
              <Save className="w-4 h-4 mr-1" />
              {saving ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">جاري التحميل...</div>
        ) : (
          <div className="space-y-4">
            {categories.length === 0 && (
              <div className="text-sm text-muted-foreground">لا توجد فئات بعد.</div>
            )}
            {categories.map((c, idx) => (
              <div key={c.id} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end border rounded-md p-3">
                <div className="space-y-1">
                  <Label>اسم (AR)</Label>
                  <Input value={c.name_ar} onChange={e => setCategories(prev => prev.map(x => x.id === c.id ? { ...x, name_ar: e.target.value } : x))} />
                </div>
                <div className="space-y-1">
                  <Label>اسم (EN)</Label>
                  <Input value={c.name_en} onChange={e => setCategories(prev => prev.map(x => x.id === c.id ? { ...x, name_en: e.target.value } : x))} />
                </div>
                <div className="space-y-1">
                  <Label>الأيقونة</Label>
                  <Select value={c.icon} onValueChange={(value) => setCategories(prev => prev.map(x => x.id === c.id ? { ...x, icon: value } : x))}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر أيقونة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Receipt">
                        <div className="flex items-center gap-2">
                          <Receipt className="w-4 h-4" />
                          <span>Receipt</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="Car">
                        <div className="flex items-center gap-2">
                          <Car className="w-4 h-4" />
                          <span>Car</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="Gift">
                        <div className="flex items-center gap-2">
                          <Gift className="w-4 h-4" />
                          <span>Gift</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="Users">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          <span>Users</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>اللون</Label>
                  <Input type="color" value={c.color} onChange={e => setCategories(prev => prev.map(x => x.id === c.id ? { ...x, color: e.target.value } : x))} />
                </div>
                <div className="space-y-1">
                  <Label>نشط</Label>
                  <div className="flex items-center h-10">
                    <Switch checked={c.is_active} onCheckedChange={v => setCategories(prev => prev.map(x => x.id === c.id ? { ...x, is_active: v } : x))} />
                  </div>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <Button variant="destructive" size="icon" onClick={() => removeCategory(c.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}