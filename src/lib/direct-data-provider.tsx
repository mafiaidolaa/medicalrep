"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import type { User, Clinic, Product, Order, Visit, Collection, PlanTask, ActivityLog, Notification, Expense, Debt } from './types';
import { useToast } from '@/hooks/use-toast';

interface DirectDataContextProps {
  isClient: boolean;
  isLoading: boolean;
  currentUser: User | null;
  
  // مستخدمين - اتصال مباشر
  createUser: (user: Omit<User, 'id'>) => Promise<User>;
  updateUser: (id: string, data: Partial<User>) => Promise<User>;
  deleteUser: (id: string) => Promise<void>;
  getUserById: (id: string) => Promise<User | null>;
  getAllUsers: () => Promise<User[]>;
  
  // عيادات - اتصال مباشر
  createClinic: (clinic: Omit<Clinic, 'id'>) => Promise<Clinic>;
  updateClinic: (id: string, data: Partial<Clinic>) => Promise<Clinic>;
  deleteClinic: (id: string) => Promise<void>;
  getClinicById: (id: string) => Promise<Clinic | null>;
  getAllClinics: () => Promise<Clinic[]>;
  
  // منتجات - اتصال مباشر
  createProduct: (product: Omit<Product, 'id'>) => Promise<Product>;
  updateProduct: (id: string, data: Partial<Product>) => Promise<Product>;
  deleteProduct: (id: string) => Promise<void>;
  getProductById: (id: string) => Promise<Product | null>;
  getAllProducts: () => Promise<Product[]>;
  
  // زيارات - اتصال مباشر
  createVisit: (visit: Omit<Visit, 'id'>) => Promise<Visit>;
  updateVisit: (id: string, data: Partial<Visit>) => Promise<Visit>;
  deleteVisit: (id: string) => Promise<void>;
  getVisitById: (id: string) => Promise<Visit | null>;
  getAllVisits: () => Promise<Visit[]>;
  
  // طلبات - اتصال مباشر
  createOrder: (order: Omit<Order, 'id'>) => Promise<Order>;
  updateOrder: (id: string, data: Partial<Order>) => Promise<Order>;
  deleteOrder: (id: string) => Promise<void>;
  getOrderById: (id: string) => Promise<Order | null>;
  getAllOrders: () => Promise<Order[]>;
  
  // مصروفات - اتصال مباشر
  createExpense: (expense: Omit<Expense, 'id'>) => Promise<Expense>;
  updateExpense: (id: string, data: Partial<Expense>) => Promise<Expense>;
  deleteExpense: (id: string) => Promise<void>;
  getExpenseById: (id: string) => Promise<Expense | null>;
  getAllExpenses: () => Promise<Expense[]>;
  
  // مجموعات - اتصال مباشر
  createCollection: (collection: Omit<Collection, 'id'>) => Promise<Collection>;
  updateCollection: (id: string, data: Partial<Collection>) => Promise<Collection>;
  deleteCollection: (id: string) => Promise<void>;
  getCollectionById: (id: string) => Promise<Collection | null>;
  getAllCollections: () => Promise<Collection[]>;
  
  // مهام - اتصال مباشر
  createPlanTask: (task: Omit<PlanTask, 'id'>) => Promise<PlanTask>;
  updatePlanTask: (id: string, data: Partial<PlanTask>) => Promise<PlanTask>;
  deletePlanTask: (id: string) => Promise<void>;
  getPlanTaskById: (id: string) => Promise<PlanTask | null>;
  getAllPlanTasks: () => Promise<PlanTask[]>;
  
  // إشعارات - اتصال مباشر
  createNotification: (notification: Omit<Notification, 'id'>) => Promise<Notification>;
  updateNotification: (id: string, data: Partial<Notification>) => Promise<Notification>;
  deleteNotification: (id: string) => Promise<void>;
  getNotificationById: (id: string) => Promise<Notification | null>;
  getAllNotifications: () => Promise<Notification[]>;
  
  // إعدادات النظام - اتصال مباشر
  getSystemSetting: (key: string) => Promise<any>;
  setSystemSetting: (key: string, value: any) => Promise<void>;
  getAllSystemSettings: () => Promise<Record<string, any>>;
  
