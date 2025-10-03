import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import {
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Receipt,
  Calendar,
  DollarSign,
  User,
  Building,
  Tag,
  MoreHorizontal,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Copy,
  Archive,
  Send
} from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { ExpenseManagementService } from '@/lib/services/expense-management-service';
import { SiteSettings } from '@/lib/site-settings';

interface ExpenseRequest {
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
  status: 'draft' | 'submitted' | 'under_review' | 'manager_approved' | 'admin_approved' | 'accounting_approved' | 'approved' | 'rejected' | 'cancelled' | 'paid';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    department: string;
  };
  expense_date: Date;
  created_at: Date;
  submitted_at?: Date;
  approved_at?: Date;
  rejected_at?: Date;
  paid_at?: Date;
  vendor_name?: string;
  location?: string;
  receipt_files: Array<{
    name: string;
    url: string;
    size: number;
  }>;
  approval_workflow?: {
    current_level: number;
    required_levels: number;
    approvers: Array<{
      level: number;
      approver_name: string;
      status: 'pending' | 'approved' | 'rejected';
      decision_date?: Date;
      comments?: string;
    }>;
  };
}

interface FilterState {
  status: string;
  category: string;
  priority: string;
  date_range: string;
  amount_range: string;
  department: string;
  search: string;
}

