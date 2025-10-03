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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Loader2, AlertCircle, CheckCircle, ShoppingCart, User, 
  CreditCard, FileText, Percent, Calendar, Package, Plus, 
  Minus, X, Gift, AlertTriangle, Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// أنواع البيانات المحسنة
interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  inStock: number;
  description?: string;
}

interface Clinic {
  id: string;
  name: string;
  area: string;
  line: string;
  creditLimit?: number;
  currentDebt?: number;
  doctorName?: string;
  phone?: string;
}

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  maxQuantity: number;
  discount: number;
  discountType: 'percentage' | 'fixed';
  total: number;
  notes?: string;
}

interface DiscountOption {
  type: 'percentage' | 'fixed' | 'demo';
  value: number;
  label: string;
}

interface NewOrderFormProps {
  currentUser?: any;
  onSubmit?: (orderData: any) => Promise<void>;
  onCancel?: () => void;
}

export function NewOrderForm({ currentUser, onSubmit, onCancel }: NewOrderFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Form State
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed' | 'demo'>('percentage');
  const [discountValue, setDiscountValue] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'deferred'>('cash');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');

  // Mock Data - في الواقع ستأتي من API
  const clinics: Clinic[] = [
    {
      id: '1',
      name: 'عيادة النور للأسنان',
      area: 'الرياض',
      line: 'الخط الأول',
      creditLimit: 50000,
      currentDebt: 12000,
      doctorName: 'د. أحمد محمد',
      phone: '0501234567'
    },
    {
      id: '2',
      name: 'مجمع الشفاء الطبي',
      area: 'الرياض',
      line: 'الخط الثاني',
      creditLimit: 30000,
      currentDebt: 8000,
      doctorName: 'د. سارة أحمد',
      phone: '0509876543'
    }
  ];

  const products: Product[] = [
    {
      id: '1',
      name: 'أدوية المضادات الحيوية',
      price: 150,
      category: 'أدوية',
      inStock: 100,
      description: 'مضادات حيوية عامة للعدوى البكتيرية'
    },
    {
      id: '2',
      name: 'مستلزمات جراحية',
      price: 75,
      category: 'مستلزمات',
      inStock: 50,
      description: 'أدوات جراحية أساسية معقمة'
    },
    {
      id: '3',
      name: 'أجهزة قياس ضغط الدم',
      price: 300,
      category: 'أجهزة',
      inStock: 25,
      description: 'جهاز قياس ضغط الدم الرقمي'
    }
  ];

  // Filter clinics based on user role
  const availableClinics = useMemo(() => {
    if (!currentUser) return clinics;
    
    // Admin can see all clinics
    if (currentUser.role === 'admin') {
      return clinics;
    }
    
    // Manager can see clinics in their area and line
    if (currentUser.role === 'manager' && currentUser.area && currentUser.line) {
      return clinics.filter(clinic => 
        clinic.area === currentUser.area && clinic.line === currentUser.line
      );
    }
    
    // Medical rep can see clinics in their area and line
    if (currentUser.role === 'medical_rep' && currentUser.area && currentUser.line) {
      return clinics.filter(clinic => 
        clinic.area === currentUser.area && clinic.line === currentUser.line
      );
    }
    
    return clinics;
  }, [currentUser]);

  // Calculate totals
  const calculations = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const itemsDiscount = items.reduce((sum, item) => {
      const itemTotal = item.price * item.quantity;
      return sum + (item.discountType === 'percentage' 
        ? itemTotal * (item.discount / 100)
        : item.discount
      );
    }, 0);
    
    let orderDiscount = 0;
    if (discountType === 'demo') {
      orderDiscount = subtotal + itemsDiscount; // Demo makes everything free
    } else if (discountType === 'percentage') {
      orderDiscount = (subtotal - itemsDiscount) * (discountValue / 100);
    } else if (discountType === 'fixed') {
      orderDiscount = discountValue;
    }

    const totalDiscount = itemsDiscount + orderDiscount;
    const finalTotal = Math.max(0, subtotal - totalDiscount);

    return {
      subtotal,
      itemsDiscount,
      orderDiscount,
      totalDiscount,
      finalTotal
    };
  }, [items, discountType, discountValue]);

  // Add product to order
  const addProduct = (product: Product) => {
    const existingItem = items.find(item => item.productId === product.id);
    
    if (existingItem) {
      // Check demo limitations
      if (discountType === 'demo' && existingItem.quantity >= 1) {
        toast({
          title: "تحذير الديمو",
          description: "في الديمو لا يمكن طلب أكثر من قطعة واحدة من المنتج",
          variant: "destructive"
        });
        return;
      }
      
      updateItemQuantity(existingItem.id, existingItem.quantity + 1);
    } else {
      // Check demo limitations for number of products
      if (discountType === 'demo' && items.length >= 3) {
        toast({
          title: "تحذير الديمو",
          description: "في الديمو لا يمكن طلب أكثر من 3 منتجات مختلفة",
          variant: "destructive"
        });
        return;
      }
      
      const newItem: OrderItem = {
        id: `item-${Date.now()}-${Math.random()}`,
        productId: product.id,
        productName: product.name,
        price: product.price,
        quantity: 1,
        maxQuantity: discountType === 'demo' ? 1 : product.inStock,
        discount: 0,
        discountType: 'percentage',
        total: product.price,
        notes: ''
      };
      
      setItems([...items, newItem]);
    }
  };

  // Update item quantity
  const updateItemQuantity = (itemId: string, newQuantity: number) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const clampedQuantity = Math.max(1, Math.min(newQuantity, item.maxQuantity));
        return {
          ...item,
          quantity: clampedQuantity,
          total: item.price * clampedQuantity
        };
      }
      return item;
    }));
  };

  // Update item discount
  const updateItemDiscount = (itemId: string, discount: number, type: 'percentage' | 'fixed') => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const clampedDiscount = Math.max(0, discount);
        return {
          ...item,
          discount: clampedDiscount,
          discountType: type
        };
      }
      return item;
    }));
  };

  // Remove item
  const removeItem = (itemId: string) => {
    setItems(items.filter(item => item.id !== itemId));
  };

  // Handle discount type change
  const handleDiscountTypeChange = (newType: 'percentage' | 'fixed' | 'demo') => {
    setDiscountType(newType);
    
    if (newType === 'demo') {
      setDiscountValue(0);
      // Apply demo limitations to existing items
      setItems(currentItems => 
        currentItems.slice(0, 3).map(item => ({
          ...item,
          quantity: 1,
          maxQuantity: 1,
          total: item.price
        }))
      );
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedClinic) {
      newErrors.clinic = 'يرجى اختيار العيادة';
    }

    if (items.length === 0) {
      newErrors.items = 'يرجى إضافة منتجات للطلب';
    }

    // Check credit limit
    if (selectedClinic?.creditLimit && calculations.finalTotal > 0) {
      const projectedDebt = (selectedClinic.currentDebt || 0) + calculations.finalTotal;
      if (projectedDebt > selectedClinic.creditLimit) {
        newErrors.credit = 'سيتجاوز هذا الطلب الحد الائتماني للعيادة';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const orderData = {
        clinicId: selectedClinic!.id,
        clinicName: selectedClinic!.name,
        representativeId: currentUser?.id,
        representativeName: currentUser?.fullName,
        items: items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
          discount: item.discount,
          discountType: item.discountType,
          total: item.total,
          notes: item.notes
        })),
        subtotal: calculations.subtotal,
        discountType,
        discountValue,
        totalDiscount: calculations.totalDiscount,
        finalTotal: calculations.finalTotal,
        paymentMethod,
        priority,
        notes,
        currency: 'EGP', // الجنيه المصري
        orderDate: new Date().toISOString(),
        status: 'pending'
      };

      await onSubmit?.(orderData);
      
      // Reset form
      setSelectedClinic(null);
      setItems([]);
      setDiscountType('percentage');
      setDiscountValue(0);
      setNotes('');
      setPriority('medium');
      
    } catch (error) {
      console.error('Error submitting order:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Order Header */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clinic Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              اختيار العيادة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select 
              value={selectedClinic?.id || ''} 
              onValueChange={(value) => {
                const clinic = availableClinics.find(c => c.id === value);
                setSelectedClinic(clinic || null);
                setErrors(prev => ({ ...prev, clinic: '' }));
              }}
            >
              <SelectTrigger className={cn(errors.clinic && "border-red-500")}>
                <SelectValue placeholder="اختر العيادة" />
              </SelectTrigger>
              <SelectContent>
                {availableClinics.map((clinic) => (
                  <SelectItem key={clinic.id} value={clinic.id}>
                    <div className="text-right">
                      <div className="font-medium">{clinic.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {clinic.doctorName} • {clinic.area} - {clinic.line}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.clinic && (
              <p className="text-sm text-red-600 mt-1">{errors.clinic}</p>
            )}
            
            {selectedClinic && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>الطبيب:</span>
                    <span className="font-medium">{selectedClinic.doctorName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>الهاتف:</span>
                    <span className="font-medium">{selectedClinic.phone}</span>
                  </div>
                  {selectedClinic.creditLimit && (
                    <div className="flex justify-between">
                      <span>الحد الائتماني:</span>
                      <span className="font-medium">{selectedClinic.creditLimit.toLocaleString()} ج.م</span>
                    </div>
                  )}
                  {selectedClinic.currentDebt && selectedClinic.currentDebt > 0 && (
                    <div className="flex justify-between text-orange-600">
                      <span>الديون الحالية:</span>
                      <span className="font-medium">{selectedClinic.currentDebt.toLocaleString()} ج.م</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Representative Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              مقدم الطلب
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <Label className="text-sm text-muted-foreground">اسم المندوب</Label>
                <Input
                  value={currentUser?.fullName || 'غير محدد'}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">التاريخ</Label>
                <Input
                  value={new Date().toLocaleDateString('ar-EG')}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">المنطقة والخط</Label>
                <Input
                  value={currentUser?.area && currentUser?.line ? `${currentUser.area} - ${currentUser.line}` : 'غير محدد'}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Credit Warning */}
      {errors.credit && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errors.credit}</AlertDescription>
        </Alert>
      )}

      {/* Products Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            المنتجات المتاحة
          </CardTitle>
          {discountType === 'demo' && (
            <Alert>
              <Gift className="h-4 w-4" />
              <AlertDescription>
                في وضع الديمو: يمكن طلب 3 منتجات كحد أقصى، قطعة واحدة من كل منتج، والفاتورة ستكون مجانية
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {products.map((product) => (
              <Card key={product.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-muted-foreground">{product.description}</div>
                    <div className="flex justify-between items-center">
                      <Badge variant="outline">{product.category}</Badge>
                      <span className="font-bold text-green-600">{product.price} ج.م</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      متوفر: {product.inStock} قطعة
                    </div>
                    <Button
                      type="button"
                      onClick={() => addProduct(product)}
                      className="w-full"
                      size="sm"
                      disabled={
                        product.inStock === 0 || 
                        (discountType === 'demo' && items.length >= 3 && !items.find(item => item.productId === product.id))
                      }
                    >
                      <Plus className="h-3 w-3 ml-1" />
                      إضافة للطلب
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {errors.items && (
            <p className="text-sm text-red-600">{errors.items}</p>
          )}
        </CardContent>
      </Card>

      {/* Order Items */}
      {items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              بنود الطلب ({items.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={item.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                    <div className="md:col-span-2">
                      <div className="font-medium">{item.productName}</div>
                      <div className="text-sm text-muted-foreground">{item.price} ج.م للقطعة</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                        disabled={item.quantity >= item.maxQuantity}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          min="0"
                          max={item.discountType === 'percentage' ? "100" : undefined}
                          value={item.discount}
                          onChange={(e) => updateItemDiscount(item.id, parseFloat(e.target.value) || 0, item.discountType)}
                          className="w-20"
                          disabled={discountType === 'demo'}
                        />
                        <Select
                          value={item.discountType}
                          onValueChange={(value: 'percentage' | 'fixed') => updateItemDiscount(item.id, item.discount, value)}
                          disabled={discountType === 'demo'}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">%</SelectItem>
                            <SelectItem value="fixed">ج.م</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="font-bold text-lg">{item.total} ج.م</div>
                    </div>

                    <div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Details */}
      {items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              تفاصيل الطلب
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Discount Options */}
            <div>
              <Label className="text-base font-medium mb-3 block">نوع الخصم</Label>
              <RadioGroup
                value={discountType}
                onValueChange={(value: 'percentage' | 'fixed' | 'demo') => handleDiscountTypeChange(value)}
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
              >
                <div className="flex items-center space-x-2 p-4 border rounded-lg">
                  <RadioGroupItem value="percentage" id="percentage" />
                  <div className="space-y-1">
                    <Label htmlFor="percentage" className="font-medium">نسبة مئوية</Label>
                    <p className="text-xs text-muted-foreground">خصم بنسبة مئوية من الإجمالي</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 p-4 border rounded-lg">
                  <RadioGroupItem value="fixed" id="fixed" />
                  <div className="space-y-1">
                    <Label htmlFor="fixed" className="font-medium">مبلغ ثابت</Label>
                    <p className="text-xs text-muted-foreground">خصم مبلغ ثابت بالجنيه</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 p-4 border rounded-lg">
                  <RadioGroupItem value="demo" id="demo" />
                  <div className="space-y-1">
                    <Label htmlFor="demo" className="font-medium">ديمو مجاني</Label>
                    <p className="text-xs text-muted-foreground">عينة مجانية (3 منتجات كحد أقصى)</p>
                  </div>
                </div>
              </RadioGroup>

              {discountType !== 'demo' && (
                <div className="mt-4">
                  <Label>قيمة الخصم</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="number"
                      min="0"
                      max={discountType === 'percentage' ? "100" : undefined}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                      placeholder={discountType === 'percentage' ? "النسبة المئوية" : "المبلغ بالجنيه"}
                    />
                    <span className="flex items-center px-3 border rounded-md bg-muted">
                      {discountType === 'percentage' ? '%' : 'ج.م'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div>
              <Label>طريقة الدفع</Label>
              <Select value={paymentMethod} onValueChange={(value: 'cash' | 'bank_transfer' | 'deferred') => setPaymentMethod(value)}>
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

            {/* Priority */}
            <div>
              <Label>أولوية الطلب</Label>
              <Select value={priority} onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') => setPriority(value)}>
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

            {/* Notes */}
            <div>
              <Label>ملاحظات</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ملاحظات إضافية على الطلب..."
                className="mt-1"
                rows={3}
              />
            </div>

            {/* Order Summary */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-lg border">
              <h4 className="font-semibold mb-4 text-lg">ملخص الطلب</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>المجموع الفرعي:</span>
                  <span className="font-medium">{calculations.subtotal.toFixed(2)} ج.م</span>
                </div>
                
                {calculations.itemsDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>خصم المنتجات:</span>
                    <span>-{calculations.itemsDiscount.toFixed(2)} ج.م</span>
                  </div>
                )}
                
                {calculations.orderDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>خصم إضافي ({discountType === 'demo' ? 'ديمو مجاني' : discountType === 'percentage' ? `${discountValue}%` : 'مبلغ ثابت'}):</span>
                    <span>-{calculations.orderDiscount.toFixed(2)} ج.م</span>
                  </div>
                )}
                
                <Separator />
                
                <div className="flex justify-between text-2xl font-bold text-primary">
                  <span>الإجمالي النهائي:</span>
                  <span>{calculations.finalTotal.toFixed(2)} ج.م</span>
                </div>

                {discountType === 'demo' && calculations.finalTotal === 0 && (
                  <div className="text-center">
                    <Badge className="bg-green-500 text-white">
                      <Gift className="h-3 w-3 ml-1" />
                      ديمو مجاني
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          إلغاء
        </Button>
        <Button 
          type="submit" 
          disabled={isSubmitting || items.length === 0}
          className="min-w-[150px]"
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