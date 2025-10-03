'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Filter,
  MapPin,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  RotateCcw,
  Download,
  Printer,
  Plus,
  MoreHorizontal,
  AlertCircle,
  TrendingUp,
  Users,
  Building,
  Tag
} from 'lucide-react';

import {
  ExpenseRequestSummary,
  ExpenseRequest,
  ExpenseRequestFilters,
  ExpenseRequestStatus,
  ExpensePriority,
  ExpenseDashboardStats
} from '@/types/accounts';
import { expenseService } from '@/lib/accounts/expenses';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';

// المكونات المساعدة
const StatusBadge: React.FC<{ status: ExpenseRequestStatus }> = ({ status }) => {
  const getStatusStyle = (status: ExpenseRequestStatus) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'approved':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'processed':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'paid':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusStyle(status)}`}>
      {expenseService.getStatusLabel(status)}
    </span>
  );
};

const PriorityBadge: React.FC<{ priority: ExpensePriority }> = ({ priority }) => {
  const getPriorityStyle = (priority: ExpensePriority) => {
    switch (priority) {
      case 'low':
        return 'bg-blue-50 text-blue-600';
      case 'normal':
        return 'bg-gray-50 text-gray-600';
      case 'high':
        return 'bg-orange-50 text-orange-600';
      case 'urgent':
        return 'bg-red-50 text-red-600';
      default:
        return 'bg-gray-50 text-gray-600';
    }
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getPriorityStyle(priority)}`}>
      {expenseService.getPriorityLabel(priority)}
    </span>
  );
};

// إحصائيات سريعة
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
            <dd className="flex items-baseline">
              <div className="text-2xl font-semibold text-gray-900">{stats.total_requests.toLocaleString()}</div>
            </dd>
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
            <dd className="flex items-baseline">
              <div className="text-2xl font-semibold text-gray-900">{stats.total_amount.toLocaleString()} ر.س</div>
            </dd>
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
            <dd className="flex items-baseline">
              <div className="text-2xl font-semibold text-gray-900">{stats.pending_requests}</div>
              <div className="ml-2 text-sm text-gray-500">({stats.pending_amount.toLocaleString()} ر.س)</div>
            </dd>
          </dl>
        </div>
      </div>
    </div>

    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">معتمدة</dt>
            <dd className="flex items-baseline">
              <div className="text-2xl font-semibold text-gray-900">{stats.approved_requests}</div>
              <div className="ml-2 text-sm text-gray-500">({stats.approved_amount.toLocaleString()} ر.س)</div>
            </dd>
          </dl>
        </div>
      </div>
    </div>
  </div>
);

