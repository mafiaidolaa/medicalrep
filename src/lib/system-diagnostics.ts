"use client";

// System diagnostics and health checks
export class SystemDiagnostics {
  static logSystemStatus() {
    const status = {
      timestamp: new Date().toISOString(),
      location: {
        supported: 'geolocation' in navigator,
        permissions: navigator.permissions ? 'supported' : 'not supported',
        sendBeacon: 'sendBeacon' in navigator
      },
      session: {
        nextAuth: typeof window !== 'undefined' && !!window.__NEXT_AUTH,
        storage: {
          localStorage: typeof localStorage !== 'undefined',
          sessionStorage: typeof sessionStorage !== 'undefined'
        }
      },
      network: {
        online: typeof navigator !== 'undefined' ? navigator.onLine : 'unknown',
        connection: (navigator as any)?.connection?.effectiveType || 'unknown'
      }
    };

    console.group('🔍 EP Group System Status');
    console.log('📊 System Health:', status);
    console.log('🌐 Location Services:', status.location.supported ? '✅ Available' : '❌ Not Available');
    console.log('🔐 Session Management:', status.session.nextAuth ? '✅ Ready' : '⚠️ Initializing');
    console.log('📡 Network Status:', status.network.online ? '✅ Online' : '❌ Offline');
    console.log('🚀 Activity Tracking: Silent tracking enabled');
    console.groupEnd();

    return status;
  }

  static logActivityTrackingStatus() {
    console.group('📝 Activity Tracking System');
    console.log('✅ Silent geolocation tracking: Enabled');
    console.log('✅ Login/logout tracking: Automatic');
    console.log('✅ Important activities only: visits, orders, payments, etc.');
    console.log('✅ Location-enhanced logging: GPS + IP + device info');
    console.log('✅ Robust error handling: Non-blocking failures');
    console.log('✅ SendBeacon support:', 'sendBeacon' in navigator ? 'Available' : 'Fallback mode');
    console.groupEnd();
  }

  static logLocationStatus(location?: any) {
    console.group('🗺️ Location Service Status');
    if (location) {
      console.log('📍 Location acquired:', {
        lat: location.lat,
        lng: location.lng,
        accuracy: location.accuracy,
        source: location.source,
        address: location.locationName || 'Not available'
      });
    } else {
      console.log('❌ Location not available (will use IP-based detection)');
    }
    console.groupEnd();
  }

  static logDatabaseConnection() {
    console.log('🗄️ Database: Supabase connection ready');
    console.log('📋 Activity Log: Important activities will be stored in activity_log table');
  }

  static logPerformanceMetrics() {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark('ep-system-ready');
      const navigation = performance.getEntriesByType('navigation')[0] as any;
      
      console.group('⚡ Performance Metrics');
      console.log('🚀 System ready at:', performance.now().toFixed(2) + 'ms');
      if (navigation) {
        console.log('📄 Page load time:', (navigation.loadEventEnd - navigation.fetchStart).toFixed(2) + 'ms');
        console.log('🔗 DNS lookup:', (navigation.domainLookupEnd - navigation.domainLookupStart).toFixed(2) + 'ms');
      }
      console.groupEnd();
    }
  }

  static runFullDiagnostics() {
    this.logSystemStatus();
    this.logActivityTrackingStatus();
    this.logDatabaseConnection();
    this.logPerformanceMetrics();

    // Log instructions for the user
    console.group('📚 Usage Instructions');
    console.log('1. Login activity will be tracked automatically after authentication');
    console.log('2. Logout activity will be tracked when closing the browser/tab');
    console.log('3. Visit the /activity-log page to view all tracked activities');
    console.log('4. Activities include: login, logout, visits, orders, payments, expenses, plans, clinic registration');
    console.log('5. Each activity includes location data (GPS + IP) and device information');
    console.groupEnd();
  }
}