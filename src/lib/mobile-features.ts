// Advanced mobile features for Capacitor
// Conditional imports for Capacitor (only available in mobile environment)
let Camera: any = null;
let CameraResultType: any = null;
let CameraSource: any = null;
let Geolocation: any = null;
let Position: any = null;
let PushNotifications: any = null;
let LocalNotifications: any = null;
let Device: any = null;

// Try to import Capacitor modules if available
try {
  if (typeof window !== 'undefined' && (window as any).Capacitor) {
    Camera = require('@capacitor/camera').Camera;
    CameraResultType = require('@capacitor/camera').CameraResultType;
    CameraSource = require('@capacitor/camera').CameraSource;
    Geolocation = require('@capacitor/geolocation').Geolocation;
    Position = require('@capacitor/geolocation').Position;
    PushNotifications = require('@capacitor/push-notifications').PushNotifications;
    LocalNotifications = require('@capacitor/local-notifications').LocalNotifications;
    Device = require('@capacitor/device').Device;
  }
} catch (error) {
  console.warn('Capacitor modules not available:', error);
}
import { isCapacitor } from './mobile-utils';

// Camera utilities
export interface PhotoOptions {
  source?: 'camera' | 'gallery' | 'prompt';
  quality?: number;
  allowEditing?: boolean;
  width?: number;
  height?: number;
}

export async function takePhoto(options: PhotoOptions = {}): Promise<string | null> {
  if (!isCapacitor()) {
    console.log('Camera not available on web');
    return null;
  }

  try {
    const cameraSource = options.source === 'camera' ? CameraSource.Camera :
                        options.source === 'gallery' ? CameraSource.Photos :
                        CameraSource.Prompt;

    const image = await Camera.getPhoto({
      quality: options.quality || 90,
      allowEditing: options.allowEditing || true,
      resultType: CameraResultType.DataUrl,
      source: cameraSource,
      width: options.width,
      height: options.height,
      preserveAspectRatio: true
    });

    return image.dataUrl || null;
  } catch (error) {
    console.error('Error taking photo:', error);
    throw new Error('فشل في التقاط الصورة. تأكد من منح التطبيق صلاحية الكاميرا.');
  }
}

export async function selectMultiplePhotos(): Promise<string[]> {
  if (!isCapacitor()) {
    console.log('Multiple photo selection not available on web');
    return [];
  }

  try {
    // Note: Multiple photo selection requires additional plugin
    // For now, we'll take single photos
    const photo = await takePhoto({ source: 'gallery' });
    return photo ? [photo] : [];
  } catch (error) {
    console.error('Error selecting photos:', error);
    return [];
  }
}

// Location utilities
export interface LocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export async function getCurrentLocation(options: LocationOptions = {}): Promise<{
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
} | null> {
  try {
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: options.enableHighAccuracy ?? true,
      timeout: options.timeout ?? 10000,
      maximumAge: options.maximumAge ?? 300000, // 5 minutes
    });

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp,
    };
  } catch (error) {
    console.error('Error getting location:', error);
    throw new Error('فشل في الحصول على الموقع. تأكد من تفعيل GPS ومنح التطبيق صلاحية الموقع.');
  }
}

export async function watchLocation(
  callback: (location: { latitude: number; longitude: number; accuracy: number }) => void,
  options: LocationOptions = {}
): Promise<string | null> {
  if (!isCapacitor()) {
    // Web fallback
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          callback({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => console.error('Location watch error:', error),
        {
          enableHighAccuracy: options.enableHighAccuracy ?? true,
          timeout: options.timeout ?? 10000,
          maximumAge: options.maximumAge ?? 300000,
        }
      );
      return watchId.toString();
    }
    return null;
  }

  try {
    const watchId = await Geolocation.watchPosition({
      enableHighAccuracy: options.enableHighAccuracy ?? true,
      timeout: options.timeout ?? 10000,
      maximumAge: options.maximumAge ?? 300000,
    }, (position: any, err: any) => {
      if (err) {
        console.error('Location watch error:', err);
        return;
      }

      if (position) {
        callback({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      }
    });

    return watchId;
  } catch (error) {
    console.error('Error watching location:', error);
    return null;
  }
}

export async function clearLocationWatch(watchId: string): Promise<void> {
  if (!isCapacitor()) {
    navigator.geolocation?.clearWatch(parseInt(watchId));
    return;
  }

  try {
    await Geolocation.clearWatch({ id: watchId });
  } catch (error) {
    console.error('Error clearing location watch:', error);
  }
}

// Push notifications
export async function initializePushNotifications(): Promise<void> {
  if (!isCapacitor()) {
    console.log('Push notifications not available on web');
    return;
  }

  try {
    // Request permission
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      throw new Error('Push notification permission denied');
    }

    // Register with system
    await PushNotifications.register();

    // Add listeners
    PushNotifications.addListener('registration', (token: any) => {
      console.log('Push registration success, token: ' + token.value);
      // Send token to your backend
      document.dispatchEvent(new CustomEvent('push-token-received', {
        detail: { token: token.value }
      }));
    });

    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Push registration error: ', error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
      console.log('Push received: ', notification);
      document.dispatchEvent(new CustomEvent('push-notification-received', {
        detail: { notification }
      }));
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification: any) => {
      console.log('Push action performed: ', notification);
      document.dispatchEvent(new CustomEvent('push-notification-action', {
        detail: { notification }
      }));
    });

  } catch (error) {
    console.error('Error initializing push notifications:', error);
  }
}

