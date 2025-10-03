import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, addDays, addMonths, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ar } from "date-fns/locale";
import {
  FileText,
  Download,
  Printer,
  Mail,
  Share2,
  Calendar as CalendarIcon,
  Filter,
  Search,
  BarChart3,
  PieChart,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Building,
  Target,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Settings,
  Eye,
  Edit,
  Trash2,
  Plus,
  Save,
  Send,
  Archive,
  ExternalLink,
  AlertTriangle,
  Info,
  CheckCircle,
  Star,
  Bookmark
} from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { ExpenseManagementService } from '@/lib/services/expense-management-service';
import { ExpensePrintingService } from '@/lib/services/expense-printing-service';
import { SiteSettings } from '@/lib/site-settings';

interface ReportTemplate {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  type: 'summary' | 'detailed' | 'analytics' | 'budget' | 'audit';
  format: 'pdf' | 'excel' | 'csv' | 'html';
  category: string;
  isDefault: boolean;
  isActive: boolean;
  parameters: ReportParameter[];
  schedule?: ReportSchedule;
  createdAt: Date;
  lastUsed?: Date;
  usageCount: number;
  thumbnail?: string;
}

interface ReportParameter {
  name: string;
  label: string;
  labelAr: string;
  type: 'date' | 'daterange' | 'select' | 'multiselect' | 'number' | 'text' | 'boolean';
  required: boolean;
  defaultValue?: any;
  options?: Array<{ value: string; label: string; labelAr: string }>;
  validation?: string;
}

interface ReportSchedule {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  time: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  recipients: string[];
  lastSent?: Date;
  nextSend?: Date;
}

interface ReportData {
  id: string;
  templateId: string;
  name: string;
  parameters: Record<string, any>;
  status: 'generating' | 'completed' | 'failed';
  format: string;
  size?: number;
  downloadUrl?: string;
  generatedAt: Date;
  expiresAt?: Date;
  generatedBy: string;
  shareToken?: string;
}

