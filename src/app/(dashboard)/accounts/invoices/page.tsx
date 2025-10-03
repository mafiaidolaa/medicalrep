'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, Search, Plus, FileText, Eye, Edit, Trash2, Printer, Download, Filter } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { ar } from 'date-fns/locale';
import { openPrintWindowForElement, exportPDF } from '@/lib/print-utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useDataProvider } from '@/lib/data-provider';
import { paymentsService, receivablesService } from '@/lib/accounts';

// المكونات المخصصة
import { LoadingSpinner } from '@/components/loading-spinner';
import { useToast } from '@/hooks/use-toast';

// الأنواع والخدمات
import { Invoice, Customer, InvoiceFilters } from '@/types/accounts';
import { invoicesService } from '@/lib/accounts/invoices';
import { customersService } from '@/lib/accounts/customers';

// مكون لعرض حالة الفاتورة
const InvoiceStatusBadge = ({ status }: { status: string }) => {
  const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    sent: 'bg-blue-100 text-blue-800', 
    paid: 'bg-green-100 text-green-800',
    partially_paid: 'bg-yellow-100 text-yellow-800',
    overdue: 'bg-red-100 text-red-800',
    cancelled: 'bg-red-100 text-red-800'
  };

  const statusLabels = {
    draft: 'مسودة',
    sent: 'مرسلة',
    paid: 'مدفوعة',
    partially_paid: 'مدفوعة جزئياً',
    overdue: 'متأخرة',
    cancelled: 'ملغاة'
  };

  return (
    <Badge className={statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
      {statusLabels[status as keyof typeof statusLabels] || status}
    </Badge>
  );
};

// مكون لتنسيق المبلغ
const FormatCurrency = ({ amount }: { amount: number }) => {
  return (
    <span className="font-medium">
      {amount.toLocaleString('ar-EG', {
        style: 'currency',
        currency: 'EGP',
        minimumFractionDigits: 2
      })}
    </span>
  );
};

type DiscountType = 'none' | 'partial' | 'full' | 'percentage';

