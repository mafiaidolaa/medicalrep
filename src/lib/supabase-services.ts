import { supabase } from './supabase'
import type { User, Clinic, Product, Order, Visit, Collection, PlanTask, ActivityLog, Notification, Expense } from './types'
import type { Database } from './database.types'

// UUID generation helper function
export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Type mappings between our app types and Supabase database types
type SupabaseUser = Database['public']['Tables']['users']['Row']
type SupabaseClinic = Database['public']['Tables']['clinics']['Row']
type SupabaseProduct = Database['public']['Tables']['products']['Row']
type SupabaseOrder = Database['public']['Tables']['orders']['Row']
type SupabaseVisit = Database['public']['Tables']['visits']['Row']
type SupabaseCollection = Database['public']['Tables']['collections']['Row']
type SupabasePlanTask = Database['public']['Tables']['plan_tasks']['Row']
type SupabaseActivityLog = Database['public']['Tables']['activity_log']['Row']
type SupabaseNotification = Database['public']['Tables']['notifications']['Row']
type SupabaseExpense = Database['public']['Tables']['expenses']['Row']
// Debts
type SupabaseDebt = Database['public']['Tables']['debts']['Row']

// Transformation functions to convert between Supabase and app types
const transformUser = (dbUser: SupabaseUser): User => ({
  id: dbUser.id,
  fullName: dbUser.full_name,
  username: dbUser.username,
  email: dbUser.email,
  role: dbUser.role,
  hireDate: dbUser.hire_date,
  password: dbUser.password,
  area: dbUser.area,
  line: dbUser.line,
  managerId: dbUser.manager_id,
  primaryPhone: dbUser.primary_phone,
  whatsappPhone: dbUser.whatsapp_phone,
  altPhone: dbUser.alt_phone,
  profilePicture: dbUser.profile_picture,
  salesTarget: dbUser.sales_target,
  visitsTarget: dbUser.visits_target,
  isActive: dbUser.is_active,
})

const transformClinic = (dbClinic: SupabaseClinic): Clinic => ({
  id: dbClinic.id,
  name: dbClinic.name,
  doctorName: dbClinic.doctor_name,
  address: dbClinic.address,
  lat: dbClinic.lat,
  lng: dbClinic.lng,
  registeredAt: dbClinic.registered_at,
  clinicPhone: dbClinic.clinic_phone,
  doctorPhone: dbClinic.doctor_phone,
  area: dbClinic.area,
  line: dbClinic.line,
  classification: dbClinic.classification,
  creditStatus: dbClinic.credit_status,
})

const transformProduct = (dbProduct: SupabaseProduct): Product => ({
  id: dbProduct.id,
  name: dbProduct.name,
  // فئة اختيارية: إن وُجدت
  category: (dbProduct as any).category || 'General',
  price: dbProduct.price,
  imageUrl: (dbProduct as any).image_url ?? undefined,
  stock: (dbProduct as any).stock ?? 0,
  averageDailyUsage: (dbProduct as any).average_daily_usage ?? 0,
  line: (dbProduct as any).line || '',
  reorderLevel: (dbProduct as any).min_stock ?? undefined,
})

const transformOrder = (dbOrder: SupabaseOrder): Order => ({
  id: dbOrder.id,
  clinicId: dbOrder.clinic_id,
  clinicName: '', // Will be populated by join query or separate lookup
  representativeId: dbOrder.representative_id,
  items: (dbOrder.items as any) || [],
  total: dbOrder.total_amount, // Map to 'total' field
  totalAmount: dbOrder.total_amount,
  status: dbOrder.status,
  orderDate: dbOrder.order_date,
  dueDate: (dbOrder as any).due_date,
  deliveryDate: dbOrder.delivery_date,
  notes: dbOrder.notes,
})

const transformVisit = (dbVisit: SupabaseVisit): Visit => ({
  id: dbVisit.id,
  clinicId: dbVisit.clinic_id,
  clinicName: '', // Will be populated by join query or separate lookup
  representativeId: dbVisit.representative_id,
  visitDate: dbVisit.visit_date,
  purpose: dbVisit.purpose,
  notes: dbVisit.notes || '',
  isCompleted: false, // Default value, can be computed from outcome
  outcome: dbVisit.outcome as 'successful' | 'unsuccessful' | 'follow_up_needed' | undefined,
  nextVisitDate: dbVisit.next_visit_date,
})

const transformCollection = (dbCollection: SupabaseCollection): Collection => ({
  id: dbCollection.id,
  orderId: (dbCollection as any).order_id || '',
  clinicName: '', // Will be populated by join query or separate lookup
  repName: '', // Will be populated by join query or separate lookup
  clinicId: dbCollection.clinic_id,
  representativeId: dbCollection.representative_id,
  amount: dbCollection.amount,
  collectionDate: dbCollection.collection_date,
  paymentMethod: dbCollection.payment_method,
  notes: dbCollection.notes,
})

