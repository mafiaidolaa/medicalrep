'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts';
import { 
  FileText, TrendingUp, DollarSign, Users, Calendar, 
  Download, Printer, Filter, BarChart3, PieChart as PieChartIcon,
  AlertCircle, CheckCircle, Clock, CreditCard
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ar } from 'date-fns/locale';

// المكونات المخصصة
import { LoadingSpinner } from '@/components/loading-spinner';
import { useToast } from '@/hooks/use-toast';

// الأنواع والخدمات
import { AccountsStats, MonthlyCollection, CustomerBalance, OverdueInvoice } from '@/types/accounts';
import { customersService } from '@/lib/accounts/customers';
import { invoicesService } from '@/lib/accounts/invoices';
import { receivablesService } from '@/lib/accounts/receivables';
import { paymentsService } from '@/lib/accounts/payments';

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

// ألوان الرسوم البيانية
const CHART_COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8',
  '#82CA9D', '#FFC658', '#FF7C7C', '#8DD1E1', '#D084D0'
];

export default function AccountsReportsPage() {
  // الحالات الأساسية
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AccountsStats | null>(null);
  const [monthlyCollections, setMonthlyCollections] = useState<MonthlyCollection[]>([]);
  const [customerBalances, setCustomerBalances] = useState<CustomerBalance[]>([]);
  const [overdueInvoices, setOverdueInvoices] = useState<OverdueInvoice[]>([]);
  
  // حالات التقارير
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedDateFrom, setSelectedDateFrom] = useState('');
  const [selectedDateTo, setSelectedDateTo] = useState('');
  
  const { toast } = useToast();

  // تحميل البيانات الأولية
  useEffect(() => {
    loadReportsData();
  }, []);

  useEffect(() => {
    // تعيين التواريخ الافتراضية
    const now = new Date();
    const firstDay = startOfMonth(now);
    const lastDay = endOfMonth(now);
    
    setSelectedDateFrom(format(firstDay, 'yyyy-MM-dd'));
    setSelectedDateTo(format(lastDay, 'yyyy-MM-dd'));
  }, []);

  const loadReportsData = async () => {
    try {
      setLoading(true);
      
      const [
        customersStats,
        invoicesStats, 
        receivablesStats,
        paymentsStats,
        monthlyData,
        customersBalanceData,
        overdueData
      ] = await Promise.all([
        customersService.getCustomersStats(),
        invoicesService.getInvoicesStats(),
        receivablesService.getReceivablesStats(),
        paymentsService.getPaymentsStats(),
        paymentsService.getMonthlyPaymentsReport(),
        customersService.getCustomersWithBalance(),
        invoicesService.getOverdueInvoices()
      ]);

      // دمج الإحصائيات
      const combinedStats: AccountsStats = {
        total_customers: customersStats.total_customers,
        active_customers: customersStats.active_customers,
        total_invoices: invoicesStats.total_invoices,
        overdue_invoices: invoicesStats.overdue_invoices,
        total_receivables: receivablesStats.total_receivables,
        total_collections: paymentsStats.total_payments,
        monthly_collections: monthlyData || []
      };

      setStats(combinedStats);
      setMonthlyCollections(monthlyData || []);
      setCustomerBalances((customersBalanceData as any).slice(0, 10)); // أعلى 10 عملاء
      setOverdueInvoices((overdueData as any).slice(0, 10)); // أكثر 10 فواتير تأخراً

    } catch (error) {
      console.error('Error loading reports data:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في تحميل بيانات التقارير",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // تصدير التقرير
  const handleExportReport = (format: 'pdf' | 'excel') => {
    toast({
      title: "جاري التصدير",
      description: `جاري تصدير التقرير بصيغة ${format.toUpperCase()}`
    });
    // هنا يمكن إضافة منطق التصدير الحقيقي
  };

  // طباعة التقرير
  const handlePrintReport = () => {
    window.print();
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      {/* رأس الصفحة */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">التقارير المالية</h1>
          <p className="text-muted-foreground">
            تقارير شاملة للحسابات والفواتير والمديونيات والتحصيلات
          </p>
        </div>

        <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2 md:space-x-reverse">
          <Button variant="outline" onClick={() => handleExportReport('pdf')}>
            <Download className="ml-2 h-4 w-4" />
            تصدير PDF
          </Button>
          <Button variant="outline" onClick={() => handleExportReport('excel')}>
            <Download className="ml-2 h-4 w-4" />
            تصدير Excel
          </Button>
          <Button variant="outline" onClick={handlePrintReport}>
            <Printer className="ml-2 h-4 w-4" />
            طباعة
          </Button>
        </div>
      </div>

      {/* فلاتر الفترة الزمنية */}
      <Card>
        <CardHeader>
          <CardTitle>فلاتر التقرير</CardTitle>
          <CardDescription>اختر الفترة الزمنية للتقرير</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>الفترة</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">اليوم</SelectItem>
                  <SelectItem value="week">الأسبوع الحالي</SelectItem>
                  <SelectItem value="month">الشهر الحالي</SelectItem>
                  <SelectItem value="quarter">الربع الحالي</SelectItem>
                  <SelectItem value="year">السنة الحالية</SelectItem>
                  <SelectItem value="custom">فترة مخصصة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>من تاريخ</Label>
              <Input
                type="date"
                value={selectedDateFrom}
                onChange={(e) => setSelectedDateFrom(e.target.value)}
                disabled={selectedPeriod !== 'custom'}
              />
            </div>
            
            <div>
              <Label>إلى تاريخ</Label>
              <Input
                type="date"
                value={selectedDateTo}
                onChange={(e) => setSelectedDateTo(e.target.value)}
                disabled={selectedPeriod !== 'custom'}
              />
            </div>
            
            <div className="flex items-end">
              <Button onClick={loadReportsData} className="w-full">
                <Filter className="ml-2 h-4 w-4" />
                تحديث التقرير
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* الإحصائيات الرئيسية */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي العملاء</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_customers || 0}</div>
            <p className="text-xs text-muted-foreground">
              نشط: {stats?.active_customers || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الفواتير</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_invoices || 0}</div>
            <p className="text-xs text-red-600">
              متأخرة: {stats?.overdue_invoices || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المديونيات</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_receivables || 0}</div>
            <p className="text-xs text-muted-foreground">
              مديونية
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي التحصيلات</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_collections || 0}</div>
            <p className="text-xs text-muted-foreground">
              مدفوعة
            </p>
          </CardContent>
        </Card>
      </div>

      {/* التقارير المتقدمة */}
      <Tabs defaultValue="charts" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="charts">الرسوم البيانية</TabsTrigger>
          <TabsTrigger value="customers">تقرير العملاء</TabsTrigger>
          <TabsTrigger value="overdue">الفواتير المتأخرة</TabsTrigger>
          <TabsTrigger value="collections">التحصيلات</TabsTrigger>
        </TabsList>

        {/* تاب الرسوم البيانية */}
        <TabsContent value="charts" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* رسم بياني للتحصيلات الشهرية */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="ml-2 h-5 w-5" />
                  التحصيلات الشهرية
                </CardTitle>
                <CardDescription>
                  مقارنة التحصيلات خلال الأشهر الأخيرة
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyCollections}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="month" 
                      tickFormatter={(value) => format(new Date(value), 'MMM yyyy', { locale: ar })}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: any) => [
                        `${Number(value).toLocaleString()} ر.س`, 
                        'إجمالي التحصيلات'
                      ]}
                      labelFormatter={(label) => format(new Date(label), 'MMMM yyyy', { locale: ar })}
                    />
                    <Legend />
                    <Bar dataKey="total_collected" fill={CHART_COLORS[0]} name="إجمالي التحصيلات" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* رسم بياني دائري لطرق الدفع */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChartIcon className="ml-2 h-5 w-5" />
                  طرق الدفع
                </CardTitle>
                <CardDescription>
                  توزيع التحصيلات حسب طريقة الدفع
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'نقدي', value: monthlyCollections.reduce((sum, m) => sum + m.cash_amount, 0) },
                        { name: 'شيك', value: monthlyCollections.reduce((sum, m) => sum + m.check_amount, 0) },
                        { name: 'تحويل بنكي', value: monthlyCollections.reduce((sum, m) => sum + m.transfer_amount, 0) }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {monthlyCollections.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => `${Number(value).toLocaleString()} ر.س`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* رسم بياني خطي للاتجاهات */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="ml-2 h-5 w-5" />
                اتجاه التحصيلات
              </CardTitle>
              <CardDescription>
                تطور التحصيلات عبر الوقت
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={monthlyCollections}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month" 
                    tickFormatter={(value) => format(new Date(value), 'MMM', { locale: ar })}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: any) => [
                      `${Number(value).toLocaleString()} ر.س`
                    ]}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="total_collected" 
                    stackId="1" 
                    stroke={CHART_COLORS[0]} 
                    fill={CHART_COLORS[0]}
                    fillOpacity={0.6}
                    name="إجمالي التحصيلات"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* تاب تقرير العملاء */}
        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>العملاء حسب المديونية</CardTitle>
              <CardDescription>
                أعلى 10 عملاء من ناحية المديونية
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>العميل</TableHead>
                    <TableHead>كود العميل</TableHead>
                    <TableHead>الرصيد</TableHead>
                    <TableHead>حد الائتمان</TableHead>
                    <TableHead>حالة الرصيد</TableHead>
                    <TableHead>عدد الفواتير</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerBalances.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>{customer.customer_code}</TableCell>
                      <TableCell>
                        <FormatCurrency amount={customer.balance} />
                      </TableCell>
                      <TableCell>
                        <FormatCurrency amount={customer.credit_limit} />
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={
                            customer.balance_status === 'over_limit' ? 'bg-red-100 text-red-800' :
                            customer.balance_status === 'has_balance' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }
                        >
                          {customer.balance_status === 'over_limit' ? 'تجاوز الحد' :
                           customer.balance_status === 'has_balance' ? 'له رصيد' :
                           'سليم'}
                        </Badge>
                      </TableCell>
                      <TableCell>{customer.total_invoices}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* تاب الفواتير المتأخرة */}
        <TabsContent value="overdue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>الفواتير المتأخرة</CardTitle>
              <CardDescription>
                الفواتير التي تجاوزت تاريخ الاستحقاق
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم الفاتورة</TableHead>
                    <TableHead>العميل</TableHead>
                    <TableHead>تاريخ الفاتورة</TableHead>
                    <TableHead>تاريخ الاستحقاق</TableHead>
                    <TableHead>أيام التأخر</TableHead>
                    <TableHead>المبلغ المتبقي</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell>{invoice.customer_name}</TableCell>
                      <TableCell>
                        {format(new Date(invoice.invoice_date), 'dd/MM/yyyy', { locale: ar })}
                      </TableCell>
                      <TableCell>
                        {format(new Date(invoice.due_date), 'dd/MM/yyyy', { locale: ar })}
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          invoice.overdue_days > 90 ? 'bg-red-100 text-red-800' :
                          invoice.overdue_days > 60 ? 'bg-orange-100 text-orange-800' :
                          invoice.overdue_days > 30 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }>
                          {invoice.overdue_days} يوم
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <FormatCurrency amount={invoice.remaining_amount} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* تاب التحصيلات */}
        <TabsContent value="collections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ملخص التحصيلات الشهرية</CardTitle>
              <CardDescription>
                تفصيل التحصيلات حسب الشهر وطريقة الدفع
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الشهر</TableHead>
                    <TableHead>عدد المدفوعات</TableHead>
                    <TableHead>إجمالي التحصيلات</TableHead>
                    <TableHead>نقدي</TableHead>
                    <TableHead>شيك</TableHead>
                    <TableHead>تحويل بنكي</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyCollections.map((collection) => (
                    <TableRow key={collection.month}>
                      <TableCell className="font-medium">
                        {format(new Date(collection.month), 'MMMM yyyy', { locale: ar })}
                      </TableCell>
                      <TableCell>{collection.payment_count}</TableCell>
                      <TableCell>
                        <FormatCurrency amount={collection.total_collected} />
                      </TableCell>
                      <TableCell>
                        <FormatCurrency amount={collection.cash_amount} />
                      </TableCell>
                      <TableCell>
                        <FormatCurrency amount={collection.check_amount} />
                      </TableCell>
                      <TableCell>
                        <FormatCurrency amount={collection.transfer_amount} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ملخص التقرير */}
      <Card>
        <CardHeader>
          <CardTitle>ملخص التقرير</CardTitle>
          <CardDescription>
            ملخص شامل للوضع المالي الحالي
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">الأداء المالي</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>إجمالي الفواتير المصدرة:</span>
                  <span className="font-bold">{stats?.total_invoices || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>إجمالي التحصيلات:</span>
                  <span className="font-bold">{stats?.total_collections || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>معدل التحصيل:</span>
                  <span className="font-bold text-green-600">
                    {stats?.total_invoices ? 
                      Math.round((stats.total_collections / stats.total_invoices) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">المديونيات</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>إجمالي المديونيات:</span>
                  <span className="font-bold">{stats?.total_receivables || 0}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>فواتير متأخرة:</span>
                  <span className="font-bold">{stats?.overdue_invoices || 0}</span>
                </div>
                <div className="flex justify-between text-blue-600">
                  <span>عملاء نشطين:</span>
                  <span className="font-bold">{stats?.active_customers || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}