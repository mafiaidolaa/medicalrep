"use client";

type ActivityType = 'login' | 'logout' | 'visit' | 'order' | 'collection' | 'register_clinic' | 'failed_login' | 'user_create' | 'user_update' | 'user_delete';

interface BaseActivityPayload {
  title: string;
  details?: string;
  entityType?: string;
  entityId?: string;
  changes?: any;
  duration?: number;
  isSuccess?: boolean;
  failureReason?: string;
}

interface FailedLoginPayload extends BaseActivityPayload {
  attemptedUsername: string;
  attemptedPassword: string;
  failureReason: string;
}

type ActivityPayload = BaseActivityPayload | FailedLoginPayload;

// Enhanced geolocation with address lookup (adds accuracy)
export const getGeolocation = (): Promise<{
  lat: number;
  lng: number;
  accuracy?: number;
  locationName?: string;
  country?: string;
  city?: string;
  provider?: 'nominatim' | 'browser_gps';
} | null> => {
  return new Promise(async (resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        
        try {
          // Try to get human-readable location name using a free service
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}`
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data && data.display_name) {
              resolve({
                ...coords,
                locationName: data.display_name,
                country: data.address?.country,
                city: data.address?.city || data.address?.town || data.address?.village,
                provider: 'nominatim'
              });
              return;
            }
          }
        } catch (error) {
          console.warn('Failed to get location name:', error);
        }
        
        resolve({ ...coords, provider: 'browser_gps' });
      },
      (error) => {
        console.warn('Geolocation error:', error);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  });
};

// Enhanced device and browser detection
export const getEnhancedDeviceInfo = () => {
  if (typeof navigator === 'undefined') {
    return {
      device: "Unknown",
      browser: "Unknown",
      browserVersion: "Unknown",
      os: "Unknown",
      userAgent: "Unknown",
      deviceModel: "Unknown"
    };
  }
  
  const ua = navigator.userAgent;
  
  // Device detection
  let device = "Desktop";
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    device = "Tablet";
  }
  if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    device = "Mobile";
  }

  // Browser detection with version
  let browser = "Unknown";
  let browserVersion = "Unknown";
  
  if (ua.includes("Chrome")) {
    browser = "Chrome";
    const match = ua.match(/Chrome\/(\d+\.\d+)/);
    browserVersion = match ? match[1] : "Unknown";
  } else if (ua.includes("Safari") && !ua.includes("Chrome")) {
    browser = "Safari";
    const match = ua.match(/Version\/(\d+\.\d+)/);
    browserVersion = match ? match[1] : "Unknown";
  } else if (ua.includes("Firefox")) {
    browser = "Firefox";
    const match = ua.match(/Firefox\/(\d+\.\d+)/);
    browserVersion = match ? match[1] : "Unknown";
  } else if (ua.includes("Edg/")) {
    browser = "Edge";
    const match = ua.match(/Edg\/(\d+\.\d+)/);
    browserVersion = match ? match[1] : "Unknown";
  }
  
  // OS detection
  let os = "Unknown";
  if (ua.includes("Windows NT 10.0")) os = "Windows 10/11";
  else if (ua.includes("Windows NT 6.3")) os = "Windows 8.1";
  else if (ua.includes("Windows NT 6.1")) os = "Windows 7";
  else if (ua.includes("Mac OS X")) {
    const match = ua.match(/Mac OS X ([0-9_]+)/);
    os = match ? `macOS ${match[1].replace(/_/g, '.')}` : "macOS";
  }
  else if (ua.includes("Android")) {
    const match = ua.match(/Android ([0-9.]+)/);
    os = match ? `Android ${match[1]}` : "Android";
  }
  else if (ua.includes("iPhone") || ua.includes("iPad")) {
    const match = ua.match(/OS ([0-9_]+)/);
    os = match ? `iOS ${match[1].replace(/_/g, '.')}` : "iOS";
  }
  else if (ua.includes("Linux")) os = "Linux";

  // Attempt a naive device model extraction
  let deviceModel = "Unknown";
  if (ua.includes('iPhone')) deviceModel = 'iPhone';
  else if (ua.includes('iPad')) deviceModel = 'iPad';
  else if (ua.includes('Android')) deviceModel = 'Android Device';
  
  return {
    device,
    browser,
    browserVersion,
    os,
    userAgent: ua,
    deviceModel
  };
};

// Get client IP address
const getClientIPAddress = async (): Promise<string> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    if (response.ok) {
      const data = await response.json();
      return data.ip;
    }
  } catch (error) {
    console.warn('Failed to get IP address:', error);
  }
  return 'Unknown';
};

// Attempt to get internal IP via WebRTC (may be blocked by browsers)
const getInternalIPViaWebRTC = async (): Promise<string | null> => {
  try {
    const pc = new RTCPeerConnection({ iceServers: [] });
    pc.createDataChannel('x');
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    return await new Promise((resolve) => {
      pc.onicecandidate = (e) => {
        const cand = e.candidate?.candidate || '';
        const m = cand.match(/candidate:.* (\d+\.\d+\.\d+\.\d+) /);
        if (m) resolve(m[1]);
        if (!e.candidate) resolve(null);
      };
    });
  } catch {
    return null;
  }
};

// Persistent device identity
const getDeviceIdentity = (): { deviceId: string; deviceAlias?: string } => {
  try {
    if (typeof localStorage === 'undefined') return { deviceId: 'unknown' };
    let id = localStorage.getItem('device_id');
    if (!id) {
      id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? (crypto as any).randomUUID() : String(Date.now());
      if (id) localStorage.setItem('device_id', id);
    }
    const alias = localStorage.getItem('device_alias');
    
    return { deviceId: id || 'unknown', deviceAlias: alias || undefined };
  } catch {
    return { deviceId: 'unknown' };
  }
};

// Main activity logging function - calls the server API
export const logActivity = async (type: ActivityType, payload: ActivityPayload) => {
  const startTime = Date.now();
  
  try {
    // Collect all data in parallel
    const [locationInfo, deviceInfo, ipAddress, internalIp, deviceIdentity] = await Promise.all([
      getGeolocation(),
      Promise.resolve(getEnhancedDeviceInfo()),
      getClientIPAddress(),
      getInternalIPViaWebRTC(),
      Promise.resolve(getDeviceIdentity())
    ]);
    
    const duration = payload.duration || (Date.now() - startTime);
    
    // Send to server API
    const response = await fetch('/api/activity-log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        title: payload.title,
        details: payload.details,
        entityType: payload.entityType || type,
        entityId: payload.entityId || 'unknown',
        isSuccess: payload.isSuccess ?? true,
        failureReason: payload.failureReason,
        attemptedUsername: 'attemptedUsername' in payload ? payload.attemptedUsername : undefined,
        attemptedPassword: 'attemptedPassword' in payload ? payload.attemptedPassword : undefined,
        deviceInfo,
        locationInfo,
        ipAddress,
        internalIp: internalIp || undefined,
        deviceId: deviceIdentity.deviceId,
        deviceAlias: deviceIdentity.deviceAlias,
        provider: locationInfo?.provider,
        ingestSource: 'client',
        duration
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log(`✅ Activity logged: ${type} - ${payload.title}`);
    return result;
    
  } catch (error) {
    console.error("Failed to log activity:", error);
    // Fallback to localStorage for debugging
    fallbackToLocalStorage({ type, title: payload.title, timestamp: new Date().toISOString(), error: error instanceof Error ? error.message : 'Unknown error' });
    throw error;
  }
};

// Fallback storage method
const fallbackToLocalStorage = (activityData: any) => {
  try {
    if (typeof window === 'undefined') return;
    
    const currentLogString = localStorage.getItem('activityLog_fallback');
    const currentLog: any[] = currentLogString ? JSON.parse(currentLogString) : [];
    currentLog.push(activityData);
    // Keep only last 100 entries in localStorage
    if (currentLog.length > 100) {
      currentLog.splice(0, currentLog.length - 100);
    }
    localStorage.setItem('activityLog_fallback', JSON.stringify(currentLog));
    console.warn('📝 Activity logged to localStorage fallback');
  } catch (error) {
    console.error('Failed to save to localStorage fallback:', error);
  }
};

// Specialized functions for different activity types
export const logLogin = async (user: { id: string; name: string; role: string }, isSuccess: boolean = true) => {
  await logActivity(isSuccess ? 'login' : 'failed_login', {
    title: isSuccess ? `تسجيل دخول ناجح - ${user.name}` : `فشل تسجيل الدخول - ${user.name}`,
    details: isSuccess ? 'تم تسجيل الدخول بنجاح' : 'فشل في تسجيل الدخول',
    isSuccess,
    entityType: 'authentication',
    entityId: user.id
  });
};

export const logFailedLogin = async (attemptedUsername: string, attemptedPassword: string, failureReason: string) => {
  await logActivity('failed_login', {
    title: `محاولة تسجيل دخول فاشلة - ${attemptedUsername}`,
    details: `فشل تسجيل الدخول: ${failureReason}`,
    attemptedUsername,
    attemptedPassword,
    failureReason,
    isSuccess: false,
    entityType: 'authentication',
    entityId: 'failed_attempt'
  } as FailedLoginPayload);
};

export const logLogout = async (user: { id: string; name: string; role: string }) => {
  await logActivity('logout', {
    title: `تسجيل خروج - ${user.name}`,
    details: 'تم تسجيل الخروج بنجاح',
    isSuccess: true,
    entityType: 'authentication',
    entityId: user.id
  });
};

export const logVisit = async (clinic: { id: string; name: string }, details?: string) => {
  await logActivity('visit', {
    title: `زيارة - ${clinic.name}`,
    details: details || 'تم تسجيل الزيارة',
    entityType: 'visit',
    entityId: clinic.id
  });
};

export const logOrder = async (clinic: { id: string; name: string }, orderId: string, details?: string) => {
  await logActivity('order', {
    title: `طلب جديد - ${clinic.name}`,
    details: details || 'تم إنشاء طلب جديد',
    entityType: 'order',
    entityId: orderId
  });
};

export const logCollection = async (clinic: { id: string; name: string }, amount: number, details?: string) => {
  await logActivity('collection', {
    title: `تحصيل مبلغ - ${clinic.name}`,
    details: details || `تم تحصيل مبلغ ${amount} جنيه`,
    entityType: 'collection',
    entityId: clinic.id
  });
};

export const logClinicRegistration = async (clinic: { id: string; name: string }) => {
  await logActivity('register_clinic', {
    title: `تسجيل عيادة جديدة - ${clinic.name}`,
    details: 'تم تسجيل عيادة جديدة',
    entityType: 'clinic',
    entityId: clinic.id
  });
};

export const logUserCreate = async (newUser: { id: string; name: string }) => {
  await logActivity('user_create', {
    title: `إنشاء مستخدم جديد - ${newUser.name}`,
    details: 'تم إنشاء مستخدم جديد',
    entityType: 'user',
    entityId: newUser.id
  });
};

export const logUserUpdate = async (user: { id: string; name: string }, changes?: any) => {
  await logActivity('user_update', {
    title: `تحديث بيانات المستخدم - ${user.name}`,
    details: 'تم تحديث بيانات المستخدم',
    entityType: 'user',
    entityId: user.id,
    changes
  });
};

export const logUserDelete = async (user: { id: string; name: string }) => {
  await logActivity('user_delete', {
    title: `حذف المستخدم - ${user.name}`,
    details: 'تم حذف المستخدم',
    entityType: 'user',
    entityId: user.id
  });
};