const transformPlanTask = (dbTask: SupabasePlanTask): PlanTask => ({
  id: dbTask.id,
  userId: dbTask.assigned_to, // Map assigned_to to userId
  userName: '', // Will be populated by join query or separate lookup
  clinicId: dbTask.clinic_id,
  clinicName: '', // Will be populated by join query or separate lookup
  area: '', // Will be populated by join query or separate lookup
  line: '', // Will be populated by join query or separate lookup
  taskType: 'visit', // Default task type
  date: dbTask.due_date,
  notes: dbTask.description,
  isCompleted: dbTask.status === 'completed',
  title: dbTask.title,
  description: dbTask.description,
  assignedTo: dbTask.assigned_to,
  dueDate: dbTask.due_date,
  status: dbTask.status,
  priority: dbTask.priority,
})

const transformActivityLog = (dbLog: SupabaseActivityLog): ActivityLog => ({
  id: dbLog.id,
  type: 'login', // Default type, can be mapped from action
  title: dbLog.action,
  timestamp: dbLog.timestamp,
  user: {
    id: dbLog.user_id,
    name: '', // Will be populated by join query
    role: '', // Will be populated by join query
  },
  device: '', // Default values
  browser: '', // Default values
  // Extended fields defaults
  isSuccess: true,
  userId: dbLog.user_id,
  action: dbLog.action,
  entityType: dbLog.entity_type,
  entityId: dbLog.entity_id,
  changes: dbLog.changes as any,
})

const transformNotification = (dbNotification: SupabaseNotification): Notification => ({
  id: (dbNotification as any).id,
  userId: (dbNotification as any).user_id,
  title: (dbNotification as any).title,
  message: (dbNotification as any).message,
  type: (dbNotification as any).type,
  read: (dbNotification as any).read,
  timestamp: (dbNotification as any).created_at,
  // Extended fields (optional depending on schema)
  section: (dbNotification as any).section,
  priority: (dbNotification as any).priority,
  senderId: (dbNotification as any).sender_id,
  senderRole: (dbNotification as any).sender_role,
  actionUrl: (dbNotification as any).action_url,
  data: (dbNotification as any).data,
  readAt: (dbNotification as any).read_at,
  clicked: (dbNotification as any).clicked,
  clickedAt: (dbNotification as any).clicked_at,
  deliveredAt: (dbNotification as any).delivered_at,
})

const transformExpense = (dbExpense: SupabaseExpense): Expense => ({
  id: dbExpense.id,
  userId: dbExpense.created_by, // Use created_by as userId
  userName: '', // Will be populated by join query
  date: dbExpense.expense_date, // Map to 'date' field
  category: dbExpense.category as 'transportation' | 'allowance' | 'client_expense' | 'other',
  amount: dbExpense.amount,
  description: dbExpense.description,
  expenseDate: dbExpense.expense_date,
  receiptUrl: dbExpense.receipt_url,
  status: dbExpense.status,
})

// Minimal transform for debts used in metrics
import type { Debt } from './types'
const transformDebt = (dbDebt: SupabaseDebt): Debt => ({
  id: dbDebt.id as any,
  client_name: (dbDebt as any).client_name,
  amount: (dbDebt as any).amount || 0,
  due_date: (dbDebt as any).due_date,
  status: (dbDebt as any).status,
  created_at: (dbDebt as any).created_at,
  created_by: (dbDebt as any).created_by,
  clinic_id: (dbDebt as any).clinic_id,
})

// Generic fetch function for collections (with optional pagination)
export const fetchCollection = async <T>(
  tableName: string,
  transformer: (row: any) => T,
  opts: { limit?: number; offset?: number } = {}
): Promise<T[]> => {
  const { limit = 200, offset = 0 } = opts

  // Use regular client for all operations from client-side
  // Service role operations should be handled via API routes
  const client = supabase
  
  try {
    // Try with created_at first, fallback to no ordering if column doesn't exist
    let { data, error } = await client
      .from(tableName)
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
      
    // If ordering by created_at fails, try without ordering
    if (error && (error.message?.includes('created_at') || error.message?.includes('column') || error.message?.includes('does not exist'))) {
      console.log(`Table ${tableName} doesn't have created_at column or has schema issues, fetching without ordering`)
      const fallbackQuery = await client
        .from(tableName)
        .select('*')
        .range(offset, offset + limit - 1)
      
      data = fallbackQuery.data
      error = fallbackQuery.error
    }

    if (error) {
      // Normalize error to avoid {} logs in Next DevTools and capture useful fields
      const normalizedError = {
        code: (error as any)?.code,
        message: (error as any)?.message ?? (typeof (error as any)?.error === 'string' ? (error as any)?.error : undefined),
        details: (error as any)?.details,
        hint: (error as any)?.hint,
        status: (error as any)?.status,
        name: (error as any)?.name,
      }

      // Handle specific database errors gracefully
      if (normalizedError.message?.includes('relation') && normalizedError.message?.includes('does not exist')) {
        console.warn(`⚠️ Table ${tableName} does not exist in database. Returning empty array.`)
        return []
      }
      
      if (normalizedError.message?.includes('column') && normalizedError.message?.includes('does not exist')) {
        console.warn(`⚠️ Column missing in table ${tableName}: ${normalizedError.message}. Returning empty array.`)
        return []
      }
      
      // Check for PGRST116 error (table not found) or Postgres code 42P01
      if (normalizedError.code === 'PGRST116' || normalizedError.code === '42P01') {
        console.warn(`⚠️ Table ${tableName} not found (${normalizedError.code}). Returning empty array.`)
        return []
      }

      // Handle permission / RLS scenarios gracefully
      if (
        normalizedError.code === 'PGRST301' || // Auth/permission issue
        normalizedError.code === 'PGRST302' || // RLS blocked
        normalizedError.code === '42501' ||    // insufficient_privilege
        (normalizedError.status && [401, 403].includes(normalizedError.status as any))
      ) {
        console.warn(`⚠️ Permission or RLS prevented access to ${tableName}. Returning empty array.`, normalizedError)
        return []
      }
      
      // Unexpected error - log with normalized structure
      console.error(`Error fetching ${tableName}:`, normalizedError)
      
      // Always return empty array for any database errors to prevent app crashes
      return []
    }

    return data?.map(transformer) || []
  } catch (fetchError) {
    const err: any = fetchError
    console.error(`Unexpected error fetching ${tableName}:`, {
      message: err?.message ?? String(err),
      code: err?.code,
      details: err?.details,
      hint: err?.hint,
      status: err?.status,
      name: err?.name,
    })
    return []
  }
}

