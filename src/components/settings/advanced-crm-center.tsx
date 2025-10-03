"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
// import { useBrandIdentity, formatCurrency, formatDate } from '@/lib/brand-identity-system';
// Note: Using fallback functions for now since provider might not be available

// Fallback formatting functions
const formatCurrency = (amount: number, config?: any): string => {
  const currency = config?.currency || 'EGP';
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};
import { 
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Heart,
  Star,
  TrendingUp,
  TrendingDown,
  Activity,
  Package,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Target,
  Zap,
  Bot,
  Settings,
  Filter,
  Search,
  RefreshCw,
  Download,
  Upload,
  Eye,
  Edit,
  Trash2,
  Plus,
  MessageSquare,
  ShoppingCart,
  CreditCard,
  Gift,
  Award,
  Briefcase,
  Building,
  Globe,
  Smartphone,
  PieChart,
  BarChart3,
  LineChart,
  FileText,
  Bell,
  Send,
  Share2,
  ThumbsUp,
  ThumbsDown,
  Flag,
  Tag,
  Database,
  Import,
  ChevronRight,
  ChevronDown
} from 'lucide-react';

// تعريف الأنواع
interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  position?: string;
  status: 'active' | 'inactive' | 'prospect' | 'lead' | 'lost';
  segment: 'vip' | 'premium' | 'standard' | 'basic';
  source: 'website' | 'referral' | 'advertising' | 'social_media' | 'direct' | 'partner';
  total_orders: number;
  total_spent: number;
  lifetime_value: number;
  last_interaction: string;
  created_at: string;
  avatar?: string;
  location?: string;
  preferences?: {
    communication_channel: 'email' | 'phone' | 'sms' | 'whatsapp';
    marketing_consent: boolean;
    language: string;
    interests: string[];
  };
  interactions_count: number;
  satisfaction_score: number;
}

interface CRMInteraction {
  id: string;
  customer_id: string;
  type: 'email' | 'phone' | 'meeting' | 'support' | 'sale' | 'marketing';
  subject: string;
  description: string;
  outcome: 'positive' | 'neutral' | 'negative' | 'pending';
  created_by: string;
  created_at: string;
  follow_up_date?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags: string[];
}

interface CRMCampaign {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'social' | 'direct_mail' | 'phone';
  status: 'draft' | 'scheduled' | 'active' | 'completed' | 'paused';
  target_segment: string[];
  start_date: string;
  end_date?: string;
  budget: number;
  reach: number;
  engagement_rate: number;
  conversion_rate: number;
  roi: number;
  created_at: string;
  description: string;
}

interface CRMAutomation {
  id: string;
  name: string;
  description: string;
  trigger: 'new_customer' | 'abandoned_cart' | 'birthday' | 'purchase' | 'no_activity' | 'custom';
  conditions: any[];
  actions: {
    type: 'send_email' | 'send_sms' | 'create_task' | 'update_segment' | 'assign_rep';
    config: any;
  }[];
  status: 'active' | 'inactive' | 'draft';
  execution_count: number;
  success_rate: number;
  created_at: string;
}

interface CRMAnalytics {
  summary: {
    total_customers: number;
    active_customers: number;
    new_customers_this_month: number;
    churn_rate: number;
    average_order_value: number;
    customer_lifetime_value: number;
    satisfaction_score: number;
    conversion_rate: number;
  };
  segments: {
    vip: number;
    premium: number;
    standard: number;
    basic: number;
  };
  sources: {
    website: number;
    referral: number;
    advertising: number;
    social_media: number;
    direct: number;
    partner: number;
  };
}

interface CRMData {
  analytics: CRMAnalytics;
  customers: Customer[];
  interactions: CRMInteraction[];
  campaigns: CRMCampaign[];
  automations: CRMAutomation[];
}

// أيقونات حسب حالة العميل
const statusIcons = {
  active: UserCheck,
  inactive: UserX,
  prospect: Users,
  lead: Target,
  lost: UserX
};

// ألوان حسب حالة العميل
const statusColors = {
  active: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900',
  inactive: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900',
  prospect: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900',
  lead: 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900',
  lost: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900'
};

