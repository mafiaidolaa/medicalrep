"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Plus, Edit, Trash2, Search, Package2, AlertTriangle, CheckCircle, Clock, Route, Tag, Calendar, Building2, MapPin, Barcode, Truck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDataProvider } from '@/lib/data-provider';

interface Product {
  id: string;
  name: string;
  description?: string;
  line: string; // تم تغييره من category إلى line
  price: number;
  cost?: number;
  quantity: number;
  minStock: number;
  maxStock?: number;
  sku: string;
  barcode?: string;
  unit: string; // وحدة القياس (علبة، قطعة، كيلو، إلخ)
  brand?: string; // العلامة التجارية
  supplier?: string; // المورد
  expiryDate?: Date; // تاريخ الانتهاء
  batchNumber?: string; // رقم الدفعة
  manufacturingDate?: Date; // تاريخ التصنيع
  location?: string; // موقع التخزين
  notes?: string; // ملاحظات إضافية
  status: 'active' | 'inactive' | 'discontinued' | 'out_of_stock';
  tags?: string[]; // علامات للبحث السريع
  createdAt: Date;
  updatedAt: Date;
}

interface ProductLine {
  id: string;
  name: string;
  description?: string;
  color: string;
  area?: string; // المنطقة التابع لها الخط
}

const LINE_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
  '#8B5CF6', '#06B6D4', '#84CC16', '#F97316',
  '#EC4899', '#14B8A6', '#6366F1', '#DC2626',
  '#059669', '#D97706', '#7C3AED', '#0891B2'
];

const PRODUCT_STATUSES = [
  { value: 'active', label: 'نشط', color: 'bg-green-100 text-green-800', icon: '✅' },
  { value: 'inactive', label: 'غير نشط', color: 'bg-gray-100 text-gray-800', icon: '⏸️' },
  { value: 'discontinued', label: 'متوقف', color: 'bg-red-100 text-red-800', icon: '🚫' },
  { value: 'out_of_stock', label: 'نفد المخزون', color: 'bg-orange-100 text-orange-800', icon: '📦' }
];

const PRODUCT_UNITS = [
  'قطعة', 'علبة', 'كيس', 'زجاجة', 'أنبوبة', 'كبسولة', 'قرص', 
  'كيلو', 'جرام', 'لتر', 'مل', 'متر', 'سم', 'باكت', 'صندوق'
];

