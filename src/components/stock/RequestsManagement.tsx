/**
 * 📋 EP Group System - Stock Requests Management
 * إدارة طلبات المخازن والموافقات
 */

import React, { useState, useEffect } from 'react';
import {
  FileText, Plus, Eye, Edit, Trash2, CheckCircle, XCircle,
  Clock, AlertTriangle, User, Calendar, Package, DollarSign,
  Filter, Search, Download, RefreshCw, Send, MessageSquare,
  ThumbsUp, ThumbsDown, ArrowRight, Clipboard, FileCheck
} from 'lucide-react';

import { stockService } from '../../lib/stock/stock-management-service';
import { stockSecurityService } from '../../lib/stock/stock-security';
import { stockIntegrationService } from '../../lib/stock/stock-integration';
import type { StockRequest } from '../../lib/stock/stock-management-service';

// ==================================================================
// أنواع البيانات لإدارة الطلبات
// ==================================================================

interface ExtendedStockRequest extends StockRequest {
  items_count: number;
  approval_status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  can_approve: boolean;
  can_edit: boolean;
  can_cancel: boolean;
  workflow_id?: string;
}

interface RequestFilters {
  search: string;
  status: string;
  priority: string;
  warehouse_id: string;
  date_from: string;
  date_to: string;
  sort_by: 'created_at' | 'priority' | 'total_value' | 'status';
  sort_order: 'asc' | 'desc';
}

interface RequestFormData {
  request_type: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  warehouse_id: string;
  department: string;
  notes?: string;
  items: RequestItemData[];
}

interface RequestItemData {
  product_id: string;
  requested_quantity: number;
  notes?: string;
}

interface ApprovalAction {
  action: 'approve' | 'reject';
  comments: string;
}

// ==================================================================
// المكون الرئيسي لإدارة الطلبات
// ==================================================================