// Local notifications
export interface NotificationOptions {
  id?: number;
  title: string;
  body: string;
  schedule?: {
    at: Date;
    repeats?: boolean;
    every?: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';
  };
  sound?: string;
  smallIcon?: string;
  largeIcon?: string;
  actionButtons?: Array<{
    id: string;
    title: string;
    icon?: string;
  }>;
}

export async function showLocalNotification(options: NotificationOptions): Promise<void> {
  if (!isCapacitor()) {
    // Web fallback using browser notifications
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(options.title, {
          body: options.body,
          icon: '/icons/icon-192x192.png',
          dir: 'rtl',
          lang: 'ar'
        });
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification(options.title, {
            body: options.body,
            icon: '/icons/icon-192x192.png',
            dir: 'rtl',
            lang: 'ar'
          });
        }
      }
    }
    return;
  }

  try {
    // Request permission
    const { display } = await LocalNotifications.checkPermissions();
    
    if (display !== 'granted') {
      const result = await LocalNotifications.requestPermissions();
      if (result.display !== 'granted') {
        throw new Error('Local notification permission denied');
      }
    }

    const notification = {
      id: options.id || Date.now(),
      title: options.title,
      body: options.body,
      smallIcon: options.smallIcon || 'ic_stat_icon_config_sample',
      largeIcon: options.largeIcon,
      sound: options.sound,
      actionTypeId: 'default',
    };

    if (options.schedule) {
      await LocalNotifications.schedule({
        notifications: [{
          ...notification,
          schedule: {
            at: options.schedule.at,
            repeats: options.schedule.repeats,
            every: options.schedule.every
          }
        }]
      });
    } else {
      await LocalNotifications.schedule({
        notifications: [notification]
      });
    }

  } catch (error) {
    console.error('Error showing local notification:', error);
    throw new Error('فشل في إظهار الإشعار');
  }
}

export async function cancelNotification(id: number): Promise<void> {
  if (!isCapacitor()) return;

  try {
    await LocalNotifications.cancel({
      notifications: [{ id }]
    });
  } catch (error) {
    console.error('Error canceling notification:', error);
  }
}

export async function cancelAllNotifications(): Promise<void> {
  if (!isCapacitor()) return;

  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }
  } catch (error) {
    console.error('Error canceling all notifications:', error);
  }
}

// Device information
export async function getDeviceInfo(): Promise<{
  platform: string;
  model: string;
  operatingSystem: string;
  osVersion: string;
  manufacturer: string;
  isVirtual: boolean;
  webViewVersion: string;
  deviceId: string;
} | null> {
  if (!isCapacitor()) {
    return {
      platform: 'web',
      model: 'Unknown',
      operatingSystem: navigator.platform,
      osVersion: navigator.userAgent,
      manufacturer: 'Unknown',
      isVirtual: false,
      webViewVersion: navigator.userAgent,
      deviceId: 'web-' + Date.now()
    };
  }

  try {
    const info = await Device.getInfo();
    const deviceId = await Device.getId();
    
    return {
      platform: info.platform,
      model: info.model,
      operatingSystem: info.operatingSystem,
      osVersion: info.osVersion,
      manufacturer: info.manufacturer,
      isVirtual: info.isVirtual,
      webViewVersion: info.webViewVersion,
      deviceId: deviceId.identifier
    };
  } catch (error) {
    console.error('Error getting device info:', error);
    return null;
  }
}

// App utilities
export async function shareContent(content: {
  title?: string;
  text?: string;
  url?: string;
}): Promise<boolean> {
  if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
    try {
      await navigator.share(content);
      return true;
    } catch (error) {
      console.error('Error sharing:', error);
      return false;
    }
  }

  // Fallback: copy to clipboard
  try {
    const textToShare = `${content.title || ''}\n${content.text || ''}\n${content.url || ''}`.trim();
    await navigator.clipboard.writeText(textToShare);
    
    // Show success message
    document.dispatchEvent(new CustomEvent('share-fallback-success', {
      detail: { message: 'تم نسخ المحتوى للحافظة' }
    }));
    
    return true;
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    return false;
  }
}

// Initialize all advanced features
export async function initializeMobileFeatures(): Promise<void> {
  console.log('🚀 Initializing advanced mobile features...');

  try {
    // Initialize push notifications if on mobile
    if (isCapacitor()) {
      await initializePushNotifications();
    }

    // Set up local notification listeners
    if (isCapacitor()) {
      LocalNotifications.addListener('localNotificationReceived', (notification: any) => {
        console.log('Local notification received:', notification);
        document.dispatchEvent(new CustomEvent('local-notification-received', {
          detail: { notification }
        }));
      });

      LocalNotifications.addListener('localNotificationActionPerformed', (notification: any) => {
        console.log('Local notification action performed:', notification);
        document.dispatchEvent(new CustomEvent('local-notification-action', {
          detail: { notification }
        }));
      });
    }

    console.log('✅ Advanced mobile features initialized');
  } catch (error) {
    console.error('❌ Failed to initialize advanced mobile features:', error);
  }
}

// Export all utilities
export const MobileFeatures = {
  // Camera
  takePhoto,
  selectMultiplePhotos,
  
  // Location
  getCurrentLocation,
  watchLocation,
  clearLocationWatch,
  
  // Notifications
  initializePushNotifications,
  showLocalNotification,
  cancelNotification,
  cancelAllNotifications,
  
  // Device
  getDeviceInfo,
  
  // Sharing
  shareContent,
  
  // Initialize
  initializeMobileFeatures
};

export default MobileFeatures;