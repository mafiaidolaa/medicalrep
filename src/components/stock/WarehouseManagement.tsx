"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Warehouse, 
  MapPin, 
  Building, 
  Plus, 
  Edit,
  Settings,
  Package,
  AlertTriangle,
  Activity,
  Map
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Warehouse {
  id: string;
  name: string;
  code: string;
  location: string;
  manager: string;
  status: 'active' | 'inactive';
  capacity: number;
  current_usage: number;
  zones_count: number;
  locations_count: number;
  description?: string;
}

interface Zone {
  id: string;
  name: string;
  code: string;
  warehouse_id: string;
  temperature_controlled: boolean;
  capacity: number;
  locations_count: number;
}

export default function WarehouseManagement() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();

  // Mock data
  const mockWarehouses: Warehouse[] = [
    {
      id: 'wh-001',
      name: 'المستودع الرئيسي',
      code: 'WH-MAIN',
      location: 'القاهرة - النزهة',
      manager: 'أحمد محمد',
      status: 'active',
      capacity: 10000,
      current_usage: 7500,
      zones_count: 5,
      locations_count: 120,
      description: 'المستودع الرئيسي لتخزين الأدوية العامة'
    },
    {
      id: 'wh-002',
      name: 'مستودع المبردات',
      code: 'WH-COLD',
      location: 'القاهرة - مدينة نصر',
      manager: 'سارة أحمد',
      status: 'active',
      capacity: 5000,
      current_usage: 3200,
      zones_count: 3,
      locations_count: 60,
      description: 'مستودع مخصص للأدوية التي تحتاج تبريد'
    }
  ];

  const mockZones: Zone[] = [
    {
      id: 'zone-001',
      name: 'منطقة الأدوية العامة',
      code: 'GEN-A',
      warehouse_id: 'wh-001',
      temperature_controlled: false,
      capacity: 2000,
      locations_count: 40
    },
    {
      id: 'zone-002',
      name: 'منطقة الأدوية الحساسة',
      code: 'SENS-B',
      warehouse_id: 'wh-001',
      temperature_controlled: true,
      capacity: 1500,
      locations_count: 30
    }
  ];

  useEffect(() => {
    setWarehouses(mockWarehouses);
    setZones(mockZones);
  }, []);

  const handleWarehouseSelect = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse);
    // Filter zones for selected warehouse
    const warehouseZones = mockZones.filter(zone => zone.warehouse_id === warehouse.id);
    setZones(warehouseZones);
  };

  const getUsagePercentage = (current: number, capacity: number) => {
    return Math.round((current / capacity) * 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-orange-600';
    return 'text-green-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-right">🏪 إدارة المستودعات</h2>
          <p className="text-muted-foreground text-right">إدارة متقدمة للمستودعات والمناطق</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 ml-2" />
              مستودع جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-right">إنشاء مستودع جديد</DialogTitle>
              <DialogDescription className="text-right">
                أضف مستودع جديد إلى النظام
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-right block">اسم المستودع</Label>
                <Input id="name" placeholder="أدخل اسم المستودع" />
              </div>
              <div>
                <Label htmlFor="code" className="text-right block">كود المستودع</Label>
                <Input id="code" placeholder="WH-001" />
              </div>
              <div>
                <Label htmlFor="location" className="text-right block">الموقع</Label>
                <Input id="location" placeholder="أدخل عنوان المستودع" />
              </div>
              <div>
                <Label htmlFor="manager" className="text-right block">مدير المستودع</Label>
                <Input id="manager" placeholder="أدخل اسم المدير" />
              </div>
              <div>
                <Label htmlFor="capacity" className="text-right block">السعة</Label>
                <Input id="capacity" type="number" placeholder="10000" />
              </div>
              <div>
                <Label htmlFor="description" className="text-right block">الوصف</Label>
                <Textarea id="description" placeholder="وصف المستودع..." />
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Warehouses List */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-right">المستودعات المتاحة</CardTitle>
              <CardDescription className="text-right">
                {warehouses.length} مستودع نشط
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {warehouses.map((warehouse) => (
                <div
                  key={warehouse.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                    selectedWarehouse?.id === warehouse.id ? 'border-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => handleWarehouseSelect(warehouse)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-right">
                      <h4 className="font-semibold">{warehouse.name}</h4>
                      <p className="text-sm text-muted-foreground">{warehouse.code}</p>
                    </div>
                    <Badge variant={warehouse.status === 'active' ? 'default' : 'secondary'}>
                      {warehouse.status === 'active' ? 'نشط' : 'غير نشط'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">{warehouse.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="h-3 w-3 text-muted-foreground" />
                      <span className={getUsageColor(getUsagePercentage(warehouse.current_usage, warehouse.capacity))}>
                        {getUsagePercentage(warehouse.current_usage, warehouse.capacity)}% مستخدم
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Warehouse Details */}
        <div className="lg:col-span-2">
          {selectedWarehouse ? (
            <div className="space-y-4">
              {/* Warehouse Info Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="text-right">
                      <CardTitle className="flex items-center gap-2">
                        <Warehouse className="h-5 w-5" />
                        {selectedWarehouse.name}
                      </CardTitle>
                      <CardDescription>{selectedWarehouse.code}</CardDescription>
                    </div>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 ml-2" />
                      تعديل
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">الموقع</Label>
                        <p className="font-medium">{selectedWarehouse.location}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">المدير</Label>
                        <p className="font-medium">{selectedWarehouse.manager}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">الوصف</Label>
                        <p className="text-sm">{selectedWarehouse.description}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 border rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {selectedWarehouse.zones_count}
                          </div>
                          <div className="text-xs text-muted-foreground">منطقة</div>
                        </div>
                        <div className="text-center p-3 border rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {selectedWarehouse.locations_count}
                          </div>
                          <div className="text-xs text-muted-foreground">موقع</div>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-sm text-muted-foreground">استخدام السعة</Label>
                        <div className="mt-2">
                          <div className="flex justify-between text-sm mb-1">
                            <span>{selectedWarehouse.current_usage.toLocaleString()}</span>
                            <span>{selectedWarehouse.capacity.toLocaleString()}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ 
                                width: `${getUsagePercentage(selectedWarehouse.current_usage, selectedWarehouse.capacity)}%` 
                              }}
                            ></div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {getUsagePercentage(selectedWarehouse.current_usage, selectedWarehouse.capacity)}% مستخدم
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Zones */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-right">مناطق المستودع</CardTitle>
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 ml-2" />
                      منطقة جديدة
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {zones.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {zones.map((zone) => (
                        <div key={zone.id} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <div className="text-right">
                              <h4 className="font-semibold">{zone.name}</h4>
                              <p className="text-sm text-muted-foreground">{zone.code}</p>
                            </div>
                            {zone.temperature_controlled && (
                              <Badge variant="secondary" className="text-xs">
                                مبرد
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">السعة:</span>
                              <span className="font-medium ml-1">{zone.capacity.toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">المواقع:</span>
                              <span className="font-medium ml-1">{zone.locations_count}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Building className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">لا توجد مناطق في هذا المستودع</p>
                      <Button variant="outline" size="sm" className="mt-2">
                        <Plus className="h-4 w-4 ml-2" />
                        إضافة منطقة
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="h-[500px]">
              <CardContent className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Warehouse className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">اختر مستودع</h3>
                  <p className="text-muted-foreground">
                    اختر مستودع من القائمة لعرض التفاصيل
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}