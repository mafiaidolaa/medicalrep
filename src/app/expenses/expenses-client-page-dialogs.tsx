"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

// Icons
import {
  Receipt, 
  PlusCircle, 
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Eye,
  Printer,
  Download,
  Calendar as CalendarIcon,
  Users,
  TrendingUp,
  AlertCircle,
  Settings,
  Car,
  Gift,
  Plane,
  Truck,
  Coffee,
  Activity,
  Zap,
  ThumbsUp,
  ThumbsDown,
  MessageSquare
} from 'lucide-react';

// استكمال باقي التابات والحوارات

// Approvals Tab Content
export const ApprovalsTab = ({ 
  expenseRequests, 
  currentUser, 
  loading, 
  onSelectRequest, 
  onApprovalAction,
  statusConfig,
  getIcon 
}: any) => {
  const pendingApprovals = expenseRequests.filter((request: any) => {
    if (currentUser.role === 'manager' || currentUser.role === 'admin') {
      return request.status === 'pending';
    }
    return false;
  });

  return (
    <TabsContent value="approvals" className="mt-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                طلبات تحتاج موافقة
              </CardTitle>
              <CardDescription>
                راجع ووافق على طلبات النفقات المعلقة
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 rounded-lg border border-orange-200">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-700">
                {pendingApprovals.length} طلب معلق
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            </div>
          ) : pendingApprovals.length > 0 ? (
            <div className="space-y-4">
              {pendingApprovals.map((request: any) => {
                const IconComponent = getIcon(request.expense_categories?.icon || 'Receipt');
                const statusInfo = statusConfig[request.status];
                
                return (
                  <Card key={request.id} className="border-l-4 border-orange-400 hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div 
                            className="p-3 rounded-lg"
                            style={{ 
                              backgroundColor: request.expense_categories?.color + '20',
                              color: request.expense_categories?.color 
                            }}
                          >
                            <IconComponent className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg mb-1">
                              {request.expense_categories?.name_ar}
                            </h3>
                            <p className="text-muted-foreground mb-2">
                              بواسطة: {request.users?.full_name} • 
                              {format(new Date(request.expense_date), 'dd MMM yyyy', { locale: ar })}
                            </p>
                            {request.description && (
                              <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                {request.description}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-2xl font-bold text-green-600">
                              {request.amount.toLocaleString()} ج.م
                            </p>
                            <Badge className={`${statusInfo.color} border mt-1`}>
                              <statusInfo.icon className="h-3 w-3 mr-1" />
                              {statusInfo.label}
                            </Badge>
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            <Button
                              onClick={() => onApprovalAction(request, 'approve')}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <ThumbsUp className="h-4 w-4 mr-2" />
                              موافقة
                            </Button>
                            <Button
                              onClick={() => onApprovalAction(request, 'reject')}
                              variant="destructive"
                            >
                              <ThumbsDown className="h-4 w-4 mr-2" />
                              رفض
                            </Button>
                            <Button
                              onClick={() => onSelectRequest(request)}
                              variant="outline"
                              size="sm"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              تفاصيل
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد طلبات تحتاج موافقة</h3>
              <p className="text-muted-foreground">جميع الطلبات تم التعامل معها</p>
            </div>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
};

// Accounting Tab Content  
export const AccountingTab = ({ 
  expenseRequests, 
  currentUser, 
  loading, 
  onSelectRequest, 
  onPaymentAction,
  statusConfig,
  getIcon 
}: any) => {
  const accountingRequests = expenseRequests.filter((request: any) => 
    ['manager_approved', 'accounting_approved', 'paid'].includes(request.status)
  );

  return (
    <TabsContent value="accounting" className="mt-6">
      <div className="space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">طلبات معتمدة</p>
                  <p className="text-3xl font-bold">
                    {accountingRequests.filter((r: any) => r.status === 'accounting_approved').length}
                  </p>
                </div>
                <CheckCircle className="h-12 w-12 text-green-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">تم الدفع</p>
                  <p className="text-3xl font-bold">
                    {accountingRequests.filter((r: any) => r.status === 'paid').length}
                  </p>
                </div>
                <DollarSign className="h-12 w-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">إجمالي المدفوع</p>
                  <p className="text-2xl font-bold">
                    {accountingRequests
                      .filter((r: any) => r.status === 'paid')
                      .reduce((sum: number, r: any) => sum + r.amount, 0)
                      .toLocaleString()} ج.م
                  </p>
                </div>
                <Activity className="h-12 w-12 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Requests Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              طلبات النفقات - قسم الحسابات
            </CardTitle>
            <CardDescription>
              إدارة ودفع النفقات المعتمدة
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الطلب</TableHead>
                    <TableHead>الموظف</TableHead>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>حالة المدير</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accountingRequests.map((request: any) => {
                    const IconComponent = getIcon(request.expense_categories?.icon || 'Receipt');
                    const statusInfo = statusConfig[request.status];
                    
                    return (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div 
                              className="p-2 rounded-lg"
                              style={{ 
                                backgroundColor: request.expense_categories?.color + '20',
                                color: request.expense_categories?.color 
                              }}
                            >
                              <IconComponent className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-medium">{request.expense_categories?.name_ar}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(request.expense_date), 'dd MMM yyyy', { locale: ar })}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{request.users?.full_name}</p>
                          <p className="text-sm text-muted-foreground capitalize">{request.users?.role}</p>
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-lg text-green-600">
                            {request.amount.toLocaleString()} ج.م
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-800 border-green-300 border">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            معتمد
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statusInfo.color} border`}>
                            <statusInfo.icon className="h-3 w-3 mr-1" />
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            {request.status === 'manager_approved' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => onPaymentAction(request, 'approve')}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  اعتماد
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => onPaymentAction(request, 'reject')}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  رفض
                                </Button>
                              </>
                            )}
                            {request.status === 'accounting_approved' && (
                              <Button
                                size="sm"
                                onClick={() => onPaymentAction(request, 'pay')}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                <DollarSign className="h-4 w-4 mr-1" />
                                دفع
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onSelectRequest(request)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  );
};

// New Request Dialog
export const NewRequestDialog = ({ 
  open, 
  onOpenChange, 
  formData, 
  setFormData, 
  categories, 
  onSubmit, 
  systemSettings 
}: any) => {
  const maxAmount = parseInt(systemSettings.max_expense_amount || '10000');
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5" />
            طلب نفقة جديد
          </DialogTitle>
          <DialogDescription>
            املأ التفاصيل أدناه لإرسال طلب نفقة جديد
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Category Selection */}
          <div className="space-y-2">
            <Label htmlFor="category">نوع النفقة *</Label>
            <Select value={formData.category_id} onValueChange={(value) => 
              setFormData((prev: any) => ({ ...prev, category_id: value }))
            }>
              <SelectTrigger>
                <SelectValue placeholder="اختر نوع النفقة" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category: any) => {
                  // Simple fallback for icon - could be enhanced with proper icon mapping
                  const IconComponent = ({ className }: { className?: string }) => <span className={className}>📄</span>; // Fallback icon
                  return (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="p-1 rounded"
                          style={{ 
                            backgroundColor: category.color + '20',
                            color: category.color 
                          }}
                        >
                          <IconComponent className="h-4 w-4" />
                        </div>
                        {category.name_ar}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">المبلغ (جنيه مصري) *</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              max={maxAmount}
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, amount: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              جميع المبالغ بالجنيه المصري. الحد الأقصى: {maxAmount.toLocaleString()} ج.م
            </p>
          </div>

          {/* Expense Date */}
          <div className="space-y-2">
            <Label>تاريخ النفقة *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.expense_date ? 
                    format(formData.expense_date, 'dd MMM yyyy', { locale: ar }) : 
                    'اختر التاريخ'
                  }
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.expense_date}
                  onSelect={(date) => date && setFormData((prev: any) => ({ ...prev, expense_date: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <div className="space-y-2">
              <Label htmlFor="expense_time">الوقت</Label>
              <Input
                id="expense_time"
                type="time"
                value={formData.expense_time}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, expense_time: e.target.value }))}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">وصف النفقة</Label>
            <Input
              id="description"
              placeholder="وصف مختصر للنفقة"
              value={formData.description}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, description: e.target.value }))}
            />
          </div>

          {/* Receipt upload */}
          <div className="space-y-2">
            <Label htmlFor="receipt_file">إيصال / مرفق (اختياري)</Label>
            <Input
              id="receipt_file"
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => {
                const file = (e.target as HTMLInputElement).files?.[0] || null;
                setFormData((prev: any) => ({ ...prev, receipt_file: file }));
              }}
            />
            <p className="text-xs text-muted-foreground">يدعم الصور و PDF. سيتم حفظ رابط المرفق مع الطلب.</p>
          </div>

          {/* Clinic & Doctor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clinic_name">اسم العيادة (إن وجد)</Label>
              <Input
                id="clinic_name"
                placeholder="اسم العيادة"
                value={formData.clinic_name}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, clinic_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doctor_name">اسم الدكتور (إن وجد)</Label>
              <Input
                id="doctor_name"
                placeholder="اسم الدكتور"
                value={formData.doctor_name}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, doctor_name: e.target.value }))}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">ملاحظات إضافية</Label>
            <Textarea
              id="notes"
              placeholder="أي ملاحظات أو تفاصيل إضافية..."
              value={formData.notes}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={onSubmit}>
            <PlusCircle className="h-4 w-4 mr-2" />
            إرسال الطلب
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// View Request Dialog
export const ViewRequestDialog = ({ 
  open, 
  onOpenChange, 
  request, 
  currentUser, 
  onApprovalAction,
  statusConfig,
  getIcon 
}: any) => {
  if (!request) return null;

  const IconComponent = getIcon(request.expense_categories?.icon || 'Receipt');
  const statusInfo = statusConfig[request.status];
  const canApprove = ['manager', 'admin', 'accounting'].includes(currentUser.role) && 
                    (request.status === 'pending' || 
                     (request.status === 'manager_approved' && currentUser.role === 'accounting'));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            تفاصيل طلب النفقة
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Header Info */}
          <div className="flex items-start justify-between p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-4">
              <div 
                className="p-4 rounded-xl"
                style={{ 
                  backgroundColor: request.expense_categories?.color + '30',
                  color: request.expense_categories?.color 
                }}
              >
                <IconComponent className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-blue-900 mb-1">
                  {request.expense_categories?.name_ar}
                </h3>
                <p className="text-blue-700">
                  طلب بواسطة: {request.users?.full_name}
                </p>
                <p className="text-sm text-blue-600">
                  تاريخ الطلب: {format(new Date(request.request_date), 'dd MMMM yyyy', { locale: ar })}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-green-600 mb-2">
                {request.amount.toLocaleString()} ج.م
              </p>
              <Badge className={`${statusInfo.color} border text-sm px-3 py-1`}>
                <statusInfo.icon className="h-4 w-4 mr-1" />
                {statusInfo.label}
              </Badge>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">تفاصيل النفقة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm text-muted-foreground">تاريخ النفقة</Label>
                  <p className="font-medium">
                    {format(new Date(request.expense_date), 'dd MMMM yyyy', { locale: ar })}
                  </p>
                </div>
                {request.description && (
                  <div>
                    <Label className="text-sm text-muted-foreground">الوصف</Label>
                    <p className="font-medium">{request.description}</p>
                  </div>
                )}
                {request.notes && (
                  <div>
                    <Label className="text-sm text-muted-foreground">الملاحظات</Label>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm">{request.notes}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">حالة الموافقات</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Manager Approval */}
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    request.status === 'pending' ? 'bg-yellow-100' :
                    request.status.includes('manager_approved') ? 'bg-green-100' :
                    request.status.includes('manager_rejected') ? 'bg-red-100' : 'bg-gray-100'
                  }`}>
                    {request.status === 'pending' ? (
                      <Clock className="h-4 w-4 text-yellow-600" />
                    ) : request.status.includes('manager_approved') ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : request.status.includes('manager_rejected') ? (
                      <XCircle className="h-4 w-4 text-red-600" />
                    ) : (
                      <Clock className="h-4 w-4 text-gray-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">موافقة المدير</p>
                    <p className="text-sm text-muted-foreground">
                      {request.manager_approval_date ? 
                        format(new Date(request.manager_approval_date), 'dd MMM yyyy', { locale: ar }) : 
                        'في انتظار الموافقة'
                      }
                    </p>
                  </div>
                </div>

                {/* Accounting Approval */}
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    ['pending', 'manager_approved'].includes(request.status) ? 'bg-gray-100' :
                    request.status.includes('accounting_approved') || request.status === 'paid' ? 'bg-green-100' :
                    request.status.includes('accounting_rejected') ? 'bg-red-100' : 'bg-gray-100'
                  }`}>
                    {['pending', 'manager_approved'].includes(request.status) ? (
                      <Clock className="h-4 w-4 text-gray-600" />
                    ) : request.status.includes('accounting_approved') || request.status === 'paid' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : request.status.includes('accounting_rejected') ? (
                      <XCircle className="h-4 w-4 text-red-600" />
                    ) : (
                      <Clock className="h-4 w-4 text-gray-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">موافقة المحاسبة</p>
                    <p className="text-sm text-muted-foreground">
                      {request.accounting_approval_date ? 
                        format(new Date(request.accounting_approval_date), 'dd MMM yyyy', { locale: ar }) : 
                        'في انتظار الموافقة'
                      }
                    </p>
                  </div>
                </div>

                {/* Payment Status */}
                {request.status === 'paid' && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-blue-100">
                      <DollarSign className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">تم الدفع</p>
                      <p className="text-sm text-muted-foreground">
                        {request.payment_date ? 
                          format(new Date(request.payment_date), 'dd MMM yyyy', { locale: ar }) : 
                          'غير محدد'
                        }
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Approval Notes */}
          {(request.manager_approval_notes || request.accounting_approval_notes) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">ملاحظات الموافقات</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {request.manager_approval_notes && (
                  <div>
                    <Label className="text-sm text-muted-foreground">ملاحظات المدير</Label>
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm">{request.manager_approval_notes}</p>
                    </div>
                  </div>
                )}
                {request.accounting_approval_notes && (
                  <div>
                    <Label className="text-sm text-muted-foreground">ملاحظات المحاسبة</Label>
                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <p className="text-sm">{request.accounting_approval_notes}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إغلاق
          </Button>
          <Button variant="outline">
            <Printer className="h-4 w-4 mr-2" />
            طباعة
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            تصدير PDF
          </Button>
          {canApprove && request.status === 'pending' && (
            <div className="flex gap-2">
              <Button
                onClick={() => onApprovalAction(request, 'approve')}
                className="bg-green-600 hover:bg-green-700"
              >
                <ThumbsUp className="h-4 w-4 mr-2" />
                موافقة
              </Button>
              <Button
                onClick={() => onApprovalAction(request, 'reject')}
                variant="destructive"
              >
                <ThumbsDown className="h-4 w-4 mr-2" />
                رفض
              </Button>
            </div>
          )}
          {canApprove && request.status === 'manager_approved' && currentUser.role === 'accounting' && (
            <div className="flex gap-2">
              <Button
                onClick={() => onApprovalAction(request, 'approve')}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                اعتماد للدفع
              </Button>
              <Button
                onClick={() => onApprovalAction(request, 'reject')}
                variant="destructive"
              >
                <XCircle className="h-4 w-4 mr-2" />
                رفض
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Approval Action Dialog
export const ApprovalActionDialog = ({ 
  open, 
  onOpenChange, 
  request, 
  action, 
  onConfirm 
}: any) => {
  const [notes, setNotes] = useState('');
  const isApproval = action === 'approve';
  
  const handleConfirm = () => {
    onConfirm(action, notes);
    setNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isApproval ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            {isApproval ? 'تأكيد الموافقة' : 'تأكيد الرفض'}
          </DialogTitle>
          <DialogDescription>
            {isApproval 
              ? `هل أنت متأكد من الموافقة على طلب النفقة بمبلغ ${request?.amount?.toLocaleString()} ج.م؟`
              : `هل أنت متأكد من رفض طلب النفقة بمبلغ ${request?.amount?.toLocaleString()} ج.م؟`
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notes">
              {isApproval ? 'ملاحظات الموافقة (اختيارية)' : 'سبب الرفض *'}
            </Label>
            <Textarea
              id="notes"
              placeholder={isApproval ? 'أي ملاحظات على الموافقة...' : 'يرجى توضيح سبب الرفض...'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button 
            onClick={handleConfirm}
            className={isApproval ? 'bg-green-600 hover:bg-green-700' : ''}
            variant={isApproval ? 'default' : 'destructive'}
            disabled={!isApproval && !notes.trim()}
          >
            {isApproval ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                تأكيد الموافقة
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-2" />
                تأكيد الرفض
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};