// Generic add function
export const addData = async <T extends Record<string, any>>(
  tableName: string, 
  data: T, 
  transformToDb?: (data: T) => any
): Promise<void> => {
  const dbData = transformToDb ? transformToDb(data) : data
  
  // Use regular client for all operations from client-side
  // Service role operations should be handled via API routes
  const client = supabase
  
  const { error } = await client
    .from(tableName)
    .insert(dbData)

  if (error) {
    throw new Error(`Error adding to ${tableName}: ${error.message}`)
  }
}

// Generic update function
export const updateData = async <T extends Record<string, any>>(
  tableName: string, 
  id: string, 
  data: Partial<T>, 
  transformToDb?: (data: Partial<T>) => any
): Promise<void> => {
  const dbData = transformToDb ? transformToDb(data) : data
  
  console.log(`📝 Updating ${tableName} with ID: ${id}`);
  console.log('Original data:', data);
  console.log('Transformed data:', dbData);
  
  // Use regular client for all operations from client-side
  // Service role operations should be handled via API routes
  const client = supabase
  
  const updatePayload = { ...dbData as any, updated_at: new Date().toISOString() };
  console.log('Final update payload:', updatePayload);
  
  const { error, data: responseData } = await (client as any)
    .from(tableName)
    .update(updatePayload)
    .eq('id', id)
    .select(); // Add select to see what was actually updated

  if (error) {
    console.error(`❌ Error updating ${tableName}:`, error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    });
    throw new Error(`Error updating ${tableName}: ${error.message}`)
  }
  
  console.log(`✅ Successfully updated ${tableName}:`, responseData);
}

// Specific service functions
export const fetchUsers = async (
  opts: { limit?: number; offset?: number } = {}
): Promise<User[]> => {
  const { limit = 200, offset = 0 } = opts

  // 1) Try API route first (uses service role on server, bypasses RLS)
  try {
    const pageSize = Math.max(1, Math.min(limit, 1000));
    const page = Math.max(1, Math.floor(offset / pageSize) + 1);
    const url = `/api/users?pageSize=${encodeURIComponent(String(pageSize))}&page=${encodeURIComponent(String(page))}`;
    const res = await fetch(url, { credentials: 'include' });
    if (res.ok) {
      const rows: any[] = await res.json();
      const users: User[] = (rows || []).map((r: any) => ({
        id: r.id,
        fullName: r.full_name,
        username: r.username,
        email: r.email,
        role: r.role,
        // Fields that may not be returned by the trimmed API response will be undefined
        hireDate: r.hire_date,
        area: r.area,
        line: r.line,
        primaryPhone: r.primary_phone,
        whatsappPhone: r.whatsapp_phone,
        altPhone: r.alt_phone,
        profilePicture: r.profile_picture,
        salesTarget: r.sales_target,
        visitsTarget: r.visits_target,
      }));
      console.log(`✅ Successfully fetched ${users.length} users via API`);
      return users;
    } else {
      console.warn(`⚠️ /api/users responded with ${res.status}. Falling back to direct client fetch.`);
    }
  } catch (apiErr: any) {
    console.warn('⚠️ Failed to fetch users via /api/users, falling back to direct client fetch:', apiErr?.message || apiErr);
  }

  // 2) Fallback to direct client fetch (may be restricted by RLS when using anon key)
  const client = supabase
  console.log(`🔄 Fallback: fetching users directly (limit=${limit}, offset=${offset})...`)
  const { data, error } = await client
    .from('users')
    .select('*') // Keep full columns to satisfy transformUser mapping
    .order('full_name', { ascending: true }) // Order by name
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('❌ Error fetching users (direct):', error)
    // Return empty array to allow app to continue
    return []
  }

  const users = data?.map(transformUser) || []
  console.log(`✅ Successfully fetched ${users.length} users (direct):`, users.map((u: any) => `${u.fullName} (${u.role})`).join(', '))
  return users
}
export const fetchClinics = async (opts?: { limit?: number; offset?: number }): Promise<Clinic[]> => {
  const { limit = 200, offset = 0 } = opts || {};
  
  // 1) Try API route first (uses service role on server, bypasses RLS)
  try {
    const url = `/api/clinics?limit=${encodeURIComponent(String(limit))}&offset=${encodeURIComponent(String(offset))}`;
    const res = await fetch(url, { credentials: 'include' });
    if (res.ok) {
      const rows: any[] = await res.json();
      const clinics = (rows || []).map(transformClinic);
      console.log(`✅ Fetched ${clinics.length} clinics via API`);
      return clinics;
    } else {
      console.warn(`⚠️ /api/clinics responded with ${res.status}. Falling back to direct fetch.`);
    }
  } catch (e) {
    console.warn('fetchClinics via API failed, falling back to client supabase:', (e as any)?.message || e);
  }
  
  // 2) Fallback to direct client fetch (may be restricted by RLS)
  try {
    const { limit = 200, offset = 0 } = opts || {};
    const client = supabase as any;
    let q = client.from('clinics').select('*').eq('is_active', true);
    try { q = q.is('deleted_at', null); } catch (_) {}
    q = q.order('name', { ascending: true }).range(offset, offset + limit - 1);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map(transformClinic);
  } catch (e) {
    console.warn('Fallback clinics direct fetch failed:', (e as any)?.message || e);
    return [];
  }
}
export const fetchProducts = async (opts?: { limit?: number; offset?: number }): Promise<Product[]> => {
  const { limit = 200, offset = 0 } = opts || {};
  // 1) Try API route first (uses service role on server)
  try {
    const url = `/api/products?limit=${encodeURIComponent(String(limit))}&offset=${encodeURIComponent(String(offset))}`;
    const res = await fetch(url, { credentials: 'include' });
    if (res.ok) {
      const rows: any[] = await res.json();
      return (rows || []).map(transformProduct);
    }
  } catch (e) {
    console.warn('fetchProducts via API failed, falling back to client supabase:', (e as any)?.message || e);
  }
  // 2) Fallback to direct client fetch
  return fetchCollection('products', transformProduct, opts);
}
export const fetchOrders = (opts?: { limit?: number; offset?: number }) => fetchCollection('orders', transformOrder, opts)
export const fetchVisits = (opts?: { limit?: number; offset?: number }) => fetchCollection('visits', transformVisit, opts)
export const fetchCollections = (opts?: { limit?: number; offset?: number }) => fetchCollection('collections', transformCollection, opts)
export const fetchPlanTasks = (opts?: { limit?: number; offset?: number }) => fetchCollection('plan_tasks', transformPlanTask, opts)
export const fetchActivityLog = (opts?: { limit?: number; offset?: number }) => fetchCollection('activity_log', transformActivityLog, opts)
export const fetchNotifications = (opts?: { limit?: number; offset?: number }) => fetchCollection('notifications', transformNotification, opts)
export const fetchExpenses = (opts?: { limit?: number; offset?: number }) => fetchCollection('expenses', transformExpense, opts)
export const fetchDebts = (opts?: { limit?: number; offset?: number }) => fetchCollection('debts', transformDebt, opts)

// Note: getUserByUsername moved to server-side only functions
// Use /api routes for user authentication operations

// Transform functions for adding data
const transformUserToDb = (user: User): Database['public']['Tables']['users']['Insert'] => ({
  id: user.id,
  full_name: user.fullName,
  username: user.username,
  email: user.email,
  role: user.role as 'admin' | 'medical_rep' | 'manager' | 'accountant',
  hire_date: user.hireDate || new Date().toISOString(),
  password: user.password || '',
  area: user.area,
  line: user.line,
  manager_id: user.managerId,
  primary_phone: user.primaryPhone || '',
  whatsapp_phone: user.whatsappPhone,
  alt_phone: user.altPhone,
  profile_picture: user.profilePicture,
  sales_target: user.salesTarget,
  visits_target: user.visitsTarget,
  is_active: user.isActive,
})

const transformClinicToDb = (clinic: Clinic): Database['public']['Tables']['clinics']['Insert'] => ({
  id: clinic.id,
  name: clinic.name,
  doctor_name: clinic.doctorName,
  address: clinic.address,
  lat: clinic.lat,
  lng: clinic.lng,
  registered_at: clinic.registeredAt,
  clinic_phone: clinic.clinicPhone,
  doctor_phone: clinic.doctorPhone,
  area: clinic.area || '',
  line: clinic.line || '',
  classification: clinic.classification || 'B',
  credit_status: clinic.creditStatus || 'green',
})