const STATUS_CONFIG = {
  draft: { label: 'مسودة', color: 'bg-gray-100 text-gray-800', icon: FileText },
  submitted: { label: 'مُقدم', color: 'bg-blue-100 text-blue-800', icon: Send },
  under_review: { label: 'قيد المراجعة', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  manager_approved: { label: 'موافقة المدير', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  admin_approved: { label: 'موافقة الإدارة', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  accounting_approved: { label: 'موافقة المحاسبة', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  approved: { label: 'معتمد', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  rejected: { label: 'مرفوض', color: 'bg-red-100 text-red-800', icon: XCircle },
  cancelled: { label: 'ملغي', color: 'bg-gray-100 text-gray-800', icon: XCircle },
  paid: { label: 'مدفوع', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 }
};

const PRIORITY_CONFIG = {
  low: { label: 'منخفضة', color: 'bg-gray-100 text-gray-600' },
  normal: { label: 'عادية', color: 'bg-blue-100 text-blue-600' },
  high: { label: 'عالية', color: 'bg-orange-100 text-orange-600' },
  urgent: { label: 'عاجلة', color: 'bg-red-100 text-red-600' }
};

export default function ExpenseRequestsPage() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<ExpenseRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<ExpenseRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ExpenseRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: keyof ExpenseRequest; direction: 'asc' | 'desc' }>({
    key: 'created_at',
    direction: 'desc'
  });

  const [filters, setFilters] = useState<FilterState>({
    status: '',
    category: '',
    priority: '',
    date_range: '',
    amount_range: '',
    department: '',
    search: ''
  });

  useEffect(() => {
    loadExpenseRequests();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [requests, filters, sortConfig]);

  const loadExpenseRequests = async () => {
    setIsLoading(true);
    try {
      // في التطبيق الحقيقي، سيتم جلب البيانات من قاعدة البيانات
      const mockRequests: ExpenseRequest[] = [
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
          status: 'submitted',
          priority: 'high',
          user: {
            id: 'user1',
            name: 'أحمد محمد',
            email: 'ahmed@company.com',
            avatar: '/avatars/ahmed.jpg',
            department: 'تقنية المعلومات'
          },
          expense_date: new Date('2024-01-15'),
          created_at: new Date('2024-01-10'),
          submitted_at: new Date('2024-01-10'),
          vendor_name: 'الخطوط الجوية السعودية',
          location: 'الرياض - دبي',
          receipt_files: [
            {
              name: 'ticket_receipt.pdf',
              url: '/receipts/ticket_receipt.pdf',
              size: 256000
            }
          ],
          approval_workflow: {
            current_level: 1,
            required_levels: 2,
            approvers: [
              {
                level: 1,
                approver_name: 'مدير تقنية المعلومات',
                status: 'pending'
              },
              {
                level: 2,
                approver_name: 'المدير المالي',
                status: 'pending'
              }
            ]
          }
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
          status: 'approved',
          priority: 'normal',
          user: {
            id: 'user2',
            name: 'فاطمة علي',
            email: 'fatima@company.com',
            avatar: '/avatars/fatima.jpg',
            department: 'الموارد البشرية'
          },
          expense_date: new Date('2024-01-12'),
          created_at: new Date('2024-01-08'),
          submitted_at: new Date('2024-01-08'),
          approved_at: new Date('2024-01-09'),
          vendor_name: 'مكتبة جرير',
          location: 'الرياض',
          receipt_files: [
            {
              name: 'office_supplies.jpg',
              url: '/receipts/office_supplies.jpg',
              size: 128000
            }
          ]
        },
        {
          id: '3',
          request_number: 'EXP-2024-003',
          title: 'عشاء عمل مع العملاء',
          description: 'عشاء عمل مع عملاء مهمين لمناقشة المشروع الجديد',
          amount: 1200,
          currency: 'SAR',
          category: {
            id: '4',
            name: 'entertainment',
            name_ar: 'ضيافة وترفيه',
            icon: 'Gift',
            color: '#8b5cf6'
          },
          status: 'rejected',
          priority: 'normal',
          user: {
            id: 'user3',
            name: 'محمد خالد',
            email: 'mohammed@company.com',
            avatar: '/avatars/mohammed.jpg',
            department: 'التسويق'
          },
          expense_date: new Date('2024-01-14'),
          created_at: new Date('2024-01-11'),
          submitted_at: new Date('2024-01-11'),
          rejected_at: new Date('2024-01-12'),
          vendor_name: 'مطعم النخيل',
          location: 'الرياض',
          receipt_files: [
            {
              name: 'dinner_receipt.jpg',
              url: '/receipts/dinner_receipt.jpg',
              size: 89000
            }
          ],
          approval_workflow: {
            current_level: 1,
            required_levels: 2,
            approvers: [
              {
                level: 1,
                approver_name: 'مدير التسويق',
                status: 'rejected',
                decision_date: new Date('2024-01-12'),
                comments: 'المبلغ مرتفع جداً للضيافة العادية'
              }
            ]
          }
        }
      ];

      setRequests(mockRequests);
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في تحميل طلبات النفقات",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...requests];

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(req => 
        req.title.toLowerCase().includes(searchLower) ||
        req.description.toLowerCase().includes(searchLower) ||
        req.request_number.toLowerCase().includes(searchLower) ||
        req.user.name.toLowerCase().includes(searchLower) ||
        req.vendor_name?.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(req => req.status === filters.status);
    }

    // Apply category filter
    if (filters.category && filters.category !== 'all') {
      filtered = filtered.filter(req => req.category.id === filters.category);
    }

    // Apply priority filter
    if (filters.priority && filters.priority !== 'all') {
      filtered = filtered.filter(req => req.priority === filters.priority);
    }

    // Apply department filter
    if (filters.department && filters.department !== 'all') {
      filtered = filtered.filter(req => req.user.department === filters.department);
    }

    // Apply amount range filter
    if (filters.amount_range && filters.amount_range !== 'all') {
      switch (filters.amount_range) {
        case 'under_500':
          filtered = filtered.filter(req => req.amount < 500);
          break;
        case '500_2000':
          filtered = filtered.filter(req => req.amount >= 500 && req.amount <= 2000);
          break;
        case '2000_5000':
          filtered = filtered.filter(req => req.amount > 2000 && req.amount <= 5000);
          break;
        case 'over_5000':
          filtered = filtered.filter(req => req.amount > 5000);
          break;
      }
    }

    // Apply date range filter
    if (filters.date_range && filters.date_range !== 'all') {
      const now = new Date();
      const startOfToday = new Date(now.setHours(0, 0, 0, 0));
      
      switch (filters.date_range) {
        case 'today':
          filtered = filtered.filter(req => 
            req.created_at >= startOfToday
          );
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter(req => 
            req.created_at >= weekAgo
          );
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter(req => 
            req.created_at >= monthAgo
          );
          break;
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      
      if (sortConfig.direction === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    setFilteredRequests(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleSort = (key: keyof ExpenseRequest) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      category: '',
      priority: '',
      date_range: '',
      amount_range: '',
      department: '',
      search: ''
    });
  };

  const handleViewDetails = (request: ExpenseRequest) => {
    setSelectedRequest(request);
    setIsDetailDialogOpen(true);
  };

  const handleDuplicateRequest = async (request: ExpenseRequest) => {
    try {
      // في التطبيق الحقيقي، سيتم إنشاء طلب جديد مشابه
      toast({
        title: "تم النسخ",
        description: "تم إنشاء مسودة جديدة مشابهة للطلب",
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في نسخ الطلب",
        variant: "destructive",
      });
    }
  };

  const handleArchiveRequest = async (requestId: string) => {
    try {
      const expenseService = new ExpenseManagementService();
      await expenseService.deleteExpenseRequest(requestId, 'archive');
      
      setRequests(prev => prev.filter(req => req.id !== requestId));
      toast({
        title: "تم الأرشفة",
        description: "تم أرشفة الطلب بنجاح",
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في أرشفة الطلب",
        variant: "destructive",
      });
    }
  };

  const StatusBadge = ({ status }: { status: keyof typeof STATUS_CONFIG }) => {
    const config = STATUS_CONFIG[status];
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const PriorityBadge = ({ priority }: { priority: keyof typeof PRIORITY_CONFIG }) => {
    const config = PRIORITY_CONFIG[priority];
    
    return (
      <Badge variant="outline" className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const formatCurrency = (amount: number, currency: string) => {
    return `${amount.toLocaleString('ar-SA')} ${currency}`;
  };

  // Pagination
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRequests = filteredRequests.slice(startIndex, startIndex + itemsPerPage);

  const renderRequestRow = (request: ExpenseRequest) => (
    <tr key={request.id} className="hover:bg-gray-50 border-b">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={request.user.avatar} />
            <AvatarFallback>
              {request.user.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium text-gray-900">{request.user.name}</div>
            <div className="text-sm text-gray-500">{request.user.department}</div>
          </div>
        </div>
      </td>
      
      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-blue-600">{request.request_number}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigator.clipboard.writeText(request.request_number)}
            className="h-6 w-6 p-0"
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
        <div className="text-sm font-medium text-gray-900 mt-1">{request.title}</div>
        <div className="text-sm text-gray-500 truncate max-w-xs">{request.description}</div>
      </td>
      
      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: request.category.color }}
          />
          <span className="text-sm">{request.category.name_ar}</span>
        </div>
      </td>
      
      <td className="px-4 py-4 text-right">
        <div className="font-mono font-semibold text-gray-900">
          {formatCurrency(request.amount, request.currency)}
        </div>
      </td>
      
      <td className="px-4 py-4">
        <StatusBadge status={request.status} />
      </td>
      
      <td className="px-4 py-4">
        <PriorityBadge priority={request.priority} />
      </td>
      
      <td className="px-4 py-4 text-sm text-gray-600">
        <div>{format(request.expense_date, "dd/MM/yyyy", { locale: ar })}</div>
        <div className="text-xs text-gray-400">
          {format(request.created_at, "dd/MM/yyyy HH:mm", { locale: ar })}
        </div>
      </td>
      
      <td className="px-4 py-4">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewDetails(request)}
            className="h-8 w-8 p-0"
          >
            <Eye className="h-4 w-4" />
          </Button>
          
          {request.status === 'draft' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>خيارات الطلب</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => handleDuplicateRequest(request)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  نسخ الطلب
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => handleArchiveRequest(request.id)}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  أرشفة الطلب
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  حذف الطلب
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </td>
    </tr>
  );

  const renderDetailDialog = () => {
    if (!selectedRequest) return null;

    return (
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              تفاصيل طلب النفقة
            </DialogTitle>
            <DialogDescription>
              رقم الطلب: {selectedRequest.request_number}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[70vh] pr-4">
            <Tabs defaultValue="details" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">التفاصيل</TabsTrigger>
                <TabsTrigger value="approvals">الموافقات</TabsTrigger>
                <TabsTrigger value="attachments">المرفقات</TabsTrigger>
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
                        <p className="font-medium">{selectedRequest.title}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">الوصف</Label>
                        <p className="text-sm text-gray-700">{selectedRequest.description}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-500">المبلغ</Label>
                          <p className="font-mono font-bold text-lg">
                            {formatCurrency(selectedRequest.amount, selectedRequest.currency)}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-500">الفئة</Label>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: selectedRequest.category.color }}
                            />
                            <span>{selectedRequest.category.name_ar}</span>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-500">الحالة</Label>
                          <div className="mt-1">
                            <StatusBadge status={selectedRequest.status} />
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-500">الأولوية</Label>
                          <div className="mt-1">
                            <PriorityBadge priority={selectedRequest.priority} />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">معلومات إضافية</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium text-gray-500">المقدم</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={selectedRequest.user.avatar} />
                            <AvatarFallback className="text-xs">
                              {selectedRequest.user.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{selectedRequest.user.name}</p>
                            <p className="text-xs text-gray-500">{selectedRequest.user.department}</p>
                          </div>
                        </div>
                      </div>
                      
                      {selectedRequest.vendor_name && (
                        <div>
                          <Label className="text-sm font-medium text-gray-500">المورد</Label>
                          <p>{selectedRequest.vendor_name}</p>
                        </div>
                      )}
                      
                      {selectedRequest.location && (
                        <div>
                          <Label className="text-sm font-medium text-gray-500">الموقع</Label>
                          <p>{selectedRequest.location}</p>
                        </div>
                      )}
                      
                      <div>
                        <Label className="text-sm font-medium text-gray-500">تاريخ النفقة</Label>
                        <p>{format(selectedRequest.expense_date, "PPP", { locale: ar })}</p>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium text-gray-500">تاريخ الإنشاء</Label>
                        <p>{format(selectedRequest.created_at, "PPP 'في' pp", { locale: ar })}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="approvals" className="space-y-4">
                {selectedRequest.approval_workflow ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">سير عمل الموافقة</h3>
                      <Badge variant="outline">
                        المستوى {selectedRequest.approval_workflow.current_level} من {selectedRequest.approval_workflow.required_levels}
                      </Badge>
                    </div>
                    
                    <div className="space-y-3">
                      {selectedRequest.approval_workflow.approvers.map((approver, index) => (
                        <Card key={index} className="relative">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                                  approver.status === 'approved' ? 'bg-green-500' :
                                  approver.status === 'rejected' ? 'bg-red-500' :
                                  'bg-gray-300'
                                }`}>
                                  {index + 1}
                                </div>
                                <div>
                                  <p className="font-medium">{approver.approver_name}</p>
                                  <p className="text-sm text-gray-500">المستوى {approver.level}</p>
                                </div>
                              </div>
                              
                              <div className="text-right">
                                <StatusBadge 
                                  status={approver.status === 'approved' ? 'approved' : 
                                          approver.status === 'rejected' ? 'rejected' : 'under_review'} 
                                />
                                {approver.decision_date && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {format(approver.decision_date, "dd/MM/yyyy", { locale: ar })}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            {approver.comments && (
                              <div className="mt-3 p-3 bg-gray-50 rounded">
                                <Label className="text-sm font-medium text-gray-500">تعليقات:</Label>
                                <p className="text-sm mt-1">{approver.comments}</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      لا توجد معلومات موافقة متاحة لهذا الطلب
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>
              
              <TabsContent value="attachments" className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-4">المرفقات</h3>
                  
                  {selectedRequest.receipt_files.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedRequest.receipt_files.map((file, index) => (
                        <Card key={index}>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Receipt className="h-5 w-5 text-blue-600" />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-sm">{file.name}</p>
                                <p className="text-xs text-gray-500">
                                  {(file.size / 1024).toFixed(0)} KB
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
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
                      <AlertDescription>
                        لا توجد مرفقات لهذا الطلب
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">طلبات النفقات</h1>
          <p className="text-gray-600 mt-1">إدارة ومراجعة جميع طلبات النفقات</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={loadExpenseRequests}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
          
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            طلب جديد
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{requests.length}</p>
                <p className="text-sm text-gray-600">إجمالي الطلبات</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {requests.filter(r => ['submitted', 'under_review'].includes(r.status)).length}
                </p>
                <p className="text-sm text-gray-600">قيد المراجعة</p>
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
                <p className="text-2xl font-bold">
                  {requests.filter(r => ['approved', 'paid'].includes(r.status)).length}
                </p>
                <p className="text-sm text-gray-600">معتمدة</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {requests.reduce((sum, r) => sum + r.amount, 0).toLocaleString('ar-SA')}
                </p>
                <p className="text-sm text-gray-600">إجمالي المبلغ (ريال)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            التصفية والبحث
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
            <div>
              <Label htmlFor="search" className="text-sm font-medium">البحث</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="البحث في الطلبات..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">الحالة</Label>
              <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="جميع الحالات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="draft">مسودة</SelectItem>
                  <SelectItem value="submitted">مُقدم</SelectItem>
                  <SelectItem value="under_review">قيد المراجعة</SelectItem>
                  <SelectItem value="approved">معتمد</SelectItem>
                  <SelectItem value="rejected">مرفوض</SelectItem>
                  <SelectItem value="paid">مدفوع</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">الأولوية</Label>
              <Select value={filters.priority} onValueChange={(value) => handleFilterChange('priority', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="جميع الأولويات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأولويات</SelectItem>
                  <SelectItem value="low">منخفضة</SelectItem>
                  <SelectItem value="normal">عادية</SelectItem>
                  <SelectItem value="high">عالية</SelectItem>
                  <SelectItem value="urgent">عاجلة</SelectItem>
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
                  <SelectItem value="under_500">أقل من 500</SelectItem>
                  <SelectItem value="500_2000">500 - 2,000</SelectItem>
                  <SelectItem value="2000_5000">2,000 - 5,000</SelectItem>
                  <SelectItem value="over_5000">أكثر من 5,000</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">الفترة الزمنية</Label>
              <Select value={filters.date_range} onValueChange={(value) => handleFilterChange('date_range', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="جميع الفترات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الفترات</SelectItem>
                  <SelectItem value="today">اليوم</SelectItem>
                  <SelectItem value="week">الأسبوع الماضي</SelectItem>
                  <SelectItem value="month">الشهر الماضي</SelectItem>
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

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>الطلبات ({filteredRequests.length})</span>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              تصدير
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
              <span className="mr-2 text-gray-600">جاري التحميل...</span>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">لا توجد طلبات تطابق المعايير المحددة</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-medium"
                          onClick={() => handleSort('user' as any)}
                        >
                          المقدم
                          <ArrowUpDown className="h-3 w-3 mr-1" />
                        </Button>
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-medium"
                          onClick={() => handleSort('request_number')}
                        >
                          رقم الطلب / العنوان
                          <ArrowUpDown className="h-3 w-3 mr-1" />
                        </Button>
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الفئة</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-medium"
                          onClick={() => handleSort('amount')}
                        >
                          المبلغ
                          <ArrowUpDown className="h-3 w-3 mr-1" />
                        </Button>
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الحالة</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الأولوية</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-medium"
                          onClick={() => handleSort('expense_date')}
                        >
                          التاريخ
                          <ArrowUpDown className="h-3 w-3 mr-1" />
                        </Button>
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRequests.map(renderRequestRow)}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
                  <div className="text-sm text-gray-600">
                    عرض {startIndex + 1} إلى {Math.min(startIndex + itemsPerPage, filteredRequests.length)} من {filteredRequests.length} نتيجة
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                      السابق
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className="w-8 h-8 p-0"
                          >
                            {page}
                          </Button>
                        );
                      })}
                      {totalPages > 5 && <span className="px-2">...</span>}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      التالي
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {renderDetailDialog()}
    </div>
  );
}