// أيقونات قطاعات العملاء
const segmentIcons = {
  vip: Award,
  premium: Star,
  standard: Users,
  basic: UserCheck
};

export function AdvancedCRMCenter() {
  // Fallback brand config since provider might not be available
  const brandConfig = {
    colors: {
      primary: '#0066CC',
      secondary: '#4A90E2',
      accent: '#FF6B6B'
    },
    currency: 'EGP'
  };
  const [data, setData] = useState<CRMData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [segmentFilter, setSegmentFilter] = useState('all');
  const [selectedCampaign, setSelectedCampaign] = useState<CRMCampaign | null>(null);
  const [showCampaignDialog, setShowCampaignDialog] = useState(false);

  useEffect(() => {
    fetchCRMData();
  }, []);

  const fetchCRMData = async () => {
    try {
      setLoading(true);
      
      // محاكاة بيانات CRM
      const mockData: CRMData = {
        analytics: {
          summary: {
            total_customers: 4580,
            active_customers: 3420,
            new_customers_this_month: 145,
            churn_rate: 5.2,
            average_order_value: 325,
            customer_lifetime_value: 1850,
            satisfaction_score: 4.3,
            conversion_rate: 18.5
          },
          segments: {
            vip: 120,
            premium: 680,
            standard: 2150,
            basic: 1630
          },
          sources: {
            website: 1850,
            referral: 980,
            advertising: 750,
            social_media: 620,
            direct: 280,
            partner: 100
          }
        },
        customers: [
          {
            id: '1',
            first_name: 'أحمد',
            last_name: 'المحمد',
            email: 'ahmed.mohammed@example.com',
            phone: '+966501234567',
            company: 'شركة التقنية المتقدمة',
            position: 'مدير تقني',
            status: 'active',
            segment: 'vip',
            source: 'referral',
            total_orders: 24,
            total_spent: 48500,
            lifetime_value: 52000,
            last_interaction: '2025-01-14T10:30:00Z',
            created_at: '2023-03-15T09:20:00Z',
            location: 'الرياض، المملكة العربية السعودية',
            preferences: {
              communication_channel: 'email',
              marketing_consent: true,
              language: 'ar',
              interests: ['تقنية', 'برمجيات', 'ذكاء اصطناعي']
            },
            interactions_count: 45,
            satisfaction_score: 4.8
          },
          {
            id: '2',
            first_name: 'فاطمة',
            last_name: 'العتيبي',
            email: 'fatima.alotaibi@example.com',
            phone: '+966502345678',
            company: 'مؤسسة الإبداع للتسويق',
            position: 'مديرة مبيعات',
            status: 'active',
            segment: 'premium',
            source: 'website',
            total_orders: 18,
            total_spent: 32400,
            lifetime_value: 38000,
            last_interaction: '2025-01-13T16:45:00Z',
            created_at: '2023-07-08T14:15:00Z',
            location: 'جدة، المملكة العربية السعودية',
            preferences: {
              communication_channel: 'whatsapp',
              marketing_consent: true,
              language: 'ar',
              interests: ['تسويق', 'تجارة إلكترونية', 'ريادة أعمال']
            },
            interactions_count: 32,
            satisfaction_score: 4.5
          },
          {
            id: '3',
            first_name: 'محمد',
            last_name: 'الغامدي',
            email: 'mohammed.ghamdi@example.com',
            phone: '+966503456789',
            company: 'متجر الإلكترونيات الذكية',
            position: 'صاحب العمل',
            status: 'prospect',
            segment: 'standard',
            source: 'social_media',
            total_orders: 5,
            total_spent: 8700,
            lifetime_value: 12000,
            last_interaction: '2025-01-12T11:20:00Z',
            created_at: '2024-09-22T08:30:00Z',
            location: 'الدمام، المملكة العربية السعودية',
            preferences: {
              communication_channel: 'phone',
              marketing_consent: false,
              language: 'ar',
              interests: ['إلكترونيات', 'تقنية', 'أجهزة ذكية']
            },
            interactions_count: 12,
            satisfaction_score: 4.1
          }
        ],
        interactions: [
          {
            id: '1',
            customer_id: '1',
            type: 'email',
            subject: 'استفسار عن المنتجات الجديدة',
            description: 'العميل يسأل عن إمكانيات المنتجات الجديدة والأسعار',
            outcome: 'positive',
            created_by: 'مها السعيد',
            created_at: '2025-01-14T10:30:00Z',
            follow_up_date: '2025-01-17T10:00:00Z',
            priority: 'high',
            tags: ['استفسار', 'منتجات جديدة', 'متابعة']
          },
          {
            id: '2',
            customer_id: '2',
            type: 'phone',
            subject: 'مكالمة متابعة بعد الشراء',
            description: 'التحقق من رضا العميل عن المنتج المشترى مؤخراً',
            outcome: 'positive',
            created_by: 'خالد الأحمد',
            created_at: '2025-01-13T16:45:00Z',
            priority: 'medium',
            tags: ['متابعة', 'رضا العميل', 'خدمة ما بعد البيع']
          }
        ],
        campaigns: [
          {
            id: '1',
            name: 'حملة العروض الشتوية',
            type: 'email',
            status: 'active',
            target_segment: ['premium', 'vip'],
            start_date: '2025-01-10T00:00:00Z',
            end_date: '2025-01-31T23:59:59Z',
            budget: 15000,
            reach: 2500,
            engagement_rate: 12.5,
            conversion_rate: 3.2,
            roi: 185,
            created_at: '2025-01-08T09:00:00Z',
            description: 'حملة تسويقية للعروض الشتوية المخصصة للعملاء المميزين'
          },
          {
            id: '2',
            name: 'حملة العملاء الجدد',
            type: 'sms',
            status: 'completed',
            target_segment: ['basic'],
            start_date: '2024-12-01T00:00:00Z',
            end_date: '2024-12-31T23:59:59Z',
            budget: 8000,
            reach: 1200,
            engagement_rate: 8.3,
            conversion_rate: 5.1,
            roi: 220,
            created_at: '2024-11-25T10:30:00Z',
            description: 'حملة لجذب العملاء الجدد مع عروض ترحيبية خاصة'
          }
        ],
        automations: [
          {
            id: '1',
            name: 'ترحيب العملاء الجدد',
            description: 'رسائل ترحيب تلقائية للعملاء الجدد مع دليل البدء',
            trigger: 'new_customer',
            conditions: [],
            actions: [
              {
                type: 'send_email',
                config: {
                  template: 'welcome_email',
                  delay: '1_hour'
                }
              },
              {
                type: 'create_task',
                config: {
                  task: 'متابعة العميل الجديد',
                  assign_to: 'sales_team',
                  due_date: '3_days'
                }
              }
            ],
            status: 'active',
            execution_count: 145,
            success_rate: 94.5,
            created_at: '2024-06-15T12:00:00Z'
          },
          {
            id: '2',
            name: 'استرداد السلة المتروكة',
            description: 'تذكير العملاء بالسلال المتروكة مع حوافز شراء',
            trigger: 'abandoned_cart',
            conditions: [
              { field: 'cart_value', operator: '>', value: 100 }
            ],
            actions: [
              {
                type: 'send_email',
                config: {
                  template: 'abandoned_cart',
                  delay: '2_hours'
                }
              },
              {
                type: 'send_sms',
                config: {
                  message: 'لا تفوت العرض! أكمل طلبك الآن واحصل على خصم 10%',
                  delay: '1_day'
                }
              }
            ],
            status: 'active',
            execution_count: 89,
            success_rate: 78.5,
            created_at: '2024-08-20T14:30:00Z'
          }
        ]
      };

      // محاكاة تأخير التحميل
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      setData(mockData);
    } catch (error) {
      console.error('خطأ في تحميل بيانات CRM:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrencyLocal = (amount: number) => {
    return formatCurrency(amount, brandConfig);
  };

  const formatDateLocal = (dateString: string) => {
    return formatDate(new Date(dateString));
  };

  const filteredCustomers = data?.customers.filter(customer => {
    const matchesSearch = customer.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (customer.company && customer.company.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;
    const matchesSegment = segmentFilter === 'all' || customer.segment === segmentFilter;
    
    return matchesSearch && matchesStatus && matchesSegment;
  }) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Users className="h-8 w-8 animate-pulse text-primary mx-auto mb-2" />
          <p className="text-muted-foreground">جاري تحميل بيانات العملاء...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          فشل في تحميل بيانات إدارة العملاء. يرجى المحاولة لاحقاً.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* رأس الصفحة */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-green-600 to-blue-600 rounded-xl shadow-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            مركز إدارة العملاء CRM المتقدم
          </h2>
          <p className="text-muted-foreground mt-1">
            نظام شامل لإدارة العملاء مع أتمتة التسويق والمبيعات
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Import className="h-4 w-4 ml-2" />
            استيراد عملاء
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 ml-2" />
            تصدير
          </Button>
          <Button onClick={fetchCRMData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 ml-2" />
            تحديث
          </Button>
          <Button className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700">
            <UserPlus className="h-4 w-4 ml-2" />
            إضافة عميل جديد
          </Button>
        </div>
      </div>

      {/* ملخص KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <Card className="col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي العملاء</p>
                <p className="text-xl font-bold">{data.analytics.summary.total_customers.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <UserCheck className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">نشطاء</p>
                <p className="text-xl font-bold">{data.analytics.summary.active_customers.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <UserPlus className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">جدد هذا الشهر</p>
                <p className="text-xl font-bold">{data.analytics.summary.new_customers_this_month}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                <TrendingDown className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">معدل الانسحاب</p>
                <p className="text-xl font-bold">{data.analytics.summary.churn_rate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <DollarSign className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">متوسط قيمة الطلب</p>
                <p className="text-lg font-bold">{formatCurrency(data.analytics.summary.average_order_value, brandConfig)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-cyan-100 dark:bg-cyan-900 rounded-lg">
                <Heart className="h-4 w-4 text-cyan-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">قيمة دورة الحياة</p>
                <p className="text-lg font-bold">{formatCurrency(data.analytics.summary.customer_lifetime_value, brandConfig)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <Star className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الرضا</p>
                <p className="text-xl font-bold">{data.analytics.summary.satisfaction_score}/5</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-teal-100 dark:bg-teal-900 rounded-lg">
                <Target className="h-4 w-4 text-teal-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">معدل التحويل</p>
                <p className="text-xl font-bold">{data.analytics.summary.conversion_rate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* التبويبات الرئيسية */}
      <Tabs defaultValue="customers" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="customers">
            <Users className="h-4 w-4 ml-2" />
            العملاء
          </TabsTrigger>
          <TabsTrigger value="interactions">
            <MessageSquare className="h-4 w-4 ml-2" />
            التفاعلات
          </TabsTrigger>
          <TabsTrigger value="campaigns">
            <Send className="h-4 w-4 ml-2" />
            الحملات
          </TabsTrigger>
          <TabsTrigger value="automations">
            <Bot className="h-4 w-4 ml-2" />
            الأتمتة
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 ml-2" />
            التحليلات
          </TabsTrigger>
        </TabsList>
        
        {/* تبويب العملاء */}
        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-600" />
                  قائمة العملاء
                </CardTitle>
                <div className="flex gap-2">
                  <Input
                    placeholder="البحث في العملاء..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="الحالة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الحالات</SelectItem>
                      <SelectItem value="active">نشط</SelectItem>
                      <SelectItem value="inactive">غير نشط</SelectItem>
                      <SelectItem value="prospect">محتمل</SelectItem>
                      <SelectItem value="lead">عميل محتمل</SelectItem>
                      <SelectItem value="lost">فاقد</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={segmentFilter} onValueChange={setSegmentFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="القطاع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع القطاعات</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                      <SelectItem value="premium">مميز</SelectItem>
                      <SelectItem value="standard">عادي</SelectItem>
                      <SelectItem value="basic">أساسي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredCustomers.map((customer) => {
                  const StatusIcon = statusIcons[customer.status] || Users;
                  const SegmentIcon = segmentIcons[customer.segment] || Users;
                  const statusColorClass = statusColors[customer.status] || statusColors.active;
                  
                  return (
                    <Card key={customer.id} className="hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setShowCustomerDialog(true);
                          }}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                              {customer.first_name.charAt(0)}{customer.last_name.charAt(0)}
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-lg">
                                  {customer.first_name} {customer.last_name}
                                </h3>
                                <Badge variant="outline" className={statusColorClass}>
                                  <StatusIcon className="h-3 w-3 ml-1" />
                                  {customer.status === 'active' ? 'نشط' :
                                   customer.status === 'inactive' ? 'غير نشط' :
                                   customer.status === 'prospect' ? 'محتمل' :
                                   customer.status === 'lead' ? 'عميل محتمل' : 'فاقد'}
                                </Badge>
                                <Badge variant="outline">
                                  <SegmentIcon className="h-3 w-3 ml-1" />
                                  {customer.segment === 'vip' ? 'VIP' :
                                   customer.segment === 'premium' ? 'مميز' :
                                   customer.segment === 'standard' ? 'عادي' : 'أساسي'}
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4" />
                                  <span>{customer.email}</span>
                                </div>
                                {customer.phone && (
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4" />
                                    <span>{customer.phone}</span>
                                  </div>
                                )}
                                {customer.company && (
                                  <div className="flex items-center gap-2">
                                    <Building className="h-4 w-4" />
                                    <span>{customer.company}</span>
                                  </div>
                                )}
                                {customer.location && (
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    <span>{customer.location}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="grid grid-cols-3 gap-4 text-center">
                              <div>
                                <div className="text-lg font-bold text-green-600">
                                  {customer.total_orders}
                                </div>
                                <div className="text-xs text-muted-foreground">طلبات</div>
                              </div>
                              <div>
                                <div className="text-lg font-bold text-blue-600">
                                  {formatCurrency(customer.total_spent, brandConfig)}
                                </div>
                                <div className="text-xs text-muted-foreground">إجمالي المبيعات</div>
                              </div>
                              <div>
                                <div className="flex items-center gap-1">
                                  <Star className="h-3 w-3 text-yellow-500" />
                                  <span className="text-sm font-medium">{customer.satisfaction_score}</span>
                                </div>
                                <div className="text-xs text-muted-foreground">التقييم</div>
                              </div>
                            </div>
                            
                            <div className="text-xs text-muted-foreground mt-2">
                              آخر تفاعل: {formatDateLocal(customer.last_interaction)}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* تبويب التفاعلات */}
        <TabsContent value="interactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                سجل التفاعلات مع العملاء
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.interactions.map((interaction) => (
                  <Card key={interaction.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary">
                              {interaction.type === 'email' ? 'بريد إلكتروني' :
                               interaction.type === 'phone' ? 'مكالمة هاتفية' :
                               interaction.type === 'meeting' ? 'اجتماع' :
                               interaction.type === 'support' ? 'دعم فني' :
                               interaction.type === 'sale' ? 'مبيعات' : 'تسويق'}
                            </Badge>
                            <Badge variant="outline" className={
                              interaction.priority === 'urgent' ? 'text-red-600 bg-red-100' :
                              interaction.priority === 'high' ? 'text-orange-600 bg-orange-100' :
                              interaction.priority === 'medium' ? 'text-yellow-600 bg-yellow-100' : 'text-green-600 bg-green-100'
                            }>
                              {interaction.priority === 'urgent' ? 'عاجل' :
                               interaction.priority === 'high' ? 'مهم' :
                               interaction.priority === 'medium' ? 'متوسط' : 'منخفض'}
                            </Badge>
                          </div>
                          
                          <h3 className="font-semibold mb-2">{interaction.subject}</h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            {interaction.description}
                          </p>
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>بواسطة: {interaction.created_by}</span>
                            <span>التاريخ: {formatDate(interaction.created_at)}</span>
                            {interaction.follow_up_date && (
                              <span>متابعة في: {formatDate(interaction.follow_up_date)}</span>
                            )}
                          </div>
                          
                          {interaction.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {interaction.tags.map((tag, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <Badge variant="outline" className={
                          interaction.outcome === 'positive' ? 'text-green-600 bg-green-100' :
                          interaction.outcome === 'negative' ? 'text-red-600 bg-red-100' :
                          interaction.outcome === 'pending' ? 'text-orange-600 bg-orange-100' : 'text-gray-600 bg-gray-100'
                        }>
                          {interaction.outcome === 'positive' ? 'إيجابي' :
                           interaction.outcome === 'negative' ? 'سلبي' :
                           interaction.outcome === 'pending' ? 'قيد المراجعة' : 'محايد'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* تبويب الحملات */}
        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-purple-600" />
                  الحملات التسويقية
                </CardTitle>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="h-4 w-4 ml-2" />
                  حملة جديدة
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.campaigns.map((campaign) => (
                  <Card key={campaign.id} className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => {
                          setSelectedCampaign(campaign);
                          setShowCampaignDialog(true);
                        }}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary">
                              {campaign.type === 'email' ? 'بريد إلكتروني' :
                               campaign.type === 'sms' ? 'رسائل نصية' :
                               campaign.type === 'social' ? 'وسائل التواصل' :
                               campaign.type === 'direct_mail' ? 'بريد مباشر' : 'مكالمات'}
                            </Badge>
                            <Badge variant="outline" className={
                              campaign.status === 'active' ? 'text-green-600 bg-green-100' :
                              campaign.status === 'completed' ? 'text-blue-600 bg-blue-100' :
                              campaign.status === 'paused' ? 'text-orange-600 bg-orange-100' : 'text-gray-600 bg-gray-100'
                            }>
                              {campaign.status === 'active' ? 'نشطة' :
                               campaign.status === 'completed' ? 'مكتملة' :
                               campaign.status === 'paused' ? 'متوقفة' : 'مسودة'}
                            </Badge>
                          </div>
                          
                          <h3 className="font-semibold mb-2">{campaign.name}</h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            {campaign.description}
                          </p>
                          
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">الوصول:</span>
                                <span className="font-medium ml-2">{campaign.reach.toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">معدل التفاعل:</span>
                                <span className="font-medium ml-2">{campaign.engagement_rate}%</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">التحويل:</span>
                                <span className="font-medium ml-2">{campaign.conversion_rate}%</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">ROI:</span>
                                <span className="font-medium ml-2 text-green-600">{campaign.roi}%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-3 border-t">
                        <div className="text-xs text-muted-foreground">
                          {formatDate(campaign.start_date)} - {campaign.end_date ? formatDate(campaign.end_date) : 'مستمرة'}
                        </div>
                        <div className="text-sm font-medium">
                          الميزانية: {formatCurrency(campaign.budget, brandConfig)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* تبويب الأتمتة */}
        <TabsContent value="automations" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-orange-600" />
                  قواعد الأتمتة
                </CardTitle>
                <Button className="bg-orange-600 hover:bg-orange-700">
                  <Plus className="h-4 w-4 ml-2" />
                  قاعدة جديدة
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.automations.map((automation) => (
                  <Card key={automation.id} className="border-l-4 border-l-orange-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className={
                              automation.status === 'active' ? 'text-green-600 bg-green-100' :
                              automation.status === 'inactive' ? 'text-red-600 bg-red-100' : 'text-gray-600 bg-gray-100'
                            }>
                              {automation.status === 'active' ? 'نشطة' :
                               automation.status === 'inactive' ? 'غير نشطة' : 'مسودة'}
                            </Badge>
                            <Badge variant="secondary">
                              {automation.trigger === 'new_customer' ? 'عميل جديد' :
                               automation.trigger === 'abandoned_cart' ? 'سلة متروكة' :
                               automation.trigger === 'birthday' ? 'عيد ميلاد' :
                               automation.trigger === 'purchase' ? 'شراء' :
                               automation.trigger === 'no_activity' ? 'عدم نشاط' : 'مخصص'}
                            </Badge>
                          </div>
                          
                          <h3 className="font-semibold mb-2">{automation.name}</h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            {automation.description}
                          </p>
                          
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">مرات التنفيذ:</span>
                              <span className="font-medium ml-2">{automation.execution_count}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">معدل النجاح:</span>
                              <span className="font-medium ml-2 text-green-600">{automation.success_rate}%</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">الإجراءات:</span>
                              <span className="font-medium ml-2">{automation.actions.length}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <Progress value={automation.success_rate} className="w-20 mb-2" />
                          <div className="text-xs text-muted-foreground">معدل النجاح</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* تبويب التحليلات */}
        <TabsContent value="analytics" className="space-y-6">
          {/* توزيع القطاعات */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-cyan-600" />
                توزيع العملاء حسب القطاعات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(data.analytics.segments).map(([segment, count]) => {
                  const SegmentIcon = segmentIcons[segment as keyof typeof segmentIcons] || Users;
                  const percentage = (count / data.analytics.summary.total_customers * 100).toFixed(1);
                  
                  return (
                    <Card key={segment} className="text-center">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-center mb-3">
                          <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full">
                            <SegmentIcon className="h-5 w-5 text-white" />
                          </div>
                        </div>
                        <h3 className="font-semibold mb-1">
                          {segment === 'vip' ? 'VIP' :
                           segment === 'premium' ? 'مميز' :
                           segment === 'standard' ? 'عادي' : 'أساسي'}
                        </h3>
                        <div className="text-2xl font-bold mb-1">{count.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">{percentage}%</div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          
          {/* مصادر العملاء */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-teal-600" />
                مصادر العملاء
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(data.analytics.sources).map(([source, count]) => {
                  const percentage = (count / data.analytics.summary.total_customers * 100).toFixed(1);
                  
                  return (
                    <div key={source} className="flex items-center gap-3">
                      <div className="w-24 text-sm">
                        {source === 'website' ? 'الموقع' :
                         source === 'referral' ? 'إحالة' :
                         source === 'advertising' ? 'إعلانات' :
                         source === 'social_media' ? 'وسائل التواصل' :
                         source === 'direct' ? 'مباشر' : 'شراكة'}
                      </div>
                      <div className="flex-1">
                        <Progress value={parseFloat(percentage)} className="h-2" />
                      </div>
                      <div className="w-16 text-sm text-right">
                        {count.toLocaleString()} ({percentage}%)
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* مربع حوار تفاصيل العميل */}
      <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              تفاصيل العميل
            </DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">الاسم الكامل</label>
                    <p className="text-lg font-semibold">
                      {selectedCustomer.first_name} {selectedCustomer.last_name}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">البريد الإلكتروني</label>
                    <p>{selectedCustomer.email}</p>
                  </div>
                  
                  {selectedCustomer.phone && (
                    <div>
                      <label className="text-sm font-medium">رقم الهاتف</label>
                      <p>{selectedCustomer.phone}</p>
                    </div>
                  )}
                  
                  {selectedCustomer.company && (
                    <div>
                      <label className="text-sm font-medium">الشركة</label>
                      <p>{selectedCustomer.company}</p>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">الحالة</label>
                      <Badge className={statusColors[selectedCustomer.status]}>
                        {selectedCustomer.status === 'active' ? 'نشط' :
                         selectedCustomer.status === 'inactive' ? 'غير نشط' :
                         selectedCustomer.status === 'prospect' ? 'محتمل' :
                         selectedCustomer.status === 'lead' ? 'عميل محتمل' : 'فاقد'}
                      </Badge>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">القطاع</label>
                      <Badge variant="outline">
                        {selectedCustomer.segment === 'vip' ? 'VIP' :
                         selectedCustomer.segment === 'premium' ? 'مميز' :
                         selectedCustomer.segment === 'standard' ? 'عادي' : 'أساسي'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">إجمالي الطلبات</label>
                    <p className="text-xl font-bold text-green-600">{selectedCustomer.total_orders}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">إجمالي المبيعات</label>
                    <p className="text-xl font-bold text-blue-600">
                      {formatCurrency(selectedCustomer.total_spent, brandConfig)}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">قيمة دورة الحياة</label>
                    <p className="text-xl font-bold text-purple-600">
                      {formatCurrency(selectedCustomer.lifetime_value, brandConfig)}
                    </p>
                  </div>
                </div>
              </div>
              
              {selectedCustomer.preferences && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">تفضيلات العميل</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">قناة التواصل المفضلة</label>
                      <p>{selectedCustomer.preferences.communication_channel}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">موافقة التسويق</label>
                      <Badge variant={selectedCustomer.preferences.marketing_consent ? "default" : "secondary"}>
                        {selectedCustomer.preferences.marketing_consent ? 'موافق' : 'غير موافق'}
                      </Badge>
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium">الاهتمامات</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedCustomer.preferences.interests.map((interest, index) => (
                          <Badge key={index} variant="outline">{interest}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex gap-2 pt-4 border-t">
                <Button>
                  <Edit className="h-4 w-4 ml-2" />
                  تعديل
                </Button>
                <Button variant="outline">
                  <Mail className="h-4 w-4 ml-2" />
                  إرسال بريد
                </Button>
                <Button variant="outline">
                  <Phone className="h-4 w-4 ml-2" />
                  اتصال
                </Button>
                <Button variant="outline">
                  <MessageSquare className="h-4 w-4 ml-2" />
                  تفاعل جديد
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* مربع حوار تفاصيل الحملة */}
      <Dialog open={showCampaignDialog} onOpenChange={setShowCampaignDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-purple-600" />
              تفاصيل الحملة
            </DialogTitle>
          </DialogHeader>
          {selectedCampaign && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{selectedCampaign.name}</h3>
                <p className="text-muted-foreground mt-2">{selectedCampaign.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">نوع الحملة</label>
                  <p>{selectedCampaign.type === 'email' ? 'بريد إلكتروني' :
                      selectedCampaign.type === 'sms' ? 'رسائل نصية' :
                      selectedCampaign.type === 'social' ? 'وسائل التواصل' : 'أخرى'}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium">الحالة</label>
                  <Badge className={
                    selectedCampaign.status === 'active' ? 'text-green-600 bg-green-100' :
                    selectedCampaign.status === 'completed' ? 'text-blue-600 bg-blue-100' : 'text-gray-600 bg-gray-100'
                  }>
                    {selectedCampaign.status === 'active' ? 'نشطة' :
                     selectedCampaign.status === 'completed' ? 'مكتملة' : 'أخرى'}
                  </Badge>
                </div>
                
                <div>
                  <label className="text-sm font-medium">الميزانية</label>
                  <p className="font-medium">{formatCurrency(selectedCampaign.budget, brandConfig)}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium">الوصول</label>
                  <p className="font-medium">{selectedCampaign.reach.toLocaleString()}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium">معدل التفاعل</label>
                  <div className="flex items-center gap-2">
                    <Progress value={selectedCampaign.engagement_rate} className="flex-1" />
                    <span className="text-sm font-medium">{selectedCampaign.engagement_rate}%</span>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">معدل التحويل</label>
                  <div className="flex items-center gap-2">
                    <Progress value={selectedCampaign.conversion_rate} className="flex-1" />
                    <span className="text-sm font-medium">{selectedCampaign.conversion_rate}%</span>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">عائد الاستثمار (ROI)</label>
                <div className="text-2xl font-bold text-green-600">{selectedCampaign.roi}%</div>
              </div>
              
              <div className="flex gap-2 pt-4 border-t">
                <Button>
                  <Edit className="h-4 w-4 ml-2" />
                  تعديل الحملة
                </Button>
                <Button variant="outline">
                  <BarChart3 className="h-4 w-4 ml-2" />
                  عرض التفاصيل
                </Button>
                <Button variant="outline" onClick={() => setShowCampaignDialog(false)}>
                  إغلاق
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}