export function ProductManagement() {
  const { toast } = useToast();
  const { 
    lines, 
    getProducts: getProductsCtx, 
    products: providerProducts,
    addProduct: addProductCtx,
    updateProduct: updateProductCtx,
    deleteProduct: deleteProductCtx
  } = useDataProvider(); // مزود البيانات الاحترافي
  
  const [products, setProducts] = useState<Product[]>([]);
  const [productLines, setProductLines] = useState<ProductLine[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // تحويل الخطوط من الإعدادات إلى ProductLine
  useEffect(() => {
    const safeLines = Array.isArray(lines)
      ? (lines.filter(Boolean).map(String) as string[])
      : (lines && typeof lines === 'object')
        ? (Object.values(lines as any).filter(Boolean).map(String) as string[])
        : ([] as string[]);
    const convertedLines: ProductLine[] = safeLines.map((lineName, index) => ({
      id: `line-${index}`,
      name: lineName,
      description: `خط ${lineName} - منتجات ومواد مختصة`,
      color: LINE_COLORS[index % LINE_COLORS.length],
      area: undefined // يمكن ربطه بالمناطق لاحقاً
    }));
    setProductLines(convertedLines);
  }, [lines]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLine, setSelectedLine] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [activeTab, setActiveTab] = useState('products');
  const [showExpired, setShowExpired] = useState(false);
  
  // Product form state
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    line: '',
    price: 0,
    cost: 0,
    quantity: 0,
    minStock: 5,
    maxStock: 1000,
    sku: '',
    barcode: '',
    unit: 'قطعة',
    brand: '',
    supplier: '',
    expiryDate: '',
    batchNumber: '',
    manufacturingDate: '',
    location: '',
    notes: '',
    tags: '',
    status: 'active' as Product['status']
  });

  // Line form state (previously category)
  const [lineDialogOpen, setLineDialogOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<ProductLine | null>(null);
  const [lineForm, setLineForm] = useState({
    name: '',
    description: '',
    color: LINE_COLORS[0]
  });

  // تحميل المنتجات مرة واحدة عند التحميل الأولي فقط
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const dbProducts = await getProductsCtx();
        if (cancelled) return;
        const mapped: Product[] = (dbProducts || []).map((p) => ({
          id: p.id,
          name: p.name,
          description: '',
          line: p.line,
          price: p.price,
          cost: 0,
          quantity: p.stock ?? 0,
          minStock: 5,
          maxStock: 1000,
          sku: p.id?.slice(0, 8) || '',
          barcode: '',
          unit: 'قطعة',
          brand: '',
          supplier: '',
          expiryDate: undefined,
          batchNumber: '',
          manufacturingDate: undefined,
          location: '',
          notes: '',
          tags: [],
          status: (p.stock ?? 0) === 0 ? 'out_of_stock' : 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        }));
        setProducts(mapped);
      } catch (e: any) {
        console.error('Failed to load products:', e);
        setLoadError('فشل تحميل المنتجات.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [getProductsCtx]); // إزالة providerProducts لتجنب إعادة التحميل المستمرة

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.supplier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesLine = selectedLine === 'all' || product.line === selectedLine;
    const matchesStatus = selectedStatus === 'all' || product.status === selectedStatus;
    const matchesExpiry = showExpired ? true : !product.expiryDate || new Date(product.expiryDate) > new Date();
    return matchesSearch && matchesLine && matchesStatus && matchesExpiry;
  });

  const lowStockProducts = products.filter(p => p.quantity <= p.minStock && p.status === 'active');

  const resetProductForm = () => {
    setProductForm({
      name: '',
      description: '',
      line: '',
      price: 0,
      cost: 0,
      quantity: 0,
      minStock: 5,
      maxStock: 1000,
      sku: '',
      barcode: '',
      unit: 'قطعة',
      brand: '',
      supplier: '',
      expiryDate: '',
      batchNumber: '',
      manufacturingDate: '',
      location: '',
      notes: '',
      tags: '',
      status: 'active'
    });
    setEditingProduct(null);
  };

  const resetLineForm = () => {
    setLineForm({
      name: '',
      description: '',
      color: LINE_COLORS[0]
    });
    setEditingLine(null);
  };

  const generateSKU = () => {
    const timestamp = Date.now().toString().slice(-6);
    const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `PRD-${randomStr}-${timestamp}`;
  };

  const handleAddProduct = async () => {
    if (!productForm.name.trim() || !productForm.line) return;

    // تحويل التاغز من نص إلى مصفوفة
    const tagsArray = productForm.tags ? productForm.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];
    
    // بناء المنتج للقاعدة
    const dbProduct = {
      name: productForm.name.trim(),
      price: productForm.price,
      imageUrl: undefined as string | undefined,
      stock: productForm.quantity,
      averageDailyUsage: 0,
      line: productForm.line,
      category: undefined as string | undefined,
    };

    // تفاؤلي + حفظ في DB ثم مزامنة محلية
    try {
      const created = await addProductCtx(dbProduct as any);
      const newProduct: Product = {
        id: created.id,
        name: productForm.name.trim(),
        description: productForm.description.trim() || undefined,
        line: productForm.line,
        price: productForm.price,
        cost: productForm.cost,
        quantity: productForm.quantity,
        minStock: productForm.minStock,
        maxStock: productForm.maxStock,
        sku: productForm.sku || generateSKU(),
        barcode: productForm.barcode.trim() || undefined,
        unit: productForm.unit,
        brand: productForm.brand.trim() || undefined,
        supplier: productForm.supplier.trim() || undefined,
        expiryDate: productForm.expiryDate ? new Date(productForm.expiryDate) : undefined,
        batchNumber: productForm.batchNumber.trim() || undefined,
        manufacturingDate: productForm.manufacturingDate ? new Date(productForm.manufacturingDate) : undefined,
        location: productForm.location.trim() || undefined,
        notes: productForm.notes.trim() || undefined,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
        status: productForm.quantity === 0 ? 'out_of_stock' : productForm.status,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      setProducts((prev) => [newProduct, ...prev]);

      // Persist professional details (sku, unit, brand, supplier, barcode, min/max stock, status, notes)
      try {
        const detailsPayload = {
          details: {
            sku: newProduct.sku,
            unit: newProduct.unit,
            brand: newProduct.brand,
            supplier: newProduct.supplier,
            barcode: newProduct.barcode,
            min_stock: newProduct.minStock,
            max_stock: newProduct.maxStock,
            status: newProduct.status,
            notes: newProduct.notes,
          }
        } as any;
        await fetch(`/api/products/${encodeURIComponent(newProduct.id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(detailsPayload)
        });
      } catch (e) {
        console.warn('Failed to persist product details (post-create):', (e as any)?.message || e);
      }

      resetProductForm();
      setProductDialogOpen(false);
      toast({ title: 'تمت إضافة المنتج', description: `تمت إضافة منتج "${newProduct.name}" بنجاح.` });
    } catch (error: any) {
      console.error('Add product failed:', error);
      toast({ variant: 'destructive', title: 'فشل إضافة المنتج', description: 'تعذر حفظ المنتج. حاول مرة أخرى.' });
    }
  };

  const handleEditProduct = async () => {
    if (!productForm.name.trim() || !productForm.line || !editingProduct) return;

    const tagsArray = productForm.tags ? productForm.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];

    // تحديث القاعدة
    try {
      await updateProductCtx(editingProduct.id, {
        name: productForm.name.trim() as any,
        price: productForm.price as any,
        stock: productForm.quantity as any,
        line: productForm.line as any,
      });

      const updatedProducts = products.map(product =>
        product.id === editingProduct.id
          ? {
              ...product,
              name: productForm.name.trim(),
              description: productForm.description.trim() || undefined,
              line: productForm.line,
              price: productForm.price,
              cost: productForm.cost,
              quantity: productForm.quantity,
              minStock: productForm.minStock,
              maxStock: productForm.maxStock,
              sku: productForm.sku,
              barcode: productForm.barcode.trim() || undefined,
              unit: productForm.unit,
              brand: productForm.brand.trim() || undefined,
              supplier: productForm.supplier.trim() || undefined,
              expiryDate: productForm.expiryDate ? new Date(productForm.expiryDate) : undefined,
              batchNumber: productForm.batchNumber.trim() || undefined,
              manufacturingDate: productForm.manufacturingDate ? new Date(productForm.manufacturingDate) : undefined,
              location: productForm.location.trim() || undefined,
              notes: productForm.notes.trim() || undefined,
              tags: tagsArray.length > 0 ? tagsArray : undefined,
              status: productForm.quantity === 0 ? 'out_of_stock' : productForm.status,
              updatedAt: new Date()
            }
          : product
      );

      setProducts(updatedProducts);

      // Persist details after base update
      try {
        const detailsPayload = {
          details: {
            sku: productForm.sku,
            unit: productForm.unit,
            brand: productForm.brand,
            supplier: productForm.supplier,
            barcode: productForm.barcode,
            min_stock: productForm.minStock,
            max_stock: productForm.maxStock,
            status: productForm.status,
            notes: productForm.notes,
          }
        } as any;
        await fetch(`/api/products/${encodeURIComponent(editingProduct.id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(detailsPayload)
        });
      } catch (e) {
        console.warn('Failed to persist product details (update):', (e as any)?.message || e);
      }

      resetProductForm();
      setProductDialogOpen(false);

      toast({ title: 'تم تحديث المنتج', description: `تم تحديث منتج "${productForm.name}" بنجاح.` });
    } catch (error: any) {
      console.error('Update product failed:', error);
      toast({ variant: 'destructive', title: 'فشل تحديث المنتج', description: 'تعذر تحديث المنتج. حاول مرة أخرى.' });
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    const snapshot = products;
    // تفاؤلي
    setProducts(products.filter(p => p.id !== product.id));
    try {
      await deleteProductCtx(product.id);
      toast({ title: 'تم حذف المنتج', description: `تم حذف منتج "${product.name}" بنجاح.` });
    } catch (error: any) {
      console.error('Delete product failed:', error);
      setProducts(snapshot);
      toast({ variant: 'destructive', title: 'فشل حذف المنتج', description: 'تعذر حذف المنتج. حاول مرة أخرى.' });
    }
  };

  const openEditProductDialog = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description || '',
      line: product.line,
      price: product.price,
      cost: product.cost || 0,
      quantity: product.quantity,
      minStock: product.minStock,
      maxStock: product.maxStock || 1000,
      sku: product.sku,
      barcode: product.barcode || '',
      unit: product.unit,
      brand: product.brand || '',
      supplier: product.supplier || '',
      expiryDate: product.expiryDate ? product.expiryDate.toISOString().split('T')[0] : '',
      batchNumber: product.batchNumber || '',
      manufacturingDate: product.manufacturingDate ? product.manufacturingDate.toISOString().split('T')[0] : '',
      location: product.location || '',
      notes: product.notes || '',
      tags: product.tags ? product.tags.join(', ') : '',
      status: product.status
    });
    setProductDialogOpen(true);
  };

  const handleAddLine = async () => {
    if (!lineForm.name.trim()) return;

    const newLine: ProductLine = {
      id: `line-${Date.now()}`,
      name: lineForm.name.trim(),
      description: lineForm.description.trim() || undefined,
      color: lineForm.color
    };

    setProductLines([...productLines, newLine]);
    resetLineForm();
    setLineDialogOpen(false);

    toast({
      title: 'تمت إضافة الخط',
      description: `تمت إضافة خط "${lineForm.name}" بنجاح.`,
    });
  };

  const handleEditLine = async () => {
    if (!lineForm.name.trim() || !editingLine) return;

    const updatedLines = productLines.map(line =>
      line.id === editingLine.id
        ? {
            ...line,
            name: lineForm.name.trim(),
            description: lineForm.description.trim() || undefined,
            color: lineForm.color
          }
        : line
    );

    setProductLines(updatedLines);
    resetLineForm();
    setLineDialogOpen(false);

    toast({
      title: 'تم تحديث الخط',
      description: `تم تحديث خط "${lineForm.name}" بنجاح.`,
    });
  };

  const handleDeleteLine = async (line: ProductLine) => {
    const hasProducts = products.some(p => p.line === line.name);
    if (hasProducts) {
      toast({
        title: 'لا يمكن حذف الخط',
        description: 'هذا الخط يحتوي على منتجات. يجب حذف المنتجات أولاً.',
        variant: 'destructive',
      });
      return;
    }

    setProductLines(productLines.filter(l => l.id !== line.id));

    toast({
      title: 'تم حذف الخط',
      description: `تم حذف خط "${line.name}" بنجاح.`,
    });
  };

  const openEditLineDialog = (line: ProductLine) => {
    setEditingLine(line);
    setLineForm({
      name: line.name,
      description: line.description || '',
      color: line.color
    });
    setLineDialogOpen(true);
  };

  const getStatusBadge = (status: Product['status']) => {
    const statusConfig = PRODUCT_STATUSES.find(s => s.value === status);
    return statusConfig ? { label: statusConfig.label, className: statusConfig.color } : { label: status, className: 'bg-gray-100 text-gray-800' };
  };

  const getLineInfo = (lineName: string) => {
    return productLines.find(l => l.name === lineName);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Package className="h-6 w-6 text-purple-500" />
              إدارة المنتجات
            </h2>
            <p className="text-muted-foreground">جاري تحميل المنتجات...</p>
          </div>
        </div>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-purple-500" />
            إدارة المنتجات
          </h2>
          <p className="text-muted-foreground">إدارة منتجات الشركة والمخزون</p>
        </div>
        
        <div className="flex gap-3">
          <Badge variant="outline" className="px-3 py-1">
            {products.length} منتج
          </Badge>
          {lowStockProducts.length > 0 && (
            <Badge variant="destructive" className="px-3 py-1">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {lowStockProducts.length} نفدت الكمية
            </Badge>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 w-fit">
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package2 className="h-4 w-4" />
            المنتجات
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <Route className="h-4 w-4" />
            الخطوط
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            المخزون
          </TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-4 flex-1">
              <div className="flex-1 relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="البحث في المنتجات..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="w-48">
                <Select value={selectedLine} onValueChange={setSelectedLine}>
                  <SelectTrigger>
                    <SelectValue placeholder="تصفية حسب الخط" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الخطوط</SelectItem>
                    {productLines.map((line) => (
                      <SelectItem key={line.id} value={line.name}>
                        {line.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48">
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="تصفية حسب الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    {PRODUCT_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetProductForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  إضافة منتج
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingProduct ? 'تعديل المنتج' : 'إضافة منتج جديد'}</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="product-name">اسم المنتج</Label>
                    <Input
                      id="product-name"
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      placeholder="اسم المنتج"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="product-line">الخط</Label>
                    <Select value={productForm.line} onValueChange={(value) => setProductForm({ ...productForm, line: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الخط" />
                      </SelectTrigger>
                      <SelectContent>
                        {productLines.map((line) => (
                          <SelectItem key={line.id} value={line.name}>
                            {line.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="product-price">السعر (ج.م)</Label>
                    <Input
                      id="product-price"
                      type="number"
                      step="0.01"
                      value={productForm.price}
                      onChange={(e) => setProductForm({ ...productForm, price: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="product-cost">التكلفة (ج.م - اختياري)</Label>
                    <Input
                      id="product-cost"
                      type="number"
                      step="0.01"
                      value={productForm.cost}
                      onChange={(e) => setProductForm({ ...productForm, cost: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="product-quantity">الكمية</Label>
                    <Input
                      id="product-quantity"
                      type="number"
                      value={productForm.quantity}
                      onChange={(e) => setProductForm({ ...productForm, quantity: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="product-min-stock">الحد الأدنى للمخزون</Label>
                    <Input
                      id="product-min-stock"
                      type="number"
                      value={productForm.minStock}
                      onChange={(e) => setProductForm({ ...productForm, minStock: parseInt(e.target.value) || 0 })}
                      placeholder="5"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="product-sku">رمز المنتج (SKU)</Label>
                    <Input
                      id="product-sku"
                      value={productForm.sku}
                      onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                      placeholder="سيتم إنشاؤه تلقائياً"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="product-status">الحالة</Label>
                    <Select value={productForm.status} onValueChange={(value: Product['status']) => setProductForm({ ...productForm, status: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRODUCT_STATUSES.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label htmlFor="product-description">الوصف (اختياري)</Label>
                    <Textarea
                      id="product-description"
                      value={productForm.description}
                      onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                      placeholder="وصف المنتج..."
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="product-barcode">الباركود (اختياري)</Label>
                    <Input
                      id="product-barcode"
                      value={productForm.barcode}
                      onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })}
                      placeholder="1234567890"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2 mt-6">
                  <Button onClick={editingProduct ? handleEditProduct : handleAddProduct} disabled={!productForm.name.trim() || !productForm.line}>
                    {editingProduct ? 'حفظ التغييرات' : 'إضافة المنتج'}
                  </Button>
                  <Button variant="outline" onClick={() => setProductDialogOpen(false)}>
                    إلغاء
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((product) => {
              const line = getLineInfo(product.line);
              const statusBadge = getStatusBadge(product.status);
              const isLowStock = product.quantity <= product.minStock;
              
              return (
                <Card key={product.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {line && (
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: line.color }}
                          />
                        )}
                        <CardTitle className="text-lg">{product.name}</CardTitle>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openEditProductDialog(product)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>حذف المنتج</AlertDialogTitle>
                              <AlertDialogDescription>
                                هل أنت متأكد من حذف منتج "{product.name}"؟ هذا الإجراء لا يمكن التراجع عنه.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteProduct(product)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                حذف
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={statusBadge.className}>
                        {statusBadge.label}
                      </Badge>
                      {isLowStock && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          مخزون منخفض
                        </Badge>
                      )}
                    </div>
                    
                    {product.description && (
                      <p className="text-sm text-muted-foreground mt-2">{product.description}</p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">السعر:</span>
                        <span className="font-semibold flex items-center gap-1">
                          {product.price.toFixed(2)} ج.م
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">الكمية:</span>
                        <span className={isLowStock ? 'text-red-600 font-semibold' : ''}>
                          {product.quantity}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">الخط:</span>
                        <span>{product.line}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">SKU:</span>
                        <code className="text-xs bg-muted px-1 rounded">{product.sku}</code>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || selectedLine !== 'all' || selectedStatus !== 'all' 
                  ? 'لا توجد منتجات تطابق الفلترة المحددة' 
                  : 'لم يتم إضافة أي منتجات بعد'}
              </p>
            </div>
          )}
        </TabsContent>

        {/* Lines Tab */}
        <TabsContent value="categories" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">خطوط المنتجات</h3>
              <p className="text-sm text-muted-foreground">إدارة خطوط وتصنيفات المنتجات</p>
            </div>
            
            <Dialog open={lineDialogOpen} onOpenChange={setLineDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetLineForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  إضافة خط
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingLine ? 'تعديل الخط' : 'إضافة خط جديد'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="line-name">اسم الخط</Label>
                    <Input
                      id="line-name"
                      value={lineForm.name}
                      onChange={(e) => setLineForm({ ...lineForm, name: e.target.value })}
                      placeholder="مثال: أدوية"
                    />
                  </div>
                  <div>
                    <Label htmlFor="line-description">الوصف (اختياري)</Label>
                    <Textarea
                      id="line-description"
                      value={lineForm.description}
                      onChange={(e) => setLineForm({ ...lineForm, description: e.target.value })}
                      placeholder="وصف الخط..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>اللون</Label>
                    <div className="flex gap-2 mt-2">
                      {LINE_COLORS.map((color) => (
                        <button
                          key={color}
                          className={`w-8 h-8 rounded-full border-2 ${
                            lineForm.color === color ? 'border-black' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setLineForm({ ...lineForm, color })}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={editingLine ? handleEditLine : handleAddLine} disabled={!lineForm.name.trim()}>
                      {editingLine ? 'حفظ التغييرات' : 'إضافة الخط'}
                    </Button>
                    <Button variant="outline" onClick={() => setLineDialogOpen(false)}>
                      إلغاء
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {productLines.map((line) => {
              const lineProductCount = products.filter(p => p.line === line.name).length;
              
              return (
                <Card key={line.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: line.color }}
                        />
                        <CardTitle className="text-lg">{line.name}</CardTitle>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openEditLineDialog(line)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>حذف الخط</AlertDialogTitle>
                              <AlertDialogDescription>
                                هل أنت متأكد من حذف خط "{line.name}"؏ 
                                {lineProductCount > 0 && ` يحتوي هذا الخط على ${lineProductCount} منتج.`}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteLine(line)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                حذف
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    {line.description && (
                      <p className="text-sm text-muted-foreground">{line.description}</p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{lineProductCount} منتج</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold">إدارة المخزون</h3>
            <p className="text-sm text-muted-foreground">مراقبة مستويات المخزون والتنبيهات</p>
          </div>

          {lowStockProducts.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-800 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  تنبيهات المخزون المنخفض
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {lowStockProducts.map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-2 bg-white rounded border">
                      <div>
                        <span className="font-medium">{product.name}</span>
                        <span className="text-sm text-muted-foreground ml-2">({product.sku})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-xs">
                          {product.quantity} متبقي
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          الحد الأدنى: {product.minStock}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                  <div>
                    <div className="text-2xl font-bold">
                      {products.filter(p => p.quantity > p.minStock && p.status === 'active').length}
                    </div>
                    <div className="text-sm text-muted-foreground">منتجات متوفرة</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                  <div>
                    <div className="text-2xl font-bold">
                      {lowStockProducts.length}
                    </div>
                    <div className="text-sm text-muted-foreground">مخزون منخفض</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Clock className="h-8 w-8 text-gray-500" />
                  <div>
                    <div className="text-2xl font-bold">
                      {products.filter(p => p.status === 'inactive').length}
                    </div>
                    <div className="text-sm text-muted-foreground">منتجات غير نشطة</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>جميع المنتجات - حالة المخزون</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {products.map((product) => {
                  const isLowStock = product.quantity <= product.minStock;
                  const stockPercentage = Math.min((product.quantity / (product.minStock * 2)) * 100, 100);
                  
                  return (
                    <div key={product.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{product.name}</span>
                          <code className="text-xs bg-muted px-1 rounded">{product.sku}</code>
                          {isLowStock && (
                            <Badge variant="destructive" className="text-xs">
                              مخزون منخفض
                            </Badge>
                          )}
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 mt-2">
                          <div 
                            className={`h-2 rounded-full transition-all ${
                              isLowStock ? 'bg-red-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${stockPercentage}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="font-semibold">{product.quantity}</div>
                        <div className="text-xs text-muted-foreground">الحد الأدنى: {product.minStock}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}