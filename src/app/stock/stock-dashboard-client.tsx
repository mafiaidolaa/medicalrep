'use client';

/**
 * 🏭 EP Group System - Stock Dashboard Client Component
 * مكون العميل للوحة تحكم المخازن
 */

import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Package, 
  TrendingUp, 
  AlertTriangle,
  Eye,
  Plus,
  FileText,
  Settings,
  Search,
  Filter,
  MoreVertical,
  Warehouse,
  ShoppingCart,
  Users,
  Clock
} from 'lucide-react';

// Mock data - سيتم استبدالها بالبيانات الحقيقية من API
const mockDashboardData = {
  stats: {
    totalProducts: 245,
    totalValue: 2847650,
    lowStockItems: 12,
    pendingRequests: 8
  },
  warehouses: [
    { id: '1', name: 'المخزن الرئيسي', name_ar: 'المخزن الرئيسي', code: 'WH001', products: 156, value: 1847500 },
    { id: '2', name: 'فرع القاهرة', name_ar: 'مخزن فرع القاهرة', code: 'WH002', products: 89, value: 1000150 }
  ],
  recentRequests: [
    {
      id: '1',
      request_number: 'SR240101',
      title: 'طلب معدات طبية للقسم الجراحي',
      status: 'pending',
      priority: 'high',
      warehouse: 'المخزن الرئيسي',
      requested_by_name: 'د. أحمد محمود',
      total_value: 45600,
      created_at: '2024-01-01T10:30:00Z'
    },
    {
      id: '2',
      request_number: 'SR240102',
      title: 'طلب عينات للعرض على العملاء',
      status: 'manager_approved',
      priority: 'medium',
      warehouse: 'مخزن فرع القاهرة',
      requested_by_name: 'أحمد علي',
      total_value: 12000,
      created_at: '2024-01-01T09:15:00Z'
    }
  ],
  lowStockProducts: [
    {
      id: '1',
      name_ar: 'جهاز رسم القلب',
      code: 'PRD005',
      warehouse: 'المخزن الرئيسي',
      available_quantity: 3,
      min_stock_level: 2,
      unit: 'قطعة'
    },
    {
      id: '2',
      name_ar: 'ترمومتر رقمي',
      code: 'PRD006',
      warehouse: 'المخزن الرئيسي',
      available_quantity: 15,
      min_stock_level: 25,
      unit: 'قطعة'
    }
  ]
};

