'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus,
  FileText,
  Bell,
  TrendingUp,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Truck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NewOrderForm } from '@/components/orders/new-order-form-enhanced';
import { PreviousOrders } from '@/components/orders/previous-orders';
import { useToast } from '@/hooks/use-toast';

// أنواع البيانات للطلبات المحسنة
interface OrderStatus {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'delivered' | 'manager_review';
  count: number;
  hasNew: boolean;
}

interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  approvedOrders: number;
  deliveredOrders: number;
  managerReviewOrders: number;
  totalValue: number;
  avgOrderValue: number;
}

export default function EnhancedOrdersPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('new-order');
  const [orderStats, setOrderStats] = useState<OrderStats>({
    totalOrders: 0,
    pendingOrders: 0,
    approvedOrders: 0,
    deliveredOrders: 0,
    managerReviewOrders: 0,
    totalValue: 0,
    avgOrderValue: 0
  });
  
  const [orderStatuses, setOrderStatuses] = useState<OrderStatus[]>([
    { id: 'all', status: 'pending', count: 0, hasNew: false },
    { id: 'manager_review', status: 'manager_review', count: 0, hasNew: true },
    { id: 'approved', status: 'approved', count: 0, hasNew: false },
    { id: 'delivered', status: 'delivered', count: 0, hasNew: false }
  ]);

  // تحديث الإحصائيات
  useEffect(() => {
    loadOrderStats();
  }, [session]);

  const loadOrderStats = async () => {
    try {
      // هنا سيتم جلب البيانات من الـ API
      // مؤقتاً سنستخدم بيانات تجريبية
      setOrderStats({
        totalOrders: 45,
        pendingOrders: 12,
        approvedOrders: 8,
        deliveredOrders: 20,
        managerReviewOrders: 5,
        totalValue: 125500,
        avgOrderValue: 2788.89
      });
      
      setOrderStatuses([
        { id: 'all', status: 'pending', count: 45, hasNew: false },
        { id: 'manager_review', status: 'manager_review', count: 5, hasNew: true },
        { id: 'approved', status: 'approved', count: 8, hasNew: true },
        { id: 'delivered', status: 'delivered', count: 20, hasNew: false }
      ]);
    } catch (error) {
      console.error('Error loading order stats:', error);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          label: 'الكل',
          icon: Package,
          color: 'bg-blue-500',
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-700'
        };
      case 'manager_review':
        return {
          label: 'في الانتظار',
          icon: Clock,
          color: 'bg-yellow-500',
          bgColor: 'bg-yellow-50',
          textColor: 'text-yellow-700'
        };
      case 'approved':
        return {
          label: 'موافق عليه',
          icon: CheckCircle,
          color: 'bg-green-500',
          bgColor: 'bg-green-50',
          textColor: 'text-green-700'
        };
      case 'delivered':
        return {
          label: 'تم التسليم',
          icon: Truck,
          color: 'bg-purple-500',
          bgColor: 'bg-purple-50',
          textColor: 'text-purple-700'
        };
      default:
        return {
          label: status,
          icon: AlertTriangle,
          color: 'bg-gray-500',
          bgColor: 'bg-gray-50',
          textColor: 'text-gray-700'
        };
    }
  };

  const handleOrderSubmit = async (orderData: any) => {
    try {
      // هنا سيتم إرسال الطلب للـ API
      console.log('إرسال طلب جديد:', orderData);
      
      toast({
        title: "تم إرسال الطلب بنجاح",
        description: `تم إرسال الطلب للمراجعة. سيتم إشعارك عند اعتماد الطلب.`,
      });

      // تحديث الإحصائيات
      await loadOrderStats();
      
      // التبديل للطلبات السابقة
      setActiveTab('previous-orders');
    } catch (error) {
      toast({
        title: "خطأ في إرسال الطلب",
        description: "حدث خطأ أثناء إرسال الطلب، يرجى المحاولة مرة أخرى",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto py-6 px-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                إدارة الطلبات
              </h1>
              <p className="text-gray-600 mt-2">إنشاء ومتابعة طلباتك بكفاءة</p>
            </div>
            
            {/* Quick Stats */}
            <div className="hidden md:flex items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{orderStats.totalOrders}</div>
                <div className="text-xs text-gray-500">إجمالي الطلبات</div>
              </div>
              <div className="w-px h-12 bg-gray-200" />
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{orderStats.totalValue.toLocaleString()} ج.م</div>
                <div className="text-xs text-gray-500">إجمالي القيمة</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-6 px-4">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">إجمالي الطلبات</p>
                  <p className="text-3xl font-bold">{orderStats.totalOrders}</p>
                </div>
                <Package className="h-8 w-8 text-blue-200" />
              </div>
              <p className="text-blue-100 text-xs mt-2">
                متوسط القيمة: {orderStats.avgOrderValue.toFixed(0)} ج.م
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500 to-orange-500 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm">قيد الانتظار</p>
                  <p className="text-3xl font-bold">{orderStats.pendingOrders}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-200" />
              </div>
              {orderStats.managerReviewOrders > 0 && (
                <div className="flex items-center mt-2">
                  <Bell className="h-3 w-3 text-yellow-200 ml-1" />
                  <p className="text-yellow-100 text-xs">{orderStats.managerReviewOrders} طلب جديد</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">معتمد</p>
                  <p className="text-3xl font-bold">{orderStats.approvedOrders}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-200" />
              </div>
              <p className="text-green-100 text-xs mt-2">جاهز للتسليم</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">تم التسليم</p>
                  <p className="text-3xl font-bold">{orderStats.deliveredOrders}</p>
                </div>
                <Truck className="h-8 w-8 text-purple-200" />
              </div>
              <p className="text-purple-100 text-xs mt-2">مكتمل</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white p-1 rounded-lg border shadow-sm">
            <TabsTrigger 
              value="new-order" 
              className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white"
            >
              <Plus className="h-4 w-4" />
              طلب جديد
            </TabsTrigger>
            <TabsTrigger 
              value="previous-orders" 
              className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white relative"
            >
              <FileText className="h-4 w-4" />
              الطلبات السابقة
              {orderStatuses.some(s => s.hasNew) && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 bg-red-500 text-white text-xs flex items-center justify-center">
                  !
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="new-order" className="mt-6">
            <Card className="bg-white shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  إنشاء طلب جديد
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <NewOrderForm 
                  currentUser={session?.user}
                  onSubmit={handleOrderSubmit}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="previous-orders" className="mt-6">
            <Card className="bg-white shadow-lg">
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-500" />
                    الطلبات السابقة
                  </CardTitle>
                  
                  {/* Status Tabs with Counts */}
                  <div className="flex items-center gap-2">
                    {orderStatuses.map((statusItem) => {
                      const info = getStatusInfo(statusItem.status);
                      const Icon = info.icon;
                      
                      return (
                        <div 
                          key={statusItem.id}
                          className={cn(
                            "relative flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors cursor-pointer",
                            info.bgColor,
                            info.textColor
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="text-sm font-medium">{info.label}</span>
                          <Badge 
                            className={cn(
                              "ml-1 text-white text-xs",
                              info.color
                            )}
                          >
                            {statusItem.count}
                          </Badge>
                          {statusItem.hasNew && (
                            <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <PreviousOrders 
                  orders={[]}
                  currentUser={session?.user}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}