const transformProductToDb = (product: Product): Database['public']['Tables']['products']['Insert'] => {
  const p: any = product as any;
  const dbProduct: any = {
    id: product.id,
    name: product.name,
    sku: p.sku ?? undefined, // required by DB; API will generate if missing
    price: p.price,
    cost_price: p.cost_price ?? p.cost ?? null,
    image_url: p.image_url ?? p.imageUrl ?? null,
    stock: p.stock ?? 0,
    min_stock_level: p.min_stock_level ?? p.min_stock ?? null,
    max_stock_level: p.max_stock_level ?? p.max_stock ?? null,
    average_daily_usage: p.average_daily_usage ?? p.averageDailyUsage ?? 0,
    line: p.line ?? null,
    unit: p.unit ?? null,
  };
  return dbProduct;
}

const transformOrderToDb = (order: Order): Database['public']['Tables']['orders']['Insert'] => ({
  id: order.id,
  clinic_id: order.clinicId,
  representative_id: order.representativeId,
  items: order.items as any,
  total_amount: order.totalAmount,
  status: order.status,
  order_date: order.orderDate,
  due_date: order.dueDate,
  delivery_date: order.deliveryDate,
  notes: order.notes,
})

const transformVisitToDb = (visit: Visit): Database['public']['Tables']['visits']['Insert'] => ({
  id: visit.id,
  clinic_id: visit.clinicId,
  representative_id: visit.representativeId,
  visit_date: visit.visitDate,
  purpose: visit.purpose,
  notes: visit.notes,
  outcome: visit.outcome,
  next_visit_date: visit.nextVisitDate,
})

const transformCollectionToDb = (collection: Collection): Database['public']['Tables']['collections']['Insert'] => ({
  id: collection.id,
  clinic_id: collection.clinicId,
  representative_id: collection.representativeId,
  order_id: (collection as any).orderId || undefined,
  amount: collection.amount,
  collection_date: collection.collectionDate,
  payment_method: collection.paymentMethod,
  notes: collection.notes,
})

const transformPlanTaskToDb = (task: PlanTask): Database['public']['Tables']['plan_tasks']['Insert'] => ({
  id: task.id,
  title: task.title,
  description: task.description,
  assigned_to: task.assignedTo,
  due_date: task.dueDate,
  status: task.status,
  priority: task.priority,
  clinic_id: task.clinicId,
})

const transformActivityLogToDb = (log: ActivityLog): Database['public']['Tables']['activity_log']['Insert'] => ({
  id: log.id,
  user_id: log.userId,
  action: log.action,
  entity_type: log.entityType,
  entity_id: log.entityId,
  changes: log.changes as any,
  timestamp: log.timestamp,
})

const transformNotificationToDb = (notification: Notification): Database['public']['Tables']['notifications']['Insert'] => ({
  id: notification.id,
  user_id: notification.userId,
  title: notification.title,
  message: notification.message,
  type: notification.type,
  read: notification.read,
})

const transformExpenseToDb = (expense: Expense): Database['public']['Tables']['expenses']['Insert'] => ({
  id: expense.id,
  created_by: expense.userId, // Use created_by instead of user_id
  category: expense.category,
  amount: expense.amount,
  description: expense.description,
  expense_date: expense.expenseDate,
  receipt_url: expense.receiptUrl,
  status: expense.status,
})

// Specific add functions with transformations
export const addUser = async (user: User) => {
  // Use API endpoint to create user (server-side with service role)
  console.log('🚀 addUser: Using API endpoint to create user');
  
  // Ensure passwords are hashed before sending
  const payload: User = { ...user };
  if (payload.password && payload.password.length < 60) {
    try {
      const bcrypt = await import('bcryptjs');
      payload.password = await bcrypt.hash(payload.password, 10);
    } catch (e) {
      console.warn('Failed to hash password:', e);
      throw new Error('Failed to hash password');
    }
  }
  
  const postOnce = async () => {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        id: payload.id,
        full_name: payload.fullName,
        username: payload.username,
        email: payload.email,
        password: payload.password,
        role: payload.role,
        hire_date: payload.hireDate || new Date().toISOString(),
        area: payload.area,
        line: payload.line,
        primary_phone: payload.primaryPhone,
        whatsapp_phone: payload.whatsappPhone,
        alt_phone: payload.altPhone,
        profile_picture: payload.profilePicture,
        sales_target: payload.salesTarget,
        visits_target: payload.visitsTarget,
      }),
    });
    if (res.ok) return res;

    // Robust error parsing: try JSON, fallback to text
    const raw = await res.text();
    let message = 'Failed to create user via API';
    try {
      const parsed = raw ? JSON.parse(raw) : {};
      console.error('❌ API error payload:', parsed);
      message = parsed?.error || message;
    } catch (e) {
      console.error('❌ API error text:', raw || String(e));
      if (raw) message = raw;
    }
    // Attach status for decision making
    const err: any = new Error(message);
    err.status = res.status;
    throw err;
  };

  // Call API endpoint, retry once on duplicate id
  try {
    try {
      const response = await postOnce();
      console.log('✅ User created successfully via API');
      // Log user creation - pass userId to avoid getServerSession error
      try {
        const { activityLogger } = await import('./activity-logger');
        await activityLogger.log({
          action: 'create_user',
          entity_type: 'user',
          entity_id: payload.id,
          title: `مستخدم جديد: ${payload.fullName}`,
          details: `تم إنشاء مستخدم جديد: ${payload.fullName} بدور ${payload.role}`,
          type: 'create'
        }, undefined, 'system');
      } catch (error) {
        console.warn('Failed to log user creation:', error);
      }
      return;
    } catch (e: any) {
      const msg = String(e?.message || '');
      const isDup = e?.status === 409 || /users_pkey|duplicate key/i.test(msg);
      if (isDup) {
        console.warn('Duplicate user id detected. Regenerating id and retrying once...');
        payload.id = generateUUID();
        const response = await postOnce();
        console.log('✅ User created successfully via API after id regeneration');
        // Log with new id
        try {
          const { activityLogger } = await import('./activity-logger');
          await activityLogger.log({
            action: 'create_user',
            entity_type: 'user',
            entity_id: payload.id,
            title: `مستخدم جديد: ${payload.fullName}`,
            details: `تم إنشاء مستخدم جديد: ${payload.fullName} بدور ${payload.role}`,
            type: 'create'
          }, undefined, 'system');
        } catch (error) {
          console.warn('Failed to log user creation:', error);
        }
        return;
      }
      throw e;
    }
  } catch (error: any) {
    console.error('❌ addUser failed:', error);
    throw new Error(`Error adding user: ${error.message}`);
  }
}

export const addClinic = async (clinic: Clinic, userId?: string) => {
  // 1) Try API route first (service role on server bypasses RLS)
  try {
    const payload = transformClinicToDb(clinic) as any;
    const res = await fetch('/api/clinics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include'
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`API responded ${res.status}: ${text}`);
    }
  } catch (e) {
    console.warn('addClinic via API failed, falling back to direct supabase:', (e as any)?.message || e);
    await addData('clinics', clinic, transformClinicToDb)
  }
  // Log clinic creation - pass userId to avoid getServerSession error
  try {
    const { activityLogger } = await import('./activity-logger')
    await activityLogger.log({
      action: 'create_clinic',
      entity_type: 'clinic',
      entity_id: clinic.id,
      title: `إنشاء عيادة جديدة: ${clinic.name}`,
      details: `تم إنشاء عيادة جديدة بالاسم: ${clinic.name}`,
      type: 'create'
    }, undefined, userId || 'system')
  } catch (error) {
    console.warn('Failed to log clinic creation:', error)
  }
}

export const addProduct = async (product: Product) => {
  // 1) Try API route first
  try {
    const payload = transformProductToDb(product) as any;
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include'
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`API responded ${res.status}: ${text}`);
    }
    return;
  } catch (e) {
    console.warn('addProduct via API failed, falling back to direct supabase:', (e as any)?.message || e);
  }
  // 2) Fallback to direct supabase
  return addData('products', product, transformProductToDb);
}
export const addOrder = async (order: Order) => {
  await addData('orders', order, transformOrderToDb)
  // Log order creation
  try {
    const { activityLogger } = await import('./activity-logger')
    // Find clinic name for the order
    const clinics = await fetchClinics()
    const clinic = clinics.find(c => c.id === order.clinicId)
    await activityLogger.logOrderCreate(order.id, clinic?.name || 'Unknown Clinic', order.totalAmount)
  } catch (error) {
    console.warn('Failed to log order creation:', error)
  }
}
export const addVisit = async (visit: Visit, userId?: string) => {
  // 1) Try API route first (uses service role on server, bypasses RLS)
  try {
    const payload = transformVisitToDb(visit) as any;
    const res = await fetch('/api/visits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include'
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`API responded ${res.status}: ${text}`);
    }
  } catch (e) {
    console.warn('addVisit via API failed, falling back to direct supabase:', (e as any)?.message || e);
    await addData('visits', visit, transformVisitToDb);
  }
  // 2) Log visit creation - pass userId to avoid getServerSession error
  try {
    const { activityLogger } = await import('./activity-logger')
    const clinics = await fetchClinics()
    const clinic = clinics.find(c => c.id === visit.clinicId)
    await activityLogger.log({
      action: 'create_visit',
      entity_type: 'visit',
      entity_id: visit.id,
      title: `زيارة جديدة: ${clinic?.name || 'Unknown Clinic'}`,
      details: `تم تسجيل زيارة جديدة لعيادة ${clinic?.name || 'Unknown Clinic'}`,
      type: 'create'
    }, undefined, userId || visit.userId || 'system')
  } catch (error) {
    console.warn('Failed to log visit creation:', error)
  }
}
export const addCollection = (collection: Collection) => addData('collections', collection, transformCollectionToDb)
export const addPlanTask = (task: PlanTask) => addData('plan_tasks', task, transformPlanTaskToDb)
export const addActivityLog = (log: ActivityLog) => addData('activity_log', log, transformActivityLogToDb)
export const addNotification = (notification: Notification) => addData('notifications', notification, transformNotificationToDb)
export const addExpense = (expense: Expense) => addData('expenses', expense, transformExpenseToDb)

// Debts
import type { Debt } from './types'
export const addDebt = async (debt: Debt) => {
  const client = supabase as any;
  const payload: any = {
    id: debt.id,
    client_name: debt.client_name || 'Unknown',
    clinic_id: debt.clinic_id ?? null,
    amount: debt.amount,
    due_date: debt.due_date || new Date().toISOString(),
    status: (debt.status as any) || 'current',
    invoice_number: (debt as any).invoice_number || null,
    notes: (debt as any).notes || null,
    created_by: debt.created_by || (await client.auth.getUser()).data?.user?.id || 'system',
    created_at: new Date().toISOString(),
  };
  const { error } = await client.from('debts').insert(payload);
  if (error) throw new Error(error.message);
  return;
}

// INVENTORY SERVICES
export const inventoryServices = {
  // Create inventory movement via RPC if available, fallback to direct update
  async createMovement(params: { product_id: string, quantity: number, movement_type: 'in' | 'out' | 'adjust', source?: 'order' | 'invoice' | 'manual' | 'import', source_id?: string }) {
    const client = supabase as any;
    const { product_id, quantity, movement_type, source = 'manual', source_id } = params;

    // حاول RPC أولاً
    const rpc = await client.rpc('adjust_inventory', {
      p_product: product_id,
      p_qty: quantity,
      p_type: movement_type,
      p_source: source,
      p_source_id: source_id ?? null
    });

    if (!rpc.error) return { success: true };

    // Fallback: تحديث مباشر غير ذري (لبيئة التطوير)
    // 1) جلب المخزون الحالي
    const { data: prod, error: prodErr } = await client
      .from('products')
      .select('stock')
      .eq('id', product_id)
      .single();

    if (prodErr) throw prodErr;

    const delta = movement_type === 'in' ? quantity : movement_type === 'out' ? -quantity : quantity;
    const newStock = (prod?.stock ?? 0) + delta;
    if (newStock < 0) throw new Error('Insufficient stock');

    const { error: upErr } = await client
      .from('products')
      .update({ stock: newStock, updated_at: new Date().toISOString() })
      .eq('id', product_id);

    if (upErr) throw upErr;

    // تسجيل الحركة إن توفر الجدول
    await client
      .from('product_movements')
      .insert({
        product_id,
        movement_type,
        quantity,
        source,
        source_id: source_id ?? null
      });

    return { success: true };
  }
};

// Specific update functions with transformations
// Create partial transformation functions for updates
const createPartialTransform = <T, U>(fullTransform: (data: T) => U) => {
  return (data: Partial<T>) => {
    const result: Partial<U> = {}
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        // For now, just pass through the data with proper field mapping
        // This is a simplified approach - in production you'd want more robust mapping
        (result as any)[key] = value
      }
    }
    return result
  }
}

// Update functions with proper partial handling
export const updateUser = async (id: string, user: Partial<User>) => {
  // Transform camelCase frontend fields to snake_case database fields
  const transformedUser: any = {}
  
  if (user.fullName !== undefined) transformedUser.full_name = user.fullName
  if (user.username !== undefined) transformedUser.username = user.username
  if (user.email !== undefined) transformedUser.email = user.email
  if (user.role !== undefined) transformedUser.role = user.role
  if (user.hireDate !== undefined) transformedUser.hire_date = user.hireDate
  if (user.password !== undefined) transformedUser.password = user.password
  if (user.area !== undefined) transformedUser.area = user.area
  if (user.line !== undefined) transformedUser.line = user.line
  if (user.primaryPhone !== undefined) transformedUser.primary_phone = user.primaryPhone
  if (user.whatsappPhone !== undefined) transformedUser.whatsapp_phone = user.whatsappPhone
  if (user.altPhone !== undefined) transformedUser.alt_phone = user.altPhone
  if (user.profilePicture !== undefined) transformedUser.profile_picture = user.profilePicture
  if (user.salesTarget !== undefined) transformedUser.sales_target = user.salesTarget
  if (user.visitsTarget !== undefined) transformedUser.visits_target = user.visitsTarget

  // Ensure passwords are hashed for NextAuth credentials compare
  if (typeof transformedUser.password === 'string' && transformedUser.password.length > 0) {
    try {
      const bcrypt = await import('bcryptjs');
      // If not a bcrypt hash, hash it
      const looksHashed = transformedUser.password.startsWith('$2') && transformedUser.password.length >= 60;
      if (!looksHashed) {
        transformedUser.password = await bcrypt.hash(String(transformedUser.password), 10);
      }
    } catch (e) {
      console.warn('Failed to hash password in updateUser, proceeding with given value (may break login):', (e as any)?.message || e);
    }
  }
  
  return updateData('users', id, transformedUser)
}
export const updateClinic = (id: string, clinic: Partial<Clinic>) => updateData('clinics', id, clinic)
export const updateProduct = async (id: string, product: Partial<Product>) => {
  // 1) Try API route first
  try {
    const payload: any = {};
    if (product.name !== undefined) payload.name = product.name;
    if (product.price !== undefined) payload.price = product.price as any;
    if (product.imageUrl !== undefined) payload.image_url = product.imageUrl;
    if (product.stock !== undefined) payload.stock = product.stock as any;
    if (product.averageDailyUsage !== undefined) payload.average_daily_usage = product.averageDailyUsage as any;
    if (product.line !== undefined) payload.line = product.line as any;

    const res = await fetch(`/api/products/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`API responded ${res.status}: ${text}`);
    }
    return;
  } catch (e) {
    console.warn('updateProduct via API failed, falling back to direct supabase:', (e as any)?.message || e);
  }
  // 2) Fallback
  return updateData('products', id, product);
}

export const updateOrder = (id: string, order: Partial<Order>) => updateData('orders', id, order)
export const updateVisit = (id: string, visit: Partial<Visit>) => updateData('visits', id, visit)
export const updateCollection = (id: string, collection: Partial<Collection>) => updateData('collections', id, collection)
export const updatePlanTask = (id: string, task: Partial<PlanTask>) => updateData('plan_tasks', id, task)
export const updateNotification = (id: string, notification: Partial<Notification>) => updateData('notifications', id, notification)
export const updateExpense = (id: string, expense: Partial<Expense>) => updateData('expenses', id, expense)

// Generic delete function
export const deleteData = async (
  tableName: string,
  id: string
): Promise<void> => {
  const client = supabase
  const { error } = await client
    .from(tableName)
    .delete()
    .eq('id', id)
  if (error) {
    throw new Error(`Error deleting from ${tableName}: ${error.message}`)
  }
}

// Specific delete functions
export const deleteUser = async (id: string) => {
  // 1) Try API route first (uses Service Role Key on server)
  try {
    const res = await fetch(`/api/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`API responded ${res.status}: ${text}`);
    }
    return;
  } catch (e) {
    console.warn('deleteUser via API failed, falling back to direct supabase:', (e as any)?.message || e);
  }
  // 2) Fallback to direct Supabase call
  return deleteData('users', id);
}
export const deleteClinic = async (id: string) => {
  // Prefer API route (admin-only, soft-delete)
  try {
    const res = await fetch(`/api/clinics/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include' });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`API responded ${res.status}: ${text}`);
    }
    return;
  } catch (e) {
    console.warn('deleteClinic via API failed, falling back to soft delete via direct supabase (is_active=false):', (e as any)?.message || e);
  }
  // Fallback: soft-delete directly if API is unavailable
  const { error } = await supabase.from('clinics').update({ is_active: false }).eq('id', id);
  if (error) throw new Error(`Error soft-deleting clinic: ${error.message}`);
}
export const deleteProduct = async (id: string) => {
  // 1) Try API route first
  try {
    const res = await fetch(`/api/products/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`API responded ${res.status}: ${text}`);
    }
    return;
  } catch (e) {
    console.warn('deleteProduct via API failed, falling back to direct supabase:', (e as any)?.message || e);
  }
  // 2) Fallback
  return deleteData('products', id);
}
export const deleteOrder = async (id: string) => {
  // Prefer API route (admin-only)
  try {
    const res = await fetch(`/api/orders/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include' });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`API responded ${res.status}: ${text}`);
    }
    return;
  } catch (e) {
    console.warn('deleteOrder via API failed, falling back to direct supabase delete:', (e as any)?.message || e);
  }
  // Fallback (may fail under RLS if not admin)
  return deleteData('orders', id);
}
export const deleteVisit = async (id: string) => {
  // Prefer API route (admin-only)
  try {
    const res = await fetch(`/api/visits/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include' });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`API responded ${res.status}: ${text}`);
    }
    return;
  } catch (e) {
    console.warn('deleteVisit via API failed, falling back to direct supabase delete:', (e as any)?.message || e);
  }
  // Fallback
  return deleteData('visits', id);
}
export const deleteCollection = (id: string) => deleteData('collections', id)
export const deletePlanTask = (id: string) => deleteData('plan_tasks', id)
export const deleteActivityLog = (id: string) => deleteData('activity_log', id)
export const deleteNotification = (id: string) => deleteData('notifications', id)
export const deleteExpense = (id: string) => deleteData('expenses', id)

// Simple in-memory flag to track seeding status
let isSeeded = false;
let isSeeding = false;

// Seeding function for initial data - فائق السرعة!
export const seedSupabase = async () => {
  // إرجاع فوري بدون عمليات بقاعدة بيانات
  if (isSeeded) {
    return;
  }
  
  if (isSeeding) {
    return;
  }
  
  isSeeding = true;
  
  try {
    // تعليم ك seeded فوراً لتجنب العمليات البطيئة
    isSeeded = true;
    
    // عدم تنفيذ أي عمليات بقاعدة بيانات في التطوير
    console.log('✨ Seeding skipped for ultra-fast development mode!');
    
  } finally {
    isSeeding = false;
  }
}