function Combobox<T extends { id: string; label: string; sub?: string }>(
  props: {
    value?: string;
    onChange: (val: string) => void;
    items: T[];
    placeholder?: string;
    emptyLabel?: string;
    label?: string;
  }
) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return props.items;
    return props.items.filter(it =>
      it.label.toLowerCase().includes(q) || (it.sub || '').toLowerCase().includes(q)
    );
  }, [props.items, query]);

  const selected = props.items.find(i => i.id === props.value);

  return (
    <div className="space-y-1">
      {props.label && <Label className="text-sm">{props.label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full justify-between">
            <span className="truncate">{selected ? selected.label : (props.placeholder || 'اختر...')}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[--radix-popover-trigger-width]">
          <Command>
            <CommandInput placeholder="ابحث..." value={query} onValueChange={setQuery} />
            <CommandList>
              <CommandEmpty>{props.emptyLabel || 'لا توجد نتائج'}</CommandEmpty>
              {filtered.map((it) => (
                <CommandItem key={it.id} value={it.id} onSelect={() => { props.onChange(it.id); setOpen(false); }}>
                  <div className="flex flex-col">
                    <span className="font-medium">{it.label}</span>
                    {it.sub && <span className="text-xs text-muted-foreground">{it.sub}</span>}
                  </div>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface CreateInvoiceFormProps {
  customers: Customer[];
  onCreated: () => void;
}

function CreateInvoiceForm({ customers, onCreated }: CreateInvoiceFormProps) {
  const { users, clinics, products, getUsers, getClinics, getProducts } = useDataProvider();
  const [fallbackProducts, setFallbackProducts] = useState<{ id: string; name: string; price: number }[]>([]);

  // Load reference data lazily
  useEffect(() => {
    getUsers().catch(()=>{});
    getClinics().catch(()=>{});
    getProducts().catch(()=>{});
  }, [getUsers, getClinics, getProducts]);

  // Fallback: fetch products via API if provider has none
  useEffect(() => {
    if ((products || []).length === 0) {
      fetch('/api/products', { cache: 'no-store' })
        .then(res => res.ok ? res.json() : [])
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setFallbackProducts(data.map((p: any) => ({ id: p.id, name: p.name, price: Number(p.price || 0) })));
          }
        })
        .catch(() => {});
    }
  }, [products]);

  // Form state
  const [customerId, setCustomerId] = useState<string>('');
  const [clinicId, setClinicId] = useState<string>('');
  const [repUserId, setRepUserId] = useState<string>('');
  const [invoiceType, setInvoiceType] = useState<'sales' | 'purchase' | 'return_sales' | 'return_purchase'>('sales');
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().slice(0,10));
  const [dueDate, setDueDate] = useState<string>('');
  const [paymentType, setPaymentType] = useState<'immediate' | 'credit'>('immediate');
  const [discountType, setDiscountType] = useState<DiscountType>('none');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  type ItemRow = { id: string; productId?: string; name: string; qty: number; price: number; discountPct?: number };
  const [items, setItems] = useState<ItemRow[]>([ { id: crypto.randomUUID(), name: '', qty: 1, price: 0 } ]);
  const { toast } = useToast();

  // Derived values
  const subtotal = items.reduce((s, it) => s + (it.qty * it.price), 0);
  const computedDiscountAmount = (() => {
    if (discountType === 'none') return 0;
    if (discountType === 'full') return subtotal;
    if (discountType === 'partial') return Math.min(discountValue || 0, subtotal);
    if (discountType === 'percentage') return Math.min(subtotal * ((discountValue || 0) / 100), subtotal);
    return 0;
  })();
  const taxAmount = 0; // يمكن إضافة الضريبة لاحقاً عند الحاجة
  const total = Math.max(0, subtotal + taxAmount - computedDiscountAmount);

  const customerOptions = customers.map(c => ({ id: c.id, label: `${c.name}`, sub: c.customer_code }));
  const clinicOptions = clinics.map(cl => ({ id: cl.id, label: cl.name, sub: cl.doctorName || '' }));
  const userOptions = users.map(u => ({ id: u.id, label: u.fullName || u.username || u.email, sub: u.role || '' }));
  const allProducts = (products && products.length > 0) ? products : fallbackProducts;
  const productOptions = allProducts.map((p: any) => ({ id: p.id, label: p.name, sub: `${Number(p.price||0).toLocaleString('ar-EG')} ج.م.` }));

  const updateItem = (rowId: string, patch: Partial<ItemRow>) => {
    setItems(prev => prev.map(it => it.id === rowId ? { ...it, ...patch } : it));
  };
  const addItem = () => setItems(prev => [...prev, { id: crypto.randomUUID(), name: '', qty: 1, price: 0 }]);
  const removeItem = (rowId: string) => setItems(prev => prev.filter(it => it.id !== rowId));

  const handleSelectProduct = (rowId: string, productId: string) => {
    const p = products.find(pp => pp.id === productId);
    if (!p) return;
    updateItem(rowId, { productId, name: p.name, price: p.price });
  };

  const handleSubmit = async () => {
    try {
      if (!customerId) {
        toast({ title: 'مطلوب', description: 'اختر العميل', variant: 'destructive' });
        return;
      }
      if (items.length === 0 || items.every(i => !i.name || i.qty <= 0)) {
        toast({ title: 'مطلوب', description: 'أضف بنود الفاتورة بشكل صحيح', variant: 'destructive' });
        return;
      }
      if (!dueDate) {
        toast({ title: 'مطلوب', description: 'اختر تاريخ الاستحقاق', variant: 'destructive' });
        return;
      }

      // Build invoice payload
      const payload = {
        customer_id: customerId,
        invoice_date: invoiceDate,
        due_date: dueDate,
        invoice_type: invoiceType,
        discount_amount: computedDiscountAmount,
        notes: JSON.stringify({ meta: { clinic_id: clinicId || null, representative_id: repUserId || null, discount: { type: discountType, value: discountValue } } }),
        items: items.map(it => ({
          item_code: it.productId,
          item_name: it.name,
          quantity: it.qty,
          unit_price: it.price,
          discount_percentage: 0,
          tax_percentage: 0,
        }))
      } as any;

      const newInvoice = await invoicesService.createInvoice(payload);

      // Post actions: payment/receivable
      if (paymentType === 'immediate') {
        await paymentsService.createPayment({
          customer_id: customerId,
          amount: newInvoice.total_amount,
          payment_method: 'cash',
          payment_date: new Date().toISOString().slice(0,10),
          allocations: [{ invoice_id: newInvoice.id, allocated_amount: newInvoice.total_amount }]
        });
      } else {
        await receivablesService.createReceivable({
          customer_id: customerId,
          invoice_id: newInvoice.id,
          reference_number: `INV-${newInvoice.invoice_number}`,
          original_amount: newInvoice.total_amount,
          due_date: dueDate,
          notes: 'مديونية ناتجة عن فاتورة مؤجلة'
        });
      }

      toast({ title: 'تم الإنشاء', description: `تم إنشاء الفاتورة ${newInvoice.invoice_number} بنجاح` });
      // reset form
      setCustomerId(''); setClinicId(''); setRepUserId(''); setInvoiceType('sales'); setInvoiceDate(new Date().toISOString().slice(0,10)); setDueDate(''); setPaymentType('immediate'); setDiscountType('none'); setDiscountValue(0); setNotes(''); setItems([{ id: crypto.randomUUID(), name: '', qty: 1, price: 0 }]);
      onCreated();
    } catch (error: any) {
      console.error(error);
      toast({ title: 'خطأ', description: error?.message || 'فشل إنشاء الفاتورة', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* الأطراف */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Combobox
          label="اسم العميل"
          value={customerId}
          onChange={setCustomerId}
          items={customerOptions}
          placeholder="اختر العميل"
          emptyLabel="لا يوجد عملاء"
        />
        <Combobox
          label="اسم المندوب"
          value={repUserId}
          onChange={setRepUserId}
          items={userOptions}
          placeholder="اختر المندوب (قائمة المستخدمين)"
          emptyLabel="لا يوجد مستخدمون"
        />
      </div>

      {/* قائمة العيادات عند اختيار العميل */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Combobox
          label="العيادة"
          value={clinicId}
          onChange={setClinicId}
          items={clinicOptions}
          placeholder="اختر العيادة المرتبطة"
          emptyLabel="لا توجد عيادات"
        />
        <div>
          <Label>نوع الفاتورة</Label>
          <Select value={invoiceType} onValueChange={(v) => setInvoiceType(v as any)}>
            <SelectTrigger>
              <SelectValue placeholder="نوع الفاتورة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sales">مبيعات</SelectItem>
              <SelectItem value="purchase">مشتريات</SelectItem>
              <SelectItem value="return_sales">مرتجع مبيعات</SelectItem>
              <SelectItem value="return_purchase">مرتجع مشتريات</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* التواريخ وطريقة الدفع */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>تاريخ الفاتورة</Label>
          <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
        </div>
        <div>
          <Label>تاريخ الاستحقاق</Label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <div>
          <Label>طريقة الدفع</Label>
          <Select value={paymentType} onValueChange={(v) => setPaymentType(v as 'immediate' | 'credit')}>
            <SelectTrigger>
              <SelectValue placeholder="طريقة الدفع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="immediate">دفع فوري</SelectItem>
              <SelectItem value="credit">مديونية (دفعات مؤجلة)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* بنود الفاتورة - المنتجات من الإعدادات */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base">بنود الفاتورة</Label>
          <Button variant="outline" size="sm" onClick={addItem}><Plus className="h-4 w-4 ml-2"/>إضافة بند</Button>
        </div>
        <div className="space-y-2">
          {items.map((row) => (
            <div key={row.id} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-12 md:col-span-5">
                <Combobox
                  value={row.productId}
                  onChange={(pid) => handleSelectProduct(row.id, pid)}
                  items={productOptions}
                  placeholder="اختر المنتج من الإعدادات"
                />
              </div>
              <div className="col-span-6 md:col-span-2">
                <Label>الكمية</Label>
                <Input type="number" min={0} value={row.qty} onChange={(e) => updateItem(row.id, { qty: Number(e.target.value) })} />
              </div>
              <div className="col-span-6 md:col-span-3">
                <Label>سعر الوحدة (ج.م.)</Label>
                <Input type="number" min={0} value={row.price} onChange={(e) => updateItem(row.id, { price: Number(e.target.value) })} />
              </div>
              <div className="col-span-12 md:col-span-2 flex gap-2 justify-end">
                <Button type="button" variant="ghost" onClick={() => removeItem(row.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* الخصم تحت خانة المبلغ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 rounded-md border bg-gray-50">
        <div>
          <Label>نوع الخصم</Label>
          <Select value={discountType} onValueChange={(v) => setDiscountType(v as DiscountType)}>
            <SelectTrigger>
              <SelectValue placeholder="اختر نوع الخصم" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">بدون خصم</SelectItem>
              <SelectItem value="partial">خصم جزئي (قيمة)</SelectItem>
              <SelectItem value="full">خصم كلي (إجمالي)</SelectItem>
              <SelectItem value="percentage">خصم %</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{discountType === 'percentage' ? 'نسبة الخصم %' : 'قيمة الخصم (ج.م.)'}</Label>
          <Input
            type="number"
            min={0}
            max={discountType === 'percentage' ? 100 : undefined}
            disabled={discountType === 'none' || discountType === 'full'}
            value={discountValue}
            onChange={(e) => setDiscountValue(Number(e.target.value))}
          />
        </div>
        <div className="self-end text-sm text-muted-foreground">
          سيتم تطبيق الخصم على المجموع الفرعي. الإجمالي يُحدَّث تلقائياً.
        </div>
      </div>

      {/* ملخص المبالغ */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-white rounded-md border">
        <div>
          <div className="text-sm text-muted-foreground">المجموع الفرعي</div>
          <div className="font-semibold"><FormatCurrency amount={subtotal} /></div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">الضريبة</div>
          <div className="font-semibold"><FormatCurrency amount={taxAmount} /></div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">الخصم</div>
          <div className="font-semibold"><FormatCurrency amount={computedDiscountAmount} /></div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">الإجمالي</div>
          <div className="font-bold text-lg text-blue-600"><FormatCurrency amount={total} /></div>
        </div>
      </div>

      <div>
        <Label>ملاحظات</Label>
        <Textarea placeholder="ملاحظات إضافية" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => onCreated()}>إلغاء</Button>
        <Button onClick={handleSubmit}>إنشاء الفاتورة</Button>
      </div>
    </div>
  );
}

export default function InvoicesPage() {
  // الحالات الأساسية
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  
  // حالات الفلترة والبحث
  const [filters, setFilters] = useState<InvoiceFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // حالات التصفح
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(20);
  
  // حالات النموذج
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  
  const { toast } = useToast();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === 'admin';

  // تحميل البيانات الأولية
  useEffect(() => {
    loadInitialData();
  }, []);

  // تحميل الفواتير عند تغيير الفلاتر أو الصفحة
  useEffect(() => {
    loadInvoices();
  }, [filters, currentPage]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadInvoices(),
        loadCustomers()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في تحميل البيانات",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadInvoices = async () => {
    try {
      setSearchLoading(true);
      const result = await invoicesService.getInvoices(
        { ...filters, search: searchTerm }, 
        currentPage, 
        pageSize
      );
      
      setInvoices(result.data);
      setTotalPages(result.totalPages);
      setTotalCount(result.totalCount);
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في تحميل الفواتير",
        variant: "destructive"
      });
    } finally {
      setSearchLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const customersData = await customersService.getActiveCustomers();
      setCustomers(customersData);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  // البحث في الفواتير
  const handleSearch = () => {
    setCurrentPage(1);
    setFilters(prev => ({ ...prev, search: searchTerm }));
  };

  // تطبيق الفلاتر
  const handleApplyFilters = (newFilters: InvoiceFilters) => {
    setCurrentPage(1);
    setFilters(newFilters);
    setShowFilters(false);
  };

  // إعادة تعيين الفلاتر
  const handleResetFilters = () => {
    setFilters({});
    setSearchTerm('');
    setCurrentPage(1);
    setShowFilters(false);
  };

  // عرض تفاصيل الفاتورة
  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowDetailsDialog(true);
  };

  // حذف الفاتورة
  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!isAdmin) {
      toast({ variant: 'destructive', title: 'صلاحيات', description: 'ليس لديك صلاحية لحذف الفواتير' });
      return;
    }
    if (!confirm('هل أنت متأكد من حذف هذه الفاتورة؟')) return;

    try {
      await invoicesService.deleteInvoice(invoiceId);
      toast({
        title: "نجح الحذف",
        description: "تم حذف الفاتورة بنجاح"
      });
      loadInvoices();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في حذف الفاتورة",
        variant: "destructive"
      });
    }
  };

  // طباعة الفاتورة
  const detailsRef = React.useRef<HTMLDivElement>(null);

  const handlePrintInvoice = async (invoice: Invoice) => {
    try {
      if (detailsRef.current) {
        await openPrintWindowForElement(detailsRef.current, 'invoice');
      } else {
        window.print();
      }
      toast({ title: "جاري الطباعة", description: `جاري طباعة الفاتورة ${invoice.invoice_number}` });
    } catch (error) {
      console.error('Error printing invoice:', error);
      toast({ title: "خطأ", description: "حدث خطأ في طباعة الفاتورة", variant: "destructive" });
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <Breadcrumbs items={[{ label: 'الحسابات', href: '/accounting' }, { label: 'إدارة الفواتير' }]} />
      {/* رأس الصفحة */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">إدارة الفواتير</h1>
          <p className="text-muted-foreground">
            إدارة وتتبع جميع فواتير المبيعات والمشتريات
          </p>
        </div>

        <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2 md:space-x-reverse">
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="ml-2 h-4 w-4" />
            فاتورة جديدة
          </Button>
        </div>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الفواتير</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">فواتير متأخرة</CardTitle>
            <FileText className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {invoices.filter(i => i.status === 'overdue').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">فواتير مدفوعة</CardTitle>
            <FileText className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {invoices.filter(i => i.status === 'paid').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المبلغ</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              <FormatCurrency amount={invoices.reduce((sum, inv) => sum + inv.total_amount, 0)} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* شريط البحث والفلاتر */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-4 md:space-x-reverse">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="البحث في الفواتير (رقم الفاتورة، اسم العميل، إلخ...)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="pr-10"
                />
              </div>
            </div>
            
            <div className="flex space-x-2 space-x-reverse">
              <Button onClick={handleSearch} disabled={searchLoading}>
                {searchLoading ? <LoadingSpinner /> : <Search className="h-4 w-4" />}
                بحث
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="ml-2 h-4 w-4" />
                فلاتر
              </Button>
              
              <Button variant="outline" onClick={handleResetFilters}>
                إعادة تعيين
              </Button>
            </div>
          </div>

          {/* فلاتر متقدمة */}
          {showFilters && (
            <div className="mt-4 p-4 border rounded-lg bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="status-filter">الحالة</Label>
                  <Select
                    value={filters.status || 'all'}
                    onValueChange={(value) => 
                      setFilters(prev => ({ ...prev, status: value === 'all' ? undefined : (value as any) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="جميع الحالات" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الحالات</SelectItem>
                      <SelectItem value="draft">مسودة</SelectItem>
                      <SelectItem value="sent">مرسلة</SelectItem>
                      <SelectItem value="paid">مدفوعة</SelectItem>
                      <SelectItem value="partially_paid">مدفوعة جزئياً</SelectItem>
                      <SelectItem value="overdue">متأخرة</SelectItem>
                      <SelectItem value="cancelled">ملغاة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="type-filter">نوع الفاتورة</Label>
                  <Select
                    value={filters.invoice_type || 'all'}
                    onValueChange={(value) => 
                      setFilters(prev => ({ ...prev, invoice_type: value === 'all' ? undefined : (value as any) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="جميع الأنواع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الأنواع</SelectItem>
                      <SelectItem value="sales">مبيعات</SelectItem>
                      <SelectItem value="purchase">مشتريات</SelectItem>
                      <SelectItem value="return_sales">مرتجع مبيعات</SelectItem>
                      <SelectItem value="return_purchase">مرتجع مشتريات</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="customer-filter">العميل</Label>
                  <Select
                    value={filters.customer_id || 'all'}
                    onValueChange={(value) => 
                      setFilters(prev => ({ ...prev, customer_id: value === 'all' ? undefined : value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="جميع العملاء" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع العملاء</SelectItem>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name} - {customer.customer_code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-4 flex space-x-2 space-x-reverse">
                <Button onClick={() => handleApplyFilters(filters)}>
                  تطبيق الفلاتر
                </Button>
                <Button variant="outline" onClick={handleResetFilters}>
                  إلغاء الفلاتر
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* جدول الفواتير */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة الفواتير</CardTitle>
          <CardDescription>
            عرض جميع الفواتير مع إمكانية التعديل والحذف
          </CardDescription>
        </CardHeader>
        <CardContent>
          {searchLoading ? (
            <div className="flex justify-center p-8">
              <LoadingSpinner />
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              لا توجد فواتير متطابقة مع معايير البحث
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم الفاتورة</TableHead>
                    <TableHead>العميل</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>تاريخ الاستحقاق</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>المبلغ الإجمالي</TableHead>
                    <TableHead>المبلغ المدفوع</TableHead>
                    <TableHead>المبلغ المتبقي</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        {invoice.invoice_number}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{invoice.customer?.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {invoice.customer?.customer_code}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(invoice.invoice_date), 'dd/MM/yyyy', { locale: ar })}
                      </TableCell>
                      <TableCell>
                        {format(new Date(invoice.due_date), 'dd/MM/yyyy', { locale: ar })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {invoice.invoice_type === 'sales' ? 'مبيعات' :
                           invoice.invoice_type === 'purchase' ? 'مشتريات' :
                           invoice.invoice_type === 'return_sales' ? 'مرتجع مبيعات' :
                           'مرتجع مشتريات'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <FormatCurrency amount={invoice.total_amount} />
                      </TableCell>
                      <TableCell>
                        <FormatCurrency amount={invoice.paid_amount} />
                      </TableCell>
                      <TableCell>
                        <FormatCurrency amount={invoice.remaining_amount} />
                      </TableCell>
                      <TableCell>
                        <InvoiceStatusBadge status={invoice.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2 space-x-reverse">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewInvoice(invoice)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePrintInvoice(invoice)}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteInvoice(invoice.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* التصفح */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2 py-4">
              <div className="text-sm text-muted-foreground">
                عرض {((currentPage - 1) * pageSize) + 1} إلى {Math.min(currentPage * pageSize, totalCount)} من {totalCount} فاتورة
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  السابق
                </Button>
                <div className="text-sm">
                  الصفحة {currentPage} من {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  التالي
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* نافذة تفاصيل الفاتورة */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل الفاتورة {selectedInvoice?.invoice_number}</DialogTitle>
            <DialogDescription>
              عرض تفصيلي لبيانات الفاتورة
            </DialogDescription>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-6" ref={detailsRef}>
              {/* معلومات الفاتورة الأساسية */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>رقم الفاتورة</Label>
                  <div className="font-medium">{selectedInvoice.invoice_number}</div>
                </div>
                <div className="space-y-2">
                  <Label>العميل</Label>
                  <div className="font-medium">{selectedInvoice.customer?.name}</div>
                </div>
                <div className="space-y-2">
                  <Label>تاريخ الفاتورة</Label>
                  <div>{format(new Date(selectedInvoice.invoice_date), 'dd/MM/yyyy', { locale: ar })}</div>
                </div>
                <div className="space-y-2">
                  <Label>تاريخ الاستحقاق</Label>
                  <div>{format(new Date(selectedInvoice.due_date), 'dd/MM/yyyy', { locale: ar })}</div>
                </div>
                <div className="space-y-2">
                  <Label>نوع الفاتورة</Label>
                  <div>
                    {selectedInvoice.invoice_type === 'sales' ? 'مبيعات' :
                     selectedInvoice.invoice_type === 'purchase' ? 'مشتريات' :
                     selectedInvoice.invoice_type === 'return_sales' ? 'مرتجع مبيعات' :
                     'مرتجع مشتريات'}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>الحالة</Label>
                  <div>
                    <InvoiceStatusBadge status={selectedInvoice.status} />
                  </div>
                </div>
              </div>

              {/* المبالغ */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-2">
                  <Label>المجموع الفرعي</Label>
                  <div className="font-medium">
                    <FormatCurrency amount={selectedInvoice.subtotal} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>الضريبة</Label>
                  <div className="font-medium">
                    <FormatCurrency amount={selectedInvoice.tax_amount} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>الخصم</Label>
                  <div className="font-medium">
                    <FormatCurrency amount={selectedInvoice.discount_amount} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>المبلغ الإجمالي</Label>
                  <div className="font-bold text-lg">
                    <FormatCurrency amount={selectedInvoice.total_amount} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>المبلغ المدفوع</Label>
                  <div className="font-medium text-green-600">
                    <FormatCurrency amount={selectedInvoice.paid_amount} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>المبلغ المتبقي</Label>
                  <div className="font-medium text-red-600">
                    <FormatCurrency amount={selectedInvoice.remaining_amount} />
                  </div>
                </div>
              </div>

              {/* بنود الفاتورة */}
              {selectedInvoice.items && selectedInvoice.items.length > 0 && (
                <div>
                  <Label className="text-lg font-semibold">بنود الفاتورة</Label>
                  <div className="mt-2 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>الصنف</TableHead>
                          <TableHead>الوصف</TableHead>
                          <TableHead>الكمية</TableHead>
                          <TableHead>سعر الوحدة</TableHead>
                          <TableHead>الخصم</TableHead>
                          <TableHead>الضريبة</TableHead>
                          <TableHead>المجموع</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedInvoice.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.item_name}</TableCell>
                            <TableCell>{item.description || '-'}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>
                              <FormatCurrency amount={item.unit_price} />
                            </TableCell>
                            <TableCell>
                              <FormatCurrency amount={item.discount_amount} />
                            </TableCell>
                            <TableCell>
                              <FormatCurrency amount={item.tax_amount} />
                            </TableCell>
                            <TableCell className="font-medium">
                              <FormatCurrency amount={item.line_total} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* الملاحظات */}
              {selectedInvoice.notes && (
                <div className="space-y-2">
                  <Label>ملاحظات</Label>
                  <div className="p-3 bg-gray-50 rounded-md">
                    {selectedInvoice.notes}
                  </div>
                </div>
              )}

              {/* إجراءات */}
              <div className="flex justify-end space-x-2 space-x-reverse">
                <Button variant="outline" onClick={() => handlePrintInvoice(selectedInvoice)}>
                  <Printer className="ml-2 h-4 w-4" />
                  طباعة (القالب)
                </Button>
                <Button variant="outline" onClick={() => selectedInvoice && exportPDF('invoice', { id: selectedInvoice.id, name: selectedInvoice.customer?.name || 'عميل' }, (selectedInvoice.items||[]).map(it => ({ Item: it.item_name, Qty: it.quantity, Price: it.unit_price, Total: it.line_total })), 'ar')}>
                  تنزيل PDF
                </Button>
                <Button onClick={() => setShowDetailsDialog(false)}>
                  إغلاق
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* نافذة إنشاء فاتورة جديدة */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>إنشاء فاتورة جديدة</DialogTitle>
            <DialogDescription>
              أدخل بيانات الفاتورة الجديدة
            </DialogDescription>
          </DialogHeader>
          
          <CreateInvoiceForm
            customers={customers}
            onCreated={() => {
              setShowCreateDialog(false);
              // إعادة تحميل قائمة الفواتير بعد الإنشاء
              loadInvoices();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}