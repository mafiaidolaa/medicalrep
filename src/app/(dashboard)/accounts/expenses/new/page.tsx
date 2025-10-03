'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  Calendar,
  Clock,
  DollarSign,
  FileText,
  MapPin,
  User,
  Building,
  Tag,
  Plus,
  Minus,
  Save,
  ArrowLeft,
  Upload,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';

import {
  CreateExpenseRequestForm,
  CreateExpenseItemForm,
  ExpenseCategory,
  ExpensePriority
} from '@/types/accounts';
import { expenseService } from '@/lib/accounts/expenses';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';

interface ExpenseFormData extends Omit<CreateExpenseRequestForm, 'items'> {
  items: ExpenseItemForm[];
}

interface ExpenseItemForm extends CreateExpenseItemForm {
  tempId: string;
}

const NewExpenseRequestPage: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [formData, setFormData] = useState<ExpenseFormData>({
    employee_name: '',
    department: '',
    team: '',
    region: '',
    line_number: '',
    manager_id: '',
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    priority: 'normal',
    items: [{
      tempId: 'item-1',
      category_id: '',
      item_description: '',
      amount: 0,
      quantity: 1,
      expense_date: format(new Date(), 'yyyy-MM-dd'),
      expense_time: '',
      location: '',
      receipt_number: '',
      notes: '',
      tags: []
    }]
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  // تحميل فئات المصروفات
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoriesList = await expenseService.categories.getCategories();
        setCategories(categoriesList);
      } catch (error) {
        console.error('Error loading expense categories:', error);
      }
    };

    loadCategories();
  }, []);

  // تحديث بيانات النموذج
  const updateFormData = (field: keyof Omit<ExpenseFormData, 'items'>, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // إزالة الخطأ عند التعديل
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // إضافة بند جديد
  const addExpenseItem = () => {
    const newItem: ExpenseItemForm = {
      tempId: `item-${Date.now()}`,
      category_id: '',
      item_description: '',
      amount: 0,
      quantity: 1,
      expense_date: formData.expense_date,
      expense_time: '',
      location: '',
      receipt_number: '',
      notes: '',
      tags: []
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  // حذف بند
  const removeExpenseItem = (tempId: string) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter(item => item.tempId !== tempId)
      }));
    }
  };

  // تحديث بند المصروف
  const updateExpenseItem = (tempId: string, field: keyof ExpenseItemForm, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.tempId === tempId 
          ? { ...item, [field]: value }
          : item
      )
    }));
  };

  // حساب المجموع الكلي
  const getTotalAmount = () => {
    return formData.items.reduce((sum, item) => sum + (item.amount * (item.quantity || 1)), 0);
  };

  // التحقق من صحة البيانات
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // التحقق من البيانات الأساسية
    if (!(formData.employee_name || '').trim()) {
      newErrors.employee_name = 'اسم الموظف مطلوب';
    }

    if (!(formData.department || '').trim()) {
      newErrors.department = 'القسم مطلوب';
    }

    if (!formData.expense_date) {
      newErrors.expense_date = 'تاريخ المصروف مطلوب';
    }

    // التحقق من البنود
    formData.items.forEach((item, index) => {
      if (!item.category_id) {
        newErrors[`item_${index}_category`] = 'فئة المصروف مطلوبة';
      }
      
      if (!(item.item_description || '').trim()) {
        newErrors[`item_${index}_description`] = 'وصف المصروف مطلوب';
      }
      
      if (!item.amount || item.amount <= 0) {
        newErrors[`item_${index}_amount`] = 'مبلغ المصروف يجب أن يكون أكبر من صفر';
      }
      
      if (!item.quantity || item.quantity <= 0) {
        newErrors[`item_${index}_quantity`] = 'الكمية يجب أن تكون أكبر من صفر';
      }
    });

    if (formData.items.length === 0) {
      newErrors.items = 'يجب إضافة بند واحد على الأقل';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // تقديم الطلب
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      setSubmitStatus('error');
      return;
    }

    try {
      setSubmitStatus('submitting');
      setLoading(true);

      // تحويل البيانات للصيغة المطلوبة
      const requestData: CreateExpenseRequestForm = {
        employee_name: formData.employee_name,
        department: formData.department,
        team: formData.team,
        region: formData.region,
        line_number: formData.line_number,
        manager_id: formData.manager_id,
        expense_date: formData.expense_date,
        description: formData.description,
        priority: formData.priority,
        items: formData.items.map(({ tempId, ...item }) => item)
      };

      const result = await expenseService.requests.createRequest(requestData);

      if (result.success && result.request) {
        setSubmitStatus('success');
        
        // إعادة التوجيه بعد ثانيتين
        setTimeout(() => {
          router.push('/accounts/expenses');
        }, 2000);
      } else {
        console.error('Error creating expense request:', result.error || 'خطأ غير معروف');
        setSubmitStatus('error');
      }

    } catch (error) {
      console.error('Error submitting expense request:', error);
      setSubmitStatus('error');
    } finally {
      setLoading(false);
    }
  };

  // رسالة حالة التقديم
  const renderSubmitStatus = () => {
    switch (submitStatus) {
      case 'submitting':
        return (
          <div className="fixed top-4 right-4 bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded-lg shadow-md">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 ml-2"></div>
              جاري تقديم الطلب...
            </div>
          </div>
        );
      
      case 'success':
        return (
          <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-md">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 ml-2" />
              تم تقديم طلب المصروفات بنجاح! سيتم إعادة توجيهك...
            </div>
          </div>
        );
      
      case 'error':
        return (
          <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-md">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 ml-2" />
              حدث خطأ أثناء تقديم الطلب. يرجى المحاولة مرة أخرى.
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 rtl">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs 
          items={[
            { label: 'الحسابات', href: '/accounting' },
            { label: 'إدارة المصروفات', href: '/accounts/expenses' },
            { label: 'طلب مصروف جديد' }
          ]} 
        />

        {/* العنوان الرئيسي */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">طلب مصروف جديد</h1>
              <p className="mt-2 text-gray-600">املأ النموذج أدناه لتقديم طلب مصروف جديد</p>
            </div>
            <button
              onClick={() => router.back()}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4 ml-2" />
              العودة
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* بيانات الموظف */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">بيانات الموظف</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    اسم الموظف *
                  </label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      required
                      className={`w-full pl-4 pr-10 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.employee_name ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="أدخل اسم الموظف"
                      value={formData.employee_name}
                      onChange={(e) => updateFormData('employee_name', e.target.value)}
                    />
                  </div>
                  {errors.employee_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.employee_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    القسم *
                  </label>
                  <div className="relative">
                    <Building className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      required
                      className={`w-full pl-4 pr-10 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.department ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="أدخل اسم القسم"
                      value={formData.department}
                      onChange={(e) => updateFormData('department', e.target.value)}
                    />
                  </div>
                  {errors.department && (
                    <p className="mt-1 text-sm text-red-600">{errors.department}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الفريق
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="أدخل اسم الفريق (اختياري)"
                    value={formData.team}
                    onChange={(e) => updateFormData('team', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    المنطقة
                  </label>
                  <div className="relative">
                    <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      className="w-full pl-4 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="أدخل اسم المنطقة"
                      value={formData.region}
                      onChange={(e) => updateFormData('region', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    رقم الخط
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="رقم الخط (إن وجد)"
                    value={formData.line_number}
                    onChange={(e) => updateFormData('line_number', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    تاريخ المصروف *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="date"
                      required
                      className={`w-full pl-4 pr-10 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.expense_date ? 'border-red-300' : 'border-gray-300'
                      }`}
                      value={formData.expense_date}
                      onChange={(e) => updateFormData('expense_date', e.target.value)}
                    />
                  </div>
                  {errors.expense_date && (
                    <p className="mt-1 text-sm text-red-600">{errors.expense_date}</p>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الأولوية
                </label>
                <select
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.priority}
                  onChange={(e) => updateFormData('priority', e.target.value as ExpensePriority)}
                >
                  <option value="low">منخفضة</option>
                  <option value="normal">عادية</option>
                  <option value="high">مرتفعة</option>
                  <option value="urgent">عاجلة</option>
                </select>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  وصف الطلب
                </label>
                <textarea
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="وصف عام لطلب المصروفات (اختياري)"
                  value={formData.description}
                  onChange={(e) => updateFormData('description', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* بنود المصروفات */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">بنود المصروفات</h3>
                <button
                  type="button"
                  onClick={addExpenseItem}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة بند
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {formData.items.map((item, index) => (
                <div key={item.tempId} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-md font-medium text-gray-900">بند المصروف #{index + 1}</h4>
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeExpenseItem(item.tempId)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        فئة المصروف *
                      </label>
                      <select
                        required
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors[`item_${index}_category`] ? 'border-red-300' : 'border-gray-300'
                        }`}
                        value={item.category_id}
                        onChange={(e) => updateExpenseItem(item.tempId, 'category_id', e.target.value)}
                      >
                        <option value="">اختر فئة المصروف</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.category_name}
                          </option>
                        ))}
                      </select>
                      {errors[`item_${index}_category`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`item_${index}_category`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        وصف المصروف *
                      </label>
                      <input
                        type="text"
                        required
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors[`item_${index}_description`] ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="وصف تفصيلي للمصروف"
                        value={item.item_description}
                        onChange={(e) => updateExpenseItem(item.tempId, 'item_description', e.target.value)}
                      />
                      {errors[`item_${index}_description`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`item_${index}_description`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        المبلغ (ر.س) *
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.01"
                          className={`w-full pl-4 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            errors[`item_${index}_amount`] ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder="0.00"
                          value={item.amount}
                          onChange={(e) => updateExpenseItem(item.tempId, 'amount', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      {errors[`item_${index}_amount`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`item_${index}_amount`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الكمية *
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors[`item_${index}_quantity`] ? 'border-red-300' : 'border-gray-300'
                        }`}
                        value={item.quantity}
                        onChange={(e) => updateExpenseItem(item.tempId, 'quantity', parseInt(e.target.value) || 1)}
                      />
                      {errors[`item_${index}_quantity`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`item_${index}_quantity`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الوقت
                      </label>
                      <div className="relative">
                        <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <input
                          type="time"
                          className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          value={item.expense_time}
                          onChange={(e) => updateExpenseItem(item.tempId, 'expense_time', e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الموقع
                      </label>
                      <div className="relative">
                        <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <input
                          type="text"
                          className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="موقع حدوث المصروف"
                          value={item.location}
                          onChange={(e) => updateExpenseItem(item.tempId, 'location', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ملاحظات
                      </label>
                      <textarea
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="ملاحظات إضافية (اختياري)"
                        value={item.notes}
                        onChange={(e) => updateExpenseItem(item.tempId, 'notes', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">إجمالي هذا البند:</span>
                      <span className="font-medium text-gray-900">
                        {(item.amount * (item.quantity || 1)).toLocaleString()} ر.س
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {errors.items && (
                <p className="text-sm text-red-600">{errors.items}</p>
              )}
            </div>
          </div>

          {/* الملخص والإجراءات */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">ملخص الطلب</h3>
                <div className="text-right">
                  <div className="text-sm text-gray-600">إجمالي عدد البنود: {formData.items.length}</div>
                  <div className="text-xl font-bold text-gray-900">
                    المجموع الكلي: {getTotalAmount().toLocaleString()} ر.س
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 sm:justify-end">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  disabled={loading}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading || submitStatus === 'submitting'}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                      جاري التقديم...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 ml-2" />
                      تقديم الطلب
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* رسائل الحالة */}
        {renderSubmitStatus()}
      </div>
    </div>
  );
};

export default NewExpenseRequestPage;