'use client';

/**
 * 🏢 EP Group System - Professional Expense Request Form Component
 * مكون نموذج طلب النفقة الاحترافي
 * 
 * يوفر هذا المكون واجهة حديثة ومتجاوبة لإضافة وتحرير طلبات النفقات مع:
 * - تصميم احترافي ومتجاوب
 * - التحقق من صحة البيانات
 * - رفع المرفقات
 * - اختيار الفئات والموردين
 * - حفظ تلقائي
 * - معاينة مباشرة
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlusCircle, 
  Save, 
  Send, 
  Upload, 
  X, 
  Calendar, 
  MapPin, 
  User, 
  Building2,
  Receipt,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileText,
  Camera
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';

import { ExpenseRequest, ExpenseCategory } from '@/lib/services/expense-management-service';
import { getExpenseCategories, createExpenseRequest } from '@/lib/services/expense-management-service';
import { getExpenseSettings } from '@/lib/site-settings';

// ===== مخطط التحقق من البيانات =====
const expenseRequestSchema = z.object({
  title: z.string().min(3, 'يجب أن يكون عنوان الطلب 3 أحرف على الأقل').max(200, 'العنوان طويل جداً'),
  description: z.string().optional(),
  amount: z.number().min(1, 'يجب أن يكون المبلغ أكبر من صفر'),
  currency: z.string().default('SAR'),
  category_id: z.string().min(1, 'يجب اختيار فئة النفقة'),
  expense_date: z.string().min(1, 'يجب تحديد تاريخ النفقة'),
  location: z.string().optional(),
  vendor_name: z.string().optional(),
  vendor_details: z.any().optional(),
  department: z.string().optional(),
  cost_center: z.string().optional(),
  project_code: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

type ExpenseRequestFormData = z.infer<typeof expenseRequestSchema>;

// ===== أنواع البيانات =====
interface ExpenseRequestFormProps {
  existingRequest?: ExpenseRequest;
  onSubmit?: (request: ExpenseRequest) => void;
  onCancel?: () => void;
  mode?: 'create' | 'edit' | 'view';
}

interface FileAttachment {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  preview?: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
}

// ===== المكون الرئيسي =====
export default function ExpenseRequestForm({ 
  existingRequest, 
  onSubmit, 
  onCancel, 
  mode = 'create' 
}: ExpenseRequestFormProps) {
  // ===== الحالات =====
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [autoSave, setAutoSave] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [previewMode, setPreviewMode] = useState(false);

  // ===== نموذج النموذج =====
  const {
    control,
    handleSubmit,
    formState: { errors, isValid, dirtyFields },
    watch,
    setValue,
    getValues,
    reset
  } = useForm<ExpenseRequestFormData>({
    resolver: zodResolver(expenseRequestSchema),
    defaultValues: {
      title: existingRequest?.title || '',
      description: existingRequest?.description || '',
      amount: existingRequest?.amount || 0,
      currency: existingRequest?.currency || 'SAR',
      category_id: existingRequest?.category_id || '',
      expense_date: existingRequest?.expense_date || new Date().toISOString().split('T')[0],
      location: existingRequest?.location || '',
      vendor_name: existingRequest?.vendor_name || '',
      department: existingRequest?.department || '',
      cost_center: existingRequest?.cost_center || '',
      project_code: existingRequest?.project_code || '',
      priority: existingRequest?.priority || 'normal',
      notes: existingRequest?.notes || '',
      tags: existingRequest?.tags || []
    },
    mode: 'onChange'
  });

  const watchedValues = watch();

  // ===== تحميل البيانات الأولية =====
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const [categoriesData, settingsData] = await Promise.all([
          getExpenseCategories(),
          getExpenseSettings()
        ]);
        
        setCategories(categoriesData);
        setSettings(settingsData);
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // ===== الحفظ التلقائي =====
  const autoSaveCallback = useCallback(async () => {
    if (!autoSave || mode === 'view') return;
    
    const formData = getValues();
    const draftKey = `expense_draft_${existingRequest?.id || 'new'}`;
    
    try {
      localStorage.setItem(draftKey, JSON.stringify({
        ...formData,
        timestamp: new Date().toISOString(),
        attachments: attachments.map(a => ({ id: a.id, name: a.name, size: a.size, type: a.type }))
      }));
      console.log('💾 Draft saved automatically');
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  }, [autoSave, existingRequest?.id, getValues, attachments, mode]);

  useEffect(() => {
    if (autoSave) {
      const interval = setInterval(autoSaveCallback, 30000); // حفظ كل 30 ثانية
      return () => clearInterval(interval);
    }
  }, [autoSave, autoSaveCallback]);

  // ===== معالجة رفع الملفات =====
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    files.forEach((file) => {
      const attachment: FileAttachment = {
        id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'pending',
        progress: 0
      };

      // إنشاء معاينة للصور
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          attachment.preview = e.target?.result as string;
          setAttachments(prev => prev.map(a => a.id === attachment.id ? attachment : a));
        };
        reader.readAsDataURL(file);
      }

      setAttachments(prev => [...prev, attachment]);
      
      // محاكاة رفع الملف
      simulateFileUpload(attachment.id);
    });

    // مسح قيمة input لإتاحة اختيار نفس الملف مرة أخرى
    event.target.value = '';
  }, []);

  const simulateFileUpload = async (attachmentId: string) => {
    setAttachments(prev => prev.map(a => 
      a.id === attachmentId ? { ...a, status: 'uploading' } : a
    ));

    // محاكاة تقدم الرفع
    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      setAttachments(prev => prev.map(a => 
        a.id === attachmentId ? { ...a, progress } : a
      ));
    }

    setAttachments(prev => prev.map(a => 
      a.id === attachmentId ? { ...a, status: 'completed', progress: 100 } : a
    ));
  };

  const removeAttachment = (attachmentId: string) => {
    setAttachments(prev => prev.filter(a => a.id !== attachmentId));
  };

  // ===== معالجة تقديم النموذج =====
  const onFormSubmit = async (data: ExpenseRequestFormData) => {
    if (mode === 'view') return;

    setSubmitLoading(true);
    try {
      // التحقق من المرفقات المطلوبة
      if (settings.require_receipt && attachments.filter(a => a.status === 'completed').length === 0) {
        throw new Error('يجب إرفاق فاتورة أو إيصال');
      }

      // إعداد بيانات الطلب
      const requestData: Partial<ExpenseRequest> = {
        ...data,
        user_id: 'current-user-id', // يجب الحصول عليه من الجلسة
        receipt_files: attachments
          .filter(a => a.status === 'completed')
          .map(a => ({
            id: a.id,
            filename: a.name,
            original_name: a.name,
            file_type: a.type,
            file_size: a.size,
            file_path: `/uploads/${a.id}`, // مسار مؤقت
            uploaded_at: new Date().toISOString(),
            uploaded_by: 'current-user-id'
          })),
        supporting_documents: [],
        approval_documents: [],
        metadata: {
          form_version: '1.0',
          created_from: 'web_form'
        }
      };

      let result: ExpenseRequest | null;
      
      if (existingRequest && mode === 'edit') {
        // تحديث طلب موجود
        result = null; // TODO: تنفيذ updateExpenseRequest
        console.log('Updating existing request:', requestData);
      } else {
        // إنشاء طلب جديد
        result = await createExpenseRequest(requestData);
      }

      if (result) {
        // مسح المسودة المحفوظة
        const draftKey = `expense_draft_${existingRequest?.id || 'new'}`;
        localStorage.removeItem(draftKey);
        
        onSubmit?.(result);
        
        if (mode === 'create') {
          reset();
          setAttachments([]);
          setCurrentStep(1);
        }
      } else {
        throw new Error('فشل في إنشاء الطلب');
      }
    } catch (error) {
      console.error('Error submitting expense request:', error);
      // TODO: عرض رسالة خطأ للمستخدم
    } finally {
      setSubmitLoading(false);
    }
  };

  // ===== معالجة إضافة العلامات =====
  const addTag = (tag: string) => {
    if (tag.trim() && !watchedValues.tags?.includes(tag.trim())) {
      setValue('tags', [...(watchedValues.tags || []), tag.trim()]);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setValue('tags', watchedValues.tags?.filter(tag => tag !== tagToRemove) || []);
  };

  // ===== التحقق من صحة المبلغ =====
  const validateAmount = (amount: number) => {
    if (amount > settings.max_expense_amount) {
      return `المبلغ يتجاوز الحد الأقصى المسموح: ${settings.max_expense_amount} ريال`;
    }
    return true;
  };

  // ===== حساب التكلفة الإجمالية =====
  const getTotalCost = () => {
    const amount = watchedValues.amount || 0;
    const taxRate = 0.15; // ضريبة القيمة المضافة
    const tax = amount * taxRate;
    return { amount, tax, total: amount + tax };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* الشريط العلوي */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {mode === 'create' && 'طلب نفقة جديد'}
            {mode === 'edit' && `تحرير طلب النفقة ${existingRequest?.request_number}`}
            {mode === 'view' && `عرض طلب النفقة ${existingRequest?.request_number}`}
          </h1>
          <p className="text-gray-600 mt-1">
            {mode === 'create' && 'املأ النموذج التالي لإنشاء طلب نفقة جديد'}
            {mode === 'edit' && 'قم بتعديل بيانات طلب النفقة'}
            {mode === 'view' && 'تفاصيل طلب النفقة'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {mode !== 'view' && (
            <div className="flex items-center gap-2">
              <Switch
                id="auto-save"
                checked={autoSave}
                onCheckedChange={setAutoSave}
              />
              <Label htmlFor="auto-save" className="text-sm">حفظ تلقائي</Label>
            </div>
          )}
          
          <Button
            variant="outline"
            onClick={() => setPreviewMode(!previewMode)}
          >
            {previewMode ? 'تحرير' : 'معاينة'}
          </Button>
        </div>
      </div>

      {/* مؤشر التقدم */}
      {mode === 'create' && (
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">خطوة {currentStep} من 3</span>
            <span className="text-sm text-gray-500">{Math.round((currentStep / 3) * 100)}% مكتمل</span>
          </div>
          <Progress value={(currentStep / 3) * 100} className="h-2" />
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>البيانات الأساسية</span>
            <span>التفاصيل والمرفقات</span>
            <span>المراجعة والتأكيد</span>
          </div>
        </div>
      )}

      {/* النموذج الرئيسي */}
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        <Tabs value={`step-${currentStep}`} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="step-1" onClick={() => setCurrentStep(1)}>
              البيانات الأساسية
            </TabsTrigger>
            <TabsTrigger value="step-2" onClick={() => setCurrentStep(2)}>
              التفاصيل والمرفقات
            </TabsTrigger>
            <TabsTrigger value="step-3" onClick={() => setCurrentStep(3)}>
              المراجعة والتأكيد
            </TabsTrigger>
          </TabsList>

          {/* الخطوة الأولى: البيانات الأساسية */}
          <TabsContent value="step-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  البيانات الأساسية للنفقة
                </CardTitle>
                <CardDescription>
                  املأ المعلومات الأساسية للنفقة المراد تقديمها
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* عنوان الطلب */}
                  <div className="md:col-span-2">
                    <Label htmlFor="title">عنوان الطلب *</Label>
                    <Controller
                      name="title"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          id="title"
                          placeholder="مثال: شراء أدوات مكتبية للقسم"
                          disabled={mode === 'view'}
                          className={errors.title ? 'border-red-500' : ''}
                        />
                      )}
                    />
                    {errors.title && (
                      <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>
                    )}
                  </div>

                  {/* فئة النفقة */}
                  <div>
                    <Label htmlFor="category_id">فئة النفقة *</Label>
                    <Controller
                      name="category_id"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange} disabled={mode === 'view'}>
                          <SelectTrigger className={errors.category_id ? 'border-red-500' : ''}>
                            <SelectValue placeholder="اختر فئة النفقة" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: category.color }}
                                  />
                                  {category.name_ar}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.category_id && (
                      <p className="text-sm text-red-600 mt-1">{errors.category_id.message}</p>
                    )}
                  </div>

                  {/* المبلغ */}
                  <div>
                    <Label htmlFor="amount">المبلغ (ريال سعودي) *</Label>
                    <Controller
                      name="amount"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          id="amount"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          disabled={mode === 'view'}
                          className={errors.amount ? 'border-red-500' : ''}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      )}
                    />
                    {errors.amount && (
                      <p className="text-sm text-red-600 mt-1">{errors.amount.message}</p>
                    )}
                    {watchedValues.amount && (
                      <div className="text-sm text-gray-600 mt-1">
                        التكلفة الإجمالية مع الضريبة: {getTotalCost().total.toFixed(2)} ريال
                      </div>
                    )}
                  </div>

                  {/* تاريخ النفقة */}
                  <div>
                    <Label htmlFor="expense_date">تاريخ النفقة *</Label>
                    <Controller
                      name="expense_date"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          id="expense_date"
                          type="date"
                          disabled={mode === 'view'}
                          className={errors.expense_date ? 'border-red-500' : ''}
                        />
                      )}
                    />
                    {errors.expense_date && (
                      <p className="text-sm text-red-600 mt-1">{errors.expense_date.message}</p>
                    )}
                  </div>

                  {/* الأولوية */}
                  <div>
                    <Label htmlFor="priority">الأولوية</Label>
                    <Controller
                      name="priority"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange} disabled={mode === 'view'}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">منخفضة</SelectItem>
                            <SelectItem value="normal">عادية</SelectItem>
                            <SelectItem value="high">عالية</SelectItem>
                            <SelectItem value="urgent">عاجلة</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>

                {/* الوصف */}
                <div>
                  <Label htmlFor="description">وصف النفقة</Label>
                  <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        id="description"
                        placeholder="وصف تفصيلي للنفقة وسبب الحاجة إليها..."
                        rows={4}
                        disabled={mode === 'view'}
                      />
                    )}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  disabled={!watchedValues.title || !watchedValues.category_id || !watchedValues.amount}
                >
                  التالي
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* الخطوة الثانية: التفاصيل والمرفقات */}
          <TabsContent value="step-2">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* التفاصيل الإضافية */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    التفاصيل الإضافية
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* المكان */}
                  <div>
                    <Label htmlFor="location">المكان</Label>
                    <Controller
                      name="location"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          id="location"
                          placeholder="مثال: الرياض، المملكة العربية السعودية"
                          disabled={mode === 'view'}
                        />
                      )}
                    />
                  </div>

                  {/* اسم المورد */}
                  <div>
                    <Label htmlFor="vendor_name">اسم المورد</Label>
                    <Controller
                      name="vendor_name"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          id="vendor_name"
                          placeholder="مثال: شركة الخدمات المتقدمة"
                          disabled={mode === 'view'}
                        />
                      )}
                    />
                  </div>

                  {/* القسم */}
                  <div>
                    <Label htmlFor="department">القسم</Label>
                    <Controller
                      name="department"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          id="department"
                          placeholder="مثال: قسم التسويق"
                          disabled={mode === 'view'}
                        />
                      )}
                    />
                  </div>

                  {/* مركز التكلفة */}
                  <div>
                    <Label htmlFor="cost_center">مركز التكلفة</Label>
                    <Controller
                      name="cost_center"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          id="cost_center"
                          placeholder="مثال: CC-MKT-001"
                          disabled={mode === 'view'}
                        />
                      )}
                    />
                  </div>

                  {/* رمز المشروع */}
                  <div>
                    <Label htmlFor="project_code">رمز المشروع</Label>
                    <Controller
                      name="project_code"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          id="project_code"
                          placeholder="مثال: PRJ-2024-001"
                          disabled={mode === 'view'}
                        />
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* المرفقات */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    المرفقات
                    {settings.require_receipt && <Badge variant="destructive">مطلوب</Badge>}
                  </CardTitle>
                  <CardDescription>
                    ارفق الفواتير والمستندات المطلوبة
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {mode !== 'view' && (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="file-upload"
                      />
                      <label
                        htmlFor="file-upload"
                        className="cursor-pointer flex flex-col items-center gap-2"
                      >
                        <Upload className="h-8 w-8 text-gray-400" />
                        <span className="text-sm font-medium">انقر لرفع الملفات</span>
                        <span className="text-xs text-gray-500">PDF, JPG, PNG, DOC (حد أقصى 5 ميجا)</span>
                      </label>
                    </div>
                  )}

                  {/* قائمة المرفقات */}
                  <div className="space-y-2">
                    {attachments.map((attachment) => (
                      <motion.div
                        key={attachment.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        {/* معاينة الملف */}
                        <div className="flex-shrink-0">
                          {attachment.preview ? (
                            <img 
                              src={attachment.preview} 
                              alt={attachment.name}
                              className="w-10 h-10 object-cover rounded"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-300 rounded flex items-center justify-center">
                              <FileText className="h-4 w-4" />
                            </div>
                          )}
                        </div>

                        {/* معلومات الملف */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{attachment.name}</div>
                          <div className="text-xs text-gray-500">
                            {(attachment.size / 1024 / 1024).toFixed(2)} ميجا
                          </div>
                          
                          {/* شريط التقدم */}
                          {attachment.status === 'uploading' && (
                            <Progress value={attachment.progress} className="h-1 mt-1" />
                          )}
                        </div>

                        {/* حالة الملف */}
                        <div className="flex-shrink-0">
                          {attachment.status === 'uploading' && (
                            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                          )}
                          {attachment.status === 'completed' && (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                          {attachment.status === 'error' && (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>

                        {/* إزالة المرفق */}
                        {mode !== 'view' && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAttachment(attachment.id)}
                            className="flex-shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </motion.div>
                    ))}
                  </div>

                  {/* رسالة تنبيهية للمرفقات المطلوبة */}
                  {settings.require_receipt && attachments.filter(a => a.status === 'completed').length === 0 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        يجب إرفاق فاتورة أو إيصال لهذا الطلب
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* العلامات والملاحظات */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>معلومات إضافية</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* العلامات */}
                <div>
                  <Label>العلامات</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {watchedValues.tags?.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="gap-1">
                        {tag}
                        {mode !== 'view' && (
                          <X 
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => removeTag(tag)}
                          />
                        )}
                      </Badge>
                    ))}
                  </div>
                  {mode !== 'view' && (
                    <Input
                      placeholder="اكتب علامة واضغط Enter"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag(e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                  )}
                </div>

                {/* الملاحظات */}
                <div>
                  <Label htmlFor="notes">ملاحظات إضافية</Label>
                  <Controller
                    name="notes"
                    control={control}
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        id="notes"
                        placeholder="أي ملاحظات أو تعليقات إضافية..."
                        rows={3}
                        disabled={mode === 'view'}
                      />
                    )}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                >
                  السابق
                </Button>
                <Button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                >
                  المراجعة
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* الخطوة الثالثة: المراجعة والتأكيد */}
          <TabsContent value="step-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  مراجعة وتأكيد الطلب
                </CardTitle>
                <CardDescription>
                  راجع جميع البيانات قبل تقديم الطلب
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* ملخص البيانات */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">معلومات أساسية</h4>
                    <div className="space-y-1 text-sm">
                      <div><strong>العنوان:</strong> {watchedValues.title}</div>
                      <div><strong>الفئة:</strong> {categories.find(c => c.id === watchedValues.category_id)?.name_ar}</div>
                      <div><strong>المبلغ:</strong> {watchedValues.amount} {watchedValues.currency}</div>
                      <div><strong>التاريخ:</strong> {watchedValues.expense_date}</div>
                      <div><strong>الأولوية:</strong> {
                        watchedValues.priority === 'low' ? 'منخفضة' :
                        watchedValues.priority === 'normal' ? 'عادية' :
                        watchedValues.priority === 'high' ? 'عالية' : 'عاجلة'
                      }</div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">التفاصيل الإضافية</h4>
                    <div className="space-y-1 text-sm">
                      <div><strong>المكان:</strong> {watchedValues.location || 'غير محدد'}</div>
                      <div><strong>المورد:</strong> {watchedValues.vendor_name || 'غير محدد'}</div>
                      <div><strong>القسم:</strong> {watchedValues.department || 'غير محدد'}</div>
                      <div><strong>مركز التكلفة:</strong> {watchedValues.cost_center || 'غير محدد'}</div>
                      <div><strong>المرفقات:</strong> {attachments.filter(a => a.status === 'completed').length} ملف</div>
                    </div>
                  </div>
                </div>

                {/* التكلفة الإجمالية */}
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">ملخص التكلفة</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">المبلغ الأساسي</div>
                      <div className="font-semibold">{getTotalCost().amount.toFixed(2)} ريال</div>
                    </div>
                    <div>
                      <div className="text-gray-600">ضريبة القيمة المضافة (15%)</div>
                      <div className="font-semibold">{getTotalCost().tax.toFixed(2)} ريال</div>
                    </div>
                    <div>
                      <div className="text-gray-600">الإجمالي</div>
                      <div className="font-semibold text-lg">{getTotalCost().total.toFixed(2)} ريال</div>
                    </div>
                  </div>
                </div>

                {/* التحذيرات والتنبيهات */}
                {watchedValues.amount > settings.auto_approve_threshold && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      هذا الطلب يحتاج موافقة إدارية نظراً لكون المبلغ أكبر من {settings.auto_approve_threshold} ريال
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(2)}
                >
                  السابق
                </Button>
                <div className="flex gap-2">
                  {mode !== 'view' && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleSubmit((data) => onFormSubmit({ ...data, status: 'draft' as any }))}
                        disabled={submitLoading}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        حفظ كمسودة
                      </Button>
                      <Button
                        type="submit"
                        disabled={submitLoading || !isValid}
                      >
                        {submitLoading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        {mode === 'edit' ? 'حفظ التعديلات' : 'تقديم الطلب'}
                      </Button>
                    </>
                  )}
                </div>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </form>

      {/* أزرار الإجراءات السفلية */}
      <div className="flex justify-between pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          إلغاء
        </Button>
      </div>
    </div>
  );
}