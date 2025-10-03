"use client";

import { useState, useEffect, useCallback } from 'react';
import { useProducts, Product as SettingsProduct } from './use-products';
import { Product, Order, OrderItem } from '@/types/orders';
import { useToast } from './use-toast';

// Convert between settings product format and orders product format
const convertSettingsProductToOrderProduct = (settingsProduct: SettingsProduct): Product => ({
  id: settingsProduct.id,
  name: settingsProduct.name,
  nameEn: settingsProduct.name, // Could be extended
  description: settingsProduct.description,
  price: settingsProduct.price,
  category: settingsProduct.line,
  categoryId: settingsProduct.line,
  inStock: settingsProduct.quantity,
  minStock: settingsProduct.minStock,
  maxStock: settingsProduct.maxStock,
  unit: settingsProduct.unit,
  barcode: settingsProduct.barcode,
  manufacturer: settingsProduct.supplier,
  expiryDate: settingsProduct.expiryDate?.toISOString(),
  isActive: settingsProduct.status === 'active',
  createdAt: settingsProduct.createdAt.toISOString(),
  updatedAt: settingsProduct.updatedAt.toISOString()
});

interface ProductReservation {
  productId: string;
  orderId: string;
  quantity: number;
  reservedAt: string;
  expiresAt: string;
  status: 'active' | 'expired' | 'fulfilled' | 'cancelled';
}

interface StockTransaction {
  id: string;
  productId: string;
  productName: string;
  type: 'order_reserve' | 'order_fulfill' | 'order_cancel' | 'order_return' | 'manual_adjustment';
  quantity: number;
  previousStock: number;
  newStock: number;
  orderId?: string;
  orderNumber?: string;
  reason?: string;
  userId: string;
  userName: string;
  timestamp: string;
}

