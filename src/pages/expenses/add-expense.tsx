import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { 
  CalendarIcon, 
  Upload, 
  X, 
  FileText, 
  Receipt, 
  DollarSign, 
  Building, 
  User,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { ExpenseManagementService } from '@/lib/services/expense-management-service';
import { ExpensePrintingService } from '@/lib/services/expense-printing-service';
import { SiteSettings } from '@/lib/site-settings';

interface ExpenseFormData {
  title: string;
  description: string;
  amount: string;
  currency: string;
  category_id: string;
  expense_date: Date | undefined;
  location: string;
  vendor_name: string;
  vendor_details: {
    phone?: string;
    email?: string;
    address?: string;
    tax_number?: string;
  };
  department: string;
  cost_center: string;
  project_code: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  payment_method: string;
  notes: string;
  tags: string[];
}

interface ExpenseCategory {
  id: string;
  name: string;
  name_ar: string;
  name_en: string;
  icon: string;
  color: string;
  requires_receipt: boolean;
  max_amount?: number;
  auto_approve_threshold?: number;
}

interface FileUpload {
  id: string;
  file: File;
  name: string;
  size: string;
  type: 'receipt' | 'support';
  preview?: string;
}

export default function AddExpensePage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<FileUpload[]>([]);
  const [formData, setFormData] = useState<ExpenseFormData>({
    title: '',
    description: '',
    amount: '',
    currency: 'SAR',
    category_id: '',
    expense_date: new Date(),
    location: '',
    vendor_name: '',
    vendor_details: {},
    department: '',
    cost_center: '',
    project_code: '',
    priority: 'normal',
    payment_method: '',
    notes: '',
    tags: []
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | null>(null);

  useEffect(() => {
    loadExpenseCategories();
  }, []);

  const loadExpenseCategories = async () => {
    try {
      // في التطبيق الحقيقي، سيتم جلب البيانات من قاعدة البيانات
      const mockCategories: ExpenseCategory[] = [
        {
          id: '1',
          name: 'travel',
          name_ar: 'مصاريف السفر',
          name_en: 'Travel Expenses',
          icon: 'Plane',
          color: '#3b82f6',
          requires_receipt: true,
          max_amount: 10000,
          auto_approve_threshold: 2000
        },
        {
          id: '2',
          name: 'office',
          name_ar: 'مصاريف مكتبية',
          name_en: 'Office Supplies',
          icon: 'Coffee',
          color: '#10b981',
          requires_receipt: true,
          max_amount: 5000,
          auto_approve_threshold: 1000
        },
        {
          id: '3',
          name: 'transport',
          name_ar: 'مواصلات',
          name_en: 'Transportation',
          icon: 'Car',
          color: '#f59e0b',
          requires_receipt: false,
          max_amount: 3000,
          auto_approve_threshold: 500
        },
        {
          id: '4',
          name: 'entertainment',
          name_ar: 'ضيافة وترفيه',
          name_en: 'Entertainment',
          icon: 'Gift',
          color: '#8b5cf6',
          requires_receipt: true,
          max_amount: 8000,
          auto_approve_threshold: 1500
        }
      ];
      setCategories(mockCategories);
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في تحميل فئات النفقات",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: keyof ExpenseFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    setSelectedCategory(category || null);
    handleInputChange('category_id', categoryId);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'receipt' | 'support') => {
    const files = Array.from(event.target.files || []);
    
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "خطأ",
          description: `حجم الملف ${file.name} كبير جداً. الحد الأقصى 10 ميجابايت`,
          variant: "destructive",
        });
        continue;
      }

      const fileUpload: FileUpload = {
        id: Date.now().toString() + Math.random(),
        file,
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        type,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
      };

      setUploadedFiles(prev => [...prev, fileUpload]);
    }
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== fileId);
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'عنوان الطلب مطلوب';
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'المبلغ مطلوب ويجب أن يكون أكبر من صفر';
    }

    if (!formData.category_id) {
      newErrors.category_id = 'فئة النفقة مطلوبة';
    }

    if (!formData.expense_date) {
      newErrors.expense_date = 'تاريخ النفقة مطلوب';
    }

    // Check if receipt is required for selected category
    if (selectedCategory?.requires_receipt && uploadedFiles.filter(f => f.type === 'receipt').length === 0) {
      newErrors.receipt = 'فاتورة مطلوبة لهذه الفئة';
    }

    // Check amount against category limits
    if (selectedCategory?.max_amount && parseFloat(formData.amount) > selectedCategory.max_amount) {
      newErrors.amount = `المبلغ يتجاوز الحد الأقصى المسموح (${selectedCategory.max_amount} ${formData.currency})`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const expenseService = new ExpenseManagementService();
      
      const requestData = {
        ...formData,
        amount: parseFloat(formData.amount),
        status: 'draft' as const,
        receipt_files: uploadedFiles.filter(f => f.type === 'receipt').map(f => ({
          name: f.name,
          size: f.file.size,
          type: f.file.type
        })),
        supporting_documents: uploadedFiles.filter(f => f.type === 'support').map(f => ({
          name: f.name,
          size: f.file.size,
          type: f.file.type
        }))
      };

      await expenseService.createExpenseRequest(requestData);
      
      toast({
        title: "تم الحفظ",
        description: "تم حفظ المسودة بنجاح",
      });
      
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في حفظ المسودة",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({
        title: "خطأ في النموذج",
        description: "يرجى تصحيح الأخطاء المشار إليها",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const expenseService = new ExpenseManagementService();
      
      const requestData = {
        ...formData,
        amount: parseFloat(formData.amount),
        status: 'submitted' as const,
        receipt_files: uploadedFiles.filter(f => f.type === 'receipt').map(f => ({
          name: f.name,
          size: f.file.size,
          type: f.file.type
        })),
        supporting_documents: uploadedFiles.filter(f => f.type === 'support').map(f => ({
          name: f.name,
          size: f.file.size,
          type: f.file.type
        }))
      };

      const result = await expenseService.createExpenseRequest(requestData);
      
      // Auto-submit if all required data is present
      if (result.id) {
        await expenseService.submitExpenseRequest(result.id);
      }
      
      toast({
        title: "تم التقديم بنجاح",
        description: `تم تقديم طلب النفقة برقم: ${result.request_number}`,
      });
      
      // Reset form or redirect
      setFormData({
        title: '',
        description: '',
        amount: '',
        currency: 'SAR',
        category_id: '',
        expense_date: new Date(),
        location: '',
        vendor_name: '',
        vendor_details: {},
        department: '',
        cost_center: '',
        project_code: '',
        priority: 'normal',
        payment_method: '',
        notes: '',
        tags: []
      });
      setUploadedFiles([]);
      setCurrentStep(1);
      
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في تقديم الطلب",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { id: 1, title: 'المعلومات الأساسية', icon: FileText },
    { id: 2, title: 'تفاصيل النفقة', icon: Receipt },
    { id: 3, title: 'المرفقات', icon: Upload },
    { id: 4, title: 'المراجعة والإرسال', icon: CheckCircle2 }
  ];

  const renderStepIndicator = () => (
    <div className="flex justify-center mb-8">
      <div className="flex items-center space-x-4 rtl:space-x-reverse">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          
          return (
            <div key={step.id} className="flex items-center">
              <div className={`
                flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors
                ${isActive ? 'bg-blue-600 border-blue-600 text-white' : 
                  isCompleted ? 'bg-green-600 border-green-600 text-white' : 
                  'bg-gray-100 border-gray-300 text-gray-400'}
              `}>
                <Icon className="h-5 w-5" />
              </div>
              {index < steps.length - 1 && (
                <div className={`w-16 h-0.5 mx-2 ${
                  isCompleted ? 'bg-green-600' : 'bg-gray-300'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="title">عنوان الطلب *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="أدخل عنوان واضح للطلب"
            className={errors.title ? 'border-red-500' : ''}
          />
          {errors.title && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {errors.title}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">فئة النفقة *</Label>
          <Select 
            value={formData.category_id} 
            onValueChange={handleCategoryChange}
          >
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
                    <span>{category.name_ar}</span>
                    {category.requires_receipt && (
                      <Badge variant="outline" className="text-xs">
                        فاتورة مطلوبة
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category_id && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {errors.category_id}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">وصف النفقة</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="اكتب وصف تفصيلي للنفقة..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label htmlFor="amount">المبلغ *</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              placeholder="0.00"
              className={`pl-10 ${errors.amount ? 'border-red-500' : ''}`}
            />
          </div>
          {errors.amount && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {errors.amount}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="currency">العملة</Label>
          <Select 
            value={formData.currency} 
            onValueChange={(value) => handleInputChange('currency', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SAR">ريال سعودي (SAR)</SelectItem>
              <SelectItem value="USD">دولار أمريكي (USD)</SelectItem>
              <SelectItem value="EUR">يورو (EUR)</SelectItem>
              <SelectItem value="AED">درهم إماراتي (AED)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="expense_date">تاريخ النفقة *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`w-full justify-start text-left font-normal ${
                  !formData.expense_date ? "text-muted-foreground" : ""
                } ${errors.expense_date ? 'border-red-500' : ''}`}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.expense_date ? (
                  format(formData.expense_date, "PPP", { locale: ar })
                ) : (
                  <span>اختر التاريخ</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formData.expense_date}
                onSelect={(date) => handleInputChange('expense_date', date)}
                disabled={(date) => date > new Date()}
                initialFocus
                locale={ar}
              />
            </PopoverContent>
          </Popover>
          {errors.expense_date && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {errors.expense_date}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="vendor_name">اسم المورد/الجهة</Label>
          <Input
            id="vendor_name"
            value={formData.vendor_name}
            onChange={(e) => handleInputChange('vendor_name', e.target.value)}
            placeholder="اسم الشركة أو المورد"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">المكان/الموقع</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => handleInputChange('location', e.target.value)}
            placeholder="مكان حدوث النفقة"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label htmlFor="department">القسم</Label>
          <Select 
            value={formData.department} 
            onValueChange={(value) => handleInputChange('department', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر القسم" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hr">الموارد البشرية</SelectItem>
              <SelectItem value="it">تقنية المعلومات</SelectItem>
              <SelectItem value="finance">المالية</SelectItem>
              <SelectItem value="marketing">التسويق</SelectItem>
              <SelectItem value="operations">العمليات</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cost_center">مركز التكلفة</Label>
          <Input
            id="cost_center"
            value={formData.cost_center}
            onChange={(e) => handleInputChange('cost_center', e.target.value)}
            placeholder="رمز مركز التكلفة"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="project_code">رمز المشروع</Label>
          <Input
            id="project_code"
            value={formData.project_code}
            onChange={(e) => handleInputChange('project_code', e.target.value)}
            placeholder="رمز المشروع المرتبط"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="priority">الأولوية</Label>
          <Select 
            value={formData.priority} 
            onValueChange={(value: any) => handleInputChange('priority', value)}
          >
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="payment_method">طريقة الدفع</Label>
          <Select 
            value={formData.payment_method} 
            onValueChange={(value) => handleInputChange('payment_method', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر طريقة الدفع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">نقداً</SelectItem>
              <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
              <SelectItem value="company_card">بطاقة الشركة</SelectItem>
              <SelectItem value="personal_reimbursement">استرداد شخصي</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">ملاحظات إضافية</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          placeholder="أي ملاحظات أو تفاصيل إضافية..."
          rows={3}
        />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      {selectedCategory?.requires_receipt && (
        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">
            هذه الفئة تتطلب إرفاق فاتورة أو وصل استلام
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              الفواتير والوصولات
            </CardTitle>
            <CardDescription>
              ارفع صور الفواتير الأصلية (مطلوبة)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <input
              type="file"
              multiple
              accept="image/*,application/pdf"
              onChange={(e) => handleFileUpload(e, 'receipt')}
              className="hidden"
              id="receipt-upload"
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById('receipt-upload')?.click()}
              className="w-full border-dashed"
            >
              <Upload className="h-4 w-4 mr-2" />
              اختر الملفات
            </Button>
            {errors.receipt && (
              <p className="text-sm text-red-500 mt-2 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.receipt}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              المستندات الداعمة
            </CardTitle>
            <CardDescription>
              مستندات إضافية مثل العقود أو الموافقات (اختيارية)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <input
              type="file"
              multiple
              accept="image/*,application/pdf,.doc,.docx"
              onChange={(e) => handleFileUpload(e, 'support')}
              className="hidden"
              id="support-upload"
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById('support-upload')?.click()}
              className="w-full border-dashed"
            >
              <Upload className="h-4 w-4 mr-2" />
              اختر الملفات
            </Button>
          </CardContent>
        </Card>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">الملفات المرفقة</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {uploadedFiles.map((file) => (
              <Card key={file.id} className="relative">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant={file.type === 'receipt' ? 'default' : 'secondary'}>
                      {file.type === 'receipt' ? 'فاتورة' : 'مستند داعم'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {file.preview && (
                    <img 
                      src={file.preview} 
                      alt={file.name}
                      className="w-full h-20 object-cover rounded mb-2"
                    />
                  )}
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">{file.size}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-700">
          مراجعة البيانات قبل التقديم النهائي
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>معلومات الطلب</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="font-semibold">العنوان:</span>
              <p className="text-gray-600">{formData.title}</p>
            </div>
            <div>
              <span className="font-semibold">المبلغ:</span>
              <p className="text-gray-600 font-mono">
                {parseFloat(formData.amount).toLocaleString('ar-SA')} {formData.currency}
              </p>
            </div>
            <div>
              <span className="font-semibold">الفئة:</span>
              <p className="text-gray-600">{selectedCategory?.name_ar}</p>
            </div>
            <div>
              <span className="font-semibold">التاريخ:</span>
              <p className="text-gray-600">
                {formData.expense_date ? format(formData.expense_date, "PPP", { locale: ar }) : ''}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>تفاصيل إضافية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="font-semibold">المورد:</span>
              <p className="text-gray-600">{formData.vendor_name || 'غير محدد'}</p>
            </div>
            <div>
              <span className="font-semibold">القسم:</span>
              <p className="text-gray-600">{formData.department || 'غير محدد'}</p>
            </div>
            <div>
              <span className="font-semibold">الأولوية:</span>
              <Badge variant="outline">
                {formData.priority === 'low' ? 'منخفضة' :
                 formData.priority === 'normal' ? 'عادية' :
                 formData.priority === 'high' ? 'عالية' : 'عاجلة'}
              </Badge>
            </div>
            <div>
              <span className="font-semibold">المرفقات:</span>
              <p className="text-gray-600">
                {uploadedFiles.length} ملف مرفق
                ({uploadedFiles.filter(f => f.type === 'receipt').length} فاتورة)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {formData.description && (
        <Card>
          <CardHeader>
            <CardTitle>الوصف</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">{formData.description}</p>
          </CardContent>
        </Card>
      )}

      {selectedCategory?.auto_approve_threshold && 
       parseFloat(formData.amount) <= selectedCategory.auto_approve_threshold && (
        <Alert className="border-blue-200 bg-blue-50">
          <Clock className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">
            سيتم الموافقة على هذا الطلب تلقائياً لأن المبلغ أقل من حد الموافقة التلقائية 
            ({selectedCategory.auto_approve_threshold} {formData.currency})
          </AlertDescription>
        </Alert>
      )}
    </div>
  );

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          إضافة طلب نفقة جديد
        </h1>
        <p className="text-gray-600">
          أكمل جميع البيانات المطلوبة لتقديم طلب نفقة للموافقة
        </p>
      </div>

      {renderStepIndicator()}

      <Card>
        <CardHeader>
          <CardTitle>{steps[currentStep - 1].title}</CardTitle>
        </CardHeader>
        <CardContent>
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
          >
            السابق
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isSaving}
            >
              {isSaving ? 'جاري الحفظ...' : 'حفظ كمسودة'}
            </Button>
            
            {currentStep < 4 ? (
              <Button
                onClick={() => setCurrentStep(Math.min(4, currentStep + 1))}
              >
                التالي
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? 'جاري التقديم...' : 'تقديم الطلب'}
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}