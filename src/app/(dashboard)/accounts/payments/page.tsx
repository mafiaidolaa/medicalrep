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
import { Search, Plus, CreditCard, Banknote, Building, Receipt, Filter, Eye, Edit, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { ar } from 'date-fns/locale';

// المكونات المخصصة
import { LoadingSpinner } from '@/components/loading-spinner';
import { useToast } from '@/hooks/use-toast';

// الأنواع والخدمات
import { Payment, Customer, Invoice, PaymentFilters } from '@/types/accounts';
import { paymentsService } from '@/lib/accounts/payments';
import { customersService } from '@/lib/accounts/customers';
import { invoicesService } from '@/lib/accounts/invoices';

// مكون لعرض حالة المدفوعة
const PaymentStatusBadge = ({ status }: { status: string }) => {
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    bounced: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800'
  };

  const statusLabels = {
    pending: 'معلق',
    confirmed: 'مؤكد',
    bounced: 'مرتد',
    cancelled: 'ملغي'
  };

  return (
    <Badge className={statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
      {statusLabels[status as keyof typeof statusLabels] || status}
    </Badge>
  );
};

// مكون لعرض طريقة الدفع
const PaymentMethodBadge = ({ method }: { method: string }) => {
  const methodColors = {
    cash: 'bg-green-100 text-green-800',
    check: 'bg-blue-100 text-blue-800',
    bank_transfer: 'bg-purple-100 text-purple-800',
    credit_card: 'bg-orange-100 text-orange-800',
    online: 'bg-indigo-100 text-indigo-800'
  };

  const methodLabels = {
    cash: 'نقدي',
    check: 'شيك',
    bank_transfer: 'حوالة بنكية',
    credit_card: 'بطاقة ائتمان',
    online: 'دفع إلكتروني'
  };

  const methodIcons = {
    cash: <Banknote className="h-3 w-3 ml-1" />,
    check: <Receipt className="h-3 w-3 ml-1" />,
    bank_transfer: <Building className="h-3 w-3 ml-1" />,
    credit_card: <CreditCard className="h-3 w-3 ml-1" />,
    online: <CreditCard className="h-3 w-3 ml-1" />
  };

  return (
    <Badge className={`${methodColors[method as keyof typeof methodColors] || 'bg-gray-100 text-gray-800'} flex items-center`}>
      {methodIcons[method as keyof typeof methodIcons]}
      {methodLabels[method as keyof typeof methodLabels] || method}
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

export default function PaymentsPage() {
  // الحالات الأساسية
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  
  // حالات الفلترة والبحث
  const [filters, setFilters] = useState<PaymentFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  
  // حالات التصفح
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(20);
  
  // حالات النموذج
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  
  const { toast } = useToast();

  // تحميل البيانات الأولية
  useEffect(() => {
    loadInitialData();
  }, []);

  // تحميل المدفوعات عند تغيير الفلاتر أو التاب أو الصفحة
  useEffect(() => {
    loadPayments();
  }, [filters, activeTab, currentPage]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadPayments(),
        loadCustomers(),
        loadInvoices()
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

  const loadPayments = async () => {
    try {
      setSearchLoading(true);
      
      // تطبيق فلاتر التاب النشط
      let tabFilters = { ...filters };
      if (activeTab === 'pending') {
        tabFilters.status = 'pending';
      } else if (activeTab === 'confirmed') {
        tabFilters.status = 'confirmed';
      } else if (activeTab === 'bounced') {
        tabFilters.status = 'bounced';
      }
      
      const result = await paymentsService.getPayments(
        { ...tabFilters, search: searchTerm }, 
        currentPage, 
        pageSize
      );
      
      setPayments(result.data);
      setTotalPages(result.totalPages);
      setTotalCount(result.totalCount);
    } catch (error) {
      console.error('Error loading payments:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في تحميل المدفوعات",
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

  const loadInvoices = async () => {
    try {
      const invoicesData = await invoicesService.searchInvoices('', 100); // Load recent invoices
      setInvoices(invoicesData);
    } catch (error) {
      console.error('Error loading invoices:', error);
    }
  };

  // البحث في المدفوعات
  const handleSearch = () => {
    setCurrentPage(1);
    setFilters(prev => ({ ...prev, search: searchTerm }));
  };

  // تطبيق الفلاتر
  const handleApplyFilters = (newFilters: PaymentFilters) => {
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

  // عرض تفاصيل المدفوعة
  const handleViewPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowDetailsDialog(true);
  };

  // تأكيد المدفوعة
  const handleConfirmPayment = async (paymentId: string) => {
    try {
      await paymentsService.confirmPayment(paymentId);
      toast({
        title: "تم التأكيد",
        description: "تم تأكيد المدفوعة بنجاح"
      });
      loadPayments();
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في تأكيد المدفوعة",
        variant: "destructive"
      });
    }
  };

  // إرجاع المدفوعة (bounced)
  const handleBouncePayment = async (paymentId: string) => {
    if (!confirm('هل أنت متأكد من إرجاع هذه المدفوعة؟')) return;

    try {
      await paymentsService.bouncePayment(paymentId);
      toast({
        title: "تم الإرجاع",
        description: "تم إرجاع المدفوعة بنجاح"
      });
      loadPayments();
    } catch (error) {
      console.error('Error bouncing payment:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في إرجاع المدفوعة",
        variant: "destructive"
      });
    }
  };

  // إلغاء المدفوعة
  const handleCancelPayment = async (paymentId: string) => {
    if (!confirm('هل أنت متأكد من إلغاء هذه المدفوعة؟')) return;

    try {
      await paymentsService.cancelPayment(paymentId);
      toast({
        title: "تم الإلغاء",
        description: "تم إلغاء المدفوعة بنجاح"
      });
      loadPayments();
    } catch (error) {
      console.error('Error cancelling payment:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في إلغاء المدفوعة",
        variant: "destructive"
      });
    }
  };

  // حذف المدفوعة
  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المدفوعة؟ هذا الإجراء لا يمكن التراجع عنه.')) return;

    try {
      await paymentsService.deletePayment(paymentId);
      toast({
        title: "تم الحذف",
        description: "تم حذف المدفوعة بنجاح"
      });
      loadPayments();
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في حذف المدفوعة",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <Breadcrumbs items={[{ label: 'الحسابات', href: '/accounting' }, { label: 'المدفوعات' }]} />
      {/* رأس الصفحة */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">إدارة التحصيلات والمدفوعات</h1>
          <p className="text-muted-foreground">
            إدارة ومتابعة جميع المدفوعات والتحصيلات من العملاء
          </p>
        </div>

        <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2 md:space-x-reverse">
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="ml-2 h-4 w-4" />
            تسجيل مدفوعة جديدة
          </Button>
        </div>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المدفوعات</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground">
              <FormatCurrency amount={payments.reduce((sum, p) => sum + p.amount, 0)} />
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مدفوعات معلقة</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {payments.filter(p => p.status === 'pending').length}
            </div>
            <p className="text-xs text-yellow-600">
              <FormatCurrency amount={payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0)} />
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مدفوعات مؤكدة</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {payments.filter(p => p.status === 'confirmed').length}
            </div>
            <p className="text-xs text-green-600">
              <FormatCurrency amount={payments.filter(p => p.status === 'confirmed').reduce((sum, p) => sum + p.amount, 0)} />
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مدفوعات مرتدة</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {payments.filter(p => p.status === 'bounced').length}
            </div>
            <p className="text-xs text-red-600">
              <FormatCurrency amount={payments.filter(p => p.status === 'bounced').reduce((sum, p) => sum + p.amount, 0)} />
            </p>
          </CardContent>
        </Card>
      </div>

      {/* التابات والفلاتر */}
      <Card>
        <CardHeader>
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">جميع المدفوعات</TabsTrigger>
              <TabsTrigger value="confirmed">مؤكدة</TabsTrigger>
              <TabsTrigger value="pending">معلقة</TabsTrigger>
              <TabsTrigger value="bounced">مرتدة</TabsTrigger>
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
                  placeholder="البحث في المدفوعات (رقم المدفوعة، اسم العميل، إلخ...)"
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
                      <SelectItem value="confirmed">مؤكد</SelectItem>
                      <SelectItem value="bounced">مرتد</SelectItem>
                      <SelectItem value="cancelled">ملغي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="method-filter">طريقة الدفع</Label>
                  <Select
                    value={filters.payment_method || 'all'}
                    onValueChange={(value) => 
                      setFilters(prev => ({ ...prev, payment_method: value === 'all' ? undefined : (value as any) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="جميع الطرق" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الطرق</SelectItem>
                      <SelectItem value="cash">نقدي</SelectItem>
                      <SelectItem value="check">شيك</SelectItem>
                      <SelectItem value="bank_transfer">حوالة بنكية</SelectItem>
                      <SelectItem value="credit_card">بطاقة ائتمان</SelectItem>
                      <SelectItem value="online">دفع إلكتروني</SelectItem>
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

      {/* جدول المدفوعات */}
      <Card>
        <CardHeader>
          <CardTitle>
            {activeTab === 'all' ? 'جميع المدفوعات' :
             activeTab === 'confirmed' ? 'المدفوعات المؤكدة' :
             activeTab === 'pending' ? 'المدفوعات المعلقة' :
             'المدفوعات المرتدة'}
          </CardTitle>
          <CardDescription>
            عرض وإدارة المدفوعات مع إمكانية التأكيد والإلغاء
          </CardDescription>
        </CardHeader>
        <CardContent>
          {searchLoading ? (
            <div className="flex justify-center p-8">
              <LoadingSpinner />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              لا توجد مدفوعات متطابقة مع معايير البحث
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم المدفوعة</TableHead>
                    <TableHead>العميل</TableHead>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>طريقة الدفع</TableHead>
                    <TableHead>تاريخ الدفع</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>مرجع الدفع</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {payment.payment_number}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{payment.customer?.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {payment.customer?.customer_code}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <FormatCurrency amount={payment.amount} />
                      </TableCell>
                      <TableCell>
                        <PaymentMethodBadge method={payment.payment_method} />
                      </TableCell>
                      <TableCell>
                        {format(new Date(payment.payment_date), 'dd/MM/yyyy', { locale: ar })}
                      </TableCell>
                      <TableCell>
                        <PaymentStatusBadge status={payment.status} />
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {payment.payment_reference || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2 space-x-reverse">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewPayment(payment)}
                            title="عرض التفاصيل"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          {payment.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleConfirmPayment(payment.id)}
                              title="تأكيد المدفوعة"
                              className="text-green-600 hover:text-green-700"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {(payment.status === 'confirmed' || payment.status === 'pending') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleBouncePayment(payment.id)}
                              title="إرجاع المدفوعة"
                              className="text-red-600 hover:text-red-700"
                            >
                              <AlertCircle className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {((useSession().data?.user as any)?.role === 'admin') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePayment(payment.id)}
                              title="حذف المدفوعة"
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
                عرض {((currentPage - 1) * pageSize) + 1} إلى {Math.min(currentPage * pageSize, totalCount)} من {totalCount} مدفوعة
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

      {/* نافذة تفاصيل المدفوعة */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل المدفوعة {selectedPayment?.payment_number}</DialogTitle>
            <DialogDescription>
              عرض تفصيلي لبيانات المدفوعة وتوزيعها
            </DialogDescription>
          </DialogHeader>
          
          {selectedPayment && (
            <div className="space-y-6">
              {/* معلومات المدفوعة الأساسية */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>رقم المدفوعة</Label>
                  <div className="font-medium">{selectedPayment.payment_number}</div>
                </div>
                <div className="space-y-2">
                  <Label>العميل</Label>
                  <div className="font-medium">{selectedPayment.customer?.name}</div>
                  <div className="text-sm text-muted-foreground">{selectedPayment.customer?.customer_code}</div>
                </div>
                <div className="space-y-2">
                  <Label>المبلغ</Label>
                  <div className="font-bold text-lg">
                    <FormatCurrency amount={selectedPayment.amount} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>طريقة الدفع</Label>
                  <div>
                    <PaymentMethodBadge method={selectedPayment.payment_method} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>تاريخ الدفع</Label>
                  <div>{format(new Date(selectedPayment.payment_date), 'dd/MM/yyyy', { locale: ar })}</div>
                </div>
                <div className="space-y-2">
                  <Label>الحالة</Label>
                  <div>
                    <PaymentStatusBadge status={selectedPayment.status} />
                  </div>
                </div>
                {selectedPayment.payment_reference && (
                  <div className="space-y-2">
                    <Label>مرجع الدفع</Label>
                    <div className="font-medium">{selectedPayment.payment_reference}</div>
                  </div>
                )}
                {selectedPayment.bank_name && (
                  <div className="space-y-2">
                    <Label>البنك</Label>
                    <div>{selectedPayment.bank_name}</div>
                  </div>
                )}
                {selectedPayment.bank_date && (
                  <div className="space-y-2">
                    <Label>تاريخ استحقاق الشيك/التحويل</Label>
                    <div>{format(new Date(selectedPayment.bank_date), 'dd/MM/yyyy', { locale: ar })}</div>
                  </div>
                )}
              </div>

              {/* الملاحظات */}
              {selectedPayment.notes && (
                <div className="space-y-2">
                  <Label>ملاحظات</Label>
                  <div className="p-3 bg-gray-50 rounded-md">
                    {selectedPayment.notes}
                  </div>
                </div>
              )}

              {/* توزيع المدفوعة على الفواتير */}
              {selectedPayment.allocations && selectedPayment.allocations.length > 0 && (
                <div>
                  <Label className="text-lg font-semibold">توزيع المدفوعة</Label>
                  <div className="mt-2 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>الفاتورة</TableHead>
                          <TableHead>المبلغ المخصص</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedPayment.allocations.map((allocation) => (
                          <TableRow key={allocation.id}>
                            <TableCell>
                              {allocation.invoice_id ? `فاتورة ${allocation.invoice_id}` : 'توزيع عام'}
                            </TableCell>
                            <TableCell>
                              <FormatCurrency amount={allocation.allocated_amount} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* إجراءات */}
              <div className="flex justify-end space-x-2 space-x-reverse">
                {selectedPayment.status === 'pending' && (
                  <Button
                    variant="outline"
                    onClick={() => handleConfirmPayment(selectedPayment.id)}
                  >
                    <CheckCircle className="ml-2 h-4 w-4" />
                    تأكيد المدفوعة
                  </Button>
                )}
                {(selectedPayment.status === 'confirmed' || selectedPayment.status === 'pending') && (
                  <Button
                    variant="outline"
                    onClick={() => handleBouncePayment(selectedPayment.id)}
                  >
                    <AlertCircle className="ml-2 h-4 w-4" />
                    إرجاع المدفوعة
                  </Button>
                )}
                <Button onClick={() => setShowDetailsDialog(false)}>
                  إغلاق
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* نافذة تسجيل مدفوعة جديدة */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تسجيل مدفوعة جديدة</DialogTitle>
            <DialogDescription>
              أدخل بيانات المدفوعة الجديدة
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* هنا سيكون نموذج المدفوعة الجديدة */}
            <div className="text-center p-8 text-muted-foreground">
              سيتم إضافة نموذج المدفوعة الجديدة قريباً...
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}