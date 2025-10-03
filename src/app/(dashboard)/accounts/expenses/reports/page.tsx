'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import {
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Filter,
  Search,
  RotateCcw,
  Download,
  Printer,
  TrendingUp,
  Users,
  Building,
  MapPin,
  Tag,
  ChevronDown,
  ChevronUp,
  Eye,
  BarChart3
} from 'lucide-react';

import {
  ExpenseRequestFilters,
  ExpenseReport,
  ExpenseDashboardStats,
  ExpenseRequestSummary
} from '@/types/accounts';
import { expenseService } from '@/lib/accounts/expenses';

// ألوان الرسوم البيانية
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16'];

// مكون إحصائيات سريعة
const QuickStats: React.FC<{ stats: ExpenseDashboardStats }> = ({ stats }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <FileText className="h-8 w-8 text-blue-600" />
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">إجمالي الطلبات</dt>
            <dd className="text-2xl font-semibold text-gray-900">{stats.total_requests.toLocaleString()}</dd>
          </dl>
        </div>
      </div>
    </div>

    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <DollarSign className="h-8 w-8 text-green-600" />
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">إجمالي المبلغ</dt>
            <dd className="text-2xl font-semibold text-gray-900">{stats.total_amount.toLocaleString()} ر.س</dd>
          </dl>
        </div>
      </div>
    </div>

    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <Clock className="h-8 w-8 text-yellow-600" />
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">في انتظار الموافقة</dt>
            <dd className="text-2xl font-semibold text-gray-900">{stats.pending_requests}</dd>
          </dl>
        </div>
      </div>
    </div>

    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <TrendingUp className="h-8 w-8 text-purple-600" />
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">معدل الموافقة</dt>
            <dd className="text-2xl font-semibold text-gray-900">
              {stats.total_requests > 0 
                ? Math.round((stats.approved_requests / stats.total_requests) * 100) 
                : 0}%
            </dd>
          </dl>
        </div>
      </div>
    </div>
  </div>
);

