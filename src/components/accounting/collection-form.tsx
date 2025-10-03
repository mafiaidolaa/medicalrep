"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface CollectionFormProps {
  onClose: () => void;
  onSubmit: (data: any) => void;
}

interface Clinic {
  id: string;
  name: string;
  doctor_name: string;
}

export function CollectionForm({ onClose, onSubmit }: CollectionFormProps) {
  const [formData, setFormData] = useState({
    clinic_id: '',
    amount: '',
    collection_date: '',
    payment_method: 'cash',
    notes: ''
  });

  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingClinics, setIsLoadingClinics] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch clinics for selection
  useEffect(() => {
    const fetchClinics = async () => {
      try {
        const response = await fetch('/api/clinics');
        if (response.ok) {
          const clinicsData = await response.json();
          setClinics(clinicsData);
        }
      } catch (err) {
        console.error('Error fetching clinics:', err);
      } finally {
        setIsLoadingClinics(false);
      }
    };
    
    fetchClinics();
  }, []);

  const validateForm = () => {
    if (!formData.clinic_id) {
      return 'يجب اختيار عيادة';
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      return 'المبلغ يجب أن يكون أكبر من صفر';
    }
    if (!formData.collection_date) {
      return 'تاريخ التحصيل مطلوب';
    }
    if (!formData.payment_method) {
      return 'طريقة الدفع مطلوبة';
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
      const response = await fetch('/api/accounting/collections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'فشل في تسجيل التحصيل');
      }

      setSuccess(true);
      toast.success('تم تسجيل التحصيل بنجاح!');
      onSubmit(result);
      
      setTimeout(() => {
        onClose();
      }, 1500);
      
    } catch (err: any) {
      console.error('Error creating collection:', err);
      setError(err.message || 'حدث خطأ غير متوقع');
      toast.error('فشل في تسجيل التحصيل');
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
        <CardTitle>تسجيل تحصيل</CardTitle>
        <CardDescription>تسجيل مبلغ محصل من العميل</CardDescription>
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
                تم تسجيل التحصيل بنجاح! سيتم إغلاق النموذج قريباً...
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="clinic_id">العيادة</Label>
              {isLoadingClinics ? (
                <div className="flex items-center gap-2 p-2 border rounded">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">جاري تحميل العيادات...</span>
                </div>
              ) : (
                <Select value={formData.clinic_id} onValueChange={(value) => handleChange('clinic_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر العيادة" />
                  </SelectTrigger>
                  <SelectContent>
                    {clinics.map((clinic) => (
                      <SelectItem key={clinic.id} value={clinic.id}>
                        {clinic.name} - د. {clinic.doctor_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">المبلغ المحصل (ريال سعودي)</Label>
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

            <div className="space-y-2">
              <Label htmlFor="collection_date">تاريخ التحصيل</Label>
              <Input
                id="collection_date"
                type="date"
                value={formData.collection_date}
                onChange={(e) => handleChange('collection_date', e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_method">طريقة الدفع</Label>
              <Select value={formData.payment_method} onValueChange={(value) => handleChange('payment_method', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر طريقة الدفع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">نقداً</SelectItem>
                  <SelectItem value="check">شيك</SelectItem>
                  <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">ملاحظات</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="أي ملاحظات إضافية..."
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
                'تسجيل التحصيل'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}