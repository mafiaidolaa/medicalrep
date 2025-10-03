import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import {
  CreditCard,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Receipt,
  Calendar as CalendarIcon,
  Building,
  User,
  FileText,
  Download,
  Upload,
  RefreshCw,
  Filter,
  Search,
  Banknote,
  Send,
  History,
  TrendingUp,
  PieChart,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Plus,
  X,
  Check,
  ExternalLink,
  Printer
} from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { ExpenseManagementService } from '@/lib/services/expense-management-service';
import { ExpensePrintingService } from '@/lib/services/expense-printing-service';
import { SiteSettings } from '@/lib/site-settings';

interface ApprovedExpense {
  id: string;
  request_number: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  category: {
    id: string;
    name: string;
    name_ar: string;
    icon: string;
    color: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    department: string;
    position?: string;
    bank_account?: {
      bank_name: string;
      account_number: string;
      iban: string;
    };
  };
  expense_date: Date;
  approved_at: Date;
  approved_by: string;
  approval_comments?: string;
  vendor_name?: string;
  vendor_details?: {
    bank_name?: string;
    account_number?: string;
    iban?: string;
    tax_number?: string;
    contact_info?: string;
  };
  payment_method: 'bank_transfer' | 'cash' | 'check' | 'company_card';
  payment_status: 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled';
  payment_date?: Date;
  payment_reference?: string;
  payment_notes?: string;
  receipt_files: Array<{
    name: string;
    url: string;
    size: number;
    type: string;
  }>;
  supporting_documents: Array<{
    name: string;
    url: string;
    size: number;
    type: string;
  }>;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  due_date?: Date;
}

interface PaymentBatch {
  id: string;
  batch_number: string;
  expense_ids: string[];
  total_amount: number;
  currency: string;
  payment_method: 'bank_transfer' | 'cash' | 'check';
  status: 'draft' | 'processing' | 'completed' | 'failed';
  created_at: Date;
  processed_at?: Date;
  processed_by?: string;
  reference_number?: string;
  notes?: string;
}

interface PaymentRecord {
  id: string;
  expense_id: string;
  payment_method: string;
  amount: number;
  currency: string;
  reference_number?: string;
  transaction_date: Date;
  processed_by: string;
  notes?: string;
  status: 'completed' | 'failed' | 'cancelled';
}

interface AccountingStats {
  pending_payments: number;
  pending_amount: number;
  processed_today: number;
  processed_amount_today: number;
  failed_payments: number;
  monthly_total: number;
  avg_processing_time: number;
}

const PAYMENT_METHOD_CONFIG = {
  bank_transfer: { label: 'تحويل بنكي', icon: CreditCard, color: 'bg-blue-100 text-blue-700' },
  cash: { label: 'نقداً', icon: Banknote, color: 'bg-green-100 text-green-700' },
  check: { label: 'شيك', icon: FileText, color: 'bg-orange-100 text-orange-700' },
  company_card: { label: 'بطاقة الشركة', icon: CreditCard, color: 'bg-purple-100 text-purple-700' }
};

