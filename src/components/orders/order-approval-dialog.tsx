"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, Calculator } from 'lucide-react';
import type { Order } from '@/lib/types';

interface OrderApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onOrderApproved?: () => void;
}

export function OrderApprovalDialog({ 
  open, 
  onOpenChange, 
  order, 
  onOrderApproved 
}: OrderApprovalDialogProps) {
  const [discount, setDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const { toast } = useToast();

  if (!order) return null;

  const calculateDiscountAmount = () => {
    if (discount <= 0) return 0;
    if (discountType === 'percentage') {
      return (order.totalAmount * discount) / 100;
    }
    return discount;
  };

  const discountAmount = calculateDiscountAmount();
  const finalAmount = Math.max(0, order.totalAmount - discountAmount);

  const handleApprove = async () => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/orders/${order.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflowStep: 'user_approve',
          discount,
          discountType,
          notes,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: 'تم اعتماد الطلب بنجاح',
          description: `تم إنشاء فاتورة مؤقتة رقم ${data.data.invoice_number} بقيمة ${data.data.final_amount} ج.م.`,
        });
        
        // Reset form
        setDiscount(0);
        setDiscountType('fixed');
        setNotes('');
        onOpenChange(false);
        onOrderApproved?.();
      } else {
        throw new Error(data.error || 'فشل في اعتماد الطلب');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'خطأ في اعتماد الطلب',
        description: error.message || 'حدث خطأ غير متوقع',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setDiscount(0);
      setDiscountType('fixed');
      setNotes('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            اعتماد الطلب
          </DialogTitle>
          <DialogDescription>
            اعتماد الطلب وإنشاء فاتورة مؤقتة لقسم الحسابات
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order Summary */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">المبلغ الأصلي:</span>
              <span className="font-medium">{order.totalAmount.toFixed(2)} ج.م.</span>
            </div>
            
            {discountAmount > 0 && (
              <div className="flex justify-between items-center text-sm text-red-600 mt-1">
                <span>الخصم ({discount}{discountType === 'percentage' ? '%' : ' ج.م.'}):</span>
                <span>-{discountAmount.toFixed(2)} ج.م.</span>
              </div>
            )}
            
            <div className="flex justify-between items-center text-base font-bold mt-2 pt-2 border-t">
              <span>المبلغ النهائي:</span>
              <span className="text-green-600">{finalAmount.toFixed(2)} ج.م.</span>
            </div>
          </div>

          {/* Discount Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">خصم (اختياري)</Label>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">نوع الخصم</Label>
                <Select value={discountType} onValueChange={(v: 'fixed' | 'percentage') => setDiscountType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">مبلغ ثابت (ج.م.)</SelectItem>
                    <SelectItem value="percentage">نسبة مئوية (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-xs text-muted-foreground">قيمة الخصم</Label>
                <Input
                  type="number"
                  min="0"
                  max={discountType === 'percentage' ? "100" : order.totalAmount.toString()}
                  step={discountType === 'percentage' ? "0.1" : "1"}
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
                  placeholder={discountType === 'percentage' ? "0.0" : "0"}
                />
              </div>
            </div>

            {discount > 0 && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Calculator className="h-4 w-4" />
                <span>
                  خصم {discountAmount.toFixed(2)} ج.م. من إجمالي {order.totalAmount.toFixed(2)} ج.م.
                </span>
              </div>
            )}
          </div>

          {/* Notes Section */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">ملاحظات (اختياري)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي ملاحظات إضافية حول الطلب أو الخصم..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleApprove}
            disabled={isSubmitting}
            className="min-w-[120px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                جاري الاعتماد...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                اعتماد الطلب
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}