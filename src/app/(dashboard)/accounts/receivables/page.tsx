'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, AlertTriangle, Clock, Phone, Mail, FileText, Filter, Eye, Edit, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { ar } from 'date-fns/locale';
import { useSiteSettingsValue } from '@/contexts/site-settings-context';

// المكونات المخصصة
import { LoadingSpinner } from '@/components/loading-spinner';
import { useToast } from '@/hooks/use-toast';

// الأنواع والخدمات
import { Receivable, Customer, ReceivableFilters, CollectionHistory } from '@/types/accounts';
import { receivablesService } from '@/lib/accounts/receivables';
import { customersService } from '@/lib/accounts/customers';

// مكون لعرض حالة المديونية
const ReceivableStatusBadge = ({ status }: { status: string }) => {
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    partially_paid: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800',
    written_off: 'bg-red-100 text-red-800'
  };

  const statusLabels = {
    pending: 'معلق',
    partially_paid: 'مدفوع جزئياً',
    paid: 'مدفوع',
    written_off: 'مشطوب'
  };

  return (
    <Badge className={statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
      {statusLabels[status as keyof typeof statusLabels] || status}
    </Badge>
  );
};

// مكون لعرض مستوى الأولوية
const PriorityBadge = ({ priority }: { priority: string }) => {
  const priorityColors = {
    low: 'bg-gray-100 text-gray-800',
    normal: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800'
  };

  const priorityLabels = {
    low: 'منخفض',
    normal: 'عادي',
    high: 'عالي',
    urgent: 'عاجل'
  };

  return (
    <Badge className={priorityColors[priority as keyof typeof priorityColors] || 'bg-gray-100 text-gray-800'}>
      {priorityLabels[priority as keyof typeof priorityLabels] || priority}
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

// مكون لعرض الأيام المتأخرة
const OverdueDays = ({ days }: { days: number }) => {
  const color = days > 90 ? 'text-red-600' : 
               days > 60 ? 'text-orange-600' : 
               days > 30 ? 'text-yellow-600' : 
               days > 0 ? 'text-blue-600' : 'text-gray-600';

  return (
    <span className={`font-medium ${color}`}>
      {days > 0 ? `${days} يوم` : 'في الوقت المحدد'}
    </span>
  );
};

export default function ReceivablesPage() {
  const settings = useSiteSettingsValue();
  // الحالات الأساسية
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedReceivable, setSelectedReceivable] = useState<Receivable | null>(null);
  
  // حالات الفلترة والبحث
  const [filters, setFilters] = useState<ReceivableFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  
  // حالات التصفح
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(20);
  
  // حالات النموذج
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showCollectionDialog, setShowCollectionDialog] = useState(false);
  
  const { toast } = useToast();

  // تحميل البيانات الأولية
  useEffect(() => {
    loadInitialData();
  }, []);

  // تحميل المديونيات عند تغيير الفلاتر أو التاب أو الصفحة
  useEffect(() => {
    loadReceivables();
  }, [filters, activeTab, currentPage]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadReceivables(),
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

  const loadReceivables = async () => {
    try {
      setSearchLoading(true);
      
      // تطبيق فلاتر التاب النشط
      let tabFilters = { ...filters };
      if (activeTab === 'overdue') {
        tabFilters.overdue_only = true;
      } else if (activeTab === 'high_priority') {
        tabFilters.priority = 'urgent';
      }
      
      const result = await receivablesService.getReceivables(
        { ...tabFilters, search: searchTerm }, 
        currentPage, 
        pageSize
      );
      
      setReceivables(result.data);
      setTotalPages(result.totalPages);
      setTotalCount(result.totalCount);
    } catch (error) {
      console.error('Error loading receivables:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في تحميل المديونيات",
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

  // البحث في المديونيات
  const handleSearch = () => {
    setCurrentPage(1);
    setFilters(prev => ({ ...prev, search: searchTerm }));
  };

  // تطبيق الفلاتر
  const handleApplyFilters = (newFilters: ReceivableFilters) => {
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

  // تغيير التاب النشط
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  // عرض تفاصيل المديونية
  const handleViewReceivable = (receivable: Receivable) => {
    setSelectedReceivable(receivable);
    setShowDetailsDialog(true);
  };

  // بدء عملية تحصيل
  const handleStartCollection = (receivable: Receivable) => {
    setSelectedReceivable(receivable);
    setShowCollectionDialog(true);
  };

  // تحديث أولوية المديونية
  const handleUpdatePriority = async (receivableId: string, priority: string) => {
    try {
      await receivablesService.updateReceivable(receivableId, { priority });
      toast({
        title: "تم التحديث",
        description: "تم تحديث أولوية المديونية بنجاح"
      });
      loadReceivables();
    } catch (error) {
      console.error('Error updating priority:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في تحديث الأولوية",
        variant: "destructive"
      });
    }
  };

  // شطب المديونية
  const handleWriteOff = async (receivableId: string) => {
    if (!confirm('هل أنت متأكد من شطب هذه المديونية؟ هذا الإجراء لا يمكن التراجع عنه.')) return;

    try {
      await receivablesService.writeOffReceivable(receivableId);
      toast({
        title: "تم الشطب",
        description: "تم شطب المديونية بنجاح"
      });
      loadReceivables();
    } catch (error) {
      console.error('Error writing off receivable:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في شطب المديونية",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const exportReceivablesCSV = () => {
    const rows = receivables.map(r => ({
      reference: (r as any).reference_number || r.id,
      customer: (r as any).customer?.name || '',
      date: r.invoice?.invoice_date || r.created_at || '',
      due: r.due_date || '',
      original: (r as any).original_amount || 0,
      paid: ((r as any).original_amount || 0) - r.remaining_amount,
      balance: r.remaining_amount,
      status: r.status
    }));
    const headers = Object.keys(rows[0] || { a: 1 });
    const csv = [headers.join(','), ...rows.map(x => headers.map(h => JSON.stringify((x as any)[h] ?? '')).join(','))].join('\n');
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'receivables.csv'; a.click(); URL.revokeObjectURL(url);
  };
  const exportReceivablesPDF = async () => {
    const rows = receivables.map(r => ({
      Order: (r as any).reference_number || r.id,
      Date: (r as any).invoice?.invoice_date || r.created_at || '',
      Due: r.due_date || '',
      Original: (r as any).original_amount || 0,
      Paid: ((r as any).original_amount || 0) - r.remaining_amount,
      Balance: r.remaining_amount,
      Status: r.status
    }));
    const branding = {
      title: settings.site_title,
      companyAddress: settings.company_address,
      phone: settings.company_phone,
      email: settings.company_email,
      website: settings.company_website,
      logo: settings.logo_path || '/logo.svg',
      layout: 'statement',
      showPageNumbers: settings.print_show_page_numbers ?? true,
      logoWidthMm: settings.print_logo_width_mm ?? 24,
      headerTemplate: settings.print_header_template || 'standard',
      footerTemplate: settings.print_footer_template || 'standard'
    } as any;
    const res = await fetch('/api/export/pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entity: 'receivables', clinic: { id: 'all', name: 'All Clinics' }, rows, lang: settings.rtl_support ? 'ar' : 'en', branding }) });
    if (!res.ok) { alert('فشل إنشاء PDF'); return; }
    const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'receivables-statement.pdf'; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <Breadcrumbs items={[{ label: 'الحسابات', href: '/accounting' }, { label: 'المديونيات' }]} />
      {/* رأس الصفحة */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">إدارة المديونيات</h1>
          <p className="text-muted-foreground">
            متابعة وإدارة المديونيات والعملاء المدينين
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportReceivablesCSV()}>تصدير CSV</Button>
          <Button variant="outline" size="sm" onClick={() => exportReceivablesPDF()}>PDF (بيان)</Button>
        </div>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المديونيات</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground">
              <FormatCurrency amount={receivables.reduce((sum, r) => sum + r.remaining_amount, 0)} />
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">متأخرة السداد</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {receivables.filter(r => r.overdue_days > 0).length}
            </div>
            <p className="text-xs text-red-600">
              <FormatCurrency amount={receivables.filter(r => r.overdue_days > 0).reduce((sum, r) => sum + r.remaining_amount, 0)} />
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">عالية الأولوية</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {receivables.filter(r => r.priority === 'urgent' || r.priority === 'high').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">متوسط أيام التأخر</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {Math.round(receivables.reduce((sum, r) => sum + Math.max(0, r.overdue_days), 0) / receivables.length) || 0}
            </div>
            <p className="text-xs text-muted-foreground">يوم</p>
          </CardContent>
        </Card>
      </div>

      {/* التابات والفلاتر */}
      <Card>
        <CardHeader>
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">جميع المديونيات</TabsTrigger>
              <TabsTrigger value="overdue">متأخرة السداد</TabsTrigger>
              <TabsTrigger value="high_priority">عالية الأولوية</TabsTrigger>
              <TabsTrigger value="paid">مدفوعة</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {/* شريط البحث والفلاتر */}
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-4 md:space-x-reverse">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="البحث في المديونيات (اسم العميل، رقم المرجع، إلخ...)"
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                      <SelectItem value="pending">معلق</SelectItem>
                      <SelectItem value="partially_paid">مدفوع جزئياً</SelectItem>
                      <SelectItem value="paid">مدفوع</SelectItem>
                      <SelectItem value="written_off">مشطوب</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority-filter">الأولوية</Label>
                  <Select
                    value={filters.priority || 'all'}
                    onValueChange={(value) => 
                      setFilters(prev => ({ ...prev, priority: value === 'all' ? undefined : (value as any) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="جميع الأولويات" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الأولويات</SelectItem>
                      <SelectItem value="low">منخفض</SelectItem>
                      <SelectItem value="normal">عادي</SelectItem>
                      <SelectItem value="high">عالي</SelectItem>
                      <SelectItem value="urgent">عاجل</SelectItem>
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

                <div className="flex items-end">
                  <Button onClick={() => handleApplyFilters(filters)} className="w-full">
                    تطبيق الفلاتر
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* جدول المديونيات */}
      <Card>
        <CardHeader>
          <CardTitle>
            {activeTab === 'all' ? 'جميع المديونيات' :
             activeTab === 'overdue' ? 'المديونيات المتأخرة' :
             activeTab === 'high_priority' ? 'مديونيات عالية الأولوية' :
             'المديونيات المدفوعة'}
          </CardTitle>
          <CardDescription>
            عرض وإدارة المديونيات مع إمكانية المتابعة والتحصيل
          </CardDescription>
        </CardHeader>
        <CardContent>
          {searchLoading ? (
            <div className="flex justify-center p-8">
              <LoadingSpinner />
            </div>
          ) : receivables.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              لا توجد مديونيات متطابقة مع معايير البحث
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>العميل</TableHead>
                    <TableHead>المبلغ الأصلي</TableHead>
                    <TableHead>المبلغ المتبقي</TableHead>
                    <TableHead>تاريخ الاستحقاق</TableHead>
                    <TableHead>أيام التأخر</TableHead>
                    <TableHead>الأولوية</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivables.map((receivable) => (
                    <TableRow key={receivable.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{receivable.customer?.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {receivable.customer?.customer_code}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {receivable.customer?.phone}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <FormatCurrency amount={receivable.original_amount} />
                      </TableCell>
                      <TableCell>
                        <FormatCurrency amount={receivable.remaining_amount} />
                      </TableCell>
                      <TableCell>
                        {format(new Date(receivable.due_date), 'dd/MM/yyyy', { locale: ar })}
                      </TableCell>
                      <TableCell>
                        <OverdueDays days={receivable.overdue_days} />
                      </TableCell>
                      <TableCell>
                        <PriorityBadge priority={receivable.priority} />
                      </TableCell>
                      <TableCell>
                        <ReceivableStatusBadge status={receivable.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2 space-x-reverse">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewReceivable(receivable)}
                            title="عرض التفاصيل"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          {receivable.status !== 'paid' && receivable.status !== 'written_off' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStartCollection(receivable)}
                              title="بدء التحصيل"
                            >
                              <Phone className="h-4 w-4" />
                            </Button>
                          )}
                          
                          <Select
                            value={receivable.priority}
                            onValueChange={(value) => handleUpdatePriority(receivable.id, value)}
                          >
                            <SelectTrigger className="w-auto h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">منخفض</SelectItem>
                              <SelectItem value="normal">عادي</SelectItem>
                              <SelectItem value="high">عالي</SelectItem>
                              <SelectItem value="urgent">عاجل</SelectItem>
                            </SelectContent>
                          </Select>
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
                عرض {((currentPage - 1) * pageSize) + 1} إلى {Math.min(currentPage * pageSize, totalCount)} من {totalCount} مديونية
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

      {/* نافذة تفاصيل المديونية */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل المديونية</DialogTitle>
            <DialogDescription>
              عرض تفصيلي لبيانات المديونية وسجل التحصيل
            </DialogDescription>
          </DialogHeader>
          
          {selectedReceivable && (
            <div className="space-y-6">
              {/* معلومات المديونية الأساسية */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>العميل</Label>
                  <div className="font-medium">{selectedReceivable.customer?.name}</div>
                  <div className="text-sm text-muted-foreground">{selectedReceivable.customer?.customer_code}</div>
                </div>
                <div className="space-y-2">
                  <Label>معلومات الاتصال</Label>
                  <div>{selectedReceivable.customer?.phone}</div>
                  <div className="text-sm text-muted-foreground">{selectedReceivable.customer?.email}</div>
                </div>
                <div className="space-y-2">
                  <Label>المبلغ الأصلي</Label>
                  <div className="font-medium">
                    <FormatCurrency amount={selectedReceivable.original_amount} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>المبلغ المتبقي</Label>
                  <div className="font-medium text-red-600">
                    <FormatCurrency amount={selectedReceivable.remaining_amount} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>تاريخ الاستحقاق</Label>
                  <div>{format(new Date(selectedReceivable.due_date), 'dd/MM/yyyy', { locale: ar })}</div>
                </div>
                <div className="space-y-2">
                  <Label>أيام التأخر</Label>
                  <div>
                    <OverdueDays days={selectedReceivable.overdue_days} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>الأولوية</Label>
                  <div>
                    <PriorityBadge priority={selectedReceivable.priority} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>الحالة</Label>
                  <div>
                    <ReceivableStatusBadge status={selectedReceivable.status} />
                  </div>
                </div>
              </div>

              {/* الملاحظات */}
              {selectedReceivable.notes && (
                <div className="space-y-2">
                  <Label>ملاحظات</Label>
                  <div className="p-3 bg-gray-50 rounded-md">
                    {selectedReceivable.notes}
                  </div>
                </div>
              )}

              {/* سجل التحصيل */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold">سجل التحصيل</Label>
                <div className="text-center p-8 text-muted-foreground">
                  سيتم إضافة سجل التحصيل قريباً...
                </div>
              </div>

              {/* إجراءات */}
              <div className="flex justify-end space-x-2 space-x-reverse">
                {selectedReceivable.status !== 'paid' && selectedReceivable.status !== 'written_off' && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => handleStartCollection(selectedReceivable)}
                    >
                      <Phone className="ml-2 h-4 w-4" />
                      بدء التحصيل
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleWriteOff(selectedReceivable.id)}
                    >
                      شطب المديونية
                    </Button>
                  </>
                )}
                <Button onClick={() => setShowDetailsDialog(false)}>
                  إغلاق
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* نافذة بدء التحصيل */}
      <Dialog open={showCollectionDialog} onOpenChange={setShowCollectionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>بدء عملية تحصيل</DialogTitle>
            <DialogDescription>
              تسجيل نشاط تحصيل جديد للمديونية
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* هنا سيكون نموذج التحصيل */}
            <div className="text-center p-8 text-muted-foreground">
              سيتم إضافة نموذج التحصيل قريباً...
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}