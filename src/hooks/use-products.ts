"use client";

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

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
  createdAt: Date;
  updatedAt: Date;
}

export interface Line {
  id: string;
  name: string;
  description?: string;
  color: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductFilters {
  searchTerm?: string;
  line?: string;
  status?: string;
  brand?: string;
  supplier?: string;
  minPrice?: number;
  maxPrice?: number;
  lowStock?: boolean;
  expiredOnly?: boolean;
}

export function useProducts() {
  const { toast } = useToast();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // وظيفة لجلب المنتجات من API
  const fetchProducts = async () => {
    try {
      setLoading(true);
      // في التطبيق الحقيقي، هذا سيكون API call
      // const response = await fetch('/api/products');
      // const data = await response.json();
      
      // بيانات وهمية للاختبار
      const mockProducts: Product[] = [
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
          tags: ['مسكن', 'خافض حرارة'],
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-15')
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
          tags: ['ضمادة', 'جروح'],
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-16')
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
          expiryDate: new Date('2025-12-31'),
          status: 'active',
          tags: ['فيتامين', 'مكمل'],
          createdAt: new Date('2024-01-03'),
          updatedAt: new Date('2024-01-17')
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
          tags: ['ضغط دم', 'قياس'],
          createdAt: new Date('2024-01-04'),
          updatedAt: new Date('2024-01-18')
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
          tags: ['مسيل دم', 'قلب'],
          createdAt: new Date('2024-01-05'),
          updatedAt: new Date('2024-01-19')
        }
      ];

      setProducts(mockProducts);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ في تحميل المنتجات');
      toast({
        title: "خطأ في تحميل المنتجات",
        description: "تعذر تحميل قائمة المنتجات",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // وظيفة لجلب الخطوط من API
  const fetchLines = async () => {
    try {
      // في التطبيق الحقيقي، هذا سيكون API call
      // const response = await fetch('/api/lines');
      // const data = await response.json();
      
      // بيانات وهمية للاختبار
      const mockLines: Line[] = [
        {
          id: 'line-1',
          name: 'خط الأدوية',
          description: 'الأدوية والعقاقير الطبية',
          color: '#3B82F6',
          isActive: true,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-15')
        },
        {
          id: 'line-2',
          name: 'خط المستلزمات',
          description: 'أدوات ومستلزمات طبية',
          color: '#EF4444',
          isActive: true,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-15')
        },
        {
          id: 'line-3',
          name: 'خط المكملات',
          description: 'فيتامينات ومكملات غذائية',
          color: '#10B981',
          isActive: true,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-15')
        },
        {
          id: 'line-4',
          name: 'خط الأجهزة',
          description: 'معدات وأجهزة طبية',
          color: '#F59E0B',
          isActive: true,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-15')
        }
      ];

      setLines(mockLines);
    } catch (err) {
      toast({
        title: "خطأ في تحميل الخطوط",
        description: "تعذر تحميل قائمة الخطوط",
        variant: "destructive"
      });
    }
  };

  // فلترة المنتجات
  const filterProducts = (filters: ProductFilters): Product[] => {
    return products.filter(product => {
      // البحث النصي
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesSearch = 
          product.name.toLowerCase().includes(searchLower) ||
          product.description?.toLowerCase().includes(searchLower) ||
          product.sku.toLowerCase().includes(searchLower) ||
          product.brand?.toLowerCase().includes(searchLower) ||
          product.tags?.some(tag => tag.toLowerCase().includes(searchLower));
        
        if (!matchesSearch) return false;
      }

      // فلترة حسب الخط
      if (filters.line && filters.line !== 'all') {
        if (product.line !== filters.line) return false;
      }

      // فلترة حسب الحالة
      if (filters.status && filters.status !== 'all') {
        if (product.status !== filters.status) return false;
      }

      // فلترة حسب الماركة
      if (filters.brand && product.brand !== filters.brand) return false;

      // فلترة حسب المورد
      if (filters.supplier && product.supplier !== filters.supplier) return false;

      // فلترة حسب السعر
      if (filters.minPrice !== undefined && product.price < filters.minPrice) return false;
      if (filters.maxPrice !== undefined && product.price > filters.maxPrice) return false;

      // فلترة المخزون المنخفض
      if (filters.lowStock && product.quantity > product.minStock) return false;

      // فلترة المنتجات منتهية الصلاحية
      if (filters.expiredOnly) {
        if (!product.expiryDate || new Date(product.expiryDate) >= new Date()) return false;
      }

      return true;
    });
  };

  // وظيفة لإضافة منتج جديد
  const addProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      // في التطبيق الحقيقي، هذا سيكون API call
      // const response = await fetch('/api/products', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(productData)
      // });
      // const newProduct = await response.json();
      
      // محاكاة إضافة منتج
      const newProduct: Product = {
        ...productData,
        id: `prod-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      setProducts(prev => [...prev, newProduct]);
      toast({
        title: "تم إضافة المنتج",
        description: `تم إضافة ${newProduct.name} بنجاح`
      });
      
      return newProduct;
    } catch (err) {
      toast({
        title: "خطأ في إضافة المنتج",
        description: "تعذر إضافة المنتج الجديد",
        variant: "destructive"
      });
      throw err;
    }
  };

  // وظيفة لتحديث منتج
  const updateProduct = async (id: string, productData: Partial<Product>) => {
    try {
      // في التطبيق الحقيقي، هذا سيكون API call
      // const response = await fetch(`/api/products/${id}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(productData)
      // });
      // const updatedProduct = await response.json();
      
      // محاكاة تحديث منتج
      setProducts(prev => 
        prev.map(product => 
          product.id === id 
            ? { ...product, ...productData, updatedAt: new Date() }
            : product
        )
      );

      toast({
        title: "تم تحديث المنتج",
        description: "تم حفظ التغييرات بنجاح"
      });
    } catch (err) {
      toast({
        title: "خطأ في تحديث المنتج",
        description: "تعذر حفظ التغييرات",
        variant: "destructive"
      });
      throw err;
    }
  };

  // وظيفة لحذف منتج
  const deleteProduct = async (id: string) => {
    try {
      // في التطبيق الحقيقي، هذا سيكون API call
      // await fetch(`/api/products/${id}`, { method: 'DELETE' });
      
      // محاكاة حذف منتج
      setProducts(prev => prev.filter(product => product.id !== id));
      
      toast({
        title: "تم حذف المنتج",
        description: "تم حذف المنتج من النظام"
      });
    } catch (err) {
      toast({
        title: "خطأ في حذف المنتج",
        description: "تعذر حذف المنتج",
        variant: "destructive"
      });
      throw err;
    }
  };

  // تحميل البيانات عند تشغيل المكون
  useEffect(() => {
    fetchProducts();
    fetchLines();
  }, []);

  // إحصائيات المنتجات
  const getProductStats = () => {
    const totalProducts = products.length;
    const activeProducts = products.filter(p => p.status === 'active').length;
    const lowStockProducts = products.filter(p => p.quantity <= p.minStock).length;
    const outOfStockProducts = products.filter(p => p.status === 'out_of_stock').length;
    const expiredProducts = products.filter(p => 
      p.expiryDate && new Date(p.expiryDate) < new Date()
    ).length;
    
    return {
      totalProducts,
      activeProducts,
      lowStockProducts,
      outOfStockProducts,
      expiredProducts
    };
  };

  // الحصول على منتج بواسطة ID
  const getProductById = (id: string): Product | undefined => {
    return products.find(product => product.id === id);
  };

  // الحصول على خط بواسطة الاسم
  const getLineByName = (name: string): Line | undefined => {
    return lines.find(line => line.name === name);
  };

  return {
    products,
    lines,
    loading,
    error,
    // الوظائف
    fetchProducts,
    fetchLines,
    filterProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    getProductStats,
    getProductById,
    getLineByName
  };
}