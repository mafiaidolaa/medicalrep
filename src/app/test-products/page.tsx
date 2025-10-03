"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Package, 
  ShoppingCart, 
  TestTube, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Package2
} from 'lucide-react';

import { ProductSelector } from '@/components/selectors/product-selector';
import EnhancedProductSelector from '@/components/selectors/enhanced-product-selector';
import { useProducts } from '@/hooks/use-products';
import type { Product } from '@/hooks/use-products';

interface SelectedProduct {
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
  selectedQuantity: number;
  totalPrice: number;
}

export default function TestProductsPage() {
  // استخدام hook المنتجات
  const { 
    products, 
    lines, 
    loading, 
    error,
    getProductStats 
  } = useProducts();

  // Defensive normalization for lines (array of objects)
  const safeLines = Array.isArray(lines) ? lines : (lines ? Object.values(lines as any) : []);

  // حالة المنتجات المختارة للاختبار
  const [selectedProducts1, setSelectedProducts1] = useState<SelectedProduct[]>([]);
  const [selectedProducts2, setSelectedProducts2] = useState<SelectedProduct[]>([]);
  
  // إحصائيات المنتجات
  const stats = getProductStats();

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <Package className="h-12 w-12 mx-auto animate-pulse text-muted-foreground" />
            <p className="text-muted-foreground">جاري تحميل المنتجات...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-800">خطأ في تحميل البيانات</h3>
                <p className="text-red-600">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* العنوان الرئيسي */}
      <div className="flex items-center gap-3 mb-8">
        <TestTube className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">اختبار مكونات إدارة المنتجات</h1>
          <p className="text-muted-foreground">
            اختبار المكونات المحدثة لنظام إدارة المنتجات مع الخطوط الجديدة
          </p>
        </div>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">إجمالي المنتجات</p>
                <p className="text-xl font-semibold">{stats.totalProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">منتجات نشطة</p>
                <p className="text-xl font-semibold text-green-600">{stats.activeProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">مخزون منخفض</p>
                <p className="text-xl font-semibold text-orange-600">{stats.lowStockProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Package2 className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">نفد المخزون</p>
                <p className="text-xl font-semibold text-red-600">{stats.outOfStockProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">منتهية الصلاحية</p>
                <p className="text-xl font-semibold text-purple-600">{stats.expiredProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* عرض الخطوط المتاحة */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            الخطوط المتاحة ({safeLines.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {safeLines.map((line) => (
              <Badge 
                key={line.id} 
                variant="outline" 
                className="px-3 py-1"
                style={{ borderColor: line.color }}
              >
                <div 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: line.color }}
                />
                {line.name}
                {line.description && (
                  <span className="text-xs ml-2 opacity-70">
                    ({line.description})
                  </span>
                )}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* الاختبارات */}
      <Tabs defaultValue="basic-selector" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="basic-selector">Product Selector الأساسي</TabsTrigger>
          <TabsTrigger value="enhanced-selector">Enhanced Product Selector</TabsTrigger>
        </TabsList>

        {/* اختبار Product Selector الأساسي */}
        <TabsContent value="basic-selector" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                اختبار Product Selector الأساسي
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <h3 className="font-medium">اختيار متعدد مع التسعير:</h3>
                <ProductSelector 
                  mode="multiple"
                  showPricing={true}
                  showQuantity={true}
                  placeholder="اختر المنتجات للطلبية"
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <h3 className="font-medium">اختيار مفرد بدون تسعير:</h3>
                <ProductSelector 
                  mode="single"
                  showPricing={false}
                  showQuantity={false}
                  placeholder="اختر منتج واحد"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* اختبار Enhanced Product Selector */}
        <TabsContent value="enhanced-selector" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package2 className="h-5 w-5" />
                اختبار Enhanced Product Selector
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EnhancedProductSelector
                products={products}
                selectedProducts={selectedProducts1}
                onProductsChange={setSelectedProducts1}
                showPricing={true}
                allowOutOfStock={false}
                title="اختيار المنتجات للطلبية"
              />
              
              {/* عرض النتائج */}
              {selectedProducts1.length > 0 && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-2">
                    النتائج المختارة:
                  </h4>
                  <div className="text-sm text-blue-700 space-y-1">
                    <p>عدد المنتجات: {selectedProducts1.length}</p>
                    <p>إجمالي الكمية: {selectedProducts1.reduce((sum, p) => sum + p.selectedQuantity, 0)}</p>
                    <p>المبلغ الإجمالي: {selectedProducts1.reduce((sum, p) => sum + p.totalPrice, 0).toFixed(2)} ج.م</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* اختبار إضافي مع قيود */}
          <Card>
            <CardHeader>
              <CardTitle>اختبار مع قيود</CardTitle>
            </CardHeader>
            <CardContent>
              <EnhancedProductSelector
                products={products}
                selectedProducts={selectedProducts2}
                onProductsChange={setSelectedProducts2}
                maxSelections={3}
                showPricing={true}
                allowOutOfStock={true}
                filterByLine="خط الأدوية"
                title="اختر حتى 3 منتجات من خط الأدوية"
              />
              
              {/* عرض النتائج */}
              {selectedProducts2.length > 0 && (
                <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-800 mb-2">
                    النتائج المقيدة:
                  </h4>
                  <div className="text-sm text-green-700 space-y-1">
                    <p>عدد المنتجات: {selectedProducts2.length} / 3</p>
                    <p>الخطوط المختارة: {[...new Set(selectedProducts2.map(p => p.line))].join(', ')}</p>
                    <p>المبلغ الإجمالي: {selectedProducts2.reduce((sum, p) => sum + p.totalPrice, 0).toFixed(2)} ج.م</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* معلومات إضافية */}
      <Card>
        <CardHeader>
          <CardTitle>معلومات النظام</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">المنتجات حسب الخط:</h4>
              <div className="space-y-1">
                {safeLines.map((line) => {
                  const count = products.filter(p => p.line === line.name).length;
                  return (
                    <div key={line.id} className="flex justify-between">
                      <span>{line.name}:</span>
                      <span className="font-medium">{count} منتج</span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">المنتجات حسب الحالة:</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>نشط:</span>
                  <span className="font-medium text-green-600">{stats.activeProducts}</span>
                </div>
                <div className="flex justify-between">
                  <span>غير نشط:</span>
                  <span className="font-medium text-gray-600">
                    {products.filter(p => p.status === 'inactive').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>متوقف:</span>
                  <span className="font-medium text-red-600">
                    {products.filter(p => p.status === 'discontinued').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}