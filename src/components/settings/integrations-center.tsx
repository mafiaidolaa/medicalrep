"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CreditCard,
  Map,
  Bell,
  Cloud,
  BarChart3,
  Share2,
  Archive,
  Settings,
  Key,
  TestTube,
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Eye,
  EyeOff,
  Save,
  Trash2,
  Plus,
  Zap,
  Shield,
  ExternalLink,
  Info
} from 'lucide-react';

// أيقونات التصنيفات
const categoryIcons = {
  CreditCard,
  Map,
  Bell,
  Cloud,
  BarChart3,
  Share2,
  Archive,
};

// أيقونات حالة الخدمة
const statusIcons = {
  active: CheckCircle,
  inactive: XCircle,
  testing: TestTube,
  error: AlertTriangle,
};

// ألوان حالة الخدمة
const statusColors = {
  active: 'text-green-500',
  inactive: 'text-gray-400',
  testing: 'text-yellow-500',
  error: 'text-red-500',
};

interface IntegrationCategory {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  icon?: string;
  color: string;
  sort_order: number;
  is_enabled: boolean;
}

interface ServiceIntegration {
  id: string;
  category_id: string;
  service_key: string;
  display_name: string;
  description?: string;
  provider_name?: string;
  service_type: string;
  icon?: string;
  status: 'active' | 'inactive' | 'testing' | 'error';
  is_enabled: boolean;
  requires_api_key: boolean;
  requires_secret: boolean;
  api_endpoint?: string;
  documentation_url?: string;
  features: string[];
  category?: IntegrationCategory;
  health?: any;
}

interface IntegrationsData {
  categories: IntegrationCategory[];
  services: ServiceIntegration[];
  summary: {
    totalServices: number;
    activeServices: number;
    categories: number;
    healthyServices: number;
  };
}

