'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  AlertTriangle,
  FileText,
  Calendar,
  DollarSign,
  User,
  Building,
  MapPin,
  MessageSquare,
  ArrowLeft,
  Filter,
  Search,
  RotateCcw,
  Download
} from 'lucide-react';

import {
  ExpenseRequestSummary,
  ExpenseRequest,
  ExpenseRequestFilters,
  ExpenseRequestStatus,
  ExpensePriority,
  ExpenseApprovalForm,
  ExpenseApprovalAction
} from '@/types/accounts';
import { expenseService } from '@/lib/accounts/expenses';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';

// مكون حالة الطلب
const StatusBadge: React.FC<{ status: ExpenseRequestStatus }> = ({ status }) => {
  const getStatusStyle = (status: ExpenseRequestStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'approved':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-700 border-red-200';
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

// مكون أولوية الطلب
const PriorityBadge: React.FC<{ priority: ExpensePriority }> = ({ priority }) => {
  const getPriorityStyle = (priority: ExpensePriority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-50 text-red-600 border-red-200';
      case 'high':
        return 'bg-orange-50 text-orange-600 border-orange-200';
      case 'normal':
        return 'bg-gray-50 text-gray-600 border-gray-200';
      case 'low':
        return 'bg-blue-50 text-blue-600 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const getIcon = (priority: ExpensePriority) => {
    if (priority === 'urgent') {
      return <AlertTriangle className="h-3 w-3 mr-1" />;
    }
    return null;
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${getPriorityStyle(priority)}`}>
      {getIcon(priority)}
      {expenseService.getPriorityLabel(priority)}
    </span>
  );
};

// مكون إحصائيات سريعة
const QuickStats: React.FC<{ 
  totalPending: number;
  totalAmount: number;
  urgentRequests: number;
}> = ({ totalPending, totalAmount, urgentRequests }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <Clock className="h-8 w-8 text-yellow-600" />
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">في انتظار الموافقة</dt>
            <dd className="text-2xl font-semibold text-gray-900">{totalPending}</dd>
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
            <dd className="text-2xl font-semibold text-gray-900">{totalAmount.toLocaleString()} ر.س</dd>
          </dl>
        </div>
      </div>
    </div>

    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-8 w-8 text-red-600" />
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">طلبات عاجلة</dt>
            <dd className="text-2xl font-semibold text-gray-900">{urgentRequests}</dd>
          </dl>
        </div>
      </div>
    </div>
  </div>
);

// مكون فلاتر متقدمة
const FiltersSection: React.FC<{
  filters: ExpenseRequestFilters;
  onFiltersChange: (filters: ExpenseRequestFilters) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
}> = ({ filters, onFiltersChange, onApplyFilters, onClearFilters }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

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
              onClick={() => setShowAdvanced(!showAdvanced)}
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
              تطبيق
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

      {showAdvanced && (
        <div className="p-4 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الأولوية</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={filters.priority?.[0] || ''}
                onChange={(e) => {
                  const priority = e.target.value as ExpensePriority;
                  onFiltersChange({ ...filters, priority: priority ? [priority] : [] });
                }}
              >
                <option value="">جميع الأولويات</option>
                <option value="urgent">عاجلة</option>
                <option value="high">مرتفعة</option>
                <option value="normal">عادية</option>
                <option value="low">منخفضة</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">من تاريخ</label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={filters.date_from || ''}
                onChange={(e) => onFiltersChange({ ...filters, date_from: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">إلى تاريخ</label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={filters.date_to || ''}
                onChange={(e) => onFiltersChange({ ...filters, date_to: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// مكون قائمة الطلبات
const RequestsList: React.FC<{
  requests: ExpenseRequestSummary[];
  onViewRequest: (request: ExpenseRequestSummary) => void;
  onApproveRequest: (request: ExpenseRequestSummary) => void;
  onRejectRequest: (request: ExpenseRequestSummary) => void;
}> = ({ requests, onViewRequest, onApproveRequest, onRejectRequest }) => (
  <div className="bg-white shadow-sm rounded-lg border border-gray-200">
    <div className="px-6 py-4 border-b border-gray-200">
      <h3 className="text-lg font-medium text-gray-900">طلبات الموافقة ({requests.length})</h3>
    </div>

    <div className="divide-y divide-gray-200">
      {requests.map((request) => (
        <div key={request.id} className="p-6 hover:bg-gray-50">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 rtl:space-x-reverse mb-3">
                <h4 className="text-lg font-medium text-gray-900">
                  طلب #{request.request_number}
                </h4>
                <StatusBadge status={request.status} />
                <PriorityBadge priority={request.priority} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600 mb-4">
                <div className="flex items-center">
                  <User className="h-4 w-4 ml-2 text-gray-400" />
                  <span>{request.employee_name}</span>
                </div>
                
                {request.department && (
                  <div className="flex items-center">
                    <Building className="h-4 w-4 ml-2 text-gray-400" />
                    <span>{request.department}</span>
                  </div>
                )}

                {request.region && (
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 ml-2 text-gray-400" />
                    <span>{request.region}</span>
                  </div>
                )}

                <div className="flex items-center">
                  <Calendar className="h-4 w-4 ml-2 text-gray-400" />
                  <span>{format(new Date(request.expense_date), 'dd/MM/yyyy', { locale: ar })}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  <span>إجمالي: </span>
                  <span className="font-medium text-gray-900">{request.total_amount.toLocaleString()} ر.س</span>
                  <span className="mx-2">•</span>
                  <span>{request.item_count} بند</span>
                  <span className="mx-2">•</span>
                  <span>تاريخ التقديم: {format(new Date(request.created_at), 'dd/MM/yyyy', { locale: ar })}</span>
                </div>

                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <button
                    onClick={() => onViewRequest(request)}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Eye className="h-4 w-4 ml-1" />
                    عرض
                  </button>
                  
                  <button
                    onClick={() => onApproveRequest(request)}
                    className="inline-flex items-center px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 ml-1" />
                    موافق
                  </button>
                  
                  <button
                    onClick={() => onRejectRequest(request)}
                    className="inline-flex items-center px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                  >
                    <XCircle className="h-4 w-4 ml-1" />
                    رفض
                  </button>
                </div>
              </div>

              {request.categories && (
                <div className="mt-3 text-xs text-gray-500">
                  <strong>الفئات:</strong> {request.categories}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {requests.length === 0 && (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد طلبات تحتاج موافقة</h3>
          <p className="mt-1 text-sm text-gray-500">جميع الطلبات تمت معالجتها أو لا توجد طلبات جديدة.</p>
        </div>
      )}
    </div>
  </div>
);

// مكون مودال تفاصيل الطلب
const RequestDetailsModal: React.FC<{
  request: ExpenseRequest;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (comments?: string) => void;
  onReject: (comments: string) => void;
}> = ({ request, isOpen, onClose, onApprove, onReject }) => {
  const [comments, setComments] = useState('');
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (action === 'approve') {
      onApprove(comments);
    } else if (action === 'reject') {
      if (!comments.trim()) {
        alert('يجب إدخال سبب الرفض');
        return;
      }
      onReject(comments);
    }
    setComments('');
    setAction(null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              تفاصيل طلب المصروفات #{request.request_number}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* معلومات الطلب */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">معلومات الطلب</h3>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">الموظف:</dt>
                    <dd className="text-sm text-gray-900">{request.employee_name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">القسم:</dt>
                    <dd className="text-sm text-gray-900">{request.department}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">الفريق:</dt>
                    <dd className="text-sm text-gray-900">{request.team || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">المنطقة:</dt>
                    <dd className="text-sm text-gray-900">{request.region || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">تاريخ المصروف:</dt>
                    <dd className="text-sm text-gray-900">
                      {format(new Date(request.expense_date), 'dd/MM/yyyy', { locale: ar })}
                    </dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">الحالة والمبلغ</h3>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-500 ml-2">الحالة:</span>
                    <StatusBadge status={request.status} />
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-500 ml-2">الأولوية:</span>
                    <PriorityBadge priority={request.priority} />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">المبلغ الإجمالي: </span>
                    <span className="text-lg font-bold text-blue-600">
                      {request.total_amount.toLocaleString()} ر.س
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* وصف الطلب */}
            {request.description && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">وصف الطلب</h3>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{request.description}</p>
              </div>
            )}

            {/* بنود المصروفات */}
            {request.items && request.items.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">بنود المصروفات</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الفئة</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الوصف</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاريخ</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الكمية</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">المبلغ</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {request.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-4 text-sm text-gray-900">{item.category_name}</td>
                          <td className="px-4 py-4 text-sm text-gray-900">{item.item_description}</td>
                          <td className="px-4 py-4 text-sm text-gray-900">
                            {format(new Date(item.expense_date), 'dd/MM/yyyy', { locale: ar })}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900">{item.quantity}</td>
                          <td className="px-4 py-4 text-sm text-gray-900">{item.amount.toLocaleString()} ر.س</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={4} className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                          الإجمالي:
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900">
                          {request.total_amount.toLocaleString()} ر.س
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* نموذج الموافقة/الرفض */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">إجراء الموافقة</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    التعليقات {action === 'reject' && <span className="text-red-500">*</span>}
                  </label>
                  <textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder={action === 'reject' ? 'يرجى ذكر سبب الرفض...' : 'تعليقات إضافية (اختيارية)...'}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end space-x-3 rtl:space-x-reverse">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    إلغاء
                  </button>
                  
                  <button
                    onClick={() => {
                      setAction('reject');
                      handleSubmit();
                    }}
                    className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
                  >
                    <XCircle className="h-4 w-4 ml-2" />
                    رفض الطلب
                  </button>
                  
                  <button
                    onClick={() => {
                      setAction('approve');
                      handleSubmit();
                    }}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 ml-2" />
                    الموافقة على الطلب
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// الصفحة الرئيسية
const ExpenseApprovalsPage: React.FC = () => {
  const [pendingRequests, setPendingRequests] = useState<ExpenseRequestSummary[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ExpenseRequest | null>(null);
  const [showRequestDetails, setShowRequestDetails] = useState(false);
  const [filters, setFilters] = useState<ExpenseRequestFilters>({ status: ['pending'] });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // إحصائيات سريعة
  const totalPending = pendingRequests.length;
  const totalAmount = pendingRequests.reduce((sum, req) => sum + req.total_amount, 0);
  const urgentRequests = pendingRequests.filter(req => req.priority === 'urgent').length;

  // تحميل البيانات
  const loadPendingRequests = async () => {
    try {
      setLoading(true);
      // هنا سيتم جلب الطلبات المعلقة للمدير الحالي
      const managerId = 'current-manager-id'; // يجب الحصول عليه من سياق المصادقة
      const requests = await expenseService.requests.getPendingApprovals(managerId);
      
      // تحويل ExpenseRequest[] إلى ExpenseRequestSummary[]
      const summaries = requests.map(req => ({
        id: req.id,
        request_number: req.request_number,
        employee_id: req.employee_id,
        employee_name: req.employee_name,
        department: req.department,
        team: req.team,
        region: req.region,
        line_number: req.line_number,
        expense_date: req.expense_date,
        total_amount: req.total_amount,
        currency: req.currency || 'EGP',
        priority: req.priority,
        status: req.status,
        created_at: req.created_at,
        approved_at: req.approved_at,
        approved_by_name: req.approved_by_name,
        item_count: req.items?.length || 0,
        categories: req.items?.map(item => item.category_name).join(', ') || ''
      }));
      
      setPendingRequests(summaries);
    } catch (error) {
      console.error('Error loading pending requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingRequests();
  }, []);

  // تطبيق الفلاتر
  const handleApplyFilters = async () => {
    await loadPendingRequests();
  };

  // إعادة تعيين الفلاتر
  const handleClearFilters = () => {
    setFilters({ status: ['pending'] });
    loadPendingRequests();
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

  // الموافقة على طلب
  const handleApproveRequest = async (request: ExpenseRequestSummary, comments?: string) => {
    try {
      setProcessing(true);
      const approverId = 'current-user-id'; // يجب الحصول عليه من سياق المصادقة
      const approverName = 'Current User Name';

      await expenseService.requests.processApproval(
        request.id,
        { action: 'approved', comments },
        approverId,
        approverName
      );

      alert('تمت الموافقة على الطلب بنجاح');
      setShowRequestDetails(false);
      await loadPendingRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      alert('حدث خطأ أثناء الموافقة على الطلب');
    } finally {
      setProcessing(false);
    }
  };

  // رفض طلب
  const handleRejectRequest = async (request: ExpenseRequestSummary, comments: string) => {
    try {
      setProcessing(true);
      const approverId = 'current-user-id';
      const approverName = 'Current User Name';

      await expenseService.requests.processApproval(
        request.id,
        { action: 'rejected', comments },
        approverId,
        approverName
      );

      alert('تم رفض الطلب');
      setShowRequestDetails(false);
      await loadPendingRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('حدث خطأ أثناء رفض الطلب');
    } finally {
      setProcessing(false);
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Breadcrumbs items={[{ label: 'الحسابات', href: '/accounting' }, { label: 'اعتمادات المصروفات' }]} />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* العنوان الرئيسي */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">موافقات المصروفات</h1>
          <p className="mt-2 text-gray-600">مراجعة والموافقة على طلبات المصروفات المقدمة من الفريق</p>
        </div>

        {/* الإحصائيات السريعة */}
        <QuickStats
          totalPending={totalPending}
          totalAmount={totalAmount}
          urgentRequests={urgentRequests}
        />

        {/* الفلاتر */}
        <FiltersSection
          filters={filters}
          onFiltersChange={setFilters}
          onApplyFilters={handleApplyFilters}
          onClearFilters={handleClearFilters}
        />

        {/* قائمة الطلبات */}
        <RequestsList
          requests={pendingRequests}
          onViewRequest={handleViewRequest}
          onApproveRequest={(req) => handleApproveRequest(req)}
          onRejectRequest={(req) => {
            const comments = prompt('يرجى ذكر سبب الرفض:');
            if (comments) {
              handleRejectRequest(req, comments);
            }
          }}
        />

        {/* مودال تفاصيل الطلب */}
        {selectedRequest && (
          <RequestDetailsModal
            request={selectedRequest}
            isOpen={showRequestDetails}
            onClose={() => setShowRequestDetails(false)}
            onApprove={(comments) => handleApproveRequest({
              id: selectedRequest.id,
              request_number: selectedRequest.request_number,
              employee_name: selectedRequest.employee_name,
              total_amount: selectedRequest.total_amount,
              status: selectedRequest.status,
              priority: selectedRequest.priority
            } as ExpenseRequestSummary, comments)}
            onReject={(comments) => handleRejectRequest({
              id: selectedRequest.id,
              request_number: selectedRequest.request_number,
              employee_name: selectedRequest.employee_name,
              total_amount: selectedRequest.total_amount,
              status: selectedRequest.status,
              priority: selectedRequest.priority
            } as ExpenseRequestSummary, comments)}
          />
        )}
      </div>
    </div>
  );
};

export default ExpenseApprovalsPage;