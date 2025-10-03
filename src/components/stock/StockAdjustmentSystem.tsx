"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  RotateCcw, 
  Plus,
  Search,
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  FileText,
  Calculator,
  Eye,
  Edit,
  Download,
  Upload
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface StockAdjustment {
  id: string;
  type: 'MANUAL' | 'CYCLE_COUNT' | 'DAMAGE' | 'EXPIRY' | 'CORRECTION';
  product_name: string;
  product_code: string;
  location: string;
  system_quantity: number;
  physical_quantity: number;
  adjustment_quantity: number;
  reason: string;
  reference_number: string;
  created_at: string;
  created_by: string;
  status: 'pending' | 'approved' | 'rejected' | 'applied';
  approved_by?: string;
  approved_at?: string;
  notes?: string;
  cost_impact?: number;
}

interface CycleCount {
  id: string;
  location: string;
  scheduled_date: string;
  completed_date?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  assigned_to: string;
  products_count: number;
  discrepancies_found: number;
  total_adjustments: number;
  created_by: string;
}

export default function StockAdjustmentSystem() {
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [cycleCounts, setCycleCounts] = useState<CycleCount[]>([]);
  const [selectedAdjustment, setSelectedAdjustment] = useState<StockAdjustment | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCycleCountDialog, setShowCycleCountDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const { toast } = useToast();

  // Mock data
  const mockAdjustments: StockAdjustment[] = [
    {
      id: 'adj-001',
      type: 'CYCLE_COUNT',
      product_name: 'أموكسيسيلين 500mg',
      product_code: 'MED-001',
      location: 'المستودع الرئيسي - A-01',
      system_quantity: 1200,
      physical_quantity: 1185,
      adjustment_quantity: -15,
      reason: 'اختلاف في العد الدوري',
      reference_number: 'CC-2024-001',
      created_at: '2024-01-15T10:30:00Z',
      created_by: 'أحمد محمد',
      status: 'pending',
      cost_impact: -750
    },
    {
      id: 'adj-002',
      type: 'DAMAGE',
      product_name: 'باراسيتامول 500mg',
      product_code: 'MED-002',
      location: 'المستودع الرئيسي - B-02',
      system_quantity: 800,
      physical_quantity: 775,
      adjustment_quantity: -25,
      reason: 'تلف بسبب سقوط العبوة',
      reference_number: 'DMG-2024-001',
      created_at: '2024-01-15T14:20:00Z',
      created_by: 'سارة أحمد',
      status: 'approved',
      approved_by: 'مدير المخزون',
      approved_at: '2024-01-15T16:00:00Z',
      cost_impact: -1250
    },
    {
      id: 'adj-003',
      type: 'EXPIRY',
      product_name: 'إيبوبروفين 400mg',
      product_code: 'MED-003',
      location: 'مستودع المبردات - C-03',
      system_quantity: 150,
      physical_quantity: 120,
      adjustment_quantity: -30,
      reason: 'انتهاء صلاحية - دفعة BATCH-003',
      reference_number: 'EXP-2024-001',
      created_at: '2024-01-15T16:45:00Z',
      created_by: 'محمد علي',
      status: 'applied',
      approved_by: 'مدير المخزون',
      cost_impact: -2400
    }
  ];

  const mockCycleCounts: CycleCount[] = [
    {
      id: 'cc-001',
      location: 'المستودع الرئيسي - المنطقة A',
      scheduled_date: '2024-01-20T09:00:00Z',
      status: 'scheduled',
      assigned_to: 'أحمد محمد',
      products_count: 150,
      discrepancies_found: 0,
      total_adjustments: 0,
      created_by: 'مدير المخزون'
    },
    {
      id: 'cc-002',
      location: 'مستودع المبردات - المنطقة B',
      scheduled_date: '2024-01-15T10:00:00Z',
      completed_date: '2024-01-15T15:30:00Z',
      status: 'completed',
      assigned_to: 'سارة أحمد',
      products_count: 75,
      discrepancies_found: 5,
      total_adjustments: 3,
      created_by: 'مدير المخزون'
    }
  ];

  useEffect(() => {
    setAdjustments(mockAdjustments);
    setCycleCounts(mockCycleCounts);
  }, []);

  const getAdjustmentTypeText = (type: string) => {
    switch (type) {
      case 'MANUAL':
        return 'تعديل يدوي';
      case 'CYCLE_COUNT':
        return 'عد دوري';
      case 'DAMAGE':
        return 'تلف';
      case 'EXPIRY':
        return 'انتهاء صلاحية';
      case 'CORRECTION':
        return 'تصحيح';
      default:
        return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'outline';
      case 'approved':
        return 'default';
      case 'applied':
        return 'default';
      case 'rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'في الانتظار';
      case 'approved':
        return 'معتمد';
      case 'applied':
        return 'مطبق';
      case 'rejected':
        return 'مرفوض';
      default:
        return status;
    }
  };

  const handleApproveAdjustment = (adjustmentId: string) => {
    setAdjustments(prev => prev.map(adj => 
      adj.id === adjustmentId 
        ? { 
            ...adj, 
            status: 'approved' as const,
            approved_by: 'المستخدم الحالي',
            approved_at: new Date().toISOString()
          }
        : adj
    ));
    toast({ title: 'تم اعتماد التعديل', description: 'تم اعتماد تعديل المخزون بنجاح' });
  };

  const handleRejectAdjustment = (adjustmentId: string) => {
    setAdjustments(prev => prev.map(adj => 
      adj.id === adjustmentId 
        ? { ...adj, status: 'rejected' as const }
        : adj
    ));
    toast({ title: 'تم رفض التعديل', description: 'تم رفض تعديل المخزون' });
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const adjustmentStats = {
    total: adjustments.length,
    pending: adjustments.filter(a => a.status === 'pending').length,
    approved: adjustments.filter(a => a.status === 'approved').length,
    applied: adjustments.filter(a => a.status === 'applied').length,
    total_cost_impact: adjustments.reduce((sum, adj) => sum + (adj.cost_impact || 0), 0)
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-right">⚖️ نظام تعديل وتسوية المخزون</h2>
          <p className="text-muted-foreground text-right">إدارة متقدمة لتعديلات المخزون والعد الدوري</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showCycleCountDialog} onOpenChange={setShowCycleCountDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Calendar className="h-4 w-4 ml-2" />
                عد دوري جديد
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-right">جدولة عد دوري جديد</DialogTitle>
                <DialogDescription className="text-right">
                  إنشاء مهمة عد دوري جديدة
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="location" className="text-right block">الموقع</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الموقع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="main-a">المستودع الرئيسي - المنطقة A</SelectItem>
                      <SelectItem value="main-b">المستودع الرئيسي - المنطقة B</SelectItem>
                      <SelectItem value="cold-c">مستودع المبردات - المنطقة C</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="assigned_to" className="text-right block">المعين إليه</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المستخدم" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ahmed">أحمد محمد</SelectItem>
                      <SelectItem value="sara">سارة أحمد</SelectItem>
                      <SelectItem value="mohamed">محمد علي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="scheduled_date" className="text-right block">تاريخ الجدولة</Label>
                  <Input id="scheduled_date" type="datetime-local" />
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1">إنشاء</Button>
                  <Button variant="outline" className="flex-1" onClick={() => setShowCycleCountDialog(false)}>
                    إلغاء
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 ml-2" />
                تعديل مخزون
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-right">تعديل مخزون جديد</DialogTitle>
                <DialogDescription className="text-right">
                  إنشاء تعديل مخزون يدوي
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="product" className="text-right block">المنتج</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المنتج" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="med-001">أموكسيسيلين 500mg</SelectItem>
                      <SelectItem value="med-002">باراسيتامول 500mg</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="adjustment_type" className="text-right block">نوع التعديل</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر النوع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MANUAL">تعديل يدوي</SelectItem>
                      <SelectItem value="DAMAGE">تلف</SelectItem>
                      <SelectItem value="EXPIRY">انتهاء صلاحية</SelectItem>
                      <SelectItem value="CORRECTION">تصحيح</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="quantity" className="text-right block">كمية التعديل</Label>
                  <Input id="quantity" type="number" placeholder="أدخل الكمية (+/-)" />
                </div>
                <div>
                  <Label htmlFor="reason" className="text-right block">السبب</Label>
                  <Textarea id="reason" placeholder="اشرح سبب التعديل..." />
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1">إنشاء</Button>
                  <Button variant="outline" className="flex-1" onClick={() => setShowCreateDialog(false)}>
                    إلغاء
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">إجمالي التعديلات</p>
                <p className="text-2xl font-bold">{adjustmentStats.total}</p>
              </div>
              <RotateCcw className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">في الانتظار</p>
                <p className="text-2xl font-bold text-orange-600">{adjustmentStats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">معتمد</p>
                <p className="text-2xl font-bold text-green-600">{adjustmentStats.approved}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">التأثير المالي</p>
                <p className={`text-2xl font-bold ${adjustmentStats.total_cost_impact < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(adjustmentStats.total_cost_impact)}
                </p>
              </div>
              <Calculator className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="adjustments" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="adjustments">تعديلات المخزون</TabsTrigger>
          <TabsTrigger value="cycle-counts">العد الدوري</TabsTrigger>
        </TabsList>

        <TabsContent value="adjustments" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="البحث في التعديلات..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pr-10"
                    />
                  </div>
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    <SelectItem value="pending">في الانتظار</SelectItem>
                    <SelectItem value="approved">معتمد</SelectItem>
                    <SelectItem value="applied">مطبق</SelectItem>
                    <SelectItem value="rejected">مرفوض</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Adjustments List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-right">قائمة تعديلات المخزون</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {adjustments.map((adjustment) => (
                  <div key={adjustment.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-right">
                        <h4 className="font-semibold">{adjustment.product_name}</h4>
                        <p className="text-sm text-muted-foreground">{adjustment.product_code}</p>
                        <p className="text-sm text-muted-foreground">{adjustment.location}</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {getAdjustmentTypeText(adjustment.type)}
                        </Badge>
                        <Badge variant={getStatusColor(adjustment.status)}>
                          {getStatusText(adjustment.status)}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-muted-foreground">الكمية النظامية:</span>
                        <span className="font-medium ml-2">{adjustment.system_quantity}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">الكمية الفعلية:</span>
                        <span className="font-medium ml-2">{adjustment.physical_quantity}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">التعديل:</span>
                        <span className={`font-medium ml-2 ${adjustment.adjustment_quantity < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {adjustment.adjustment_quantity > 0 ? '+' : ''}{adjustment.adjustment_quantity}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">التأثير المالي:</span>
                        <span className={`font-medium ml-2 ${(adjustment.cost_impact || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(adjustment.cost_impact || 0)}
                        </span>
                      </div>
                    </div>

                    <div className="text-sm mb-3">
                      <span className="text-muted-foreground">السبب: </span>
                      <span>{adjustment.reason}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        {formatDate(adjustment.created_at)} - {adjustment.created_by}
                      </div>
                      
                      {adjustment.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleRejectAdjustment(adjustment.id)}
                          >
                            <AlertCircle className="h-4 w-4 ml-2" />
                            رفض
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => handleApproveAdjustment(adjustment.id)}
                          >
                            <CheckCircle className="h-4 w-4 ml-2" />
                            اعتماد
                          </Button>
                        </div>
                      )}

                      {adjustment.status === 'approved' && (
                        <div className="text-sm text-green-600">
                          معتمد من: {adjustment.approved_by}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cycle-counts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-right">مهام العد الدوري</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cycleCounts.map((count) => (
                  <div key={count.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-right">
                        <h4 className="font-semibold">{count.location}</h4>
                        <p className="text-sm text-muted-foreground">معين إلى: {count.assigned_to}</p>
                      </div>
                      
                      <Badge variant={
                        count.status === 'completed' ? 'default' :
                        count.status === 'in_progress' ? 'outline' :
                        count.status === 'scheduled' ? 'secondary' : 'destructive'
                      }>
                        {count.status === 'completed' ? 'مكتمل' :
                         count.status === 'in_progress' ? 'قيد التنفيذ' :
                         count.status === 'scheduled' ? 'مجدول' : 'ملغي'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">عدد المنتجات:</span>
                        <span className="font-medium ml-2">{count.products_count}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">الاختلافات:</span>
                        <span className="font-medium ml-2 text-orange-600">{count.discrepancies_found}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">التعديلات:</span>
                        <span className="font-medium ml-2 text-blue-600">{count.total_adjustments}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">التاريخ المجدول:</span>
                        <span className="font-medium ml-2">{formatDate(count.scheduled_date)}</span>
                      </div>
                    </div>

                    {count.completed_date && (
                      <div className="mt-2 text-sm text-green-600">
                        مكتمل في: {formatDate(count.completed_date)}
                      </div>
                    )}
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