  // المناطق والخطوط - اتصال مباشر
  getAreas: () => Promise<string[]>;
  setAreas: (areas: string[]) => Promise<void>;
  getLines: () => Promise<string[]>;
  setLines: (lines: string[]) => Promise<void>;
  
  // إحصائيات مباشرة
  getDirectStats: () => Promise<{
    usersCount: number;
    clinicsCount: number;
    productsCount: number;
    visitsCount: number;
    ordersCount: number;
    expensesCount: number;
  }>;
}

const DirectDataContext = createContext<DirectDataContextProps | undefined>(undefined);

export const DirectDataProvider = ({ children }: { children: ReactNode }) => {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    setIsClient(true);
    if (session?.user) {
      setCurrentUser({
        id: (session.user as any).id || '',
        fullName: session.user.name || '',
        email: session.user.email || '',
        role: (session.user as any).role || 'medical_rep',
        username: (session.user as any).username || '',
        hireDate: new Date().toISOString(),
        isActive: true,
        area: (session.user as any).area || '',
        line: (session.user as any).line || '',
        primaryPhone: (session.user as any).primaryPhone || '',
      });
    }
  }, [session]);

  // دالة مساعدة للطلبات المباشرة
  const directRequest = async <T,>(
    endpoint: string,
    options: RequestInit = {},
    successMessage?: string
  ): Promise<T> => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          ...options.headers,
        },
        cache: 'no-store',
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (successMessage) {
        toast({
          title: "نجحت العملية",
          description: successMessage,
        });
      }

      return data;
    } catch (error: any) {
      console.error(`Direct request failed for ${endpoint}:`, error);
      toast({
        variant: "destructive",
        title: "خطأ في العملية",
        description: error.message || 'حدث خطأ أثناء العملية',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // إدارة المستخدمين - مباشر
  const createUser = useCallback(async (user: Omit<User, 'id'>): Promise<User> => {
    return directRequest<User>('users', {
      method: 'POST',
      body: JSON.stringify(user),
    }, 'تم إضافة المستخدم بنجاح');
  }, []);

  const updateUser = useCallback(async (id: string, data: Partial<User>): Promise<User> => {
    return directRequest<User>(`users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, 'تم تحديث المستخدم بنجاح');
  }, []);

  const deleteUser = useCallback(async (id: string): Promise<void> => {
    await directRequest<void>(`users/${id}`, {
      method: 'DELETE',
    }, 'تم حذف المستخدم بنجاح');
  }, []);

  const getUserById = useCallback(async (id: string): Promise<User | null> => {
    try {
      return await directRequest<User>(`users/${id}`, { method: 'GET' });
    } catch {
      return null;
    }
  }, []);

  const getAllUsers = useCallback(async (): Promise<User[]> => {
    return directRequest<User[]>('users', { method: 'GET' });
  }, []);

  // إدارة العيادات - مباشر
  const createClinic = useCallback(async (clinic: Omit<Clinic, 'id'>): Promise<Clinic> => {
    return directRequest<Clinic>('clinics', {
      method: 'POST',
      body: JSON.stringify(clinic),
    }, 'تم إضافة العيادة بنجاح');
  }, []);

  const updateClinic = useCallback(async (id: string, data: Partial<Clinic>): Promise<Clinic> => {
    return directRequest<Clinic>(`clinics/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, 'تم تحديث العيادة بنجاح');
  }, []);

  const deleteClinic = useCallback(async (id: string): Promise<void> => {
    await directRequest<void>(`clinics/${id}`, {
      method: 'DELETE',
    }, 'تم حذف العيادة بنجاح');
  }, []);

  const getClinicById = useCallback(async (id: string): Promise<Clinic | null> => {
    try {
      return await directRequest<Clinic>(`clinics/${id}`, { method: 'GET' });
    } catch {
      return null;
    }
  }, []);

  const getAllClinics = useCallback(async (): Promise<Clinic[]> => {
    return directRequest<Clinic[]>('clinics', { method: 'GET' });
  }, []);

  // إدارة المنتجات - مباشر
  const createProduct = useCallback(async (product: Omit<Product, 'id'>): Promise<Product> => {
    return directRequest<Product>('products', {
      method: 'POST',
      body: JSON.stringify(product),
    }, 'تم إضافة المنتج بنجاح');
  }, []);

  const updateProduct = useCallback(async (id: string, data: Partial<Product>): Promise<Product> => {
    return directRequest<Product>(`products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, 'تم تحديث المنتج بنجاح');
  }, []);

  const deleteProduct = useCallback(async (id: string): Promise<void> => {
    await directRequest<void>(`products/${id}`, {
      method: 'DELETE',
    }, 'تم حذف المنتج بنجاح');
  }, []);

  const getProductById = useCallback(async (id: string): Promise<Product | null> => {
    try {
      return await directRequest<Product>(`products/${id}`, { method: 'GET' });
    } catch {
      return null;
    }
  }, []);

  const getAllProducts = useCallback(async (): Promise<Product[]> => {
    return directRequest<Product[]>('products', { method: 'GET' });
  }, []);

  // إدارة الزيارات - مباشر
  const createVisit = useCallback(async (visit: Omit<Visit, 'id'>): Promise<Visit> => {
    return directRequest<Visit>('visits', {
      method: 'POST',
      body: JSON.stringify(visit),
    }, 'تم إضافة الزيارة بنجاح');
  }, []);

  const updateVisit = useCallback(async (id: string, data: Partial<Visit>): Promise<Visit> => {
    return directRequest<Visit>(`visits/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, 'تم تحديث الزيارة بنجاح');
  }, []);

  const deleteVisit = useCallback(async (id: string): Promise<void> => {
    await directRequest<void>(`visits/${id}`, {
      method: 'DELETE',
    }, 'تم حذف الزيارة بنجاح');
  }, []);

  const getVisitById = useCallback(async (id: string): Promise<Visit | null> => {
    try {
      return await directRequest<Visit>(`visits/${id}`, { method: 'GET' });
    } catch {
      return null;
    }
  }, []);

  const getAllVisits = useCallback(async (): Promise<Visit[]> => {
    return directRequest<Visit[]>('visits', { method: 'GET' });
  }, []);

  // إدارة الطلبات - مباشر
  const createOrder = useCallback(async (order: Omit<Order, 'id'>): Promise<Order> => {
    return directRequest<Order>('orders', {
      method: 'POST',
      body: JSON.stringify(order),
    }, 'تم إضافة الطلب بنجاح');
  }, []);

  const updateOrder = useCallback(async (id: string, data: Partial<Order>): Promise<Order> => {
    return directRequest<Order>(`orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, 'تم تحديث الطلب بنجاح');
  }, []);

  const deleteOrder = useCallback(async (id: string): Promise<void> => {
    await directRequest<void>(`orders/${id}`, {
      method: 'DELETE',
    }, 'تم حذف الطلب بنجاح');
  }, []);

  const getOrderById = useCallback(async (id: string): Promise<Order | null> => {
    try {
      return await directRequest<Order>(`orders/${id}`, { method: 'GET' });
    } catch {
      return null;
    }
  }, []);

  const getAllOrders = useCallback(async (): Promise<Order[]> => {
    return directRequest<Order[]>('orders', { method: 'GET' });
  }, []);

  // إدارة المصروفات - مباشر
  const createExpense = useCallback(async (expense: Omit<Expense, 'id'>): Promise<Expense> => {
    return directRequest<Expense>('expenses', {
      method: 'POST',
      body: JSON.stringify(expense),
    }, 'تم إضافة المصروف بنجاح');
  }, []);

  const updateExpense = useCallback(async (id: string, data: Partial<Expense>): Promise<Expense> => {
    return directRequest<Expense>(`expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, 'تم تحديث المصروف بنجاح');
  }, []);

  const deleteExpense = useCallback(async (id: string): Promise<void> => {
    await directRequest<void>(`expenses/${id}`, {
      method: 'DELETE',
    }, 'تم حذف المصروف بنجاح');
  }, []);

  const getExpenseById = useCallback(async (id: string): Promise<Expense | null> => {
    try {
      return await directRequest<Expense>(`expenses/${id}`, { method: 'GET' });
    } catch {
      return null;
    }
  }, []);

  const getAllExpenses = useCallback(async (): Promise<Expense[]> => {
    return directRequest<Expense[]>('expenses', { method: 'GET' });
  }, []);

  // إدارة المجموعات - مباشر
  const createCollection = useCallback(async (collection: Omit<Collection, 'id'>): Promise<Collection> => {
    return directRequest<Collection>('collections', {
      method: 'POST',
      body: JSON.stringify(collection),
    }, 'تم إضافة التحصيل بنجاح');
  }, []);

  const updateCollection = useCallback(async (id: string, data: Partial<Collection>): Promise<Collection> => {
    return directRequest<Collection>(`collections/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, 'تم تحديث التحصيل بنجاح');
  }, []);

  const deleteCollection = useCallback(async (id: string): Promise<void> => {
    await directRequest<void>(`collections/${id}`, {
      method: 'DELETE',
    }, 'تم حذف التحصيل بنجاح');
  }, []);

  const getCollectionById = useCallback(async (id: string): Promise<Collection | null> => {
    try {
      return await directRequest<Collection>(`collections/${id}`, { method: 'GET' });
    } catch {
      return null;
    }
  }, []);

  const getAllCollections = useCallback(async (): Promise<Collection[]> => {
    return directRequest<Collection[]>('collections', { method: 'GET' });
  }, []);

  // إدارة المهام - مباشر
  const createPlanTask = useCallback(async (task: Omit<PlanTask, 'id'>): Promise<PlanTask> => {
    return directRequest<PlanTask>('plan-tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    }, 'تم إضافة المهمة بنجاح');
  }, []);

  const updatePlanTask = useCallback(async (id: string, data: Partial<PlanTask>): Promise<PlanTask> => {
    return directRequest<PlanTask>(`plan-tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, 'تم تحديث المهمة بنجاح');
  }, []);

  const deletePlanTask = useCallback(async (id: string): Promise<void> => {
    await directRequest<void>(`plan-tasks/${id}`, {
      method: 'DELETE',
    }, 'تم حذف المهمة بنجاح');
  }, []);

  const getPlanTaskById = useCallback(async (id: string): Promise<PlanTask | null> => {
    try {
      return await directRequest<PlanTask>(`plan-tasks/${id}`, { method: 'GET' });
    } catch {
      return null;
    }
  }, []);

  const getAllPlanTasks = useCallback(async (): Promise<PlanTask[]> => {
    return directRequest<PlanTask[]>('plan-tasks', { method: 'GET' });
  }, []);

  // إدارة الإشعارات - مباشر
  const createNotification = useCallback(async (notification: Omit<Notification, 'id'>): Promise<Notification> => {
    return directRequest<Notification>('notifications', {
      method: 'POST',
      body: JSON.stringify(notification),
    }, 'تم إضافة الإشعار بنجاح');
  }, []);

  const updateNotification = useCallback(async (id: string, data: Partial<Notification>): Promise<Notification> => {
    return directRequest<Notification>(`notifications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, 'تم تحديث الإشعار بنجاح');
  }, []);

  const deleteNotification = useCallback(async (id: string): Promise<void> => {
    await directRequest<void>(`notifications/${id}`, {
      method: 'DELETE',
    }, 'تم حذف الإشعار بنجاح');
  }, []);

  const getNotificationById = useCallback(async (id: string): Promise<Notification | null> => {
    try {
      return await directRequest<Notification>(`notifications/${id}`, { method: 'GET' });
    } catch {
      return null;
    }
  }, []);

  const getAllNotifications = useCallback(async (): Promise<Notification[]> => {
    return directRequest<Notification[]>('notifications', { method: 'GET' });
  }, []);

  // إدارة إعدادات النظام - مباشر
  const getSystemSetting = useCallback(async (key: string): Promise<any> => {
    const response = await directRequest<{ data: any }>(`system-settings?key=${encodeURIComponent(key)}`, { method: 'GET' });
    return response.data;
  }, []);

  const setSystemSetting = useCallback(async (key: string, value: any): Promise<void> => {
    await directRequest<void>('system-settings', {
      method: 'POST',
      body: JSON.stringify({ setting_key: key, setting_value: value }),
    }, 'تم حفظ الإعداد بنجاح');
  }, []);

  const getAllSystemSettings = useCallback(async (): Promise<Record<string, any>> => {
    return directRequest<Record<string, any>>('system-settings', { method: 'GET' });
  }, []);

  // إدارة المناطق والخطوط - مباشر
  const getAreas = useCallback(async (): Promise<string[]> => {
    const response = await getSystemSetting('app_areas');
    return response || [];
  }, [getSystemSetting]);

  const setAreas = useCallback(async (areas: string[]): Promise<void> => {
    await setSystemSetting('app_areas', areas);
  }, [setSystemSetting]);

  const getLines = useCallback(async (): Promise<string[]> => {
    const response = await getSystemSetting('app_lines');
    return response || [];
  }, [getSystemSetting]);

  const setLines = useCallback(async (lines: string[]): Promise<void> => {
    await setSystemSetting('app_lines', lines);
  }, [setSystemSetting]);

  // إحصائيات مباشرة
  const getDirectStats = useCallback(async () => {
    const stats = await directRequest<{
      usersCount: number;
      clinicsCount: number;
      productsCount: number;
      visitsCount: number;
      ordersCount: number;
      expensesCount: number;
    }>('dashboard/stats', { method: 'GET' });
    return stats;
  }, []);

  const contextValue: DirectDataContextProps = {
    isClient,
    isLoading,
    currentUser,
    
    // المستخدمين
    createUser,
    updateUser,
    deleteUser,
    getUserById,
    getAllUsers,
    
    // العيادات
    createClinic,
    updateClinic,
    deleteClinic,
    getClinicById,
    getAllClinics,
    
    // المنتجات
    createProduct,
    updateProduct,
    deleteProduct,
    getProductById,
    getAllProducts,
    
    // الزيارات
    createVisit,
    updateVisit,
    deleteVisit,
    getVisitById,
    getAllVisits,
    
    // الطلبات
    createOrder,
    updateOrder,
    deleteOrder,
    getOrderById,
    getAllOrders,
    
    // المصروفات
    createExpense,
    updateExpense,
    deleteExpense,
    getExpenseById,
    getAllExpenses,
    
    // المجموعات
    createCollection,
    updateCollection,
    deleteCollection,
    getCollectionById,
    getAllCollections,
    
    // المهام
    createPlanTask,
    updatePlanTask,
    deletePlanTask,
    getPlanTaskById,
    getAllPlanTasks,
    
    // الإشعارات
    createNotification,
    updateNotification,
    deleteNotification,
    getNotificationById,
    getAllNotifications,
    
    // إعدادات النظام
    getSystemSetting,
    setSystemSetting,
    getAllSystemSettings,
    
    // المناطق والخطوط
    getAreas,
    setAreas,
    getLines,
    setLines,
    
    // الإحصائيات
    getDirectStats,
  };

  return (
    <DirectDataContext.Provider value={contextValue}>
      {children}
    </DirectDataContext.Provider>
  );
};

export const useDirectData = () => {
  const context = useContext(DirectDataContext);
  if (context === undefined) {
    throw new Error('useDirectData must be used within a DirectDataProvider');
  }
  return context;
};

// Hook مساعد للعمليات المباشرة مع معالجة الأخطاء
export const useDirectOperation = () => {
  const { toast } = useToast();
  
  const executeDirectOperation = useCallback(async <T,>(
    operation: () => Promise<T>,
    successMessage?: string,
    errorMessage?: string
  ): Promise<T | null> => {
    try {
      const result = await operation();
      if (successMessage) {
        toast({
          title: "نجحت العملية",
          description: successMessage,
        });
      }
      return result;
    } catch (error: any) {
      console.error('Direct operation failed:', error);
      toast({
        variant: "destructive",
        title: "خطأ في العملية",
        description: errorMessage || error.message || 'حدث خطأ أثناء العملية',
      });
      return null;
    }
  }, [toast]);

  return { executeDirectOperation };
};