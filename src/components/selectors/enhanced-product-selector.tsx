"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Package, 
  Search, 
  Plus, 
  Minus, 
  ShoppingCart, 
  AlertTriangle, 
  Tag,
  Route,
  DollarSign,
  Calendar,
  Building2,
  Barcode
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Product {
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
  status: 'active' | 'inactive' | 'discontinued' | 'out_of_stock';
  tags?: string[];
}

interface SelectedProduct extends Product {
  selectedQuantity: number;
  totalPrice: number;
}

interface EnhancedProductSelectorProps {
  products: Product[];
  selectedProducts: SelectedProduct[];
  onProductsChange: (products: SelectedProduct[]) => void;
  maxSelections?: number;
  showPricing?: boolean;
  allowOutOfStock?: boolean;
  filterByLine?: string;
  title?: string;
  className?: string;
}

export default function EnhancedProductSelector({
  products,
  selectedProducts,
  onProductsChange,
  maxSelections,
  showPricing = true,
  allowOutOfStock = false,
  filterByLine,
  title = "اختيار المنتجات",
  className = ""
}: EnhancedProductSelectorProps) {
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLine, setSelectedLine] = useState(filterByLine || 'all');
  const [selectedStatus, setSelectedStatus] = useState('active');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'quantity'>('name');
  
  // استخراج الخطوط المتاحة من المنتجات
  const availableLines = [...new Set(products.map(p => p.line))].sort();
  
  // فلترة وترتيب المنتجات
  const filteredProducts = products
    .filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesLine = selectedLine === 'all' || product.line === selectedLine;
      const matchesStatus = selectedStatus === 'all' || product.status === selectedStatus;
      const isAvailable = allowOutOfStock || (product.quantity > 0 && product.status === 'active');
      
      return matchesSearch && matchesLine && matchesStatus && isAvailable;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name, 'ar');
        case 'price':
          return a.price - b.price;
        case 'quantity':
          return b.quantity - a.quantity;
        default:
          return 0;
      }
    });

  // التحقق من إمكانية إضافة المنتج
  const canAddProduct = (product: Product) => {
    if (maxSelections && selectedProducts.length >= maxSelections) return false;
    if (!allowOutOfStock && product.quantity <= 0) return false;
    if (product.status !== 'active') return false;
    return !selectedProducts.some(sp => sp.id === product.id);
  };

  // إضافة منتج للاختيارات
  const handleAddProduct = (product: Product) => {
    if (!canAddProduct(product)) {
      toast({
        title: "لا يمكن إضافة المنتج",
        description: "المنتج غير متوفر أو تم اختياره مسبقاً",
        variant: "destructive"
      });
      return;
    }

    const selectedProduct: SelectedProduct = {
      ...product,
      selectedQuantity: 1,
      totalPrice: product.price
    };

    onProductsChange([...selectedProducts, selectedProduct]);
    toast({
      title: "تمت الإضافة",
      description: `تم إضافة ${product.name} للطلبية`
    });
  };

  // إزالة منتج من الاختيارات
  const handleRemoveProduct = (productId: string) => {
    const updatedProducts = selectedProducts.filter(sp => sp.id !== productId);
    onProductsChange(updatedProducts);
    toast({
      title: "تم الحذف",
      description: "تم حذف المنتج من الطلبية"
    });
  };

  // تحديث كمية المنتج المحدد
  const handleQuantityChange = (productId: string, newQuantity: number) => {
    const updatedProducts = selectedProducts.map(sp => {
      if (sp.id === productId) {
        const maxAvailable = sp.quantity;
        const finalQuantity = Math.min(Math.max(1, newQuantity), maxAvailable);
        return {
          ...sp,
          selectedQuantity: finalQuantity,
          totalPrice: sp.price * finalQuantity
        };
      }
      return sp;
    });
    
    onProductsChange(updatedProducts);
  };

  // حساب الإجماليات
  const totalItems = selectedProducts.reduce((sum, sp) => sum + sp.selectedQuantity, 0);
  const totalAmount = selectedProducts.reduce((sum, sp) => sum + sp.totalPrice, 0);

  // حالة انتهاء صلاحية المنتج
  const isExpired = (product: Product) => {
    return product.expiryDate && new Date(product.expiryDate) < new Date();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {title}
            </div>
            {selectedProducts.length > 0 && (
              <Badge variant="secondary" className="px-3 py-1">
                {selectedProducts.length} منتج محدد
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* شريط البحث والفلاتر */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث في المنتجات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
            
            <Select value={selectedLine} onValueChange={setSelectedLine}>
              <SelectTrigger>
                <SelectValue placeholder="جميع الخطوط" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الخطوط</SelectItem>
                {availableLines.map(line => (
                  <SelectItem key={line} value={line}>
                    <div className="flex items-center gap-2">
                      <Route className="h-4 w-4" />
                      {line}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المنتجات</SelectItem>
                <SelectItem value="active">نشطة فقط</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={(value: 'name' | 'price' | 'quantity') => setSortBy(value)}>
              <SelectTrigger>
                <SelectValue placeholder="ترتيب حسب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">الاسم</SelectItem>
                <SelectItem value="price">السعر</SelectItem>
                <SelectItem value="quantity">الكمية المتاحة</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* قائمة المنتجات المتاحة */}
          <div className="max-h-80 overflow-y-auto border rounded-lg">
            {filteredProducts.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد منتجات متاحة</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{product.name}</h3>
                          {isExpired(product) && (
                            <Badge variant="destructive" className="text-xs">
                              <Calendar className="h-3 w-3 mr-1" />
                              منتهي الصلاحية
                            </Badge>
                          )}
                          {product.quantity <= product.minStock && (
                            <Badge variant="outline" className="text-xs text-orange-600">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              مخزون منخفض
                            </Badge>
                          )}
                        </div>
                        
                        {product.description && (
                          <p className="text-sm text-muted-foreground">{product.description}</p>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Route className="h-3 w-3" />
                            <span>{product.line}</span>
                          </div>
                          
                          {product.brand && (
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              <span>{product.brand}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-1">
                            <Barcode className="h-3 w-3" />
                            <span>{product.sku}</span>
                          </div>
                          
                          {product.tags && (
                            <div className="flex items-center gap-1">
                              <Tag className="h-3 w-3" />
                              <span>{product.tags.slice(0, 2).join(', ')}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4">
                          {showPricing && (
                            <div className="flex items-center gap-1 font-semibold text-green-600">
                              <DollarSign className="h-4 w-4" />
                              <span>{product.price.toFixed(2)} ج.م</span>
                            </div>
                          )}
                          
                          <div className={`text-sm ${product.quantity <= product.minStock ? 'text-orange-600 font-medium' : 'text-muted-foreground'}`}>
                            الكمية: {product.quantity} {product.unit}
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        onClick={() => handleAddProduct(product)}
                        disabled={!canAddProduct(product)}
                        size="sm"
                        className="ml-4"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* المنتجات المختارة */}
      {selectedProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                المنتجات المختارة ({selectedProducts.length})
              </div>
              {showPricing && (
                <div className="text-lg font-bold text-green-600">
                  إجمالي: {totalAmount.toFixed(2)} ج.م
                </div>
              )}
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-3">
              {selectedProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{product.name}</span>
                      <Badge variant="outline" className="text-xs">{product.line}</Badge>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      {showPricing && (
                        <span>{product.price.toFixed(2)} ج.م × </span>
                      )}
                      <span>{product.selectedQuantity} {product.unit}</span>
                      {showPricing && (
                        <span className="font-medium text-green-600 ml-2">
                          = {product.totalPrice.toFixed(2)} ج.م
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleQuantityChange(product.id, product.selectedQuantity - 1)}
                        disabled={product.selectedQuantity <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      
                      <Input
                        type="number"
                        min="1"
                        max={product.quantity}
                        value={product.selectedQuantity}
                        onChange={(e) => handleQuantityChange(product.id, parseInt(e.target.value) || 1)}
                        className="w-16 h-8 text-center"
                      />
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleQuantityChange(product.id, product.selectedQuantity + 1)}
                        disabled={product.selectedQuantity >= product.quantity}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveProduct(product.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            {/* ملخص الطلبية */}
            {showPricing && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    <span>إجمالي العناصر: {totalItems}</span>
                  </div>
                  <div className="text-lg font-bold">
                    المجموع الكلي: {totalAmount.toFixed(2)} ج.م
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}