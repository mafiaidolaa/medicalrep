"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  Clock,
  CheckCircle2,
  XCircle,
  Bell,
  Settings,
  Search,
  Filter,
  Calendar,
  Package,
  Thermometer,
  TrendingDown,
  AlertCircle,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface StockAlert {
  id: string;
  type: 'LOW_STOCK' | 'EXPIRY_WARNING' | 'EXPIRED' | 'OVERSTOCK' | 'TEMPERATURE' | 'QUALITY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  product_name: string;
  product_code: string;
  location: string;
  message: string;
  details: any;
  created_at: string;
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
  assigned_to?: string;
  resolved_at?: string;
  notes?: string;
}

export default function StockAlertsCenter() {
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<StockAlert[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('active');
  const { toast } = useToast();

  // Mock data
  const mockAlerts: StockAlert[] = [
    {
      id: 'alert-001',
      type: 'LOW_STOCK',
      severity: 'HIGH',
      product_name: 'أموكسيسيلين 500mg',
      product_code: 'MED-001',
      location: 'المستودع الرئيسي - المنطقة A',
      message: 'مخزون منخفض - يحتاج إعادة طلب فوري',
      details: { current_stock: 25, min_stock: 100, reorder_level: 50 },
      created_at: '2024-01-15T10:30:00Z',
      status: 'active'
    },
    {
      id: 'alert-002',
      type: 'EXPIRY_WARNING',
      severity: 'MEDIUM',
      product_name: 'باراسيتامول 500mg',
      product_code: 'MED-002',
      location: 'المستودع الرئيسي - المنطقة B',
      message: 'انتهاء صلاحية قريب - 30 يوم',
      details: { expiry_date: '2025-02-15', days_to_expiry: 30, quantity: 150 },
      created_at: '2024-01-15T14:20:00Z',
      status: 'active'
    },
    {
      id: 'alert-003',
      type: 'EXPIRED',
      severity: 'CRITICAL',
      product_name: 'إيبوبروفين 400mg',
      product_code: 'MED-003',
      location: 'مستودع المبردات - المنطقة C',
      message: 'منتج منتهي الصلاحية - يتطلب إزالة فورية',
      details: { expiry_date: '2024-01-10', quantity: 75, batch_number: 'BATCH-003' },
      created_at: '2024-01-15T16:45:00Z',
      status: 'active'
    },
    {
      id: 'alert-004',
      type: 'TEMPERATURE',
      severity: 'CRITICAL',
      product_name: 'لقاح كوفيد-19',
      product_code: 'VAC-001',
      location: 'مستودع المبردات - المنطقة D',
      message: 'انحراف في درجة الحرارة - تجاوز الحد المسموح',
      details: { current_temp: 10, required_temp: '2-8', duration: 45 },
      created_at: '2024-01-15T18:30:00Z',
      status: 'active'
    }
  ];

  useEffect(() => {
    setAlerts(mockAlerts);
    setFilteredAlerts(mockAlerts.filter(alert => alert.status === 'active'));
  }, []);

  useEffect(() => {
    let filtered = alerts;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(alert =>
        alert.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.product_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.message.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by severity
    if (filterSeverity !== 'all') {
      filtered = filtered.filter(alert => alert.severity === filterSeverity);
    }

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(alert => alert.type === filterType);
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(alert => alert.status === filterStatus);
    }

    setFilteredAlerts(filtered);
  }, [searchTerm, filterSeverity, filterType, filterStatus, alerts]);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'LOW_STOCK':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'EXPIRY_WARNING':
        return <Clock className="h-4 w-4 text-orange-600" />;
      case 'EXPIRED':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'OVERSTOCK':
        return <Package className="h-4 w-4 text-blue-600" />;
      case 'TEMPERATURE':
        return <Thermometer className="h-4 w-4 text-purple-600" />;
      case 'QUALITY':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getAlertTypeText = (type: string) => {
    switch (type) {
      case 'LOW_STOCK':
        return 'مخزون منخفض';
      case 'EXPIRY_WARNING':
        return 'تحذير انتهاء صلاحية';
      case 'EXPIRED':
        return 'منتهي الصلاحية';
      case 'OVERSTOCK':
        return 'فائض مخزون';
      case 'TEMPERATURE':
        return 'درجة حرارة';
      case 'QUALITY':
        return 'جودة المنتج';
      default:
        return type;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'destructive';
      case 'HIGH':
        return 'destructive';
      case 'MEDIUM':
        return 'outline';
      case 'LOW':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'حرج';
      case 'HIGH':
        return 'عالي';
      case 'MEDIUM':
        return 'متوسط';
      case 'LOW':
        return 'منخفض';
      default:
        return severity;
    }
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { ...alert, status: 'acknowledged' as const }
        : alert
    ));
    toast({ title: 'تم الإقرار بالتنبيه', description: 'تم تحديث حالة التنبيه إلى "مُقر به"' });
  };

  const handleResolveAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { ...alert, status: 'resolved' as const, resolved_at: new Date().toISOString() }
        : alert
    ));
    toast({ title: 'تم حل التنبيه', description: 'تم وضع علامة على التنبيه كمحلول' });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const alertStats = {
    total: alerts.length,
    active: alerts.filter(a => a.status === 'active').length,
    critical: alerts.filter(a => a.severity === 'CRITICAL' && a.status === 'active').length,
    high: alerts.filter(a => a.severity === 'HIGH' && a.status === 'active').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-right">🔔 مركز التنبيهات الذكي</h2>
          <p className="text-muted-foreground text-right">مراقبة ذكية وإدارة شاملة لتنبيهات المخزون</p>
        </div>
        <Button variant="outline">
          <Settings className="h-4 w-4 ml-2" />
          إعدادات التنبيهات
        </Button>
      </div>

      {/* Alert Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-sm font-medium text-blue-600">إجمالي التنبيهات</p>
                <p className="text-2xl font-bold text-blue-900">{alertStats.total}</p>
              </div>
              <Bell className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-sm font-medium text-orange-600">تنبيهات نشطة</p>
                <p className="text-2xl font-bold text-orange-900">{alertStats.active}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-gradient-to-br from-red-50 to-red-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-sm font-medium text-red-600">تنبيهات حرجة</p>
                <p className="text-2xl font-bold text-red-900">{alertStats.critical}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-sm font-medium text-purple-600">عالية الأولوية</p>
                <p className="text-2xl font-bold text-purple-900">{alertStats.high}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-right">البحث والتصفية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="search" className="text-right block mb-2">البحث</Label>
              <div className="relative">
                <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="البحث في التنبيهات..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
            
            <div>
              <Label className="text-right block mb-2">نوع التنبيه</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأنواع</SelectItem>
                  <SelectItem value="LOW_STOCK">مخزون منخفض</SelectItem>
                  <SelectItem value="EXPIRY_WARNING">تحذير انتهاء</SelectItem>
                  <SelectItem value="EXPIRED">منتهي الصلاحية</SelectItem>
                  <SelectItem value="TEMPERATURE">درجة حرارة</SelectItem>
                  <SelectItem value="QUALITY">جودة المنتج</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-right block mb-2">الخطورة</Label>
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المستويات</SelectItem>
                  <SelectItem value="CRITICAL">حرج</SelectItem>
                  <SelectItem value="HIGH">عالي</SelectItem>
                  <SelectItem value="MEDIUM">متوسط</SelectItem>
                  <SelectItem value="LOW">منخفض</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-right block mb-2">الحالة</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="acknowledged">مُقر به</SelectItem>
                  <SelectItem value="resolved">محلول</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-right block mb-2">التاريخ</Label>
              <Input type="date" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-right">قائمة التنبيهات</CardTitle>
          <CardDescription className="text-right">
            جميع التنبيهات مرتبة حسب الأولوية والتاريخ
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredAlerts.length > 0 ? (
            <div className="space-y-4">
              {filteredAlerts.map((alert) => (
                <div key={alert.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getAlertIcon(alert.type)}
                      <div className="text-right">
                        <h4 className="font-semibold">{alert.product_name}</h4>
                        <p className="text-sm text-muted-foreground">{alert.product_code}</p>
                        <p className="text-sm text-muted-foreground">{alert.location}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant={getSeverityColor(alert.severity)}>
                        {getSeverityText(alert.severity)}
                      </Badge>
                      <Badge variant="outline">
                        {getAlertTypeText(alert.type)}
                      </Badge>
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-sm font-medium">{alert.message}</p>
                  </div>

                  {/* Alert Details */}
                  <div className="bg-gray-50 rounded p-3 mb-3 text-sm">
                    {alert.type === 'LOW_STOCK' && (
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <span className="text-muted-foreground">المخزون الحالي:</span>
                          <span className="font-medium ml-2 text-red-600">{alert.details.current_stock}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">الحد الأدنى:</span>
                          <span className="font-medium ml-2">{alert.details.min_stock}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">نقطة إعادة الطلب:</span>
                          <span className="font-medium ml-2">{alert.details.reorder_level}</span>
                        </div>
                      </div>
                    )}
                    
                    {(alert.type === 'EXPIRY_WARNING' || alert.type === 'EXPIRED') && (
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <span className="text-muted-foreground">تاريخ الانتهاء:</span>
                          <span className="font-medium ml-2">
                            {new Date(alert.details.expiry_date).toLocaleDateString('ar-EG')}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">الكمية:</span>
                          <span className="font-medium ml-2">{alert.details.quantity}</span>
                        </div>
                        {alert.details.days_to_expiry && (
                          <div>
                            <span className="text-muted-foreground">أيام متبقية:</span>
                            <span className="font-medium ml-2">{alert.details.days_to_expiry}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {alert.type === 'TEMPERATURE' && (
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <span className="text-muted-foreground">درجة الحرارة الحالية:</span>
                          <span className="font-medium ml-2 text-red-600">{alert.details.current_temp}°م</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">النطاق المطلوب:</span>
                          <span className="font-medium ml-2">{alert.details.required_temp}°م</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">مدة الانحراف:</span>
                          <span className="font-medium ml-2">{alert.details.duration} دقيقة</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      تم الإنشاء: {formatDate(alert.created_at)}
                    </div>
                    
                    {alert.status === 'active' && (
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleAcknowledgeAlert(alert.id)}
                        >
                          <CheckCircle2 className="h-4 w-4 ml-2" />
                          إقرار
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => handleResolveAlert(alert.id)}
                        >
                          <CheckCircle2 className="h-4 w-4 ml-2" />
                          حل
                        </Button>
                      </div>
                    )}
                    
                    {alert.status === 'acknowledged' && (
                      <Badge variant="secondary">مُقر به</Badge>
                    )}
                    
                    {alert.status === 'resolved' && (
                      <Badge variant="default">محلول</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Bell className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد تنبيهات</h3>
              <p className="text-muted-foreground">
                لم يتم العثور على تنبيهات مطابقة لمعايير البحث
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}