/**
 * 📊 EP Group System - Stock Management Dashboard
 * لوحة التحكم الرئيسية لإدارة المخازن
 */

import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer 
} from 'recharts';
import { 
  Package, AlertTriangle, TrendingUp, DollarSign, 
  Warehouse, ShoppingCart, Users, Calendar,
  Search, Filter, Download, Plus, RefreshCw
} from 'lucide-react';

import { stockService } from '../../lib/stock/stock-management-service';
import { stockAPIEndpoints } from '../../lib/stock/stock-api-endpoints';
import { stockSecurityService } from '../../lib/stock/stock-security';

// ==================================================================
// أنواع البيانات للوحة التحكم
// ==================================================================

interface DashboardStats {
  total_products: number;
  total_warehouses: number;
  total_value: number;
  low_stock_alerts: number;
  pending_requests: number;
  monthly_movements: number;
  top_products: ProductStat[];
  warehouse_distribution: WarehouseStats[];
  recent_movements: MovementStat[];
  stock_trends: TrendData[];
}

interface ProductStat {
  product_id: string;
  product_name: string;
  product_code: string;
  total_quantity: number;
  total_value: number;
  movement_count: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
}

interface WarehouseStats {
  warehouse_id: string;
  warehouse_name: string;
  warehouse_code: string;
  products_count: number;
  total_value: number;
  utilization_percentage: number;
  alert_count: number;
}

interface MovementStat {
  id: string;
  movement_type: string;
  product_name: string;
  warehouse_name: string;
  quantity: number;
  value: number;
  created_at: string;
  status: string;
}

interface TrendData {
  date: string;
  stock_in: number;
  stock_out: number;
  adjustments: number;
  total_value: number;
}

// ==================================================================
// مكون لوحة التحكم الرئيسية
// ==================================================================

const StockDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('30d');
  const [loading, setLoading] = useState(true);
  const [userPermissions, setUserPermissions] = useState<any>({});

  // ألوان المخططات
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  useEffect(() => {
    loadDashboardData();
    loadUserPermissions();
  }, [selectedWarehouse, dateRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // جلب الإحصائيات العامة
      const statsResponse = await stockAPIEndpoints.getStockStatistics({
        api_key: 'epg_dashboard_key',
        user_id: 'current_user',
        warehouse_id: selectedWarehouse === 'all' ? undefined : selectedWarehouse,
        period: dateRange === '30d' ? 'monthly' : 'weekly'
      });

      // جلب مستويات المخزون
      const stockResponse = await stockAPIEndpoints.getStockLevels({
        api_key: 'epg_dashboard_key',
        user_id: 'current_user',
        warehouse_id: selectedWarehouse === 'all' ? undefined : selectedWarehouse,
        page: 1,
        limit: 100
      });

      // جلب تقرير حركات المخزون
      const movementsResponse = await stockAPIEndpoints.getStockMovementsReport({
        api_key: 'epg_dashboard_key',
        user_id: 'current_user',
        warehouse_id: selectedWarehouse === 'all' ? undefined : selectedWarehouse,
        date_from: getDateFromRange(dateRange),
        date_to: new Date().toISOString(),
        page: 1,
        limit: 50
      });

      // معالجة البيانات وتجميعها
      const processedStats = await processDashboardData(
        statsResponse.data,
        stockResponse.data,
        movementsResponse.data
      );

      setStats(processedStats);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserPermissions = async () => {
    try {
      const permissions = await stockSecurityService.getUserPermissions(
        'current_user',
        selectedWarehouse === 'all' ? undefined : selectedWarehouse
      );
      setUserPermissions(permissions);
    } catch (error) {
      console.error('Error loading permissions:', error);
    }
  };

  const processDashboardData = async (
    statsData: any,
    stockData: any,
    movementsData: any
  ): Promise<DashboardStats> => {
    // معالجة إحصائيات المنتجات
    const topProducts: ProductStat[] = stockData.items
      ?.slice(0, 10)
      .map((item: any) => ({
        product_id: item.product_id,
        product_name: item.product?.name_ar || 'منتج غير معروف',
        product_code: item.product?.code || 'N/A',
        total_quantity: item.available_quantity + item.reserved_quantity,
        total_value: (item.available_quantity + item.reserved_quantity) * (item.product?.selling_price || 0),
        movement_count: 0, // سيتم حسابه من الحركات
        status: item.available_quantity === 0 ? 'out_of_stock' : 
                item.available_quantity <= (item.product?.min_stock_level || 10) ? 'low_stock' : 'in_stock'
      })) || [];

    // معالجة إحصائيات المخازن
    const warehouses = await stockService.getWarehouses();
    const warehouseStats: WarehouseStats[] = await Promise.all(
      warehouses.map(async (warehouse) => {
        const warehouseStock = await stockService.getStockLevels({
          warehouse_id: warehouse.id
        });

        const totalValue = warehouseStock.reduce((sum, stock) => 
          sum + (stock.available_quantity * (stock.product?.selling_price || 0)), 0);

        const alertCount = warehouseStock.filter(stock => 
          stock.available_quantity <= (stock.product?.min_stock_level || 10)).length;

        return {
          warehouse_id: warehouse.id,
          warehouse_name: warehouse.name,
          warehouse_code: warehouse.code,
          products_count: warehouseStock.length,
          total_value: totalValue,
          utilization_percentage: Math.min((warehouseStock.length / (warehouse.capacity || 1000)) * 100, 100),
          alert_count: alertCount
        };
      })
    );

    // معالجة الحركات الحديثة
    const recentMovements: MovementStat[] = movementsData.movements
      ?.slice(0, 20)
      .map((movement: any) => ({
        id: movement.id,
        movement_type: movement.movement_type,
        product_name: movement.product?.name_ar || 'منتج غير معروف',
        warehouse_name: movement.warehouse?.name || 'مخزن غير معروف',
        quantity: movement.quantity,
        value: movement.total_value || 0,
        created_at: movement.created_at,
        status: movement.status || 'completed'
      })) || [];

    // إنشاء بيانات الاتجاهات
    const stockTrends: TrendData[] = generateTrendData(movementsData.movements || []);

    return {
      total_products: statsData?.summary?.total_products || 0,
      total_warehouses: warehouseStats.length,
      total_value: statsData?.summary?.total_value || 0,
      low_stock_alerts: statsData?.alerts?.low_stock_products || 0,
      pending_requests: await getPendingRequestsCount(),
      monthly_movements: movementsData.movements?.length || 0,
      top_products: topProducts,
      warehouse_distribution: warehouseStats,
      recent_movements: recentMovements,
      stock_trends: stockTrends
    };
  };

  const generateTrendData = (movements: any[]): TrendData[] => {
    const trends: { [date: string]: TrendData } = {};
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split('T')[0];
    });

    // تهيئة البيانات
    last30Days.forEach(date => {
      trends[date] = {
        date,
        stock_in: 0,
        stock_out: 0,
        adjustments: 0,
        total_value: 0
      };
    });

    // معالجة الحركات
    movements.forEach(movement => {
      const date = movement.created_at?.split('T')[0];
      if (trends[date]) {
        switch (movement.movement_type) {
          case 'in':
            trends[date].stock_in += movement.quantity || 0;
            break;
          case 'out':
            trends[date].stock_out += movement.quantity || 0;
            break;
          case 'adjustment':
            trends[date].adjustments += movement.quantity || 0;
            break;
        }
        trends[date].total_value += movement.total_value || 0;
      }
    });

    return Object.values(trends);
  };

  const getPendingRequestsCount = async (): Promise<number> => {
    try {
      const requests = await stockService.getStockRequests({
        status: 'pending',
        warehouse_id: selectedWarehouse === 'all' ? undefined : selectedWarehouse
      });
      return requests.length;
    } catch (error) {
      return 0;
    }
  };

  const getDateFromRange = (range: string): string => {
    const date = new Date();
    switch (range) {
      case '7d':
        date.setDate(date.getDate() - 7);
        break;
      case '30d':
        date.setDate(date.getDate() - 30);
        break;
      case '90d':
        date.setDate(date.getDate() - 90);
        break;
      default:
        date.setDate(date.getDate() - 30);
    }
    return date.toISOString();
  };

  const exportDashboardData = async (format: 'pdf' | 'excel') => {
    try {
      const response = await stockAPIEndpoints.getStockValuationReport({
        api_key: 'epg_dashboard_key',
        user_id: 'current_user',
        warehouse_id: selectedWarehouse === 'all' ? undefined : selectedWarehouse,
        format
      });

      if (response.success && response.data.report_url) {
        window.open(response.data.report_url, '_blank');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="animate-spin h-8 w-8 text-blue-600" />
          <p className="text-gray-600">جاري تحميل بيانات المخازن...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <p className="text-gray-600">فشل في تحميل بيانات لوحة التحكم</p>
        <button 
          onClick={loadDashboardData}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto" dir="rtl">
      {/* العنوان والتحكم */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              📊 لوحة تحكم المخازن
            </h1>
            <p className="text-gray-600">
              إدارة ومراقبة مخازن EP Group - آخر تحديث: {new Date().toLocaleString('ar-EG')}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3 mt-4 sm:mt-0">
            {/* اختيار المخزن */}
            <select 
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">جميع المخازن</option>
              {stats.warehouse_distribution.map(warehouse => (
                <option key={warehouse.warehouse_id} value={warehouse.warehouse_id}>
                  {warehouse.warehouse_name}
                </option>
              ))}
            </select>

            {/* اختيار الفترة الزمنية */}
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">آخر 7 أيام</option>
              <option value="30d">آخر 30 يوماً</option>
              <option value="90d">آخر 90 يوماً</option>
            </select>

            {/* أزرار التصدير */}
            <div className="flex gap-2">
              <button
                onClick={() => exportDashboardData('pdf')}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <Download className="h-4 w-4" />
                PDF
              </button>
              <button
                onClick={() => exportDashboardData('excel')}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Download className="h-4 w-4" />
                Excel
              </button>
            </div>

            <button
              onClick={loadDashboardData}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4" />
              تحديث
            </button>
          </div>
        </div>
      </div>

      {/* البطاقات الإحصائية */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="إجمالي المنتجات"
          value={stats.total_products.toLocaleString('ar-EG')}
          icon={<Package className="h-6 w-6" />}
          color="blue"
          subtitle="منتج في النظام"
        />
        
        <StatsCard
          title="قيمة المخزون"
          value={`${stats.total_value.toLocaleString('ar-EG')} جنيه`}
          icon={<DollarSign className="h-6 w-6" />}
          color="green"
          subtitle="القيمة الإجمالية للمخزون"
        />

        <StatsCard
          title="تنبيهات المخزون"
          value={stats.low_stock_alerts.toLocaleString('ar-EG')}
          icon={<AlertTriangle className="h-6 w-6" />}
          color="red"
          subtitle="منتج بكمية منخفضة"
        />

        <StatsCard
          title="الطلبات المعلقة"
          value={stats.pending_requests.toLocaleString('ar-EG')}
          icon={<ShoppingCart className="h-6 w-6" />}
          color="yellow"
          subtitle="طلب في انتظار المعالجة"
        />
      </div>

      {/* المخططات */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* مخطط الاتجاهات */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            اتجاهات المخزون
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.stock_trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString('ar-EG')}
                formatter={(value, name) => [
                  Number(value).toLocaleString('ar-EG'), 
                  name === 'stock_in' ? 'إدخال' : name === 'stock_out' ? 'صرف' : 'تسوية'
                ]}
              />
              <Legend />
              <Line type="monotone" dataKey="stock_in" stroke="#00C49F" name="إدخال" />
              <Line type="monotone" dataKey="stock_out" stroke="#FF8042" name="صرف" />
              <Line type="monotone" dataKey="adjustments" stroke="#8884d8" name="تسوية" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* مخطط توزيع المخازن */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Warehouse className="h-5 w-5 text-green-600" />
            توزيع قيمة المخازن
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.warehouse_distribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ warehouse_name, total_value }) => 
                  `${warehouse_name}: ${(total_value).toLocaleString('ar-EG')} جنيه`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="total_value"
              >
                {stats.warehouse_distribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => [`${Number(value).toLocaleString('ar-EG')} جنيه`, 'القيمة']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* الجداول */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* أهم المنتجات */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Package className="h-5 w-5 text-purple-600" />
            أهم المنتجات
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-right py-2">المنتج</th>
                  <th className="text-right py-2">الكود</th>
                  <th className="text-right py-2">الكمية</th>
                  <th className="text-right py-2">القيمة</th>
                  <th className="text-right py-2">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {stats.top_products.slice(0, 8).map(product => (
                  <tr key={product.product_id} className="border-b hover:bg-gray-50">
                    <td className="py-2">{product.product_name}</td>
                    <td className="py-2 text-gray-600">{product.product_code}</td>
                    <td className="py-2">{product.total_quantity.toLocaleString('ar-EG')}</td>
                    <td className="py-2">{product.total_value.toLocaleString('ar-EG')} جنيه</td>
                    <td className="py-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        product.status === 'in_stock' ? 'bg-green-100 text-green-800' :
                        product.status === 'low_stock' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {product.status === 'in_stock' ? 'متوفر' :
                         product.status === 'low_stock' ? 'منخفض' : 'منتهي'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* الحركات الحديثة */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-600" />
            الحركات الحديثة
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {stats.recent_movements.slice(0, 10).map(movement => (
              <div key={movement.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      movement.movement_type === 'in' ? 'bg-green-100 text-green-800' :
                      movement.movement_type === 'out' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {movement.movement_type === 'in' ? 'إدخال' :
                       movement.movement_type === 'out' ? 'صرف' : 'تسوية'}
                    </span>
                    <span className="text-sm font-medium">{movement.product_name}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {movement.warehouse_name} • {movement.quantity.toLocaleString('ar-EG')} وحدة
                  </p>
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">{movement.value.toLocaleString('ar-EG')} جنيه</p>
                  <p className="text-xs text-gray-500">
                    {new Date(movement.created_at).toLocaleDateString('ar-EG')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================================================================
// مكون البطاقة الإحصائية
// ==================================================================

interface StatsCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'indigo';
  subtitle?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, color, subtitle }) => {
  const colorClasses = {
    blue: 'bg-blue-500 text-blue-100',
    green: 'bg-green-500 text-green-100',
    red: 'bg-red-500 text-red-100',
    yellow: 'bg-yellow-500 text-yellow-100',
    purple: 'bg-purple-500 text-purple-100',
    indigo: 'bg-indigo-500 text-indigo-100'
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default StockDashboard;