interface DashboardStats {
  totalExpenses: number;
  totalAmount: number;
  pendingApproval: number;
  pendingAmount: number;
  approvedThisMonth: number;
  approvedAmountThisMonth: number;
  avgProcessingTime: number;
  topCategories: Array<{
    category: string;
    categoryAr: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    amount: number;
    count: number;
  }>;
  departmentBreakdown: Array<{
    department: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
}

export default function ReportsPrintingPage() {
  const { toast } = useToast();
  const [reportTemplates, setReportTemplates] = useState<ReportTemplate[]>([]);
  const [generatedReports, setGeneratedReports] = useState<ReportData[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [reportParameters, setReportParameters] = useState<Record<string, any>>({});
  const [scheduleSettings, setScheduleSettings] = useState<ReportSchedule>({
    enabled: false,
    frequency: 'monthly',
    time: '09:00',
    recipients: [],
  });

  const [filters, setFilters] = useState({
    search: '',
    category: '',
    type: '',
    format: ''
  });

  useEffect(() => {
    loadReportTemplates();
    loadGeneratedReports();
    loadDashboardStats();
  }, []);

  const loadReportTemplates = async () => {
    try {
      // في التطبيق الحقيقي، سيتم جلب البيانات من قاعدة البيانات
      const mockTemplates: ReportTemplate[] = [
        {
          id: '1',
          name: 'Monthly Expense Summary',
          nameAr: 'ملخص النفقات الشهرية',
          description: 'Comprehensive monthly expense report with category breakdown',
          type: 'summary',
          format: 'pdf',
          category: 'standard',
          isDefault: true,
          isActive: true,
          parameters: [
            {
              name: 'month',
              label: 'Month',
              labelAr: 'الشهر',
              type: 'daterange',
              required: true,
              defaultValue: {
                from: startOfMonth(new Date()),
                to: endOfMonth(new Date())
              }
            },
            {
              name: 'department',
              label: 'Department',
              labelAr: 'القسم',
              type: 'select',
              required: false,
              options: [
                { value: 'all', label: 'All Departments', labelAr: 'جميع الأقسام' },
                { value: 'it', label: 'IT', labelAr: 'تقنية المعلومات' },
                { value: 'hr', label: 'HR', labelAr: 'الموارد البشرية' },
                { value: 'finance', label: 'Finance', labelAr: 'المالية' }
              ]
            }
          ],
          createdAt: new Date('2024-01-01'),
          usageCount: 45,
          thumbnail: '/templates/monthly-summary.png'
        },
        {
          id: '2',
          name: 'Detailed Expense Report',
          nameAr: 'تقرير النفقات المفصل',
          description: 'Line-by-line detailed expense report with receipts',
          type: 'detailed',
          format: 'excel',
          category: 'detailed',
          isDefault: false,
          isActive: true,
          parameters: [
            {
              name: 'dateRange',
              label: 'Date Range',
              labelAr: 'الفترة الزمنية',
              type: 'daterange',
              required: true
            },
            {
              name: 'categories',
              label: 'Categories',
              labelAr: 'الفئات',
              type: 'multiselect',
              required: false,
              options: [
                { value: 'travel', label: 'Travel', labelAr: 'السفر' },
                { value: 'office', label: 'Office', labelAr: 'مكتبية' },
                { value: 'meals', label: 'Meals', labelAr: 'وجبات' },
                { value: 'training', label: 'Training', labelAr: 'تدريب' }
              ]
            },
            {
              name: 'includeReceipts',
              label: 'Include Receipt Images',
              labelAr: 'تضمين صور الفواتير',
              type: 'boolean',
              required: false,
              defaultValue: true
            }
          ],
          createdAt: new Date('2024-01-01'),
          usageCount: 28,
          thumbnail: '/templates/detailed-report.png'
        },
        {
          id: '3',
          name: 'Budget vs Actual Analysis',
          nameAr: 'تحليل الميزانية مقابل الفعلي',
          description: 'Budget performance analysis with variance reporting',
          type: 'budget',
          format: 'pdf',
          category: 'analytics',
          isDefault: false,
          isActive: true,
          parameters: [
            {
              name: 'fiscalYear',
              label: 'Fiscal Year',
              labelAr: 'السنة المالية',
              type: 'select',
              required: true,
              options: [
                { value: '2024', label: '2024', labelAr: '2024' },
                { value: '2023', label: '2023', labelAr: '2023' }
              ]
            },
            {
              name: 'quarter',
              label: 'Quarter',
              labelAr: 'الربع',
              type: 'select',
              required: false,
              options: [
                { value: 'all', label: 'All Quarters', labelAr: 'جميع الأرباع' },
                { value: 'q1', label: 'Q1', labelAr: 'الربع الأول' },
                { value: 'q2', label: 'Q2', labelAr: 'الربع الثاني' },
                { value: 'q3', label: 'Q3', labelAr: 'الربع الثالث' },
                { value: 'q4', label: 'Q4', labelAr: 'الربع الرابع' }
              ]
            }
          ],
          createdAt: new Date('2024-01-01'),
          usageCount: 15,
          thumbnail: '/templates/budget-analysis.png'
        },
        {
          id: '4',
          name: 'Expense Trend Analysis',
          nameAr: 'تحليل اتجاهات النفقات',
          description: 'Monthly expense trends with forecasting',
          type: 'analytics',
          format: 'pdf',
          category: 'analytics',
          isDefault: false,
          isActive: true,
          parameters: [
            {
              name: 'period',
              label: 'Analysis Period',
              labelAr: 'فترة التحليل',
              type: 'select',
              required: true,
              options: [
                { value: '6months', label: 'Last 6 Months', labelAr: 'آخر 6 أشهر' },
                { value: '12months', label: 'Last 12 Months', labelAr: 'آخر 12 شهر' },
                { value: '24months', label: 'Last 24 Months', labelAr: 'آخر 24 شهر' }
              ]
            },
            {
              name: 'includeForecast',
              label: 'Include Forecast',
              labelAr: 'تضمين التوقعات',
              type: 'boolean',
              required: false,
              defaultValue: true
            }
          ],
          createdAt: new Date('2024-01-01'),
          usageCount: 12,
          thumbnail: '/templates/trend-analysis.png'
        }
      ];

      setReportTemplates(mockTemplates);
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في تحميل قوالب التقارير",
        variant: "destructive",
      });
    }
  };

