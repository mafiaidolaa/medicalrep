"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Search, Filter, Eye, Printer, Download, Calendar, 
  Clock, CheckCircle, XCircle, AlertCircle, Package, 
  DollarSign, User, MapPin, FileText, RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Order, OrderItem } from '@/lib/types';

interface PreviousOrdersProps {
  orders: Order[];
  currentUser?: any;
  onViewOrder?: (order: Order) => void;
  onPrintOrder?: (order: Order) => void;
  className?: string;
}

type OrderFilter = {
  search: string;
  status: string;
  paymentMethod: string;
  dateFrom: string;
  dateTo: string;
  clinicName: string;
};

const initialFilter: OrderFilter = {
  search: '',
  status: 'all',
  paymentMethod: 'all',
  dateFrom: '',
  dateTo: '',
  clinicName: ''
};

export function PreviousOrders({
  orders,
  currentUser,
  onViewOrder,
  onPrintOrder,
  className
}: PreviousOrdersProps) {
  const [filter, setFilter] = useState<OrderFilter>(initialFilter);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'total'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Get user's orders only
  const userOrders = useMemo(() => {
    return orders.filter(order => order.representativeId === currentUser?.id);
  }, [orders, currentUser]);

  // Filter and sort orders
  const filteredOrders = useMemo(() => {
    let filtered = userOrders;

    // Search filter
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      filtered = filtered.filter(order =>
        order.clinicName.toLowerCase().includes(searchLower) ||
        order.orderNumber?.toLowerCase().includes(searchLower) ||
        order.notes?.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (filter.status !== 'all') {
      filtered = filtered.filter(order => order.status === filter.status);
    }

    // Payment method filter
    if (filter.paymentMethod !== 'all') {
      filtered = filtered.filter(order => order.paymentMethod === filter.paymentMethod);
    }

    // Date range filter
    if (filter.dateFrom) {
      filtered = filtered.filter(order => 
        new Date(order.orderDate) >= new Date(filter.dateFrom)
      );
    }
    if (filter.dateTo) {
      filtered = filtered.filter(order => 
        new Date(order.orderDate) <= new Date(filter.dateTo)
      );
    }

    // Clinic name filter
    if (filter.clinicName) {
      const clinicLower = filter.clinicName.toLowerCase();
      filtered = filtered.filter(order =>
        order.clinicName.toLowerCase().includes(clinicLower)
      );
    }

    // Sort orders
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime();
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'total':
          comparison = (a.total || 0) - (b.total || 0);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [userOrders, filter, sortBy, sortOrder]);

  // Get status info
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { 
          label: 'قيد المراجعة', 
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: Clock 
        };
      case 'approved':
        return { 
          label: 'معتمد', 
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: CheckCircle 
        };
      case 'rejected':
        return { 
          label: 'مرفوض', 
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: XCircle 
        };
      case 'delivered':
        return { 
          label: 'تم التسليم', 
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: Package 
        };
      case 'cancelled':
        return { 
          label: 'ملغي', 
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: XCircle 
        };
      default:
        return { 
          label: status, 
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: AlertCircle 
        };
    }
  };

  // Get payment method info
  const getPaymentMethodInfo = (method: string) => {
    switch (method) {
      case 'cash':
        return { label: 'نقداً', color: 'bg-green-100 text-green-800' };
      case 'bank_transfer':
        return { label: 'تحويل بنكي', color: 'bg-blue-100 text-blue-800' };
      case 'deferred':
        return { label: 'آجل', color: 'bg-orange-100 text-orange-800' };
      default:
        return { label: method, color: 'bg-gray-100 text-gray-800' };
    }
  };

  // Get priority info
  const getPriorityInfo = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return { label: 'عاجل', color: 'bg-red-100 text-red-800' };
      case 'high':
        return { label: 'عالية', color: 'bg-orange-100 text-orange-800' };
      case 'medium':
        return { label: 'متوسطة', color: 'bg-yellow-100 text-yellow-800' };
      case 'low':
        return { label: 'منخفضة', color: 'bg-green-100 text-green-800' };
      default:
        return { label: 'متوسطة', color: 'bg-gray-100 text-gray-800' };
    }
  };

  // Clear filters
  const clearFilters = () => {
    setFilter(initialFilter);
  };

  // Handle order view
  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowDetails(true);
    onViewOrder?.(order);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">الطلبات السابقة</h3>
          <p className="text-sm text-muted-foreground">
            إجمالي الطلبات: {userOrders.length} • المعروضة: {filteredOrders.length}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4 ml-2" />
          تحديث
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            فلترة وبحث
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="البحث في الطلبات..."
                value={filter.search}
                onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
                className="pr-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={filter.status} onValueChange={(value) => setFilter(prev => ({ ...prev, status: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="حالة الطلب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="pending">قيد المراجعة</SelectItem>
                <SelectItem value="approved">معتمد</SelectItem>
                <SelectItem value="rejected">مرفوض</SelectItem>
                <SelectItem value="delivered">تم التسليم</SelectItem>
                <SelectItem value="cancelled">ملغي</SelectItem>
              </SelectContent>
            </Select>

            {/* Payment Method Filter */}
            <Select value={filter.paymentMethod} onValueChange={(value) => setFilter(prev => ({ ...prev, paymentMethod: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="طريقة الدفع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع طرق الدفع</SelectItem>
                <SelectItem value="cash">نقداً</SelectItem>
                <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                <SelectItem value="deferred">آجل</SelectItem>
              </SelectContent>
            </Select>

            {/* Date From */}
            <Input
              type="date"
              placeholder="من تاريخ"
              value={filter.dateFrom}
              onChange={(e) => setFilter(prev => ({ ...prev, dateFrom: e.target.value }))}
            />

            {/* Date To */}
            <Input
              type="date"
              placeholder="إلى تاريخ"
              value={filter.dateTo}
              onChange={(e) => setFilter(prev => ({ ...prev, dateTo: e.target.value }))}
            />

            {/* Clinic Name */}
            <Input
              placeholder="اسم العيادة"
              value={filter.clinicName}
              onChange={(e) => setFilter(prev => ({ ...prev, clinicName: e.target.value }))}
            />
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">ترتيب حسب:</label>
                <Select value={sortBy} onValueChange={(value: 'date' | 'status' | 'total') => setSortBy(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">التاريخ</SelectItem>
                    <SelectItem value="status">الحالة</SelectItem>
                    <SelectItem value="total">المبلغ</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">تنازلي</SelectItem>
                    <SelectItem value="asc">تصاعدي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              مسح المرشحات
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد طلبات مطابقة للمرشحات المحددة</p>
              <Button variant="outline" onClick={clearFilters} className="mt-2">
                مسح المرشحات
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredOrders.map((order) => {
            const statusInfo = getStatusInfo(order.status);
            const paymentInfo = getPaymentMethodInfo(order.paymentMethod);
            const priorityInfo = getPriorityInfo(order.priority);
            const StatusIcon = statusInfo.icon;

            return (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      {/* Clinic Avatar */}
                      <Avatar className="h-12 w-12">
                        <AvatarFallback>
                          {order.clinicName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>

                      {/* Order Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{order.clinicName}</h4>
                          <Badge className={cn("text-xs", statusInfo.color)} variant="outline">
                            <StatusIcon className="h-3 w-3 ml-1" />
                            {statusInfo.label}
                          </Badge>
                          {order.priority && order.priority !== 'medium' && (
                            <Badge className={cn("text-xs", priorityInfo.color)} variant="outline">
                              {priorityInfo.label}
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(order.orderDate).toLocaleDateString('ar-EG')}</span>
                          </div>

                          <div className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            <span>{order.items?.length || 0} منتج</span>
                          </div>

                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            <span className="font-medium text-primary">{order.total?.toFixed(2)} ج.م</span>
                          </div>

                          <div>
                            <Badge className={cn("text-xs", paymentInfo.color)} variant="secondary">
                              {paymentInfo.label}
                            </Badge>
                          </div>
                        </div>

                        {order.orderNumber && (
                          <div className="text-xs text-muted-foreground mt-1">
                            رقم الطلب: {order.orderNumber}
                          </div>
                        )}

                        {order.notes && (
                          <div className="text-xs text-muted-foreground mt-1 bg-muted px-2 py-1 rounded">
                            {order.notes}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewOrder(order)}
                      >
                        <Eye className="h-3 w-3 ml-1" />
                        عرض
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPrintOrder?.(order)}
                      >
                        <Printer className="h-3 w-3 ml-1" />
                        طباعة
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Order Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل الطلب</DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Header */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-lg mb-3">{selectedOrder.clinicName}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">رقم الطلب:</span>
                      <span>{selectedOrder.orderNumber || selectedOrder.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">تاريخ الطلب:</span>
                      <span>{new Date(selectedOrder.orderDate).toLocaleDateString('ar-EG')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">المندوب:</span>
                      <span>{selectedOrder.representativeName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الحالة:</span>
                      <Badge className={cn("text-xs", getStatusInfo(selectedOrder.status).color)} variant="outline">
                        {getStatusInfo(selectedOrder.status).label}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">معلومات الدفع</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">طريقة الدفع:</span>
                      <Badge className={cn("text-xs", getPaymentMethodInfo(selectedOrder.paymentMethod).color)} variant="secondary">
                        {getPaymentMethodInfo(selectedOrder.paymentMethod).label}
                      </Badge>
                    </div>
                    {selectedOrder.dueDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">تاريخ الاستحقاق:</span>
                        <span>{new Date(selectedOrder.dueDate).toLocaleDateString('ar-EG')}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الأولوية:</span>
                      <Badge className={cn("text-xs", getPriorityInfo(selectedOrder.priority).color)} variant="outline">
                        {getPriorityInfo(selectedOrder.priority).label}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h4 className="font-medium mb-3">المنتجات المطلوبة</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-right p-3 text-sm font-medium">المنتج</th>
                        <th className="text-center p-3 text-sm font-medium">الكمية</th>
                        <th className="text-center p-3 text-sm font-medium">السعر</th>
                        <th className="text-center p-3 text-sm font-medium">الخصم</th>
                        <th className="text-center p-3 text-sm font-medium">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items?.map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-3">
                            <div>
                              <div className="font-medium">{item.productName}</div>
                              {item.notes && (
                                <div className="text-xs text-muted-foreground">{item.notes}</div>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-center">{item.quantity}</td>
                          <td className="p-3 text-center">{(item.unitPrice || item.price)?.toFixed(2)} ج.م</td>
                          <td className="p-3 text-center">
                            {item.discount ? `${item.discount}%` : '—'}
                          </td>
                          <td className="p-3 text-center font-medium">{item.total?.toFixed(2)} ج.م</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-muted p-4 rounded-lg">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>المجموع الفرعي:</span>
                    <span>{selectedOrder.subtotal?.toFixed(2)} ج.م</span>
                  </div>
                  {selectedOrder.discountAmount && selectedOrder.discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>إجمالي الخصم:</span>
                      <span>-{selectedOrder.discountAmount.toFixed(2)} ج.م</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>الإجمالي النهائي:</span>
                    <span className="text-primary">{selectedOrder.total?.toFixed(2)} ج.م</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div>
                  <h4 className="font-medium mb-2">ملاحظات</h4>
                  <div className="bg-muted p-3 rounded-lg text-sm">
                    {selectedOrder.notes}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => onPrintOrder?.(selectedOrder)}>
                  <Printer className="h-4 w-4 ml-2" />
                  طباعة الطلب
                </Button>
                <Button variant="outline" onClick={() => setShowDetails(false)}>
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