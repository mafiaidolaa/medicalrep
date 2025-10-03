"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  Search, Package, Plus, Minus, X, ShoppingCart, 
  Calculator, Percent, AlertTriangle, CheckCircle, 
  Edit3, Trash2, Eye, Package2, Star, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Product, OrderItem } from '@/lib/types';
import Image from 'next/image';

interface EnhancedProductSelectorProps {
  products: Product[];
  value?: OrderItem[];
  onChange?: (items: OrderItem[], totals: { subtotal: number; totalDiscount: number; total: number }) => void;
  className?: string;
}

interface ProductWithQuantity extends Product {
  selectedQuantity: number;
  itemDiscount: number;
  itemNotes: string;
  unitPrice: number;
  total: number;
}

export function EnhancedProductSelector({
  products,
  value = [],
  onChange,
  className
}: EnhancedProductSelectorProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLine, setSelectedLine] = useState<string>('all');
  const [selectedItems, setSelectedItems] = useState<ProductWithQuantity[]>([]);

  // Initialize selected items from value
  useEffect(() => {
    if (value && value.length > 0) {
      const items = value.map(item => {
        const product = products.find(p => p.id === item.productId);
        if (!product) return null;
        
        return {
          ...product,
          selectedQuantity: item.quantity,
          itemDiscount: item.discount || 0,
          itemNotes: item.notes || '',
          unitPrice: item.unitPrice || item.price,
          total: item.total
        };
      }).filter(Boolean) as ProductWithQuantity[];
      
      setSelectedItems(items);
    }
  }, [value, products]);

  // Get unique product lines
  const productLines = useMemo(() => {
    const lines = [...new Set(products.map(p => p.line))];
    return lines.filter(Boolean).map(String);
  }, [products]);

  // Filter products for search dialog
  const filteredProducts = useMemo(() => {
    let filtered = products;
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(term) ||
        product.category?.toLowerCase().includes(term) ||
        product.line.toLowerCase().includes(term)
      );
    }
    
    // Filter by line
    if (selectedLine !== 'all') {
      filtered = filtered.filter(product => product.line === selectedLine);
    }
    
    return filtered;
  }, [products, searchTerm, selectedLine]);

  // Check if product is already selected
  const isProductSelected = (productId: string) => {
    return selectedItems.some(item => item.id === productId);
  };

  // Get stock status
  const getStockStatus = (product: Product) => {
    if (product.stock <= 0) return 'out_of_stock';
    if (product.stock <= (product.reorderLevel || 10)) return 'low_stock';
    if (product.stock <= 50) return 'medium_stock';
    return 'good_stock';
  };

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'out_of_stock': return 'bg-red-100 text-red-800 border-red-200';
      case 'low_stock': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'medium_stock': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'good_stock': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Add product to selection
  const addProduct = (product: Product, quantity: number = 1) => {
    if (isProductSelected(product.id)) return;
    
    const newItem: ProductWithQuantity = {
      ...product,
      selectedQuantity: quantity,
      itemDiscount: 0,
      itemNotes: '',
      unitPrice: product.price,
      total: product.price * quantity
    };
    
    const newItems = [...selectedItems, newItem];
    setSelectedItems(newItems);
    updateParent(newItems);
    setSearchOpen(false);
  };

  // Update item quantity
  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    
    const updatedItems = selectedItems.map(item => {
      if (item.id === productId) {
        const discountAmount = (item.unitPrice * quantity) * (item.itemDiscount / 100);
        const total = (item.unitPrice * quantity) - discountAmount;
        
        return {
          ...item,
          selectedQuantity: quantity,
          total: total
        };
      }
      return item;
    });
    
    setSelectedItems(updatedItems);
    updateParent(updatedItems);
  };

  // Update item discount
  const updateDiscount = (productId: string, discount: number) => {
    const updatedItems = selectedItems.map(item => {
      if (item.id === productId) {
        const discountAmount = (item.unitPrice * item.selectedQuantity) * (discount / 100);
        const total = (item.unitPrice * item.selectedQuantity) - discountAmount;
        
        return {
          ...item,
          itemDiscount: Math.max(0, Math.min(100, discount)),
          total: total
        };
      }
      return item;
    });
    
    setSelectedItems(updatedItems);
    updateParent(updatedItems);
  };

  // Update item notes
  const updateNotes = (productId: string, notes: string) => {
    const updatedItems = selectedItems.map(item => {
      if (item.id === productId) {
        return { ...item, itemNotes: notes };
      }
      return item;
    });
    
    setSelectedItems(updatedItems);
    updateParent(updatedItems);
  };

  // Remove item
  const removeItem = (productId: string) => {
    const updatedItems = selectedItems.filter(item => item.id !== productId);
    setSelectedItems(updatedItems);
    updateParent(updatedItems);
  };

  // Update parent component
  const updateParent = (items: ProductWithQuantity[]) => {
    const orderItems: OrderItem[] = items.map(item => ({
      productId: item.id,
      productName: item.name,
      quantity: item.selectedQuantity,
      price: item.total, // total price for this item
      unitPrice: item.unitPrice,
      discount: item.itemDiscount,
      total: item.total,
      notes: item.itemNotes || undefined
    }));

    const subtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.selectedQuantity), 0);
    const totalDiscount = items.reduce((sum, item) => {
      const itemSubtotal = item.unitPrice * item.selectedQuantity;
      const discountAmount = itemSubtotal * (item.itemDiscount / 100);
      return sum + discountAmount;
    }, 0);
    const total = subtotal - totalDiscount;

    onChange?.(orderItems, { subtotal, totalDiscount, total });
  };

  // Calculate totals
  const totals = useMemo(() => {
    const subtotal = selectedItems.reduce((sum, item) => sum + (item.unitPrice * item.selectedQuantity), 0);
    const totalDiscount = selectedItems.reduce((sum, item) => {
      const itemSubtotal = item.unitPrice * item.selectedQuantity;
      const discountAmount = itemSubtotal * (item.itemDiscount / 100);
      return sum + discountAmount;
    }, 0);
    const total = subtotal - totalDiscount;

    return { subtotal, totalDiscount, total };
  }, [selectedItems]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Add Products Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">المنتجات المحددة</h3>
        <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              إضافة منتجات
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>اختيار المنتجات</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Search and Filter */}
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="البحث في المنتجات..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                </div>
                
                <Select value={selectedLine} onValueChange={setSelectedLine}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="اختر الخط" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الخطوط</SelectItem>
                    {productLines.map(line => (
                      <SelectItem key={line} value={line}>{line}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Products Grid */}
              <ScrollArea className="h-96">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProducts.map(product => {
                    const stockStatus = getStockStatus(product);
                    const isSelected = isProductSelected(product.id);
                    
                    return (
                      <Card key={product.id} className={cn(
                        "cursor-pointer transition-colors",
                        isSelected ? "bg-accent border-primary" : "hover:bg-accent",
                        stockStatus === 'out_of_stock' && "opacity-50"
                      )}>
                        <CardContent className="p-4">
                          {/* Product Image */}
                          <div className="aspect-square w-full mb-3 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                            {product.imageUrl ? (
                              <Image 
                                src={product.imageUrl} 
                                alt={product.name}
                                width={120}
                                height={120}
                                className="object-cover"
                              />
                            ) : (
                              <Package2 className="h-12 w-12 text-muted-foreground" />
                            )}
                          </div>
                          
                          {/* Product Info */}
                          <div className="space-y-2">
                            <div className="flex items-start justify-between">
                              <h4 className="font-medium text-sm leading-tight">{product.name}</h4>
                              {isSelected && (
                                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                              )}
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-primary">
                                {product.price.toFixed(2)} ج.م
                              </span>
                              <Badge 
                                className={cn("text-xs", getStockStatusColor(stockStatus))}
                                variant="outline"
                              >
                                متاح: {product.stock}
                              </Badge>
                            </div>
                            
                            <Badge variant="secondary" className="text-xs">
                              {product.line}
                            </Badge>
                            
                            {/* Add Button */}
                            <Button
                              size="sm"
                              className="w-full"
                              disabled={stockStatus === 'out_of_stock' || isSelected}
                              onClick={() => addProduct(product)}
                            >
                              {isSelected ? 'مضاف بالفعل' : 'إضافة للطلب'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  
                  {filteredProducts.length === 0 && (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      لا توجد منتجات مطابقة للبحث
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Selected Items */}
      {selectedItems.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>لم يتم إضافة أي منتجات بعد</p>
            <p className="text-sm mt-1">اضغط على "إضافة منتجات" لبدء إنشاء الطلب</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {selectedItems.map((item, index) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Product Image */}
                  <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                    {item.imageUrl ? (
                      <Image 
                        src={item.imageUrl} 
                        alt={item.name}
                        width={64}
                        height={64}
                        className="object-cover"
                      />
                    ) : (
                      <Package2 className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  
                  {/* Product Details */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-muted-foreground">{item.line}</p>
                        <p className="text-sm text-primary font-semibold">
                          {item.unitPrice.toFixed(2)} ج.م / الوحدة
                        </p>
                      </div>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>حذف المنتج</AlertDialogTitle>
                            <AlertDialogDescription>
                              هل أنت متأكد من حذف "{item.name}" من الطلب؟
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => removeItem(item.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              حذف
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    
                    {/* Quantity and Discount Controls */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Quantity */}
                      <div>
                        <Label className="text-xs text-muted-foreground">الكمية</Label>
                        <div className="flex items-center mt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.id, item.selectedQuantity - 1)}
                            disabled={item.selectedQuantity <= 1}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            min="1"
                            max={item.stock}
                            value={item.selectedQuantity}
                            onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                            className="w-20 mx-2 text-center"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.id, item.selectedQuantity + 1)}
                            disabled={item.selectedQuantity >= item.stock}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          متاح: {item.stock} وحدة
                        </p>
                      </div>
                      
                      {/* Discount */}
                      <div>
                        <Label className="text-xs text-muted-foreground">خصم (%)</Label>
                        <div className="flex items-center mt-1">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={item.itemDiscount}
                            onChange={(e) => updateDiscount(item.id, parseFloat(e.target.value) || 0)}
                            className="text-center"
                          />
                          <Percent className="h-4 w-4 ml-2 text-muted-foreground" />
                        </div>
                      </div>
                      
                      {/* Item Total */}
                      <div>
                        <Label className="text-xs text-muted-foreground">الإجمالي</Label>
                        <div className="mt-1">
                          <div className="text-lg font-bold text-primary">
                            {item.total.toFixed(2)} ج.م
                          </div>
                          {item.itemDiscount > 0 && (
                            <div className="text-xs text-muted-foreground">
                              <span className="line-through">
                                {(item.unitPrice * item.selectedQuantity).toFixed(2)} ج.م
                              </span>
                              <span className="text-green-600 mr-2">
                                (-{((item.unitPrice * item.selectedQuantity) * (item.itemDiscount / 100)).toFixed(2)} ج.م)
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Notes */}
                    <div className="mt-3">
                      <Label className="text-xs text-muted-foreground">ملاحظات على المنتج</Label>
                      <Textarea
                        placeholder="ملاحظات خاصة بهذا المنتج..."
                        value={item.itemNotes}
                        onChange={(e) => updateNotes(item.id, e.target.value)}
                        className="mt-1 resize-none"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {/* Order Summary */}
          <Card className="border-2 border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                ملخص الطلب
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>المجموع الفرعي:</span>
                  <span>{totals.subtotal.toFixed(2)} ج.م</span>
                </div>
                
                {totals.totalDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>إجمالي الخصم:</span>
                    <span>-{totals.totalDiscount.toFixed(2)} ج.م</span>
                  </div>
                )}
                
                <Separator />
                
                <div className="flex justify-between text-lg font-bold">
                  <span>الإجمالي النهائي:</span>
                  <span className="text-primary">{totals.total.toFixed(2)} ج.م</span>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  إجمالي المنتجات: {selectedItems.length} • إجمالي الوحدات: {selectedItems.reduce((sum, item) => sum + item.selectedQuantity, 0)}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}