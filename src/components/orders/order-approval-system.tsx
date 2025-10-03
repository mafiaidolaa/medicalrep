"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, XCircle, Clock, MessageSquare, User, 
  Calendar, AlertTriangle, FileText, Send, Eye, 
  ArrowRight, Shield, UserCheck, DollarSign, 
  Building, MapPin, Package
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { 
  Order, OrderApproval, OrderHistory, UserRole,
  ORDER_STATUS_LABELS, OrderStatus 
} from '@/types/orders';
import { StatusBadge, ClinicInfo, OrderSummary } from './order-ui-components';

interface OrderApprovalSystemProps {
  order: Order;
  currentUser: {
    id: string;
    fullName: string;
    role: UserRole;
    permissions: string[];
  };
  onApprovalAction?: (orderId: string, action: 'approve' | 'reject', notes?: string) => Promise<void>;
  onStatusChange?: (orderId: string, newStatus: OrderStatus, notes?: string) => Promise<void>;
  className?: string;
}

export function OrderApprovalSystem({
  order,
  currentUser,
  onApprovalAction,
  onStatusChange,
  className
}: OrderApprovalSystemProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [statusChangeNotes, setStatusChangeNotes] = useState('');

  // Determine approval workflow
  const getApprovalWorkflow = (order: Order) => {
    const workflow: Array<{
      type: 'manager' | 'accountant' | 'admin';
      label: string;
      required: boolean;
      canApprove: boolean;
      status: 'pending' | 'approved' | 'rejected' | 'not_required';
    }> = [];

    // Manager approval (required for orders above certain amount or high priority)
    const requiresManagerApproval = order.finalTotal > 1000 || order.priority === 'high' || order.priority === 'urgent';
    const managerApproval = order.approvals.find(a => a.approverType === 'manager');
    
    workflow.push({
      type: 'manager',
      label: 'موافقة المدير',
      required: requiresManagerApproval,
      canApprove: currentUser.role === 'manager' || currentUser.role === 'admin',
      status: !requiresManagerApproval 
        ? 'not_required' 
        : managerApproval?.status || 'pending'
    });

    // Accountant approval (required for deferred payments or high amounts)
    const requiresAccountantApproval = order.paymentMethod === 'deferred' || order.finalTotal > 5000;
    const accountantApproval = order.approvals.find(a => a.approverType === 'accountant');
    
    workflow.push({
      type: 'accountant',
      label: 'موافقة المحاسب',
      required: requiresAccountantApproval,
      canApprove: currentUser.role === 'accountant' || currentUser.role === 'admin',
      status: !requiresAccountantApproval 
        ? 'not_required' 
        : accountantApproval?.status || 'pending'
    });

    return workflow;
  };

  const workflow = getApprovalWorkflow(order);

  // Check if user can perform actions
  const canApprove = (approverType: 'manager' | 'accountant') => {
    const workflowItem = workflow.find(w => w.type === approverType);
    if (!workflowItem?.required || !workflowItem.canApprove) return false;
    
    const existingApproval = order.approvals.find(a => a.approverType === approverType);
    return !existingApproval || existingApproval.status === 'pending';
  };

  const canChangeStatus = () => {
    // Admin can always change status
    if (currentUser.role === 'admin') return true;
    
    // Manager can change status for approved orders
    if (currentUser.role === 'manager' && order.isFullyApproved) return true;
    
    // Representative can cancel their own pending orders
    if (currentUser.role === 'medical_rep' && 
        order.representativeId === currentUser.id && 
        order.status === 'pending') return true;

    return false;
  };

  // Handle approval action
  const handleApprovalAction = async (action: 'approve' | 'reject', approverType: 'manager' | 'accountant') => {
    if (!approvalNotes.trim() && action === 'reject') {
      toast({
        title: "خطأ",
        description: "يرجى إضافة سبب الرفض",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      await onApprovalAction?.(order.id, action, approvalNotes);
      
      toast({
        title: action === 'approve' ? "تم الاعتماد" : "تم الرفض",
        description: `تم ${action === 'approve' ? 'اعتماد' : 'رفض'} الطلب بنجاح`,
        variant: action === 'approve' ? "default" : "destructive"
      });
      
      setApprovalNotes('');
    } catch (error) {
      console.error('Error processing approval:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء معالجة الطلب",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle status change
  const handleStatusChange = async (newStatus: OrderStatus) => {
    setIsProcessing(true);
    try {
      await onStatusChange?.(order.id, newStatus, statusChangeNotes);
      
      toast({
        title: "تم التحديث",
        description: `تم تغيير حالة الطلب إلى ${ORDER_STATUS_LABELS[newStatus]}`,
      });
      
      setStatusChangeNotes('');
    } catch (error) {
      console.error('Error changing status:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث حالة الطلب",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Get status icon and color
  const getStatusInfo = (status: 'pending' | 'approved' | 'rejected' | 'not_required') => {
    switch (status) {
      case 'approved':
        return { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-50' };
      case 'rejected':
        return { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-50' };
      case 'pending':
        return { icon: Clock, color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
      case 'not_required':
        return { icon: Shield, color: 'text-gray-400', bgColor: 'bg-gray-50' };
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            تفاصيل الطلب - {order.orderNumber}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{order.clinicName}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{order.clinicArea} - {order.clinicLine}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{order.representativeName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {new Date(order.orderDate).toLocaleDateString('ar-EG')}
                </span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{order.itemsCount} منتج</span>
              </div>
              <StatusBadge status={order.status} />
              <OrderSummary
                subtotal={order.subtotal}
                discountAmount={order.totalDiscountAmount}
                finalTotal={order.finalTotal}
                currency={order.currency}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Approval Workflow */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            سير عملية الاعتماد
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {workflow.map((step, index) => {
              const { icon: StatusIcon, color, bgColor } = getStatusInfo(step.status);
              const existingApproval = order.approvals.find(a => a.approverType === step.type);
              
              return (
                <div key={step.type}>
                  <div className={cn("flex items-center gap-4 p-4 rounded-lg", bgColor)}>
                    <div className="flex-shrink-0">
                      <StatusIcon className={cn("h-6 w-6", color)} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{step.label}</h4>
                          <p className="text-sm text-muted-foreground">
                            {step.required ? 'مطلوب' : 'غير مطلوب'}
                          </p>
                        </div>
                        
                        <div className="text-right">
                          {step.status === 'not_required' && (
                            <Badge variant="outline">غير مطلوب</Badge>
                          )}
                          {step.status === 'pending' && (
                            <Badge variant="secondary">في الانتظار</Badge>
                          )}
                          {step.status === 'approved' && (
                            <Badge variant="default" className="bg-green-600">معتمد</Badge>
                          )}
                          {step.status === 'rejected' && (
                            <Badge variant="destructive">مرفوض</Badge>
                          )}
                        </div>
                      </div>
                      
                      {existingApproval && (
                        <div className="mt-2 text-sm">
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3" />
                            <span>{existingApproval.approverName}</span>
                            {existingApproval.approvedAt && (
                              <>
                                <Calendar className="h-3 w-3 mr-1" />
                                <span>
                                  {new Date(existingApproval.approvedAt).toLocaleDateString('ar-EG')}
                                </span>
                              </>
                            )}
                          </div>
                          {existingApproval.notes && (
                            <div className="mt-1 p-2 bg-white/50 rounded text-xs">
                              <MessageSquare className="h-3 w-3 inline ml-1" />
                              {existingApproval.notes}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    {step.required && step.status === 'pending' && canApprove(step.type) && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-600 hover:bg-green-50"
                          onClick={() => handleApprovalAction('approve', step.type)}
                          disabled={isProcessing}
                        >
                          <CheckCircle className="h-3 w-3 ml-1" />
                          اعتماد
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-600 hover:bg-red-50"
                          onClick={() => handleApprovalAction('reject', step.type)}
                          disabled={isProcessing}
                        >
                          <XCircle className="h-3 w-3 ml-1" />
                          رفض
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {index < workflow.length - 1 && (
                    <div className="flex justify-center py-2">
                      <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Approval Notes */}
          {workflow.some(step => step.required && step.status === 'pending' && canApprove(step.type)) && (
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">ملاحظات الاعتماد</h4>
              <Textarea
                placeholder="أضف ملاحظات حول قرار الاعتماد (اختياري للموافقة، إجباري للرفض)"
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Management */}
      {canChangeStatus() && order.status !== 'cancelled' && order.status !== 'delivered' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              إدارة حالة الطلب
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {order.status === 'pending' && currentUser.role === 'medical_rep' && (
                <Button
                  variant="outline"
                  className="text-red-600 border-red-600"
                  onClick={() => handleStatusChange('cancelled')}
                  disabled={isProcessing}
                >
                  إلغاء الطلب
                </Button>
              )}
              
              {order.status === 'approved' && ['manager', 'admin'].includes(currentUser.role) && (
                <>
                  <Button
                    variant="outline"
                    className="text-blue-600 border-blue-600"
                    onClick={() => handleStatusChange('processing')}
                    disabled={isProcessing}
                  >
                    قيد التجهيز
                  </Button>
                  <Button
                    variant="outline"
                    className="text-red-600 border-red-600"
                    onClick={() => handleStatusChange('cancelled')}
                    disabled={isProcessing}
                  >
                    إلغاء
                  </Button>
                </>
              )}
              
              {order.status === 'processing' && ['manager', 'admin'].includes(currentUser.role) && (
                <Button
                  variant="outline"
                  className="text-purple-600 border-purple-600"
                  onClick={() => handleStatusChange('shipped')}
                  disabled={isProcessing}
                >
                  تم الشحن
                </Button>
              )}
              
              {order.status === 'shipped' && ['manager', 'admin'].includes(currentUser.role) && (
                <Button
                  variant="outline"
                  className="text-green-600 border-green-600"
                  onClick={() => handleStatusChange('delivered')}
                  disabled={isProcessing}
                >
                  تم التسليم
                </Button>
              )}
            </div>

            <div>
              <Textarea
                placeholder="ملاحظات حول تغيير الحالة (اختياري)"
                value={statusChangeNotes}
                onChange={(e) => setStatusChangeNotes(e.target.value)}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order History */}
      {order.history && order.history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              تاريخ الطلب
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {order.history.map((historyItem, index) => (
                <div key={historyItem.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {historyItem.changedByName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{historyItem.changedByName}</p>
                        <p className="text-xs text-muted-foreground">
                          {historyItem.previousStatus && (
                            <>
                              غيّر الحالة من {ORDER_STATUS_LABELS[historyItem.previousStatus]} إلى{' '}
                            </>
                          )}
                          {ORDER_STATUS_LABELS[historyItem.status]}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(historyItem.createdAt).toLocaleString('ar-EG')}
                      </div>
                    </div>
                    
                    {historyItem.notes && (
                      <p className="text-sm mt-1 p-2 bg-white/50 rounded">
                        {historyItem.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}