// مرشح متقدم
const AdvancedFilters: React.FC<{
  filters: ExpenseRequestFilters;
  onFiltersChange: (filters: ExpenseRequestFilters) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
}> = ({ filters, onFiltersChange, onApplyFilters, onClearFilters }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="البحث في الطلبات..."
                className="w-64 pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={filters.search || ''}
                onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
              />
            </div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Filter className="h-4 w-4 ml-2" />
              فلاتر متقدمة
            </button>
          </div>

          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <button
              onClick={onApplyFilters}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              تطبيق الفلاتر
            </button>
            <button
              onClick={onClearFilters}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
            >
              <RotateCcw className="h-4 w-4 ml-2" />
              إعادة تعيين
            </button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* حالة الطلب */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الحالة</label>
              <select
                multiple
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={filters.status || []}
                onChange={(e) => {
                  const selectedOptions = Array.from(e.target.selectedOptions, option => option.value) as ExpenseRequestStatus[];
                  onFiltersChange({ ...filters, status: selectedOptions });
                }}
              >
                <option value="draft">مسودة</option>
                <option value="pending">في انتظار الموافقة</option>
                <option value="approved">معتمد</option>
                <option value="rejected">مرفوض</option>
                <option value="processed">معالج</option>
                <option value="paid">مدفوع</option>
              </select>
            </div>

            {/* الأولوية */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الأولوية</label>
              <select
                multiple
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={filters.priority || []}
                onChange={(e) => {
                  const selectedOptions = Array.from(e.target.selectedOptions, option => option.value) as ExpensePriority[];
                  onFiltersChange({ ...filters, priority: selectedOptions });
                }}
              >
                <option value="low">منخفضة</option>
                <option value="normal">عادية</option>
                <option value="high">مرتفعة</option>
                <option value="urgent">عاجلة</option>
              </select>
            </div>

            {/* القسم */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">القسم</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="اسم القسم"
                value={filters.department || ''}
                onChange={(e) => onFiltersChange({ ...filters, department: e.target.value })}
              />
            </div>

            {/* الفريق */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الفريق</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="اسم الفريق"
                value={filters.team || ''}
                onChange={(e) => onFiltersChange({ ...filters, team: e.target.value })}
              />
            </div>

            {/* المنطقة */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">المنطقة</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="اسم المنطقة"
                value={filters.region || ''}
                onChange={(e) => onFiltersChange({ ...filters, region: e.target.value })}
              />
            </div>

            {/* من تاريخ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">من تاريخ</label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={filters.date_from || ''}
                onChange={(e) => onFiltersChange({ ...filters, date_from: e.target.value })}
              />
            </div>

            {/* إلى تاريخ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">إلى تاريخ</label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={filters.date_to || ''}
                onChange={(e) => onFiltersChange({ ...filters, date_to: e.target.value })}
              />
            </div>

            {/* نطاق المبلغ */}
            <div className="md:col-span-2 lg:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">نطاق المبلغ (ر.س)</label>
              <div className="flex space-x-2 rtl:space-x-reverse">
                <input
                  type="number"
                  placeholder="من"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filters.amount_from || ''}
                  onChange={(e) => onFiltersChange({ ...filters, amount_from: Number(e.target.value) })}
                />
                <input
                  type="number"
                  placeholder="إلى"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filters.amount_to || ''}
                  onChange={(e) => onFiltersChange({ ...filters, amount_to: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// جدول الطلبات
const ExpenseRequestsTable: React.FC<{
  requests: ExpenseRequestSummary[];
  onViewRequest: (request: ExpenseRequestSummary) => void;
  onProcessRequest: (request: ExpenseRequestSummary, action: string) => void;
}> = ({ requests, onViewRequest, onProcessRequest }) => (
  <div className="bg-white shadow-sm rounded-lg border border-gray-200">
    <div className="px-6 py-4 border-b border-gray-200">
      <h3 className="text-lg font-medium text-gray-900">طلبات المصروفات</h3>
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
              القسم / الفريق
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              تاريخ المصروف
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              المبلغ
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              الحالة
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              الأولوية
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              الفئات
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              الإجراءات
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {requests.map((request) => (
            <tr key={request.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{request.request_number}</div>
                <div className="text-sm text-gray-500">
                  {format(new Date(request.created_at), 'dd/MM/yyyy', { locale: ar })}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{request.employee_name}</div>
                {request.line_number && (
                  <div className="text-sm text-gray-500">خط {request.line_number}</div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{request.department}</div>
                {request.team && (
                  <div className="text-sm text-gray-500">{request.team}</div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {format(new Date(request.expense_date), 'dd/MM/yyyy', { locale: ar })}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                  {request.total_amount.toLocaleString()} ر.س
                </div>
                <div className="text-sm text-gray-500">
                  {request.item_count} بند
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <StatusBadge status={request.status} />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <PriorityBadge priority={request.priority} />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900 max-w-xs truncate" title={request.categories}>
                  {request.categories}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <button
                    onClick={() => onViewRequest(request)}
                    className="text-blue-600 hover:text-blue-800"
                    title="عرض التفاصيل"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  
                  {request.status === 'approved' && (
                    <button
                      onClick={() => onProcessRequest(request, 'process')}
                      className="text-green-600 hover:text-green-800"
                      title="معالجة"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                  )}
                  
                  <button
                    className="text-gray-400 hover:text-gray-600"
                    title="المزيد من الإجراءات"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {requests.length === 0 && (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد طلبات مصروفات</h3>
        <p className="mt-1 text-sm text-gray-500">لم يتم العثور على أي طلبات مطابقة للفلاتر المحددة.</p>
      </div>
    )}
  </div>
);

// الصفحة الرئيسية
const ExpensesManagementPage: React.FC = () => {
  const router = useRouter();
  const [requests, setRequests] = useState<ExpenseRequestSummary[]>([]);
  const [dashboardStats, setDashboardStats] = useState<ExpenseDashboardStats | null>(null);
  const [filters, setFilters] = useState<ExpenseRequestFilters>({});
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ExpenseRequest | null>(null);
  const [showRequestDetails, setShowRequestDetails] = useState(false);

  // تحميل البيانات
  const loadData = async () => {
    try {
      setLoading(true);
      const [requestsResult, statsResult] = await Promise.all([
        expenseService.requests.getRequests(filters),
        expenseService.reports.getDashboardStats()
      ]);
      
      setRequests(requestsResult.requests);
      setDashboardStats(statsResult);
    } catch (error) {
      console.error('Error loading expenses data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // تطبيق الفلاتر
  const handleApplyFilters = async () => {
    await loadData();
  };

  // إعادة تعيين الفلاتر
  const handleClearFilters = () => {
    setFilters({});
    loadData();
  };

  // عرض تفاصيل الطلب
  const handleViewRequest = async (request: ExpenseRequestSummary) => {
    try {
      const fullRequest = await expenseService.requests.getRequestById(request.id);
      if (fullRequest) {
        setSelectedRequest(fullRequest);
        setShowRequestDetails(true);
      }
    } catch (error) {
      console.error('Error loading request details:', error);
    }
  };

  // معالجة الطلب
  const handleProcessRequest = async (request: ExpenseRequestSummary, action: string) => {
    try {
      // هنا ستتم معالجة الإجراءات مثل الموافقة أو الرفض
      console.log(`Processing request ${request.id} with action: ${action}`);
      await loadData(); // إعادة تحميل البيانات
    } catch (error) {
      console.error('Error processing request:', error);
    }
  };

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
        <Breadcrumbs items={[{ label: 'الحسابات', href: '/accounting' }, { label: 'إدارة المصروفات' }]} />
        {/* العنوان الرئيسي */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">إدارة المصروفات</h1>
              <p className="mt-2 text-gray-600">عرض وإدارة جميع طلبات المصروفات في النظام</p>
            </div>
            <button
              onClick={() => router.push('/accounts/expenses/new')}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm"
            >
              <Plus className="h-5 w-5 ml-2" />
              طلب جديد
            </button>
          </div>
        </div>

        {/* الإحصائيات السريعة */}
        {dashboardStats && <QuickStats stats={dashboardStats} />}

        {/* الفلاتر المتقدمة */}
        <AdvancedFilters
          filters={filters}
          onFiltersChange={setFilters}
          onApplyFilters={handleApplyFilters}
          onClearFilters={handleClearFilters}
        />

        {/* أدوات الإجراءات */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-sm text-gray-500">
            عرض {requests.length} من طلبات المصروفات
          </div>
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <Download className="h-4 w-4 ml-2" />
              تصدير
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <Printer className="h-4 w-4 ml-2" />
              طباعة
            </button>
          </div>
        </div>

        {/* جدول الطلبات */}
        <ExpenseRequestsTable
          requests={requests}
          onViewRequest={handleViewRequest}
          onProcessRequest={handleProcessRequest}
        />

        {/* مودال تفاصيل الطلب */}
        {showRequestDetails && selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    تفاصيل طلب المصروفات #{selectedRequest.request_number}
                  </h2>
                  <button
                    onClick={() => setShowRequestDetails(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>

                {/* تفاصيل الطلب هنا */}
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">معلومات الطلب</h3>
                      <dl className="space-y-2">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">الموظف:</dt>
                          <dd className="text-sm text-gray-900">{selectedRequest.employee_name}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">القسم:</dt>
                          <dd className="text-sm text-gray-900">{selectedRequest.department}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">تاريخ المصروف:</dt>
                          <dd className="text-sm text-gray-900">
                            {format(new Date(selectedRequest.expense_date), 'dd/MM/yyyy', { locale: ar })}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">المبلغ الإجمالي:</dt>
                          <dd className="text-sm text-gray-900">{selectedRequest.total_amount.toLocaleString()} ر.س</dd>
                        </div>
                      </dl>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">الحالة والأولوية</h3>
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-500 ml-2">الحالة:</span>
                          <StatusBadge status={selectedRequest.status} />
                        </div>
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-500 ml-2">الأولوية:</span>
                          <PriorityBadge priority={selectedRequest.priority} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* بنود المصروفات */}
                  {selectedRequest.items && selectedRequest.items.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">بنود المصروفات</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الفئة</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الوصف</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الكمية</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الوقت</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الموقع</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">المبلغ</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {selectedRequest.items.map((item) => (
                              <tr key={item.id}>
                                <td className="px-4 py-4 text-sm text-gray-900">{item.category_name}</td>
                                <td className="px-4 py-4 text-sm text-gray-900">{item.item_description}</td>
                                <td className="px-4 py-4 text-sm text-gray-900">{item.quantity}</td>
                                <td className="px-4 py-4 text-sm text-gray-900">{item.expense_time || '-'}</td>
                                <td className="px-4 py-4 text-sm text-gray-900">{item.location || '-'}</td>
                                <td className="px-4 py-4 text-sm text-gray-900">{item.amount.toLocaleString()} ر.س</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* أزرار الإجراءات */}
                <div className="flex justify-end space-x-3 rtl:space-x-reverse mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setShowRequestDetails(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    إغلاق
                  </button>
                  {selectedRequest.status === 'approved' && (
                    <button
                      onClick={() => handleProcessRequest({
                        id: selectedRequest.id,
                        request_number: selectedRequest.request_number,
                        employee_name: selectedRequest.employee_name,
                        total_amount: selectedRequest.total_amount,
                        status: selectedRequest.status,
                        priority: selectedRequest.priority
                      } as ExpenseRequestSummary, 'process')}
                      className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
                    >
                      معالجة الطلب
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpensesManagementPage;