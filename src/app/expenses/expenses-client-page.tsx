"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

// Icons
import {
  Receipt, 
  PlusCircle, 
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  FileText,
  Eye,
  Printer,
  Download,
  Calendar as CalendarIcon,
  Users,
  TrendingUp,
  AlertCircle,
  Settings,
  Car,
  Gift,
  Plane,
  Truck,
  Coffee,
  BarChart3,
  Activity,
  Zap
} from 'lucide-react';

// Types
interface User {
  id: string;
  full_name: string;
  username: string;
  role: string;
}

interface ExpenseCategory {
  id: string;
  name: string;
  name_ar: string;
  name_en: string;
  description?: string;
  icon: string;
  color: string;
  is_active: boolean;
}

interface ExpenseRequest {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  description?: string;
  notes?: string;
  receipt_image?: string;
  request_date: string;
  expense_date: string;
  status: 'pending' | 'manager_approved' | 'manager_rejected' | 'accounting_approved' | 'accounting_rejected' | 'paid';
  manager_approval_date?: string;
  manager_approval_notes?: string;
  manager_approved_by?: string;
  accounting_approval_date?: string;
  accounting_approval_notes?: string;
  accounting_approved_by?: string;
  payment_date?: string;
  payment_method?: string;
  reference_number?: string;
  expense_categories?: ExpenseCategory;
  users?: User;
}

interface ExpensesClientPageProps {
  currentUser: User;
  initialCategories: ExpenseCategory[];
  allUsers: User[];
  systemSettings: Record<string, string>;
}

const IconMapping = {
  Car,
  Gift,
  Plane,
  Truck,
  Coffee,
  Receipt,
  DollarSign,
  Settings,
  Users,
};

const getIcon = (iconName: string) => {
  return IconMapping[iconName as keyof typeof IconMapping] || Receipt;
};

const statusConfig = {
  pending: { 
    label: 'في الانتظار', 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    icon: Clock 
  },
  manager_approved: { 
    label: 'موافقة المدير', 
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: CheckCircle 
  },
  manager_rejected: { 
    label: 'رفض المدير', 
    color: 'bg-red-100 text-red-800 border-red-300',
    icon: XCircle 
  },
  accounting_approved: { 
    label: 'موافقة المحاسبة', 
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: CheckCircle 
  },
  accounting_rejected: { 
    label: 'رفض المحاسبة', 
    color: 'bg-red-100 text-red-800 border-red-300',
    icon: XCircle 
  },
  paid: { 
    label: 'تم الدفع', 
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    icon: CheckCircle 
  }
};

const StatCard = ({ title, value, icon: Icon, trend, color = "#3b82f6", loading = false }: {
  title: string;
  value: string | number;
  icon: React.ComponentType<any>;
  trend?: { value: number; isPositive: boolean };
  color?: string;
  loading?: boolean;
}) => (
  <Card className="relative overflow-hidden">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">{title}</p>
          <p className="text-3xl font-bold" style={{ color }}>
            {loading ? '...' : typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {trend && (
            <p className={`text-xs mt-2 flex items-center ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              <TrendingUp className={`h-3 w-3 mr-1 ${
                trend.isPositive ? '' : 'rotate-180'
              }`} />
              {Math.abs(trend.value)}% من الشهر الماضي
            </p>
          )}
        </div>
        <div className="relative">
          <div 
            className="p-4 rounded-full bg-opacity-20"
            style={{ backgroundColor: color }}
          >
            <Icon className="h-8 w-8" style={{ color }} />
          </div>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current"></div>
            </div>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);

export function ExpensesClientPage({
  currentUser,
  initialCategories,
  allUsers,
  systemSettings,
}: ExpensesClientPageProps) {
  const { toast } = useToast();

  // State Management
  const [activeTab, setActiveTab] = useState('dashboard');
  const [expenseRequests, setExpenseRequests] = useState<ExpenseRequest[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>(initialCategories);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);

  // Form States
  const [newRequestDialog, setNewRequestDialog] = useState(false);
  const [viewRequestDialog, setViewRequestDialog] = useState(false);
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ExpenseRequest | null>(null);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');

  // New Request Form
  const [formData, setFormData] = useState({
    category_id: '',
    amount: '',
    description: '',
    notes: '',
    clinic_name: '',
    doctor_name: '',
    expense_date: new Date(),
    expense_time: '09:00',
  });

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    user_id: '',
    category_id: '',
    start_date: '',
    end_date: '',
    search: '',
  });

  // Statistics
  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    approvedAmount: 0,
    rejectedRequests: 0,
    myTotalExpenses: 0,
    monthlyExpenses: 0,
  });

  // Load Data
  const loadExpenseRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await fetch(`/api/expenses/requests?${params.toString()}`);
      const data = await response.json();
      
      if (response.ok) {
        setExpenseRequests(data);
        calculateStats(data);
      } else {
        toast({
          variant: "destructive",
          title: "خطأ",
          description: data.error || "فشل في تحميل البيانات"
        });
      }
    } catch (error) {
      console.error('Error loading expense requests:', error);
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "حدث خطأ في تحميل البيانات"
      });
    } finally {
      setLoading(false);
      setStatsLoading(false);
    }
  };

  const calculateStats = (requests: ExpenseRequest[]) => {
    const myRequests = requests.filter(r => r.user_id === currentUser.id);
    const pending = requests.filter(r => r.status === 'pending').length;
    const approved = requests.filter(r => ['accounting_approved', 'paid'].includes(r.status));
    const rejected = requests.filter(r => r.status.includes('rejected')).length;
    const approvedAmount = approved.reduce((sum, r) => sum + r.amount, 0);
    const myTotal = myRequests.reduce((sum, r) => sum + r.amount, 0);
    
    // حساب مصاريف الشهر الحالي
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyExpenses = myRequests
      .filter(r => {
        const expenseDate = new Date(r.expense_date);
        return expenseDate.getMonth() === currentMonth && 
               expenseDate.getFullYear() === currentYear &&
               ['accounting_approved', 'paid'].includes(r.status);
      })
      .reduce((sum, r) => sum + r.amount, 0);

    setStats({
      totalRequests: requests.length,
      pendingRequests: pending,
      approvedAmount,
      rejectedRequests: rejected,
      myTotalExpenses: myTotal,
      monthlyExpenses,
    });
  };

  // Load categories
  const loadCategories = async () => {
    try {
      const response = await fetch('/api/expenses/categories');
      const data = await response.json();
      if (response.ok) {
        setCategories(data);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  // Submit new request
  const handleSubmitRequest = async () => {
    try {
      if (!formData.category_id || !formData.amount || !formData.expense_date) {
        toast({
          variant: "destructive",
          title: "خطأ",
          description: "يرجى ملء جميع الحقول المطلوبة"
        });
        return;
      }

      // Optional: upload receipt file first
      let receiptUrl: string | undefined = undefined;
      try {
        const anyForm: any = formData as any;
        if (anyForm.receipt_file) {
          const fd = new FormData();
          fd.append('file', anyForm.receipt_file);
          const up = await fetch('/api/expenses/upload', { method: 'POST', body: fd });
          const upRes = await up.json();
          if (up.ok && upRes?.url) {
            receiptUrl = upRes.url as string;
          } else {
            console.warn('Receipt upload failed:', upRes);
          }
        }
      } catch (e) {
        console.warn('Upload error (non-blocking):', e);
      }

      const payload: any = {
        category_id: formData.category_id,
        amount: formData.amount,
        description: formData.description,
        notes: formData.notes,
        clinic_name: (formData as any).clinic_name,
        doctor_name: (formData as any).doctor_name,
        expense_time: (formData as any).expense_time,
        expense_date: format(formData.expense_date, 'yyyy-MM-dd'),
      };
      if (receiptUrl) payload.receipt_url = receiptUrl;

      const response = await fetch('/api/expenses/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "نجح الإرسال",
          description: "تم إرسال طلب النفقة بنجاح"
        });
        setNewRequestDialog(false);
        setFormData({
          category_id: '',
          amount: '',
          description: '',
          notes: '',
          clinic_name: '',
          doctor_name: '',
          expense_date: new Date(),
          expense_time: '09:00',
        });
        loadExpenseRequests();
      } else {
        toast({
          variant: "destructive",
          title: "خطأ",
          description: result.error || "فشل في إرسال الطلب"
        });
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "حدث خطأ غير متوقع"
      });
    }
  };

  // Handle approval/rejection
  const handleApproval = async (action: 'approve' | 'reject', notes: string = '') => {
    try {
      if (!selectedRequest) return;

      const approvalLevel = currentUser.role === 'accounting' ? 'accounting' : 'manager';

      const response = await fetch(`/api/expenses/requests/${selectedRequest.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes, approval_level: approvalLevel }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "تم بنجاح",
          description: result.message
        });
        setApprovalDialog(false);
        setSelectedRequest(null);
        loadExpenseRequests();
      } else {
        toast({
          variant: "destructive",
          title: "خطأ",
          description: result.error || "فشل في تنفيذ العملية"
        });
      }
    } catch (error) {
      console.error('Error handling approval:', error);
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "حدث خطأ غير متوقع"
      });
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadExpenseRequests();
  }, [filters]);

  // Filter requests based on current filters
  const filteredRequests = expenseRequests.filter(request => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = 
        request.description?.toLowerCase().includes(searchLower) ||
        request.notes?.toLowerCase().includes(searchLower) ||
        request.users?.full_name.toLowerCase().includes(searchLower) ||
        request.expense_categories?.name_ar.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-6 p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white shadow-lg">
              <Receipt className="h-8 w-8" />
            </div>
            إدارة النفقات
          </h1>
          <p className="text-lg text-muted-foreground">
            نظام إدارة النفقات المتكامل مع الموافقات الهرمية
          </p>
        </div>
        
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">المستخدم الحالي</p>
                <p className="font-semibold text-blue-900">{currentUser.full_name}</p>
                <p className="text-xs text-blue-600 capitalize">{currentUser.role}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-white shadow-sm border border-gray-200 p-1 h-14">
          <TabsTrigger 
            value="dashboard" 
            className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700"
          >
            <BarChart3 className="h-4 w-4" />
            لوحة التحكم
          </TabsTrigger>
          <TabsTrigger 
            value="my-requests" 
            className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-green-100 data-[state=active]:text-green-700"
          >
            <FileText className="h-4 w-4" />
            طلباتي
          </TabsTrigger>
          {(currentUser.role === 'manager' || currentUser.role === 'admin') && (
            <TabsTrigger 
              value="approvals" 
              className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700"
            >
              <CheckCircle className="h-4 w-4" />
              الموافقات
            </TabsTrigger>
          )}
          {(currentUser.role === 'accounting' || currentUser.role === 'admin') && (
            <TabsTrigger 
              value="accounting" 
              className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700"
            >
              <DollarSign className="h-4 w-4" />
              الحسابات
            </TabsTrigger>
          )}
          {currentUser.role === 'admin' && (
            <TabsTrigger 
              value="settings" 
              className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-gray-100 data-[state=active]:text-gray-700"
            >
              <Settings className="h-4 w-4" />
              الإعدادات
            </TabsTrigger>
          )}
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="mt-6">
          <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="إجمالي الطلبات"
                value={stats.totalRequests}
                icon={FileText}
                color="#3b82f6"
                loading={statsLoading}
              />
              <StatCard
                title="الطلبات المعلقة"
                value={stats.pendingRequests}
                icon={Clock}
                color="#f59e0b"
                loading={statsLoading}
              />
              <StatCard
                title="المبلغ المعتمد"
                value={`${stats.approvedAmount.toLocaleString()} ج.م`}
                icon={CheckCircle}
                color="#10b981"
                loading={statsLoading}
              />
              <StatCard
                title="نفقاتي هذا الشهر"
                value={`${stats.monthlyExpenses.toLocaleString()} ج.م`}
                icon={TrendingUp}
                color="#8b5cf6"
                loading={statsLoading}
              />
            </div>

            {/* Quick Actions */}
            <Card className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold mb-2">إجراءات سريعة</h3>
                    <p className="text-blue-100">ابدأ بإنشاء طلب نفقة جديد أو راجع طلباتك السابقة</p>
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      onClick={() => setNewRequestDialog(true)}
                      className="bg-white text-blue-600 hover:bg-blue-50"
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      طلب جديد
                    </Button>
                    <Button 
                      onClick={() => setActiveTab('my-requests')}
                      variant="outline"
                      className="border-white text-white hover:bg-white hover:text-blue-600"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      عرض طلباتي
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Requests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  أحدث الطلبات
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : filteredRequests.length > 0 ? (
                  <div className="space-y-3">
                    {filteredRequests.slice(0, 5).map((request) => {
                      const IconComponent = getIcon(request.expense_categories?.icon || 'Receipt');
                      const statusInfo = statusConfig[request.status];
                      
                      return (
                        <div 
                          key={request.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                          onClick={() => {
                            setSelectedRequest(request);
                            setViewRequestDialog(true);
                          }}
                        >
                          <div className="flex items-center gap-4">
                            <div 
                              className="p-2 rounded-lg"
                              style={{ 
                                backgroundColor: request.expense_categories?.color + '20',
                                color: request.expense_categories?.color 
                              }}
                            >
                              <IconComponent className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-semibold">{request.expense_categories?.name_ar}</p>
                              <p className="text-sm text-muted-foreground">
                                {request.users?.full_name} • {format(new Date(request.expense_date), 'dd MMM yyyy', { locale: ar })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="font-bold text-lg">{request.amount.toLocaleString()} ج.م</p>
                            <Badge className={`${statusInfo.color} border`}>
                              <statusInfo.icon className="h-3 w-3 mr-1" />
                              {statusInfo.label}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">لا توجد طلبات حتى الآن</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* My Requests Tab */}
        <TabsContent value="my-requests" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    طلبات النفقات الخاصة بي
                  </CardTitle>
                  <CardDescription>
                    عرض وإدارة جميع طلبات النفقات التي قدمتها
                  </CardDescription>
                </div>
                <Button onClick={() => setNewRequestDialog(true)}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  طلب جديد
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <Input
                    placeholder="البحث في الطلبات..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="w-full"
                  />
                </div>
                <Select 
                  value={filters.status} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="حالة الطلب" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">جميع الحالات</SelectItem>
                    {Object.entries(statusConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Requests Table */}
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>نوع النفقة</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>تاريخ النفقة</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>تاريخ الطلب</TableHead>
                      <TableHead className="text-right">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests
                      .filter(r => r.user_id === currentUser.id)
                      .map((request) => {
                        const IconComponent = getIcon(request.expense_categories?.icon || 'Receipt');
                        const statusInfo = statusConfig[request.status];
                        
                        return (
                          <TableRow key={request.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div 
                                  className="p-2 rounded-lg"
                                  style={{ 
                                    backgroundColor: request.expense_categories?.color + '20',
                                    color: request.expense_categories?.color 
                                  }}
                                >
                                  <IconComponent className="h-4 w-4" />
                                </div>
                                <div>
                                  <p className="font-medium">{request.expense_categories?.name_ar}</p>
                                  {request.description && (
                                    <p className="text-sm text-muted-foreground">{request.description}</p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-bold text-lg">
                                {request.amount.toLocaleString()} ج.م
                              </span>
                            </TableCell>
                            <TableCell>
                              {format(new Date(request.expense_date), 'dd MMM yyyy', { locale: ar })}
                            </TableCell>
                            <TableCell>
                              <Badge className={`${statusInfo.color} border`}>
                                <statusInfo.icon className="h-3 w-3 mr-1" />
                                {statusInfo.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {format(new Date(request.request_date), 'dd MMM yyyy', { locale: ar })}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setViewRequestDialog(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              )}

              {filteredRequests.filter(r => r.user_id === currentUser.id).length === 0 && !loading && (
                <div className="text-center py-12">
                  <Receipt className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">لا توجد طلبات</h3>
                  <p className="text-muted-foreground mb-4">لم تقم بإرسال أي طلبات نفقات حتى الآن</p>
                  <Button onClick={() => setNewRequestDialog(true)}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    إنشاء طلب جديد
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Approvals Tab - For Managers */}
        {(currentUser.role === 'manager' || currentUser.role === 'admin') && (
          <TabsContent value="approvals" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      طلبات تحتاج موافقة
                    </CardTitle>
                    <CardDescription>
                      راجع ووافق على طلبات النفقات المعلقة
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 rounded-lg border border-orange-200">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-700">
                      {filteredRequests.filter(r => r.status === 'pending').length} طلب معلق
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                  </div>
                ) : filteredRequests.filter(r => r.status === 'pending').length > 0 ? (
                  <div className="space-y-4">
                    {filteredRequests.filter(r => r.status === 'pending').map((request) => {
                      const IconComponent = getIcon(request.expense_categories?.icon || 'Receipt');
                      const statusInfo = statusConfig[request.status];
                      
                      return (
                        <Card key={request.id} className="border-l-4 border-orange-400 hover:shadow-md transition-shadow">
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div 
                                  className="p-3 rounded-lg"
                                  style={{ 
                                    backgroundColor: request.expense_categories?.color + '20',
                                    color: request.expense_categories?.color 
                                  }}
                                >
                                  <IconComponent className="h-6 w-6" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-lg mb-1">
                                    {request.expense_categories?.name_ar}
                                  </h3>
                                  <p className="text-muted-foreground mb-2">
                                    بواسطة: {request.users?.full_name} • 
                                    {format(new Date(request.expense_date), 'dd MMM yyyy', { locale: ar })}
                                  </p>
                                  {request.description && (
                                    <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                      {request.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <p className="text-2xl font-bold text-green-600">
                                    {request.amount.toLocaleString()} ج.م
                                  </p>
                                  <Badge className={`${statusInfo.color} border mt-1`}>
                                    <statusInfo.icon className="h-3 w-3 mr-1" />
                                    {statusInfo.label}
                                  </Badge>
                                </div>
                                
                                <div className="flex flex-col gap-2">
                                  <Button
                                    onClick={() => {
                                      setSelectedRequest(request);
                                      setApprovalAction('approve');
                                      setApprovalDialog(true);
                                    }}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    موافقة
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      setSelectedRequest(request);
                                      setApprovalAction('reject');
                                      setApprovalDialog(true);
                                    }}
                                    variant="destructive"
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    رفض
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      setSelectedRequest(request);
                                      setViewRequestDialog(true);
                                    }}
                                    variant="outline"
                                    size="sm"
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    تفاصيل
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">لا توجد طلبات تحتاج موافقة</h3>
                    <p className="text-muted-foreground">جميع الطلبات تم التعامل معها</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Accounting Tab */}
        {(currentUser.role === 'accounting' || currentUser.role === 'admin') && (
          <TabsContent value="accounting" className="mt-6">
            <div className="space-y-6">
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100 text-sm">طلبات معتمدة</p>
                        <p className="text-3xl font-bold">
                          {filteredRequests.filter(r => r.status === 'accounting_approved').length}
                        </p>
                      </div>
                      <CheckCircle className="h-12 w-12 text-green-200" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm">تم الدفع</p>
                        <p className="text-3xl font-bold">
                          {filteredRequests.filter(r => r.status === 'paid').length}
                        </p>
                      </div>
                      <DollarSign className="h-12 w-12 text-blue-200" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100 text-sm">إجمالي المدفوع</p>
                        <p className="text-2xl font-bold">
                          {filteredRequests
                            .filter(r => r.status === 'paid')
                            .reduce((sum, r) => sum + r.amount, 0)
                            .toLocaleString()} ج.م
                        </p>
                      </div>
                      <Activity className="h-12 w-12 text-purple-200" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Requests Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    طلبات النفقات - قسم الحسابات
                  </CardTitle>
                  <CardDescription>
                    إدارة ودفع النفقات المعتمدة
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>الطلب</TableHead>
                          <TableHead>الموظف</TableHead>
                          <TableHead>المبلغ</TableHead>
                          <TableHead>حالة المدير</TableHead>
                          <TableHead>الحالة</TableHead>
                          <TableHead className="text-right">الإجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRequests
                          .filter(r => ['manager_approved', 'accounting_approved', 'paid'].includes(r.status))
                          .map((request) => {
                            const IconComponent = getIcon(request.expense_categories?.icon || 'Receipt');
                            const statusInfo = statusConfig[request.status];
                            
                            return (
                              <TableRow key={request.id}>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <div 
                                      className="p-2 rounded-lg"
                                      style={{ 
                                        backgroundColor: request.expense_categories?.color + '20',
                                        color: request.expense_categories?.color 
                                      }}
                                    >
                                      <IconComponent className="h-4 w-4" />
                                    </div>
                                    <div>
                                      <p className="font-medium">{request.expense_categories?.name_ar}</p>
                                      <p className="text-sm text-muted-foreground">
                                        {format(new Date(request.expense_date), 'dd MMM yyyy', { locale: ar })}
                                      </p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <p className="font-medium">{request.users?.full_name}</p>
                                  <p className="text-sm text-muted-foreground capitalize">{request.users?.role}</p>
                                </TableCell>
                                <TableCell>
                                  <span className="font-bold text-lg text-green-600">
                                    {request.amount.toLocaleString()} ج.م
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <Badge className="bg-green-100 text-green-800 border-green-300 border">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    معتمد
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge className={`${statusInfo.color} border`}>
                                    <statusInfo.icon className="h-3 w-3 mr-1" />
                                    {statusInfo.label}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex gap-2 justify-end">
                                    {request.status === 'manager_approved' && (
                                      <>
                                        <Button
                                          size="sm"
                                          onClick={() => handleApproval('approve', '')}
                                          className="bg-green-600 hover:bg-green-700"
                                        >
                                          <CheckCircle className="h-4 w-4 mr-1" />
                                          اعتماد
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          onClick={() => {
                                            setSelectedRequest(request);
                                            setApprovalAction('reject');
                                            setApprovalDialog(true);
                                          }}
                                        >
                                          <XCircle className="h-4 w-4 mr-1" />
                                          رفض
                                        </Button>
                                      </>
                                    )}
                                    {request.status === 'accounting_approved' && (
                                      <Button
                                        size="sm"
                                        onClick={() => {
                                          // Mark as paid
                                          handleApproval('approve', 'تم الدفع');
                                        }}
                                        className="bg-blue-600 hover:bg-blue-700"
                                      >
                                        <DollarSign className="h-4 w-4 mr-1" />
                                        دفع
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedRequest(request);
                                        setViewRequestDialog(true);
                                      }}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {/* Settings Tab */}
        {currentUser.role === 'admin' && (
          <TabsContent value="settings" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  إعدادات نظام النفقات
                </CardTitle>
                <CardDescription>
                  إدارة فئات النفقات وإعدادات النظام
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Categories Management */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">فئات النفقات</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {categories.map((category) => {
                        const IconComponent = getIcon(category.icon);
                        return (
                          <Card key={category.id} className="p-4">
                            <div className="flex items-center gap-3">
                              <div 
                                className="p-2 rounded-lg"
                                style={{ 
                                  backgroundColor: category.color + '20',
                                  color: category.color 
                                }}
                              >
                                <IconComponent className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="font-semibold">{category.name_ar}</p>
                                <p className="text-sm text-muted-foreground">{category.description}</p>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>

                  {/* System Settings */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">إعدادات النظام</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="p-4">
                        <div className="space-y-2">
                          <Label>الحد الأقصى لمبلغ النفقة</Label>
                          <Input 
                            type="number" 
                            value={systemSettings.max_expense_amount || '10000'} 
                            readOnly
                          />
                        </div>
                      </Card>
                      <Card className="p-4">
                        <div className="space-y-2">
                          <Label>يتطلب موافقة المدير</Label>
                          <div className="flex items-center space-x-2">
                            <input 
                              type="checkbox" 
                              checked={systemSettings.require_manager_approval === 'true'} 
                              readOnly 
                            />
                            <span>نعم</span>
                          </div>
                        </div>
                      </Card>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

      </Tabs>

      {/* Dialogs */}
      
      {/* New Request Dialog */}
      <Dialog open={newRequestDialog} onOpenChange={setNewRequestDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlusCircle className="h-5 w-5" />
              طلب نفقة جديد
            </DialogTitle>
            <DialogDescription>
              املأ التفاصيل أدناه لإرسال طلب نفقة جديد
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Category Selection */}
            <div className="space-y-2">
              <Label htmlFor="category">نوع النفقة *</Label>
              <Select value={formData.category_id} onValueChange={(value) => 
                setFormData(prev => ({ ...prev, category_id: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع النفقة" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => {
                    const IconComponent = getIcon(category.icon);
                    return (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="p-1 rounded"
                            style={{ 
                              backgroundColor: category.color + '20',
                              color: category.color 
                            }}
                          >
                            <IconComponent className="h-4 w-4" />
                          </div>
                          {category.name_ar}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">المبلغ (ج.م) *</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                max={parseInt(systemSettings.max_expense_amount || '10000')}
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                الحد الأقصى المسموح: {parseInt(systemSettings.max_expense_amount || '10000').toLocaleString()} ج.م
              </p>
            </div>

            {/* Expense Date */}
            <div className="space-y-2">
              <Label>تاريخ النفقة *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.expense_date ? 
                      format(formData.expense_date, 'dd MMM yyyy', { locale: ar }) : 
                      'اختر التاريخ'
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.expense_date}
                    onSelect={(date) => date && setFormData(prev => ({ ...prev, expense_date: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">وصف النفقة</Label>
              <Input
                id="description"
                placeholder="وصف مختصر للنفقة"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">ملاحظات إضافية</Label>
              <Textarea
                id="notes"
                placeholder="أي ملاحظات أو تفاصيل إضافية..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewRequestDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSubmitRequest}>
              <PlusCircle className="h-4 w-4 mr-2" />
              إرسال الطلب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Request Dialog */}
      <Dialog open={viewRequestDialog} onOpenChange={setViewRequestDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              تفاصيل طلب النفقة
            </DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="flex items-start justify-between p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-4">
                  <div 
                    className="p-4 rounded-xl"
                    style={{ 
                      backgroundColor: selectedRequest.expense_categories?.color + '30',
                      color: selectedRequest.expense_categories?.color 
                    }}
                  >
                    {(() => {
                      const IconComponent = getIcon(selectedRequest.expense_categories?.icon || 'Receipt');
                      return <IconComponent className="h-8 w-8" />;
                    })()} 
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-blue-900 mb-1">
                      {selectedRequest.expense_categories?.name_ar}
                    </h3>
                    <p className="text-blue-700">
                      طلب بواسطة: {selectedRequest.users?.full_name}
                    </p>
                    <p className="text-sm text-blue-600">
                      تاريخ الطلب: {format(new Date(selectedRequest.request_date), 'dd MMMM yyyy', { locale: ar })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-green-600 mb-2">
                    {selectedRequest.amount.toLocaleString()} ج.م
                  </p>
                  <Badge className={`${statusConfig[selectedRequest.status].color} border text-sm px-3 py-1`}>
                    {(() => {
                      const StatusIcon = statusConfig[selectedRequest.status].icon;
                      return <StatusIcon className="h-4 w-4 mr-1" />;
                    })()}
                    {statusConfig[selectedRequest.status].label}
                  </Badge>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">تفاصيل النفقة</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm text-muted-foreground">تاريخ النفقة</Label>
                      <p className="font-medium">
                        {format(new Date(selectedRequest.expense_date), 'dd MMMM yyyy', { locale: ar })}
                      </p>
                    </div>
                    {selectedRequest.description && (
                      <div>
                        <Label className="text-sm text-muted-foreground">الوصف</Label>
                        <p className="font-medium">{selectedRequest.description}</p>
                      </div>
                    )}
                    {selectedRequest.notes && (
                      <div>
                        <Label className="text-sm text-muted-foreground">الملاحظات</Label>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm">{selectedRequest.notes}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">حالة الموافقات</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Manager Approval */}
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        selectedRequest.status === 'pending' ? 'bg-yellow-100' :
                        selectedRequest.status.includes('manager_approved') ? 'bg-green-100' :
                        selectedRequest.status.includes('manager_rejected') ? 'bg-red-100' : 'bg-gray-100'
                      }`}>
                        {selectedRequest.status === 'pending' ? (
                          <Clock className="h-4 w-4 text-yellow-600" />
                        ) : selectedRequest.status.includes('manager_approved') ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : selectedRequest.status.includes('manager_rejected') ? (
                          <XCircle className="h-4 w-4 text-red-600" />
                        ) : (
                          <Clock className="h-4 w-4 text-gray-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">موافقة المدير</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedRequest.manager_approval_date ? 
                            format(new Date(selectedRequest.manager_approval_date), 'dd MMM yyyy', { locale: ar }) : 
                            'في انتظار الموافقة'
                          }
                        </p>
                      </div>
                    </div>

                    {/* Accounting Approval */}
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        ['pending', 'manager_approved'].includes(selectedRequest.status) ? 'bg-gray-100' :
                        selectedRequest.status.includes('accounting_approved') || selectedRequest.status === 'paid' ? 'bg-green-100' :
                        selectedRequest.status.includes('accounting_rejected') ? 'bg-red-100' : 'bg-gray-100'
                      }`}>
                        {['pending', 'manager_approved'].includes(selectedRequest.status) ? (
                          <Clock className="h-4 w-4 text-gray-600" />
                        ) : selectedRequest.status.includes('accounting_approved') || selectedRequest.status === 'paid' ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : selectedRequest.status.includes('accounting_rejected') ? (
                          <XCircle className="h-4 w-4 text-red-600" />
                        ) : (
                          <Clock className="h-4 w-4 text-gray-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">موافقة المحاسبة</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedRequest.accounting_approval_date ? 
                            format(new Date(selectedRequest.accounting_approval_date), 'dd MMM yyyy', { locale: ar }) : 
                            'في انتظار الموافقة'
                          }
                        </p>
                      </div>
                    </div>

                    {/* Payment Status */}
                    {selectedRequest.status === 'paid' && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-blue-100">
                          <DollarSign className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">تم الدفع</p>
                          <p className="text-sm text-muted-foreground">
                            {selectedRequest.payment_date ? 
                              format(new Date(selectedRequest.payment_date), 'dd MMM yyyy', { locale: ar }) : 
                              'غير محدد'
                            }
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Approval Notes */}
              {(selectedRequest.manager_approval_notes || selectedRequest.accounting_approval_notes) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">ملاحظات الموافقات</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedRequest.manager_approval_notes && (
                      <div>
                        <Label className="text-sm text-muted-foreground">ملاحظات المدير</Label>
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-sm">{selectedRequest.manager_approval_notes}</p>
                        </div>
                      </div>
                    )}
                    {selectedRequest.accounting_approval_notes && (
                      <div>
                        <Label className="text-sm text-muted-foreground">ملاحظات المحاسبة</Label>
                        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <p className="text-sm">{selectedRequest.accounting_approval_notes}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setViewRequestDialog(false)}>
              إغلاق
            </Button>
            <Button variant="outline">
              <Printer className="h-4 w-4 mr-2" />
              طباعة
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              تصدير PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Action Dialog */}
      <Dialog open={approvalDialog} onOpenChange={setApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {approvalAction === 'approve' ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              {approvalAction === 'approve' ? 'تأكيد الموافقة' : 'تأكيد الرفض'}
            </DialogTitle>
            <DialogDescription>
              {approvalAction === 'approve' 
                ? `هل أنت متأكد من الموافقة على طلب النفقة بمبلغ ${selectedRequest?.amount?.toLocaleString()} ج.م؟`
                : `هل أنت متأكد من رفض طلب النفقة بمبلغ ${selectedRequest?.amount?.toLocaleString()} ج.م؟`
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="approval-notes">
                {approvalAction === 'approve' ? 'ملاحظات الموافقة (اختيارية)' : 'سبب الرفض *'}
              </Label>
              <Textarea
                id="approval-notes"
                placeholder={approvalAction === 'approve' ? 'أي ملاحظات على الموافقة...' : 'يرجى توضيح سبب الرفض...'}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalDialog(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={() => {
                const notes = (document.getElementById('approval-notes') as HTMLTextAreaElement)?.value || '';
                handleApproval(approvalAction, notes);
                setApprovalDialog(false);
              }}
              className={approvalAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
              variant={approvalAction === 'approve' ? 'default' : 'destructive'}
            >
              {approvalAction === 'approve' ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  تأكيد الموافقة
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  تأكيد الرفض
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
