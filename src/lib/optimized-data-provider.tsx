"use client";

import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import type { User, Clinic, Product, Order, Visit, Collection, PlanTask, ActivityLog, Notification, Expense, Debt } from './types';
import { 
    fetchUsers,
    fetchClinics,
    fetchProducts,
    fetchOrders,
    fetchVisits,
    fetchCollections,
    fetchPlanTasks,
    fetchActivityLog,
    fetchNotifications,
    fetchExpenses,
    addUser,
    addClinic,
    addProduct as addProductData,
    addOrder,
    addVisit as addVisitData,
    addCollection as addCollectionData,
    addPlanTask as addPlanTaskData,
    addDebt,
    addActivityLog,
    addNotification,
    addExpense,
    updateUser as updateUserData,
    updateClinic,
    updateProduct as updateProductData,
    updateOrder,
    updateVisit,
    updateCollection,
    updatePlanTask,
    updateNotification,
    updateExpense,
    deleteUser as deleteUserData,
    deleteClinic as deleteClinicData,
    deleteProduct as deleteProductData,
    deleteOrder as deleteOrderData,
    deleteVisit as deleteVisitData,
    deleteCollection as deleteCollectionData,
    deletePlanTask as deletePlanTaskData,
    deleteNotification as deleteNotificationData,
    deleteExpense as deleteExpenseData,
    generateUUID
} from './supabase-services';
import { supabase } from './supabase';
import { initPushSubscription } from './push-client';

// Lightweight fetch retry helper (dev-friendly) to handle transient NetworkError during HMR/compiles
async function retryFetch(input: RequestInfo | URL, init?: RequestInit, retries = 3, delayMs = 400): Promise<Response> {
    let lastErr: any;
    for (let i = 0; i < retries; i++) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            const res = await fetch(input, { ...init, signal: controller.signal, cache: 'no-store', keepalive: true } as RequestInit);
            clearTimeout(timeout);
            return res;
        } catch (e: any) {
            lastErr = e;
            // Only retry on network-ish errors
            if (i < retries - 1) {
                await new Promise(r => setTimeout(r, delayMs));
                continue;
            }
        }
    }
    throw lastErr;
}

// إعدادات خفيفة للبيئة العامة (تُستبدل في وقت البناء)
const SKIP_PREFETCH = process.env.NEXT_PUBLIC_SKIP_PREFETCH === '1';
const DELAY_PUSH_MS = Number(process.env.NEXT_PUBLIC_DELAY_PUSH_MS ?? '0') || 0;

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    isLoading: boolean;
}

interface DataContextProps {
    isClient: boolean;
    isLoading: boolean;
    currentUser: User | null;
    // Lazy loading getters
    getUsers: () => Promise<User[]>;
    getClinics: () => Promise<Clinic[]>;
    getProducts: () => Promise<Product[]>;
    getOrders: () => Promise<Order[]>;
    getVisits: () => Promise<Visit[]>;
    getCollections: () => Promise<Collection[]>;
    getPlanTasks: () => Promise<PlanTask[]>;
    getActivityLog: () => Promise<ActivityLog[]>;
    getNotifications: () => Promise<Notification[]>;
    getExpenses: () => Promise<Expense[]>;
    // Cached data (only loaded when requested)
    users: User[];
    clinics: Clinic[];
    products: Product[];
    orders: Order[];
    visits: Visit[];
    collections: Collection[];
    planTasks: PlanTask[];
    activityLog: ActivityLog[];
    notifications: Notification[];
    expenses: Expense[];
    areas: string[];
    lines: string[];
    // Setters
    setUsers: (users: User[] | ((prev: User[]) => User[])) => Promise<void>;
    setClinics: (clinics: Clinic[] | ((prev: Clinic[]) => Clinic[])) => Promise<void>;
    setProducts: (products: Product[] | ((prev: Product[]) => Product[])) => Promise<void>;
    setOrders: (orders: Order[] | ((prev: Order[]) => Order[])) => Promise<void>;
    setVisits: (visits: Visit[] | ((prev: Visit[]) => Visit[])) => Promise<void>;
    setCollections: (collections: Collection[] | ((prev: Collection[]) => Collection[])) => Promise<void>;
    setPlanTasks: (planTasks: PlanTask[] | ((prev: PlanTask[]) => PlanTask[])) => Promise<void>;
    setActivityLog: (activityLog: ActivityLog[] | ((prev: ActivityLog[]) => ActivityLog[])) => Promise<void>;
    setNotifications: (notifications: Notification[] | ((prev: Notification[]) => Notification[])) => Promise<void>;
    setExpenses: (expenses: Expense[] | ((prev: Expense[]) => Expense[])) => Promise<void>;
    setAreas: (areas: string[]) => Promise<{ success: boolean; message: string }>;
    setLines: (lines: string[]) => Promise<{ success: boolean; message: string }>;
    // Professional products CRUD
    addProduct: (product: Omit<Product, 'id'>) => Promise<Product>;
    updateProduct: (id: string, data: Partial<Product>) => Promise<void>;
    // Professional clinics CRUD
    addClinicDirect: (clinic: Omit<Clinic, 'id'>) => Promise<Clinic>;
    // Other operations
    addPlanTask: (task: Omit<PlanTask, 'id'>) => Promise<PlanTask>;
    addVisit: (visit: Omit<Visit, 'id'>) => Promise<Visit>;
    addOrder: (order: Omit<Order, 'id'>) => Promise<Order>;
    addCollection: (collection: Omit<Collection, 'id'>) => Promise<Collection>;
    addDebt: (debt: Omit<Debt, 'id'>) => Promise<Debt>;
    updateUser: (id: string, data: Partial<User>) => Promise<void>;
    deleteUser: (id: string) => Promise<void>;
    deleteClinic: (id: string) => Promise<void>;
    deleteProduct: (id: string) => Promise<void>;
    deleteOrder: (id: string) => Promise<void>;
    deleteVisit: (id: string) => Promise<void>;
    deleteCollection: (id: string) => Promise<void>;
    deletePlanTask: (id: string) => Promise<void>;
    deleteNotification: (id: string) => Promise<void>;
    deleteExpense: (id: string) => Promise<void>;
    // Cache management
    clearCache: (key?: string) => void;
    invalidateCache: (key: string) => void;
}

