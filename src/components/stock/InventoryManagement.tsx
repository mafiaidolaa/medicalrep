/**
 * 📦 EP Group System - Inventory Management
 * إدارة المخزون والحركات بين المخازن
 * 
 * ملاحظة: هذا المكون يدير المخزون وتوزيعه على المخازن فقط
 * المنتجات وأسعارها يتم إدارتها من قسم إدارة المنتجات
 */

import React, { useState, useEffect } from 'react';
import {
  ArrowUpDown, ArrowUp, ArrowDown, Package, Warehouse,
  Search, Filter, Download, Plus, RefreshCw, Eye,
  AlertTriangle, TrendingUp, BarChart3, Calendar,
  MapPin, Users, CheckCircle, XCircle, Clock,
  Move, Edit, Trash2, Save, X
} from 'lucide-react';

import { stockService } from '../../lib/stock/stock-management-service';
import { stockSecurityService } from '../../lib/stock/stock-security';
import { stockAPIEndpoints } from '../../lib/stock/stock-api-endpoints';

// ==================================================================
// أنواع البيانات لإدارة المخزون
// ==================================================================

interface InventoryItem {
  id: string;
  product_id: string;
  warehouse_id: string;
  available_quantity: number;
  reserved_quantity: number;
  total_quantity: number;
  last_updated: string;
  product: {
    id: string;
    name_ar: string;
    name_en?: string;
    code: string;
    barcode?: string;
    unit_of_measure: string;
    cost_price: number;
    selling_price: number;
    min_stock_level: number;
    max_stock_level: number;
    image_url?: string;
  };
  warehouse: {
    id: string;
    name: string;
    code: string;
    location?: string;
  };
  status: 'adequate' | 'low' | 'critical' | 'out_of_stock' | 'overstocked';
}

interface StockMovement {
  id: string;
  movement_type: 'in' | 'out' | 'transfer' | 'adjustment';
  product_id: string;
  warehouse_id: string;
  from_warehouse_id?: string;
  to_warehouse_id?: string;
  quantity: number;
  unit_price?: number;
  total_value?: number;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  status: string;
  product?: {
    name_ar: string;
    code: string;
    unit_of_measure: string;
  };
  warehouse?: {
    name: string;
  };
  from_warehouse?: {
    name: string;
  };
  to_warehouse?: {
    name: string;
  };
}

interface InventoryFilters {
  search: string;
  warehouse_id: string;
  status: 'all' | 'adequate' | 'low' | 'critical' | 'out_of_stock' | 'overstocked';
  sort_by: 'product_name' | 'warehouse' | 'quantity' | 'value' | 'status' | 'last_updated';
  sort_order: 'asc' | 'desc';
}

interface MovementFormData {
  movement_type: 'in' | 'out' | 'transfer' | 'adjustment';
  product_id: string;
  warehouse_id: string;
  from_warehouse_id?: string;
  to_warehouse_id?: string;
  quantity: number;
  unit_price?: number;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
}

// ==================================================================
// المكون الرئيسي لإدارة المخزون
// ==================================================================

