"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown,
  BarChart3,
  PieChart,
  Activity,
  Calendar,
  Download,
  Filter,
  DollarSign,
  Package,
  AlertTriangle,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AnalyticsData {
  inventory_value: {
    current: number;
    previous: number;
    change_percentage: number;
  };
  turnover_rate: {
    average: number;
    top_products: Array<{ name: string; rate: number }>;
    slow_moving: Array<{ name: string; rate: number; days_stock: number }>;
  };
  stock_levels: {
    total_products: number;
    in_stock: number;
    low_stock: number;
    out_of_stock: number;
    overstock: number;
  };
  movements_summary: {
    total_movements: number;
    inbound: number;
    outbound: number;
    transfers: number;
    adjustments: number;
  };
  expiry_analysis: {
    expiring_30_days: number;
    expiring_60_days: number;
    expiring_90_days: number;
    expired: number;
  };
  top_products_by_value: Array<{
    name: string;
    code: string;
    value: number;
    quantity: number;
    percentage: number;
  }>;
  monthly_trends: Array<{
    month: string;
    total_value: number;
    movements_in: number;
    movements_out: number;
  }>;
}

export default function StockAnalyticsDashboard() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Mock data
  const mockAnalyticsData: AnalyticsData = {
    inventory_value: {
      current: 2450000,
      previous: 2280000,
      change_percentage: 7.5
    },
    turnover_rate: {
      average: 6.2,
      top_products: [
        { name: 'باراسيتامول 500mg', rate: 12.5 },
        { name: 'أموكسيسيلين 500mg', rate: 10.8 },
        { name: 'إيبوبروفين 400mg', rate: 9.2 }
      ],
      slow_moving: [
        { name: 'دواء نادر X', rate: 0.8, days_stock: 450 },
        { name: 'مكمل غذائي Y', rate: 1.2, days_stock: 300 }
      ]
    },
    stock_levels: {
      total_products: 1250,
      in_stock: 1180,
      low_stock: 45,
      out_of_stock: 15,
      overstock: 10
    },
    movements_summary: {
      total_movements: 2840,
      inbound: 890,
      outbound: 1650,
      transfers: 180,
      adjustments: 120
    },
    expiry_analysis: {
      expiring_30_days: 25,
      expiring_60_days: 48,
      expiring_90_days: 75,
      expired: 8
    },
    top_products_by_value: [
      { name: 'أموكسيسيلين 500mg', code: 'MED-001', value: 248000, quantity: 1200, percentage: 10.1 },
      { name: 'باراسيتامول 500mg', code: 'MED-002', value: 196000, quantity: 800, percentage: 8.0 },
      { name: 'إيبوبروفين 400mg', code: 'MED-003', value: 165000, quantity: 550, percentage: 6.7 },
      { name: 'أسبرين 100mg', code: 'MED-004', value: 142000, quantity: 710, percentage: 5.8 }
    ],
    monthly_trends: [
      { month: 'يناير', total_value: 2280000, movements_in: 780, movements_out: 1420 },
      { month: 'فبراير', total_value: 2350000, movements_in: 850, movements_out: 1380 },
      { month: 'مارس', total_value: 2450000, movements_in: 890, movements_out: 1650 }
    ]
  };

  useEffect(() => {
    setAnalyticsData(mockAnalyticsData);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('ar-EG');
  };

  const getChangeIcon = (percentage: number) => {
    if (percentage > 0) return <ArrowUp className="h-4 w-4 text-green-600" />;
    if (percentage < 0) return <ArrowDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-600" />;
  };

  const getChangeColor = (percentage: number) => {
    if (percentage > 0) return 'text-green-600';
    if (percentage < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const exportReport = () => {
    toast({ title: 'تصدير التقرير', description: 'جاري تحضير التقرير للتصدير...' });
  };

  if (!analyticsData) {
    return <div className="flex items-center justify-center h-64">
      <Activity className="h-8 w-8 animate-pulse" />
    </div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-right">📊 تحليلات المخزون المتقدمة</h2>
          <p className="text-muted-foreground text-right">مؤشرات أداء ذكية وتحليلات شاملة للمخزون</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">آخر 7 أيام</SelectItem>
              <SelectItem value="30d">آخر 30 يوم</SelectItem>
              <SelectItem value="90d">آخر 3 شهور</SelectItem>
              <SelectItem value="1y">آخر سنة</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportReport}>
            <Download className="h-4 w-4 ml-2" />
            تصدير التقرير
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-sm font-medium text-blue-600">قيمة المخزون الإجمالية</p>
                <p className="text-2xl font-bold text-blue-900">
                  {(analyticsData.inventory_value.current / 1000000).toFixed(1)}م
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {getChangeIcon(analyticsData.inventory_value.change_percentage)}
                  <span className={`text-sm font-medium ${getChangeColor(analyticsData.inventory_value.change_percentage)}`}>
                    {Math.abs(analyticsData.inventory_value.change_percentage)}%
                  </span>
                </div>
              </div>
              <DollarSign className="h-12 w-12 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-sm font-medium text-green-600">معدل دوران المخزون</p>
                <p className="text-2xl font-bold text-green-900">
                  {analyticsData.turnover_rate.average}
                </p>
                <p className="text-xs text-green-600">مرة/سنة</p>
              </div>
              <Activity className="h-12 w-12 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-sm font-medium text-orange-600">إجمالي المنتجات</p>
                <p className="text-2xl font-bold text-orange-900">
                  {formatNumber(analyticsData.stock_levels.total_products)}
                </p>
                <p className="text-xs text-orange-600">
                  {analyticsData.stock_levels.in_stock} في المخزون
                </p>
              </div>
              <Package className="h-12 w-12 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-gradient-to-br from-red-50 to-red-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-sm font-medium text-red-600">تنبيهات المخزون</p>
                <p className="text-2xl font-bold text-red-900">
                  {analyticsData.stock_levels.low_stock + analyticsData.stock_levels.out_of_stock}
                </p>
                <p className="text-xs text-red-600">
                  تحتاج متابعة
                </p>
              </div>
              <AlertTriangle className="h-12 w-12 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="products">تحليل المنتجات</TabsTrigger>
          <TabsTrigger value="movements">حركة المخزون</TabsTrigger>
          <TabsTrigger value="trends">الاتجاهات</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Stock Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-right">توزيع حالات المخزون</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-right">في المخزون</span>
                    </div>
                    <span className="font-bold text-green-600">
                      {formatNumber(analyticsData.stock_levels.in_stock)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <span className="text-right">مخزون منخفض</span>
                    </div>
                    <span className="font-bold text-orange-600">
                      {formatNumber(analyticsData.stock_levels.low_stock)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-right">نفد من المخزون</span>
                    </div>
                    <span className="font-bold text-red-600">
                      {formatNumber(analyticsData.stock_levels.out_of_stock)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-right">فائض مخزون</span>
                    </div>
                    <span className="font-bold text-blue-600">
                      {formatNumber(analyticsData.stock_levels.overstock)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Movement Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-right">ملخص حركات المخزون</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <ArrowDown className="h-4 w-4 text-green-600" />
                      <span className="text-right">حركات الاستلام</span>
                    </div>
                    <span className="font-bold text-green-600">
                      {formatNumber(analyticsData.movements_summary.inbound)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <ArrowUp className="h-4 w-4 text-red-600" />
                      <span className="text-right">حركات الصرف</span>
                    </div>
                    <span className="font-bold text-red-600">
                      {formatNumber(analyticsData.movements_summary.outbound)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-blue-600" />
                      <span className="text-right">التحويلات</span>
                    </div>
                    <span className="font-bold text-blue-600">
                      {formatNumber(analyticsData.movements_summary.transfers)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-orange-600" />
                      <span className="text-right">التعديلات</span>
                    </div>
                    <span className="font-bold text-orange-600">
                      {formatNumber(analyticsData.movements_summary.adjustments)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Products by Value */}
            <Card>
              <CardHeader>
                <CardTitle className="text-right">أهم المنتجات حسب القيمة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData.top_products_by_value.map((product, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="text-right">
                        <p className="font-semibold">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.code}</p>
                        <p className="text-xs text-muted-foreground">{formatNumber(product.quantity)} وحدة</p>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-green-600">{formatCurrency(product.value)}</p>
                        <p className="text-xs text-muted-foreground">{product.percentage}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Fast vs Slow Moving */}
            <Card>
              <CardHeader>
                <CardTitle className="text-right">تحليل دوران المنتجات</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="fast">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="fast">سريعة الحركة</TabsTrigger>
                    <TabsTrigger value="slow">بطيئة الحركة</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="fast" className="mt-4">
                    <div className="space-y-3">
                      {analyticsData.turnover_rate.top_products.map((product, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <span className="text-right">{product.name}</span>
                          <Badge variant="default">
                            {product.rate} مرة/سنة
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="slow" className="mt-4">
                    <div className="space-y-3">
                      {analyticsData.turnover_rate.slow_moving.map((product, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="text-right">
                            <p>{product.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {product.days_stock} يوم مخزون
                            </p>
                          </div>
                          <Badge variant="secondary">
                            {product.rate} مرة/سنة
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="movements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-right">تحليل تواريخ الانتهاء</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {analyticsData.expiry_analysis.expired}
                  </div>
                  <div className="text-sm text-muted-foreground">منتهية الصلاحية</div>
                </div>
                
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {analyticsData.expiry_analysis.expiring_30_days}
                  </div>
                  <div className="text-sm text-muted-foreground">30 يوم</div>
                </div>
                
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {analyticsData.expiry_analysis.expiring_60_days}
                  </div>
                  <div className="text-sm text-muted-foreground">60 يوم</div>
                </div>
                
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {analyticsData.expiry_analysis.expiring_90_days}
                  </div>
                  <div className="text-sm text-muted-foreground">90 يوم</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-right">الاتجاهات الشهرية</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.monthly_trends.map((trend, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="text-right">
                      <h4 className="font-semibold">{trend.month}</h4>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(trend.total_value)}
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="flex gap-4 text-sm">
                        <div>
                          <span className="text-green-600">↓ {trend.movements_in}</span>
                        </div>
                        <div>
                          <span className="text-red-600">↑ {trend.movements_out}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}