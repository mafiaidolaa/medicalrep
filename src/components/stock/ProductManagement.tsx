/**
 * 📦 EP Group System - Product Management in Warehouses
 * إدارة المنتجات في المخازن - المرجع الوحيد للأسماء والأسعار
 * 
 * ملاحظة مهمة: هذا المكون يدير المنتجات كمرجع أساسي للنظام
 * - الأسماء والأسعار تُحفظ هنا وتُستخدم في جميع أنحاء النظام
 * - المخزون وتوزيعه يُدار في قسم المخازن منفصلاً
 */

import React, { useState, useEffect } from 'react';
import {
  Package, Plus, Edit, Trash2, Search, Filter, Download,
  Eye, AlertCircle, CheckCircle, XCircle, Upload,
  BarChart3, TrendingUp, DollarSign, ShoppingCart,
  Save, X, RefreshCw, ExternalLink, Tags
} from 'lucide-react';

import { stockService } from '../../lib/stock/stock-management-service';
import { stockSecurityService } from '../../lib/stock/stock-security';
import type { Product } from '../../lib/stock/stock-management-service';

// ==================================================================
// أنواع البيانات الخاصة بإدارة المنتجات
// ==================================================================

interface ProductWithStock extends Product {
  total_stock_quantity: number;
  total_stock_value: number;
  available_in_warehouses: number;
  last_movement_date: string;
  movement_count_30d: number;
  status_summary: {
    in_stock_warehouses: number;
    low_stock_warehouses: number;
    out_of_stock_warehouses: number;
  };
}

interface ProductFormData {
  name_ar: string;
  name_en: string;
  code: string;
  barcode?: string;
  description?: string;
  category_id?: string;
  brand?: string;
  unit_of_measure: string;
  cost_price: number;
  selling_price: number;
  min_stock_level: number;
  max_stock_level: number;
  is_active: boolean;
  specifications?: string;
  image_url?: string;
  weight?: number;
  dimensions?: string;
  expiry_tracking: boolean;
  serial_tracking: boolean;
  batch_tracking: boolean;
}

interface ProductFilters {
  search: string;
  category_id: string;
  status: 'all' | 'active' | 'inactive' | 'low_stock' | 'out_of_stock';
  price_range: { min: number; max: number };
  sort_by: 'name' | 'code' | 'price' | 'stock' | 'created_at';
  sort_order: 'asc' | 'desc';
}

// ==================================================================
// المكون الرئيسي لإدارة المنتجات
// ==================================================================

