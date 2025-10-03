"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ExpenseFormProps {
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export function ExpenseForm({ onClose, onSubmit }: ExpenseFormProps) {
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'office',
    expense_date: '',
    status: 'pending',
    notes: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validateForm = () => {
    if (!formData.description.trim()) {
      return 'وصف النفقة مطلوب';
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      return 'المبلغ يجب أن يكون أكبر من صفر';
    }
    if (!formData.expense_date) {
      return 'تاريخ النفقة مطلوب';
    }
    if (!formData.category) {
      return 'فئة النفقة مطلوبة';
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
      const response = await fetch('/api/accounting/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'فشل في إنشاء النفقة');
      }

      setSuccess(true);
      toast.success('تم تسجيل النفقة بنجاح!');
      onSubmit(result);
      
      setTimeout(() => {
        onClose();
      }, 1500);
      
    } catch (err: any) {
      console.error('Error creating expense:', err);
      setError(err.message || 'حدث خطأ غير متوقع');
      toast.error('فشل في تسجيل النفقة');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto" dir="rtl">
      <CardHeader>
        <CardTitle>نفقة جديدة</CardTitle>
        <CardDescription>تسجيل مصروف أو نفقة جديدة</CardDescription>
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
                تم تسجيل النفقة بنجاح! سيتم إغلاق النموذج قريباً...
              </AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="description">وصف النفقة</Label>
              <Input
                id="description"
                type="text"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="مثال: مصاريف مكتبية، وقود..."
                disabled={isLoading}
                required
              />
            </div>

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
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">فئة النفقة</Label>
              <Select value={formData.category} onValueChange={(value) => handleChange('category', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر فئة النفقة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="office">مكتبية</SelectItem>
                  <SelectItem value="transport">مواصلات</SelectItem>
                  <SelectItem value="utilities">خدمات</SelectItem>
                  <SelectItem value="marketing">تسويق</SelectItem>
                  <SelectItem value="maintenance">صيانة</SelectItem>
                  <SelectItem value="supplies">لوازم</SelectItem>
                  <SelectItem value="other">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense_date">تاريخ النفقة</Label>
              <Input
                id="expense_date"
                type="date"
                value={formData.expense_date}
                onChange={(e) => handleChange('expense_date', e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">حالة الموافقة</Label>
              <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر حالة النفقة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">في الانتظار</SelectItem>
                  <SelectItem value="approved">موافق عليها</SelectItem>
                  <SelectItem value="rejected">مرفوضة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">ملاحظات إضافية</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="أي تفاصيل إضافية حول النفقة..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isLoading}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                'حفظ النفقة'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}