const InventoryManagement: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'inventory' | 'movements'>('inventory');
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  
  const [filters, setFilters] = useState<InventoryFilters>({
    search: '',
    warehouse_id: '',
    status: 'all',
    sort_by: 'product_name',
    sort_order: 'asc'
  });

  const [movementForm, setMovementForm] = useState<MovementFormData>({
    movement_type: 'in',
    product_id: '',
    warehouse_id: '',
    quantity: 0,
    unit_price: 0,
    notes: ''
  });

  const [userPermissions, setUserPermissions] = useState<any>({});

  useEffect(() => {
    loadData();
    loadUserPermissions();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // جلب بيانات المخزون
      const inventoryData = await loadInventoryData();
      
      // جلب حركات المخزون الحديثة
      const movementsData = await stockService.getStockMovements({
        limit: 100,
        warehouse_id: filters.warehouse_id || undefined
      });
      
      // جلب المخازن والمنتجات
      const [warehousesData, productsData] = await Promise.all([
        stockService.getWarehouses(),
        stockService.getProducts({ is_active: true })
      ]);

      setInventory(inventoryData);
      setMovements(movementsData);
      setWarehouses(warehousesData);
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading inventory data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInventoryData = async (): Promise<InventoryItem[]> => {
    // جلب مستويات المخزون من جميع المخازن
    const stockLevels = await stockService.getStockLevels({
      warehouse_id: filters.warehouse_id || undefined
    });

    // تحويل البيانات وإضافة معلومات الحالة
    const inventoryItems: InventoryItem[] = stockLevels.map(stock => {
      const totalQuantity = stock.available_quantity + stock.reserved_quantity;
      const product = stock.product;
      
      // تحديد حالة المخزون
      let status: InventoryItem['status'] = 'adequate';
      
      if (totalQuantity === 0) {
        status = 'out_of_stock';
      } else if (totalQuantity <= (product?.min_stock_level || 10)) {
        status = totalQuantity <= (product?.min_stock_level || 10) / 2 ? 'critical' : 'low';
      } else if (totalQuantity >= (product?.max_stock_level || 1000)) {
        status = 'overstocked';
      }

      return {
        id: `${stock.warehouse_id}-${stock.product_id}`,
        product_id: stock.product_id,
        warehouse_id: stock.warehouse_id,
        available_quantity: stock.available_quantity,
        reserved_quantity: stock.reserved_quantity,
        total_quantity: totalQuantity,
        last_updated: stock.updated_at || new Date().toISOString(),
        product: {
          id: stock.product_id,
          name_ar: product?.name_ar || 'منتج غير معروف',
          name_en: product?.name_en,
          code: product?.code || 'N/A',
          barcode: product?.barcode,
          unit_of_measure: product?.unit_of_measure || 'قطعة',
          cost_price: product?.cost_price || 0,
          selling_price: product?.selling_price || 0,
          min_stock_level: product?.min_stock_level || 10,
          max_stock_level: product?.max_stock_level || 1000,
          image_url: product?.image_url
        },
        warehouse: {
          id: stock.warehouse_id,
          name: stock.warehouse?.name || 'مخزن غير معروف',
          code: stock.warehouse?.code || 'N/A',
          location: stock.warehouse?.location
        },
        status
      };
    });

    return applyInventoryFilters(inventoryItems);
  };

  const applyInventoryFilters = (items: InventoryItem[]): InventoryItem[] => {
    let filtered = items;

    // البحث النصي
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(item =>
        item.product.name_ar.toLowerCase().includes(searchLower) ||
        item.product.name_en?.toLowerCase().includes(searchLower) ||
        item.product.code.toLowerCase().includes(searchLower) ||
        item.product.barcode?.toLowerCase().includes(searchLower) ||
        item.warehouse.name.toLowerCase().includes(searchLower)
      );
    }

    // فلترة الحالة
    if (filters.status !== 'all') {
      filtered = filtered.filter(item => item.status === filters.status);
    }

    // الترتيب
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (filters.sort_by) {
        case 'product_name':
          aValue = a.product.name_ar;
          bValue = b.product.name_ar;
          break;
        case 'warehouse':
          aValue = a.warehouse.name;
          bValue = b.warehouse.name;
          break;
        case 'quantity':
          aValue = a.total_quantity;
          bValue = b.total_quantity;
          break;
        case 'value':
          aValue = a.total_quantity * a.product.selling_price;
          bValue = b.total_quantity * b.product.selling_price;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'last_updated':
          aValue = new Date(a.last_updated);
          bValue = new Date(b.last_updated);
          break;
        default:
          return 0;
      }

      if (filters.sort_order === 'desc') {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      } else {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      }
    });

    return filtered;
  };

  const loadUserPermissions = async () => {
    try {
      const permissions = await stockSecurityService.getUserPermissions('current_user');
      setUserPermissions(permissions);
    } catch (error) {
      console.error('Error loading permissions:', error);
    }
  };

  const handleMovementSubmit = async () => {
    try {
      // إنشاء حركة جديدة
      await stockService.createStockMovement(movementForm);

      // تسجيل العملية في نظام الأمان
      await stockSecurityService.logSecurityEvent({
        user_id: 'current_user',
        action: 'create_stock_movement',
        entity_type: 'stock_movement',
        entity_id: 'new',
        description: `إنشاء حركة مخزون: ${movementForm.movement_type} - ${movementForm.quantity} وحدة`,
        ip_address: '0.0.0.0',
        user_agent: 'Web Interface'
      });

      setShowMovementForm(false);
      resetMovementForm();
      await loadData();
    } catch (error: any) {
      console.error('Error creating movement:', error);
      alert(`خطأ في إنشاء الحركة: ${error.message}`);
    }
  };

  const resetMovementForm = () => {
    setMovementForm({
      movement_type: 'in',
      product_id: '',
      warehouse_id: '',
      quantity: 0,
      unit_price: 0,
      notes: ''
    });
  };

  const getStatusColor = (status: InventoryItem['status']): string => {
    switch (status) {
      case 'adequate': return 'bg-green-100 text-green-800';
      case 'low': return 'bg-yellow-100 text-yellow-800';
      case 'critical': return 'bg-red-100 text-red-800';
      case 'out_of_stock': return 'bg-gray-100 text-gray-800';
      case 'overstocked': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: InventoryItem['status']): string => {
    switch (status) {
      case 'adequate': return 'كافي';
      case 'low': return 'منخفض';
      case 'critical': return 'حرج';
      case 'out_of_stock': return 'منتهي';
      case 'overstocked': return 'مفرط';
      default: return 'غير محدد';
    }
  };

  const getMovementTypeColor = (type: string): string => {
    switch (type) {
      case 'in': return 'bg-green-100 text-green-800';
      case 'out': return 'bg-red-100 text-red-800';
      case 'transfer': return 'bg-blue-100 text-blue-800';
      case 'adjustment': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMovementTypeText = (type: string): string => {
    switch (type) {
      case 'in': return 'إدخال';
      case 'out': return 'صرف';
      case 'transfer': return 'نقل';
      case 'adjustment': return 'تسوية';
      default: return 'غير محدد';
    }
  };

  const exportInventory = async (format: 'pdf' | 'excel') => {
    try {
      const exportData = inventory.map(item => ({
        'كود المنتج': item.product.code,
        'اسم المنتج': item.product.name_ar,
        'المخزن': item.warehouse.name,
        'الكمية المتاحة': item.available_quantity,
        'الكمية المحجوزة': item.reserved_quantity,
        'إجمالي الكمية': item.total_quantity,
        'قيمة المخزون': item.total_quantity * item.product.selling_price,
        'الحد الأدنى': item.product.min_stock_level,
        'الحد الأقصى': item.product.max_stock_level,
        'الحالة': getStatusText(item.status),
        'آخر تحديث': new Date(item.last_updated).toLocaleDateString('ar-EG')
      }));

      console.log('Exporting inventory:', exportData);
      alert(`تم تصدير ${inventory.length} عنصر بصيغة ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error exporting inventory:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="animate-spin h-8 w-8 text-blue-600" />
          <p className="text-gray-600">جاري تحميل بيانات المخزون...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto" dir="rtl">
      {/* العنوان والتبويبات */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <ArrowUpDown className="h-8 w-8 text-blue-600" />
              📦 إدارة المخزون والحركات
            </h1>
            <p className="text-gray-600">
              إدارة وتتبع مستويات المخزون وحركات المنتجات بين المخازن
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3 mt-4 sm:mt-0">
            <button
              onClick={() => exportInventory('excel')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Download className="h-4 w-4" />
              تصدير Excel
            </button>
            
            {userPermissions.can_manage && (
              <button
                onClick={() => setShowMovementForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                حركة جديدة
              </button>
            )}

            <button
              onClick={loadData}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              <RefreshCw className="h-4 w-4" />
              تحديث
            </button>
          </div>
        </div>

        {/* التبويبات */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'inventory'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Package className="h-4 w-4 inline-block ml-2" />
              مستويات المخزون
            </button>
            <button
              onClick={() => setActiveTab('movements')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'movements'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <ArrowUpDown className="h-4 w-4 inline-block ml-2" />
              حركات المخزون
            </button>
          </nav>
        </div>
      </div>

      {/* شريط البحث والفلترة */}
      <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {/* البحث */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="البحث في المنتجات والمخازن..."
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* المخزن */}
          <select
            value={filters.warehouse_id}
            onChange={(e) => setFilters({...filters, warehouse_id: e.target.value})}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">جميع المخازن</option>
            {warehouses.map(warehouse => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </select>

          {/* الحالة */}
          <select
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value as any})}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">جميع الحالات</option>
            <option value="adequate">كافي</option>
            <option value="low">منخفض</option>
            <option value="critical">حرج</option>
            <option value="out_of_stock">منتهي</option>
            <option value="overstocked">مفرط</option>
          </select>

          {/* الترتيب */}
          <select
            value={filters.sort_by}
            onChange={(e) => setFilters({...filters, sort_by: e.target.value as any})}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="product_name">اسم المنتج</option>
            <option value="warehouse">المخزن</option>
            <option value="quantity">الكمية</option>
            <option value="value">القيمة</option>
            <option value="status">الحالة</option>
            <option value="last_updated">آخر تحديث</option>
          </select>

          {/* اتجاه الترتيب */}
          <button
            onClick={() => setFilters({
              ...filters, 
              sort_order: filters.sort_order === 'asc' ? 'desc' : 'asc'
            })}
            className={`px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 ${
              filters.sort_order === 'desc' ? 'bg-gray-100' : ''
            }`}
          >
            {filters.sort_order === 'asc' ? '↑ تصاعدي' : '↓ تنازلي'}
          </button>
        </div>
      </div>

      {/* المحتوى حسب التبويب */}
      {activeTab === 'inventory' ? (
        <InventoryTable
          inventory={inventory}
          onItemClick={(item) => {
            setSelectedItem(item);
            setShowDetails(true);
          }}
          userPermissions={userPermissions}
          getStatusColor={getStatusColor}
          getStatusText={getStatusText}
        />
      ) : (
        <MovementsTable
          movements={movements}
          getMovementTypeColor={getMovementTypeColor}
          getMovementTypeText={getMovementTypeText}
        />
      )}

      {/* نموذج إضافة حركة */}
      {showMovementForm && (
        <MovementFormModal
          formData={movementForm}
          setFormData={setMovementForm}
          warehouses={warehouses}
          products={products}
          onSave={handleMovementSubmit}
          onCancel={() => {
            setShowMovementForm(false);
            resetMovementForm();
          }}
        />
      )}

      {/* تفاصيل العنصر */}
      {showDetails && selectedItem && (
        <InventoryDetailsModal
          item={selectedItem}
          onClose={() => {
            setShowDetails(false);
            setSelectedItem(null);
          }}
        />
      )}
    </div>
  );
};

// ==================================================================
// مكونات مساعدة
// ==================================================================

interface InventoryTableProps {
  inventory: InventoryItem[];
  onItemClick: (item: InventoryItem) => void;
  userPermissions: any;
  getStatusColor: (status: InventoryItem['status']) => string;
  getStatusText: (status: InventoryItem['status']) => string;
}

const InventoryTable: React.FC<InventoryTableProps> = ({
  inventory, onItemClick, userPermissions, getStatusColor, getStatusText
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">المنتج</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">المخزن</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">الكميات</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">القيمة</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">الحدود</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">الحالة</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">آخر تحديث</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {inventory.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    {item.product.image_url ? (
                      <img 
                        src={item.product.image_url} 
                        alt={item.product.name_ar}
                        className="h-10 w-10 rounded-lg object-cover border"
                      />
                    ) : (
                      <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Package className="h-5 w-5 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{item.product.name_ar}</p>
                      <p className="text-sm text-gray-500">{item.product.code}</p>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <Warehouse className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">{item.warehouse.name}</p>
                      <p className="text-xs text-gray-500">{item.warehouse.code}</p>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-4">
                  <div className="space-y-1">
                    <p className="text-sm">
                      <span className="text-green-600 font-medium">{item.available_quantity}</span> متاح
                    </p>
                    {item.reserved_quantity > 0 && (
                      <p className="text-sm">
                        <span className="text-yellow-600">{item.reserved_quantity}</span> محجوز
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      الإجمالي: {item.total_quantity} {item.product.unit_of_measure}
                    </p>
                  </div>
                </td>

                <td className="px-4 py-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {(item.total_quantity * item.product.selling_price).toLocaleString('ar-EG')} جنيه
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.product.selling_price.toLocaleString('ar-EG')} جنيه/الوحدة
                    </p>
                  </div>
                </td>

                <td className="px-4 py-4">
                  <div className="text-xs space-y-1">
                    <p>الأدنى: {item.product.min_stock_level}</p>
                    <p>الأقصى: {item.product.max_stock_level}</p>
                  </div>
                </td>

                <td className="px-4 py-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                    {getStatusText(item.status)}
                  </span>
                </td>

                <td className="px-4 py-4">
                  <p className="text-xs text-gray-600">
                    {new Date(item.last_updated).toLocaleDateString('ar-EG')}
                  </p>
                </td>

                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onItemClick(item)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="عرض التفاصيل"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {inventory.length === 0 && (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600">لا توجد عناصر مخزون تطابق معايير البحث</p>
          </div>
        )}
      </div>
    </div>
  );
};

interface MovementsTableProps {
  movements: StockMovement[];
  getMovementTypeColor: (type: string) => string;
  getMovementTypeText: (type: string) => string;
}

const MovementsTable: React.FC<MovementsTableProps> = ({
  movements, getMovementTypeColor, getMovementTypeText
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">النوع</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">المنتج</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">المخزن</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">الكمية</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">القيمة</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">تاريخ الحركة</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">المستخدم</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">ملاحظات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {movements.map((movement) => (
              <tr key={movement.id} className="hover:bg-gray-50">
                <td className="px-4 py-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getMovementTypeColor(movement.movement_type)}`}>
                    {getMovementTypeText(movement.movement_type)}
                  </span>
                </td>

                <td className="px-4 py-4">
                  <div>
                    <p className="text-sm font-medium">{movement.product?.name_ar}</p>
                    <p className="text-xs text-gray-500">{movement.product?.code}</p>
                  </div>
                </td>

                <td className="px-4 py-4">
                  <div>
                    {movement.movement_type === 'transfer' ? (
                      <div className="text-sm">
                        <p>من: {movement.from_warehouse?.name}</p>
                        <p>إلى: {movement.to_warehouse?.name}</p>
                      </div>
                    ) : (
                      <p className="text-sm">{movement.warehouse?.name}</p>
                    )}
                  </div>
                </td>

                <td className="px-4 py-4">
                  <div className="flex items-center gap-1">
                    {movement.movement_type === 'in' && <ArrowUp className="h-4 w-4 text-green-600" />}
                    {movement.movement_type === 'out' && <ArrowDown className="h-4 w-4 text-red-600" />}
                    {movement.movement_type === 'transfer' && <Move className="h-4 w-4 text-blue-600" />}
                    <span className="text-sm font-medium">
                      {movement.quantity} {movement.product?.unit_of_measure}
                    </span>
                  </div>
                </td>

                <td className="px-4 py-4">
                  {movement.total_value && (
                    <p className="text-sm font-medium">
                      {movement.total_value.toLocaleString('ar-EG')} جنيه
                    </p>
                  )}
                </td>

                <td className="px-4 py-4">
                  <p className="text-sm text-gray-600">
                    {new Date(movement.created_at).toLocaleDateString('ar-EG')}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(movement.created_at).toLocaleTimeString('ar-EG')}
                  </p>
                </td>

                <td className="px-4 py-4">
                  <p className="text-sm">{movement.created_by}</p>
                </td>

                <td className="px-4 py-4">
                  <p className="text-sm text-gray-600">{movement.notes}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {movements.length === 0 && (
          <div className="text-center py-12">
            <ArrowUpDown className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600">لا توجد حركات مخزون</p>
          </div>
        )}
      </div>
    </div>
  );
};

interface MovementFormModalProps {
  formData: MovementFormData;
  setFormData: (data: MovementFormData) => void;
  warehouses: any[];
  products: any[];
  onSave: () => void;
  onCancel: () => void;
}

const MovementFormModal: React.FC<MovementFormModalProps> = ({
  formData, setFormData, warehouses, products, onSave, onCancel
}) => {
  const selectedProduct = products.find(p => p.id === formData.product_id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">إضافة حركة مخزون جديدة</h2>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* نوع الحركة */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              نوع الحركة *
            </label>
            <select
              value={formData.movement_type}
              onChange={(e) => setFormData({...formData, movement_type: e.target.value as any})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="in">إدخال</option>
              <option value="out">صرف</option>
              <option value="transfer">نقل</option>
              <option value="adjustment">تسوية</option>
            </select>
          </div>

          {/* المنتج */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              المنتج *
            </label>
            <select
              value={formData.product_id}
              onChange={(e) => {
                const product = products.find(p => p.id === e.target.value);
                setFormData({
                  ...formData, 
                  product_id: e.target.value,
                  unit_price: product?.selling_price || 0
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">اختر المنتج</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name_ar} ({product.code})
                </option>
              ))}
            </select>
          </div>

          {/* المخزن */}
          {formData.movement_type !== 'transfer' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                المخزن *
              </label>
              <select
                value={formData.warehouse_id}
                onChange={(e) => setFormData({...formData, warehouse_id: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">اختر المخزن</option>
                {warehouses.map(warehouse => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* النقل بين المخازن */}
          {formData.movement_type === 'transfer' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  من مخزن *
                </label>
                <select
                  value={formData.from_warehouse_id}
                  onChange={(e) => setFormData({...formData, from_warehouse_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">اختر المخزن</option>
                  {warehouses.map(warehouse => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  إلى مخزن *
                </label>
                <select
                  value={formData.to_warehouse_id}
                  onChange={(e) => setFormData({...formData, to_warehouse_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">اختر المخزن</option>
                  {warehouses.filter(w => w.id !== formData.from_warehouse_id).map(warehouse => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* الكمية والسعر */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الكمية *
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: Number(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
                min="1"
              />
              {selectedProduct && (
                <p className="text-xs text-gray-500 mt-1">
                  الوحدة: {selectedProduct.unit_of_measure}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                سعر الوحدة (جنيه)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.unit_price}
                onChange={(e) => setFormData({...formData, unit_price: Number(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min="0"
              />
              {formData.quantity > 0 && formData.unit_price && formData.unit_price > 0 && (
                <p className="text-xs text-green-600 mt-1">
                  الإجمالي: {(formData.quantity * formData.unit_price).toLocaleString('ar-EG')} جنيه
                </p>
              )}
            </div>
          </div>

          {/* الملاحظات */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ملاحظات
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="أدخل أي ملاحظات إضافية..."
            />
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            إلغاء
          </button>
          <button
            onClick={onSave}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Save className="h-4 w-4" />
            حفظ الحركة
          </button>
        </div>
      </div>
    </div>
  );
};

interface InventoryDetailsModalProps {
  item: InventoryItem;
  onClose: () => void;
}

const InventoryDetailsModal: React.FC<InventoryDetailsModalProps> = ({ item, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">تفاصيل المخزون</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* معلومات المنتج */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-start gap-4">
              {item.product.image_url ? (
                <img 
                  src={item.product.image_url} 
                  alt={item.product.name_ar}
                  className="h-20 w-20 rounded-lg object-cover border"
                />
              ) : (
                <div className="h-20 w-20 bg-gray-200 rounded-lg flex items-center justify-center">
                  <Package className="h-8 w-8 text-gray-400" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900">{item.product.name_ar}</h3>
                {item.product.name_en && (
                  <p className="text-gray-600">{item.product.name_en}</p>
                )}
                <div className="flex items-center gap-4 mt-2">
                  <span className="font-mono text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {item.product.code}
                  </span>
                  {item.product.barcode && (
                    <span className="font-mono text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {item.product.barcode}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <Warehouse className="h-5 w-5 text-blue-600 inline-block ml-2" />
                <span className="font-medium">{item.warehouse.name}</span>
                <p className="text-sm text-gray-500">{item.warehouse.code}</p>
              </div>
            </div>
          </div>

          {/* إحصائيات المخزون */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h4 className="font-semibold text-green-900">متاح</h4>
              </div>
              <p className="text-2xl font-bold text-green-900">
                {item.available_quantity.toLocaleString('ar-EG')}
              </p>
              <p className="text-sm text-green-700">{item.product.unit_of_measure}</p>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <h4 className="font-semibold text-yellow-900">محجوز</h4>
              </div>
              <p className="text-2xl font-bold text-yellow-900">
                {item.reserved_quantity.toLocaleString('ar-EG')}
              </p>
              <p className="text-sm text-yellow-700">{item.product.unit_of_measure}</p>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-5 w-5 text-blue-600" />
                <h4 className="font-semibold text-blue-900">إجمالي</h4>
              </div>
              <p className="text-2xl font-bold text-blue-900">
                {item.total_quantity.toLocaleString('ar-EG')}
              </p>
              <p className="text-sm text-blue-700">{item.product.unit_of_measure}</p>
            </div>
          </div>

          {/* معلومات القيمة */}
          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-4">معلومات القيمة</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600">سعر التكلفة:</p>
                <p className="font-medium">{item.product.cost_price.toLocaleString('ar-EG')} جنيه</p>
              </div>
              <div>
                <p className="text-gray-600">سعر البيع:</p>
                <p className="font-medium">{item.product.selling_price.toLocaleString('ar-EG')} جنيه</p>
              </div>
              <div>
                <p className="text-gray-600">قيمة المخزون:</p>
                <p className="font-medium text-green-600">
                  {(item.total_quantity * item.product.selling_price).toLocaleString('ar-EG')} جنيه
                </p>
              </div>
            </div>
          </div>

          {/* حدود المخزون */}
          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-4">حدود المخزون</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-red-50 p-3 rounded-lg">
                <p className="text-sm text-red-800 font-medium">الحد الأدنى</p>
                <p className="text-xl font-bold text-red-900">{item.product.min_stock_level}</p>
                <p className="text-xs text-red-600">
                  {item.total_quantity <= item.product.min_stock_level ? 'تحت الحد الأدنى!' : 'ضمن الحد الآمن'}
                </p>
              </div>
              
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800 font-medium">الحد الأقصى</p>
                <p className="text-xl font-bold text-blue-900">{item.product.max_stock_level}</p>
                <p className="text-xs text-blue-600">
                  {item.total_quantity >= item.product.max_stock_level ? 'فوق الحد الأقصى!' : 'ضمن الحد المسموح'}
                </p>
              </div>
            </div>
          </div>

          {/* آخر تحديث */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>آخر تحديث: {new Date(item.last_updated).toLocaleString('ar-EG')}</span>
            </div>
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

export default InventoryManagement;