const DataContext = createContext<DataContextProps | undefined>(undefined);

// Cache configuration - optimized for better navigation performance
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes - faster updates for real-time data
const MAX_CACHE_SIZE = 200; // Increased cache size for better performance
const CRITICAL_DATA_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for critical data like users, areas, lines

// In-memory cache
const cache = new Map<string, CacheEntry<any>>();

// Cache utilities
const getCacheKey = (fetchFunction: string, params?: any) => {
    return `${fetchFunction}${params ? JSON.stringify(params) : ''}`;
};

const isExpired = (timestamp: number, isCritical = false): boolean => {
    const duration = isCritical ? CRITICAL_DATA_CACHE_DURATION : CACHE_DURATION;
    return Date.now() - timestamp > duration;
};

const cleanupCache = () => {
    if (cache.size > MAX_CACHE_SIZE) {
        const entries = Array.from(cache.entries());
        const sorted = entries.sort(([,a], [,b]) => a.timestamp - b.timestamp);
        const toDelete = sorted.slice(0, cache.size - MAX_CACHE_SIZE + 10);
        toDelete.forEach(([key]) => cache.delete(key));
    }
};

// Generic caching function with critical data support
async function withCache<T>(
    key: string,
    fetchFn: () => Promise<T>,
    forceRefresh = false,
    isCritical = false
): Promise<T> {
    const existing = cache.get(key);
    
    if (!forceRefresh && existing && !isExpired(existing.timestamp, isCritical) && !existing.isLoading) {
        return existing.data;
    }
    
    // If already loading, wait for it
    if (existing?.isLoading) {
        return new Promise((resolve) => {
            const checkLoading = () => {
                const current = cache.get(key);
                if (!current?.isLoading) {
                    resolve(current?.data);
                } else {
                    setTimeout(checkLoading, 100);
                }
            };
            checkLoading();
        });
    }
    
    // Mark as loading
    cache.set(key, { 
        data: existing?.data || [], 
        timestamp: existing?.timestamp || 0, 
        isLoading: true 
    });
    
    try {
        const data = await fetchFn();
        cache.set(key, { 
            data, 
            timestamp: Date.now(), 
            isLoading: false 
        });
        cleanupCache();
        return data;
    } catch (error) {
        // Remove loading flag on error
        if (existing) {
            cache.set(key, { ...existing, isLoading: false });
        } else {
            cache.delete(key);
        }
        throw error;
    }
}

let isSeedingAttempted = false;
let pushSubscribedUid: string | null = null;

