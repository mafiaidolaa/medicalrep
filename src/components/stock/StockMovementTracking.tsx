"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  ArrowRightLeft, 
  Plus, 
  Search,
  Filter,
  Calendar,
  Package,
  Truck,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface StockMovement {
  id: string;
  product_name: string;
  product_code: string;
  movement_type: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT';
  quantity: number;
  from_location?: string;
  to_location?: string;
  reference_number: string;
  notes?: string;
  created_at: string;
  created_by: string;
  status: 'pending' | 'completed' | 'cancelled';
  batch_number?: string;
  expiry_date?: string;
}

export default function StockMovementTracking() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [filteredMovements, setFilteredMovements] = useState<StockMovement[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Mock data
  const mockMovements: StockMovement[] = [
    {
      id: 'mov-001',
      product_name: 'أموكسيسيلين 500mg',
      product_code: 'MED-001',
      movement_type: 'IN',
      quantity: 1000,
      to_location: 'المستودع الرئيسي - المنطقة A',
      reference_number: 'PO-2024-001',
      notes: 'استلام طلبية جديدة',
      created_at: '2024-01-15T10:30:00Z',
      created_by: 'أحمد محمد',
      status: 'completed',
      batch_number: 'BATCH-001',
      expiry_date: '2025-12-31'
    },
    {
      id: 'mov-002',
      product_name: 'باراسيتامول 500mg',
      product_code: 'MED-002',
      movement_type: 'OUT',
      quantity: 250,
      from_location: 'المستودع الرئيسي - المنطقة A',
      reference_number: 'SO-2024-001',
      notes: 'شحنة للعميل ABC',
      created_at: '2024-01-15T14:20:00Z',
      created_by: 'سارة أحمد',
      status: 'completed',
      batch_number: 'BATCH-002',
      expiry_date: '2025-10-15'
    },
    {
      id: 'mov-003',
      product_name: 'إيبوبروفين 400mg',
      product_code: 'MED-003',
      movement_type: 'TRANSFER',
      quantity: 100,
      from_location: 'المستودع الرئيسي - المنطقة A',
      to_location: 'مستودع المبردات - المنطقة B',
      reference_number: 'TR-2024-001',
      notes: 'نقل للمستودع المبرد',
      created_at: '2024-01-15T16:45:00Z',
      created_by: 'محمد علي',
      status: 'pending',
      batch_number: 'BATCH-003',
      expiry_date: '2025-08-20'
    }
  ];

  useEffect(() => {
    setMovements(mockMovements);
    setFilteredMovements(mockMovements);
  }, []);

  useEffect(() => {
    let filtered = movements;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(movement =>
        movement.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        movement.product_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        movement.reference_number.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by movement type
    if (filterType !== 'all') {
      filtered = filtered.filter(movement => movement.movement_type === filterType);
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(movement => movement.status === filterStatus);
    }

    setFilteredMovements(filtered);
  }, [searchTerm, filterType, filterStatus, movements]);

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'IN':
        return <ArrowDown className="h-4 w-4 text-green-600" />;
      case 'OUT':
        return <ArrowUp className="h-4 w-4 text-red-600" />;
      case 'TRANSFER':
        return <ArrowRightLeft className="h-4 w-4 text-blue-600" />;
      case 'ADJUSTMENT':
        return <RotateCcw className="h-4 w-4 text-orange-600" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getMovementTypeText = (type: string) => {
    switch (type) {
      case 'IN':
        return 'استلام';
      case 'OUT':
        return 'صرف';
      case 'TRANSFER':
        return 'نقل';
      case 'ADJUSTMENT':
        return 'تعديل';
      default:
        return type;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-orange-600" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'مكتمل';
      case 'pending':
        return 'قيد الانتظار';
      case 'cancelled':
        return 'ملغي';
      default:
        return status;
    }
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-right">📦 تتبع حركات المخزون</h2>
          <p className="text-muted-foreground text-right">مراقبة في الوقت الحقيقي لجميع حركات المخزون</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 ml-2" />
              حركة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-right">إنشاء حركة مخزون جديدة</DialogTitle>
              <DialogDescription className="text-right">
                تسجيل حركة مخزون جديدة
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
                <Label htmlFor="type" className="text-right block">نوع الحركة</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع الحركة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IN">استلام</SelectItem>
                    <SelectItem value="OUT">صرف</SelectItem>
                    <SelectItem value="TRANSFER">نقل</SelectItem>
                    <SelectItem value="ADJUSTMENT">تعديل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="quantity" className="text-right block">الكمية</Label>
                <Input id="quantity" type="number" placeholder="أدخل الكمية" />
              </div>
              <div>
                <Label htmlFor="reference" className="text-right block">رقم المرجع</Label>
                <Input id="reference" placeholder="أدخل رقم المرجع" />
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

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-right">البحث والتصفية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search" className="text-right block mb-2">البحث</Label>
              <div className="relative">
                <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="البحث في الحركات..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
            
            <div>
              <Label className="text-right block mb-2">نوع الحركة</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأنواع</SelectItem>
                  <SelectItem value="IN">استلام</SelectItem>
                  <SelectItem value="OUT">صرف</SelectItem>
                  <SelectItem value="TRANSFER">نقل</SelectItem>
                  <SelectItem value="ADJUSTMENT">تعديل</SelectItem>
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
                  <SelectItem value="completed">مكتمل</SelectItem>
                  <SelectItem value="pending">قيد الانتظار</SelectItem>
                  <SelectItem value="cancelled">ملغي</SelectItem>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">إجمالي الحركات</p>
                <p className="text-2xl font-bold">{filteredMovements.length}</p>
              </div>
              <ArrowRightLeft className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">حركات الاستلام</p>
                <p className="text-2xl font-bold text-green-600">
                  {filteredMovements.filter(m => m.movement_type === 'IN').length}
                </p>
              </div>
              <ArrowDown className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">حركات الصرف</p>
                <p className="text-2xl font-bold text-red-600">
                  {filteredMovements.filter(m => m.movement_type === 'OUT').length}
                </p>
              </div>
              <ArrowUp className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">قيد الانتظار</p>
                <p className="text-2xl font-bold text-orange-600">
                  {filteredMovements.filter(m => m.status === 'pending').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Movements List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-right">سجل الحركات</CardTitle>
          <CardDescription className="text-right">
            جميع حركات المخزون مرتبة حسب التاريخ
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredMovements.length > 0 ? (
            <div className="space-y-4">
              {filteredMovements.map((movement) => (
                <div key={movement.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getMovementIcon(movement.movement_type)}
                      <div className="text-right">
                        <h4 className="font-semibold">{movement.product_name}</h4>
                        <p className="text-sm text-muted-foreground">{movement.product_code}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        movement.movement_type === 'IN' ? 'default' :
                        movement.movement_type === 'OUT' ? 'destructive' :
                        movement.movement_type === 'TRANSFER' ? 'secondary' : 'outline'
                      }>
                        {getMovementTypeText(movement.movement_type)}
                      </Badge>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(movement.status)}
                        <span className="text-sm">{getStatusText(movement.status)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">الكمية:</span>
                      <span className="font-medium ml-2">{movement.quantity.toLocaleString('ar-EG')}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">رقم المرجع:</span>
                      <span className="font-medium ml-2">{movement.reference_number}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">التاريخ:</span>
                      <span className="font-medium ml-2">{formatDate(movement.created_at)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">المستخدم:</span>
                      <span className="font-medium ml-2">{movement.created_by}</span>
                    </div>
                  </div>

                  {(movement.from_location || movement.to_location) && (
                    <div className="mt-3 pt-3 border-t">
                      {movement.from_location && (
                        <div className="flex items-center gap-2 text-sm mb-1">
                          <span className="text-muted-foreground">من:</span>
                          <span>{movement.from_location}</span>
                        </div>
                      )}
                      {movement.to_location && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">إلى:</span>
                          <span>{movement.to_location}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {movement.notes && (
                    <div className="mt-3 pt-3 border-t">
                      <span className="text-sm text-muted-foreground">ملاحظات: </span>
                      <span className="text-sm">{movement.notes}</span>
                    </div>
                  )}

                  {(movement.batch_number || movement.expiry_date) && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex gap-4 text-sm">
                        {movement.batch_number && (
                          <div>
                            <span className="text-muted-foreground">رقم الدفعة:</span>
                            <span className="ml-2 font-mono bg-gray-100 px-2 py-1 rounded">
                              {movement.batch_number}
                            </span>
                          </div>
                        )}
                        {movement.expiry_date && (
                          <div>
                            <span className="text-muted-foreground">تاريخ الانتهاء:</span>
                            <span className="ml-2">{new Date(movement.expiry_date).toLocaleDateString('ar-EG')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد حركات</h3>
              <p className="text-muted-foreground">
                لم يتم العثور على حركات مطابقة لمعايير البحث
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}