export default function StockDashboardClient() {
  const [data, setData] = useState(mockDashboardData);
  const [isLoading, setIsLoading] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { label: string; color: string; bgColor: string }> = {
      pending: { label: 'في الانتظار', color: '#F59E0B', bgColor: '#FEF3C7' },
      manager_approved: { label: 'موافقة الإدارة', color: '#3B82F6', bgColor: '#DBEAFE' },
      accounting_approved: { label: 'موافقة المحاسبة', color: '#8B5CF6', bgColor: '#EDE9FE' },
      ready_for_issue: { label: 'جاهز للصرف', color: '#06B6D4', bgColor: '#CFFAFE' },
      issued: { label: 'تم الصرف', color: '#10B981', bgColor: '#D1FAE5' },
      completed: { label: 'مكتمل', color: '#059669', bgColor: '#A7F3D0' },
      rejected: { label: 'مرفوض', color: '#EF4444', bgColor: '#FEE2E2' },
      cancelled: { label: 'ملغي', color: '#6B7280', bgColor: '#F3F4F6' }
    };
    return statusMap[status] || statusMap.pending;
  };

  const getPriorityInfo = (priority: string) => {
    const priorityMap: Record<string, { label: string; color: string }> = {
      low: { label: 'منخفض', color: '#6B7280' },
      medium: { label: 'متوسط', color: '#F59E0B' },
      high: { label: 'عالي', color: '#EF4444' },
      urgent: { label: 'عاجل', color: '#DC2626' }
    };
    return priorityMap[priority] || priorityMap.medium;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">إدارة المخازن</h1>
            <p className="text-gray-600 mt-1">لوحة تحكم شاملة لإدارة المخازن والمستلزمات الطبية</p>
          </div>
          <div className="flex items-center space-x-3 space-x-reverse">
            <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <Settings size={18} />
              الإعدادات
            </button>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <Plus size={18} />
              طلب جديد
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">إجمالي المنتجات</p>
              <p className="text-3xl font-bold text-gray-900">{data.stats.totalProducts.toLocaleString('ar-EG')}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">القيمة الإجمالية</p>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(data.stats.totalValue)}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">مخزون منخفض</p>
              <p className="text-3xl font-bold text-red-600">{data.stats.lowStockItems}</p>
            </div>
            <div className="bg-red-100 p-3 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">طلبات معلقة</p>
              <p className="text-3xl font-bold text-orange-600">{data.stats.pendingRequests}</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Warehouses Overview */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">المخازن</h2>
            <button className="text-blue-600 hover:text-blue-700 flex items-center gap-1">
              <Eye size={16} />
              عرض الكل
            </button>
          </div>
          
          <div className="space-y-4">
            {data.warehouses.map((warehouse) => (
              <div key={warehouse.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3 space-x-reverse">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Warehouse className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{warehouse.name_ar}</h3>
                    <p className="text-sm text-gray-500">كود: {warehouse.code}</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">{warehouse.products} منتج</p>
                  <p className="text-sm text-gray-600">{formatCurrency(warehouse.value)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Requests */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">الطلبات الحديثة</h2>
            <button className="text-blue-600 hover:text-blue-700 flex items-center gap-1">
              <Eye size={16} />
              عرض الكل
            </button>
          </div>
          
          <div className="space-y-4">
            {data.recentRequests.map((request) => {
              const statusInfo = getStatusInfo(request.status);
              const priorityInfo = getPriorityInfo(request.priority);
              
              return (
                <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 mb-1">{request.title}</h3>
                      <p className="text-sm text-gray-600">رقم الطلب: {request.request_number}</p>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                      <MoreVertical size={16} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <span 
                        className="px-2 py-1 text-xs font-medium rounded-full"
                        style={{ 
                          color: statusInfo.color, 
                          backgroundColor: statusInfo.bgColor 
                        }}
                      >
                        {statusInfo.label}
                      </span>
                      <span 
                        className="px-2 py-1 text-xs font-medium rounded-full"
                        style={{ color: priorityInfo.color }}
                      >
                        {priorityInfo.label}
                      </span>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">{formatCurrency(request.total_value)}</p>
                      <p className="text-xs text-gray-500">{request.requested_by_name}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h2 className="text-xl font-semibold text-gray-900">تحذيرات المخزون</h2>
          </div>
          <button className="text-blue-600 hover:text-blue-700 flex items-center gap-1">
            <Eye size={16} />
            عرض الكل
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-right py-3 px-4 font-medium text-gray-900">المنتج</th>
                <th className="text-right py-3 px-4 font-medium text-gray-900">الكود</th>
                <th className="text-right py-3 px-4 font-medium text-gray-900">المخزن</th>
                <th className="text-right py-3 px-4 font-medium text-gray-900">المتوفر</th>
                <th className="text-right py-3 px-4 font-medium text-gray-900">الحد الأدنى</th>
                <th className="text-right py-3 px-4 font-medium text-gray-900">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {data.lowStockProducts.map((product) => (
                <tr key={product.id} className="border-b border-gray-100">
                  <td className="py-3 px-4">{product.name_ar}</td>
                  <td className="py-3 px-4 text-gray-600">{product.code}</td>
                  <td className="py-3 px-4 text-gray-600">{product.warehouse}</td>
                  <td className="py-3 px-4">
                    <span className="font-medium">{product.available_quantity} {product.unit}</span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{product.min_stock_level} {product.unit}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                      {product.available_quantity === 0 ? 'نفد' : 'منخفض'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <button className="bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg p-6 text-center hover:bg-blue-100 transition-colors">
          <Plus className="h-8 w-8 text-blue-600 mx-auto mb-2" />
          <p className="font-medium text-blue-900">إنشاء طلب جديد</p>
          <p className="text-sm text-blue-600 mt-1">أضف طلب صرف أو استلام</p>
        </button>

        <button className="bg-green-50 border-2 border-dashed border-green-300 rounded-lg p-6 text-center hover:bg-green-100 transition-colors">
          <FileText className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <p className="font-medium text-green-900">التقارير</p>
          <p className="text-sm text-green-600 mt-1">عرض تقارير المخزون</p>
        </button>

        <button className="bg-purple-50 border-2 border-dashed border-purple-300 rounded-lg p-6 text-center hover:bg-purple-100 transition-colors">
          <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
          <p className="font-medium text-purple-900">الصلاحيات</p>
          <p className="text-sm text-purple-600 mt-1">إدارة صلاحيات المستخدمين</p>
        </button>
      </div>
    </div>
  );
}