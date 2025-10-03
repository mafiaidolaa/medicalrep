"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Search, Filter, Download, Eye, Edit, MoreHorizontal,
  Calendar, Package, User, MapPin, DollarSign, Clock,
  ChevronLeft, ChevronRight, RefreshCw, SortAsc, SortDesc,
  FileText, Truck, CheckCircle, XCircle, AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  Order, OrderStatus, OrderPriority, PaymentMethod,
  ORDER_STATUS_LABELS, PRIORITY_LABELS, PAYMENT_METHOD_LABELS,
  OrderFilters, OrderSortOptions
} from '@/types/orders';
import { 
  StatusBadge, PriorityBadge, PaymentMethodBadge, 
  OrderProgress, ClinicInfo, OrderSummary, OrderStatsCard
} from './order-ui-components';

interface PreviousOrdersProps {
  currentUser?: any;
  onViewOrder?: (order: Order) => void;
  onEditOrder?: (order: Order) => void;
  onExportOrders?: (filters: OrderFilters) => void;
  className?: string;
}

export function PreviousOrders({ 
  currentUser, 
  onViewOrder, 
  onEditOrder, 
  onExportOrders,
  className 
}: PreviousOrdersProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<OrderFilters>({});
  const [sortOptions, setSortOptions] = useState<OrderSortOptions>({
    field: 'orderDate',
    direction: 'desc'
  });

  // Mock data - في الواقع ستأتي من API
  const mockOrders: Order[] = [
    {
      id: '1',
      orderNumber: 'ORD-2024-001',
      clinicId: '1',
      clinicName: 'عيادة النور للأسنان',
      clinicArea: 'الرياض',
      clinicLine: 'الخط الأول',
      representativeId: 'rep1',
      representativeName: 'أحمد محمد',
      representativeRole: 'medical_rep',
      items: [
        {
          id: '1',
          productId: '1',
          productName: 'أدوية المضادات الحيوية',
          productPrice: 150,
          quantity: 2,
          unit: 'علبة',
          discount: 10,
          discountType: 'percentage',
          itemTotal: 300,
          discountAmount: 30,
          finalAmount: 270
        }
      ],
      itemsCount: 1,
      totalQuantity: 2,
      subtotal: 300,
      itemsDiscountAmount: 30,
      totalDiscountAmount: 30,
      finalTotal: 270,
      currency: 'EGP',
      paymentMethod: 'cash',
      priority: 'medium',
      status: 'delivered',
      orderDate: '2024-01-15T10:30:00Z',
      deliveredAt: '2024-01-18T14:00:00Z',
      approvals: [],
      requiresManagerApproval: false,
      requiresAccountantApproval: false,
      isFullyApproved: true,
      history: [],
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-18T14:00:00Z',
      createdBy: 'rep1'
    },
    {
      id: '2',
      orderNumber: 'ORD-2024-002',
      clinicId: '2',
      clinicName: 'مجمع الشفاء الطبي',
      clinicArea: 'الرياض',
      clinicLine: 'الخط الثاني',
      representativeId: 'rep1',
      representativeName: 'أحمد محمد',
      representativeRole: 'medical_rep',
      items: [
        {
          id: '2',
          productId: '2',
          productName: 'مستلزمات جراحية',
          productPrice: 75,
          quantity: 5,
          unit: 'حزمة',
          discount: 0,
          discountType: 'percentage',
          itemTotal: 375,
          discountAmount: 0,
          finalAmount: 375
        }
      ],
      itemsCount: 1,
      totalQuantity: 5,
      subtotal: 375,
      itemsDiscountAmount: 0,
      totalDiscountAmount: 0,
      finalTotal: 375,
      currency: 'EGP',
      paymentMethod: 'deferred',
      priority: 'high',
      status: 'pending',
      orderDate: '2024-01-20T08:15:00Z',
      approvals: [
        {
          id: '1',
          orderId: '2',
          approverType: 'manager',
          approverId: 'mgr1',
          approverName: 'محمد أحمد',
          status: 'pending',
          createdAt: '2024-01-20T08:15:00Z'
        }
      ],
      requiresManagerApproval: true,
      requiresAccountantApproval: false,
      isFullyApproved: false,
      history: [],
      createdAt: '2024-01-20T08:15:00Z',
      updatedAt: '2024-01-20T08:15:00Z',
      createdBy: 'rep1'
    }
  ];

  // Filter and sort orders
  useEffect(() => {
    let result = [...mockOrders];

    // Apply filters
    if (filters.status && filters.status.length > 0) {
      result = result.filter(order => filters.status!.includes(order.status));
    }

    if (filters.priority && filters.priority.length > 0) {
      result = result.filter(order => filters.priority!.includes(order.priority));
    }

    if (filters.paymentMethod && filters.paymentMethod.length > 0) {
      result = result.filter(order => filters.paymentMethod!.includes(order.paymentMethod));
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      result = result.filter(order =>
        order.orderNumber.toLowerCase().includes(searchTerm) ||
        order.clinicName.toLowerCase().includes(searchTerm) ||
        order.representativeName.toLowerCase().includes(searchTerm)
      );
    }

    if (filters.dateFrom) {
      result = result.filter(order => new Date(order.orderDate) >= new Date(filters.dateFrom!));
    }

    if (filters.dateTo) {
      result = result.filter(order => new Date(order.orderDate) <= new Date(filters.dateTo!));
    }

    if (filters.amountFrom) {
      result = result.filter(order => order.finalTotal >= filters.amountFrom!);
    }

    if (filters.amountTo) {
      result = result.filter(order => order.finalTotal <= filters.amountTo!);
    }

    // Apply sorting
    result.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortOptions.field) {
        case 'orderDate':
          aValue = new Date(a.orderDate);
          bValue = new Date(b.orderDate);
          break;
        case 'finalTotal':
          aValue = a.finalTotal;
          bValue = b.finalTotal;
          break;
        case 'clinicName':
          aValue = a.clinicName;
          bValue = b.clinicName;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          aValue = a.orderDate;
          bValue = b.orderDate;
      }

      if (aValue < bValue) return sortOptions.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOptions.direction === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredOrders(result);
    setTotalPages(Math.ceil(result.length / 10));
  }, [filters, sortOptions]);

  // Get orders for current page
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * 10;
    return filteredOrders.slice(startIndex, startIndex + 10);
  }, [filteredOrders, currentPage]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = filteredOrders.length;
    const pending = filteredOrders.filter(o => o.status === 'pending').length;
    const approved = filteredOrders.filter(o => o.status === 'approved').length;
    const delivered = filteredOrders.filter(o => o.status === 'delivered').length;
    const totalValue = filteredOrders.reduce((sum, o) => sum + o.finalTotal, 0);
    
    return {
      total,
      pending,
      approved,
      delivered,
      totalValue,
      averageValue: total > 0 ? totalValue / total : 0
    };
  }, [filteredOrders]);

  // Status tabs
  const statusTabs = [
    { value: 'all', label: 'الكل', count: stats.total },
    { value: 'pending', label: 'في الانتظار', count: stats.pending },
    { value: 'approved', label: 'معتمد', count: stats.approved },
    { value: 'delivered', label: 'مُسلم', count: stats.delivered }
  ];

  const handleFilterChange = (key: keyof OrderFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleStatusTabChange = (status: string) => {
    if (status === 'all') {
      handleFilterChange('status', undefined);
    } else {
      handleFilterChange('status', [status as OrderStatus]);
    }
  };

  const handleSortChange = (field: OrderSortOptions['field']) => {
    setSortOptions(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const clearFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };

  const SortButton = ({ field, children }: { field: OrderSortOptions['field'], children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleSortChange(field)}
      className="h-auto p-1 font-medium"
    >
      {children}
      {sortOptions.field === field && (
        sortOptions.direction === 'asc' 
          ? <SortAsc className="h-3 w-3 ml-1" />
          : <SortDesc className="h-3 w-3 ml-1" />
      )}
    </Button>
  );

  return (
    <div className={cn("space-y-6", className)}>
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <OrderStatsCard
          title="إجمالي الطلبات"
          value={stats.total}
          icon={<Package className="h-4 w-4" />}
        />
        <OrderStatsCard
          title="قيد الانتظار"
          value={stats.pending}
          icon={<Clock className="h-4 w-4" />}
        />
        <OrderStatsCard
          title="تم التسليم"
          value={stats.delivered}
          icon={<CheckCircle className="h-4 w-4" />}
        />
        <OrderStatsCard
          title="إجمالي القيمة"
          value={stats.totalValue}
          subtitle="ج.م"
          icon={<DollarSign className="h-4 w-4" />}
        />
      </div>

      {/* Filters Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            البحث والفلترة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث برقم الطلب أو العيادة..."
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pr-9"
              />
            </div>

            {/* Priority Filter */}
            <Select
              value={filters.priority?.[0] || 'all'}
              onValueChange={(value) => 
                handleFilterChange('priority', value === 'all' ? undefined : [value as OrderPriority])
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="الأولوية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأولويات</SelectItem>
                <SelectItem value="urgent">عاجل</SelectItem>
                <SelectItem value="high">عالية</SelectItem>
                <SelectItem value="medium">متوسطة</SelectItem>
                <SelectItem value="low">منخفضة</SelectItem>
              </SelectContent>
            </Select>

            {/* Payment Method Filter */}
            <Select
              value={filters.paymentMethod?.[0] || 'all'}
              onValueChange={(value) => 
                handleFilterChange('paymentMethod', value === 'all' ? undefined : [value as PaymentMethod])
              }
            >
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

            {/* Clear Filters */}
            <Button variant="outline" onClick={clearFilters}>
              <RefreshCw className="h-4 w-4 ml-2" />
              إعادة تعيين
            </Button>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>من تاريخ</Label>
              <Input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
            </div>
            <div>
              <Label>إلى تاريخ</Label>
              <Input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Tabs */}
      <Tabs defaultValue="all" onValueChange={handleStatusTabChange}>
        <TabsList className="grid w-full grid-cols-4">
          {statusTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-2">
              <span>{tab.label}</span>
              <Badge variant="secondary" className="text-xs">
                {tab.count}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Orders List */}
        <div className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>قائمة الطلبات ({filteredOrders.length})</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => onExportOrders?.(filters)}>
                  <Download className="h-4 w-4 ml-2" />
                  تصدير
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p>جاري تحميل الطلبات...</p>
                </div>
              ) : paginatedOrders.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">لا توجد طلبات</h3>
                  <p className="text-muted-foreground">لم يتم العثور على طلبات تطابق المعايير المحددة</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-4 p-4 bg-muted/50 rounded-lg font-medium text-sm">
                    <div className="col-span-2">
                      <SortButton field="orderDate">رقم الطلب</SortButton>
                    </div>
                    <div className="col-span-3">
                      <SortButton field="clinicName">العيادة</SortButton>
                    </div>
                    <div className="col-span-2">التاريخ</div>
                    <div className="col-span-1">
                      <SortButton field="status">الحالة</SortButton>
                    </div>
                    <div className="col-span-1">الأولوية</div>
                    <div className="col-span-2">
                      <SortButton field="finalTotal">المبلغ</SortButton>
                    </div>
                    <div className="col-span-1">الإجراءات</div>
                  </div>

                  {/* Orders */}
                  {paginatedOrders.map((order) => (
                    <Card key={order.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="grid grid-cols-12 gap-4 items-center">
                          <div className="col-span-2">
                            <div className="font-medium">{order.orderNumber}</div>
                            <div className="text-xs text-muted-foreground">
                              {order.itemsCount} منتج
                            </div>
                          </div>

                          <div className="col-span-3">
                            <div className="font-medium">{order.clinicName}</div>
                            <div className="text-xs text-muted-foreground">
                              {order.clinicArea} - {order.clinicLine}
                            </div>
                          </div>

                          <div className="col-span-2">
                            <div className="text-sm">
                              {new Date(order.orderDate).toLocaleDateString('ar-EG')}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(order.orderDate).toLocaleTimeString('ar-EG', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>

                          <div className="col-span-1">
                            <StatusBadge status={order.status} />
                          </div>

                          <div className="col-span-1">
                            <PriorityBadge priority={order.priority} />
                          </div>

                          <div className="col-span-2">
                            <div className="font-bold text-lg">
                              {order.finalTotal.toFixed(2)} ج.م
                            </div>
                            <PaymentMethodBadge method={order.paymentMethod} />
                          </div>

                          <div className="col-span-1">
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onViewOrder?.(order)}
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onEditOrder?.(order)}
                                disabled={!['draft', 'pending'].includes(order.status)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Order Progress */}
                        <div className="mt-4">
                          <OrderProgress status={order.status} />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-muted-foreground">
                    عرض {((currentPage - 1) * 10) + 1} إلى {Math.min(currentPage * 10, filteredOrders.length)} من {filteredOrders.length} طلب
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium">
                      {currentPage} من {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Tabs>
    </div>
  );
}