const PAYMENT_STATUS_CONFIG = {
  pending: { label: 'في الانتظار', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  processing: { label: 'قيد المعالجة', color: 'bg-blue-100 text-blue-800', icon: RefreshCw },
  paid: { label: 'مدفوع', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  failed: { label: 'فشل', color: 'bg-red-100 text-red-800', icon: X },
  cancelled: { label: 'ملغي', color: 'bg-gray-100 text-gray-800', icon: X }
};

export default function AccountingPaymentsPage() {
  const { toast } = useToast();
  const [approvedExpenses, setApprovedExpenses] = useState<ApprovedExpense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<ApprovedExpense[]>([]);
  const [selectedExpense, setSelectedExpense] = useState<ApprovedExpense | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false);
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([]);
  const [paymentBatches, setPaymentBatches] = useState<PaymentBatch[]>([]);
  const [accountingStats, setAccountingStats] = useState<AccountingStats>({
    pending_payments: 0,
    pending_amount: 0,
    processed_today: 0,
    processed_amount_today: 0,
    failed_payments: 0,
    monthly_total: 0,
    avg_processing_time: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [paymentForm, setPaymentForm] = useState({
    payment_method: 'bank_transfer' as const,
    payment_date: new Date(),
    reference_number: '',
    notes: '',
    amount: 0
  });

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    payment_method: '',
    date_range: '',
    amount_range: '',
    department: ''
  });

  useEffect(() => {
    loadApprovedExpenses();
    loadAccountingStats();
    loadPaymentBatches();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [approvedExpenses, filters]);

  const loadApprovedExpenses = async () => {
    setIsLoading(true);
    try {
      // في التطبيق الحقيقي، سيتم جلب البيانات من قاعدة البيانات
      const mockExpenses: ApprovedExpense[] = [
        {
          id: '1',
          request_number: 'EXP-2024-001',
          title: 'تذاكر سفر لمؤتمر دبي',
          description: 'تذاكر طيران ذهاب وعودة للمشاركة في مؤتمر التكنولوجيا',
          amount: 3500,
          currency: 'SAR',
          category: {
            id: '1',
            name: 'travel',
            name_ar: 'مصاريف السفر',
            icon: 'Plane',
            color: '#3b82f6'
          },
          user: {
            id: 'user1',
            name: 'أحمد محمد علي',
            email: 'ahmed@company.com',
            avatar: '/avatars/ahmed.jpg',
            department: 'تقنية المعلومات',
            position: 'مطور أول',
            bank_account: {
              bank_name: 'البنك الأهلي السعودي',
              account_number: '123456789',
              iban: 'SA1234567891234567890'
            }
          },
          expense_date: new Date('2024-02-15'),
          approved_at: new Date('2024-01-11'),
          approved_by: 'مدير تقنية المعلومات',
          approval_comments: 'موافق بناءً على دعوة المؤتمر',
          vendor_name: 'الخطوط الجوية السعودية',
          vendor_details: {
            bank_name: 'البنك السعودي للاستثمار',
            account_number: '987654321',
            iban: 'SA9876543210987654321',
            tax_number: '123456789012345',
            contact_info: '+966112345678'
          },
          payment_method: 'bank_transfer',
          payment_status: 'pending',
          receipt_files: [
            {
              name: 'ticket_receipt.pdf',
              url: '/receipts/ticket_receipt.pdf',
              size: 256000,
              type: 'application/pdf'
            }
          ],
          supporting_documents: [
            {
              name: 'conference_invitation.pdf',
              url: '/documents/conference_invitation.pdf',
              size: 128000,
              type: 'application/pdf'
            }
          ],
          priority: 'high',
          due_date: new Date('2024-01-20')
        },
        {
          id: '2',
          request_number: 'EXP-2024-002',
          title: 'لوازم مكتبية للقسم',
          description: 'شراء أقلام وأوراق ومستلزمات مكتبية',
          amount: 450,
          currency: 'SAR',
          category: {
            id: '2',
            name: 'office',
            name_ar: 'مصاريف مكتبية',
            icon: 'Coffee',
            color: '#10b981'
          },
          user: {
            id: 'user2',
            name: 'فاطمة علي',
            email: 'fatima@company.com',
            avatar: '/avatars/fatima.jpg',
            department: 'الموارد البشرية',
            position: 'أخصائية موارد بشرية',
            bank_account: {
              bank_name: 'مصرف الراجحي',
              account_number: '555666777',
              iban: 'SA5556667771234567890'
            }
          },
          expense_date: new Date('2024-01-12'),
          approved_at: new Date('2024-01-09'),
          approved_by: 'مدير الموارد البشرية',
          vendor_name: 'مكتبة جرير',
          payment_method: 'cash',
          payment_status: 'paid',
          payment_date: new Date('2024-01-10'),
          payment_reference: 'CASH-2024-001',
          receipt_files: [
            {
              name: 'office_supplies.jpg',
              url: '/receipts/office_supplies.jpg',
              size: 128000,
              type: 'image/jpeg'
            }
          ],
          supporting_documents: [],
          priority: 'normal'
        },
        {
          id: '3',
          request_number: 'EXP-2024-004',
          title: 'اشتراك البرمجيات السنوي',
          description: 'تجديد اشتراك برنامج التصميم والتطوير للفريق',
          amount: 4500,
          currency: 'SAR',
          category: {
            id: '5',
            name: 'software',
            name_ar: 'البرمجيات والتراخيص',
            icon: 'Code',
            color: '#10b981'
          },
          user: {
            id: 'user4',
            name: 'سارة أحمد',
            email: 'sara@company.com',
            avatar: '/avatars/sara.jpg',
            department: 'تقنية المعلومات',
            position: 'مصممة واجهات',
            bank_account: {
              bank_name: 'البنك الأهلي السعودي',
              account_number: '111222333',
              iban: 'SA1112223331234567890'
            }
          },
          expense_date: new Date('2024-02-01'),
          approved_at: new Date('2024-01-13'),
          approved_by: 'المدير المالي',
          vendor_name: 'شركة التقنية المتقدمة',
          vendor_details: {
            bank_name: 'بنك البلاد',
            account_number: '444555666',
            iban: 'SA4445556661234567890',
            tax_number: '987654321098765',
            contact_info: '+966112345679'
          },
          payment_method: 'bank_transfer',
          payment_status: 'processing',
          receipt_files: [
            {
              name: 'software_invoice.pdf',
              url: '/receipts/software_invoice.pdf',
              size: 180000,
              type: 'application/pdf'
            }
          ],
          supporting_documents: [],
          priority: 'normal',
          due_date: new Date('2024-01-25')
        }
      ];

      setApprovedExpenses(mockExpenses);
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في تحميل النفقات المعتمدة",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadAccountingStats = async () => {
    try {
      const stats: AccountingStats = {
        pending_payments: 15,
        pending_amount: 42500,
        processed_today: 8,
        processed_amount_today: 12300,
        failed_payments: 2,
        monthly_total: 125000,
        avg_processing_time: 1.5
      };
      setAccountingStats(stats);
    } catch (error) {
      console.error('Failed to load accounting stats:', error);
    }
  };

  const loadPaymentBatches = async () => {
    try {
      const batches: PaymentBatch[] = [
        {
          id: '1',
          batch_number: 'BATCH-2024-001',
          expense_ids: ['1', '3'],
          total_amount: 8000,
          currency: 'SAR',
          payment_method: 'bank_transfer',
          status: 'processing',
          created_at: new Date('2024-01-14'),
          processed_by: 'محمد الأحمد'
        }
      ];
      setPaymentBatches(batches);
    } catch (error) {
      console.error('Failed to load payment batches:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...approvedExpenses];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(expense => 
        expense.title.toLowerCase().includes(searchLower) ||
        expense.request_number.toLowerCase().includes(searchLower) ||
        expense.user.name.toLowerCase().includes(searchLower) ||
        expense.vendor_name?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(expense => expense.payment_status === filters.status);
    }

    if (filters.payment_method && filters.payment_method !== 'all') {
      filtered = filtered.filter(expense => expense.payment_method === filters.payment_method);
    }

    if (filters.department && filters.department !== 'all') {
      filtered = filtered.filter(expense => expense.user.department === filters.department);
    }

    // Sort by priority and approval date
    filtered.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      return a.approved_at.getTime() - b.approved_at.getTime();
    });

    setFilteredExpenses(filtered);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      payment_method: '',
      date_range: '',
      amount_range: '',
      department: ''
    });
  };

  const handleViewDetails = (expense: ApprovedExpense) => {
    setSelectedExpense(expense);
    setIsDetailDialogOpen(true);
  };

  const handleProcessPayment = (expense: ApprovedExpense) => {
    setSelectedExpense(expense);
    setPaymentForm({
      payment_method: expense.payment_method,
      payment_date: new Date(),
      reference_number: '',
      notes: '',
      amount: expense.amount
    });
    setIsPaymentDialogOpen(true);
  };

  const submitPayment = async () => {
    if (!selectedExpense) return;

    setIsProcessing(true);
    try {
      const expenseService = new ExpenseManagementService();
      
      await expenseService.processExpensePayment(selectedExpense.id, {
        payment_method: paymentForm.payment_method,
        payment_date: paymentForm.payment_date,
        reference_number: paymentForm.reference_number,
        notes: paymentForm.notes,
        amount: paymentForm.amount
      });

      // Update the expense status
      setApprovedExpenses(prev => 
        prev.map(expense => 
          expense.id === selectedExpense.id
            ? {
                ...expense,
                payment_status: 'paid' as const,
                payment_date: paymentForm.payment_date,
                payment_reference: paymentForm.reference_number,
                payment_notes: paymentForm.notes
              }
            : expense
        )
      );

      // Update stats
      setAccountingStats(prev => ({
        ...prev,
        pending_payments: prev.pending_payments - 1,
        pending_amount: prev.pending_amount - selectedExpense.amount,
        processed_today: prev.processed_today + 1,
        processed_amount_today: prev.processed_amount_today + selectedExpense.amount
      }));

      toast({
        title: "تم بنجاح",
        description: "تم معالجة الدفعة وتحديث حالة النفقة",
      });

      setIsPaymentDialogOpen(false);
      setSelectedExpense(null);
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في معالجة الدفعة",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBatchPayment = () => {
    if (selectedExpenses.length === 0) {
      toast({
        title: "تنبيه",
        description: "يرجى اختيار طلبات للمعالجة كدفعة واحدة",
        variant: "destructive",
      });
      return;
    }
    setIsBatchDialogOpen(true);
  };

  const processBatchPayment = async () => {
    setIsProcessing(true);
    try {
      const selectedExpenseData = approvedExpenses.filter(expense => 
        selectedExpenses.includes(expense.id)
      );
      
      const totalAmount = selectedExpenseData.reduce((sum, expense) => sum + expense.amount, 0);

      const newBatch: PaymentBatch = {
        id: Date.now().toString(),
        batch_number: `BATCH-${format(new Date(), 'yyyy-MM-dd')}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        expense_ids: selectedExpenses,
        total_amount: totalAmount,
        currency: 'SAR',
        payment_method: 'bank_transfer',
        status: 'processing',
        created_at: new Date(),
        processed_by: 'محاسب النظام' // In real app, get from auth context
      };

      setPaymentBatches(prev => [newBatch, ...prev]);

      // Update selected expenses status
      setApprovedExpenses(prev => 
        prev.map(expense => 
          selectedExpenses.includes(expense.id)
            ? { ...expense, payment_status: 'processing' as const }
            : expense
        )
      );

      setSelectedExpenses([]);
      setIsBatchDialogOpen(false);

      toast({
        title: "تم إنشاء الدفعة",
        description: `تم إنشاء دفعة جديدة برقم: ${newBatch.batch_number}`,
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في إنشاء الدفعة",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleExpenseSelection = (expenseId: string) => {
    setSelectedExpenses(prev => 
      prev.includes(expenseId)
        ? prev.filter(id => id !== expenseId)
        : [...prev, expenseId]
    );
  };

  const formatCurrency = (amount: number, currency: string) => {
    return `${amount.toLocaleString('ar-SA')} ${currency}`;
  };

  const getStatusBadge = (status: keyof typeof PAYMENT_STATUS_CONFIG) => {
    const config = PAYMENT_STATUS_CONFIG[status];
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getPaymentMethodBadge = (method: keyof typeof PAYMENT_METHOD_CONFIG) => {
    const config = PAYMENT_METHOD_CONFIG[method];
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={`${config.color} gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const renderStatsCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{accountingStats.pending_payments}</p>
              <p className="text-sm text-gray-600">في الانتظار</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{accountingStats.pending_amount.toLocaleString('ar-SA')}</p>
              <p className="text-sm text-gray-600">المبلغ المعلق (ريال)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{accountingStats.processed_today}</p>
              <p className="text-sm text-gray-600">معالج اليوم</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{accountingStats.processed_amount_today.toLocaleString('ar-SA')}</p>
              <p className="text-sm text-gray-600">مبلغ اليوم (ريال)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <X className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{accountingStats.failed_payments}</p>
              <p className="text-sm text-gray-600">فشل في الدفع</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{accountingStats.monthly_total.toLocaleString('ar-SA')}</p>
              <p className="text-sm text-gray-600">إجمالي الشهر</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Clock className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{accountingStats.avg_processing_time}</p>
              <p className="text-sm text-gray-600">متوسط المعالجة (يوم)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderExpenseCard = (expense: ApprovedExpense) => (
    <Card key={expense.id} className={`transition-all hover:shadow-md ${
      selectedExpenses.includes(expense.id) ? 'ring-2 ring-blue-500 bg-blue-50/30' : ''
    } ${
      expense.priority === 'urgent' ? 'border-red-200' :
      expense.priority === 'high' ? 'border-orange-200' : ''
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={selectedExpenses.includes(expense.id)}
              onChange={() => toggleExpenseSelection(expense.id)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <Avatar className="h-10 w-10">
              <AvatarImage src={expense.user.avatar} />
              <AvatarFallback>
                {expense.user.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{expense.user.name}</h3>
              <p className="text-sm text-gray-500">{expense.user.department}</p>
              <p className="text-xs text-gray-400">{expense.user.position}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(expense.payment_status)}
            {expense.priority === 'urgent' && (
              <Badge className="bg-red-100 text-red-700">عاجل</Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-sm text-blue-600">{expense.request_number}</span>
            <span className="text-sm text-gray-500">
              {format(expense.approved_at, "dd/MM/yyyy", { locale: ar })}
            </span>
          </div>
          <h4 className="font-semibold text-lg">{expense.title}</h4>
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{expense.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: expense.category.color }}
              />
              <span className="text-sm font-medium">{expense.category.name_ar}</span>
            </div>
            <div className="text-2xl font-bold font-mono">
              {formatCurrency(expense.amount, expense.currency)}
            </div>
            {getPaymentMethodBadge(expense.payment_method)}
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            {expense.vendor_name && (
              <div className="flex items-center gap-1">
                <Building className="h-3 w-3" />
                <span className="truncate">{expense.vendor_name}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" />
              <span>{format(expense.expense_date, "dd/MM/yyyy", { locale: ar })}</span>
            </div>
            {expense.due_date && expense.payment_status === 'pending' && (
              <div className={`flex items-center gap-1 ${
                expense.due_date < new Date() ? 'text-red-600' : ''
              }`}>
                <AlertCircle className="h-3 w-3" />
                <span>
                  الاستحقاق: {format(expense.due_date, "dd/MM/yyyy", { locale: ar })}
                </span>
              </div>
            )}
            {expense.payment_date && (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-3 w-3" />
                <span>
                  دُفع في: {format(expense.payment_date, "dd/MM/yyyy", { locale: ar })}
                </span>
              </div>
            )}
          </div>
        </div>

        {expense.approval_comments && (
          <Alert className="border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700 text-sm">
              <strong>تعليقات الموافقة:</strong> {expense.approval_comments}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between text-sm text-gray-500 pt-2 border-t">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Receipt className="h-4 w-4" />
              <span>{expense.receipt_files.length} فاتورة</span>
            </div>
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span>{expense.supporting_documents.length} مرفق</span>
            </div>
            {expense.payment_reference && (
              <div className="flex items-center gap-1">
                <span>مرجع: {expense.payment_reference}</span>
              </div>
            )}
          </div>
          <div className="text-xs">
            منذ {Math.ceil((new Date().getTime() - expense.approved_at.getTime()) / (1000 * 60 * 60 * 24))} أيام
          </div>
        </div>
      </CardContent>

      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewDetails(expense)}
          >
            <Eye className="h-4 w-4 mr-2" />
            التفاصيل
          </Button>
          
          <div className="flex gap-2">
            {expense.payment_status === 'pending' && (
              <Button
                size="sm"
                onClick={() => handleProcessPayment(expense)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Send className="h-4 w-4 mr-2" />
                معالجة الدفع
              </Button>
            )}
            {expense.payment_status === 'paid' && (
              <Button variant="outline" size="sm">
                <Printer className="h-4 w-4 mr-2" />
                طباعة إيصال
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderPaymentDialog = () => (
    <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-green-600" />
            معالجة الدفعة
          </DialogTitle>
          <DialogDescription>
            {selectedExpense && (
              <>
                طلب رقم: {selectedExpense.request_number}
                <br />
                المبلغ: {formatCurrency(selectedExpense.amount, selectedExpense.currency)}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="payment_method">طريقة الدفع</Label>
            <Select 
              value={paymentForm.payment_method} 
              onValueChange={(value: any) => setPaymentForm(prev => ({ ...prev, payment_method: value }))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                <SelectItem value="cash">نقداً</SelectItem>
                <SelectItem value="check">شيك</SelectItem>
                <SelectItem value="company_card">بطاقة الشركة</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="payment_date">تاريخ الدفع</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal mt-1"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(paymentForm.payment_date, "PPP", { locale: ar })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={paymentForm.payment_date}
                  onSelect={(date) => date && setPaymentForm(prev => ({ ...prev, payment_date: date }))}
                  initialFocus
                  locale={ar}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="reference_number">رقم المرجع</Label>
            <Input
              id="reference_number"
              placeholder="رقم الشيك أو مرجع التحويل..."
              value={paymentForm.reference_number}
              onChange={(e) => setPaymentForm(prev => ({ ...prev, reference_number: e.target.value }))}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="amount">المبلغ المدفوع</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="notes">ملاحظات</Label>
            <Textarea
              id="notes"
              placeholder="أي ملاحظات حول عملية الدفع..."
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="mt-1 resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
            إلغاء
          </Button>
          <Button
            onClick={submitPayment}
            disabled={!paymentForm.reference_number.trim() || isProcessing}
            className="bg-green-600 hover:bg-green-700"
          >
            {isProcessing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            {isProcessing ? 'جاري المعالجة...' : 'تأكيد الدفع'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const renderBatchDialog = () => (
    <Dialog open={isBatchDialogOpen} onOpenChange={setIsBatchDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-blue-600" />
            معالجة دفعة جماعية
          </DialogTitle>
          <DialogDescription>
            سيتم معالجة {selectedExpenses.length} طلب كدفعة واحدة
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              سيتم إنشاء دفعة جماعية للطلبات المحددة وتحويلها إلى حالة "قيد المعالجة"
            </AlertDescription>
          </Alert>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">تفاصيل الدفعة:</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>عدد الطلبات:</span>
                <span className="font-semibold">{selectedExpenses.length}</span>
              </div>
              <div className="flex justify-between">
                <span>إجمالي المبلغ:</span>
                <span className="font-semibold">
                  {formatCurrency(
                    approvedExpenses
                      .filter(exp => selectedExpenses.includes(exp.id))
                      .reduce((sum, exp) => sum + exp.amount, 0),
                    'SAR'
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span>طريقة الدفع:</span>
                <span className="font-semibold">تحويل بنكي</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsBatchDialogOpen(false)}>
            إلغاء
          </Button>
          <Button
            onClick={processBatchPayment}
            disabled={isProcessing}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isProcessing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            {isProcessing ? 'جاري الإنشاء...' : 'إنشاء الدفعة'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const renderDetailDialog = () => {
    if (!selectedExpense) return null;

    return (
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              تفاصيل النفقة المعتمدة
            </DialogTitle>
            <DialogDescription>
              رقم الطلب: {selectedExpense.request_number}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[70vh] pr-4">
            <Tabs defaultValue="details" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="details">التفاصيل</TabsTrigger>
                <TabsTrigger value="payment">معلومات الدفع</TabsTrigger>
                <TabsTrigger value="attachments">المرفقات</TabsTrigger>
                <TabsTrigger value="history">السجل</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">معلومات الطلب</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium text-gray-500">العنوان</Label>
                        <p className="font-medium">{selectedExpense.title}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">الوصف</Label>
                        <p className="text-sm text-gray-700">{selectedExpense.description}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-500">المبلغ</Label>
                          <p className="font-mono font-bold text-lg">
                            {formatCurrency(selectedExpense.amount, selectedExpense.currency)}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-500">الفئة</Label>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: selectedExpense.category.color }}
                            />
                            <span>{selectedExpense.category.name_ar}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">حالة الدفع</Label>
                        <div className="mt-1">
                          {getStatusBadge(selectedExpense.payment_status)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">معلومات الموظف</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={selectedExpense.user.avatar} />
                          <AvatarFallback>
                            {selectedExpense.user.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{selectedExpense.user.name}</p>
                          <p className="text-sm text-gray-500">{selectedExpense.user.position}</p>
                          <p className="text-sm text-gray-500">{selectedExpense.user.department}</p>
                          <p className="text-xs text-gray-400">{selectedExpense.user.email}</p>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      {selectedExpense.user.bank_account && (
                        <div>
                          <Label className="text-sm font-medium text-gray-500">الحساب البنكي</Label>
                          <div className="space-y-1 text-sm">
                            <p>البنك: {selectedExpense.user.bank_account.bank_name}</p>
                            <p>رقم الحساب: {selectedExpense.user.bank_account.account_number}</p>
                            <p>الآيبان: {selectedExpense.user.bank_account.iban}</p>
                          </div>
                        </div>
                      )}
                      
                      <div>
                        <Label className="text-sm font-medium text-gray-500">تاريخ النفقة</Label>
                        <p>{format(selectedExpense.expense_date, "PPP", { locale: ar })}</p>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium text-gray-500">تاريخ الموافقة</Label>
                        <p>{format(selectedExpense.approved_at, "PPP 'في' pp", { locale: ar })}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="payment" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      معلومات الدفع
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-500">طريقة الدفع</Label>
                        <div className="mt-1">
                          {getPaymentMethodBadge(selectedExpense.payment_method)}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">حالة الدفع</Label>
                        <div className="mt-1">
                          {getStatusBadge(selectedExpense.payment_status)}
                        </div>
                      </div>
                    </div>
                    
                    {selectedExpense.payment_date && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">تاريخ الدفع</Label>
                        <p>{format(selectedExpense.payment_date, "PPP", { locale: ar })}</p>
                      </div>
                    )}
                    
                    {selectedExpense.payment_reference && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">رقم المرجع</Label>
                        <p className="font-mono">{selectedExpense.payment_reference}</p>
                      </div>
                    )}
                    
                    {selectedExpense.payment_notes && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">ملاحظات الدفع</Label>
                        <p className="text-sm text-gray-700">{selectedExpense.payment_notes}</p>
                      </div>
                    )}

                    {selectedExpense.vendor_details && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-semibold mb-3">معلومات المورد</h4>
                          <div className="space-y-2 text-sm">
                            {selectedExpense.vendor_details.bank_name && (
                              <div className="flex justify-between">
                                <span>البنك:</span>
                                <span>{selectedExpense.vendor_details.bank_name}</span>
                              </div>
                            )}
                            {selectedExpense.vendor_details.account_number && (
                              <div className="flex justify-between">
                                <span>رقم الحساب:</span>
                                <span className="font-mono">{selectedExpense.vendor_details.account_number}</span>
                              </div>
                            )}
                            {selectedExpense.vendor_details.iban && (
                              <div className="flex justify-between">
                                <span>الآيبان:</span>
                                <span className="font-mono">{selectedExpense.vendor_details.iban}</span>
                              </div>
                            )}
                            {selectedExpense.vendor_details.tax_number && (
                              <div className="flex justify-between">
                                <span>الرقم الضريبي:</span>
                                <span className="font-mono">{selectedExpense.vendor_details.tax_number}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="attachments" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Receipt className="h-5 w-5" />
                      الفواتير ({selectedExpense.receipt_files.length})
                    </h3>
                    
                    {selectedExpense.receipt_files.length > 0 ? (
                      <div className="space-y-3">
                        {selectedExpense.receipt_files.map((file, index) => (
                          <Card key={index}>
                            <CardContent className="p-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                  <Receipt className="h-5 w-5 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{file.name}</p>
                                  <p className="text-xs text-gray-500">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                  </p>
                                </div>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>لا توجد فواتير مرفقة</AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      المستندات الداعمة ({selectedExpense.supporting_documents.length})
                    </h3>
                    
                    {selectedExpense.supporting_documents.length > 0 ? (
                      <div className="space-y-3">
                        {selectedExpense.supporting_documents.map((file, index) => (
                          <Card key={index}>
                            <CardContent className="p-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                  <FileText className="h-5 w-5 text-green-600" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{file.name}</p>
                                  <p className="text-xs text-gray-500">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                  </p>
                                </div>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>لا توجد مستندات داعمة</AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="history" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5" />
                      سجل العمليات
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 pb-4 border-b">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">تم اعتماد الطلب</p>
                          <p className="text-sm text-gray-600">
                            بواسطة: {selectedExpense.approved_by}
                          </p>
                          <p className="text-xs text-gray-400">
                            {format(selectedExpense.approved_at, "PPP 'في' pp", { locale: ar })}
                          </p>
                          {selectedExpense.approval_comments && (
                            <p className="text-sm text-gray-700 mt-1 italic">
                              "{selectedExpense.approval_comments}"
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {selectedExpense.payment_status === 'paid' && selectedExpense.payment_date && (
                        <div className="flex items-start gap-3 pb-4">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <DollarSign className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">تم صرف المبلغ</p>
                            <p className="text-sm text-gray-600">
                              المبلغ: {formatCurrency(selectedExpense.amount, selectedExpense.currency)}
                            </p>
                            <p className="text-xs text-gray-400">
                              {format(selectedExpense.payment_date, "PPP 'في' pp", { locale: ar })}
                            </p>
                            {selectedExpense.payment_reference && (
                              <p className="text-sm text-gray-700 mt-1">
                                رقم المرجع: {selectedExpense.payment_reference}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </ScrollArea>

          <DialogFooter className="border-t pt-4">
            <div className="flex items-center justify-between w-full">
              <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
                إغلاق
              </Button>
              
              <div className="flex gap-2">
                {selectedExpense.payment_status === 'pending' && (
                  <Button
                    onClick={() => {
                      setIsDetailDialogOpen(false);
                      handleProcessPayment(selectedExpense);
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    معالجة الدفع
                  </Button>
                )}
                {selectedExpense.payment_status === 'paid' && (
                  <Button variant="outline">
                    <Printer className="h-4 w-4 mr-2" />
                    طباعة إيصال
                  </Button>
                )}
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">قسم الحسابات - معالجة المدفوعات</h1>
          <p className="text-gray-600 mt-1">إدارة ومعالجة مدفوعات النفقات المعتمدة</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              loadApprovedExpenses();
              loadAccountingStats();
              loadPaymentBatches();
            }}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
          
          {selectedExpenses.length > 0 && (
            <Button onClick={handleBatchPayment} className="bg-blue-600 hover:bg-blue-700">
              <Wallet className="h-4 w-4 mr-2" />
              دفعة جماعية ({selectedExpenses.length})
            </Button>
          )}

          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            تصدير التقرير
          </Button>
        </div>
      </div>

      {renderStatsCards()}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            التصفية والبحث
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div>
              <Label htmlFor="search" className="text-sm font-medium">البحث</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="البحث في النفقات..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">حالة الدفع</Label>
              <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="جميع الحالات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="pending">في الانتظار</SelectItem>
                  <SelectItem value="processing">قيد المعالجة</SelectItem>
                  <SelectItem value="paid">مدفوع</SelectItem>
                  <SelectItem value="failed">فشل</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">طريقة الدفع</Label>
              <Select value={filters.payment_method} onValueChange={(value) => handleFilterChange('payment_method', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="جميع الطرق" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الطرق</SelectItem>
                  <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                  <SelectItem value="cash">نقداً</SelectItem>
                  <SelectItem value="check">شيك</SelectItem>
                  <SelectItem value="company_card">بطاقة الشركة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">القسم</Label>
              <Select value={filters.department} onValueChange={(value) => handleFilterChange('department', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="جميع الأقسام" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأقسام</SelectItem>
                  <SelectItem value="تقنية المعلومات">تقنية المعلومات</SelectItem>
                  <SelectItem value="الموارد البشرية">الموارد البشرية</SelectItem>
                  <SelectItem value="التسويق والمبيعات">التسويق والمبيعات</SelectItem>
                  <SelectItem value="المالية">المالية</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">نطاق المبلغ</Label>
              <Select value={filters.amount_range} onValueChange={(value) => handleFilterChange('amount_range', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="جميع المبالغ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المبالغ</SelectItem>
                  <SelectItem value="under_1000">أقل من 1,000</SelectItem>
                  <SelectItem value="1000_5000">1,000 - 5,000</SelectItem>
                  <SelectItem value="over_5000">أكثر من 5,000</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={clearFilters}
                className="w-full"
              >
                مسح التصفية
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">
            النفقات المعتمدة ({filteredExpenses.length})
          </h2>
          {selectedExpenses.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                تم اختيار {selectedExpenses.length} طلب
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedExpenses([])}
              >
                إلغاء التحديد
              </Button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <span className="mr-2 text-gray-600">جاري التحميل...</span>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">لا توجد نفقات معتمدة للمعالجة</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredExpenses.map(renderExpenseCard)}
          </div>
        )}
      </div>

      {renderDetailDialog()}
      {renderPaymentDialog()}
      {renderBatchDialog()}
    </div>
  );
}