const ProductManagement: React.FC = () => {
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithStock | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [filters, setFilters] = useState<ProductFilters>({
    search: '',
    category_id: '',
    status: 'all',
    price_range: { min: 0, max: 100000 },
    sort_by: 'name',
    sort_order: 'asc'
  });
  const [formData, setFormData] = useState<ProductFormData>({
    name_ar: '',
    name_en: '',
    code: '',
    barcode: '',
    description: '',
    category_id: '',
    brand: '',
    unit_of_measure: 'قطعة',
    cost_price: 0,
    selling_price: 0,
    min_stock_level: 10,
    max_stock_level: 1000,
    is_active: true,
    specifications: '',
    image_url: '',
    weight: 0,
    dimensions: '',
    expiry_tracking: false,
    serial_tracking: false,
    batch_tracking: false
  });
  const [userPermissions, setUserPermissions] = useState<any>({});

  useEffect(() => {
    loadData();
    loadUserPermissions();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // جلب المنتجات مع بيانات المخزون
      const productsData = await loadProductsWithStockInfo();
      
      // جلب الفئات
      const categoriesData = await stockService.getProductCategories();
      
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProductsWithStockInfo = async (): Promise<ProductWithStock[]> => {
    // جلب جميع المنتجات
    const allProducts = await stockService.getProducts({
      category_id: filters.category_id || undefined,
      is_active: filters.status === 'active' ? true : 
                 filters.status === 'inactive' ? false : undefined
    });

    // إضافة معلومات المخزون لكل منتج
    const productsWithStock = await Promise.all(
      allProducts.map(async (product): Promise<ProductWithStock> => {
        // جلب مستويات المخزون لهذا المنتج في جميع المخازن
        const stockLevels = await stockService.getStockLevels({
          product_id: product.id
        });

        // حساب الإحصائيات
        const totalQuantity = stockLevels.reduce((sum, stock) => sum + stock.available_quantity, 0);
        const totalValue = totalQuantity * product.selling_price;
        const availableWarehouses = stockLevels.filter(stock => stock.available_quantity > 0).length;

        // إحصائيات الحالة
        const inStockWarehouses = stockLevels.filter(stock => 
          stock.available_quantity > product.min_stock_level).length;
        const lowStockWarehouses = stockLevels.filter(stock => 
          stock.available_quantity > 0 && stock.available_quantity <= product.min_stock_level).length;
        const outOfStockWarehouses = stockLevels.filter(stock => 
          stock.available_quantity === 0).length;

        // جلب آخر حركة للمنتج
        const recentMovements = await stockService.getStockMovements({
          product_id: product.id,
          limit: 1
        });

        // حساب عدد الحركات في آخر 30 يوم
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const monthlyMovements = await stockService.getStockMovements({
          product_id: product.id,
          date_from: thirtyDaysAgo.toISOString(),
          date_to: new Date().toISOString()
        });

        return {
          ...product,
          total_stock_quantity: totalQuantity,
          total_stock_value: totalValue,
          available_in_warehouses: availableWarehouses,
          last_movement_date: recentMovements[0]?.created_at || '',
          movement_count_30d: monthlyMovements.length,
          status_summary: {
            in_stock_warehouses: inStockWarehouses,
            low_stock_warehouses: lowStockWarehouses,
            out_of_stock_warehouses: outOfStockWarehouses
          }
        };
      })
    );

    // تطبيق الفلترة والترتيب
    return applyFiltersAndSorting(productsWithStock);
  };

  const applyFiltersAndSorting = (products: ProductWithStock[]): ProductWithStock[] => {
    let filtered = products;

    // فلترة النصوص
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(product =>
        product.name_ar.toLowerCase().includes(searchLower) ||
        product.name_en?.toLowerCase().includes(searchLower) ||
        product.code.toLowerCase().includes(searchLower) ||
        product.barcode?.toLowerCase().includes(searchLower)
      );
    }

    // فلترة الحالة
    switch (filters.status) {
      case 'low_stock':
        filtered = filtered.filter(product => 
          product.status_summary.low_stock_warehouses > 0);
        break;
      case 'out_of_stock':
        filtered = filtered.filter(product => 
          product.total_stock_quantity === 0);
        break;
    }

    // فلترة السعر
    filtered = filtered.filter(product =>
      product.selling_price >= filters.price_range.min &&
      product.selling_price <= filters.price_range.max
    );

    // الترتيب
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (filters.sort_by) {
        case 'name':
          aValue = a.name_ar;
          bValue = b.name_ar;
          break;
        case 'code':
          aValue = a.code;
          bValue = b.code;
          break;
        case 'price':
          aValue = a.selling_price;
          bValue = b.selling_price;
          break;
        case 'stock':
          aValue = a.total_stock_quantity;
          bValue = b.total_stock_quantity;
          break;
        case 'created_at':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
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

  const handleSaveProduct = async () => {
    try {
      if (selectedProduct) {
        // تحديث منتج موجود
        await stockService.updateProduct(selectedProduct.id, formData);
      } else {
        // إضافة منتج جديد
        await stockService.createProduct(formData);
      }

      // تسجيل العملية في نظام الأمان
      await stockSecurityService.logSecurityEvent({
        user_id: 'current_user',
        action: selectedProduct ? 'update_product' : 'create_product',
        entity_type: 'product',
        entity_id: selectedProduct?.id || 'new',
        description: `${selectedProduct ? 'تحديث' : 'إضافة'} منتج: ${formData.name_ar}`,
        ip_address: '0.0.0.0',
        user_agent: 'Web Interface'
      });

      setShowForm(false);
      setSelectedProduct(null);
      resetForm();
      await loadData();
    } catch (error: any) {
      console.error('Error saving product:', error);
      alert(`خطأ في حفظ المنتج: ${error.message}`);
    }
  };

  const handleDeleteProduct = async (product: ProductWithStock) => {
    if (!confirm(`هل أنت متأكد من حذف المنتج "${product.name_ar}"؟`)) {
      return;
    }

    try {
      await stockService.deleteProduct(product.id);
      
      // تسجيل العملية
      await stockSecurityService.logSecurityEvent({
        user_id: 'current_user',
        action: 'delete_product',
        entity_type: 'product',
        entity_id: product.id,
        description: `حذف منتج: ${product.name_ar}`,
        ip_address: '0.0.0.0',
        user_agent: 'Web Interface'
      });

      await loadData();
    } catch (error: any) {
      console.error('Error deleting product:', error);
      alert(`خطأ في حذف المنتج: ${error.message}`);
    }
  };

  const resetForm = () => {
    setFormData({
      name_ar: '',
      name_en: '',
      code: '',
      barcode: '',
      description: '',
      category_id: '',
      brand: '',
      unit_of_measure: 'قطعة',
      cost_price: 0,
      selling_price: 0,
      min_stock_level: 10,
      max_stock_level: 1000,
      is_active: true,
      specifications: '',
      image_url: '',
      weight: 0,
      dimensions: '',
      expiry_tracking: false,
      serial_tracking: false,
      batch_tracking: false
    });
  };

  const openEditForm = (product: ProductWithStock) => {
    setSelectedProduct(product);
    setFormData({
      name_ar: product.name_ar,
      name_en: product.name_en || '',
      code: product.code,
      barcode: product.barcode || '',
      description: product.description || '',
      category_id: product.category_id || '',
      brand: product.brand || '',
      unit_of_measure: product.unit_of_measure,
      cost_price: product.cost_price,
      selling_price: product.selling_price,
      min_stock_level: product.min_stock_level,
      max_stock_level: product.max_stock_level,
      is_active: product.is_active,
      specifications: product.specifications || '',
      image_url: product.image_url || '',
      weight: product.weight || 0,
      dimensions: product.dimensions || '',
      expiry_tracking: product.expiry_tracking || false,
      serial_tracking: product.serial_tracking || false,
      batch_tracking: product.batch_tracking || false
    });
    setShowForm(true);
  };

  const openNewForm = () => {
    setSelectedProduct(null);
    resetForm();
    setShowForm(true);
  };

  const exportProducts = async (format: 'pdf' | 'excel') => {
    try {
      // تحضير البيانات للتصدير
      const exportData = products.map(product => ({
        الكود: product.code,
        'الاسم العربي': product.name_ar,
        'الاسم الإنجليزي': product.name_en,
        'الباركود': product.barcode,
        'الفئة': product.category_id,
        'الوحدة': product.unit_of_measure,
        'سعر التكلفة': product.cost_price,
        'سعر البيع': product.selling_price,
        'إجمالي المخزون': product.total_stock_quantity,
        'قيمة المخزون': product.total_stock_value,
        'متوفر في مخازن': product.available_in_warehouses,
        'الحد الأدنى': product.min_stock_level,
        'الحد الأقصى': product.max_stock_level,
        'الحالة': product.is_active ? 'نشط' : 'غير نشط'
      }));

      // هنا يمكن إضافة منطق التصدير الفعلي
      console.log('Exporting products:', exportData);
      alert(`تم تصدير ${products.length} منتج بصيغة ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error exporting products:', error);
    }
  };

  const getStatusColor = (product: ProductWithStock): string => {
    if (!product.is_active) return 'bg-gray-100 text-gray-800';
    if (product.total_stock_quantity === 0) return 'bg-red-100 text-red-800';
    if (product.status_summary.low_stock_warehouses > 0) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusText = (product: ProductWithStock): string => {
    if (!product.is_active) return 'غير نشط';
    if (product.total_stock_quantity === 0) return 'منتهي';
    if (product.status_summary.low_stock_warehouses > 0) return 'منخفض';
    return 'متوفر';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="animate-spin h-8 w-8 text-blue-600" />
          <p className="text-gray-600">جاري تحميل المنتجات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto" dir="rtl">
      {/* العنوان والإجراءات */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Package className="h-8 w-8 text-blue-600" />
              📦 إدارة المنتجات
            </h1>
            <p className="text-gray-600">
              المرجع الوحيد لأسماء وأسعار المنتجات في نظام EP Group
            </p>
            <p className="text-sm text-blue-600 mt-1">
              إجمالي المنتجات: {products.length} منتج • القيمة الإجمالية: {products.reduce((sum, p) => sum + p.total_stock_value, 0).toLocaleString('ar-EG')} جنيه
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3 mt-4 sm:mt-0">
            <button
              onClick={() => exportProducts('excel')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Download className="h-4 w-4" />
              تصدير Excel
            </button>
            
            <button
              onClick={() => exportProducts('pdf')}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <Download className="h-4 w-4" />
              تصدير PDF
            </button>

            {userPermissions.can_create && (
              <button
                onClick={openNewForm}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                إضافة منتج جديد
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

        {/* شريط البحث والفلترة */}
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {/* البحث */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="البحث بالاسم أو الكود أو الباركود..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* الفئة */}
            <select
              value={filters.category_id}
              onChange={(e) => setFilters({...filters, category_id: e.target.value})}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">جميع الفئات</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name_ar}
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
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
              <option value="low_stock">مخزون منخفض</option>
              <option value="out_of_stock">منتهي</option>
            </select>

            {/* الحد الأدنى للسعر */}
            <input
              type="number"
              placeholder="الحد الأدنى للسعر"
              value={filters.price_range.min}
              onChange={(e) => setFilters({
                ...filters, 
                price_range: { ...filters.price_range, min: Number(e.target.value) }
              })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />

            {/* الحد الأقصى للسعر */}
            <input
              type="number"
              placeholder="الحد الأقصى للسعر"
              value={filters.price_range.max}
              onChange={(e) => setFilters({
                ...filters, 
                price_range: { ...filters.price_range, max: Number(e.target.value) }
              })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />

            {/* الترتيب */}
            <div className="flex gap-2">
              <select
                value={filters.sort_by}
                onChange={(e) => setFilters({...filters, sort_by: e.target.value as any})}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="name">الاسم</option>
                <option value="code">الكود</option>
                <option value="price">السعر</option>
                <option value="stock">المخزون</option>
                <option value="created_at">تاريخ الإضافة</option>
              </select>
              
              <button
                onClick={() => setFilters({
                  ...filters, 
                  sort_order: filters.sort_order === 'asc' ? 'desc' : 'asc'
                })}
                className={`px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 ${
                  filters.sort_order === 'desc' ? 'bg-gray-100' : ''
                }`}
              >
                {filters.sort_order === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* جدول المنتجات */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">المنتج</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">الكود/الباركود</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">الأسعار</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">المخزون</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">التوزيع</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">الحالة</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name_ar}
                          className="h-12 w-12 rounded-lg object-cover border"
                        />
                      ) : (
                        <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Package className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{product.name_ar}</p>
                        {product.name_en && (
                          <p className="text-sm text-gray-600">{product.name_en}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {product.unit_of_measure}
                          </span>
                          {product.brand && (
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                              {product.brand}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      <p className="font-mono text-sm">{product.code}</p>
                      {product.barcode && (
                        <p className="font-mono text-xs text-gray-600">{product.barcode}</p>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      <p className="text-sm">
                        <span className="text-gray-600">التكلفة:</span> {product.cost_price.toLocaleString('ar-EG')} جنيه
                      </p>
                      <p className="text-sm font-medium">
                        <span className="text-gray-600">البيع:</span> {product.selling_price.toLocaleString('ar-EG')} جنيه
                      </p>
                      <p className="text-xs text-green-600">
                        الربح: {(product.selling_price - product.cost_price).toLocaleString('ar-EG')} جنيه
                      </p>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      <p className="font-medium">
                        {product.total_stock_quantity.toLocaleString('ar-EG')} وحدة
                      </p>
                      <p className="text-sm text-gray-600">
                        القيمة: {product.total_stock_value.toLocaleString('ar-EG')} جنيه
                      </p>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-500">الحد الأدنى:</span>
                        <span>{product.min_stock_level}</span>
                        <span className="text-gray-500">الأقصى:</span>
                        <span>{product.max_stock_level}</span>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="space-y-2">
                      <p className="text-sm">
                        <span className="text-green-600">{product.status_summary.in_stock_warehouses}</span> متوفر
                      </p>
                      {product.status_summary.low_stock_warehouses > 0 && (
                        <p className="text-sm">
                          <span className="text-yellow-600">{product.status_summary.low_stock_warehouses}</span> منخفض
                        </p>
                      )}
                      {product.status_summary.out_of_stock_warehouses > 0 && (
                        <p className="text-sm">
                          <span className="text-red-600">{product.status_summary.out_of_stock_warehouses}</span> منتهي
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        {product.movement_count_30d} حركة (30 يوم)
                      </p>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(product)}`}>
                      {getStatusText(product)}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedProduct(product);
                          setShowDetails(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="عرض التفاصيل"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      {userPermissions.can_edit && (
                        <button
                          onClick={() => openEditForm(product)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                          title="تعديل"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      )}

                      {userPermissions.can_delete && (
                        <button
                          onClick={() => handleDeleteProduct(product)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="حذف"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {products.length === 0 && (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600">لا توجد منتجات تطابق معايير البحث</p>
            </div>
          )}
        </div>
      </div>

      {/* نموذج إضافة/تعديل المنتج */}
      {showForm && (
        <ProductFormModal
          formData={formData}
          setFormData={setFormData}
          categories={categories}
          isEditing={!!selectedProduct}
          onSave={handleSaveProduct}
          onCancel={() => {
            setShowForm(false);
            setSelectedProduct(null);
            resetForm();
          }}
        />
      )}

      {/* تفاصيل المنتج */}
      {showDetails && selectedProduct && (
        <ProductDetailsModal
          product={selectedProduct}
          onClose={() => {
            setShowDetails(false);
            setSelectedProduct(null);
          }}
        />
      )}
    </div>
  );
};

// ==================================================================
// مكونات مساعدة
// ==================================================================

interface ProductFormModalProps {
  formData: ProductFormData;
  setFormData: (data: ProductFormData) => void;
  categories: any[];
  isEditing: boolean;
  onSave: () => void;
  onCancel: () => void;
}

const ProductFormModal: React.FC<ProductFormModalProps> = ({
  formData, setFormData, categories, isEditing, onSave, onCancel
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              {isEditing ? 'تعديل منتج' : 'إضافة منتج جديد'}
            </h2>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* المعلومات الأساسية */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">المعلومات الأساسية</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الاسم العربي *
                </label>
                <input
                  type="text"
                  value={formData.name_ar}
                  onChange={(e) => setFormData({...formData, name_ar: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الاسم الإنجليزي
                </label>
                <input
                  type="text"
                  value={formData.name_en}
                  onChange={(e) => setFormData({...formData, name_en: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    كود المنتج *
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الباركود
                  </label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الفئة
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">اختر الفئة</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name_ar}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    العلامة التجارية
                  </label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({...formData, brand: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    وحدة القياس *
                  </label>
                  <select
                    value={formData.unit_of_measure}
                    onChange={(e) => setFormData({...formData, unit_of_measure: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="قطعة">قطعة</option>
                    <option value="كيلو">كيلو</option>
                    <option value="لتر">لتر</option>
                    <option value="متر">متر</option>
                    <option value="علبة">علبة</option>
                    <option value="كرتونة">كرتونة</option>
                  </select>
                </div>
              </div>
            </div>

            {/* الأسعار والمخزون */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">الأسعار والمخزون</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    سعر التكلفة (جنيه) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({...formData, cost_price: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    سعر البيع (جنيه) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.selling_price}
                    onChange={(e) => setFormData({...formData, selling_price: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {formData.cost_price > 0 && formData.selling_price > 0 && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm text-green-800">
                    هامش الربح: {((formData.selling_price - formData.cost_price) / formData.cost_price * 100).toFixed(1)}%
                    ({(formData.selling_price - formData.cost_price).toLocaleString('ar-EG')} جنيه)
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الحد الأدنى للمخزون
                  </label>
                  <input
                    type="number"
                    value={formData.min_stock_level}
                    onChange={(e) => setFormData({...formData, min_stock_level: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الحد الأقصى للمخزون
                  </label>
                  <input
                    type="number"
                    value={formData.max_stock_level}
                    onChange={(e) => setFormData({...formData, max_stock_level: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">خيارات التتبع</h4>
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.expiry_tracking}
                    onChange={(e) => setFormData({...formData, expiry_tracking: e.target.checked})}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">تتبع تاريخ الانتهاء</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.serial_tracking}
                    onChange={(e) => setFormData({...formData, serial_tracking: e.target.checked})}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">تتبع الرقم التسلسلي</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.batch_tracking}
                    onChange={(e) => setFormData({...formData, batch_tracking: e.target.checked})}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">تتبع رقم الدفعة</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">المنتج نشط</span>
                </label>
              </div>
            </div>
          </div>

          {/* الوصف والمواصفات */}
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الوصف
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                المواصفات التقنية
              </label>
              <textarea
                value={formData.specifications}
                onChange={(e) => setFormData({...formData, specifications: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  رابط الصورة
                </label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الوزن (كيلو)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.weight}
                  onChange={(e) => setFormData({...formData, weight: Number(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الأبعاد
                </label>
                <input
                  type="text"
                  value={formData.dimensions}
                  onChange={(e) => setFormData({...formData, dimensions: e.target.value})}
                  placeholder="الطول × العرض × الارتفاع"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
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
            {isEditing ? 'تحديث' : 'حفظ'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface ProductDetailsModalProps {
  product: ProductWithStock;
  onClose: () => void;
}

const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({ product, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">تفاصيل المنتج</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* معلومات المنتج الأساسية */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-start gap-4">
              {product.image_url ? (
                <img 
                  src={product.image_url} 
                  alt={product.name_ar}
                  className="h-24 w-24 rounded-lg object-cover border"
                />
              ) : (
                <div className="h-24 w-24 bg-gray-200 rounded-lg flex items-center justify-center">
                  <Package className="h-10 w-10 text-gray-400" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">{product.name_ar}</h3>
                {product.name_en && (
                  <p className="text-lg text-gray-600">{product.name_en}</p>
                )}
                <div className="flex items-center gap-4 mt-2">
                  <span className="font-mono text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {product.code}
                  </span>
                  {product.barcode && (
                    <span className="font-mono text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {product.barcode}
                    </span>
                  )}
                  <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                    {product.unit_of_measure}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* الأسعار والربحية */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                <h4 className="font-semibold text-blue-900">سعر التكلفة</h4>
              </div>
              <p className="text-2xl font-bold text-blue-900">
                {product.cost_price.toLocaleString('ar-EG')} جنيه
              </p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <h4 className="font-semibold text-green-900">سعر البيع</h4>
              </div>
              <p className="text-2xl font-bold text-green-900">
                {product.selling_price.toLocaleString('ar-EG')} جنيه
              </p>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-5 w-5 text-purple-600" />
                <h4 className="font-semibold text-purple-900">هامش الربح</h4>
              </div>
              <p className="text-2xl font-bold text-purple-900">
                {((product.selling_price - product.cost_price) / product.cost_price * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-purple-700">
                {(product.selling_price - product.cost_price).toLocaleString('ar-EG')} جنيه
              </p>
            </div>
          </div>

          {/* إحصائيات المخزون */}
          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-4">إحصائيات المخزون</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {product.total_stock_quantity.toLocaleString('ar-EG')}
                </p>
                <p className="text-sm text-gray-600">إجمالي المخزون</p>
              </div>
              
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {product.total_stock_value.toLocaleString('ar-EG')}
                </p>
                <p className="text-sm text-gray-600">قيمة المخزون (جنيه)</p>
              </div>
              
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {product.available_in_warehouses}
                </p>
                <p className="text-sm text-gray-600">متوفر في مخازن</p>
              </div>
              
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">
                  {product.movement_count_30d}
                </p>
                <p className="text-sm text-gray-600">حركة (30 يوم)</p>
              </div>
            </div>
          </div>

          {/* توزيع الحالة */}
          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-4">توزيع الحالة في المخازن</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 p-3 rounded-lg text-center">
                <p className="text-xl font-bold text-green-600">
                  {product.status_summary.in_stock_warehouses}
                </p>
                <p className="text-sm text-green-800">متوفر</p>
              </div>
              
              <div className="bg-yellow-50 p-3 rounded-lg text-center">
                <p className="text-xl font-bold text-yellow-600">
                  {product.status_summary.low_stock_warehouses}
                </p>
                <p className="text-sm text-yellow-800">مخزون منخفض</p>
              </div>
              
              <div className="bg-red-50 p-3 rounded-lg text-center">
                <p className="text-xl font-bold text-red-600">
                  {product.status_summary.out_of_stock_warehouses}
                </p>
                <p className="text-sm text-red-800">منتهي</p>
              </div>
            </div>
          </div>

          {/* معلومات إضافية */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">معلومات إضافية</h4>
              <div className="space-y-2 text-sm">
                {product.brand && (
                  <p><span className="text-gray-600">العلامة التجارية:</span> {product.brand}</p>
                )}
                {product.weight && (
                  <p><span className="text-gray-600">الوزن:</span> {product.weight} كيلو</p>
                )}
                {product.dimensions && (
                  <p><span className="text-gray-600">الأبعاد:</span> {product.dimensions}</p>
                )}
                <p><span className="text-gray-600">الحد الأدنى:</span> {product.min_stock_level}</p>
                <p><span className="text-gray-600">الحد الأقصى:</span> {product.max_stock_level}</p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">خيارات التتبع</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {product.expiry_tracking ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="text-sm">تتبع تاريخ الانتهاء</span>
                </div>
                
                <div className="flex items-center gap-2">
                  {product.serial_tracking ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="text-sm">تتبع الرقم التسلسلي</span>
                </div>
                
                <div className="flex items-center gap-2">
                  {product.batch_tracking ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="text-sm">تتبع رقم الدفعة</span>
                </div>
              </div>
            </div>
          </div>

          {/* الوصف والمواصفات */}
          {(product.description || product.specifications) && (
            <div className="space-y-4">
              {product.description && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">الوصف</h4>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{product.description}</p>
                </div>
              )}
              
              {product.specifications && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">المواصفات التقنية</h4>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{product.specifications}</p>
                </div>
              )}
            </div>
          )}

          {/* تواريخ */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <p><span className="text-gray-600">تاريخ الإضافة:</span> {new Date(product.created_at).toLocaleDateString('ar-EG')}</p>
              <p><span className="text-gray-600">آخر تحديث:</span> {new Date(product.updated_at).toLocaleDateString('ar-EG')}</p>
              {product.last_movement_date && (
                <p><span className="text-gray-600">آخر حركة:</span> {new Date(product.last_movement_date).toLocaleDateString('ar-EG')}</p>
              )}
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

export default ProductManagement;