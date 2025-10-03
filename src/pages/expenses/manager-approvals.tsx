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
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Eye,
  MessageSquare,
  User,
  Calendar,
  DollarSign,
  FileText,
  Receipt,
  Building,
  MapPin,
  Tag,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Filter,
  Search,
  Bell,
  ThumbsUp,
  ThumbsDown,
  Send,
  Paperclip,
  ExternalLink,
  History
} from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { ExpenseManagementService } from '@/lib/services/expense-management-service';
import { ExpensePrintingService } from '@/lib/services/expense-printing-service';
import { SiteSettings } from '@/lib/site-settings';

interface PendingApproval {
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
  priority: 'low' | 'normal' | 'high' | 'urgent';
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    department: string;
    position?: string;
  };
  expense_date: Date;
  created_at: Date;
  submitted_at: Date;
  vendor_name?: string;
  location?: string;
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
  approval_level: number;
  total_levels: number;
  previous_approvals?: Array<{
    level: number;
    approver_name: string;
    decision: 'approved' | 'rejected';
    decision_date: Date;
    comments?: string;
  }>;
  budget_info?: {
    available_budget: number;
    used_budget: number;
    budget_exceeded: boolean;
  };
  policy_compliance?: {
    requires_receipt: boolean;
    within_limits: boolean;
    violations: string[];
  };
}

interface ApprovalDecision {
  requestId: string;
  decision: 'approved' | 'rejected';
  comments: string;
  conditions?: string;
  delegate_to?: string;
}

interface DashboardStats {
  pending_count: number;
  approved_today: number;
  rejected_today: number;
  total_amount_pending: number;
  avg_processing_time: number;
  urgent_count: number;
}

const PRIORITY_CONFIG = {
  low: { label: 'منخفضة', color: 'bg-gray-100 text-gray-600', urgency: 1 },
  normal: { label: 'عادية', color: 'bg-blue-100 text-blue-600', urgency: 2 },
  high: { label: 'عالية', color: 'bg-orange-100 text-orange-600', urgency: 3 },
  urgent: { label: 'عاجلة', color: 'bg-red-100 text-red-600', urgency: 4 }
};

export default function ManagerApprovalsPage() {
  const { toast } = useToast();
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [filteredApprovals, setFilteredApprovals] = useState<PendingApproval[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<PendingApproval | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isProcessingDecision, setIsProcessingDecision] = useState(false);
  const [decisionDialog, setDecisionDialog] = useState<{
    open: boolean;
    type: 'approve' | 'reject' | null;
    request: PendingApproval | null;
  }>({
    open: false,
    type: null,
    request: null
  });
  const [decisionForm, setDecisionForm] = useState<{
    comments: string;
    conditions: string;
    delegate_to: string;
  }>({
    comments: '',
    conditions: '',
    delegate_to: ''
  });
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    pending_count: 0,
    approved_today: 0,
    rejected_today: 0,
    total_amount_pending: 0,
    avg_processing_time: 0,
    urgent_count: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    priority: '',
    department: '',
    amount_range: '',
    date_range: ''
  });

  useEffect(() => {
    loadPendingApprovals();
    loadDashboardStats();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [pendingApprovals, filters]);

  const loadPendingApprovals = async () => {
    setIsLoading(true);
    try {
      // في التطبيق الحقيقي، سيتم جلب البيانات من قاعدة البيانات
      const mockApprovals: PendingApproval[] = [
        {
          id: '1',
          request_number: 'EXP-2024-001',
          title: 'تذاكر سفر لمؤتمر دبي',
          description: 'تذاكر طيران ذهاب وعودة للمشاركة في مؤتمر التكنولوجيا الدولي في دبي',
          amount: 3500,
          currency: 'SAR',
          category: {
            id: '1',
            name: 'travel',
            name_ar: 'مصاريف السفر',
            icon: 'Plane',
            color: '#3b82f6'
          },
          priority: 'high',
          user: {
            id: 'user1',
            name: 'أحمد محمد علي',
            email: 'ahmed@company.com',
            avatar: '/avatars/ahmed.jpg',
            department: 'تقنية المعلومات',
            position: 'مطور أول'
          },
          expense_date: new Date('2024-02-15'),
          created_at: new Date('2024-01-10'),
          submitted_at: new Date('2024-01-10'),
          vendor_name: 'الخطوط الجوية السعودية',
          location: 'الرياض - دبي',
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
          approval_level: 1,
          total_levels: 2,
          budget_info: {
            available_budget: 15000,
            used_budget: 8500,
            budget_exceeded: false
          },
          policy_compliance: {
            requires_receipt: true,
            within_limits: true,
            violations: []
          }
        },
        {
          id: '2',
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
          priority: 'normal',
          user: {
            id: 'user4',
            name: 'سارة أحمد',
            email: 'sara@company.com',
            avatar: '/avatars/sara.jpg',
            department: 'تقنية المعلومات',
            position: 'مصممة واجهات'
          },
          expense_date: new Date('2024-02-01'),
          created_at: new Date('2024-01-12'),
          submitted_at: new Date('2024-01-12'),
          vendor_name: 'شركة التقنية المتقدمة',
          location: 'الرياض',
          receipt_files: [
            {
              name: 'software_invoice.pdf',
              url: '/receipts/software_invoice.pdf',
              size: 180000,
              type: 'application/pdf'
            }
          ],
          supporting_documents: [],
          approval_level: 1,
          total_levels: 3,
          budget_info: {
            available_budget: 20000,
            used_budget: 12000,
            budget_exceeded: false
          },
          policy_compliance: {
            requires_receipt: true,
            within_limits: true,
            violations: []
          }
        },
        {
          id: '3',
          request_number: 'EXP-2024-005',
          title: 'عشاء عمل مع العملاء الرئيسيين',
          description: 'اجتماع عشاء مع عملاء المشروع الجديد لمناقشة التفاصيل والمتطلبات',
          amount: 2800,
          currency: 'SAR',
          category: {
            id: '4',
            name: 'entertainment',
            name_ar: 'ضيافة وترفيه',
            icon: 'Gift',
            color: '#8b5cf6'
          },
          priority: 'urgent',
          user: {
            id: 'user5',
            name: 'محمد خالد',
            email: 'mohammed@company.com',
            avatar: '/avatars/mohammed.jpg',
            department: 'التسويق والمبيعات',
            position: 'مدير حسابات'
          },
          expense_date: new Date('2024-01-18'),
          created_at: new Date('2024-01-14'),
          submitted_at: new Date('2024-01-14'),
          vendor_name: 'فندق الفيصلية',
          location: 'الرياض',
          receipt_files: [
            {
              name: 'dinner_receipt.jpg',
              url: '/receipts/dinner_receipt.jpg',
              size: 89000,
              type: 'image/jpeg'
            }
          ],
          supporting_documents: [
            {
              name: 'client_meeting_agenda.docx',
              url: '/documents/meeting_agenda.docx',
              size: 45000,
              type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            }
          ],
          approval_level: 1,
          total_levels: 2,
          budget_info: {
            available_budget: 5000,
            used_budget: 3200,
            budget_exceeded: false
          },
          policy_compliance: {
            requires_receipt: true,
            within_limits: false,
            violations: ['يتجاوز حد الضيافة المسموح للفرد (2000 ريال)']
          }
        }
      ];

      setPendingApprovals(mockApprovals);
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في تحميل طلبات الموافقة",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadDashboardStats = async () => {
    try {
      // في التطبيق الحقيقي، سيتم جلب الإحصائيات من قاعدة البيانات
      const stats: DashboardStats = {
        pending_count: 12,
        approved_today: 8,
        rejected_today: 2,
        total_amount_pending: 24500,
        avg_processing_time: 2.5,
        urgent_count: 3
      };
      setDashboardStats(stats);
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...pendingApprovals];

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(req => 
        req.title.toLowerCase().includes(searchLower) ||
        req.description.toLowerCase().includes(searchLower) ||
        req.request_number.toLowerCase().includes(searchLower) ||
        req.user.name.toLowerCase().includes(searchLower)
      );
    }

    // Apply priority filter
    if (filters.priority && filters.priority !== 'all') {
      filtered = filtered.filter(req => req.priority === filters.priority);
    }

    // Apply department filter
    if (filters.department && filters.department !== 'all') {
      filtered = filtered.filter(req => req.user.department === filters.department);
    }

    // Sort by priority (urgent first) and then by submission date
    filtered.sort((a, b) => {
      const aPriority = PRIORITY_CONFIG[a.priority].urgency;
      const bPriority = PRIORITY_CONFIG[b.priority].urgency;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher urgency first
      }
      
      return a.submitted_at.getTime() - b.submitted_at.getTime(); // Older submissions first
    });

    setFilteredApprovals(filtered);
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
      priority: '',
      department: '',
      amount_range: '',
      date_range: ''
    });
  };

  const handleViewDetails = (request: PendingApproval) => {
    setSelectedRequest(request);
    setIsDetailDialogOpen(true);
  };

  const openDecisionDialog = (type: 'approve' | 'reject', request: PendingApproval) => {
    setDecisionDialog({
      open: true,
      type,
      request
    });
    setDecisionForm({
      comments: '',
      conditions: '',
      delegate_to: ''
    });
  };

  const closeDecisionDialog = () => {
    setDecisionDialog({
      open: false,
      type: null,
      request: null
    });
    setDecisionForm({
      comments: '',
      conditions: '',
      delegate_to: ''
    });
  };

  const handleDecisionSubmit = async () => {
    if (!decisionDialog.request || !decisionDialog.type) return;

    setIsProcessingDecision(true);
    try {
      const expenseService = new ExpenseManagementService();
      
      const decision: ApprovalDecision = {
        requestId: decisionDialog.request.id,
        decision: decisionDialog.type,
        comments: decisionForm.comments,
        conditions: decisionForm.conditions,
        delegate_to: decisionForm.delegate_to
      };

      if (decisionDialog.type === 'approved') {
        await expenseService.approveExpenseRequest(decision.requestId, {
          comments: decision.comments,
          conditions: decision.conditions
        });
      } else {
        await expenseService.rejectExpenseRequest(decision.requestId, {
          reason: decision.comments
        });
      }

      // Remove the request from pending list
      setPendingApprovals(prev => 
        prev.filter(req => req.id !== decisionDialog.request!.id)
      );

      // Update dashboard stats
      setDashboardStats(prev => ({
        ...prev,
        pending_count: prev.pending_count - 1,
        approved_today: decisionDialog.type === 'approved' ? prev.approved_today + 1 : prev.approved_today,
        rejected_today: decisionDialog.type === 'rejected' ? prev.rejected_today + 1 : prev.rejected_today,
        total_amount_pending: prev.total_amount_pending - decisionDialog.request!.amount
      }));

      toast({
        title: decisionDialog.type === 'approved' ? "تم القبول" : "تم الرفض",
        description: `تم ${decisionDialog.type === 'approved' ? 'قبول' : 'رفض'} طلب النفقة بنجاح`,
      });

      closeDecisionDialog();
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في معالجة القرار",
        variant: "destructive",
      });
    } finally {
      setIsProcessingDecision(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return `${amount.toLocaleString('ar-SA')} ${currency}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const PriorityBadge = ({ priority }: { priority: keyof typeof PRIORITY_CONFIG }) => {
    const config = PRIORITY_CONFIG[priority];
    return (
      <Badge variant="outline" className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getBudgetStatus = (budgetInfo: PendingApproval['budget_info']) => {
    if (!budgetInfo) return null;
    
    const usagePercent = ((budgetInfo.used_budget + 0) / budgetInfo.available_budget) * 100;
    
    return (
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>استخدام الميزانية</span>
          <span>{usagePercent.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${
              usagePercent < 70 ? 'bg-green-500' : 
              usagePercent < 90 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(usagePercent, 100)}%` }}
          />
        </div>
        <div className="text-xs text-gray-500">
          {formatCurrency(budgetInfo.used_budget, 'SAR')} من {formatCurrency(budgetInfo.available_budget, 'SAR')}
        </div>
      </div>
    );
  };

  const renderDashboardStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{dashboardStats.pending_count}</p>
              <p className="text-sm text-gray-600">في انتظار الموافقة</p>
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
              <p className="text-2xl font-bold">{dashboardStats.approved_today}</p>
              <p className="text-sm text-gray-600">موافق عليها اليوم</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{dashboardStats.rejected_today}</p>
              <p className="text-sm text-gray-600">مرفوضة اليوم</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{dashboardStats.urgent_count}</p>
              <p className="text-sm text-gray-600">عاجلة</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{dashboardStats.total_amount_pending.toLocaleString('ar-SA')}</p>
              <p className="text-sm text-gray-600">إجمالي المبلغ المعلق</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{dashboardStats.avg_processing_time}</p>
              <p className="text-sm text-gray-600">متوسط المعالجة (أيام)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderApprovalCard = (request: PendingApproval) => (
    <Card key={request.id} className={`transition-shadow hover:shadow-md ${
      request.priority === 'urgent' ? 'border-red-200 bg-red-50/20' : 
      request.priority === 'high' ? 'border-orange-200 bg-orange-50/20' : ''
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={request.user.avatar} />
              <AvatarFallback>
                {request.user.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{request.user.name}</h3>
              <p className="text-sm text-gray-500">{request.user.department}</p>
              <p className="text-xs text-gray-400">{request.user.position}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PriorityBadge priority={request.priority} />
            <Badge variant="outline" className="text-xs">
              المستوى {request.approval_level} من {request.total_levels}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-sm text-blue-600">{request.request_number}</span>
            <span className="text-sm text-gray-500">
              {format(request.submitted_at, "dd/MM/yyyy", { locale: ar })}
            </span>
          </div>
          <h4 className="font-semibold text-lg">{request.title}</h4>
          <p className="text-sm text-gray-600 mt-1">{request.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: request.category.color }}
              />
              <span className="text-sm font-medium">{request.category.name_ar}</span>
            </div>
            <div className="text-2xl font-bold font-mono">
              {formatCurrency(request.amount, request.currency)}
            </div>
          </div>
          <div className="space-y-2">
            {request.vendor_name && (
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Building className="h-3 w-3" />
                <span className="truncate">{request.vendor_name}</span>
              </div>
            )}
            {request.location && (
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{request.location}</span>
              </div>
            )}
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Calendar className="h-3 w-3" />
              <span>{format(request.expense_date, "dd/MM/yyyy", { locale: ar })}</span>
            </div>
          </div>
        </div>

        {request.policy_compliance && request.policy_compliance.violations.length > 0 && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-700">
              <strong>انتباه:</strong> يوجد مخالفات للسياسة:
              <ul className="list-disc list-inside mt-1">
                {request.policy_compliance.violations.map((violation, index) => (
                  <li key={index} className="text-sm">{violation}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {request.budget_info && (
          <div className="p-3 bg-gray-50 rounded-lg">
            {getBudgetStatus(request.budget_info)}
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Receipt className="h-4 w-4" />
              <span>{request.receipt_files.length} فاتورة</span>
            </div>
            <div className="flex items-center gap-1">
              <Paperclip className="h-4 w-4" />
              <span>{request.supporting_documents.length} مرفق</span>
            </div>
          </div>
          <span>
            منذ {Math.ceil((new Date().getTime() - request.submitted_at.getTime()) / (1000 * 60 * 60 * 24))} أيام
          </span>
        </div>
      </CardContent>

      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewDetails(request)}
          >
            <Eye className="h-4 w-4 mr-2" />
            عرض التفاصيل
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openDecisionDialog('reject', request)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <ThumbsDown className="h-4 w-4 mr-2" />
              رفض
            </Button>
            <Button
              size="sm"
              onClick={() => openDecisionDialog('approve', request)}
              className="bg-green-600 hover:bg-green-700"
            >
              <ThumbsUp className="h-4 w-4 mr-2" />
              موافقة
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderDecisionDialog = () => (
    <Dialog open={decisionDialog.open} onOpenChange={closeDecisionDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {decisionDialog.type === 'approve' ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                موافقة على الطلب
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-red-600" />
                رفض الطلب
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {decisionDialog.request && (
              <>
                طلب رقم: {decisionDialog.request.request_number}
                <br />
                المبلغ: {formatCurrency(decisionDialog.request.amount, decisionDialog.request.currency)}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="comments">
              {decisionDialog.type === 'approve' ? 'تعليقات الموافقة' : 'سبب الرفض'} *
            </Label>
            <Textarea
              id="comments"
              placeholder={
                decisionDialog.type === 'approve' 
                  ? "اكتب أي تعليقات أو ملاحظات حول الموافقة..."
                  : "اكتب سبب رفض الطلب بوضوح..."
              }
              value={decisionForm.comments}
              onChange={(e) => setDecisionForm(prev => ({ ...prev, comments: e.target.value }))}
              rows={3}
              className="resize-none"
            />
          </div>

          {decisionDialog.type === 'approve' && (
            <div>
              <Label htmlFor="conditions">شروط الموافقة (اختياري)</Label>
              <Textarea
                id="conditions"
                placeholder="أي شروط أو قيود على الموافقة..."
                value={decisionForm.conditions}
                onChange={(e) => setDecisionForm(prev => ({ ...prev, conditions: e.target.value }))}
                rows={2}
                className="resize-none"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={closeDecisionDialog}>
            إلغاء
          </Button>
          <Button
            onClick={handleDecisionSubmit}
            disabled={!decisionForm.comments.trim() || isProcessingDecision}
            className={
              decisionDialog.type === 'approve' 
                ? "bg-green-600 hover:bg-green-700"
                : "bg-red-600 hover:bg-red-700"
            }
          >
            {isProcessingDecision ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : decisionDialog.type === 'approve' ? (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            ) : (
              <XCircle className="h-4 w-4 mr-2" />
            )}
            {isProcessingDecision ? 'جاري المعالجة...' : 
             decisionDialog.type === 'approve' ? 'تأكيد الموافقة' : 'تأكيد الرفض'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const renderDetailDialog = () => {
    if (!selectedRequest) return null;

    return (
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              تفاصيل طلب الموافقة
            </DialogTitle>
            <DialogDescription>
              رقم الطلب: {selectedRequest.request_number}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[70vh] pr-4">
            <Tabs defaultValue="details" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="details">التفاصيل</TabsTrigger>
                <TabsTrigger value="attachments">المرفقات</TabsTrigger>
                <TabsTrigger value="budget">الميزانية</TabsTrigger>
                <TabsTrigger value="policy">السياسة</TabsTrigger>
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
                      <div>
                        <Label className="text-sm font-medium text-gray-500">الأولوية</Label>
                        <div className="mt-1">
                          <PriorityBadge priority={selectedRequest.priority} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">معلومات المقدم</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={selectedRequest.user.avatar} />
                          <AvatarFallback>
                            {selectedRequest.user.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{selectedRequest.user.name}</p>
                          <p className="text-sm text-gray-500">{selectedRequest.user.position}</p>
                          <p className="text-sm text-gray-500">{selectedRequest.user.department}</p>
                          <p className="text-xs text-gray-400">{selectedRequest.user.email}</p>
                        </div>
                      </div>
                      
                      <Separator />
                      
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
                        <Label className="text-sm font-medium text-gray-500">تاريخ التقديم</Label>
                        <p>{format(selectedRequest.submitted_at, "PPP 'في' pp", { locale: ar })}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="attachments" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Receipt className="h-5 w-5" />
                      الفواتير والوصولات ({selectedRequest.receipt_files.length})
                    </h3>
                    
                    {selectedRequest.receipt_files.length > 0 ? (
                      <div className="space-y-3">
                        {selectedRequest.receipt_files.map((file, index) => (
                          <Card key={index}>
                            <CardContent className="p-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                  <Receipt className="h-5 w-5 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{file.name}</p>
                                  <p className="text-xs text-gray-500">
                                    {formatFileSize(file.size)} • {file.type}
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
                      المستندات الداعمة ({selectedRequest.supporting_documents.length})
                    </h3>
                    
                    {selectedRequest.supporting_documents.length > 0 ? (
                      <div className="space-y-3">
                        {selectedRequest.supporting_documents.map((file, index) => (
                          <Card key={index}>
                            <CardContent className="p-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                  <FileText className="h-5 w-5 text-green-600" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{file.name}</p>
                                  <p className="text-xs text-gray-500">
                                    {formatFileSize(file.size)} • {file.type}
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
              
              <TabsContent value="budget" className="space-y-4">
                {selectedRequest.budget_info ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        حالة الميزانية
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {getBudgetStatus(selectedRequest.budget_info)}
                      
                      <Separator />
                      
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-sm text-gray-500">الميزانية المتاحة</p>
                          <p className="font-mono font-bold">
                            {formatCurrency(selectedRequest.budget_info.available_budget, selectedRequest.currency)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">المستخدم حالياً</p>
                          <p className="font-mono font-bold text-orange-600">
                            {formatCurrency(selectedRequest.budget_info.used_budget, selectedRequest.currency)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">بعد هذا الطلب</p>
                          <p className="font-mono font-bold text-blue-600">
                            {formatCurrency(selectedRequest.budget_info.used_budget + selectedRequest.amount, selectedRequest.currency)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>لا توجد معلومات ميزانية متاحة</AlertDescription>
                  </Alert>
                )}
              </TabsContent>
              
              <TabsContent value="policy" className="space-y-4">
                {selectedRequest.policy_compliance ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        مطابقة السياسة
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span>يتطلب فاتورة</span>
                          {selectedRequest.policy_compliance.requires_receipt ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span>ضمن الحدود المسموحة</span>
                          {selectedRequest.policy_compliance.within_limits ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                      </div>
                      
                      {selectedRequest.policy_compliance.violations.length > 0 && (
                        <>
                          <Separator />
                          <div>
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 text-orange-600" />
                              مخالفات السياسة
                            </h4>
                            <div className="space-y-2">
                              {selectedRequest.policy_compliance.violations.map((violation, index) => (
                                <Alert key={index} className="border-orange-200 bg-orange-50">
                                  <AlertCircle className="h-4 w-4 text-orange-600" />
                                  <AlertDescription className="text-orange-700">
                                    {violation}
                                  </AlertDescription>
                                </Alert>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>لا توجد معلومات مطابقة السياسة</AlertDescription>
                  </Alert>
                )}
              </TabsContent>
            </Tabs>
          </ScrollArea>

          <DialogFooter className="border-t pt-4">
            <div className="flex items-center justify-between w-full">
              <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
                إغلاق
              </Button>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDetailDialogOpen(false);
                    openDecisionDialog('reject', selectedRequest);
                  }}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <ThumbsDown className="h-4 w-4 mr-2" />
                  رفض
                </Button>
                <Button
                  onClick={() => {
                    setIsDetailDialogOpen(false);
                    openDecisionDialog('approve', selectedRequest);
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  موافقة
                </Button>
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
          <h1 className="text-3xl font-bold text-gray-900">لوحة موافقات المدير</h1>
          <p className="text-gray-600 mt-1">مراجعة والموافقة على طلبات النفقات</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              loadPendingApprovals();
              loadDashboardStats();
            }}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
          
          <Button variant="outline" className="relative">
            <Bell className="h-4 w-4 mr-2" />
            الإشعارات
            {dashboardStats.urgent_count > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500">
                {dashboardStats.urgent_count}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {renderDashboardStats()}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            تصفية الطلبات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
              <Label className="text-sm font-medium">الأولوية</Label>
              <Select value={filters.priority} onValueChange={(value) => handleFilterChange('priority', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="جميع الأولويات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأولويات</SelectItem>
                  <SelectItem value="urgent">عاجلة</SelectItem>
                  <SelectItem value="high">عالية</SelectItem>
                  <SelectItem value="normal">عادية</SelectItem>
                  <SelectItem value="low">منخفضة</SelectItem>
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
                  <SelectItem value="التسويق والمبيعات">التسويق والمبيعات</SelectItem>
                  <SelectItem value="الموارد البشرية">الموارد البشرية</SelectItem>
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

      {/* Approvals List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">
            الطلبات المعلقة ({filteredApprovals.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <span className="mr-2 text-gray-600">جاري التحميل...</span>
          </div>
        ) : filteredApprovals.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">لا توجد طلبات تحتاج للموافقة حالياً</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredApprovals.map(renderApprovalCard)}
          </div>
        )}
      </div>

      {renderDetailDialog()}
      {renderDecisionDialog()}
    </div>
  );
}