export function IntegrationsCenter() {
  const [data, setData] = useState<IntegrationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedService, setSelectedService] = useState<ServiceIntegration | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [credentials, setCredentials] = useState<{[key: string]: string}>({});
  const [showCredentials, setShowCredentials] = useState<{[key: string]: boolean}>({});
  const [testResults, setTestResults] = useState<{[key: string]: any}>({});

  // جلب البيانات الأولية
  useEffect(() => {
    fetchIntegrationsData();
  }, []);

  const fetchIntegrationsData = async () => {
    try {
      setLoading(true);
      
      // محاكاة تأخير التحميل
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // بيانات محاكاة للتصنيفات
      const categoriesData = [
        {
          id: 'payment',
          name: 'payment',
          display_name: 'المدفوعات والتحصيل',
          description: 'خدمات الدفع والتحصيل الإلكتروني',
          icon: 'CreditCard',
          color: '#10B981',
          sort_order: 1,
          is_enabled: true
        },
        {
          id: 'shipping',
          name: 'shipping',
          display_name: 'الشحن والتوصيل',
          description: 'خدمات الشحن وتتبع الطلبات',
          icon: 'Map',
          color: '#3B82F6',
          sort_order: 2,
          is_enabled: true
        },
        {
          id: 'notifications',
          name: 'notifications',
          display_name: 'التنبيهات والإشعارات',
          description: 'أنظمة الإشعارات والتنبيهات',
          icon: 'Bell',
          color: '#F59E0B',
          sort_order: 3,
          is_enabled: true
        },
        {
          id: 'storage',
          name: 'storage',
          display_name: 'التخزين السحابي',
          description: 'خدمات التخزين والنسخ الاحتياطي',
          icon: 'Cloud',
          color: '#8B5CF6',
          sort_order: 4,
          is_enabled: true
        },
        {
          id: 'analytics',
          name: 'analytics',
          display_name: 'التحليلات والإحصائيات',
          description: 'أدوات التحليل وقياس الأداء',
          icon: 'BarChart3',
          color: '#EF4444',
          sort_order: 5,
          is_enabled: true
        },
        {
          id: 'social',
          name: 'social',
          display_name: 'وسائل التواصل',
          description: 'منصات التواصل الاجتماعي',
          icon: 'Share2',
          color: '#06B6D4',
          sort_order: 6,
          is_enabled: true
        },
        {
          id: 'backup',
          name: 'backup',
          display_name: 'النسخ الاحتياطي',
          description: 'أنظمة النسخ الاحتياطي والاسترداد',
          icon: 'Archive',
          color: '#84CC16',
          sort_order: 7,
          is_enabled: true
        }
      ];
      
      // بيانات محاكاة للخدمات
      const servicesData = [
        // خدمات الدفع
        {
          id: 'paypal',
          category_id: 'payment',
          service_key: 'paypal',
          display_name: 'PayPal',
          description: 'نظام الدفع الإلكتروني العالمي',
          provider_name: 'PayPal Inc.',
          service_type: 'payment_gateway',
          status: 'active' as const,
          is_enabled: true,
          requires_api_key: true,
          requires_secret: true,
          api_endpoint: 'https://api.paypal.com',
          documentation_url: 'https://developer.paypal.com',
          features: ['معالجة المدفوعات', 'إدارة الاشتراكات', 'المبالغ المستردة'],
          health: { status: 'healthy', response_time: 120 }
        },
        {
          id: 'stripe',
          category_id: 'payment',
          service_key: 'stripe',
          display_name: 'Stripe',
          description: 'منصة المدفوعات للشركات',
          provider_name: 'Stripe Inc.',
          service_type: 'payment_gateway',
          status: 'active' as const,
          is_enabled: true,
          requires_api_key: true,
          requires_secret: true,
          api_endpoint: 'https://api.stripe.com',
          documentation_url: 'https://stripe.com/docs',
          features: ['معالجة البطاقات', 'المحافظ الرقمية', 'التقسيط'],
          health: { status: 'healthy', response_time: 95 }
        },
        // خدمات الشحن
        {
          id: 'aramex',
          category_id: 'shipping',
          service_key: 'aramex',
          display_name: 'أرامكس',
          description: 'شركة الشحن والتوصيل',
          provider_name: 'Aramex',
          service_type: 'shipping',
          status: 'active' as const,
          is_enabled: true,
          requires_api_key: true,
          requires_secret: false,
          api_endpoint: 'https://ws.aramex.net',
          documentation_url: 'https://www.aramex.com/developers',
          features: ['تتبع الشحنات', 'حساب التكلفة', 'جدولة التسليم'],
          health: { status: 'healthy', response_time: 200 }
        },
        // خدمات التنبيهات
        {
          id: 'twilio',
          category_id: 'notifications',
          service_key: 'twilio',
          display_name: 'Twilio',
          description: 'منصة الاتصالات السحابية',
          provider_name: 'Twilio Inc.',
          service_type: 'sms',
          status: 'testing' as const,
          is_enabled: false,
          requires_api_key: true,
          requires_secret: true,
          api_endpoint: 'https://api.twilio.com',
          documentation_url: 'https://www.twilio.com/docs',
          features: ['الرسائل النصية', 'المكالمات الصوتية', 'الواتساب'],
          health: { status: 'testing', response_time: 150 }
        },
        // خدمات التخزين السحابي
        {
          id: 'aws-s3',
          category_id: 'storage',
          service_key: 'aws_s3',
          display_name: 'Amazon S3',
          description: 'خدمة التخزين السحابي من أمازون',
          provider_name: 'Amazon Web Services',
          service_type: 'storage',
          status: 'active' as const,
          is_enabled: true,
          requires_api_key: true,
          requires_secret: true,
          api_endpoint: 'https://s3.amazonaws.com',
          documentation_url: 'https://docs.aws.amazon.com/s3/',
          features: ['تخزين الملفات', 'النسخ الاحتياطي', 'CDN'],
          health: { status: 'healthy', response_time: 80 }
        },
        // خدمات التحليلات
        {
          id: 'google-analytics',
          category_id: 'analytics',
          service_key: 'google_analytics',
          display_name: 'Google Analytics',
          description: 'أداة تحليل المواقع من جوجل',
          provider_name: 'Google',
          service_type: 'analytics',
          status: 'inactive' as const,
          is_enabled: false,
          requires_api_key: true,
          requires_secret: false,
          api_endpoint: 'https://analyticsreporting.googleapis.com',
          documentation_url: 'https://developers.google.com/analytics',
          features: ['تحليل الزوار', 'تتبع التحويلات', 'التقارير'],
          health: { status: 'unknown', response_time: 0 }
        }
      ];
      
      // إضافة معلومات التصنيف لكل خدمة
      const servicesWithCategories = servicesData.map(service => ({
        ...service,
        category: categoriesData.find(cat => cat.id === service.category_id)
      }));
      
      // حساب الإحصائيات
      const summary = {
        totalServices: servicesWithCategories.length,
        activeServices: servicesWithCategories.filter(s => s.status === 'active').length,
        categories: categoriesData.length,
        healthyServices: servicesWithCategories.filter(s => s.health?.status === 'healthy').length
      };
      
      setData({
        categories: categoriesData,
        services: servicesWithCategories,
        summary
      });
      
    } catch (error) {
      console.error('خطأ في جلب بيانات التكاملات:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceToggle = async (service: ServiceIntegration, enabled: boolean) => {
    try {
      // محاكاة تأخير API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // تحديث البيانات المحلية
      setData(prev => prev ? {
        ...prev,
        services: prev.services.map(s => 
          s.id === service.id ? { 
            ...s, 
            is_enabled: enabled,
            status: enabled ? 'active' : 'inactive' as const
          } : s
        ),
        summary: {
          ...prev.summary,
          activeServices: prev.services.filter(s => 
            s.id === service.id ? enabled : s.status === 'active'
          ).length
        }
      } : null);
      
    } catch (error) {
      console.error('خطأ في تغيير حالة التفعيل:', error);
    }
  };

  const handleTestConnection = async (service: ServiceIntegration) => {
    try {
      setTestResults(prev => ({ ...prev, [service.id]: { loading: true } }));
      
      // محاكاة اختبار الاتصال
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // محاكاة نتائج مختلفة
      const mockResults = {
        paypal: { success: true, message: 'تم الاتصال بنجاح', response_time: 120 },
        stripe: { success: true, message: 'تم الاتصال بنجاح', response_time: 95 },
        aramex: { success: true, message: 'تم الاتصال بنجاح', response_time: 200 },
        twilio: { success: false, message: 'فشل في الاتصال - تحقق من الإعدادات', response_time: 0 },
        'aws-s3': { success: true, message: 'تم الاتصال بنجاح', response_time: 80 },
        'google-analytics': { success: false, message: 'الخدمة غير مفعلة', response_time: 0 }
      };
      
      const result = mockResults[service.id as keyof typeof mockResults] || {
        success: Math.random() > 0.3,
        message: Math.random() > 0.3 ? 'تم الاتصال بنجاح' : 'فشل في الاتصال',
        response_time: Math.floor(Math.random() * 300) + 50
      };
      
      setTestResults(prev => ({ ...prev, [service.id]: result }));
      
    } catch (error) {
      console.error('خطأ في اختبار الاتصال:', error);
      setTestResults(prev => ({ ...prev, [service.id]: { 
        success: false, 
        message: 'فشل في الاختبار',
        response_time: 0
      }}));
    }
  };

  const handleSaveCredentials = async (service: ServiceIntegration) => {
    try {
      const apiKey = credentials[`${service.id}_api_key`];
      const secret = credentials[`${service.id}_secret`];
      
      // محاكاة حفظ المعرفات
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // حفظ المعرفات في localStorage (للعرض فقط)
      const savedCredentials = JSON.parse(localStorage.getItem('integration_credentials') || '{}');
      
      if (apiKey && service.requires_api_key) {
        savedCredentials[`${service.id}_api_key`] = '***' + apiKey.slice(-4);
      }
      
      if (secret && service.requires_secret) {
        savedCredentials[`${service.id}_secret`] = '***' + secret.slice(-4);
      }
      
      localStorage.setItem('integration_credentials', JSON.stringify(savedCredentials));
      
      // مسح الحقول بعد الحفظ
      setCredentials(prev => ({
        ...prev,
        [`${service.id}_api_key`]: '',
        [`${service.id}_secret`]: ''
      }));
      
      // إغلاق نافذة الإعداد
      setIsConfigModalOpen(false);
      setSelectedService(null);
      
      alert('تم حفظ بيانات الاعتماد بنجاح');
      
    } catch (error) {
      console.error('خطأ في حفظ بيانات الاعتماد:', error);
      alert('فشل في حفظ بيانات الاعتماد');
    }
  };

  // تصفية الخدمات حسب التصنيف
  const filteredServices = data?.services.filter(service => 
    selectedCategory === 'all' || service.category_id === selectedCategory
  ) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-muted-foreground">جاري تحميل التكاملات...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          فشل في تحميل بيانات التكاملات. يرجى المحاولة لاحقاً.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Zap className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الخدمات</p>
                <p className="text-xl font-bold">{data.summary.totalServices}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">خدمات نشطة</p>
                <p className="text-xl font-bold">{data.summary.activeServices}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Archive className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">التصنيفات</p>
                <p className="text-xl font-bold">{data.summary.categories}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
                <Activity className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">خدمات سليمة</p>
                <p className="text-xl font-bold">{data.summary.healthyServices}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* شريط التصنيفات */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Archive className="h-5 w-5" />
                التصنيفات
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <div className="p-4 space-y-2">
                  <Button
                    variant={selectedCategory === 'all' ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setSelectedCategory('all')}
                  >
                    <Settings className="h-4 w-4 ml-2" />
                    جميع الخدمات
                  </Button>
                  
                  {data.categories.map((category) => {
                    const IconComponent = categoryIcons[category.icon as keyof typeof categoryIcons] || Settings;
                    const servicesCount = data.services.filter(s => s.category_id === category.id).length;
                    
                    return (
                      <Button
                        key={category.id}
                        variant={selectedCategory === category.id ? 'default' : 'ghost'}
                        className="w-full justify-between"
                        onClick={() => setSelectedCategory(category.id)}
                      >
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4" />
                          <span>{category.display_name}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {servicesCount}
                        </Badge>
                      </Button>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* قائمة الخدمات */}
        <div className="lg:col-span-3">
          <div className="space-y-4">
            {filteredServices.map((service) => {
              const StatusIcon = statusIcons[service.status];
              const statusColor = statusColors[service.status];
              const testResult = testResults[service.id];
              
              return (
                <Card key={service.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-lg ${service.category?.color || 'bg-gray-500'} text-white`}>
                              {/* يمكن استخدام أيقونة مخصصة هنا */}
                              <Settings className="h-4 w-4" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg">{service.display_name}</h3>
                              <p className="text-sm text-muted-foreground">{service.provider_name}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <StatusIcon className={`h-4 w-4 ${statusColor}`} />
                              <Badge variant={service.status === 'active' ? 'default' : 'secondary'}>
                                {service.status === 'active' ? 'نشط' : 
                                 service.status === 'inactive' ? 'غير نشط' :
                                 service.status === 'testing' ? 'اختبار' : 'خطأ'}
                              </Badge>
                            </div>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-3">
                            {service.description}
                          </p>
                          
                          {/* المميزات */}
                          <div className="flex flex-wrap gap-1 mb-4">
                            {service.features.map((feature, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={service.is_enabled}
                            onCheckedChange={(enabled) => handleServiceToggle(service, enabled)}
                          />
                        </div>
                      </div>
                      
                      {/* أزرار الإجراءات */}
                      <div className="flex items-center gap-2 pt-4 border-t">
                        <Dialog 
                          open={isConfigModalOpen && selectedService?.id === service.id}
                          onOpenChange={(open) => {
                            setIsConfigModalOpen(open);
                            if (open) setSelectedService(service);
                            else setSelectedService(null);
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Key className="h-4 w-4 ml-2" />
                              تكوين
                            </Button>
                          </DialogTrigger>
                        </Dialog>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestConnection(service)}
                          disabled={testResult?.loading}
                        >
                          {testResult?.loading ? (
                            <Activity className="h-4 w-4 ml-2 animate-spin" />
                          ) : (
                            <TestTube className="h-4 w-4 ml-2" />
                          )}
                          اختبار
                        </Button>
                        
                        {service.documentation_url && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={service.documentation_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 ml-2" />
                              المساعدة
                            </a>
                          </Button>
                        )}
                        
                        {/* نتيجة الاختبار */}
                        {testResult && !testResult.loading && (
                          <div className={`text-xs px-2 py-1 rounded ${
                            testResult.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {testResult.message}
                            {testResult.responseTime && ` (${testResult.responseTime}ms)`}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            
            {filteredServices.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">لا توجد خدمات</h3>
                  <p className="text-muted-foreground">
                    لا توجد خدمات تكامل في هذا التصنيف حالياً.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* نافذة التكوين */}
      {selectedService && (
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              تكوين {selectedService.display_name}
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="credentials" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="credentials">بيانات الاعتماد</TabsTrigger>
              <TabsTrigger value="settings">الإعدادات</TabsTrigger>
            </TabsList>
            
            <TabsContent value="credentials" className="space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  جميع بيانات الاعتماد يتم تشفيرها وحفظها بأمان. لن يتمكن أحد من رؤية هذه البيانات.
                </AlertDescription>
              </Alert>
              
              {selectedService.requires_api_key && (
                <div className="space-y-2">
                  <Label htmlFor="api-key">مفتاح API</Label>
                  <div className="relative">
                    <Input
                      id="api-key"
                      type={showCredentials[`${selectedService.id}_api_key`] ? 'text' : 'password'}
                      placeholder="أدخل مفتاح API..."
                      value={credentials[`${selectedService.id}_api_key`] || ''}
                      onChange={(e) => setCredentials(prev => ({
                        ...prev,
                        [`${selectedService.id}_api_key`]: e.target.value
                      }))}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute left-2 top-1/2 -translate-y-1/2"
                      onClick={() => setShowCredentials(prev => ({
                        ...prev,
                        [`${selectedService.id}_api_key`]: !prev[`${selectedService.id}_api_key`]
                      }))}
                    >
                      {showCredentials[`${selectedService.id}_api_key`] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
              
              {selectedService.requires_secret && (
                <div className="space-y-2">
                  <Label htmlFor="secret-key">المفتاح السري</Label>
                  <div className="relative">
                    <Input
                      id="secret-key"
                      type={showCredentials[`${selectedService.id}_secret`] ? 'text' : 'password'}
                      placeholder="أدخل المفتاح السري..."
                      value={credentials[`${selectedService.id}_secret`] || ''}
                      onChange={(e) => setCredentials(prev => ({
                        ...prev,
                        [`${selectedService.id}_secret`]: e.target.value
                      }))}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute left-2 top-1/2 -translate-y-1/2"
                      onClick={() => setShowCredentials(prev => ({
                        ...prev,
                        [`${selectedService.id}_secret`]: !prev[`${selectedService.id}_secret`]
                      }))}
                    >
                      {showCredentials[`${selectedService.id}_secret`] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={() => handleSaveCredentials(selectedService)}
                  className="flex-1"
                >
                  <Save className="h-4 w-4 ml-2" />
                  حفظ بيانات الاعتماد
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleTestConnection(selectedService)}
                >
                  <TestTube className="h-4 w-4 ml-2" />
                  اختبار
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="settings" className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  إعدادات إضافية خاصة بهذه الخدمة. ستتم إضافة المزيد من الخيارات قريباً.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="environment">البيئة</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر البيئة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">اختبار (Sandbox)</SelectItem>
                      <SelectItem value="production">الإنتاج (Production)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="timeout">مهلة الاتصال (ثانية)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    placeholder="30"
                    min="5"
                    max="300"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notes">ملاحظات</Label>
                  <Textarea
                    id="notes"
                    placeholder="أضف أي ملاحظات حول هذا التكامل..."
                    rows={3}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      )}
    </div>
  );
}