'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  Plus,
  Trash2,
  Upload,
  X,
  Calendar,
  Clock,
  MapPin,
  Receipt,
  FileImage,
  AlertCircle,
  Save,
  Send,
  Calculator,
  Tag
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import {
  ExpenseCategory,
  CreateExpenseRequestForm,
  CreateExpenseItemForm,
  ExpensePriority
} from '@/types/accounts';
import { expenseService } from '@/lib/accounts/expenses';
import { useDataProvider } from '@/lib/data-provider';

// مكون إضافة بند مصروف
const ExpenseItemForm: React.FC<{
  item: CreateExpenseItemForm;
  categories: ExpenseCategory[];
  onChange: (item: CreateExpenseItemForm) => void;
  onRemove: () => void;
  index: number;
}> = ({ item, categories, onChange, onRemove, index }) => {
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | null>(null);

  useEffect(() => {
    if (item.category_id) {
      const category = categories.find(c => c.id === item.category_id);
      setSelectedCategory(category || null);
    }
  }, [item.category_id, categories]);

  const handleCategoryChange = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    setSelectedCategory(category || null);
    onChange({ ...item, category_id: categoryId });
  };

  const calculateAmount = () => {
    if (item.quantity && item.unit_price) {
      const calculatedAmount = item.quantity * item.unit_price;
      onChange({ ...item, amount: calculatedAmount });
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">البند #{index + 1}</h3>
        <button
          onClick={onRemove}
          className="text-red-600 hover:text-red-800"
          type="button"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* فئة المصروف */}
        <div className="md:col-span-2 lg:col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            فئة المصروف <span className="text-red-500">*</span>
          </label>
          <select
            value={item.category_id}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="">اختر الفئة</option>
            {categories.filter(c => c.is_active).map(category => (
              <option key={category.id} value={category.id}>
                {category.category_name}
              </option>
            ))}
          </select>
          {selectedCategory?.max_amount && (
            <p className="text-xs text-gray-500 mt-1">
              الحد الأقصى: {selectedCategory.max_amount.toLocaleString()} ر.س
            </p>
          )}
        </div>

        {/* تاريخ المصروف */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            تاريخ المصروف <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={item.expense_date}
            onChange={(e) => onChange({ ...item, expense_date: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        {/* وقت المصروف */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">وقت المصروف</label>
          <div className="flex gap-2">
            <input
              type="time"
              value={item.expense_time || ''}
              onChange={(e) => onChange({ ...item, expense_time: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const hh = String(now.getHours()).padStart(2, '0');
                const mm = String(now.getMinutes()).padStart(2, '0');
                onChange({ ...item, expense_time: `${hh}:${mm}` });
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              title="الآن"
            >
              <Clock className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          وصف المصروف <span className="text-red-500">*</span>
        </label>
        <textarea
          value={item.item_description}
          onChange={(e) => onChange({ ...item, item_description: e.target.value })}
          placeholder="اكتب وصف تفصيلي للمصروف..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows={3}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {/* الكمية */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">الكمية</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={item.quantity || 1}
            onChange={(e) => onChange({ ...item, quantity: parseFloat(e.target.value) || 1 })}
            onBlur={calculateAmount}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* سعر الوحدة */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">سعر الوحدة (ر.س)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={item.unit_price || ''}
            onChange={(e) => onChange({ ...item, unit_price: parseFloat(e.target.value) || 0 })}
            onBlur={calculateAmount}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* المبلغ الإجمالي */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            المبلغ الإجمالي (ر.س) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              min="0"
              value={item.amount}
              onChange={(e) => onChange({ ...item, amount: parseFloat(e.target.value) || 0 })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 pl-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <button
              type="button"
              onClick={calculateAmount}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              title="حساب المبلغ تلقائياً"
            >
              <Calculator className="h-4 w-4" />
            </button>
          </div>
          {selectedCategory?.max_amount && item.amount > selectedCategory.max_amount && (
            <p className="text-xs text-red-500 mt-1 flex items-center">
              <AlertCircle className="h-3 w-3 ml-1" />
              المبلغ يتجاوز الحد الأقصى المسموح
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {/* الموقع */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">الموقع</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={item.location || ''}
              onChange={(e) => onChange({ ...item, location: e.target.value })}
              placeholder="مكان حدوث المصروف"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="button"
              onClick={async () => {
                try {
                  const { locationService } = await import('@/lib/location-service');
                  const data = await locationService.getCurrentLocation();
                  if (data) {
                    const { latitude, longitude } = data;
                    const formatted = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                    onChange({ ...item, location: formatted });
                    try { (window as any)?.alert?.('تم تحديد الموقع'); } catch (_) { /* noop */ }
                  }
                } catch (_) {
                  // ignore
                }
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              title="استخدام موقعي الحالي"
            >
              <MapPin className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* رقم الإيصال */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">رقم الإيصال</label>
          <input
            type="text"
            value={item.receipt_number || ''}
            onChange={(e) => onChange({ ...item, receipt_number: e.target.value })}
            placeholder="رقم الإيصال أو الفاتورة"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">ملاحظات إضافية</label>
        <textarea
          value={item.notes || ''}
          onChange={(e) => onChange({ ...item, notes: e.target.value })}
          placeholder="أي ملاحظات أو تفاصيل إضافية..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows={2}
        />
      </div>

      {/* العلامات */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">العلامات</label>
        <input
          type="text"
          value={item.tags?.join(', ') || ''}
          onChange={(e) => {
            const tags = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
            onChange({ ...item, tags });
          }}
          placeholder="أدخل العلامات مفصولة بفاصلة"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">مثال: تنقل، اجتماع، عميل</p>
      </div>

      {/* تحذيرات */}
      {selectedCategory?.requires_receipt && !item.receipt_number && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 ml-2 flex-shrink-0" />
          <div className="text-sm text-yellow-700">
            <strong>تنبيه:</strong> هذه الفئة تتطلب إيصال. يرجى إدخال رقم الإيصال وتحميل صورة له.
          </div>
        </div>
      )}
    </div>
  );
};

// النموذج الرئيسي
const NewExpenseRequestPage: React.FC = () => {
  const { currentUser } = useDataProvider();
  const { toast } = useToast();
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [formData, setFormData] = useState<CreateExpenseRequestForm>({
    employee_name: '',
    department: '',
    team: '',
    region: '',
    line_number: '',
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    priority: 'normal',
    items: [{
      category_id: '',
      item_description: '',
      amount: 0,
      quantity: 1,
      expense_date: format(new Date(), 'yyyy-MM-dd'),
      tags: []
    }]
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // تحميل فئات المصروفات
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoriesData = await expenseService.categories.getCategories({ is_active: true });
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error loading expense categories:', error);
      }
    };

    loadCategories();
  }, []);

  // التحقق من صحة النموذج
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.employee_name.trim()) {
      newErrors.employee_name = 'اسم الموظف مطلوب';
    }

    if (!formData.expense_date) {
      newErrors.expense_date = 'تاريخ المصروف مطلوب';
    }

    if (formData.items.length === 0) {
      newErrors.items = 'يجب إضافة بند واحد على الأقل';
    }

    formData.items.forEach((item, index) => {
      if (!item.category_id) {
        newErrors[`item_${index}_category`] = `فئة المصروف مطلوبة للبند ${index + 1}`;
      }
      if (!item.item_description.trim()) {
        newErrors[`item_${index}_description`] = `وصف المصروف مطلوب للبند ${index + 1}`;
      }
      if (!item.amount || item.amount <= 0) {
        newErrors[`item_${index}_amount`] = `المبلغ مطلوب للبند ${index + 1}`;
      }

      // التحقق من الحد الأقصى
      const category = categories.find(c => c.id === item.category_id);
      if (category?.max_amount && item.amount > category.max_amount) {
        newErrors[`item_${index}_max`] = `المبلغ يتجاوز الحد الأقصى المسموح (${category.max_amount.toLocaleString()} ر.س)`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // إضافة بند جديد
  const addNewItem = () => {
    const newItem: CreateExpenseItemForm = {
      category_id: '',
      item_description: '',
      amount: 0,
      quantity: 1,
      expense_date: formData.expense_date,
      tags: []
    };
    
    setFormData({
      ...formData,
      items: [...formData.items, newItem]
    });
  };

  // حذف بند
  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index);
      setFormData({ ...formData, items: newItems });
    }
  };

  // تحديث بند
  const updateItem = (index: number, updatedItem: CreateExpenseItemForm) => {
    const newItems = [...formData.items];
    newItems[index] = updatedItem;
    setFormData({ ...formData, items: newItems });
  };

  // حساب إجمالي المبلغ
  const getTotalAmount = (): number => {
    return formData.items.reduce((total, item) => total + (item.amount || 0), 0);
  };

  // حفظ كمسودة
  const handleSaveAsDraft = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      // هنا سيتم حفظ الطلب كمسودة
      console.log('Saving as draft:', formData);
      toast({ title: 'تم الحفظ', description: 'تم حفظ الطلب كمسودة بنجاح' });
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({ variant: 'destructive', title: 'خطأ', description: 'حدث خطأ أثناء حفظ المسودة' });
    } finally {
      setSaving(false);
    }
  };

  // تقديم للموافقة
  const handleSubmitForApproval = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const employeeId = currentUser?.id || '';
      const result = await expenseService.requests.createRequest(formData, employeeId);
      if (result.success && result.request) {
        await expenseService.requests.submitRequest(result.request.id);
        toast({ title: 'تم الإرسال', description: 'تم تقديم الطلب للموافقة بنجاح' });
      } else {
        throw new Error(result.error || 'فشل في إنشاء الطلب');
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      toast({ variant: 'destructive', title: 'خطأ', description: 'حدث خطأ أثناء تقديم الطلب' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 rtl">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* العنوان الرئيسي */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">طلب مصروفات جديد</h1>
          <p className="mt-2 text-gray-600">املأ النموذج أدناه لتقديم طلب مصروفات جديد</p>
        </div>

        <form className="space-y-8">
          {/* معلومات أساسية */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">المعلومات الأساسية</h2>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    اسم الموظف <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.employee_name}
                    onChange={(e) => setFormData({ ...formData, employee_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  {errors.employee_name && (
                    <p className="text-red-500 text-xs mt-1">{errors.employee_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">القسم</label>
                  <input
                    type="text"
                    value={formData.department || ''}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الفريق</label>
                  <input
                    type="text"
                    value={formData.team || ''}
                    onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">المنطقة</label>
                  <input
                    type="text"
                    value={formData.region || ''}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">رقم الخط</label>
                  <input
                    type="text"
                    value={formData.line_number || ''}
                    onChange={(e) => setFormData({ ...formData, line_number: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    تاريخ المصروف <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  {errors.expense_date && (
                    <p className="text-red-500 text-xs mt-1">{errors.expense_date}</p>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">الأولوية</label>
                <select
                  value={formData.priority || 'normal'}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as ExpensePriority })}
                  className="w-full md:w-1/2 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="low">منخفضة</option>
                  <option value="normal">عادية</option>
                  <option value="high">مرتفعة</option>
                  <option value="urgent">عاجلة</option>
                </select>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">وصف الطلب</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="وصف عام لطلب المصروفات..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* بنود المصروفات */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">بنود المصروفات</h2>
                <button
                  type="button"
                  onClick={addNewItem}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة بند
                </button>
              </div>
              {errors.items && (
                <p className="text-red-500 text-sm mt-2">{errors.items}</p>
              )}
            </div>
            
            <div className="p-6">
              {formData.items.map((item, index) => (
                <ExpenseItemForm
                  key={index}
                  item={item}
                  categories={categories}
                  onChange={(updatedItem) => updateItem(index, updatedItem)}
                  onRemove={() => removeItem(index)}
                  index={index}
                />
              ))}

              {/* إجمالي المبلغ */}
              <div className="bg-gray-50 rounded-lg p-4 mt-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-gray-900">إجمالي المبلغ:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {getTotalAmount().toLocaleString()} ر.س
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  عدد البنود: {formData.items.length}
                </p>
              </div>
            </div>
          </div>

          {/* أزرار الإجراءات */}
          <div className="flex justify-end space-x-4 rtl:space-x-reverse">
            <button
              type="button"
              className="px-6 py-3 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
            >
              إلغاء
            </button>
            
            <button
              type="button"
              onClick={handleSaveAsDraft}
              disabled={saving}
              className="inline-flex items-center px-6 py-3 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <Save className="h-4 w-4 ml-2" />
              {saving ? 'جاري الحفظ...' : 'حفظ كمسودة'}
            </button>
            
            <button
              type="button"
              onClick={handleSubmitForApproval}
              disabled={loading}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4 ml-2" />
              {loading ? 'جاري التقديم...' : 'تقديم للموافقة'}
            </button>
          </div>
        </form>

        {/* رسائل التحذير */}
        {Object.keys(errors).length > 0 && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 ml-2 flex-shrink-0" />
              <div className="text-sm text-red-700">
                <strong>يرجى تصحيح الأخطاء التالية:</strong>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  {Object.values(errors).map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewExpenseRequestPage;