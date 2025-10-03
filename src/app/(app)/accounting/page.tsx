"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  DollarSign, 
  TrendingUp, 
  CreditCard, 
  Banknote, 
  Plus, 
  FileText, 
  Clock, 
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Filter,
  Download,
  Search,
  Eye,
  Edit,
  Trash2,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Input } from '@/components/ui/input';
import { InvoiceForm } from '@/components/accounting/invoice-form';
import { CollectionForm } from '@/components/accounting/collection-form';
import { ExpenseForm } from '@/components/accounting/expense-form';
import { DebtForm } from '@/components/accounting/debt-form';
import { toast } from 'sonner';
import { useOptimizedDataProvider } from '@/lib/optimized-data-provider';

interface Invoice {
  id: string;
  number: string;
  clientName: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  date: string;
  dueDate: string;
}

interface Debt {
  id: string;
  clientName: string;
  amount: number;
  dueDate: string;
  status: 'current' | 'overdue' | 'critical';
  invoiceNumber: string;
}

interface Collection {
  id: string;
  clientName: string;
  amount: number;
  date: string;
  method: 'cash' | 'check' | 'bank_transfer';
  invoiceNumber: string;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  status: 'approved' | 'pending' | 'rejected';
}

export default function AccountingPage() {
  // Route-level guard: accounting-only
  const { currentUser } = useOptimizedDataProvider();
  // currentUser is loaded on client; fallback message if not allowed
  // Note: to avoid SSR issues, we check at render time
  // Allowed roles
  const allowed = (currentUser?.role === 'accountant' || currentUser?.role === 'admin' || currentUser?.role === 'gm');
  if (!allowed) {
    return (
      <div dir="rtl" className="p-6">
        <Card className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle>غير مصرح بالدخول</CardTitle>
            <CardDescription>هذا القسم مخصص للمحاسبة فقط.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }
  const [activeTab, setActiveTab] = useState('invoices');
  const [searchTerm, setSearchTerm] = useState('');
  const [isInvoiceFormOpen, setIsInvoiceFormOpen] = useState(false);
  const [isCollectionFormOpen, setIsCollectionFormOpen] = useState(false);
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [isDebtFormOpen, setIsDebtFormOpen] = useState(false);
  
  // Real data states
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state per list
  const [invoicesPage, setInvoicesPage] = useState(1);
  const [debtsPage, setDebtsPage] = useState(1);
  const [collectionsPage, setCollectionsPage] = useState(1);
  const [expensesPage, setExpensesPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [invoicesTotal, setInvoicesTotal] = useState(0);
  const [debtsTotal, setDebtsTotal] = useState(0);
  const [collectionsTotal, setCollectionsTotal] = useState(0);
  const [expensesTotal, setExpensesTotal] = useState(0);

  const buildUrl = (base: string, page: number) => `${base}?page=${page}&pageSize=${pageSize}`;

  async function fetchWithCount<T>(input: string): Promise<{ data: T[]; total: number }> {
    const res = await fetch(input);
    if (!res.ok) return { data: [], total: 0 };
    const total = parseInt(res.headers.get('X-Total-Count') || '0', 10);
    const data = await res.json();
    return { data, total };
  }

  // Data fetching functions
  const fetchAllData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [invoicesRes, debtsRes, collectionsRes, expensesRes] = await Promise.all([
        fetchWithCount<Invoice>(buildUrl('/api/accounting/invoices', invoicesPage)),
        fetchWithCount<Debt>(buildUrl('/api/accounting/debts', debtsPage)),
        fetchWithCount<Collection>(buildUrl('/api/accounting/collections', collectionsPage)),
        fetchWithCount<Expense>(buildUrl('/api/accounting/expenses', expensesPage))
      ]);

      setInvoices(invoicesRes.data);
      setDebts(debtsRes.data);
      setCollections(collectionsRes.data);
      setExpenses(expensesRes.data);
      setInvoicesTotal(invoicesRes.total);
      setDebtsTotal(debtsRes.total);
      setCollectionsTotal(collectionsRes.total);
      setExpensesTotal(expensesRes.total);
    } catch (err: any) {
      console.error('Error fetching accounting data:', err);
      setError('فشل في تحميل بيانات المحاسبة');
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on component mount and when pagination changes
  useEffect(() => {
    fetchAllData();
  }, [invoicesPage, debtsPage, collectionsPage, expensesPage, pageSize]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      paid: { label: 'مدفوع', variant: 'default' as const, color: 'bg-green-100 text-green-800' },
      pending: { label: 'في الانتظار', variant: 'secondary' as const, color: 'bg-yellow-100 text-yellow-800' },
      overdue: { label: 'متأخر', variant: 'destructive' as const, color: 'bg-red-100 text-red-800' },
      current: { label: 'حالي', variant: 'default' as const, color: 'bg-blue-100 text-blue-800' },
      critical: { label: 'حرج', variant: 'destructive' as const, color: 'bg-red-100 text-red-800' },
      approved: { label: 'موافق عليه', variant: 'default' as const, color: 'bg-green-100 text-green-800' },
      rejected: { label: 'مرفوض', variant: 'destructive' as const, color: 'bg-red-100 text-red-800' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP'
    }).format(amount);
  };

  const totalRevenue = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0);
  const totalExpenses = expenses.filter(exp => exp.status === 'approved').reduce((sum, exp) => sum + exp.amount, 0);
  const totalDebt = debts.reduce((sum, debt) => sum + debt.amount, 0);
  const totalCollections = collections.reduce((sum, col) => sum + col.amount, 0);

  // Form handlers
  const handleInvoiceSubmit = (data: any) => {
    console.log('New invoice created:', data);
    toast.success('تم إنشاء الفاتورة بنجاح!');
    fetchAllData(); // Refresh data
  };

  const handleCollectionSubmit = (data: any) => {
    console.log('New collection created:', data);
    toast.success('تم تسجيل التحصيل بنجاح!');
    fetchAllData(); // Refresh data
  };

  const handleExpenseSubmit = (data: any) => {
    console.log('New expense created:', data);
    toast.success('تم تسجيل النفقة بنجاح!');
    fetchAllData(); // Refresh data
  };

  const handleDebtSubmit = (data: any) => {
    console.log('New debt created:', data);
    toast.success('تم تسجيل الدين بنجاح!');
    fetchAllData(); // Refresh data
  };

  return (
    <div className="flex flex-col gap-6" dir="rtl">
      <Breadcrumbs items={[{ label: 'الحسابات' }]} />
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">الحسابات والمالية</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchAllData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ml-2 ${isLoading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 ml-2" />
            تصدير التقرير
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 ml-2" />
            فلترة
          </Button>
        </div>
      </div>

      {/* Quick navigation */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link href="/expenses" className="border rounded-lg p-3 hover:bg-muted transition-colors">
          <div className="flex items-center gap-2"><DollarSign className="h-4 w-4" /><span>المصروفات</span></div>
        </Link>
        <Link href="/expenses/approvals" className="border rounded-lg p-3 hover:bg-muted transition-colors">
<div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-primary inline-block" /><span>أسباب المصروفات</span></div>
        </Link>
        <Link href="/accounts/expenses" className="border rounded-lg p-3 hover:bg-muted transition-colors">
          <div className="flex items-center gap-2"><FileText className="h-4 w-4" /><span>إدارة المصروفات</span></div>
        </Link>
        <Link href="/accounts/expenses/reasons" className="border rounded-lg p-3 hover:bg-muted transition-colors">
          <div className="flex items-center gap-2"><FileText className="h-4 w-4" /><span>أسباب المصروفات</span></div>
        </Link>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">+12% من الشهر الماضي</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي النفقات</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">-5% من الشهر الماضي</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المديونيات</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(totalDebt)}</div>
            <p className="text-xs text-muted-foreground">{debts.filter(d => d.status === 'overdue').length} فاتورة متأخرة</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">التحصيل الشهري</CardTitle>
            <Banknote className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalCollections)}</div>
            <p className="text-xs text-muted-foreground">هذا الشهر</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="invoices">الفواتير</TabsTrigger>
          <TabsTrigger value="debts">المديونيات</TabsTrigger>
          <TabsTrigger value="collections">التحصيل</TabsTrigger>
          <TabsTrigger value="expenses">النفقات</TabsTrigger>
        </TabsList>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>إدارة الفواتير</CardTitle>
                  <CardDescription>جميع الفواتير المرسلة للعملاء</CardDescription>
                </div>
                <Dialog open={isInvoiceFormOpen} onOpenChange={setIsInvoiceFormOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 ml-2" />
                      فاتورة جديدة
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>إنشاء فاتورة جديدة</DialogTitle>
                    </DialogHeader>
                    <InvoiceForm 
                      onClose={() => setIsInvoiceFormOpen(false)}
                      onSubmit={handleInvoiceSubmit}
                    />
                  </DialogContent>
                </Dialog>
              </div>
              <div className="flex gap-4 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="البحث في الفواتير..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-8"
                  />
                </div>
                <Button variant="outline" size="sm">
                  <Calendar className="h-4 w-4 ml-2" />
                  تاريخ
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{invoice.number}</p>
                        <p className="text-sm text-muted-foreground">{invoice.clientName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-left">
                        <p className="font-bold">{formatCurrency(invoice.amount)}</p>
                        <p className="text-sm text-muted-foreground">تاريخ الاستحقاق: {invoice.dueDate}</p>
                      </div>
                      {getStatusBadge(invoice.status)}
                      <Button variant="ghost" size="sm">
                        عرض
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <div className="flex items-center justify-between p-4">
              <div className="text-sm text-muted-foreground">
                الصفحة {invoicesPage} من {Math.max(1, Math.ceil(invoicesTotal / pageSize))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={invoicesPage === 1 || isLoading} onClick={() => setInvoicesPage(p => Math.max(1, p - 1))}>السابق</Button>
                <Button variant="outline" size="sm" disabled={invoicesPage >= Math.ceil(invoicesTotal / pageSize) || isLoading} onClick={() => setInvoicesPage(p => p + 1)}>التالي</Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Debts Tab */}
        <TabsContent value="debts" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>إدارة المديونيات</CardTitle>
                  <CardDescription>متابعة المبالغ المستحقة من العملاء</CardDescription>
                </div>
                <Dialog open={isDebtFormOpen} onOpenChange={setIsDebtFormOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 ml-2" />
                      تسجيل دين
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>تسجيل دين جديد</DialogTitle>
                    </DialogHeader>
                    <DebtForm 
                      onClose={() => setIsDebtFormOpen(false)}
                      onSubmit={handleDebtSubmit}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {debts.map((debt) => (
                  <div key={debt.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Clock className="h-5 w-5 text-orange-500" />
                      <div>
                        <p className="font-medium">{debt.clientName}</p>
                        <p className="text-sm text-muted-foreground">فاتورة: {debt.invoiceNumber}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-left">
                        <p className="font-bold text-red-600">{formatCurrency(debt.amount)}</p>
                        <p className="text-sm text-muted-foreground">مستحق: {debt.dueDate}</p>
                      </div>
                      {getStatusBadge(debt.status)}
                      <Button variant="ghost" size="sm">
                        تحصيل
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <div className="flex items-center justify-between p-4">
              <div className="text-sm text-muted-foreground">
                الصفحة {debtsPage} من {Math.max(1, Math.ceil(debtsTotal / pageSize))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={debtsPage === 1 || isLoading} onClick={() => setDebtsPage(p => Math.max(1, p - 1))}>السابق</Button>
                <Button variant="outline" size="sm" disabled={debtsPage >= Math.ceil(debtsTotal / pageSize) || isLoading} onClick={() => setDebtsPage(p => p + 1)}>التالي</Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Collections Tab */}
        <TabsContent value="collections" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>إدارة التحصيل</CardTitle>
                  <CardDescription>سجل المبالغ المحصلة من العملاء</CardDescription>
                </div>
                <Dialog open={isCollectionFormOpen} onOpenChange={setIsCollectionFormOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 ml-2" />
                      تسجيل تحصيل
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>تسجيل تحصيل جديد</DialogTitle>
                    </DialogHeader>
                    <CollectionForm 
                      onClose={() => setIsCollectionFormOpen(false)}
                      onSubmit={handleCollectionSubmit}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {collections.map((collection) => (
                  <div key={collection.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Banknote className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium">{collection.clientName}</p>
                        <p className="text-sm text-muted-foreground">فاتورة: {collection.invoiceNumber}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-left">
                        <p className="font-bold text-green-600">{formatCurrency(collection.amount)}</p>
                        <p className="text-sm text-muted-foreground">{collection.date}</p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800">
                        {collection.method === 'cash' ? 'نقداً' : 
                         collection.method === 'check' ? 'شيك' : 'تحويل بنكي'}
                      </Badge>
                      <Button variant="ghost" size="sm">
                        عرض
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <div className="flex items-center justify-between p-4">
              <div className="text-sm text-muted-foreground">
                الصفحة {collectionsPage} من {Math.max(1, Math.ceil(collectionsTotal / pageSize))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={collectionsPage === 1 || isLoading} onClick={() => setCollectionsPage(p => Math.max(1, p - 1))}>السابق</Button>
                <Button variant="outline" size="sm" disabled={collectionsPage >= Math.ceil(collectionsTotal / pageSize) || isLoading} onClick={() => setCollectionsPage(p => p + 1)}>التالي</Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>إدارة النفقات</CardTitle>
                  <CardDescription>تسجيل ومتابعة مصاريف الشركة</CardDescription>
                </div>
                <Dialog open={isExpenseFormOpen} onOpenChange={setIsExpenseFormOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 ml-2" />
                      نفقة جديدة
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>نفقة جديدة</DialogTitle>
                    </DialogHeader>
                    <ExpenseForm 
                      onClose={() => setIsExpenseFormOpen(false)}
                      onSubmit={handleExpenseSubmit}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {expenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <CreditCard className="h-5 w-5 text-red-500" />
                      <div>
                        <p className="font-medium">{expense.description}</p>
                        <p className="text-sm text-muted-foreground">{expense.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-left">
                        <p className="font-bold text-red-600">{formatCurrency(expense.amount)}</p>
                        <p className="text-sm text-muted-foreground">{expense.date}</p>
                      </div>
                      {getStatusBadge(expense.status)}
                      <Button variant="ghost" size="sm">
                        تعديل
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <div className="flex items-center justify-between p-4">
              <div className="text-sm text-muted-foreground">
                الصفحة {expensesPage} من {Math.max(1, Math.ceil(expensesTotal / pageSize))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={expensesPage === 1 || isLoading} onClick={() => setExpensesPage(p => Math.max(1, p - 1))}>السابق</Button>
                <Button variant="outline" size="sm" disabled={expensesPage >= Math.ceil(expensesTotal / pageSize) || isLoading} onClick={() => setExpensesPage(p => p + 1)}>التالي</Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
