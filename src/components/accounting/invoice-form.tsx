"use client";

import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { AreaLineSelector } from '@/components/selectors/area-line-selector';
import { ProductSelector, type SelectedProduct } from '@/components/selectors/product-selector';
import { useDataProvider } from '@/lib/data-provider';
import { openPrintWindowForElement } from '@/lib/print-utils';

interface InvoiceFormProps {
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export function InvoiceForm({ onClose, onSubmit }: InvoiceFormProps) {
  const { currentUser } = useDataProvider();
  const printRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    client_name: '',
    representative_name: '',
    amount: '',
    invoice_date: '',
    due_date: '',
    description: '',
    status: 'pending',
    area: '',
    line: '',
    products: [] as SelectedProduct[],
    total_amount: 0
  });

  useEffect(() => {
    if (currentUser?.fullName) {
      setFormData(prev => ({ ...prev, representative_name: prev.representative_name || currentUser.fullName }));
    }
  }, [currentUser]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validateForm = () => {
    if (!formData.client_name.trim()) {
      return 'اسم العميل مطلوب';
    }
    if (formData.products.length === 0 && (!formData.amount || parseFloat(formData.amount) <= 0)) {
      return 'يجب إضافة منتجات أو تحديد مبلغ الفاتورة';
    }
    if (!formData.invoice_date) {
      return 'تاريخ الفاتورة مطلوب';
    }
    if (!formData.due_date) {
      return 'تاريخ الاستحقاق مطلوب';
    }
    if (new Date(formData.due_date) < new Date(formData.invoice_date)) {
      return 'تاريخ الاستحقاق يجب أن يكون بعد تاريخ الفاتورة';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/accounting/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          amount: formData.total_amount > 0 ? formData.total_amount.toString() : formData.amount,
          products: formData.products.map(p => ({
            id: p.id,
            name: p.name,
            quantity: p.selectedQuantity,
            price: p.price,
            total: p.totalPrice
          }))
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'فشل في إنشاء الفاتورة');
      }

      setSuccess(true);
      toast.success('تم إنشاء الفاتورة بنجاح!');
      onSubmit(result);
      
      // Close form after a brief delay
      setTimeout(() => {
        onClose();
      }, 1500);
      
    } catch (err: any) {
      console.error('Error creating invoice:', err);
      setError(err.message || 'حدث خطأ غير متوقع');
      toast.error('فشل في إنشاء الفاتورة');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null); // Clear error when user starts typing
  };

  return (
    <Card className="w-full max-w-2xl mx-auto" dir="rtl">
      <CardHeader>
        <CardTitle>فاتورة جديدة</CardTitle>
        <CardDescription>إنشاء فاتورة جديدة للعميل</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                تم إنشاء الفاتورة بنجاح! سيتم إغلاق النموذج قريباً...
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-6" ref={printRef}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="client_name">اسم العميل</Label>
                <Input
                  id="client_name"
                  type="text"
                  value={formData.client_name}
                  onChange={(e) => handleChange('client_name', e.target.value)}
                  placeholder="ادخل اسم العميل"
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="representative_name">اسم المندوب</Label>
                <Input
                  id="representative_name"
                  type="text"
                  value={formData.representative_name}
                  onChange={(e) => handleChange('representative_name', e.target.value)}
                  placeholder="ادخل اسم المندوب"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">حالة الفاتورة</Label>
                <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر حالة الفاتورة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">في الانتظار</SelectItem>
                    <SelectItem value="paid">مدفوعة</SelectItem>
                    <SelectItem value="overdue">متأخرة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Area and Line Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>المنطقة والخط</Label>
                <AreaLineSelector
                  value={{ area: formData.area, line: formData.line }}
                  onChange={(selection) => {
                    setFormData(prev => ({ 
                      ...prev, 
                      area: selection.area || '',
                      line: selection.line || ''
                    }));
                  }}
                  placeholder="اختر المنطقة والخط (اختياري)"
                  allowEmpty={true}
                  mode="both"
                />
              </div>
            </div>

            {/* Product Selection */}
            <div className="space-y-2">
              <Label>المنتجات</Label>
              <ProductSelector
                value={{
                  products: formData.products,
                  totalAmount: formData.total_amount
                }}
                onChange={(selection) => {
                  setFormData(prev => ({
                    ...prev,
                    products: selection.products,
                    total_amount: selection.totalAmount
                  }));
                }}
                placeholder="اختر المنتجات (اختياري)"
                allowEmpty={true}
                mode="multiple"
                showQuantity={true}
                showPricing={true}
              />
            </div>

            {/* Manual Amount (if no products selected) */}
            {formData.products.length === 0 && (
              <div className="space-y-2">
<Label htmlFor="amount">المبلغ (جنيه مصري)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => handleChange('amount', e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  disabled={isLoading}
                  required
                />
              </div>
            )}

            {/* Total Display */}
            {(formData.products.length > 0 || formData.total_amount > 0) && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">إجمالي الفاتورة:</span>
                  <span className="text-xl font-bold text-primary">
{(formData.total_amount || parseFloat(formData.amount) || 0).toFixed(2)} ج.م
                  </span>
                </div>
                {formData.products.length > 0 && (
                  <div className="text-sm text-muted-foreground mt-1">
                    {formData.products.length} منتج محدد
                  </div>
                )}
              </div>
            )}


            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="invoice_date">تاريخ الفاتورة</Label>
                <Input
                  id="invoice_date"
                  type="date"
                  value={formData.invoice_date}
                  onChange={(e) => handleChange('invoice_date', e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_date">تاريخ الاستحقاق</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => handleChange('due_date', e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">وصف الفاتورة</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="تفاصيل الفاتورة والخدمات المقدمة..."
              rows={3}
            />
          </div>

          <div className="flex justify-between items-center gap-3 pt-6">
            <div className="text-xs text-muted-foreground">
              وقت الإنشاء: {new Date().toLocaleString('ar-EG')}
            </div>
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={isLoading}
              >
                إلغاء
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => printRef.current && openPrintWindowForElement(printRef.current, 'invoice')}
              >
                معاينة/طباعة
              </Button>
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                'إنشاء الفاتورة'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}