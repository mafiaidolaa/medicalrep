"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, 
  Warehouse, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  BarChart3,
  MapPin,
  Clock,
  DollarSign,
  ShoppingCart,
  Archive,
  ArrowRightLeft
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import WarehouseManagement from '@/components/stock/WarehouseManagement';
import StockMovementTracking from '@/components/stock/StockMovementTracking';
import StockAlertsCenter from '@/components/stock/StockAlertsCenter';
import StockAnalyticsDashboard from '@/components/stock/StockAnalyticsDashboard';

export default function StockManagementPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const { toast } = useToast();

  const mockDashboardData = {
    summary: {
      totalProducts: 1250,
      totalStockValue: 2450000,
      activeAlerts: 15,
      criticalAlerts: 3,
      lowStockItems: 8,
      pendingReorders: 5
    },
    stockSummary: [
      { product_name: 'أموكسيسيلين 500mg', total_on_hand: 1200, total_value: 48000, product_line: 'Line 1' },
      { product_name: 'باراسيتامول 500mg', total_on_hand: 800, total_value: 32000, product_line: 'Line 1' }
    ],
    activeAlerts: [
      { title: 'مخزون منخفض', product_name: 'إيبوبروفين 400mg', severity: 'HIGH', current_quantity: 15 },
      { title: 'انتهاء صلاحية قريب', product_name: 'أسبرين 100mg', severity: 'MEDIUM', expiry_date: '2025-02-15' }
    ]
  };

  useEffect(() => {
    setDashboardData(mockDashboardData);
  }, []);

  const refreshData = async () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      toast({ title: 'تم تحديث البيانات', description: 'تم تحديث لوحة تحكم المخازن بنجاح' });
    }, 1000);
  };

  if (!dashboardData) {
    return <div className="flex items-center justify-center h-64">
      <RefreshCw className="h-8 w-8 animate-spin" />
    </div>;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-right">🏗️ نظام إدارة المخازن المتقدم</h1>
          <p className="text-muted-foreground text-right">إدارة احترافية للمخازن ومراقبة المخزون</p>
        </div>
        <Button onClick={refreshData} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ml-2 ${isLoading ? 'animate-spin' : ''}`} />
          تحديث البيانات
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 text-right">إجمالي المنتجات</p>
                <p className="text-3xl font-bold text-blue-900">
                  {dashboardData.summary.totalProducts.toLocaleString('ar-EG')}
                </p>
              </div>
              <Package className="h-12 w-12 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 text-right">قيمة المخزون</p>
                <p className="text-3xl font-bold text-green-900">
                  {(dashboardData.summary.totalStockValue / 1000000).toFixed(1)}م ج.م.
                </p>
              </div>
              <DollarSign className="h-12 w-12 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-gradient-to-br from-red-50 to-red-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600 text-right">تنبيهات نشطة</p>
                <p className="text-3xl font-bold text-red-900">
                  {dashboardData.summary.activeAlerts}
                </p>
                <p className="text-xs text-red-600">
                  {dashboardData.summary.criticalAlerts} حرجة
                </p>
              </div>
              <AlertTriangle className="h-12 w-12 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            نظرة عامة
          </TabsTrigger>
          <TabsTrigger value="warehouses" className="flex items-center gap-2">
            <Warehouse className="h-4 w-4" />
            المستودعات
          </TabsTrigger>
          <TabsTrigger value="movements" className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            الحركات
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            التنبيهات
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            التحليلات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Products */}
            <Card>
              <CardHeader>
                <CardTitle className="text-right">المنتجات الأعلى قيمة</CardTitle>
                <CardDescription className="text-right">أهم المنتجات في المخزون</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.stockSummary.map((product: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="text-right">
                        <p className="font-semibold">{product.product_name}</p>
                        <p className="text-sm text-muted-foreground">{product.product_line}</p>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-green-600">
                          {product.total_value.toLocaleString('ar-EG')} ج.م.
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {product.total_on_hand} وحدة
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Active Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="text-right">التنبيهات النشطة</CardTitle>
                <CardDescription className="text-right">تنبيهات تحتاج إلى اهتمام فوري</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.activeAlerts.map((alert: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="text-right">
                        <p className="font-semibold">{alert.title}</p>
                        <p className="text-sm text-muted-foreground">{alert.product_name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={alert.severity === 'HIGH' ? 'destructive' : 'secondary'}>
                          {alert.severity === 'HIGH' ? 'عالي' : 'متوسط'}
                        </Badge>
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="warehouses" className="space-y-4">
          <WarehouseManagement />
        </TabsContent>

        <TabsContent value="movements" className="space-y-4">
          <StockMovementTracking />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <StockAlertsCenter />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <StockAnalyticsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}