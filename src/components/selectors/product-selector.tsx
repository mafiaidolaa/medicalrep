"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Search, Check, X, DollarSign, Package2, AlertTriangle, Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Product {
  id: string;
  name: string;
  description?: string;
  line: string;
  price: number;
  cost?: number;
  quantity: number;
  minStock: number;
  maxStock?: number;
  sku: string;
  barcode?: string;
  unit: string;
  brand?: string;
  supplier?: string;
  expiryDate?: Date;
  manufacturingDate?: Date;
  storageLocation?: string;
  notes?: string;
  tags?: string[];
  status: 'active' | 'inactive' | 'discontinued' | 'out_of_stock';
}

export interface Line {
  id: string;
  name: string;
  description?: string;
  color: string;
  isActive: boolean;
}

export interface SelectedProduct extends Product {
  selectedQuantity: number;
  totalPrice: number;
}

interface ProductSelection {
  products: SelectedProduct[];
  totalAmount: number;
}

interface ProductSelectorProps {
  value?: ProductSelection;
  onChange?: (selection: ProductSelection) => void;
  placeholder?: string;
  allowEmpty?: boolean;
  mode?: 'single' | 'multiple';
  showQuantity?: boolean;
  showPricing?: boolean;
  maxQuantityPerProduct?: number;
  className?: string;
}

// Default lines for demo - in real app this would come from API/context
const DEFAULT_LINES: Line[] = [
  { id: 'line-1', name: 'خط الأدوية', description: 'الأدوية والعقاقير الطبية', color: '#3B82F6', isActive: true },
  { id: 'line-2', name: 'خط المستلزمات', description: 'أدوات ومستلزمات طبية', color: '#EF4444', isActive: true },
  { id: 'line-3', name: 'خط المكملات', description: 'فيتامينات ومكملات غذائية', color: '#10B981', isActive: true },
  { id: 'line-4', name: 'خط الأجهزة', description: 'معدات وأجهزة طبية', color: '#F59E0B', isActive: true }
];

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'باراسيتامول 500مجم',
    description: 'أقراص مسكن للألم وخافض للحرارة',
    line: 'خط الأدوية',
    price: 25.50,
    cost: 15.00,
    quantity: 100,
    minStock: 20,
    maxStock: 200,
    sku: 'PRD-PAR-001',
    unit: 'علبة',
    brand: 'فارما بلس',
    supplier: 'شركة الأدوية المصرية',
    status: 'active',
    tags: ['مسكن', 'خافض حرارة']
  },
  {
    id: 'prod-2',
    name: 'ضمادات طبية كبيرة',
    description: 'ضمادات معقمة للجروح',
    line: 'خط المستلزمات',
    price: 12.00,
    cost: 8.00,
    quantity: 50,
    minStock: 10,
    maxStock: 100,
    sku: 'PRD-BND-002',
    unit: 'حبة',
    brand: 'ميديكال كير',
    status: 'active',
    tags: ['ضمادة', 'جروح']
  },
  {
    id: 'prod-3',
    name: 'فيتامين د 1000 وحدة',
    description: 'مكمل غذائي فيتامين د',
    line: 'خط المكملات',
    price: 45.00,
    cost: 30.00,
    quantity: 75,
    minStock: 15,
    maxStock: 150,
    sku: 'PRD-VTD-003',
    unit: 'علبة',
    brand: 'نيوتري فيت',
    status: 'active',
    tags: ['فيتامين', 'مكمل']
  },
  {
    id: 'prod-4',
    name: 'جهاز قياس الضغط',
    description: 'جهاز قياس ضغط الدم الرقمي',
    line: 'خط الأجهزة',
    price: 250.00,
    cost: 180.00,
    quantity: 5,
    minStock: 2,
    maxStock: 10,
    sku: 'PRD-BP-004',
    unit: 'جهاز',
    brand: 'أومرون',
    status: 'active',
    tags: ['ضغط دم', 'قياس']
  },
  {
    id: 'prod-5',
    name: 'أسبرين 75مجم',
    description: 'أقراص مسيلة للدم',
    line: 'خط الأدوية',
    price: 18.75,
    cost: 12.50,
    quantity: 3,
    minStock: 25,
    maxStock: 100,
    sku: 'PRD-ASP-005',
    unit: 'علبة',
    brand: 'بايير',
    status: 'active',
    tags: ['مسيل دم', 'قلب']
  }
];