  const loadGeneratedReports = async () => {
    try {
      const mockReports: ReportData[] = [
        {
          id: '1',
          templateId: '1',
          name: 'Monthly Expense Summary - January 2024',
          parameters: { month: 'January 2024', department: 'all' },
          status: 'completed',
          format: 'pdf',
          size: 1024000, // 1MB
          downloadUrl: '/reports/monthly-summary-jan-2024.pdf',
          generatedAt: new Date('2024-01-15'),
          generatedBy: 'محمد أحمد',
          shareToken: 'abc123'
        },
        {
          id: '2',
          templateId: '2',
          name: 'Detailed Expense Report - Q1 2024',
          parameters: { dateRange: 'Q1 2024', categories: ['travel', 'office'] },
          status: 'completed',
          format: 'excel',
          size: 2048000, // 2MB
          downloadUrl: '/reports/detailed-report-q1-2024.xlsx',
          generatedAt: new Date('2024-01-10'),
          generatedBy: 'فاطمة علي'
        },
        {
          id: '3',
          templateId: '1',
          name: 'Monthly Summary - Generating...',
          parameters: { month: 'February 2024' },
          status: 'generating',
          format: 'pdf',
          generatedAt: new Date(),
          generatedBy: 'أحمد محمد'
        }
      ];

      setGeneratedReports(mockReports);
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في تحميل التقارير المُنتجة",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadDashboardStats = async () => {
    try {
      const stats: DashboardStats = {
        totalExpenses: 156,
        totalAmount: 89500,
        pendingApproval: 23,
        pendingAmount: 18200,
        approvedThisMonth: 34,
        approvedAmountThisMonth: 28500,
        avgProcessingTime: 2.3,
        topCategories: [
          { category: 'travel', categoryAr: 'السفر', amount: 35000, count: 25, percentage: 39.1 },
          { category: 'office', categoryAr: 'مكتبية', amount: 22000, count: 45, percentage: 24.6 },
          { category: 'meals', categoryAr: 'وجبات', amount: 15000, count: 38, percentage: 16.8 },
          { category: 'training', categoryAr: 'تدريب', amount: 12000, count: 12, percentage: 13.4 },
          { category: 'technology', categoryAr: 'تكنولوجيا', amount: 5500, count: 8, percentage: 6.1 }
        ],
        monthlyTrend: [
          { month: 'يناير', amount: 25000, count: 42 },
          { month: 'فبراير', amount: 28500, count: 48 },
          { month: 'مارس', amount: 31000, count: 52 },
          { month: 'أبريل', amount: 27500, count: 45 },
          { month: 'مايو', amount: 29800, count: 49 },
          { month: 'يونيو', amount: 32200, count: 55 }
        ],
        departmentBreakdown: [
          { department: 'تقنية المعلومات', amount: 42000, count: 65, percentage: 46.9 },
          { department: 'التسويق', amount: 28000, count: 38, percentage: 31.3 },
          { department: 'الموارد البشرية', amount: 12500, count: 28, percentage: 14.0 },
          { department: 'المالية', amount: 7000, count: 15, percentage: 7.8 }
        ]
      };

      setDashboardStats(stats);
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    }
  };

  const handleGenerateReport = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    // Initialize parameters with default values
    const defaultParams: Record<string, any> = {};
    template.parameters.forEach(param => {
      if (param.defaultValue !== undefined) {
        defaultParams[param.name] = param.defaultValue;
      }
    });
    setReportParameters(defaultParams);
    setIsGenerateDialogOpen(true);
  };

