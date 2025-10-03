"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, RotateCcw, Search, Clock, User, Building2, Package, Calendar, AlertTriangle, CheckCircle, Eye, Users, Stethoscope } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TrashItem {
  id: string;
  entityType: 'user' | 'clinic' | 'product' | 'visit' | 'order' | 'expense' | 'collection' | 'notification';
  entityId: string;
  name: string;
  data: any; // البيانات الأصلية
  deletedAt: string;
  deletedBy: string | null;
  deletedByName?: string;
  canRestore: boolean;
}

const ENTITY_TYPES = {
  user: { label: 'مستخدم', icon: Users, color: 'bg-blue-100 text-blue-800' },
  clinic: { label: 'عيادة', icon: Stethoscope, color: 'bg-green-100 text-green-800' },
  product: { label: 'منتج', icon: Package, color: 'bg-purple-100 text-purple-800' },
  visit: { label: 'زيارة', icon: Calendar, color: 'bg-orange-100 text-orange-800' },
  order: { label: 'طلب', icon: Building2, color: 'bg-yellow-100 text-yellow-800' },
  expense: { label: 'مصروف', icon: Clock, color: 'bg-red-100 text-red-800' },
  collection: { label: 'تحصيل', icon: CheckCircle, color: 'bg-emerald-100 text-emerald-800' },
  notification: { label: 'إشعار', icon: AlertTriangle, color: 'bg-gray-100 text-gray-800' }
};