const RequestsManagement: React.FC = () => {
  const [requests, setRequests] = useState<ExtendedStockRequest[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [requestTypes, setRequestTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ExtendedStockRequest | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showApproval, setShowApproval] = useState(false);
  
  const [filters, setFilters] = useState<RequestFilters>({
    search: '',
    status: '',
    priority: '',
    warehouse_id: '',
    date_from: '',
    date_to: '',
    sort_by: 'created_at',
    sort_order: 'desc'
  });

  const [requestForm, setRequestForm] = useState<RequestFormData>({
    request_type: 'supply',
    title: '',
    description: '',
    priority: 'medium',
    warehouse_id: '',
    department: '',
    notes: '',
    items: []
  });

  const [approvalAction, setApprovalAction] = useState<ApprovalAction>({
    action: 'approve',
    comments: ''
  });

  const [userPermissions, setUserPermissions] = useState<any>({});

  useEffect(() => {
    loadData();
    loadUserPermissions();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // جلب البيانات بشكل متوازي
      const [requestsData, warehousesData, productsData, requestTypesData] = await Promise.all([
        loadRequestsWithExtendedInfo(),
        stockService.getWarehouses(),
        stockService.getProducts({ is_active: true }),
        stockService.getRequestTypes()
      ]);

      setRequests(requestsData);
      setWarehouses(warehousesData);
      setProducts(productsData);
      setRequestTypes(requestTypesData);
    } catch (error) {
      console.error('Error loading requests data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRequestsWithExtendedInfo = async (): Promise<ExtendedStockRequest[]> => {
    // جلب الطلبات مع الفلترة
    const requestsData = await stockService.getStockRequests({
      status: filters.status || undefined,
      warehouse_id: filters.warehouse_id || undefined,
      priority: filters.priority || undefined,
      date_from: filters.date_from || undefined,
      date_to: filters.date_to || undefined
    });

    // إضافة معلومات إضافية لكل طلب
    const extendedRequests = await Promise.all(
      requestsData.map(async (request): Promise<ExtendedStockRequest> => {
        // جلب عناصر الطلب
        const requestItems = await stockService.getStockRequestItems(request.id);
        
        // فحص الصلاحيات
        const canApprove = await stockSecurityService.hasPermission(
          'current_user', 
          request.warehouse_id, 
          'approve_requests'
        );
        
        const canEdit = await stockSecurityService.hasPermission(
          'current_user',
          request.warehouse_id,
          'edit_requests'
        );

        const canCancel = request.status === 'pending' && (
          request.requested_by === 'current_user' || 
          await stockSecurityService.hasPermission('current_user', request.warehouse_id, 'manage_requests')
        );

        // تحديد حالة الموافقة
        let approvalStatus: ExtendedStockRequest['approval_status'] = 'pending';
        if (request.status === 'approved') approvalStatus = 'approved';
        else if (request.status === 'rejected') approvalStatus = 'rejected';
        else if (request.status === 'cancelled') approvalStatus = 'cancelled';

        return {
          ...request,
          items_count: requestItems.length,
          approval_status: approvalStatus,
          can_approve: canApprove && request.status === 'pending',
          can_edit: canEdit && request.status === 'pending',
          can_cancel: canCancel
        };
      })
    );

    return applyRequestFilters(extendedRequests);
  };

  const applyRequestFilters = (requests: ExtendedStockRequest[]): ExtendedStockRequest[] => {
    let filtered = requests;

    // البحث النصي
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(request =>
        request.title.toLowerCase().includes(searchLower) ||
        request.description?.toLowerCase().includes(searchLower) ||
        request.requested_by_name?.toLowerCase().includes(searchLower) ||
        request.department?.toLowerCase().includes(searchLower)
      );
    }

    // الترتيب
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (filters.sort_by) {
        case 'created_at':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          aValue = priorityOrder[a.priority as keyof typeof priorityOrder];
          bValue = priorityOrder[b.priority as keyof typeof priorityOrder];
          break;
        case 'total_value':
          aValue = a.total_value || 0;
          bValue = b.total_value || 0;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
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

  const handleSubmitRequest = async () => {
    try {
      // إنشاء طلب جديد
      const newRequest = await stockService.createStockRequest({
        request_type_id: requestForm.request_type,
        request_type: requestForm.request_type,
        title: requestForm.title,
        description: requestForm.description,
        priority: requestForm.priority,
        warehouse_id: requestForm.warehouse_id,
        requested_by: 'current_user',
        requested_by_name: 'المستخدم الحالي',
        department: requestForm.department,
        notes: requestForm.notes,
        created_by: 'current_user'
      }, requestForm.items);

      // بدء سير الموافقة إذا كان مطلوباً
      const totalValue = requestForm.items.reduce((sum, item) => {
        const product = products.find(p => p.id === item.product_id);
        return sum + (item.requested_quantity * (product?.selling_price || 0));
      }, 0);

      if (totalValue > 1000) { // حد أدنى لبدء الموافقة
        await stockIntegrationService.initiateApprovalWorkflow(
          'stock_request',
          newRequest.id,
          'current_user',
          totalValue
        );
      }

      setShowForm(false);
      resetRequestForm();
      await loadData();
    } catch (error: any) {
      console.error('Error submitting request:', error);
      alert(`خطأ في إنشاء الطلب: ${error.message}`);
    }
  };

  const handleApprovalAction = async () => {
    if (!selectedRequest) return;

    try {
      if (selectedRequest.workflow_id) {
        // معالجة الموافقة من خلال سير العمل
        await stockIntegrationService.processApprovalStep(
          selectedRequest.workflow_id,
          'current_user',
          approvalAction.action === 'approve' ? 'approved' : 'rejected',
          approvalAction.comments
        );
      } else {
        // موافقة مباشرة
        await stockService.updateStockRequestStatus(
          selectedRequest.id,
          approvalAction.action === 'approve' ? 'approved' : 'rejected',
          'current_user',
          approvalAction.comments
        );
      }

      setShowApproval(false);
      setApprovalAction({ action: 'approve', comments: '' });
      await loadData();
    } catch (error: any) {
      console.error('Error processing approval:', error);
      alert(`خطأ في معالجة الموافقة: ${error.message}`);
    }
  };

  const resetRequestForm = () => {
    setRequestForm({
      request_type: 'supply',
      title: '',
      description: '',
      priority: 'medium',
      warehouse_id: '',
      department: '',
      notes: '',
      items: []
    });
  };

  const addRequestItem = () => {
    setRequestForm(prev => ({
      ...prev,
      items: [...prev.items, { product_id: '', requested_quantity: 1 }]
    }));
  };

  const removeRequestItem = (index: number) => {
    setRequestForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateRequestItem = (index: number, field: keyof RequestItemData, value: any) => {
    setRequestForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'pending': return 'معلق';
      case 'approved': return 'موافق';
      case 'rejected': return 'مرفوض';
      case 'cancelled': return 'ملغي';
      case 'processing': return 'قيد المعالجة';
      case 'completed': return 'مكتمل';
      default: return status;
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityText = (priority: string): string => {
    switch (priority) {
      case 'urgent': return 'عاجل';
      case 'high': return 'عالي';
      case 'medium': return 'متوسط';
      case 'low': return 'منخفض';
      default: return priority;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="animate-spin h-8 w-8 text-blue-600" />
          <p className="text-gray-600">جاري تحميل الطلبات...</p>
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
              <FileText className="h-8 w-8 text-blue-600" />
              📋 إدارة طلبات المخازن
            </h1>
            <p className="text-gray-600">
              إدارة ومتابعة طلبات الصرف والتوريد والموافقات
            </p>
            <p className="text-sm text-blue-600 mt-1">
              إجمالي الطلبات: {requests.length} • المعلقة: {requests.filter(r => r.status === 'pending').length}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3 mt-4 sm:mt-0">
            <button
              onClick={() => {/* تصدير التقارير */}}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Download className="h-4 w-4" />
              تصدير
            </button>
            
            {userPermissions.can_create && (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                طلب جديد
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
                placeholder="البحث في الطلبات..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* الحالة */}
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">جميع الحالات</option>
              <option value="pending">معلق</option>
              <option value="approved">موافق</option>
              <option value="rejected">مرفوض</option>
              <option value="processing">قيد المعالجة</option>
              <option value="completed">مكتمل</option>
              <option value="cancelled">ملغي</option>
            </select>

            {/* الأولوية */}
            <select
              value={filters.priority}
              onChange={(e) => setFilters({...filters, priority: e.target.value})}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">جميع الأولويات</option>
              <option value="urgent">عاجل</option>
              <option value="high">عالي</option>
              <option value="medium">متوسط</option>
              <option value="low">منخفض</option>
            </select>

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

            {/* من تاريخ */}
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters({...filters, date_from: e.target.value})}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />

            {/* إلى تاريخ */}
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters({...filters, date_to: e.target.value})}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* جدول الطلبات */}
      <RequestsTable
        requests={requests}
        onViewRequest={(request) => {
          setSelectedRequest(request);
          setShowDetails(true);
        }}
        onApproveRequest={(request) => {
          setSelectedRequest(request);
          setApprovalAction({ action: 'approve', comments: '' });
          setShowApproval(true);
        }}
        onRejectRequest={(request) => {
          setSelectedRequest(request);
          setApprovalAction({ action: 'reject', comments: '' });
          setShowApproval(true);
        }}
        getStatusColor={getStatusColor}
        getStatusText={getStatusText}
        getPriorityColor={getPriorityColor}
        getPriorityText={getPriorityText}
      />

      {/* نموذج طلب جديد */}
      {showForm && (
        <RequestFormModal
          formData={requestForm}
          setFormData={setRequestForm}
          warehouses={warehouses}
          products={products}
          requestTypes={requestTypes}
          onSave={handleSubmitRequest}
          onCancel={() => {
            setShowForm(false);
            resetRequestForm();
          }}
          addItem={addRequestItem}
          removeItem={removeRequestItem}
          updateItem={updateRequestItem}
        />
      )}

      {/* تفاصيل الطلب */}
      {showDetails && selectedRequest && (
        <RequestDetailsModal
          request={selectedRequest}
          onClose={() => {
            setShowDetails(false);
            setSelectedRequest(null);
          }}
        />
      )}

      {/* نموذج الموافقة */}
      {showApproval && selectedRequest && (
        <ApprovalModal
          request={selectedRequest}
          approvalAction={approvalAction}
          setApprovalAction={setApprovalAction}
          onSubmit={handleApprovalAction}
          onCancel={() => {
            setShowApproval(false);
            setApprovalAction({ action: 'approve', comments: '' });
          }}
        />
      )}
    </div>
  );
};

// ==================================================================
// مكونات مساعدة
// ==================================================================

interface RequestsTableProps {
  requests: ExtendedStockRequest[];
  onViewRequest: (request: ExtendedStockRequest) => void;
  onApproveRequest: (request: ExtendedStockRequest) => void;
  onRejectRequest: (request: ExtendedStockRequest) => void;
  getStatusColor: (status: string) => string;
  getStatusText: (status: string) => string;
  getPriorityColor: (priority: string) => string;
  getPriorityText: (priority: string) => string;
}

const RequestsTable: React.FC<RequestsTableProps> = ({
  requests, onViewRequest, onApproveRequest, onRejectRequest,
  getStatusColor, getStatusText, getPriorityColor, getPriorityText
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">الطلب</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">مقدم الطلب</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">المخزن</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">العناصر</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">الأولوية</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">الحالة</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">التاريخ</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {requests.map((request) => (
              <tr key={request.id} className="hover:bg-gray-50">
                <td className="px-4 py-4">
                  <div>
                    <p className="font-medium text-gray-900">{request.title}</p>
                    <p className="text-sm text-gray-600 max-w-xs truncate">
                      {request.description}
                    </p>
                    {request.total_value && (
                      <p className="text-xs text-green-600 mt-1">
                        {request.total_value.toLocaleString('ar-EG')} جنيه
                      </p>
                    )}
                  </div>
                </td>

                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">{request.requested_by_name}</p>
                      <p className="text-xs text-gray-500">{request.department}</p>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{request.warehouse?.name || 'غير محدد'}</span>
                  </div>
                </td>

                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <Clipboard className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium">{request.items_count} عنصر</span>
                  </div>
                </td>

                <td className="px-4 py-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(request.priority)}`}>
                    {getPriorityText(request.priority)}
                  </span>
                </td>

                <td className="px-4 py-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(request.status)}`}>
                    {getStatusText(request.status)}
                  </span>
                </td>

                <td className="px-4 py-4">
                  <div className="text-sm">
                    <p>{new Date(request.created_at).toLocaleDateString('ar-EG')}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(request.created_at).toLocaleTimeString('ar-EG')}
                    </p>
                  </div>
                </td>

                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onViewRequest(request)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="عرض التفاصيل"
                    >
                      <Eye className="h-4 w-4" />
                    </button>

                    {request.can_approve && (
                      <>
                        <button
                          onClick={() => onApproveRequest(request)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                          title="موافقة"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => onRejectRequest(request)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="رفض"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {requests.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600">لا توجد طلبات تطابق معايير البحث</p>
          </div>
        )}
      </div>
    </div>
  );
};

// المكونات الأخرى (RequestFormModal, RequestDetailsModal, ApprovalModal) 
// سيتم إضافتها في الملفات التالية لتوفير المساحة

export default RequestsManagement;