  const handleParameterChange = (paramName: string, value: any) => {
    setReportParameters(prev => ({
      ...prev,
      [paramName]: value
    }));
  };

  const generateReport = async () => {
    if (!selectedTemplate) return;

    setIsGenerating(true);
    try {
      const printingService = new ExpensePrintingService();
      
      // Create new report record
      const newReport: ReportData = {
        id: Date.now().toString(),
        templateId: selectedTemplate.id,
        name: `${selectedTemplate.nameAr} - ${format(new Date(), 'dd/MM/yyyy')}`,
        parameters: reportParameters,
        status: 'generating',
        format: selectedTemplate.format,
        generatedAt: new Date(),
        generatedBy: 'المستخدم الحالي' // In real app, get from auth context
      };

      setGeneratedReports(prev => [newReport, ...prev]);
      setIsGenerateDialogOpen(false);

      // Simulate report generation
      setTimeout(async () => {
        try {
          // In real app, this would call the actual report generation service
          const reportUrl = await printingService.generateExpenseReport({
            templateId: selectedTemplate.id,
            parameters: reportParameters,
            format: selectedTemplate.format
          });

          // Update report status
          setGeneratedReports(prev => 
            prev.map(report => 
              report.id === newReport.id
                ? {
                    ...report,
                    status: 'completed',
                    downloadUrl: reportUrl,
                    size: Math.floor(Math.random() * 5000000) + 500000 // Random size between 0.5MB - 5.5MB
                  }
                : report
            )
          );

          // Update template usage count
          setReportTemplates(prev =>
            prev.map(template =>
              template.id === selectedTemplate.id
                ? { ...template, usageCount: template.usageCount + 1, lastUsed: new Date() }
                : template
            )
          );

          toast({
            title: "تم إنشاء التقرير",
            description: "تم إنشاء التقرير بنجاح ويمكنك تحميله الآن",
          });
        } catch (error) {
          setGeneratedReports(prev => 
            prev.map(report => 
              report.id === newReport.id
                ? { ...report, status: 'failed' }
                : report
            )
          );
          
          toast({
            title: "خطأ",
            description: "فشل في إنشاء التقرير",
            variant: "destructive",
          });
        }
      }, 3000);

      toast({
        title: "جاري الإنشاء",
        description: "بدء إنشاء التقرير... ستتلقى إشعاراً عند الانتهاء",
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في بدء إنشاء التقرير",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadReport = async (report: ReportData) => {
    if (!report.downloadUrl) return;

    try {
      // In real app, this would download the actual file
      const link = document.createElement('a');
      link.href = report.downloadUrl;
      link.download = `${report.name}.${report.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "تم التحميل",
        description: "تم تحميل التقرير بنجاح",
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في تحميل التقرير",
        variant: "destructive",
      });
    }
  };

  const shareReport = async (report: ReportData) => {
    if (report.shareToken) {
      const shareUrl = `${window.location.origin}/shared-reports/${report.shareToken}`;
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "تم النسخ",
        description: "تم نسخ رابط المشاركة إلى الحافظة",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusBadge = (status: ReportData['status']) => {
    const config = {
      generating: { label: 'جاري الإنشاء', color: 'bg-blue-100 text-blue-800', icon: RefreshCw },
      completed: { label: 'مكتمل', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
      failed: { label: 'فشل', color: 'bg-red-100 text-red-800', icon: XCircle }
    };
    
    const { label, color, icon: Icon } = config[status];
    
    return (
      <Badge className={`${color} gap-1`}>
        <Icon className={`h-3 w-3 ${status === 'generating' ? 'animate-spin' : ''}`} />
        {label}
      </Badge>
    );
  };

  const renderDashboardStats = () => {
    if (!dashboardStats) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dashboardStats.totalExpenses}</p>
                <p className="text-sm text-gray-600">إجمالي النفقات</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dashboardStats.totalAmount.toLocaleString('ar-SA')}</p>
                <p className="text-sm text-gray-600">إجمالي المبلغ (ريال)</p>
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
                <p className="text-2xl font-bold">{dashboardStats.pendingApproval}</p>
                <p className="text-sm text-gray-600">في انتظار الموافقة</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dashboardStats.avgProcessingTime}</p>
                <p className="text-sm text-gray-600">متوسط المعالجة (يوم)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderTemplateCard = (template: ReportTemplate) => (
    <Card key={template.id} className="hover:shadow-lg transition-shadow cursor-pointer">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {template.thumbnail && (
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-gray-600" />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-lg">{template.nameAr}</h3>
              <p className="text-sm text-gray-500">{template.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {template.format.toUpperCase()}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {template.type === 'summary' ? 'ملخص' :
                   template.type === 'detailed' ? 'مفصل' :
                   template.type === 'analytics' ? 'تحليلي' :
                   template.type === 'budget' ? 'ميزانية' : 'مراجعة'}
                </Badge>
                {template.isDefault && (
                  <Badge className="bg-blue-100 text-blue-700 text-xs">
                    <Star className="h-3 w-3 mr-1" />
                    افتراضي
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-sm text-gray-600">{template.description}</p>
        
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-4">
            <span>استُخدم {template.usageCount} مرة</span>
            {template.lastUsed && (
              <span>آخر استخدام: {format(template.lastUsed, "dd/MM/yyyy", { locale: ar })}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleGenerateReport(template)}
            >
              <FileText className="h-4 w-4 mr-2" />
              إنشاء
            </Button>
            {template.schedule && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTemplate(template);
                  setScheduleSettings(template.schedule!);
                  setIsScheduleDialogOpen(true);
                }}
              >
                <Clock className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderReportCard = (report: ReportData) => (
    <Card key={report.id} className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold">{report.name}</h3>
            <p className="text-sm text-gray-500 mt-1">
              {format(report.generatedAt, "dd/MM/yyyy 'في' HH:mm", { locale: ar })} • 
              بواسطة {report.generatedBy}
            </p>
          </div>
          {getStatusBadge(report.status)}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="text-sm text-gray-600">
          <div className="flex items-center justify-between">
            <span>النوع: {report.format.toUpperCase()}</span>
            {report.size && (
              <span>الحجم: {formatFileSize(report.size)}</span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {report.status === 'completed' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadReport(report)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  تحميل
                </Button>
                {report.shareToken && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => shareReport(report)}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
          </div>
          <div className="text-xs text-gray-400">
            {report.expiresAt && (
              <span>ينتهي: {format(report.expiresAt, "dd/MM/yyyy", { locale: ar })}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderGenerateDialog = () => {
    if (!selectedTemplate) return null;

    return (
      <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              إنشاء تقرير: {selectedTemplate.nameAr}
            </DialogTitle>
            <DialogDescription>
              {selectedTemplate.description}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-96">
            <div className="space-y-4">
              {selectedTemplate.parameters.map((param, index) => (
                <div key={param.name}>
                  <Label htmlFor={param.name}>
                    {param.labelAr}
                    {param.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  
                  {param.type === 'select' && param.options && (
                    <Select
                      value={reportParameters[param.name] || ''}
                      onValueChange={(value) => handleParameterChange(param.name, value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={`اختر ${param.labelAr}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {param.options.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.labelAr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {param.type === 'daterange' && (
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <div>
                        <Label className="text-xs text-gray-500">من</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {reportParameters[param.name]?.from
                                ? format(reportParameters[param.name].from, "dd/MM/yyyy")
                                : "اختر التاريخ"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={reportParameters[param.name]?.from}
                              onSelect={(date) => 
                                handleParameterChange(param.name, {
                                  ...reportParameters[param.name],
                                  from: date
                                })
                              }
                              initialFocus
                              locale={ar}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">إلى</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {reportParameters[param.name]?.to
                                ? format(reportParameters[param.name].to, "dd/MM/yyyy")
                                : "اختر التاريخ"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={reportParameters[param.name]?.to}
                              onSelect={(date) => 
                                handleParameterChange(param.name, {
                                  ...reportParameters[param.name],
                                  to: date
                                })
                              }
                              initialFocus
                              locale={ar}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  )}

                  {param.type === 'boolean' && (
                    <div className="flex items-center space-x-2 mt-1">
                      <input
                        type="checkbox"
                        id={param.name}
                        checked={reportParameters[param.name] || false}
                        onChange={(e) => handleParameterChange(param.name, e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor={param.name} className="text-sm">
                        {param.labelAr}
                      </Label>
                    </div>
                  )}

                  {param.type === 'text' && (
                    <Input
                      value={reportParameters[param.name] || ''}
                      onChange={(e) => handleParameterChange(param.name, e.target.value)}
                      placeholder={param.labelAr}
                      className="mt-1"
                    />
                  )}

                  {param.type === 'number' && (
                    <Input
                      type="number"
                      value={reportParameters[param.name] || ''}
                      onChange={(e) => handleParameterChange(param.name, parseFloat(e.target.value) || 0)}
                      placeholder={param.labelAr}
                      className="mt-1"
                    />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGenerateDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={generateReport} disabled={isGenerating}>
              {isGenerating ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              {isGenerating ? 'جاري الإنشاء...' : 'إنشاء التقرير'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">التقارير والطباعة</h1>
          <p className="text-gray-600 mt-1">إنشاء وإدارة تقارير النفقات الاحترافية</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            إعدادات التقارير
          </Button>
          <Button variant="outline">
            <Clock className="h-4 w-4 mr-2" />
            جدولة التقارير
          </Button>
        </div>
      </div>

      {renderDashboardStats()}

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="templates">قوالب التقارير</TabsTrigger>
          <TabsTrigger value="generated">التقارير المُنتجة</TabsTrigger>
          <TabsTrigger value="scheduled">التقارير المجدولة</TabsTrigger>
          <TabsTrigger value="analytics">تحليلات متقدمة</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">قوالب التقارير المتاحة</h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="البحث في القوالب..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="النوع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">جميع الأنواع</SelectItem>
                  <SelectItem value="summary">ملخص</SelectItem>
                  <SelectItem value="detailed">مفصل</SelectItem>
                  <SelectItem value="analytics">تحليلي</SelectItem>
                  <SelectItem value="budget">ميزانية</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
              <span className="mr-2 text-gray-600">جاري التحميل...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reportTemplates.map(renderTemplateCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="generated" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">التقارير المُنتجة ({generatedReports.length})</h2>
            <Button variant="outline">
              <Archive className="h-4 w-4 mr-2" />
              أرشفة التقارير القديمة
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {generatedReports.map(renderReportCard)}
          </div>
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">التقارير المجدولة</h2>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              جدولة تقرير جديد
            </Button>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              لا توجد تقارير مجدولة حالياً. يمكنك إنشاء جدولة تلقائية للتقارير من قوالب التقارير.
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {dashboardStats && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5" />
                      أهم فئات النفقات
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dashboardStats.topCategories.map((category, index) => (
                        <div key={category.category} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                              <span className="text-xs font-semibold">{index + 1}</span>
                            </div>
                            <div>
                              <p className="font-medium">{category.categoryAr}</p>
                              <p className="text-sm text-gray-500">{category.count} طلب</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{category.amount.toLocaleString('ar-SA')} ريال</p>
                            <p className="text-sm text-gray-500">{category.percentage}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      توزيع النفقات حسب القسم
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dashboardStats.departmentBreakdown.map((dept, index) => (
                        <div key={dept.department} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <Building className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium">{dept.department}</p>
                              <p className="text-sm text-gray-500">{dept.count} طلب</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{dept.amount.toLocaleString('ar-SA')} ريال</p>
                            <p className="text-sm text-gray-500">{dept.percentage}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {renderGenerateDialog()}
    </div>
  );
}