export const OptimizedDataProvider = ({ children }: { children: ReactNode }) => {
    const { data: session } = useSession();
    const [isClient, setIsClient] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    // Local state for loaded data
    const [users, setUsersState] = useState<User[]>([]);
    const [clinics, setClinicsState] = useState<Clinic[]>([]);
    const [products, setProductsState] = useState<Product[]>([]);
    const [orders, setOrdersState] = useState<Order[]>([]);
    const [visits, setVisitsState] = useState<Visit[]>([]);
    const [collections, setCollectionsState] = useState<Collection[]>([]);
    const [planTasks, setPlanTasksState] = useState<PlanTask[]>([]);
    const [activityLog, setActivityLogState] = useState<ActivityLog[]>([]);
    const [notifications, setNotificationsState] = useState<Notification[]>([]);
    const [expenses, setExpensesState] = useState<Expense[]>([]);
    const [areas, setAreasState] = useState<string[]>([]);
    const [lines, setLinesState] = useState<string[]>([]);

    useEffect(() => {
        setIsClient(true);
        
        // Initialize areas and lines from DATABASE (not localStorage) - now via API
        const initializeAreasAndLines = async () => {
            try {
                console.log('🔄 Loading areas and lines from database via API...');
                
                // Fetch from database via API endpoint
                const response = await retryFetch('/api/system-settings');
                
                if (!response.ok) {
                    console.error('Error loading settings from database. Status:', response.status);
                    // Fallback to defaults on error
                    setAreasState(['القاهرة', 'الجيزة', 'الاسكندرية']);
                    setLinesState(['الخط الأول', 'الخط الثاني', 'الخط الثالث']);
                    return;
                }
                
                const { data: settingsData } = await response.json();
                
                if (settingsData && settingsData.length > 0) {
                    const areasData = settingsData.find((setting: any) => setting.setting_key === 'app_areas');
                    const linesData = settingsData.find((setting: any) => setting.setting_key === 'app_lines');
                    
                    if (areasData) {
                        // Coerce to a clean string[] regardless of how it's stored (array | JSON string | object)
                        let raw = (areasData as any).setting_value;
                        try {
                            if (typeof raw === 'string') raw = JSON.parse(raw);
                        } catch {}
                        const areas = Array.isArray(raw)
                          ? raw
                          : raw && typeof raw === 'object'
                            ? Object.values(raw)
                            : [];
                        const cleanAreas = Array.from(new Set((areas as any[]).filter(Boolean).map(String)));
                        setAreasState(cleanAreas);
                        console.log('✅ Loaded areas from database:', cleanAreas);
                    } else {
                        console.warn('⚠️ No areas found in database, using defaults');
                        setAreasState(['القاهرة', 'الجيزة', 'الاسكندرية']);
                    }
                    
                    if (linesData) {
                        // Coerce to string[] (array | JSON string | object)
                        let raw = (linesData as any).setting_value;
                        try {
                            if (typeof raw === 'string') raw = JSON.parse(raw);
                        } catch {}
                        const lines = Array.isArray(raw)
                          ? raw
                          : raw && typeof raw === 'object'
                            ? Object.values(raw)
                            : [];
                        const cleanLines = Array.from(new Set((lines as any[]).filter(Boolean).map(String)));
                        setLinesState(cleanLines);
                        console.log('✅ Loaded lines from database:', cleanLines);
                    } else {
                        console.warn('⚠️ No lines found in database, using defaults');
                        setLinesState(['الخط الأول', 'الخط الثاني', 'الخط الثالث']);
                    }
                } else {
                    console.warn('⚠️ No settings found in database, using defaults');
                    setAreasState(['القاهرة', 'الجيزة', 'الاسكندرية']);
                    setLinesState(['الخط الأول', 'الخط الثاني', 'الخط الثالث']);
                }
            } catch (error) {
                console.error('Error initializing areas and lines:', error);
                // Fallback to defaults
                setAreasState(['القاهرة', 'الجيزة', 'الاسكندرية']);
                setLinesState(['الخط الأول', 'الخط الثاني', 'الخط الثالث']);
            }
        };
        
        // Initialize seeding only once (dev only)
        const initializeSeeding = async () => {
            if (process.env.NODE_ENV !== 'production') {
                try {
                    if (typeof window !== 'undefined') {
                        const done = sessionStorage.getItem('SEED_DONE');
                        if (done === '1') return;
                    }
                    if (isSeedingAttempted) return;
                    isSeedingAttempted = true;
                    const response = await fetch('/api/seed', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                    });
                    if (!response.ok) {
                        console.warn('Database seeding failed or was already completed');
                    } else {
                        console.log('Database seeding completed successfully');
                    }
                } catch (seedError) {
                    console.warn('Error during database seeding:', seedError);
                } finally {
                    if (typeof window !== 'undefined') {
                        sessionStorage.setItem('SEED_DONE', '1');
                    }
                }
            }
        };

        // Warm critical datasets in the background for snappier navigation
        const prefetchCritical = async () => {
            try {
                await Promise.allSettled([
                    getUsers(),
                    getClinics(),
                ]);
            } catch {}
        };

        // Idle prefetch of heavier, commonly-used datasets (sequential to reduce burst)
        const idle = (cb: () => void) => {
            if (typeof (window as any).requestIdleCallback === 'function') {
                (window as any).requestIdleCallback(cb, { timeout: 2000 });
            } else {
                setTimeout(cb, 600);
            }
        };
        const prefetchIdle = () => {
            idle(async () => {
                try { await getProducts(); } catch {}
                idle(async () => {
                    try { await getOrders(); } catch {}
                    idle(async () => {
                        try { await getVisits(); } catch {}
                        idle(async () => { try { await getCollections(); } catch {} });
                    });
                });
            });
        };
        
        initializeAreasAndLines();
        initializeSeeding();
        if (!SKIP_PREFETCH) {
            prefetchCritical();
            prefetchIdle();
        }
    }, []);

    // Ensure critical datasets are loaded when a signed-in user visits pages even if SKIP_PREFETCH is enabled
    useEffect(() => {
        const loadCriticalOnDemand = async () => {
            if (!isClient) return;
            const uid = (session?.user as any)?.id;
            if (!uid) return; // wait for session
            try {
                setIsLoading(true);
                const tasks: Promise<any>[] = [];
                if (users.length === 0) tasks.push(getUsers());
                if (clinics.length === 0) tasks.push(getClinics());
                await Promise.allSettled(tasks);
            } finally {
                setIsLoading(false);
            }
        };
        loadCriticalOnDemand();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isClient, session?.user]);

    // Register service worker + push subscription for current user
    useEffect(() => {
        if (!isClient) return;
        const uid = (session?.user as any)?.id as string | undefined;
        if (!uid) return;
        // Guard against duplicate subscriptions across re-renders/HMR
        if (pushSubscribedUid === uid) return;
        if (typeof window !== 'undefined') {
            const done = sessionStorage.getItem('PUSH_SUBSCRIBED');
            if (done === '1') {
                pushSubscribedUid = uid;
                return;
            }
        }
        const timer = setTimeout(() => {
            initPushSubscription(uid);
            pushSubscribedUid = uid;
            if (typeof window !== 'undefined') {
                sessionStorage.setItem('PUSH_SUBSCRIBED', '1');
            }
        }, DELAY_PUSH_MS);
        return () => clearTimeout(timer);
    }, [isClient, session?.user]);

    // Predeclare notification helpers before effects to satisfy TS ordering
    const getNotifications = useCallback(async (): Promise<Notification[]> => {
        const data = await withCache('notifications', fetchNotifications);
        setNotificationsState(data);
        return data;
    }, []);



    // Lazy loading functions with caching
    const getUsers = useCallback(async (): Promise<User[]> => {
        const data = await withCache('users', fetchUsers, false, true); // Critical data
        setUsersState(data);
        return data;
    }, []);

    const getClinics = useCallback(async (): Promise<Clinic[]> => {
        const data = await withCache('clinics', fetchClinics, false, true); // Critical data
        setClinicsState(data);
        
        // DON'T override user-edited areas and lines from clinics data
        // Only merge new areas/lines if they don't exist
        if (data && data.length > 0) {
            const derivedAreas = Array.from(new Set(
              data.map(c => (c.area ? String(c.area).trim() : ''))
                  .filter(v => v.length > 0)
            )) as string[];
            const derivedLines = Array.from(new Set(
              data.map(c => (c.line ? String(c.line).trim() : ''))
                  .filter(v => v.length > 0)
            )) as string[];
            
            // Only add NEW areas/lines, don't replace existing ones
            if (derivedAreas.length > 0) {
                setAreasState(prev => {
                    const merged = Array.from(new Set([...prev, ...derivedAreas]));
                    return merged;
                });
            }
            if (derivedLines.length > 0) {
                setLinesState(prev => {
                    const merged = Array.from(new Set([...prev, ...derivedLines]));
                    return merged;
                });
            }
        }
        
        return data;
    }, []);

    const getProducts = useCallback(async (): Promise<Product[]> => {
        const data = await withCache('products', fetchProducts);
        setProductsState(data);
        return data;
    }, []);

    const getOrders = useCallback(async (): Promise<Order[]> => {
        const data = await withCache('orders', fetchOrders);
        setOrdersState(data);
        return data;
    }, []);

    const getVisits = useCallback(async (): Promise<Visit[]> => {
        const data = await withCache('visits', fetchVisits);
        setVisitsState(data);
        return data;
    }, []);

    const getCollections = useCallback(async (): Promise<Collection[]> => {
        const data = await withCache('collections', fetchCollections);
        setCollectionsState(data);
        return data;
    }, []);

    const getPlanTasks = useCallback(async (): Promise<PlanTask[]> => {
        const data = await withCache('planTasks', fetchPlanTasks);
        setPlanTasksState(data);
        return data;
    }, []);

    const getActivityLog = useCallback(async (): Promise<ActivityLog[]> => {
        const data = await withCache('activityLog', fetchActivityLog);
        setActivityLogState(data);
        return data;
    }, []);


    const getExpenses = useCallback(async (): Promise<Expense[]> => {
        const data = await withCache('expenses', fetchExpenses);
        setExpensesState(data);
        return data;
    }, []);

    // Generic diff+persist helper to guarantee DB persistence
    const diffAndPersist = async <T extends { id: string }>(
        key: string,
        prevList: T[],
        nextList: T[],
        ops: {
            add?: (item: T) => Promise<any> | any,
            update?: (id: string, changes: Partial<T>) => Promise<any> | any,
            remove?: (id: string) => Promise<any> | any,
        }
    ) => {
        const prevMap = new Map(prevList.map(i => [i.id, i] as const));
        const nextMap = new Map(nextList.map(i => [i.id, i] as const));

        // Additions
        for (const [id, item] of nextMap.entries()) {
            if (!prevMap.has(id) && ops.add) {
                try { await ops.add(item); } catch (e) { console.warn(`Persist add failed for ${key}:${id}`, e); }
            }
        }
        // Updates (shallow compare)
        for (const [id, next] of nextMap.entries()) {
            const prev = prevMap.get(id);
            if (prev) {
                const prevStr = JSON.stringify(prev);
                const nextStr = JSON.stringify(next);
                if (prevStr !== nextStr && ops.update) {
                    const changes: Partial<T> = {};
                    for (const k of Object.keys(next) as (keyof T)[]) {
                        if (JSON.stringify(prev[k]) !== JSON.stringify(next[k])) {
                            (changes as any)[k] = next[k];
                        }
                    }
                    try { await ops.update(id, changes); } catch (e) { console.warn(`Persist update failed for ${key}:${id}`, e); }
                }
            }
        }
        // Deletions
        for (const [id] of prevMap.entries()) {
            if (!nextMap.has(id) && ops.remove) {
                try { await ops.remove(id); } catch (e) { console.warn(`Persist delete failed for ${key}:${id}`, e); }
            }
        }
    };

    // Optimized setters that persist diffs to DB and update cache/state
    const setUsers = useCallback(async (users: User[] | ((prev: User[]) => User[])) => {
        const prevUsers: User[] = cache.get('users')?.data || [];
        const newUsers = typeof users === 'function' ? (users as any)(prevUsers) : users;
        setUsersState(newUsers);
        cache.set('users', { data: newUsers, timestamp: Date.now(), isLoading: false });
        await diffAndPersist<User>('users', prevUsers, newUsers, {
            add: addUser,
            update: updateUser,
            remove: deleteUser,
        });
    }, []);

    const setClinics = useCallback(async (clinics: Clinic[] | ((prev: Clinic[]) => Clinic[])) => {
        const prevClinics: Clinic[] = cache.get('clinics')?.data || [];
        const newClinics = typeof clinics === 'function' ? (clinics as any)(prevClinics) : clinics;
        setClinicsState(newClinics);
        cache.set('clinics', { data: newClinics, timestamp: Date.now(), isLoading: false });
        // Clinics should be added via API route in addClinic function, not here
        // diffAndPersist is for local state management only
        await diffAndPersist<Clinic>('clinics', prevClinics, newClinics, {
            // Don't use addClinic here - it's already called from the component
            update: updateClinic,
            remove: deleteClinic,
        });
    }, []);

    const setProducts = useCallback(async (products: Product[] | ((prev: Product[]) => Product[])) => {
        const prev: Product[] = cache.get('products')?.data || [];
        const newProducts = typeof products === 'function' ? (products as any)(prev) : products;
        setProductsState(newProducts);
        cache.set('products', { data: newProducts, timestamp: Date.now(), isLoading: false });
        await diffAndPersist<Product>('products', prev, newProducts, {
            add: addProductData,
            update: updateProductData,
            remove: deleteProductData,
        });
    }, []);

    const setOrders = useCallback(async (orders: Order[] | ((prev: Order[]) => Order[])) => {
        const prevOrders: Order[] = cache.get('orders')?.data || [];
        const newOrders = typeof orders === 'function' ? (orders as any)(prevOrders) : orders;
        setOrdersState(newOrders);
        cache.set('orders', { data: newOrders, timestamp: Date.now(), isLoading: false });
        await diffAndPersist<Order>('orders', prevOrders, newOrders, {
            add: addOrder,
            update: updateOrder,
            remove: deleteOrder,
        });
    }, []);

    const setVisits = useCallback(async (visits: Visit[] | ((prev: Visit[]) => Visit[])) => {
        const prevVisits: Visit[] = cache.get('visits')?.data || [];
        const newVisits = typeof visits === 'function' ? (visits as any)(prevVisits) : visits;
        setVisitsState(newVisits);
        cache.set('visits', { data: newVisits, timestamp: Date.now(), isLoading: false });
        await diffAndPersist<Visit>('visits', prevVisits, newVisits, {
            add: addVisitData,
            update: updateVisit,
            remove: deleteVisitData,
        });
    }, []);

    const setCollections = useCallback(async (collections: Collection[] | ((prev: Collection[]) => Collection[])) => {
        const prevCollections: Collection[] = cache.get('collections')?.data || [];
        const newCollections = typeof collections === 'function' ? (collections as any)(prevCollections) : collections;
        setCollectionsState(newCollections);
        cache.set('collections', { data: newCollections, timestamp: Date.now(), isLoading: false });
        await diffAndPersist<Collection>('collections', prevCollections, newCollections, {
            add: addCollectionData,
            update: updateCollection,
            remove: deleteCollectionData,
        });
    }, []);

    const setPlanTasks = useCallback(async (planTasks: PlanTask[] | ((prev: PlanTask[]) => PlanTask[])) => {
        const prevPlanTasks: PlanTask[] = cache.get('planTasks')?.data || [];
        const newPlanTasks = typeof planTasks === 'function' ? (planTasks as any)(prevPlanTasks) : planTasks;
        setPlanTasksState(newPlanTasks);
        cache.set('planTasks', { data: newPlanTasks, timestamp: Date.now(), isLoading: false });
        await diffAndPersist<PlanTask>('plan_tasks', prevPlanTasks, newPlanTasks, {
            add: addPlanTaskData,
            update: updatePlanTask,
            remove: deletePlanTaskData,
        });
    }, []);

    const setActivityLog = useCallback(async (activityLog: ActivityLog[] | ((prev: ActivityLog[]) => ActivityLog[])) => {
        const prevLog: ActivityLog[] = cache.get('activityLog')?.data || [];
        const newActivityLog = typeof activityLog === 'function' ? (activityLog as any)(prevLog) : activityLog;
        setActivityLogState(newActivityLog);
        cache.set('activityLog', { data: newActivityLog, timestamp: Date.now(), isLoading: false });
        await diffAndPersist<ActivityLog>('activity_log', prevLog, newActivityLog, {
            add: addActivityLog,
            update: updateNotification as any, // no specific update for activity; kept for future
        });
    }, []);

    const setNotifications = useCallback(async (notifications: Notification[] | ((prev: Notification[]) => Notification[])) => {
        const prevNotifications: Notification[] = cache.get('notifications')?.data || [];
        const newNotifications = typeof notifications === 'function' ? (notifications as any)(prevNotifications) : notifications;
        setNotificationsState(newNotifications);
        cache.set('notifications', { data: newNotifications, timestamp: Date.now(), isLoading: false });
        await diffAndPersist<Notification>('notifications', prevNotifications, newNotifications, {
            add: addNotification,
            update: updateNotification,
            remove: deleteNotificationData,
        });
    }, []);

    const setExpenses = useCallback(async (expenses: Expense[] | ((prev: Expense[]) => Expense[])) => {
        const prevExpenses: Expense[] = cache.get('expenses')?.data || [];
        const newExpenses = typeof expenses === 'function' ? (expenses as any)(prevExpenses) : expenses;
        setExpensesState(newExpenses);
        cache.set('expenses', { data: newExpenses, timestamp: Date.now(), isLoading: false });
        await diffAndPersist<Expense>('expenses', prevExpenses, newExpenses, {
            add: addExpense,
            update: updateExpense,
            remove: deleteExpense,
        });
    }, []);

    // Listen to SW messages (sync read/click across tabs/devices)
    useEffect(() => {
        if (!isClient) return;
        function onMessage(event: MessageEvent) {
            const { type, data } = event.data || {};
            if (type === 'NOTIFICATIONS_SYNC' && data?.id) {
                setNotifications(prev => prev.map(n => n.id === data.id ? {
                    ...n,
                    read: data.update === 'mark_read' ? true : n.read,
                    readAt: data.update === 'mark_read' ? new Date().toISOString() : n.readAt,
                    clicked: data.update === 'mark_clicked' ? true : n.clicked,
                    clickedAt: data.update === 'mark_clicked' ? new Date().toISOString() : n.clickedAt,
                } : n));
            }
        }
        navigator.serviceWorker?.addEventListener('message', onMessage as any);
        return () => navigator.serviceWorker?.removeEventListener('message', onMessage as any);
    }, [isClient, setNotifications]);

    // Realtime notifications subscription for current user
    useEffect(() => {
        if (!isClient) return;
        const uid = (session?.user as any)?.id;
        if (!uid) return;

        // Map DB row to Notification shape (keep optional fields)
        const mapRow = (row: any): Notification => ({
            id: row.id,
            userId: row.user_id,
            title: row.title,
            message: row.message,
            type: row.type,
            read: !!row.read,
            timestamp: row.created_at,
            section: row.section,
            priority: row.priority,
            senderId: row.sender_id,
            senderRole: row.sender_role,
            actionUrl: row.action_url,
            data: row.data,
            readAt: row.read_at,
            clicked: row.clicked,
            clickedAt: row.clicked_at,
            deliveredAt: row.delivered_at,
        });

        const channel = supabase
            .channel(`realtime:notifications:user:${uid}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${uid}`,
            }, async (payload: any) => {
                try {
                    if (payload.eventType === 'INSERT') {
                        const n = mapRow(payload.new);
                        await setNotifications(prev => {
                            if (prev.some(p => p.id === n.id)) return prev; // avoid duplicates
                            return [n, ...prev];
                        });
                    } else if (payload.eventType === 'UPDATE') {
                        const n = mapRow(payload.new);
                        await setNotifications(prev => prev.map(p => p.id === n.id ? { ...p, ...n } : p));
                    } else if (payload.eventType === 'DELETE') {
                        const id = payload.old?.id;
                        if (id) {
                            await setNotifications(prev => prev.filter(p => p.id !== id));
                        }
                    }
                } catch (e) {
                    console.warn('Realtime notifications update failed, falling back to refetch:', e);
                    try { await getNotifications(); } catch {}
                }
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Subscribed to notifications realtime for user', uid);
                }
            });

        return () => {
            try { supabase.removeChannel(channel); } catch {}
        };
    }, [isClient, session?.user, setNotifications, getNotifications]);

    // Cache management functions - moved up to avoid TDZ issues
    const clearCache = useCallback((key?: string) => {
        if (key) {
            cache.delete(key);
        } else {
            cache.clear();
        }
    }, []);

    const invalidateCache = useCallback((key: string) => {
        cache.delete(key);
    }, []);

    const setAreas = useCallback(async (areas: string[]) => {
        // استخدام واجهة API الجديدة لحفظ الإعدادات
        try {
            // تحديث الحالة المحلية أولاً (للتحديث الفوري للواجهة)
            setAreasState(areas);
            
            // حفظ في قاعدة البيانات عبر API
            const response = await fetch('/api/system-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    setting_key: 'app_areas',
                    setting_value: areas 
                }),
                credentials: 'include'
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                console.error('Failed to save areas to database:', result);
                throw new Error(result.error || result.details || 'خطأ في حفظ الإعدادات');
            }
            
            console.log('✅ Saved areas to database:', result);
            
            // إعادة تحميل من قاعدة البيانات للتأكد من المزامنة
            invalidateCache('areas');
            
            // استرداد السياق الذي تم تخزينه للتأكد من أن البيانات تم حفظها
            return { success: true, message: result.message || 'تم حفظ المناطق بنجاح' };
        } catch (error: any) {
            console.error('Failed to save areas to database:', error);
            // إعادة البيانات المخزنة سابقاً في حالة الفشل
            try {
                const response = await fetch('/api/system-settings?key=app_areas');
                if (response.ok) {
                    const result = await response.json();
                    if (result.data && result.data[0]) {
                        setAreasState(result.data[0].setting_value);
                    }
                }
            } catch (fetchError) {
                console.error('Error fetching original areas data:', fetchError);
            }
            
            return { success: false, message: error.message || 'فشل في حفظ المناطق' };
        }
    }, [invalidateCache]);

    const setLines = useCallback(async (lines: string[]) => {
        // استخدام واجهة API الجديدة لحفظ الإعدادات
        try {
            // تحديث الحالة المحلية أولاً (للتحديث الفوري للواجهة)
            setLinesState(lines);
            
            // حفظ في قاعدة البيانات عبر API
            const response = await fetch('/api/system-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    setting_key: 'app_lines',
                    setting_value: lines 
                }),
                credentials: 'include'
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                console.error('Failed to save lines to database:', result);
                throw new Error(result.error || result.details || 'خطأ في حفظ الإعدادات');
            }
            
            console.log('✅ Saved lines to database:', result);
            
            // إعادة تحميل من قاعدة البيانات للتأكد من المزامنة
            invalidateCache('lines');
            
            // استرداد السياق الذي تم تخزينه للتأكد من أن البيانات تم حفظها
            return { success: true, message: result.message || 'تم حفظ الخطوط بنجاح' };
        } catch (error: any) {
            console.error('Failed to save lines to database:', error);
            // إعادة البيانات المخزنة سابقاً في حالة الفشل
            try {
                const response = await fetch('/api/system-settings?key=app_lines');
                if (response.ok) {
                    const result = await response.json();
                    if (result.data && result.data[0]) {
                        setLinesState(result.data[0].setting_value);
                    }
                }
            } catch (fetchError) {
                console.error('Error fetching original lines data:', fetchError);
            }
            
            return { success: false, message: error.message || 'فشل في حفظ الخطوط' };
        }
    }, [invalidateCache]);

    // Current user memoized early to avoid TDZ issues in dependency arrays
    const currentUser = useMemo(() => session?.user as User | null, [session?.user]);

    // Optimized CRUD operations
    // Professional Products CRUD
    const addProduct = useCallback(async (product: Omit<Product, 'id'>): Promise<Product> => {
        // Use API route instead of direct client-side insert (bypasses RLS)
        try {
            const response = await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(product),
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.details || errorData.error || `HTTP ${response.status}`);
            }
            
            const createdProduct = await response.json();
            const productWithId: Product = { 
                ...product, 
                id: createdProduct.id,
            };
            
            // Optimistic update after successful creation
            await setProducts((prev) => [productWithId, ...prev]);
            return productWithId;
        } catch (error: any) {
            console.error('Failed to add product:', error);
            throw new Error(`فشل إضافة المنتج: ${error.message}`);
        }
    }, [setProducts]);

    const updateProduct = useCallback(async (id: string, changes: Partial<Product>): Promise<void> => {
        let snapshot: Product[] = [];
        await setProducts((prev) => {
            snapshot = prev;
            return prev.map(p => p.id === id ? { ...p, ...changes } : p);
        });
        try {
            // Use API route to update (bypasses RLS)
            const response = await fetch(`/api/products/${encodeURIComponent(id)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(changes),
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.details || errorData.error || `HTTP ${response.status}`);
            }
        } catch (error) {
            console.error('Failed to update product:', error);
            // Rollback to snapshot
            await setProducts(snapshot);
            throw error;
        }
    }, [setProducts]);

    // Professional clinics CRUD
    const addClinicDirect = useCallback(async (clinic: Omit<Clinic, 'id'>): Promise<Clinic> => {
        try {
            const userId = (session?.user as any)?.id;
            // Use API route to add clinic (bypasses RLS with service role)
            const clinicData: any = {
                name: clinic.name,
                doctor_name: clinic.doctorName,
                address: clinic.address,
                lat: clinic.lat,
                lng: clinic.lng,
                area: clinic.area,
                line: clinic.line,
                clinic_phone: (clinic as any).clinicPhone ?? null,
                doctor_phone: (clinic as any).doctorPhone ?? null,
                registered_at: (clinic as any).registeredAt || new Date().toISOString(),
                classification: (clinic as any).classification ?? 'B',
                credit_status: (clinic as any).creditStatus ?? 'green',
                notes: (clinic as any).representativeNotes ?? (clinic as any).clinicNotes ?? null,
                is_active: true,
            };

            const response = await fetch('/api/clinics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(clinicData),
                credentials: 'include'
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || errorData.details || `HTTP ${response.status}`);
            }
            
            const createdClinic = await response.json();
            const clinicWithId: Clinic = { 
                ...clinic, 
                id: createdClinic.id,
            };
            
            // Update cache and state immediately
            await setClinics((prev) => [clinicWithId, ...prev]);
            // Invalidate cache to force fresh fetch next time
            invalidateCache('clinics');
            
            console.log('✅ Clinic created successfully:', clinicWithId.name);
            return clinicWithId;
        } catch (error: any) {
            console.error('Failed to add clinic:', error);
            throw new Error(`فشل إضافة العيادة: ${error.message}`);
        }
    }, [setClinics, invalidateCache, session]);

    // Other operations
    const addPlanTask = useCallback(async (task: Omit<PlanTask, 'id'>): Promise<PlanTask> => {
        const taskWithId: PlanTask = { ...task, id: generateUUID() };
        try {
            await addPlanTaskData(taskWithId);
            await setPlanTasks(prev => [taskWithId, ...prev]);
            return taskWithId;
        } catch (error) {
            console.error('Failed to add plan task:', error);
            throw error;
        }
    }, [setPlanTasks]);

    const addVisit = useCallback(async (visit: Omit<Visit, 'id'>): Promise<Visit> => {
        const visitWithId: Visit = { ...visit, id: generateUUID() };
        try {
            await addVisitData(visitWithId);
            await setVisits(prev => [visitWithId, ...prev]);
            return visitWithId;
        } catch (error) {
            console.error('Failed to add visit:', error);
            throw error;
        }
    }, [setVisits]);

    const addOrderDirect = useCallback(async (orderInput: Omit<Order, 'id'>): Promise<Order> => {
        const order: Order = { ...orderInput, id: generateUUID() } as any;
        await addOrder(order);
        await setOrders(prev => [order, ...prev]);
        return order;
    }, [setOrders]);

    const addCollectionDirect = useCallback(async (collectionInput: Omit<Collection, 'id'>): Promise<Collection> => {
        const collection: Collection = { ...collectionInput, id: generateUUID() } as any;
        await addCollectionData(collection);
        await setCollections(prev => [collection, ...prev]);
        return collection;
    }, [setCollections]);

    const addDebtDirect = useCallback(async (debtInput: Omit<Debt, 'id'>): Promise<Debt> => {
        const debt: Debt = { ...debtInput, id: generateUUID() } as any;
        await addDebt(debt);
        return debt;
    }, []);

    const updateUser = useCallback(async (id: string, data: Partial<User>): Promise<void> => {
        await updateUserData(id, data);
        invalidateCache('users');
        await getUsers(); // Refresh users
    }, [getUsers, invalidateCache]);

    // Delete operations with cache invalidation
    const deleteUser = useCallback(async (id: string): Promise<void> => {
        await deleteUserData(id);
        // Invalidate cache and fetch fresh data from server
        invalidateCache('users');
        // Optimistically remove from UI
        await setUsers(prev => prev.filter(u => u.id !== id));
        // Refresh from server to ensure consistency
        try {
            await getUsers();
        } catch (error) {
            console.warn('Failed to refresh users after deletion:', error);
        }
    }, [setUsers, invalidateCache, getUsers]);

    const deleteClinic = useCallback(async (id: string): Promise<void> => {
        if ((currentUser as any)?.role !== 'admin') {
            throw new Error('ليس لديك صلاحية لحذف العيادات');
        }
        await deleteClinicData(id);
        await setClinics(prev => prev.filter(c => c.id !== id));
        invalidateCache('clinics');
    }, [setClinics, currentUser, invalidateCache]);

    const deleteProduct = useCallback(async (id: string): Promise<void> => {
        // Optimistic update
        const snapshot = products;
        await setProducts(prev => prev.filter(p => p.id !== id));
        
        try {
            // Use API route to delete (bypasses RLS)
            const response = await fetch(`/api/products/${encodeURIComponent(id)}`, {
                method: 'DELETE',
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.details || errorData.error || `HTTP ${response.status}`);
            }
            
            // Invalidate cache after successful deletion
            invalidateCache('products');
            
            // Refresh products from server to ensure consistency
            try {
                await getProducts();
            } catch (refreshError) {
                console.warn('Failed to refresh products after deletion:', refreshError);
            }
        } catch (error) {
            console.error('Failed to delete product:', error);
            // Rollback on error
            await setProducts(snapshot);
            throw error;
        }
    }, [setProducts, products, invalidateCache, getProducts]);

    const deleteOrder = useCallback(async (id: string): Promise<void> => {
        if ((currentUser as any)?.role !== 'admin') {
            throw new Error('ليس لديك صلاحية لحذف الطلبات');
        }
        await deleteOrderData(id);
        await setOrders(prev => prev.filter(o => o.id !== id));
        invalidateCache('orders');
    }, [setOrders, currentUser, invalidateCache]);

    const deleteVisit = useCallback(async (id: string): Promise<void> => {
        if ((currentUser as any)?.role !== 'admin') {
            throw new Error('ليس لديك صلاحية لحذف الزيارات');
        }
        await deleteVisitData(id);
        await setVisits(prev => prev.filter(v => v.id !== id));
        invalidateCache('visits');
    }, [setVisits, currentUser, invalidateCache]);

    const deleteCollection = useCallback(async (id: string): Promise<void> => {
        await deleteCollectionData(id);
        await setCollections(prev => prev.filter(c => c.id !== id));
    }, [setCollections]);

    const deletePlanTask = useCallback(async (id: string): Promise<void> => {
        await deletePlanTaskData(id);
        await setPlanTasks(prev => prev.filter(t => t.id !== id));
    }, [setPlanTasks]);

    const deleteNotification = useCallback(async (id: string): Promise<void> => {
        await deleteNotificationData(id);
        await setNotifications(prev => prev.filter(n => n.id !== id));
    }, [setNotifications]);

    const deleteExpense = useCallback(async (id: string): Promise<void> => {
        await deleteExpenseData(id);
        await setExpenses(prev => prev.filter(e => e.id !== id));
    }, [setExpenses]);


    const contextValue = useMemo(() => ({
        isClient,
        isLoading,
        currentUser,
        // Lazy getters
        getUsers,
        getClinics,
        getProducts,
        getOrders,
        getVisits,
        getCollections,
        getPlanTasks,
        getActivityLog,
        getNotifications,
        getExpenses,
        // Current state
        users,
        clinics,
        products,
        orders,
        visits,
        collections,
        planTasks,
        activityLog,
        notifications,
        expenses,
        areas,
        lines,
        // Setters
        setUsers,
        setClinics,
        setProducts,
        setOrders,
        setVisits,
        setCollections,
        setPlanTasks,
        setActivityLog,
        setNotifications,
        setExpenses,
        setAreas,
        setLines,
        // Operations
        addProduct,
        updateProduct,
        addClinicDirect,
        addPlanTask,
        addVisit,
        addOrder: addOrderDirect,
        addCollection: addCollectionDirect,
        addDebt: addDebtDirect,
        updateUser,
        deleteUser,
        deleteClinic,
        deleteProduct,
        deleteOrder,
        deleteVisit,
        deleteCollection,
        deletePlanTask,
        deleteNotification,
        deleteExpense,
        // Cache management
        clearCache,
        invalidateCache,
    }), [
        isClient, isLoading, currentUser,
        getUsers, getClinics, getProducts, getOrders, getVisits, getCollections,
        getPlanTasks, getActivityLog, getNotifications, getExpenses,
        users, clinics, products, orders, visits, collections, planTasks,
        activityLog, notifications, expenses, areas, lines,
        setUsers, setClinics, setProducts, setOrders, setVisits, setCollections,
        setPlanTasks, setActivityLog, setNotifications, setExpenses, setAreas, setLines,
        addProduct, updateProduct, addClinicDirect, addPlanTask, addVisit, updateUser, deleteUser, deleteClinic, deleteProduct,
        deleteOrder, deleteVisit, deleteCollection, deletePlanTask, deleteNotification,
        deleteExpense, clearCache, invalidateCache
    ]);

    return (
        <DataContext.Provider value={contextValue}>
            {children}
        </DataContext.Provider>
    );
};

export const useOptimizedDataProvider = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useOptimizedDataProvider must be used within an OptimizedDataProvider');
    }
    return context;
};

// Export for backward compatibility
export const useDataProvider = useOptimizedDataProvider;