export function ProductSelector({
  value = { products: [], totalAmount: 0 },
  onChange,
  placeholder = "اختر المنتجات",
  allowEmpty = true,
  mode = 'multiple',
  showQuantity = true,
  showPricing = true,
  maxQuantityPerProduct = 999,
  className
}: ProductSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLine, setSelectedLine] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('active');
  const [localSelection, setLocalSelection] = useState<ProductSelection>(value);
  
  // In a real app, these would come from context/API
  const [products] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [lines] = useState<Line[]>(DEFAULT_LINES);

  useEffect(() => {
    setLocalSelection(value);
  }, [value]);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesLine = selectedLine === 'all' || product.line === selectedLine;
    const matchesStatus = selectedStatus === 'all' || product.status === selectedStatus;
    return matchesSearch && matchesLine && matchesStatus;
  });

  const getLineInfo = (lineName: string) => {
    return lines.find(l => l.name === lineName);
  };

  const isProductSelected = (productId: string) => {
    return localSelection.products.some(p => p.id === productId);
  };

  const getSelectedProduct = (productId: string) => {
    return localSelection.products.find(p => p.id === productId);
  };

  const handleProductToggle = (product: Product) => {
    if (mode === 'single') {
      // Single mode: replace selection
      const newSelection: ProductSelection = {
        products: [{
          ...product,
          selectedQuantity: 1,
          totalPrice: product.price
        }],
        totalAmount: product.price
      };
      setLocalSelection(newSelection);
      onChange?.(newSelection);
      setOpen(false);
      return;
    }

    // Multiple mode: add/remove from selection
    const isSelected = isProductSelected(product.id);
    let newProducts: SelectedProduct[];

    if (isSelected) {
      // Remove product
      newProducts = localSelection.products.filter(p => p.id !== product.id);
    } else {
      // Add product
      const newSelectedProduct: SelectedProduct = {
        ...product,
        selectedQuantity: 1,
        totalPrice: product.price
      };
      newProducts = [...localSelection.products, newSelectedProduct];
    }

    const totalAmount = newProducts.reduce((sum, p) => sum + p.totalPrice, 0);
    const newSelection: ProductSelection = {
      products: newProducts,
      totalAmount
    };

    setLocalSelection(newSelection);
  };

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    const product = products.find(p => p.id === productId);
    if (!product) return;

    // Check stock availability
    if (newQuantity > product.quantity) {
      newQuantity = product.quantity;
    }

    // Check max quantity limit
    if (newQuantity > maxQuantityPerProduct) {
      newQuantity = maxQuantityPerProduct;
    }

    const newProducts = localSelection.products.map(p => {
      if (p.id === productId) {
        return {
          ...p,
          selectedQuantity: newQuantity,
          totalPrice: p.price * newQuantity
        };
      }
      return p;
    });

    const totalAmount = newProducts.reduce((sum, p) => sum + p.totalPrice, 0);
    const newSelection: ProductSelection = {
      products: newProducts,
      totalAmount
    };

    setLocalSelection(newSelection);
  };

  const handleConfirm = () => {
    onChange?.(localSelection);
    setOpen(false);
  };

  const handleClear = () => {
    const emptySelection: ProductSelection = { products: [], totalAmount: 0 };
    setLocalSelection(emptySelection);
    onChange?.(emptySelection);
    setOpen(false);
  };

  const getDisplayValue = () => {
    if (localSelection.products.length === 0) return placeholder;
    
    if (mode === 'single') {
      const product = localSelection.products[0];
      return `${product.name}${showQuantity && product.selectedQuantity > 1 ? ` (${product.selectedQuantity})` : ''}`;
    }

    return `${localSelection.products.length} منتج محدد${showPricing ? ` - ${localSelection.totalAmount.toFixed(2)} ج.م` : ''}`;
  };

  const isLowStock = (product: Product) => {
    return product.quantity <= product.minStock;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            localSelection.products.length === 0 && "text-muted-foreground",
            className
          )}
        >
          <div className="flex items-center gap-2 w-full">
            <Package className="h-4 w-4" />
            <span className="flex-1 truncate">{getDisplayValue()}</span>
            {localSelection.products.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {localSelection.products.length}
              </Badge>
            )}
          </div>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-5xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {mode === 'single' ? 'اختر منتج' : 'اختر المنتجات'}
            {localSelection.products.length > 0 && (
              <Badge variant="secondary">
                {localSelection.products.length} محدد
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="البحث في المنتجات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedLine} onValueChange={setSelectedLine}>
              <SelectTrigger>
                <SelectValue placeholder="تصفية حسب الخط" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الخطوط</SelectItem>
                {lines.filter(line => line.isActive).map((line) => (
                  <SelectItem key={line.id} value={line.name}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: line.color }}
                      />
                      {line.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="تصفية حسب الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="inactive">غير نشط</SelectItem>
                <SelectItem value="discontinued">متوقف</SelectItem>
                <SelectItem value="out_of_stock">نفد المخزون</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Selected Products Summary */}
          {localSelection.products.length > 0 && (
            <Card className="bg-muted/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">المنتجات المحددة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {localSelection.products.map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-2 bg-background rounded border">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: getLineInfo(product.line)?.color || '#6B7280' }}
                        />
                        <div>
                          <div className="font-medium text-sm">{product.name}</div>
                          <div className="text-xs text-muted-foreground">{product.sku}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {showQuantity && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleQuantityChange(product.id, product.selectedQuantity - 1)}
                              disabled={product.selectedQuantity <= 1}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-sm font-medium min-w-[2rem] text-center">
                              {product.selectedQuantity}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleQuantityChange(product.id, product.selectedQuantity + 1)}
                              disabled={product.selectedQuantity >= Math.min(product.quantity, maxQuantityPerProduct)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        {showPricing && (
                          <Badge variant="secondary" className="text-xs">
                            {product.totalPrice.toFixed(2)} ج.م
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => handleProductToggle(product)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                {showPricing && localSelection.products.length > 1 && (
                  <div className="flex justify-between items-center pt-2 mt-2 border-t">
                    <span className="font-semibold">الإجمالي:</span>
                    <Badge variant="default" className="text-sm">
                      {localSelection.totalAmount.toFixed(2)} ج.م
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Products Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Package2 className="h-5 w-5 text-purple-500" />
                  المنتجات المتاحة ({filteredProducts.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-80">
                <div className="space-y-2">
                  {filteredProducts.map((product) => {
                    const line = getLineInfo(product.line);
                    const isSelected = isProductSelected(product.id);
                    const selectedProduct = getSelectedProduct(product.id);
                    const lowStock = isLowStock(product);
                    const isExpired = product.expiryDate && new Date(product.expiryDate) < new Date();
                    
                    return (
                      <div
                        key={product.id}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                          isSelected 
                            ? "border-primary bg-primary/5" 
                            : "border-border hover:border-primary/50",
                          (product.status !== 'active' || isExpired) && "opacity-60"
                        )}
                        onClick={() => product.status === 'active' && !isExpired && handleProductToggle(product)}
                      >
                        <div className="flex items-center gap-4">
                          {line && (
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: line.color }}
                            />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className="font-medium">{product.name}</div>
                              {lowStock && (
                                <Badge variant="destructive" className="text-xs">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  مخزون منخفض
                                </Badge>
                              )}
                              {isExpired && (
                                <Badge variant="destructive" className="text-xs">
                                  منتهي الصلاحية
                                </Badge>
                              )}
                              {product.status !== 'active' && (
                                <Badge variant="secondary" className="text-xs">
                                  {product.status === 'inactive' ? 'غير نشط' : 
                                   product.status === 'discontinued' ? 'متوقف' : 'نفد المخزون'}
                                </Badge>
                              )}
                            </div>
                            {product.description && (
                              <div className="text-sm text-muted-foreground">{product.description}</div>
                            )}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                              <span>الخط: {product.line}</span>
                              <span>SKU: {product.sku}</span>
                              <span>المتاح: {product.quantity} {product.unit}</span>
                              {product.brand && <span>الماركة: {product.brand}</span>}
                              {showPricing && (
                                <span className="flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  {product.price.toFixed(2)} ج.م
                                </span>
                              )}
                            </div>
                            {product.tags && product.tags.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {product.tags.slice(0, 3).map((tag, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {isSelected && selectedProduct && showQuantity && (
                            <Badge variant="secondary" className="text-xs">
                              الكمية: {selectedProduct.selectedQuantity}
                            </Badge>
                          )}
                          {isSelected && (
                            <Check className="h-5 w-5 text-primary" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>لا توجد منتجات تطابق الفلترة المحددة</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            {allowEmpty && localSelection.products.length > 0 && (
              <Button variant="outline" onClick={handleClear}>
                <X className="h-4 w-4 mr-2" />
                مسح الاختيار
              </Button>
            )}
            <Button variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            {mode === 'multiple' && (
              <Button 
                onClick={handleConfirm}
                disabled={localSelection.products.length === 0}
              >
                <Check className="h-4 w-4 mr-2" />
                تأكيد الاختيار ({localSelection.products.length})
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}