export function TrashSystem() {
  const { toast } = useToast();
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntityType, setSelectedEntityType] = useState('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('recent');

  // تحميل عناصر سلة المهملات من قاعدة البيانات
  const loadTrashItems = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/trash', {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error('فشل في تحميل سلة المهملات');
      }

      const items = await response.json();
      setTrashItems(items);
    } catch (error: any) {
      console.error('Failed to load trash items:', error);
      toast({
        variant: "destructive",
        title: "خطأ في التحميل",
        description: error.message || 'فشل في تحميل سلة المهملات'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTrashItems();
  }, []);

  // تصفية العناصر
  const filteredItems = trashItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEntityType = selectedEntityType === 'all' || item.entityType === selectedEntityType;
    
    let matchesTimeRange = true;
    if (selectedTimeRange !== 'all') {
      const deletedDate = new Date(item.deletedAt);
      const now = new Date();
      const diffTime = now.getTime() - deletedDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      switch (selectedTimeRange) {
        case 'today':
          matchesTimeRange = diffDays <= 1;
          break;
        case 'week':
          matchesTimeRange = diffDays <= 7;
          break;
        case 'month':
          matchesTimeRange = diffDays <= 30;
          break;
      }
    }

    return matchesSearch && matchesEntityType && matchesTimeRange;
  });

  const recentItems = trashItems.filter(item => {
    const deletedDate = new Date(item.deletedAt);
    const now = new Date();
    const diffTime = now.getTime() - deletedDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  });

  const oldItems = trashItems.filter(item => {
    const deletedDate = new Date(item.deletedAt);
    const now = new Date();
    const diffTime = now.getTime() - deletedDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 30;
  });

  // استرجاع عنصر من سلة المهملات
  const restoreItem = async (item: TrashItem) => {
    try {
      const response = await fetch(`/api/trash/${item.entityType}/${item.entityId}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('فشل في استرجاع العنصر');
      }

      await loadTrashItems(); // إعادة تحميل القائمة

      toast({
        title: "تم الاسترجاع بنجاح",
        description: `تم استرجاع ${ENTITY_TYPES[item.entityType].label} "${item.name}" بنجاح`
      });
    } catch (error: any) {
      console.error('Failed to restore item:', error);
      toast({
        variant: "destructive",
        title: "خطأ في الاسترجاع",
        description: error.message || 'فشل في استرجاع العنصر'
      });
    }
  };

  // حذف عنصر نهائياً من سلة المهملات
  const permanentDelete = async (item: TrashItem) => {
    try {
      const response = await fetch(`/api/trash/${item.entityType}/${item.entityId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('فشل في الحذف النهائي');
      }

      await loadTrashItems(); // إعادة تحميل القائمة

      toast({
        title: "تم الحذف النهائي",
        description: `تم حذف ${ENTITY_TYPES[item.entityType].label} "${item.name}" نهائياً`
      });
    } catch (error: any) {
      console.error('Failed to permanently delete item:', error);
      toast({
        variant: "destructive",
        title: "خطأ في الحذف",
        description: error.message || 'فشل في الحذف النهائي'
      });
    }
  };

  // إفراغ سلة المهملات بالكامل
  const emptyTrash = async () => {
    try {
      const response = await fetch('/api/trash/empty', {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('فشل في إفراغ سلة المهملات');
      }

      await loadTrashItems();

      toast({
        title: "تم إفراغ سلة المهملات",
        description: "تم حذف جميع العناصر نهائياً من سلة المهملات"
      });
    } catch (error: any) {
      console.error('Failed to empty trash:', error);
      toast({
        variant: "destructive",
        title: "خطأ في الإفراغ",
        description: error.message || 'فشل في إفراغ سلة المهملات'
      });
    }
  };

  // الحصول على أيقونة نوع البيان
  const getEntityTypeIcon = (entityType: TrashItem['entityType']) => {
    const IconComponent = ENTITY_TYPES[entityType].icon;
    return <IconComponent className="h-4 w-4" />;
  };

  // حساب عدد الأيام منذ الحذف
  const getDaysAgo = (deletedAt: string) => {
    const deletedDate = new Date(deletedAt);
    const now = new Date();
    const diffTime = now.getTime() - deletedDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'اليوم';
    if (diffDays === 2) return 'أمس';
    return `منذ ${diffDays} أيام`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Trash2 className="h-6 w-6 text-red-500" />
            سلة المهملات
          </h2>
          <p className="text-muted-foreground">إدارة العناصر المحذوفة - استرجاع أو حذف نهائي</p>
        </div>
        
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={loadTrashItems}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
            ) : (
              <Clock className="h-4 w-4" />
            )}
            تحديث
          </Button>
          
          <Badge variant="outline" className="px-3 py-1">
            {trashItems.length} عنصر محذوف
          </Badge>
          
          {trashItems.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  إفراغ سلة المهملات
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>إفراغ سلة المهملات</AlertDialogTitle>
                  <AlertDialogDescription>
                    هل أنت متأكد من حذف جميع العناصر نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                  <AlertDialogAction onClick={emptyTrash} className="bg-destructive text-destructive-foreground">
                    حذف نهائي
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="البحث في سلة المهملات..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="w-48">
          <Select value={selectedEntityType} onValueChange={setSelectedEntityType}>
            <SelectTrigger>
              <SelectValue placeholder="نوع البيان" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الأنواع</SelectItem>
              {Object.entries(ENTITY_TYPES).map(([key, type]) => (
                <SelectItem key={key} value={key}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger>
              <SelectValue placeholder="وقت الحذف" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الأوقات</SelectItem>
              <SelectItem value="today">اليوم</SelectItem>
              <SelectItem value="week">آخر أسبوع</SelectItem>
              <SelectItem value="month">آخر شهر</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 w-fit">
          <TabsTrigger value="recent" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            محذوف حديثاً ({recentItems.length})
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            جميع العناصر ({filteredItems.length})
          </TabsTrigger>
          <TabsTrigger value="old" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            قديم (+30 يوم) ({oldItems.length})
          </TabsTrigger>
        </TabsList>

        {/* Recent Items Tab */}
        <TabsContent value="recent" className="space-y-4">
          {recentItems.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">لا توجد عناصر محذوفة حديثاً</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentItems.map((item) => (
                <TrashItemCard key={`${item.entityType}-${item.entityId}`} item={item} onRestore={restoreItem} onDelete={permanentDelete} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* All Items Tab */}
        <TabsContent value="all" className="space-y-4">
          {filteredItems.length === 0 ? (
            <div className="text-center py-8">
              <Trash2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || selectedEntityType !== 'all' || selectedTimeRange !== 'all'
                  ? 'لا توجد عناصر تطابق الفلتر المحدد'
                  : 'سلة المهملات فارغة'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => (
                <TrashItemCard key={`${item.entityType}-${item.entityId}`} item={item} onRestore={restoreItem} onDelete={permanentDelete} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Old Items Tab */}
        <TabsContent value="old" className="space-y-4">
          {oldItems.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">لا توجد عناصر قديمة في سلة المهملات</p>
            </div>
          ) : (
            <>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <p className="text-orange-800 font-medium">
                    هذه العناصر محذوفة منذ أكثر من 30 يوم. يُنصح بحذفها نهائياً أو استرجاعها.
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {oldItems.map((item) => (
                  <TrashItemCard key={`${item.entityType}-${item.entityId}`} item={item} onRestore={restoreItem} onDelete={permanentDelete} isOld />
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// مكون كارت العنصر المحذوف
interface TrashItemCardProps {
  item: TrashItem;
  onRestore: (item: TrashItem) => Promise<void>;
  onDelete: (item: TrashItem) => Promise<void>;
  isOld?: boolean;
}

function TrashItemCard({ item, onRestore, onDelete, isOld = false }: TrashItemCardProps) {
  const entityInfo = ENTITY_TYPES[item.entityType];
  const IconComponent = entityInfo.icon;

  return (
    <Card className={`hover:shadow-md transition-shadow ${isOld ? 'border-orange-200 bg-orange-50' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <IconComponent className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{item.name}</h3>
                <Badge className={entityInfo.color} variant="outline">
                  {entityInfo.label}
                </Badge>
                {isOld && (
                  <Badge variant="outline" className="bg-orange-100 text-orange-800">
                    قديم
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  حُذف {getDaysAgo(item.deletedAt)}
                </span>
                {item.deletedByName && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    بواسطة {item.deletedByName}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-1" />
                  عرض
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>تفاصيل العنصر المحذوف</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <strong>النوع:</strong> {entityInfo.label}
                  </div>
                  <div>
                    <strong>الاسم:</strong> {item.name}
                  </div>
                  <div>
                    <strong>تاريخ الحذف:</strong> {new Date(item.deletedAt).toLocaleDateString('ar-EG')}
                  </div>
                  {item.deletedByName && (
                    <div>
                      <strong>حُذف بواسطة:</strong> {item.deletedByName}
                    </div>
                  )}
                  <div>
                    <strong>البيانات الأصلية:</strong>
                    <pre className="mt-2 p-3 bg-muted rounded text-sm overflow-auto max-h-40">
                      {JSON.stringify(item.data, null, 2)}
                    </pre>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {item.canRestore && (
              <Button variant="outline" size="sm" onClick={() => onRestore(item)} className="text-green-600 hover:text-green-700">
                <RotateCcw className="h-4 w-4 mr-1" />
                استرجاع
              </Button>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                  <Trash2 className="h-4 w-4 mr-1" />
                  حذف نهائي
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>حذف نهائي</AlertDialogTitle>
                  <AlertDialogDescription>
                    هل أنت متأكد من حذف "{item.name}" نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(item)} className="bg-destructive text-destructive-foreground">
                    حذف نهائي
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// دالة مساعدة لحساب الأيام
function getDaysAgo(deletedAt: string): string {
  const deletedDate = new Date(deletedAt);
  const now = new Date();
  const diffTime = now.getTime() - deletedDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) return 'اليوم';
  if (diffDays === 2) return 'أمس';
  return `منذ ${diffDays} أيام`;
}