// مكون فلاتر التقارير
const ReportFilters: React.FC<{
  filters: ExpenseRequestFilters;
  onFiltersChange: (filters: ExpenseRequestFilters) => void;
  onGenerateReport: () => void;
  onClearFilters: () => void;
}> = ({ filters, onFiltersChange, onGenerateReport, onClearFilters }) => {
  const [showAdvanced, setShowAdvanced] = useState(true);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">فلاتر التقرير</h3>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {showAdvanced && (
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* الفترة الزمنية */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">من تاريخ</label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={filters.date_from || ''}
                onChange={(e) => onFiltersChange({ ...filters, date_from: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">إلى تاريخ</label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={filters.date_to || ''}
                onChange={(e) => onFiltersChange({ ...filters, date_to: e.target.value })}
              />
            </div>

            {/* القسم */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">القسم</label>
              <input
                type="text"
                placeholder="اسم القسم"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={filters.department || ''}
                onChange={(e) => onFiltersChange({ ...filters, department: e.target.value })}
              />
            </div>

            {/* الفريق */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الفريق</label>
              <input
                type="text"
                placeholder="اسم الفريق"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={filters.team || ''}
                onChange={(e) => onFiltersChange({ ...filters, team: e.target.value })}
              />
            </div>

            {/* المنطقة */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">المنطقة</label>
              <input
                type="text"
                placeholder="اسم المنطقة"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={filters.region || ''}
                onChange={(e) => onFiltersChange({ ...filters, region: e.target.value })}
              />
            </div>

            {/* رقم الخط */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">رقم الخط</label>
              <input
                type="text"
                placeholder="رقم الخط"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={filters.line_number || ''}
                onChange={(e) => onFiltersChange({ ...filters, line_number: e.target.value })}
              />
            </div>

            {/* نطاق المبلغ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">المبلغ من (ر.س)</label>
              <input
                type="number"
                placeholder="المبلغ الأدنى"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={filters.amount_from || ''}
                onChange={(e) => onFiltersChange({ ...filters, amount_from: Number(e.target.value) })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">المبلغ إلى (ر.س)</label>
              <input
                type="number"
                placeholder="المبلغ الأعلى"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={filters.amount_to || ''}
                onChange={(e) => onFiltersChange({ ...filters, amount_to: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 rtl:space-x-reverse mt-6">
            <button
              onClick={onClearFilters}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
            >
              <RotateCcw className="h-4 w-4 ml-2" />
              إعادة تعيين
            </button>
            <button
              onClick={onGenerateReport}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              <BarChart3 className="h-4 w-4 ml-2" />
              إنشاء التقرير
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// مكون الرسوم البيانية للمصروفات الشهرية
const MonthlyExpensesChart: React.FC<{ data: any[] }> = ({ data }) => (
  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
    <h3 className="text-lg font-medium text-gray-900 mb-4">المصروفات الشهرية</h3>
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip 
            formatter={(value: number) => [`${value.toLocaleString()} ر.س`, 'المبلغ']}
            labelFormatter={(label) => `الشهر: ${label}`}
          />
          <Area 
            type="monotone" 
            dataKey="total_amount" 
            stroke="#3B82F6" 
            fill="#3B82F6" 
            fillOpacity={0.3}
          />
          <Area 
            type="monotone" 
            dataKey="approved_amount" 
            stroke="#10B981" 
            fill="#10B981" 
            fillOpacity={0.3}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </div>
);

// مكون رسم دائري لتوزيع المصروفات حسب الفئة
const CategoryDistributionChart: React.FC<{ data: any[] }> = ({ data }) => (
  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
    <h3 className="text-lg font-medium text-gray-900 mb-4">توزيع المصروفات حسب الفئة</h3>
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ category_name, percent }: any) => `${category_name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="total_amount"
          >
            {data.map((_: any, index: number) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => [`${value.toLocaleString()} ر.س`, 'المبلغ']} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  </div>
);

// مكون رسم أعمدة للمصروفات حسب القسم
const DepartmentExpensesChart: React.FC<{ data: any[] }> = ({ data }) => (
  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
    <h3 className="text-lg font-medium text-gray-900 mb-4">المصروفات حسب القسم</h3>
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="department" />
          <YAxis />
          <Tooltip formatter={(value: number) => [`${value.toLocaleString()} ر.س`, 'المبلغ']} />
          <Bar dataKey="total_amount" fill="#3B82F6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

// جدول أهم الموظفين من حيث المصروفات
const TopEmployeesTable: React.FC<{ data: any[] }> = ({ data }) => (
  <div className="bg-white shadow-sm rounded-lg border border-gray-200">
    <div className="px-6 py-4 border-b border-gray-200">
      <h3 className="text-lg font-medium text-gray-900">أهم الموظفين من حيث المصروفات</h3>
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              الموظف
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              عدد الطلبات
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              إجمالي المبلغ
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              متوسط المبلغ
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.slice(0, 10).map((employee, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {employee.employee_name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {employee.total_requests}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {employee.total_amount.toLocaleString()} ر.س
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {Math.round(employee.total_amount / employee.total_requests).toLocaleString()} ر.س
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// ملخص التقرير
const ReportSummary: React.FC<{ report: ExpenseReport }> = ({ report }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
    <div className="px-6 py-4 border-b border-gray-200">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">ملخص التقرير</h3>
        <div className="flex space-x-2 rtl:space-x-reverse">
          <button className="inline-flex items-center px-3 py-1 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50">
            <Download className="h-4 w-4 ml-1" />
            تصدير
          </button>
          <button className="inline-flex items-center px-3 py-1 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50">
            <Printer className="h-4 w-4 ml-1" />
            طباعة
          </button>
        </div>
      </div>
    </div>

    <div className="p-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{report.summary.total_requests}</div>
          <div className="text-sm text-gray-500">إجمالي الطلبات</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{report.summary.total_amount.toLocaleString()} ر.س</div>
          <div className="text-sm text-gray-500">إجمالي المبلغ</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">{report.summary.approved_requests}</div>
          <div className="text-sm text-gray-500">الطلبات المعتمدة</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{report.summary.rejected_requests}</div>
          <div className="text-sm text-gray-500">الطلبات المرفوضة</div>
        </div>
      </div>
      
      <div className="mt-4 text-sm text-gray-500">
        تم إنشاء التقرير في: {format(new Date(report.generated_at), 'dd/MM/yyyy HH:mm', { locale: ar })}
      </div>
    </div>
  </div>
);

// الصفحة الرئيسية
const ExpenseReportsPage: React.FC = () => {
  const [dashboardStats, setDashboardStats] = useState<ExpenseDashboardStats | null>(null);
  const [report, setReport] = useState<ExpenseReport | null>(null);
  const [filters, setFilters] = useState<ExpenseRequestFilters>({
    date_from: format(new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1), 'yyyy-MM-dd'),
    date_to: format(new Date(), 'yyyy-MM-dd')
  });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // تحميل الإحصائيات الأساسية
  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const stats = await expenseService.reports.getDashboardStats();
      setDashboardStats(stats);
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // إنشاء التقرير
  const generateReport = async () => {
    try {
      setGenerating(true);
      const generatedReport = await expenseService.reports.generateReport(filters);
      setReport(generatedReport);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('حدث خطأ أثناء إنشاء التقرير');
    } finally {
      setGenerating(false);
    }
  };

  // إعادة تعيين الفلاتر
  const clearFilters = () => {
    setFilters({
      date_from: format(new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1), 'yyyy-MM-dd'),
      date_to: format(new Date(), 'yyyy-MM-dd')
    });
    setReport(null);
  };

  useEffect(() => {
    loadDashboardStats();
    generateReport(); // تحميل تقرير افتراضي
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* العنوان الرئيسي */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">تقارير المصروفات</h1>
          <p className="mt-2 text-gray-600">تقارير تفصيلية وإحصائيات شاملة لجميع مصروفات المؤسسة</p>
        </div>

        {/* الإحصائيات السريعة */}
        {dashboardStats && <QuickStats stats={dashboardStats} />}

        {/* فلاتر التقارير */}
        <ReportFilters
          filters={filters}
          onFiltersChange={setFilters}
          onGenerateReport={generateReport}
          onClearFilters={clearFilters}
        />

        {generating && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">جاري إنشاء التقرير...</p>
          </div>
        )}

        {/* محتوى التقرير */}
        {report && !generating && (
          <div className="space-y-8">
            {/* ملخص التقرير */}
            <ReportSummary report={report} />

            {/* الرسوم البيانية */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {dashboardStats?.monthly_expenses && (
                <MonthlyExpensesChart data={dashboardStats.monthly_expenses} />
              )}
              
              {dashboardStats?.top_categories && (
                <CategoryDistributionChart data={dashboardStats.top_categories} />
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {dashboardStats?.top_departments && (
                <DepartmentExpensesChart data={dashboardStats.top_departments} />
              )}

              {/* جدول أهم الموظفين */}
              <div>
                <TopEmployeesTable 
                  data={Object.entries(report.summary.by_employee).map(([employee_name, total_amount]) => ({
                    employee_name,
                    total_amount,
                    total_requests: report.data.filter(req => req.employee_name === employee_name).length
                  }))}
                />
              </div>
            </div>

            {/* بيانات تفصيلية */}
            <div className="bg-white shadow-sm rounded-lg border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">البيانات التفصيلية</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        رقم الطلب
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        الموظف
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        القسم
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        التاريخ
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        المبلغ
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        الحالة
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {report.data.slice(0, 100).map((request) => ( // عرض أول 100 عنصر فقط
                      <tr key={request.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {request.request_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {request.employee_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {request.department || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format(new Date(request.expense_date), 'dd/MM/yyyy', { locale: ar })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {request.total_amount.toLocaleString()} ر.س
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            request.status === 'approved' ? 'bg-green-100 text-green-700' :
                            request.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            request.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {expenseService.getStatusLabel(request.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {report.data.length > 100 && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
                  عرض 100 من أصل {report.data.length.toLocaleString()} عنصر.
                  {' '}
                  <button className="text-blue-600 hover:text-blue-800">تصدير البيانات الكاملة</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseReportsPage;