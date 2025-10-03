import { createServerSupabaseClient } from './supabase';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth';
import type { Database } from './database.types';

type ActivityLogInsert = Database['public']['Tables']['activity_log']['Insert'];

export interface ActivityLogData {
  action: string;
  entity_type: string;
  entity_id: string;
  title?: string;
  details?: string;
  type: 'login' | 'logout' | 'visit' | 'order' | 'collection' | 'register_clinic' | 'failed_login' | 'user_create' | 'user_update' | 'user_delete' | 'invoice_created' | 'debt_created' | 'expense_created' | 'payment_created' | 'payment_confirmed' | 'payment_cancelled' | 'payment_bounced' | 'clinic_created' | 'clinic_updated' | 'clinic_deleted' | 'page_access' | 'data_export' | 'create' | 'update' | 'delete' | 'view' | 'payment' | 'other' | 'approval' | 'rejection' | 'clinic_register' | 'debt_payment' | 'expense_request' | 'plan';
  is_success?: boolean;
  failure_reason?: string;
  changes?: Record<string, any>;
  // Enhanced location tracking
  latitude?: number;
  longitude?: number;
  location_accuracy?: number;
  location_provider?: string; // 'gps' | 'network' | 'passive'
  location_name?: string;
  city?: string;
  country?: string;
  // Device and connection info
  ip_address?: string;
  user_agent?: string;
  device?: string;
  browser?: string;
  os?: string;
  // Additional metadata
  duration_ms?: number;
  referrer?: string;
}

class ActivityLogger {
  private static instance: ActivityLogger;

  private constructor() {}

  public static getInstance(): ActivityLogger {
    if (!ActivityLogger.instance) {
      ActivityLogger.instance = new ActivityLogger();
    }
    return ActivityLogger.instance;
  }

  // Helper to get device/browser info from user agent
  private parseUserAgent(userAgent?: string) {
    if (!userAgent) return {};

    const deviceInfo: any = {};
    
    // Detect browser
    if (userAgent.includes('Chrome')) deviceInfo.browser = 'Chrome';
    else if (userAgent.includes('Firefox')) deviceInfo.browser = 'Firefox';
    else if (userAgent.includes('Safari')) deviceInfo.browser = 'Safari';
    else if (userAgent.includes('Edge')) deviceInfo.browser = 'Edge';
    else deviceInfo.browser = 'Unknown';

    // Detect OS
    if (userAgent.includes('Windows')) deviceInfo.os = 'Windows';
    else if (userAgent.includes('Mac')) deviceInfo.os = 'macOS';
    else if (userAgent.includes('Linux')) deviceInfo.os = 'Linux';
    else if (userAgent.includes('Android')) deviceInfo.os = 'Android';
    else if (userAgent.includes('iOS')) deviceInfo.os = 'iOS';
    else deviceInfo.os = 'Unknown';

    // Detect device type
    if (userAgent.includes('Mobile')) deviceInfo.device = 'Mobile';
    else if (userAgent.includes('Tablet')) deviceInfo.device = 'Tablet';
    else deviceInfo.device = 'Desktop';

    return deviceInfo;
  }

  // Helper to get location from coordinates using reverse geocoding
  private async reverseGeocode(lat: number, lng: number): Promise<{city?: string, country?: string, location_name?: string}> {
    try {
      // Use a simple geocoding service or OpenStreetMap Nominatim
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=ar,en`
      );
      
      if (response.ok) {
        const data = await response.json();
        return {
          city: data.address?.city || data.address?.town || data.address?.village || '',
          country: data.address?.country || '',
          location_name: data.display_name || ''
        };
      }
    } catch (error) {
      console.warn('Reverse geocoding failed:', error);
    }
    
    return {};
  }

  // Main logging method
  async log(data: ActivityLogData, request?: Request, userId?: string): Promise<void> {
    try {
      const supabase = createServerSupabaseClient();
      
      // Use provided userId or default to 'system'
      // Note: getServerSession should NOT be called here as it may be outside request scope
      let finalUserId = userId || 'system';
      
      // Only try to get session if we're in a request context and userId not provided
      if (!userId && request) {
        try {
          const session = await getServerSession(authOptions);
          if (session?.user?.id) {
            finalUserId = session.user.id;
          }
        } catch (error) {
          console.warn('Could not get session in activity logger, using provided userId or system');
        }
      }

      const timestamp = new Date().toISOString();

      // Extract request info and location data
      let requestInfo: any = {};
      if (request) {
        const userAgent = request.headers.get('user-agent') || undefined;
        const ip = request.headers.get('x-forwarded-for') || 
                  request.headers.get('x-real-ip') || 
                  'unknown';
        const referrer = request.headers.get('referer') || undefined;

        requestInfo = {
          ip_address: ip,
          user_agent: userAgent,
          referrer,
          ...this.parseUserAgent(userAgent)
        };
      }
      
      // Handle location data if provided
      let locationInfo: any = {};
      if (data.latitude && data.longitude) {
        locationInfo = {
          lat: data.latitude,
          lng: data.longitude,
          location_accuracy: data.location_accuracy,
          location_provider: data.location_provider || 'unknown'
        };
        
        // Try to get location name if not provided
        if (!data.location_name && !data.city) {
          const geoData = await this.reverseGeocode(data.latitude, data.longitude);
          locationInfo = {
            ...locationInfo,
            location_name: geoData.location_name || data.location_name,
            city: geoData.city || data.city,
            country: geoData.country || data.country
          };
        } else {
          locationInfo = {
            ...locationInfo,
            location_name: data.location_name,
            city: data.city,
            country: data.country
          };
        }
      }

      // Prepare log entry with full location support
      const logEntry: any = {
        user_id: finalUserId,
        action: data.action,
        entity_type: data.entity_type,
        entity_id: data.entity_id,
        title: data.title,
        details: data.details,
        type: data.type,
        is_success: data.is_success ?? true,
        failure_reason: data.failure_reason,
        // Map optional changes to old_values/new_values to match DB schema
        old_values: data.changes?.snapshot || data.changes || null,
        new_values: null,
        timestamp,
        created_at: timestamp,
        duration_ms: data.duration_ms,
        ...requestInfo
      };
      
      // Add enhanced location info if coordinates are provided
      if (data.latitude && data.longitude) {
        logEntry.lat = data.latitude;
        logEntry.lng = data.longitude;
        logEntry.location_name = data.location_name;
        logEntry.city = data.city;
        logEntry.country = data.country;
        logEntry.location_accuracy = data.location_accuracy;
        logEntry.location_provider = data.location_provider || 'unknown';
      }

      // Insert into database
      const { error } = await (supabase as any)
        .from('activity_log')
        .insert(logEntry);

      if (error) {
        console.error('Failed to log activity:', error);
      } else {
        console.log(`✅ Activity logged: ${data.action} - ${data.title}`);
      }
    } catch (err) {
      console.error('Activity logger error:', err);
    }
  }

  // Specific logging methods for common actions
  async logLogin(userId?: string, success: boolean = true, failureReason?: string, locationData?: {lat: number, lng: number, accuracy?: number}, request?: Request) {
    await this.log({
      action: 'user_login',
      entity_type: 'auth',
      entity_id: userId || 'login_attempt',
      title: success ? 'تسجيل دخول ناجح' : 'محاولة تسجيل دخول فاشلة',
      details: success ? 'تم تسجيل الدخول بنجاح' : `فشل تسجيل الدخول: ${failureReason}`,
      type: 'login',
      is_success: success,
      failure_reason: failureReason,
      latitude: locationData?.lat,
      longitude: locationData?.lng,
      location_accuracy: locationData?.accuracy,
      location_provider: 'gps'
    }, request);
  }

  async logLogout(userId?: string, locationData?: {lat: number, lng: number, accuracy?: number}, request?: Request) {
    await this.log({
      action: 'user_logout',
      entity_type: 'auth',
      entity_id: userId || 'logout',
      title: 'تسجيل خروج',
      details: 'تم تسجيل الخروج من النظام',
      type: 'logout',
      latitude: locationData?.lat,
      longitude: locationData?.lng,
      location_accuracy: locationData?.accuracy,
      location_provider: 'gps'
    }, request);
  }

  async logClinicCreate(clinicId: string, clinicName: string, request?: Request) {
    await this.log({
      action: 'create_clinic',
      entity_type: 'clinic',
      entity_id: clinicId,
      title: `إنشاء عيادة جديدة: ${clinicName}`,
      details: `تم إنشاء عيادة جديدة بالاسم: ${clinicName}`,
      type: 'create'
    }, request);
  }

  async logClinicUpdate(clinicId: string, clinicName: string, changes: Record<string, any>, request?: Request) {
    await this.log({
      action: 'update_clinic',
      entity_type: 'clinic',
      entity_id: clinicId,
      title: `تحديث العيادة: ${clinicName}`,
      details: `تم تحديث بيانات العيادة`,
      type: 'update',
      changes
    }, request);
  }

  async logClinicDelete(clinicId: string, clinicName: string, request?: Request) {
    await this.log({
      action: 'delete_clinic',
      entity_type: 'clinic',
      entity_id: clinicId,
      title: `حذف العيادة: ${clinicName}`,
      details: `تم حذف العيادة من النظام`,
      type: 'delete'
    }, request);
  }

  async logVisitCreate(visitId: string, clinicName: string, request?: Request) {
    await this.log({
      action: 'create_visit',
      entity_type: 'visit',
      entity_id: visitId,
      title: `زيارة جديدة: ${clinicName}`,
      details: `تم تسجيل زيارة جديدة لعيادة ${clinicName}`,
      type: 'create'
    }, request);
  }

  async logOrderCreate(orderId: string, clinicName: string, totalAmount: number, request?: Request) {
    await this.log({
      action: 'create_order',
      entity_type: 'order',
      entity_id: orderId,
      title: `طلب جديد: ${clinicName}`,
      details: `تم إنشاء طلب جديد لعيادة ${clinicName} بقيمة ${totalAmount} ريال`,
      type: 'create'
    }, request);
  }

  async logOrderUpdate(orderId: string, status: string, clinicName: string, request?: Request) {
    await this.log({
      action: 'update_order_status',
      entity_type: 'order',
      entity_id: orderId,
      title: `تحديث حالة الطلب: ${clinicName}`,
      details: `تم تحديث حالة الطلب إلى: ${status}`,
      type: 'update'
    }, request);
  }

  async logInvoiceCreate(invoiceId: string, invoiceNumber: string, clientName: string, amount: number, request?: Request) {
    await this.log({
      action: 'create_invoice',
      entity_type: 'invoice',
      entity_id: invoiceId,
      title: `فاتورة جديدة: ${invoiceNumber}`,
      details: `تم إنشاء فاتورة جديدة للعميل ${clientName} بقيمة ${amount} ريال`,
      type: 'create'
    }, request);
  }

  async logPayment(paymentId: string, amount: number, paymentMethod: string, clientName: string, request?: Request) {
    await this.log({
      action: 'process_payment',
      entity_type: 'payment',
      entity_id: paymentId,
      title: `تحصيل دفعة: ${clientName}`,
      details: `تم تحصيل مبلغ ${amount} ريال من العميل ${clientName} عبر ${paymentMethod}`,
      type: 'payment'
    }, request);
  }

  async logExpenseCreate(expenseId: string, description: string, amount: number, request?: Request) {
    await this.log({
      action: 'create_expense',
      entity_type: 'expense',
      entity_id: expenseId,
      title: `نفقة جديدة: ${description}`,
      details: `تم تسجيل نفقة جديدة: ${description} بقيمة ${amount} ريال`,
      type: 'create'
    }, request);
  }

  async logUserCreate(userId: string, userName: string, role: string, request?: Request) {
    await this.log({
      action: 'create_user',
      entity_type: 'user',
      entity_id: userId,
      title: `مستخدم جديد: ${userName}`,
      details: `تم إنشاء مستخدم جديد: ${userName} بدور ${role}`,
      type: 'create'
    }, request);
  }

  async logUserUpdate(userId: string, userName: string, changes: Record<string, any>, request?: Request) {
    await this.log({
      action: 'update_user',
      entity_type: 'user',
      entity_id: userId,
      title: `تحديث المستخدم: ${userName}`,
      details: `تم تحديث بيانات المستخدم`,
      type: 'update',
      changes
    }, request);
  }

  async logPageAccess(page: string, request?: Request) {
    await this.log({
      action: 'access_page',
      entity_type: 'system',
      entity_id: page,
      title: `دخول إلى صفحة: ${page}`,
      details: `تم الدخول إلى صفحة ${page}`,
      type: 'view'
    }, request);
  }

  async logDataExport(exportType: string, request?: Request) {
    await this.log({
      action: 'export_data',
      entity_type: 'system',
      entity_id: exportType,
      title: `تصدير البيانات: ${exportType}`,
      details: `تم تصدير بيانات ${exportType}`,
      type: 'other'
    }, request);
  }

  // NEW: Specialized methods for required activities with location tracking
  async logVisitWithLocation(visitId: string, clinicName: string, locationData?: {lat: number, lng: number, accuracy?: number}, request?: Request) {
    await this.log({
      action: 'create_visit',
      entity_type: 'visit',
      entity_id: visitId,
      title: `زيارة: ${clinicName}`,
      details: `تم القيام بزيارة لعيادة ${clinicName}`,
      type: 'visit',
      latitude: locationData?.lat,
      longitude: locationData?.lng,
      location_accuracy: locationData?.accuracy,
      location_provider: 'gps'
    }, request);
  }

  async logClinicRegistration(clinicId: string, clinicName: string, locationData?: {lat: number, lng: number, accuracy?: number}, request?: Request) {
    await this.log({
      action: 'register_clinic',
      entity_type: 'clinic', 
      entity_id: clinicId,
      title: `تسجيل عيادة: ${clinicName}`,
      details: `تم تسجيل عيادة جديدة: ${clinicName}`,
      type: 'clinic_register',
      latitude: locationData?.lat,
      longitude: locationData?.lng,
      location_accuracy: locationData?.accuracy,
      location_provider: 'gps'
    }, request);
  }

  async logOrderWithLocation(orderId: string, clinicName: string, totalAmount: number, locationData?: {lat: number, lng: number, accuracy?: number}, request?: Request) {
    await this.log({
      action: 'create_order',
      entity_type: 'order',
      entity_id: orderId,
      title: `طلبية: ${clinicName}`,
      details: `تم إنشاء طلبية لعيادة ${clinicName} بقيمة ${totalAmount} ريال`,
      type: 'order',
      latitude: locationData?.lat,
      longitude: locationData?.lng,
      location_accuracy: locationData?.accuracy,
      location_provider: 'gps'
    }, request);
  }

  async logDebtPayment(paymentId: string, clinicName: string, amount: number, locationData?: {lat: number, lng: number, accuracy?: number}, request?: Request) {
    await this.log({
      action: 'pay_debt',
      entity_type: 'payment',
      entity_id: paymentId,
      title: `دفع دين: ${clinicName}`,
      details: `تم دفع دين لعيادة ${clinicName} بمبلغ ${amount} ريال`,
      type: 'debt_payment',
      latitude: locationData?.lat,
      longitude: locationData?.lng,
      location_accuracy: locationData?.accuracy,
      location_provider: 'gps'
    }, request);
  }

  async logExpenseRequest(expenseId: string, description: string, amount: number, locationData?: {lat: number, lng: number, accuracy?: number}, request?: Request) {
    await this.log({
      action: 'request_expense',
      entity_type: 'expense',
      entity_id: expenseId,
      title: `طلب مصاريف: ${description}`,
      details: `تم طلب مصاريف: ${description} بقيمة ${amount} ريال`,
      type: 'expense_request',
      latitude: locationData?.lat,
      longitude: locationData?.lng,
      location_accuracy: locationData?.accuracy,
      location_provider: 'gps'
    }, request);
  }

  async logPlan(planId: string, title: string, description?: string, locationData?: {lat: number, lng: number, accuracy?: number}, request?: Request) {
    await this.log({
      action: 'create_plan',
      entity_type: 'plan',
      entity_id: planId,
      title: `عمل خطة: ${title}`,
      details: description || `تم إنشاء خطة جديدة: ${title}`,
      type: 'plan',
      latitude: locationData?.lat,
      longitude: locationData?.lng,
      location_accuracy: locationData?.accuracy,
      location_provider: 'gps'
    }, request);
  }

  // Generic method for custom logging
  async logCustom(action: string, entityType: string, entityId: string, title: string, details: string, type: ActivityLogData['type'] = 'other', request?: Request) {
    await this.log({
      action,
      entity_type: entityType,
      entity_id: entityId,
      title,
      details,
      type
    }, request);
  }
}

// Export singleton instance
export const activityLogger = ActivityLogger.getInstance();

// Export convenience functions for easier imports
export const logActivity = (data: ActivityLogData, request?: Request) => {
  return activityLogger.log(data, request);
};

export const logVisit = (visitId: string, clinicName: string, request?: Request) => {
  return activityLogger.logVisitCreate(visitId, clinicName, request);
};

export const logOrder = (orderId: string, clinicName: string, totalAmount: number, request?: Request) => {
  return activityLogger.logOrderCreate(orderId, clinicName, totalAmount, request);
};

export const logCollection = (paymentId: string, amount: number, paymentMethod: string, clientName: string, request?: Request) => {
  return activityLogger.logPayment(paymentId, amount, paymentMethod, clientName, request);
};

export const logClinicRegistration = (clinicId: string, clinicName: string, request?: Request) => {
  return activityLogger.logClinicCreate(clinicId, clinicName, request);
};

// NEW: Enhanced exports for location-aware logging
export const logVisitWithLocation = (visitId: string, clinicName: string, locationData?: {lat: number, lng: number, accuracy?: number}, request?: Request) => {
  return activityLogger.logVisitWithLocation(visitId, clinicName, locationData, request);
};

export const logClinicRegistrationWithLocation = (clinicId: string, clinicName: string, locationData?: {lat: number, lng: number, accuracy?: number}, request?: Request) => {
  return activityLogger.logClinicRegistration(clinicId, clinicName, locationData, request);
};

export const logOrderWithLocation = (orderId: string, clinicName: string, totalAmount: number, locationData?: {lat: number, lng: number, accuracy?: number}, request?: Request) => {
  return activityLogger.logOrderWithLocation(orderId, clinicName, totalAmount, locationData, request);
};

export const logDebtPayment = (paymentId: string, clinicName: string, amount: number, locationData?: {lat: number, lng: number, accuracy?: number}, request?: Request) => {
  return activityLogger.logDebtPayment(paymentId, clinicName, amount, locationData, request);
};

export const logExpenseRequest = (expenseId: string, description: string, amount: number, locationData?: {lat: number, lng: number, accuracy?: number}, request?: Request) => {
  return activityLogger.logExpenseRequest(expenseId, description, amount, locationData, request);
};

export const logPlan = (planId: string, title: string, description?: string, locationData?: {lat: number, lng: number, accuracy?: number}, request?: Request) => {
  return activityLogger.logPlan(planId, title, description, locationData, request);
};