export function useOrdersProductsIntegration() {
  const { toast } = useToast();
  const { 
    products: settingsProducts, 
    updateProduct,
    getProductById: getSettingsProductById 
  } = useProducts();
  
  const [reservations, setReservations] = useState<ProductReservation[]>([]);
  const [stockTransactions, setStockTransactions] = useState<StockTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  // Convert settings products to order products format
  const products: Product[] = settingsProducts.map(convertSettingsProductToOrderProduct);

  // Get available products (active and in stock)
  const getAvailableProducts = useCallback((filters?: {
    category?: string;
    minStock?: number;
    searchTerm?: string;
  }) => {
    return products.filter(product => {
      if (!product.isActive) return false;
      if (product.inStock <= 0) return false;
      
      if (filters?.category && product.category !== filters.category) return false;
      if (filters?.minStock && product.inStock < filters.minStock) return false;
      if (filters?.searchTerm) {
        const search = filters.searchTerm.toLowerCase();
        const matches = product.name.toLowerCase().includes(search) ||
                       product.description?.toLowerCase().includes(search) ||
                       product.barcode?.includes(search);
        if (!matches) return false;
      }
      
      return true;
    });
  }, [products]);

  // Reserve stock for order
  const reserveProductStock = useCallback(async (
    productId: string, 
    orderId: string, 
    quantity: number
  ): Promise<boolean> => {
    const product = products.find(p => p.id === productId);
    if (!product) {
      toast({
        title: "خطأ",
        description: "المنتج غير موجود",
        variant: "destructive"
      });
      return false;
    }

    // Check available stock (considering existing reservations)
    const activeReservations = reservations.filter(r => 
      r.productId === productId && 
      r.status === 'active' &&
      new Date(r.expiresAt) > new Date()
    );
    const reservedQuantity = activeReservations.reduce((sum, r) => sum + r.quantity, 0);
    const availableStock = product.inStock - reservedQuantity;

    if (availableStock < quantity) {
      toast({
        title: "مخزون غير كافي",
        description: `المخزون المتاح: ${availableStock} ${product.unit}`,
        variant: "destructive"
      });
      return false;
    }

    // Create reservation (expires in 30 minutes)
    const reservation: ProductReservation = {
      productId,
      orderId,
      quantity,
      reservedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      status: 'active'
    };

    setReservations(prev => [...prev, reservation]);

    // Record transaction
    const transaction: StockTransaction = {
      id: `trans-${Date.now()}-${Math.random()}`,
      productId,
      productName: product.name,
      type: 'order_reserve',
      quantity,
      previousStock: product.inStock,
      newStock: product.inStock, // Stock doesn't change on reservation
      orderId,
      reason: `حجز مخزون للطلب`,
      userId: 'current-user', // Should come from auth
      userName: 'المستخدم الحالي', // Should come from auth
      timestamp: new Date().toISOString()
    };

    setStockTransactions(prev => [transaction, ...prev]);

    toast({
      title: "تم حجز المخزون",
      description: `تم حجز ${quantity} ${product.unit} من ${product.name}`,
    });

    return true;
  }, [products, reservations, toast]);

  // Release reserved stock (when order is cancelled or expires)
  const releaseProductStock = useCallback(async (orderId: string): Promise<void> => {
    const orderReservations = reservations.filter(r => 
      r.orderId === orderId && r.status === 'active'
    );

    if (orderReservations.length === 0) return;

    // Mark reservations as cancelled
    setReservations(prev => 
      prev.map(r => 
        r.orderId === orderId && r.status === 'active'
          ? { ...r, status: 'cancelled' as const }
          : r
      )
    );

    // Record transactions
    for (const reservation of orderReservations) {
      const product = products.find(p => p.id === reservation.productId);
      if (!product) continue;

      const transaction: StockTransaction = {
        id: `trans-${Date.now()}-${Math.random()}`,
        productId: reservation.productId,
        productName: product.name,
        type: 'order_cancel',
        quantity: reservation.quantity,
        previousStock: product.inStock,
        newStock: product.inStock, // Stock doesn't change on release
        orderId,
        reason: 'إلغاء حجز المخزون',
        userId: 'current-user',
        userName: 'المستخدم الحالي',
        timestamp: new Date().toISOString()
      };

      setStockTransactions(prev => [transaction, ...prev]);
    }

    toast({
      title: "تم إلغاء حجز المخزون",
      description: "تم إلغاء حجز المخزون للطلب الملغي",
    });
  }, [products, reservations, toast]);

  // Fulfill order (deduct actual stock)
  const fulfillOrderStock = useCallback(async (order: Order): Promise<boolean> => {
    setLoading(true);
    let success = true;

    try {
      for (const item of order.items) {
        const settingsProduct = getSettingsProductById(item.productId);
        if (!settingsProduct) {
          toast({
            title: "خطأ",
            description: `المنتج ${item.productName} غير موجود`,
            variant: "destructive"
          });
          success = false;
          continue;
        }

        if (settingsProduct.quantity < item.quantity) {
          toast({
            title: "مخزون غير كافي",
            description: `المخزون المتاح لـ ${item.productName}: ${settingsProduct.quantity}`,
            variant: "destructive"
          });
          success = false;
          continue;
        }

        // Update actual stock
        await updateProduct(item.productId, {
          quantity: settingsProduct.quantity - item.quantity
        });

        // Mark reservation as fulfilled
        setReservations(prev => 
          prev.map(r => 
            r.orderId === order.id && 
            r.productId === item.productId && 
            r.status === 'active'
              ? { ...r, status: 'fulfilled' as const }
              : r
          )
        );

        // Record transaction
        const transaction: StockTransaction = {
          id: `trans-${Date.now()}-${Math.random()}`,
          productId: item.productId,
          productName: item.productName,
          type: 'order_fulfill',
          quantity: item.quantity,
          previousStock: settingsProduct.quantity,
          newStock: settingsProduct.quantity - item.quantity,
          orderId: order.id,
          orderNumber: order.orderNumber,
          reason: 'تنفيذ طلب',
          userId: 'current-user',
          userName: 'المستخدم الحالي',
          timestamp: new Date().toISOString()
        };

        setStockTransactions(prev => [transaction, ...prev]);
      }

      if (success) {
        toast({
          title: "تم تنفيذ الطلب",
          description: "تم خصم المخزون بنجاح",
        });
      }

      return success;
    } catch (error) {
      console.error('Error fulfilling order stock:', error);
      toast({
        title: "خطأ في تنفيذ الطلب",
        description: "حدث خطأ أثناء خصم المخزون",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [getSettingsProductById, updateProduct, toast]);

  // Return stock (when order is returned)
  const returnOrderStock = useCallback(async (order: Order, returnItems: Array<{
    productId: string;
    quantity: number;
  }>): Promise<boolean> => {
    setLoading(true);
    let success = true;

    try {
      for (const returnItem of returnItems) {
        const settingsProduct = getSettingsProductById(returnItem.productId);
        const orderItem = order.items.find(item => item.productId === returnItem.productId);
        
        if (!settingsProduct || !orderItem) {
          success = false;
          continue;
        }

        // Add back to stock
        await updateProduct(returnItem.productId, {
          quantity: settingsProduct.quantity + returnItem.quantity
        });

        // Record transaction
        const transaction: StockTransaction = {
          id: `trans-${Date.now()}-${Math.random()}`,
          productId: returnItem.productId,
          productName: orderItem.productName,
          type: 'order_return',
          quantity: returnItem.quantity,
          previousStock: settingsProduct.quantity,
          newStock: settingsProduct.quantity + returnItem.quantity,
          orderId: order.id,
          orderNumber: order.orderNumber,
          reason: 'إرجاع طلب',
          userId: 'current-user',
          userName: 'المستخدم الحالي',
          timestamp: new Date().toISOString()
        };

        setStockTransactions(prev => [transaction, ...prev]);
      }

      if (success) {
        toast({
          title: "تم إرجاع المخزون",
          description: "تم إضافة المنتجات المرجعة للمخزون",
        });
      }

      return success;
    } catch (error) {
      console.error('Error returning order stock:', error);
      toast({
        title: "خطأ في إرجاع المخزون",
        description: "حدث خطأ أثناء إرجاع المخزون",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [getSettingsProductById, updateProduct, toast]);

  // Get product with availability info
  const getProductWithAvailability = useCallback((productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return null;

    const activeReservations = reservations.filter(r => 
      r.productId === productId && 
      r.status === 'active' &&
      new Date(r.expiresAt) > new Date()
    );
    const reservedQuantity = activeReservations.reduce((sum, r) => sum + r.quantity, 0);
    const availableQuantity = product.inStock - reservedQuantity;

    return {
      ...product,
      reservedQuantity,
      availableQuantity,
      isAvailable: availableQuantity > 0
    };
  }, [products, reservations]);

  // Get order stock transactions
  const getOrderTransactions = useCallback((orderId: string) => {
    return stockTransactions.filter(t => t.orderId === orderId);
  }, [stockTransactions]);

  // Get product stock transactions
  const getProductTransactions = useCallback((productId: string) => {
    return stockTransactions.filter(t => t.productId === productId);
  }, [stockTransactions]);

  // Check stock availability for order items
  const checkStockAvailability = useCallback((items: Array<{ productId: string; quantity: number }>) => {
    const results = items.map(item => {
      const productInfo = getProductWithAvailability(item.productId);
      if (!productInfo) {
        return {
          productId: item.productId,
          isAvailable: false,
          availableQuantity: 0,
          requestedQuantity: item.quantity,
          shortfall: item.quantity
        };
      }

      const isAvailable = productInfo.availableQuantity >= item.quantity;
      const shortfall = isAvailable ? 0 : item.quantity - productInfo.availableQuantity;

      return {
        productId: item.productId,
        productName: productInfo.name,
        isAvailable,
        availableQuantity: productInfo.availableQuantity,
        requestedQuantity: item.quantity,
        shortfall
      };
    });

    const allAvailable = results.every(r => r.isAvailable);
    const totalShortfall = results.reduce((sum, r) => sum + r.shortfall, 0);

    return {
      allAvailable,
      totalShortfall,
      items: results
    };
  }, [getProductWithAvailability]);

  // Cleanup expired reservations
  useEffect(() => {
    const cleanup = () => {
      const now = new Date();
      setReservations(prev => 
        prev.map(r => 
          r.status === 'active' && new Date(r.expiresAt) <= now
            ? { ...r, status: 'expired' as const }
            : r
        )
      );
    };

    const interval = setInterval(cleanup, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  return {
    products,
    loading,
    
    // Stock operations
    reserveProductStock,
    releaseProductStock,
    fulfillOrderStock,
    returnOrderStock,
    
    // Product info
    getAvailableProducts,
    getProductWithAvailability,
    checkStockAvailability,
    
    // Transaction history
    getOrderTransactions,
    getProductTransactions,
    
    // State
    reservations: reservations.filter(r => r.status === 'active'),
    stockTransactions,
  };
}