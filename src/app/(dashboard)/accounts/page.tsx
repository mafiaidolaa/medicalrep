'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { 
  FileText, Users, CreditCard, AlertTriangle, TrendingUp, 
  DollarSign, Clock, CheckCircle, ArrowUpRight, Plus,
  Calculator, Receipt, Phone, BarChart3, Wallet, XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

// المكونات المخصصة
import { LoadingSpinner } from '@/components/loading-spinner';
import { useToast } from '@/hooks/use-toast';

// الأنواع والخدمات
import { customersService } from '@/lib/accounts/customers';
import { invoicesService } from '@/lib/accounts/invoices';
import { receivablesService } from '@/lib/accounts/receivables';
import { paymentsService } from '@/lib/accounts/payments';
import { expenseService } from '@/lib/accounts/expenses';

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
const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function AccountsMainPage() {
  // الحالات الأساسية
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [quickActions, setQuickActions] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  
  const { toast } = useToast();

  // تحميل البيانات الأولية
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const [
        customersStats,
        invoicesStats,
        receivablesStats,
        paymentsStats,
        expensesStats,
        overdueInvoices,
        recentPayments,
        monthlyCollections,
        pendingExpenseRequests
      ] = await Promise.all([
        customersService.getCustomersStats(),
        invoicesService.getInvoicesStats(),
        receivablesService.getReceivablesStats(),
        paymentsService.getPaymentsStats(),
        expenseService.reports.getDashboardStats(),
        invoicesService.getOverdueInvoices(),
        paymentsService.getPendingPayments(),
        paymentsService.getMonthlyPaymentsReport(),
        expenseService.requests.getRequests({ status: ['pending'] })
      ]);

      // تجميع البيانات
      const combinedData = {
        customers: customersStats,
        invoices: invoicesStats,
        receivables: receivablesStats,
        payments: paymentsStats,
        expenses: expensesStats,
        overdue: overdueInvoices.slice(0, 5),
        pendingPayments: recentPayments.slice(0, 5),
        pendingExpenses: pendingExpenseRequests.requests.slice(0, 5),
        monthlyData: monthlyCollections.slice(0, 6)
      };

      setDashboardData(combinedData);

      // تحديد الإجراءات السريعة بناءً على البيانات
      const actions = [];
      
      if (overdueInvoices.length > 0) {
        actions.push({
          title: 'متابعة الفواتير المتأخرة',
          description: `${overdueInvoices.length} فاتورة تحتاج لمتابعة`,
          link: '/accounts/receivables?tab=overdue',
          icon: AlertTriangle,
          color: 'text-red-600',
          urgent: true
        });
      }

      if (recentPayments.length > 0) {
        actions.push({
          title: 'مراجعة المدفوعات المعلقة',
          description: `${recentPayments.length} مدفوعة تحتاج لتأكيد`,
          link: '/accounts/payments?tab=pending',
          icon: CreditCard,
          color: 'text-yellow-600',
          urgent: false
        });
      }

      if (pendingExpenseRequests.requests.length > 0) {
        actions.push({
          title: 'موافقة طلبات المصروفات',
          description: `${pendingExpenseRequests.requests.length} طلب ينتظر الموافقة`,
          link: '/expenses/approvals',
          icon: Wallet,
          color: 'text-orange-600',
          urgent: true
        });
      }

      actions.push({
        title: 'إنشاء فاتورة جديدة',
        description: 'إضافة فاتورة مبيعات أو مشتريات',
        link: '/accounts/invoices',
        icon: Plus,
        color: 'text-blue-600',
        urgent: false
      });

      setQuickActions(actions);

      // النشاطات الأخيرة (مدفوعات + فواتير + مصروفات)
      const activities = [
        ...recentPayments.map(payment => ({
          type: 'payment',
          title: `مدفوعة ${payment.payment_number}`,
          description: `${payment.customer?.name} - ${payment.amount.toLocaleString()} ر.س`,
          time: payment.created_at,
          status: payment.status
        })),
        ...overdueInvoices.slice(0, 3).map(invoice => ({
          type: 'overdue',
          title: `فاتورة متأخرة ${invoice.invoice_number}`,
          description: `${(invoice as any).customer_name ?? invoice.customer?.name ?? ''} - ${(invoice as any).overdue_days ?? ''} يوم تأخير`,
          time: invoice.due_date,
          status: 'overdue'
        })),
        ...pendingExpenseRequests.requests.slice(0, 3).map(expense => ({
          type: 'expense',
          title: `طلب مصروفات ${expense.request_number}`,
          description: `${expense.employee_name} - ${expense.total_amount.toLocaleString()} ر.س`,
          time: expense.created_at,
          status: expense.status
        }))
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5);

      setRecentActivity(activities);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في تحميل بيانات لوحة التحكم",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      {/* رأس الصفحة */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">نظام الحسابات</h1>
          <p className="text-muted-foreground">
            لوحة التحكم الرئيسية لإدارة الحسابات والمبيعات
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          آخر تحديث: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ar })}
        </div>
      </div>

      {/* الإحصائيات الرئيسية */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي العملاء</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.customers?.total_customers || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{dashboardData?.customers?.active_customers || 0} نشط
            </p>
            <div className="mt-2">
              <Progress 
                value={
                  dashboardData?.customers?.total_customers ? 
                  (dashboardData.customers.active_customers / dashboardData.customers.total_customers) * 100 : 0
                } 
                className="h-1" 
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الفواتير</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.invoices?.total_invoices || 0}</div>
            <p className="text-xs text-red-600">
              {dashboardData?.invoices?.overdue_invoices || 0} متأخرة
            </p>
            <div className="mt-2 flex items-center text-xs">
              <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
              <span className="text-green-600">+12% من الشهر الماضي</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المديونيات</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              <FormatCurrency amount={dashboardData?.receivables?.remaining_amount || 0} />
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardData?.receivables?.total_receivables || 0} مديونية
            </p>
            <div className="mt-2">
              <Badge className="bg-red-100 text-red-800">
                يتطلب متابعة
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي التحصيلات</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              <FormatCurrency amount={dashboardData?.payments?.confirmed_amount || 0} />
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardData?.payments?.confirmed_payments || 0} مدفوعة مؤكدة
            </p>
            <div className="mt-2 flex items-center text-xs">
              <CheckCircle className="h-3 w-3 text-green-600 mr-1" />
              <span className="text-green-600">معدل تحصيل 85%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* إحصائيات المصروفات */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">طلبات المصروفات</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.expenses?.total_requests || 0}</div>
            <p className="text-xs text-orange-600">
              {dashboardData?.expenses?.pending_requests || 0} في انتظار الموافقة
            </p>
            <div className="mt-2">
              <Progress 
                value={
                  dashboardData?.expenses?.total_requests ? 
                  ((dashboardData.expenses.approved_requests || 0) / dashboardData.expenses.total_requests) * 100 : 0
                } 
                className="h-1" 
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المصروفات</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              <FormatCurrency amount={dashboardData?.expenses?.total_amount || 0} />
            </div>
            <p className="text-xs text-green-600">
              <FormatCurrency amount={dashboardData?.expenses?.approved_amount || 0} /> معتمد
            </p>
            <div className="mt-2 flex items-center text-xs">
              <TrendingUp className="h-3 w-3 text-blue-600 mr-1" />
              <span className="text-blue-600">متوسط {dashboardData?.expenses?.total_requests ? Math.round((dashboardData.expenses.total_amount || 0) / dashboardData.expenses.total_requests) : 0} ر.س/طلب</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">معدل الموافقة</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {dashboardData?.expenses?.total_requests ? 
                Math.round(((dashboardData.expenses.approved_requests || 0) / dashboardData.expenses.total_requests) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardData?.expenses?.approved_requests || 0} من {dashboardData?.expenses?.total_requests || 0} طلب
            </p>
            <div className="mt-2">
              <Badge className="bg-green-100 text-green-800">
                معدل جيد
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الطلبات المرفوضة</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{dashboardData?.expenses?.rejected_requests || 0}</div>
            <p className="text-xs text-muted-foreground">
              <FormatCurrency amount={dashboardData?.expenses?.rejected_amount || 0} /> قيمة مرفوضة
            </p>
            <div className="mt-2 flex items-center text-xs">
              <XCircle className="h-3 w-3 text-red-600 mr-1" />
              <span className="text-red-600">
                {dashboardData?.expenses?.total_requests ? 
                  Math.round(((dashboardData.expenses.rejected_requests || 0) / dashboardData.expenses.total_requests) * 100) : 0}% معدل الرفض
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* الإجراءات السريعة */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calculator className="ml-2 h-5 w-5" />
                الإجراءات السريعة
              </CardTitle>
              <CardDescription>
                المهام التي تحتاج لانتباهك
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <Link key={index} href={action.link}>
                    <div className={`p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors ${
                      action.urgent ? 'border-red-200 bg-red-50' : 'border-gray-200'
                    }`}>
                      <div className="flex items-start space-x-3 space-x-reverse">
                        <Icon className={`h-5 w-5 mt-0.5 ${action.color}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {action.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {action.description}
                          </p>
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </Link>
                );
              })}

              {/* روابط سريعة إضافية */}
              <div className="pt-3 border-t space-y-2">
                <Link href="/accounts/invoices">
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="ml-2 h-4 w-4" />
                    إدارة الفواتير
                  </Button>
                </Link>
                <Link href="/accounts/receivables">
                  <Button variant="outline" className="w-full justify-start">
                    <AlertTriangle className="ml-2 h-4 w-4" />
                    إدارة المديونيات
                  </Button>
                </Link>
                <Link href="/accounts/payments">
                  <Button variant="outline" className="w-full justify-start">
                    <CreditCard className="ml-2 h-4 w-4" />
                    إدارة المدفوعات
                  </Button>
                </Link>
                <Link href="/accounts/reports">
                  <Button variant="outline" className="w-full justify-start">
                    <BarChart3 className="ml-2 h-4 w-4" />
                    التقارير المالية
                  </Button>
                </Link>
                <Link href="/accounts/expenses">
                  <Button variant="outline" className="w-full justify-start">
                    <Wallet className="ml-2 h-4 w-4" />
                    إدارة المصروفات
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* الرسم البياني والأنشطة */}
        <div className="lg:col-span-2 space-y-4">
          {/* رسم بياني للتحصيلات */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="ml-2 h-5 w-5" />
                اتجاه التحصيلات
              </CardTitle>
              <CardDescription>
                التحصيلات خلال الأشهر الستة الأخيرة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={dashboardData?.monthlyData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month" 
                    tickFormatter={(value) => format(new Date(value), 'MMM', { locale: ar })}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: any) => [
                      `${Number(value).toLocaleString()} ر.س`, 
                      'التحصيلات'
                    ]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="total_collected" 
                    stroke={CHART_COLORS[0]} 
                    strokeWidth={3}
                    dot={{ fill: CHART_COLORS[0], strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* النشاطات الأخيرة */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="ml-2 h-5 w-5" />
                النشاطات الأخيرة
              </CardTitle>
              <CardDescription>
                آخر العمليات في النظام
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    لا توجد أنشطة حديثة
                  </div>
                ) : (
                  recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-start space-x-3 space-x-reverse p-3 rounded-lg bg-gray-50">
                      <div className={`rounded-full p-1 ${
                        activity.type === 'payment' ? 'bg-green-100' : 
                        activity.type === 'expense' ? 'bg-orange-100' :
                        activity.status === 'overdue' ? 'bg-red-100' : 'bg-blue-100'
                      }`}>
                        {activity.type === 'payment' ? 
                          <CreditCard className={`h-3 w-3 ${
                            activity.status === 'confirmed' ? 'text-green-600' : 'text-yellow-600'
                          }`} /> :
                        activity.type === 'expense' ? 
                          <Wallet className="h-3 w-3 text-orange-600" /> :
                          <AlertTriangle className="h-3 w-3 text-red-600" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {activity.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {activity.description}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {format(new Date(activity.time), 'dd/MM/yyyy HH:mm', { locale: ar })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ملخص الأداء */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 space-x-reverse">
              <div className="rounded-full bg-blue-100 p-2">
                <Receipt className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">متوسط قيمة الفاتورة</p>
                <p className="text-lg font-bold">
                  <FormatCurrency amount={
                    dashboardData?.invoices?.total_amount && dashboardData?.invoices?.total_invoices ?
                    dashboardData.invoices.total_amount / dashboardData.invoices.total_invoices : 0
                  } />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 space-x-reverse">
              <div className="rounded-full bg-green-100 p-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">معدل السداد</p>
                <p className="text-lg font-bold text-green-600">
                  {dashboardData?.invoices?.total_invoices ? 
                    Math.round(((dashboardData.invoices.paid_invoices || 0) / dashboardData.invoices.total_invoices) * 100) : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 space-x-reverse">
              <div className="rounded-full bg-yellow-100 p-2">
                <Clock className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">متوسط أيام التحصيل</p>
                <p className="text-lg font-bold">
                  {dashboardData?.receivables?.average_overdue_days || 0} يوم
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 space-x-reverse">
              <div className="rounded-full bg-purple-100 p-2">
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">نمو التحصيلات</p>
                <p className="text-lg font-bold text-purple-600">+15%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}