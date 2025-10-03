"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle, ShoppingCart, User, CreditCard, FileText, Percent, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Order, OrderItem, Product, Clinic } from '@/lib/types';
import { ClinicSelector } from './clinic-selector';
import { EnhancedProductSelector } from './enhanced-product-selector';
import { useToast } from '@/hooks/use-toast';

interface NewOrderFormProps {
  currentUser?: any;
  allClinics: Clinic[];
  products: Product[];
  orders?: any[];
  collections?: any[];
  onSubmit?: (order: Partial<Order>) => Promise<void>;
  onCancel?: () => void;
  className?: string;
}

interface OrderFormData {
  clinicId: string;
  selectedClinic?: Clinic;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  discountAmount: number;
  total: number;
  paymentMethod: 'cash' | 'bank_transfer' | 'deferred';
  dueDate?: string;
  notes: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedDeliveryDate?: string;
}

const initialFormData: OrderFormData = {
  clinicId: '',
  selectedClinic: undefined,
  items: [],
  subtotal: 0,
  discount: 0,
  discountAmount: 0,
  total: 0,
  paymentMethod: 'cash',
  dueDate: '',
  notes: '',
  priority: 'medium',
  estimatedDeliveryDate: ''
};

export function NewOrderForm({
  currentUser,
  allClinics,
  products,
  orders = [],
  collections = [],
  onSubmit,
  onCancel,
  className
}: NewOrderFormProps) {
  const [formData, setFormData] = useState<OrderFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  // Auto-calculate delivery date (7 days from now for deferred payments)
  useEffect(() => {
    if (formData.paymentMethod === 'deferred') {
      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + 7);
      setFormData(prev => ({
        ...prev,
        estimatedDeliveryDate: deliveryDate.toISOString().split('T')[0]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        estimatedDeliveryDate: ''
      }));
    }
  }, [formData.paymentMethod]);

  // Auto-set due date for deferred payments
  useEffect(() => {
    if (formData.paymentMethod === 'deferred' && formData.selectedClinic?.paymentTermsDays) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + formData.selectedClinic.paymentTermsDays);
      setFormData(prev => ({
        ...prev,
        dueDate: dueDate.toISOString().split('T')[0]
      }));
    } else if (formData.paymentMethod !== 'deferred') {
      setFormData(prev => ({
        ...prev,
        dueDate: ''
      }));
    }
  }, [formData.paymentMethod, formData.selectedClinic]);

  // Update form when clinic changes
  const handleClinicChange = (clinicId: string, clinic?: Clinic) => {
    setFormData(prev => ({
      ...prev,
      clinicId,
      selectedClinic: clinic
    }));
    
    if (errors.clinicId) {
      setErrors(prev => ({ ...prev, clinicId: '' }));
    }
  };

  // Update form when products change
  const handleProductsChange = (items: OrderItem[], totals: { subtotal: number; totalDiscount: number; total: number }) => {
    const finalTotal = totals.total * (1 - (formData.discount / 100));
    const orderDiscount = totals.total * (formData.discount / 100);
    
    setFormData(prev => ({
      ...prev,
      items,
      subtotal: totals.subtotal,
      discountAmount: totals.totalDiscount + orderDiscount,
      total: finalTotal
    }));

    if (errors.items) {
      setErrors(prev => ({ ...prev, items: '' }));
    }
  };

  // Update order-level discount
  const handleOrderDiscountChange = (discount: number) => {
    const clampedDiscount = Math.max(0, Math.min(100, discount));
    const itemsTotal = formData.subtotal - formData.items.reduce((sum, item) => {
      const itemSubtotal = (item.unitPrice || item.price) * item.quantity;
      return sum + (itemSubtotal * ((item.discount || 0) / 100));
    }, 0);
    
    const orderDiscountAmount = itemsTotal * (clampedDiscount / 100);
    const finalTotal = itemsTotal - orderDiscountAmount;
    
    setFormData(prev => ({
      ...prev,
      discount: clampedDiscount,
      total: finalTotal,
      discountAmount: prev.items.reduce((sum, item) => {
        const itemSubtotal = (item.unitPrice || item.price) * item.quantity;
        return sum + (itemSubtotal * ((item.discount || 0) / 100));
      }, 0) + orderDiscountAmount
    }));
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.clinicId) {
      newErrors.clinicId = 'يرجى اختيار العيادة';
    }

    if (formData.items.length === 0) {
      newErrors.items = 'يرجى إضافة منتجات للطلب';
    }

    if (formData.paymentMethod === 'deferred' && !formData.dueDate) {
      newErrors.dueDate = 'يرجى تحديد تاريخ الاستحقاق للدفع الآجل';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "خطأ في البيانات",
        description: "يرجى التحقق من البيانات المدخلة وإصلاح الأخطاء",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const orderData: Partial<Order> = {
        clinicId: formData.clinicId,
        clinicName: formData.selectedClinic?.name || '',
        representativeId: currentUser?.id || '',
        representativeName: currentUser?.fullName || '',
        orderDate: new Date().toISOString(),
        items: formData.items,
        subtotal: formData.subtotal,
        discount: formData.discount,
        discountAmount: formData.discountAmount,
        total: formData.total,
        totalAmount: formData.total,
        paymentMethod: formData.paymentMethod,
        paymentStatus: 'unpaid',
        dueDate: formData.dueDate || undefined,
        notes: formData.notes || undefined,
        priority: formData.priority,
        estimatedDeliveryDate: formData.estimatedDeliveryDate || undefined,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await onSubmit?.(orderData);
      
      toast({
        title: "تم إنشاء الطلب بنجاح",
        description: "سيتم مراجعة الطلب من قِبل قسم المحاسبة",
      });

      // Reset form
      setFormData(initialFormData);
      
    } catch (error) {
      console.error('Error submitting order:', error);
      toast({
        title: "فشل في إنشاء الطلب",
        description: "حدث خطأ أثناء إنشاء الطلب، يرجى المحاولة مرة أخرى",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check credit limits
  const creditWarning = useMemo(() => {
    if (!formData.selectedClinic?.creditLimit || formData.total === 0) return null;
    
    const clinicOrders = orders.filter(o => o.clinicId === formData.clinicId);
    const clinicCollections = collections.filter(c => c.clinicId === formData.clinicId);
    const currentDebt = clinicOrders.reduce((s, o) => s + (o.totalAmount ?? o.total ?? 0), 0) - 
                      clinicCollections.reduce((s, c) => s + c.amount, 0);
    
    const projectedDebt = Math.max(0, currentDebt + formData.total);
    const utilization = (projectedDebt / formData.selectedClinic.creditLimit) * 100;
    
    if (utilization >= 100) {
      return {
        type: 'error',
        message: `سيتجاوز هذا الطلب الحد الائتماني (${projectedDebt.toFixed(0)} من ${formData.selectedClinic.creditLimit.toFixed(0)} ج.م)`
      };
    } else if (utilization >= 80) {
      return {
        type: 'warning',
        message: `تحذير: سيصل الاستخدام إلى ${utilization.toFixed(0)}% من الحد الائتماني`
      };
    }
    
    return null;
  }, [formData.selectedClinic, formData.total, formData.clinicId, orders, collections]);

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-6", className)}>
      {/* Order Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            طلب جديد
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Clinic Selection */}
          <div>
            <Label className="text-base font-medium mb-3 block">
              <User className="h-4 w-4 inline ml-2" />
              العيادة
            </Label>
            <ClinicSelector
              value={formData.clinicId}
              onChange={handleClinicChange}
              currentUser={currentUser}
              allClinics={allClinics}
              orders={orders}
              collections={collections}
              showDetails={true}
            />
            {errors.clinicId && (
              <p className="text-sm text-red-600 mt-1">{errors.clinicId}</p>
            )}
          </div>

          {/* Representative Info (Read-only) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground">المندوب</Label>
              <Input
                value={currentUser?.fullName || 'غير محدد'}
                disabled
                className="bg-muted"
              />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">تاريخ الطلب</Label>
              <Input
                value={new Date().toLocaleDateString('ar-EG')}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          {/* Credit Warning */}
          {creditWarning && (
            <Alert variant={creditWarning.type === 'error' ? 'destructive' : 'default'}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{creditWarning.message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Products Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            المنتجات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EnhancedProductSelector
            products={products}
            value={formData.items}
            onChange={handleProductsChange}
          />
          {errors.items && (
            <p className="text-sm text-red-600 mt-2">{errors.items}</p>
          )}
        </CardContent>
      </Card>

      {/* Order Details */}
      {formData.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              تفاصيل الطلب
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Order Discount */}
            <div>
              <Label htmlFor="order-discount">
                <Percent className="h-4 w-4 inline ml-2" />
                خصم إضافي على الطلب (%)
              </Label>
              <Input
                id="order-discount"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.discount}
                onChange={(e) => handleOrderDiscountChange(parseFloat(e.target.value) || 0)}
                className="mt-1"
              />
            </div>

            {/* Payment Method */}
            <div>
              <Label>طريقة الدفع</Label>
              <Select 
                value={formData.paymentMethod} 
                onValueChange={(value: 'cash' | 'bank_transfer' | 'deferred') => 
                  setFormData(prev => ({ ...prev, paymentMethod: value }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">نقداً</SelectItem>
                  <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                  <SelectItem value="deferred">آجل</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Due Date (for deferred payment) */}
            {formData.paymentMethod === 'deferred' && (
              <div>
                <Label htmlFor="due-date">
                  <Calendar className="h-4 w-4 inline ml-2" />
                  تاريخ الاستحقاق
                </Label>
                <Input
                  id="due-date"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="mt-1"
                />
                {errors.dueDate && (
                  <p className="text-sm text-red-600 mt-1">{errors.dueDate}</p>
                )}
              </div>
            )}

            {/* Priority */}
            <div>
              <Label>أولوية الطلب</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') => 
                  setFormData(prev => ({ ...prev, priority: value }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">منخفضة</SelectItem>
                  <SelectItem value="medium">متوسطة</SelectItem>
                  <SelectItem value="high">عالية</SelectItem>
                  <SelectItem value="urgent">عاجلة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Estimated Delivery Date */}
            {formData.estimatedDeliveryDate && (
              <div>
                <Label htmlFor="delivery-date">تاريخ التسليم المتوقع</Label>
                <Input
                  id="delivery-date"
                  type="date"
                  value={formData.estimatedDeliveryDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimatedDeliveryDate: e.target.value }))}
                  className="mt-1"
                />
              </div>
            )}

            {/* Notes */}
            <div>
              <Label htmlFor="notes">ملاحظات الطلب</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="ملاحظات إضافية على الطلب..."
                className="mt-1"
                rows={3}
              />
            </div>

            {/* Order Summary */}
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>المجموع الفرعي:</span>
                <span>{formData.subtotal.toFixed(2)} ج.م</span>
              </div>
              
              {formData.discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>إجمالي الخصم:</span>
                  <span>-{formData.discountAmount.toFixed(2)} ج.م</span>
                </div>
              )}
              
              <Separator />
              
              <div className="flex justify-between text-xl font-bold">
                <span>الإجمالي النهائي:</span>
                <span className="text-primary">{formData.total.toFixed(2)} ج.م</span>
              </div>

              <div className="flex justify-between text-sm text-muted-foreground">
                <span>طريقة الدفع:</span>
                <Badge>
                  {formData.paymentMethod === 'cash' ? 'نقداً' : 
                   formData.paymentMethod === 'bank_transfer' ? 'تحويل بنكي' : 'آجل'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          إلغاء
        </Button>
        <Button 
          type="submit" 
          disabled={isSubmitting || formData.items.length === 0 || (creditWarning?.type === 'error')}
          className="min-w-[120px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
              جاري الإرسال...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 ml-2" />
              إرسال الطلب
            </>
          )}
        </Button>
      </div>
    </form>
  );
}